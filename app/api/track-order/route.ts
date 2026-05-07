import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/db-admin'

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_ATTEMPTS = 12
const attemptsByIp = new Map<string, { count: number; resetAt: number }>()

type OrderItemStatus = 'new' | 'waiting_color' | 'scheduled' | 'printing' | 'printed' | 'assembled' | 'done' | 'blocked'

type OrderRecord = {
  id: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  shippingMethod: 'pickup_carcavelos' | 'mainland_portugal'
  items: {
    productName: string
    quantity: number
    colors: string[]
    selectedVariant?: {
      name: string
      kind?: 'single_color' | 'preset_pack' | 'custom_text'
      colors: string[]
    }
    customText?: string
    unitPrice: number
    itemStatus?: OrderItemStatus
    scheduledFor?: string
    quantityDone?: number
  }[]
  subtotal: number
  shippingCost: number
  total: number
  paymentStatus: 'pending' | 'paid' | 'refunded'
  fulfillmentStatus: 'new' | 'printing' | 'ready' | 'shipped' | 'completed' | 'cancelled'
  notes?: string
  createdAt: string | Date
  updatedAt: string | Date
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function normalizePhone(value?: string) {
  return (value ?? '').replace(/\D/g, '')
}

function contactMatches(order: OrderRecord, contact: string) {
  const normalizedContact = normalize(contact)
  const contactDigits = normalizePhone(contact)

  if (order.customerEmail && normalize(order.customerEmail) === normalizedContact) return true
  if (contactDigits && normalizePhone(order.customerPhone).endsWith(contactDigits)) return true

  return false
}

function getClientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'
}

function isRateLimited(ip: string) {
  const now = Date.now()
  const current = attemptsByIp.get(ip)

  if (!current || current.resetAt <= now) {
    attemptsByIp.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  current.count += 1
  attemptsByIp.set(ip, current)

  return current.count > RATE_LIMIT_MAX_ATTEMPTS
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Demasiadas tentativas. Tente novamente daqui a alguns minutos.' }, { status: 429 })
    }

    const body = await request.json() as { orderId?: string; contact?: string }
    const orderId = body.orderId?.trim()
    const contact = body.contact?.trim()

    if (!orderId || !contact) {
      return NextResponse.json({ error: 'Indique o ID da encomenda e o email ou telemóvel.' }, { status: 400 })
    }

    const data = await dbAdmin.query({ orders: {} })
    const order = (data.orders as OrderRecord[] | undefined)?.find(item => item.id === orderId)

    if (!order || !contactMatches(order, contact)) {
      return NextResponse.json({ error: 'Não encontrámos nenhuma encomenda com esses dados.' }, { status: 404 })
    }

    return NextResponse.json({
      order: {
        id: order.id,
        customerName: order.customerName,
        shippingMethod: order.shippingMethod,
        items: order.items.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          colors: item.colors,
          selectedVariant: item.selectedVariant,
          customText: item.customText,
          unitPrice: item.unitPrice,
          itemStatus: item.itemStatus ?? 'new',
          scheduledFor: item.scheduledFor,
          quantityDone: item.quantityDone ?? 0,
        })),
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        total: order.total,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Não foi possível consultar a encomenda.' }, { status: 500 })
  }
}
