import { NextRequest, NextResponse } from 'next/server'
import { id } from '@instantdb/admin'
import { dbAdmin } from '@/lib/db-admin'
import {
  type B2BIdea,
  checkB2BRateLimit,
  getRequestIp,
  hashValue,
  isValidEmail,
  normalizeEmail,
  normalizePhone,
  parseFutureDate,
  sanitizeField,
  sendB2BLeadEmails,
  verifyTurnstile,
} from '@/lib/b2b'

export const runtime = 'nodejs'

const SUCCESS_MESSAGE = 'Pedido recebido. Enviaremos confirmação por email.'

function rateLimitHeaders(limit: number, remaining: number, resetAt: Date, retryAfterSeconds?: number) {
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', String(limit))
  headers.set('X-RateLimit-Remaining', String(Math.max(0, remaining)))
  headers.set('X-RateLimit-Reset', resetAt.toISOString())
  if (retryAfterSeconds) headers.set('Retry-After', String(retryAfterSeconds))
  return headers
}

function sanitizeIdeas(value: unknown): B2BIdea[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 3).map((idea) => ({
    title: sanitizeField(idea?.title, 80),
    object: sanitizeField(idea?.object, 160),
    placement: sanitizeField(idea?.placement, 160),
    utility: sanitizeField(idea?.utility, 220),
    finish: sanitizeField(idea?.finish, 160),
    prototypeStep: sanitizeField(idea?.prototypeStep, 220),
  })).filter((idea) => idea.title && idea.object)
}

