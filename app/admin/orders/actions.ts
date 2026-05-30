'use server'

import Stripe from 'stripe'
import { revalidatePath } from 'next/cache'
import { dbAdmin } from '@/lib/db-admin'
import { sendStandardOrderEmails } from '@/lib/order-emails'
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

function appendEmailFailureNote(currentNotes: string | undefined, status: { customer?: string; admin?: string; lastError?: string }) {
  const failed = [status.customer === 'failed' ? 'cliente' : '', status.admin === 'failed' ? 'admin' : ''].filter(Boolean).join(' e ')
  if (!failed) return currentNotes
  const details = status.lastError ? `: ${status.lastError}` : ''
  const note = `Email ${failed} falhou (recheck Stripe) em ${new Date().toISOString()}${details}.`
  return [currentNotes, note].filter(Boolean).join('\n\n')
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
  const stripePaymentIntentId = getStripeObjectId(session.payment_intent)
  const paidOrder = {
    ...order,
    status: 'PAID',
    paymentStatus: 'paid',
    paidAt: now,
    stripeSessionId: session.id,
    ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
    updatedAt: now,
  }

  await dbAdmin.transact(
    dbAdmin.tx.orders[orderId].update({
      status: 'PAID',
      paymentStatus: 'paid',
      paidAt: now,
      stripeSessionId: session.id,
      ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
      updatedAt: now,
    }),
  )

  if (paidOrder.customerEmail) {
    const emailStatus = await sendStandardOrderEmails(paidOrder, orderId)
    const updatedNotes = appendEmailFailureNote(order.notes, emailStatus)
    if (updatedNotes !== order.notes) {
      try {
        await dbAdmin.transact(
          dbAdmin.tx.orders[orderId].update({
            notes: updatedNotes,
            updatedAt: new Date(),
          }),
        )
      } catch (noteError) {
        console.error('Failed to append Stripe recheck email failure note:', { orderId, noteError })
      }
    }
  }

  revalidatePath('/admin/orders')

  return { updated: true, message: 'Pagamento Stripe confirmado, encomenda marcada como paga e emails de confirmação tentados.' }
}
