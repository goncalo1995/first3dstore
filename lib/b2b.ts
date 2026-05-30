import { createHash } from 'node:crypto'
import { id } from '@instantdb/admin'
import type { NextRequest } from 'next/server'
import { dbAdmin } from './db-admin'
import { getAdminEmails, sendSmtpEmail } from './smtp-email'

export type B2BIdea = {
  title: string
  object: string
  placement: string
  utility: string
  finish: string
  prototypeStep: string
}

export const BUSINESS_TYPES = [
  'Restaurante / Café',
  'Loja / Retalho',
  'Hotelaria',
  'Escritório / Cowork',
  'Clínica / Bem-estar',
  'Evento / Ativação',
  'Outro',
] as const

export const FALLBACK_B2B_IDEAS: B2BIdea[] = [
  {
    title: 'Sinalética modular de balcão',
    object: 'Placas pequenas com texto substituível',
    placement: 'Balcão, receção ou zona de pagamento',
    utility: 'Organiza informação útil sem depender de impressão em papel.',
    finish: 'PLA mate em preto, branco ou dourado técnico',
    prototypeStep: 'Validar 3 mensagens prioritárias e produzir uma primeira peça de teste.',
  },
  {
    title: 'Marcadores físicos de zona',
    object: 'Etiquetas 3D para portas, paredes ou prateleiras',
    placement: 'Entrada de salas, zonas de recolha ou áreas de atendimento',
    utility: 'Melhora orientação no espaço com acabamento mais durável.',
    finish: 'Base escura mate com lettering contrastante',
    prototypeStep: 'Escolher uma zona piloto e medir a largura disponível.',
  },
  {
    title: 'Suportes úteis personalizados',
    object: 'Peças para menus, cartões, amostras ou pequenos produtos',
    placement: 'Mesas, montras, receção ou expositores',
    utility: 'Transforma necessidades operacionais em objetos físicos com identidade.',
    finish: 'Material mate com cor de marca discreta',
    prototypeStep: 'Fotografar o local e definir o objeto que precisa de suporte.',
  },
]

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

export function sanitizeField(value: unknown, maxLength = 500) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