function normalizeComparable(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const honeypot = sanitizeField(body?.honeypot, 80)
    if (honeypot) {
      return NextResponse.json({ ok: true, requestId: 'received', message: SUCCESS_MESSAGE })
    }

    const ip = getRequestIp(req)
    const ipHash = hashValue(ip).slice(0, 24)
    const userAgent = sanitizeField(req.headers.get('user-agent'), 240)
    const turnstileToken = sanitizeField(body?.turnstileToken, 2048)
    const customerName = sanitizeField(body?.customerName, 120)
    const companyName = sanitizeField(body?.companyName, 120)
    const customerEmail = normalizeEmail(body?.customerEmail)
    const rawPhone = sanitizeField(body?.customerPhone, 40)
    const customerPhone = normalizePhone(rawPhone)
    const businessType = sanitizeField(body?.businessType, 80)
    const businessTypeOther = sanitizeField(body?.businessTypeOther, 120)
    const goal = sanitizeField(body?.goal, 500)
    const message = sanitizeField(body?.message, 500)
    const aiIdeas = sanitizeIdeas(body?.aiIdeas)
    const deadlineResult = parseFutureDate(body?.deadline)

    if (!isValidEmail(customerEmail)) {
      return NextResponse.json({ error: 'Indique um email válido.', code: 'invalid_email' }, { status: 400 })
    }
    if (rawPhone && !customerPhone) {
      return NextResponse.json({ error: 'Indique um telefone válido ou deixe o campo em branco.', code: 'invalid_phone' }, { status: 400 })
    }
    if (!businessType) {
      return NextResponse.json({ error: 'Escolha o tipo de negócio.', code: 'missing_business_type' }, { status: 400 })
    }
    if (businessType === 'Outro' && businessTypeOther.length < 2) {
      return NextResponse.json({ error: 'Indique o tipo de negócio no campo “Outro”.', code: 'missing_business_type_other' }, { status: 400 })
    }
    if (goal.length < 3) {
      return NextResponse.json({ error: 'Indique o objetivo principal.', code: 'missing_goal' }, { status: 400 })
    }
    if (message.length < 10) {
      return NextResponse.json({ error: 'Descreva brevemente o que precisa.', code: 'missing_message' }, { status: 400 })
    }
    if (deadlineResult.error) {
      return NextResponse.json({ error: deadlineResult.error, code: 'invalid_deadline' }, { status: 400 })
    }

    let approximateQuantity: number | undefined
    if (body?.approximateQuantity !== undefined && body?.approximateQuantity !== null && body?.approximateQuantity !== '') {
      approximateQuantity = Number(body.approximateQuantity)
      if (!Number.isInteger(approximateQuantity) || approximateQuantity < 1 || approximateQuantity > 1000) {
        return NextResponse.json(
          { error: 'Indique uma quantidade entre 1 e 1000.', code: 'invalid_quantity' },
          { status: 400 },
        )
      }
    }

    const limit = await checkB2BRateLimit({ action: 'lead', ip, email: customerEmail, limit: 5 })
    if (!limit.ok) {
      return NextResponse.json(
        {
          error: `Muitos pedidos seguidos. Tente novamente dentro de ${Math.ceil(limit.retryAfterSeconds / 60)} minutos.`,
          code: 'rate_limited',
          retryAfterSeconds: limit.retryAfterSeconds,
        },
        { status: 429, headers: rateLimitHeaders(limit.limit, limit.remaining, limit.resetAt, limit.retryAfterSeconds) },
      )
    }

    const turnstile = await verifyTurnstile({ token: turnstileToken, ip, action: 'lead' })
    if (!turnstile.ok) {
      return NextResponse.json(
        { error: 'Não conseguimos validar a verificação humana. Tente novamente.', code: 'turnstile_failed' },
        { status: 403 },
      )
    }

    const now = new Date()
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)
    const existing = await dbAdmin.query({
      orderRequests: {
        $: { where: { customerEmail } },
      },
    })
    const companyComparable = normalizeComparable(companyName)
    const duplicate = (existing.orderRequests ?? []).find((request: any) => {
      if (request.leadType !== 'b2b') return false
      const createdAt = new Date(request.createdAt)
      if (createdAt < tenMinutesAgo) return false
      const sameCompany = companyComparable && normalizeComparable(request.companyName || '') === companyComparable
      const sameIp = request.b2bMetadata?.ipHash && request.b2bMetadata.ipHash === ipHash
      return sameCompany || sameIp
    }) as { id: string } | undefined

    if (duplicate) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        requestId: duplicate.id,
        message: 'Pedido recebido. Já tínhamos registado este contacto há instantes.',
      })
    }

    const requestId = id()
    const retentionReviewAt = new Date(now)
    retentionReviewAt.setFullYear(retentionReviewAt.getFullYear() + 1)

    const b2bMetadata = {
      version: 1,
      source: 'empresas',
      businessType,
      businessTypeOther: businessTypeOther || undefined,
      goal,
      approximateQuantity,
      deadline: deadlineResult.value,
      message,
      aiIdeas: aiIdeas.length ? aiIdeas : undefined,
      ipHash,
      userAgent,
      emailStatus: { customer: 'skipped' as const, admin: 'skipped' as const },
      retentionReviewAt: retentionReviewAt.toISOString(),
    }

    const notes = [
      `Lead B2B /empresas`,
      `Tipo: ${businessTypeOther || businessType}`,
      `Objetivo: ${goal}`,
      approximateQuantity ? `Quantidade aproximada: ${approximateQuantity}` : '',
      deadlineResult.value ? `Prazo: ${deadlineResult.value}` : '',
      '',
      message,
    ].filter(Boolean).join('\n')

    await dbAdmin.transact(
      dbAdmin.tx.orderRequests[requestId].update({
        customerName: customerName || 'Contacto B2B',
        customerEmail,
        customerPhone: customerPhone || undefined,
        companyName: companyName || undefined,
        notes,
        isPaid: false,
        leadType: 'b2b',
        status: 'PENDING_REVIEW',
        b2bMetadata,
        createdAt: now,
        updatedAt: now,
      }),
    )

    try {
      const emailStatus = await sendB2BLeadEmails({
        requestId,
        customerName: customerName || 'Contacto B2B',
        customerEmail,
        customerPhone,
        companyName,
        businessType,
        businessTypeOther,
        goal,
        approximateQuantity,
        deadline: deadlineResult.value,
        message,
        aiIdeas,
      })
      await dbAdmin.transact(
        dbAdmin.tx.orderRequests[requestId].update({
          b2bMetadata: { ...b2bMetadata, emailStatus },
          updatedAt: new Date(),
        }),
      )
    } catch (emailError) {
      console.error('B2B lead email update failed:', { requestId, emailError })
    }

    return NextResponse.json({ ok: true, requestId, message: SUCCESS_MESSAGE })
  } catch (error) {
    console.error('B2B lead failed:', error)
    return NextResponse.json(
      { error: 'Não foi possível registar o pedido. Tente novamente.', code: 'db_failed' },
      { status: 500 },
    )
  }
}
