import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { dbAdmin, id } from '@/lib/db-admin'

export const runtime = 'nodejs'

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null
  return new Stripe(secretKey)
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

      if (orderRequestId) {
        transactions.push(
          dbAdmin.tx.orderRequests[orderRequestId].update({
            status: 'READY_FOR_PRODUCTION',
            isPaid: true,
            paymentUrl: session.url || undefined,
            updatedAt: now,
          }),
        )
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