export function normalizeEmail(value: unknown) {
  return sanitizeField(value, 180).toLowerCase()
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function normalizePhone(value: unknown) {
  const phone = sanitizeField(value, 32)
  if (!phone) return ''
  return /^[+\d\s().-]{5,32}$/.test(phone) ? phone.replace(/\s+/g, ' ') : ''
}

export function parseFutureDate(value: unknown) {
  const dateText = sanitizeField(value, 10)
  if (!dateText) return { value: undefined as string | undefined, error: '' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return { value: undefined, error: 'Escolha uma data futura ou deixe o campo em branco.' }
  }
  const date = new Date(`${dateText}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    return { value: undefined, error: 'Escolha uma data futura ou deixe o campo em branco.' }
  }
  const today = new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  if (date < todayUtc) {
    return { value: undefined, error: 'Escolha uma data futura ou deixe o campo em branco.' }
  }
  return { value: dateText, error: '' }
}

export function hashValue(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function getRequestIp(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return req.headers.get('cf-connecting-ip') || forwarded || req.headers.get('x-real-ip') || 'unknown'
}

export function hasUsefulInput(values: string[]) {
  const combined = values.join(' ').trim()
  if (combined.length < 18) return false
  if (/(.)\1{12,}/.test(combined)) return false
  const words = combined.split(/\s+/).filter(word => /[a-zÀ-ÿ0-9]{3,}/i.test(word))
  return words.length >= 4
}

export function ideaLooksSafe(idea: B2BIdea) {
  const text = Object.values(idea).join(' ').toLowerCase()
  const banned = ['arma', 'weapon', 'medical', 'médico', 'estrutural', 'suporte de carga', 'infantil para bebé']
  return !banned.some(term => text.includes(term))
}

export async function verifyTurnstile({
  token,
  ip,
  action,
}: {
  token: string
  ip: string
  action: 'lead' | 'ideas'
}) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret && process.env.NODE_ENV !== 'production' && token === 'dev-turnstile-bypass') {
    return { ok: true as const }
  }

  if (!secret || !token) {
    console.warn('Turnstile verification missing config or token.', { action, hasSecret: Boolean(secret), hasToken: Boolean(token) })
    return { ok: false as const, reason: 'missing' }
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: secret,
        response: token,
        remoteip: ip,
      }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!payload.success) {
      console.warn('Turnstile verification failed.', { action, errors: payload['error-codes'] ?? [] })
      return { ok: false as const, reason: 'invalid', errors: payload['error-codes'] ?? [] }
    }
    return { ok: true as const }
  } catch (error) {
    console.error('Turnstile verification network failure.', { action, error })
    return { ok: false as const, reason: 'network' }
  }
}

export async function checkB2BRateLimit({
  action,
  ip,
  email,
  limit,
}: {
  action: 'lead' | 'ideas'
  ip: string
  email?: string
  limit: number
}) {
  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setMinutes(0, 0, 0)
  const resetAt = new Date(windowStart.getTime() + 60 * 60 * 1000)
  const identities = [`ip:${hashValue(ip).slice(0, 24)}`]
  if (email) identities.push(`email:${hashValue(email).slice(0, 24)}`)

  for (const identity of identities) {
    const key = `${action}:${identity}:${windowStart.toISOString()}`
    const data = await dbAdmin.query({
      b2bRateLimitBuckets: {
        $: { where: { key } },
      },
    })
    const bucket = (data.b2bRateLimitBuckets?.[0] as any) || null
    const nextCount = Number(bucket?.count ?? 0) + 1
    if (nextCount > limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000))
      return { ok: false as const, retryAfterSeconds, resetAt, limit, remaining: 0 }
    }

    await dbAdmin.transact(
      dbAdmin.tx.b2bRateLimitBuckets[bucket?.id ?? id()].update({
        key,
        action,
        windowStart,
        count: nextCount,
        updatedAt: now,
      }),
    )
  }

  return { ok: true as const, retryAfterSeconds: 0, resetAt, limit, remaining: Math.max(0, limit - 1) }
}

function formatIdeaSummary(ideas: B2BIdea[] = []) {
  if (!ideas.length) return '-'
  return ideas.map((idea, index) => `${index + 1}. ${idea.title}
   Objeto: ${idea.object}
   Local: ${idea.placement}
   Utilidade: ${idea.utility}
   Acabamento: ${idea.finish}
   Primeiro passo: ${idea.prototypeStep}`).join('\n\n')
}

export async function sendB2BLeadEmails({
  requestId,
  customerName,
  customerEmail,
  customerPhone,
  companyName,
  businessType,
  businessTypeOther,
  goal,
  approximateQuantity,
  deadline,
  message,
  aiIdeas,
}: {
  requestId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  companyName?: string
  businessType: string
  businessTypeOther?: string
  goal: string
  approximateQuantity?: number
  deadline?: string
  message: string
  aiIdeas?: B2BIdea[]
}) {
  const emailStatus: { customer?: 'sent' | 'failed' | 'skipped'; admin?: 'sent' | 'failed' | 'skipped'; lastError?: string } = {}
  const displayName = customerName || 'Contacto B2B'
  const typeLabel = businessTypeOther || businessType
  const summary = `Referência: ${requestId}
Nome: ${displayName}
Empresa: ${companyName || '-'}
Email: ${customerEmail}
Telefone: ${customerPhone || '-'}
Tipo de negócio: ${typeLabel}
Objetivo: ${goal}
Quantidade aproximada: ${approximateQuantity ?? '-'}
Prazo: ${deadline || '-'}

Mensagem:
${message}

Ideias AI:
${formatIdeaSummary(aiIdeas)}`

  try {
    const result = await sendSmtpEmail({
      to: customerEmail,
      subject: 'Recebemos o seu pedido B2B na em3D',
      text: `Olá ${displayName},

Recebemos o seu pedido B2B na em3D.

Referência: ${requestId}

Vamos rever o contexto e responder por email no prazo de 1 dia útil com próximos passos, dúvidas técnicas ou uma proposta inicial.

Resumo recebido:
${summary}

A equipa em3D
${siteUrl()}`,
      meta: {
        requestId,
        kind: 'customer',
        flow: 'b2b_lead',
      },
    })
    emailStatus.customer = result.ok ? 'sent' : result.skipped ? 'skipped' : 'failed'
    if (!result.ok) {
      emailStatus.lastError = result.error
      console.error('B2B customer email failed.', { requestId, error: result.error })
    } else {
      console.info('B2B customer email sent.', { requestId, customerEmail })
    }
  } catch (error) {
    emailStatus.customer = 'failed'
    emailStatus.lastError = error instanceof Error ? error.message : 'Customer email failed'
    console.error('B2B customer email exception.', { requestId, error })
  }

  const adminEmails = getAdminEmails()
  if (!adminEmails.length) {
    emailStatus.admin = 'skipped'
    console.warn('B2B admin email skipped because ADMIN_EMAILS is empty.', { requestId })
    return emailStatus
  }

  try {
    const result = await sendSmtpEmail({
      to: adminEmails,
      subject: `Novo lead B2B em3D - ${companyName || displayName}`,
      text: `Novo lead B2B recebido em /empresas.

${summary}`,
      meta: {
        requestId,
        kind: 'admin',
        flow: 'b2b_lead',
      },
    })
    emailStatus.admin = result.ok ? 'sent' : result.skipped ? 'skipped' : 'failed'
    if (!result.ok) {
      emailStatus.lastError = result.error
      console.error('B2B admin email failed.', { requestId, error: result.error })
    } else {
      console.info('B2B admin email sent.', { requestId, adminEmails })
    }
  } catch (error) {
    emailStatus.admin = 'failed'
    emailStatus.lastError = error instanceof Error ? error.message : 'Admin email failed'
    console.error('B2B admin email exception.', { requestId, error })
  }

  return emailStatus
}
