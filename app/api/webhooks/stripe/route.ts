import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { dbAdmin, id } from '@/lib/db-admin'
import { HexaOrderConfirmationEmail } from '@/components/email-template'
import { getHexaOrderAdminNotificationEmail } from '@/lib/email-templates'
import { sendStandardOrderEmails as sendLoggedStandardOrderEmails } from '@/lib/order-emails'

export const runtime = 'nodejs'

const resend = new Resend(process.env.RESEND_API_KEY)

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function getSender() {
  return process.env.RESEND_FROM_EMAIL || 'EM3D <onboarding@resend.dev>'
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

function getStripeObjectId(value: string | { id?: string } | null | undefined) {
  if (!value) return undefined
  return typeof value === 'string' ? value : value.id
}

async function getOrderById(orderId: string) {
  const orderData = await dbAdmin.query({
    orders: {
      $: { where: { id: orderId } },
    },
  })

  return (orderData.orders?.[0] as any) || null
}

async function resolveStandardOrderFromSession(session: Stripe.Checkout.Session) {
  const candidateIds = [
    session.metadata?.orderId,
    session.client_reference_id,
  ].filter((value): value is string => Boolean(value))

  for (const candidateId of candidateIds) {
    const order = await getOrderById(candidateId)
    if (order) {
      return { orderId: candidateId, order, source: candidateId === session.metadata?.orderId ? 'metadata' : 'client_reference_id' }
    }
  }

  if (session.id) {
    const orderData = await dbAdmin.query({
      orders: {
        $: { where: { stripeSessionId: session.id } },
      },
    })
    const order = (orderData.orders?.[0] as any) || null
    if (order) {
      return { orderId: order.id as string, order, source: 'stripeSessionId' }
    }
  }

  return { orderId: undefined, order: null, source: undefined }
}

async function resolveStandardOrderFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  const metadataOrderId = paymentIntent.metadata?.orderId
  if (metadataOrderId) {
    const order = await getOrderById(metadataOrderId)
    if (order) {
      return { orderId: metadataOrderId, order, source: 'payment_intent_metadata' }
    }
  }

  const orderData = await dbAdmin.query({
    orders: {
      $: { where: { stripePaymentIntentId: paymentIntent.id } },
    },
  })
  const order = (orderData.orders?.[0] as any) || null
  if (order) {
    return { orderId: order.id as string, order, source: 'stripePaymentIntentId' }
  }

  return { orderId: undefined, order: null, source: undefined }
}

function appendPaymentFailureNote(currentNotes: string | undefined, eventType: string, timestamp: Date, reason?: string) {
  const details = reason ? `: ${reason}` : ''
  const note = `Pagamento Stripe não concluído (${eventType}) em ${timestamp.toISOString()}${details}.`
  return [currentNotes, note].filter(Boolean).join('\n\n')
}

