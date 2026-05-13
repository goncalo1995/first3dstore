'use server'

import Stripe from 'stripe'
import { revalidatePath } from 'next/cache'
import { dbAdmin } from '@/lib/db-admin'
import { requireAdminForAction } from '@/lib/server-auth'
import type { Order } from '@/types'

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Stripe não está configurado.')
  }

  return new Stripe(secretKey)
}

function getStripeObjectId(value: string | { id?: string } | null | undefined) {
  if (!value) return undefined
  return typeof value === 'string' ? value : value.id
}

export async function recheckStripeOrderPayment(orderId: string) {
  // Require admin authorization before proceeding
  await requireAdminForAction()

  const orderData = await dbAdmin.query({
    orders: {
      $: { where: { id: orderId } },
    },
  })
  const order = (orderData.orders?.[0] as Order) ?? null

  if (!order) {
    throw new Error('Encomenda não encontrada.')
  }
  if (order.paymentPreference !== 'stripe') {
    throw new Error('Esta encomenda não usa pagamento Stripe.')
  }
  if (order.paymentStatus === 'paid') {
    return { updated: false, message: 'A encomenda já está marcada como paga.' }
  }
  if (!order.stripeSessionId) {
    throw new Error('Esta encomenda não tem sessão Stripe associada.')
  }

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)

  if (session.payment_status !== 'paid') {
    return { updated: false, message: 'A sessão Stripe ainda não está paga.' }
  }

  const now = new Date()
  await dbAdmin.transact(
    dbAdmin.tx.orders[orderId].update({
      paymentStatus: 'paid',
      paidAt: now,
      stripeSessionId: session.id,
      ...(getStripeObjectId(session.payment_intent) ? { stripePaymentIntentId: getStripeObjectId(session.payment_intent) } : {}),
      updatedAt: now,
    }),
  )

  revalidatePath('/admin/orders')

  return { updated: true, message: 'Pagamento Stripe confirmado e encomenda marcada como paga.' }
}
