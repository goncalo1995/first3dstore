import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { dbAdmin, id } from '@/lib/db-admin'
import { HexaOrderConfirmationEmail } from '@/components/email-template'
import { getHexaOrderAdminNotificationEmail } from '@/lib/email-templates'

export const runtime = 'nodejs'

const resend = new Resend(process.env.RESEND_API_KEY)

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function getSender() {
  return process.env.RESEND_FROM_EMAIL || 'Foto3D <onboarding@resend.dev>'
}

function getAdminEmail() {
  const configured = process.env.ADMIN_EMAILS || ''
  const emails = configured.split(',').map(email => email.trim()).filter(Boolean)
  return emails[0] || null
}

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null
  return new Stripe(secretKey)
}

async function sendHexaOrderEmails(orderRequest: any, orderRequestId: string) {
  try {
    const request = orderRequest.canvasConfig?.request
    if (!request) return

    const customer = request.customer
    const tiles = request.tiles || []
    const colors = [...new Set(tiles.map((t: any) => t.color))] as string[]

    // Send confirmation email to customer
    await resend.emails.send({
      from: getSender(),
      to: customer.email,
      subject: 'Encomenda confirmada - HexaMemória Foto3D.pt',
      react: HexaOrderConfirmationEmail({
        name: customer.name,
        tileCount: tiles.length,
        mosaicSize: request.mosaicSize,
        colors,
        total: orderRequest.selectedPrice || request.totalPrice,
        discountApplied: request.discountApplied || null,
        siteUrl: siteUrl(),
      }),
    })

    // Send notification to admin
    const adminEmail = getAdminEmail()
    if (adminEmail) {
      await resend.emails.send({
        from: getSender(),
        to: adminEmail,
        subject: `Nova venda HexaMemória - ${customer.name}`,
        text: getHexaOrderAdminNotificationEmail({
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone || '',
          customerSpaceType: customer.spaceType || '',
          tileCount: tiles.length,
          mosaicSize: request.mosaicSize,
          colors,
          total: orderRequest.selectedPrice || request.totalPrice,
          discountApplied: request.discountApplied || null,
          orderRequestId,
        }),
      })
    }
  } catch (error) {
    // Log error but don't fail the webhook
    console.error('Failed to send hexa order emails:', error)
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripe = getStripe()

  if (!signature || !webhookSecret || !stripe) {
    return NextResponse.json({ error: 'Webhook Stripe não configurado.' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    const payload = await req.text()
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    console.error('Stripe webhook signature failed:', error)
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 400 })
  }

  try {
    const existing = await dbAdmin.query({
      stripeWebhookEvents: {
        $: { where: { eventId: event.id } },
      },
    })
    if ((existing.stripeWebhookEvents ?? []).length > 0) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    const now = new Date()
    const transactions: any[] = []
    let orderRequestId: string | undefined

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      orderRequestId = session.metadata?.orderRequestId || undefined
      const productType = session.metadata?.productType

      if (orderRequestId) {
        transactions.push(
          dbAdmin.tx.orderRequests[orderRequestId].update({
            status: 'READY_FOR_PRODUCTION',
            isPaid: true,
            paymentUrl: session.url || undefined,
            updatedAt: now,
          }),
        )

        // Send confirmation emails for hexa-memoria orders
        if (productType === 'hexa-memoria') {
          const orderData = await dbAdmin.query({
            orderRequests: {
              $: { where: { id: orderRequestId } },
            },
          })
          const orderRequest = (orderData.orderRequests?.[0] as any) || null
          if (orderRequest) {
            await sendHexaOrderEmails(orderRequest, orderRequestId)
          }
        }
      }
    }

    transactions.push(
      dbAdmin.tx.stripeWebhookEvents[id()].update({
        eventId: event.id,
        type: event.type,
        orderRequestId,
        processedAt: now,
      }),
    )

    await dbAdmin.transact(transactions)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook failed:', error)
    return NextResponse.json({ error: 'Não foi possível processar o webhook.' }, { status: 500 })
  }
}