async function sendHexaOrderEmails(orderRequest: any, orderRequestId: string) {
  try {
    const request = orderRequest.canvasConfig?.request
    if (!request) return

    const customer = request.customer
    const tiles = request.tiles || []
    const colors = [...new Set(tiles.map((t: any) => t.color))] as string[]

    // Send confirmation email to customer
    const customerEmailResult = await resend.emails.send({
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
    if (customerEmailResult.error) {
      console.error('Hexa order customer email failed:', {
        orderRequestId,
        to: customer.email,
        error: customerEmailResult.error,
      })
    } else {
      console.info('Hexa order customer email sent:', {
        orderRequestId,
        to: customer.email,
        resendId: customerEmailResult.data?.id,
      })
    }

    // Send notification to admin
    const adminEmail = getAdminEmail()
    if (adminEmail) {
      const adminEmailResult = await resend.emails.send({
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
      if (adminEmailResult.error) {
        console.error('Hexa order admin email failed:', {
          orderRequestId,
          to: adminEmail,
          error: adminEmailResult.error,
        })
      } else {
        console.info('Hexa order admin email sent:', {
          orderRequestId,
          to: adminEmail,
          resendId: adminEmailResult.data?.id,
        })
      }
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
    const now = new Date()
    const transactions: any[] = []
    let orderRequestId: string | undefined
    let orderId: string | undefined
    let stripeSessionId: string | undefined
    let stripePaymentIntentId: string | undefined
    let productType: string | undefined
    let shouldSendHexaEmails = false
    let shouldSendStandardOrderEmails = false

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      stripeSessionId = session.id
      stripePaymentIntentId = getStripeObjectId(session.payment_intent)
      orderRequestId = session.metadata?.orderRequestId || undefined
      productType = session.metadata?.productType

      if (orderRequestId) {
        transactions.push(
          dbAdmin.tx.orderRequests[orderRequestId].update({
            status: 'READY_FOR_PRODUCTION',
            isPaid: true,
            paymentUrl: session.url || undefined,
            updatedAt: now,
          }),
        )

        // Mark for email sending after transaction
        if (productType === 'hexa-memoria') {
          shouldSendHexaEmails = true
        }
      }

      const resolvedOrder = await resolveStandardOrderFromSession(session)
      orderId = resolvedOrder.orderId

      if (orderId) {
        transactions.push(
          dbAdmin.tx.orders[orderId].update({
            status: 'PAID',
            paymentStatus: 'paid',
            paidAt: now,
            stripeSessionId,
            ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
            updatedAt: now,
          }),
        )
        shouldSendStandardOrderEmails = resolvedOrder.order?.paymentStatus !== 'paid'
      }

      if (!orderRequestId && !orderId) {
        console.warn('Stripe checkout.session.completed did not resolve to an order or order request.', {
          eventId: event.id,
          sessionId: session.id,
          clientReferenceId: session.client_reference_id,
          metadata: session.metadata,
        })
      } else {
        console.info('Stripe checkout.session.completed resolved.', {
          eventId: event.id,
          sessionId: session.id,
          orderId,
          orderRequestId,
          resolutionSource: resolvedOrder.source,
        })
      }
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session
      stripeSessionId = session.id
      stripePaymentIntentId = getStripeObjectId(session.payment_intent)

      const resolvedOrder = await resolveStandardOrderFromSession(session)
      orderId = resolvedOrder.orderId

      if (orderId && resolvedOrder.order?.paymentStatus !== 'paid') {
        transactions.push(
          dbAdmin.tx.orders[orderId].update({
            status: 'CANCELLED',
            paymentStatus: 'pending',
            fulfillmentStatus: 'cancelled',
            notes: appendPaymentFailureNote(resolvedOrder.order?.notes, event.type, new Date(event.created * 1000)),
            stripeSessionId,
            ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
            updatedAt: now,
          }),
        )
      }

      if (!orderId) {
        console.warn('Stripe failed/expired checkout session did not resolve to an order.', {
          eventId: event.id,
          eventType: event.type,
          sessionId: session.id,
          clientReferenceId: session.client_reference_id,
          metadata: session.metadata,
        })
      } else {
        console.info('Stripe failed/expired checkout session resolved.', {
          eventId: event.id,
          eventType: event.type,
          sessionId: session.id,
          orderId,
          resolutionSource: resolvedOrder.source,
        })
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      stripePaymentIntentId = paymentIntent.id

      const resolvedOrder = await resolveStandardOrderFromPaymentIntent(paymentIntent)
      orderId = resolvedOrder.orderId

      if (orderId && resolvedOrder.order?.paymentStatus !== 'paid') {
        transactions.push(
          dbAdmin.tx.orders[orderId].update({
            status: 'CANCELLED',
            paymentStatus: 'pending',
            fulfillmentStatus: 'cancelled',
            notes: appendPaymentFailureNote(
              resolvedOrder.order?.notes,
              event.type,
              new Date(event.created * 1000),
              paymentIntent.last_payment_error?.message,
            ),
            stripePaymentIntentId,
            updatedAt: now,
          }),
        )
      }

      if (!orderId) {
        console.warn('Stripe failed payment intent did not resolve to an order.', {
          eventId: event.id,
          eventType: event.type,
          paymentIntentId: paymentIntent.id,
          metadata: paymentIntent.metadata,
        })
      } else {
        console.info('Stripe failed payment intent resolved.', {
          eventId: event.id,
          eventType: event.type,
          paymentIntentId: paymentIntent.id,
          orderId,
          resolutionSource: resolvedOrder.source,
        })
      }
    }

    // Atomic dedupe: attempt to insert the event record with a unique eventId
    // If this fails due to duplicate eventId constraint, we know it's a duplicate
    const webhookEventId = id()
    transactions.push(
      dbAdmin.tx.stripeWebhookEvents[webhookEventId].update({
        eventId: event.id,
        type: event.type,
        orderRequestId,
        orderId,
        stripeSessionId,
        processedAt: now,
      }),
    )

    try {
      await dbAdmin.transact(transactions)
    } catch (txError: any) {
      // Check if this is a duplicate constraint violation
      // If eventId already exists, treat as duplicate
      const isDuplicate = txError?.body?.type === 'record-not-unique'

      if (isDuplicate) {
        return NextResponse.json({ received: true, duplicate: true })
      }
      // Re-throw if it's a different error
      throw txError
    }

    // Send emails only after successful transaction
    if (shouldSendHexaEmails && orderRequestId) {
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

    if (shouldSendStandardOrderEmails && orderId) {
      const orderData = await dbAdmin.query({
        orders: {
          $: { where: { id: orderId } },
        },
      })
      const order = (orderData.orders?.[0] as any) || null
      if (order?.customerEmail) {
        await sendLoggedStandardOrderEmails(order, orderId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook failed:', error)
    return NextResponse.json({ error: 'Não foi possível processar o webhook.' }, { status: 500 })
  }
}
