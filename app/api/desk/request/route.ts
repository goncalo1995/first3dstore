import { NextRequest, NextResponse } from 'next/server'
import { id } from '@instantdb/admin'
import { dbAdmin } from '@/lib/db-admin'
import {
  buildDeskCanvasConfig,
  buildDeskRequestNotes,
  isEmail,
  sanitizeDeskQuoteContact,
  validateDeskQuoteContactLengths,
  validateDeskQuoteSetup,
} from '@/lib/desk/request'

export const runtime = 'nodejs'

type ErrorCode =
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'REQUEST_FAILED'

function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  fieldErrors?: Record<string, string>,
) {
  return NextResponse.json({
    success: false,
    code,
    message,
    ...(fieldErrors ? { fieldErrors } : {}),
  }, { status })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return errorResponse('INVALID_JSON', 'O pedido não é válido.', 400)
    }

    const contact = sanitizeDeskQuoteContact(body)
    const fieldErrors: Record<string, string> = validateDeskQuoteContactLengths(contact)

    if (contact.customerName.length < 2) {
      fieldErrors.customerName = 'Indique o seu nome.'
    }
    if (!isEmail(contact.customerEmail)) {
      fieldErrors.customerEmail = 'Indique um email válido.'
    }

    const quote = validateDeskQuoteSetup((body as { setup?: unknown }).setup)
    if (!quote.validation.valid) {
      fieldErrors.setup = quote.validation.errors.join(' ')
    }

    if (Object.keys(fieldErrors).length > 0) {
      return errorResponse('VALIDATION_ERROR', 'Verifique os dados do pedido.', 400, fieldErrors)
    }

    const requestId = id()
    const now = new Date()
    const canvasConfig = buildDeskCanvasConfig({
      setup: quote.setup,
      pricing: quote.pricing,
      warnings: quote.validation.warnings,
      submittedAt: now.toISOString(),
    })

    await dbAdmin.transact(
      dbAdmin.tx.orderRequests[requestId].update({
        customerName: contact.customerName,
        customerEmail: contact.customerEmail,
        customerPhone: contact.customerPhone,
        productSlug: 'desk-setup',
        productName: 'Setup de Secretária Personalizado',
        selectedPrice: quote.pricing.totalPrice,
        estimatedPrice: quote.pricing.totalPrice,
        canvasConfig,
        isPaid: false,
        notes: buildDeskRequestNotes({
          setup: quote.setup,
          contact,
          pricing: quote.pricing,
          warnings: quote.validation.warnings,
        }),
        status: 'PENDING_REVIEW',
        createdAt: now,
        updatedAt: now,
      }),
    )

    return NextResponse.json({
      success: true,
      requestId,
      pricing: quote.pricing,
      warnings: quote.validation.warnings,
      message: 'Pedido enviado para revisão.',
    })
  } catch (error) {
    console.error('Desk setup request failed:', error)
    return errorResponse('REQUEST_FAILED', 'Não foi possível enviar o pedido. Tente novamente.', 500)
  }
}
