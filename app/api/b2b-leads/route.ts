import { NextRequest, NextResponse } from 'next/server'
import { id } from '@instantdb/admin'
import { dbAdmin } from '@/lib/db-admin'

export const runtime = 'nodejs'

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const customerName = asString(body?.customerName)
    const companyName = asString(body?.companyName)
    const customerEmail = asString(body?.customerEmail).toLowerCase()
    const description = asString(body?.description)

    if (!isValidEmail(customerEmail)) {
      return NextResponse.json({ error: 'Indique um email válido.' }, { status: 400 })
    }

    if (description.length < 10) {
      return NextResponse.json({ error: 'Descreva brevemente o que precisa.' }, { status: 400 })
    }

    const requestId = id()
    const now = new Date()

    await dbAdmin.transact(
      dbAdmin.tx.orderRequests[requestId].update({
        customerName: customerName || 'Contacto B2B',
        customerEmail,
        companyName: companyName || undefined,
        notes: description,
        isPaid: false,
        leadType: 'b2b',
        status: 'B2B_LEAD',
        createdAt: now,
        updatedAt: now,
      }),
    )

    return NextResponse.json({ ok: true, requestId })
  } catch (error) {
    console.error('B2B lead failed:', error)
    return NextResponse.json(
      { error: 'Não foi possível registar o pedido. Tente novamente.' },
      { status: 500 },
    )
  }
}
