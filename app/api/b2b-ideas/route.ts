import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateAiObject } from '@/lib/ai-service'
import {
  FALLBACK_B2B_IDEAS,
  checkB2BRateLimit,
  getRequestIp,
  hasUsefulInput,
  ideaLooksSafe,
  normalizeEmail,
  sanitizeField,
  verifyTurnstile,
} from '@/lib/b2b'

export const runtime = 'nodejs'

const ideaSchema = z.object({
  ideas: z.array(z.object({
    title: z.string().max(80),
    object: z.string().max(160),
    placement: z.string().max(160),
    utility: z.string().max(220),
    finish: z.string().max(160),
    prototypeStep: z.string().max(220),
  })).length(3),
}).strict()

function rateLimitHeaders(limit: number, remaining: number, resetAt: Date, retryAfterSeconds?: number) {
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', String(limit))
  headers.set('X-RateLimit-Remaining', String(Math.max(0, remaining)))
  headers.set('X-RateLimit-Reset', resetAt.toISOString())
  if (retryAfterSeconds) headers.set('Retry-After', String(retryAfterSeconds))
  return headers
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const ip = getRequestIp(req)
    const turnstileToken = sanitizeField(body?.turnstileToken, 2048)
    const businessType = sanitizeField(body?.businessType, 500)
    const space = sanitizeField(body?.space, 500)
    const goal = sanitizeField(body?.goal, 500)
    const constraints = sanitizeField(body?.constraints, 500)
    const email = normalizeEmail(body?.customerEmail)

    if (!hasUsefulInput([businessType, space, goal, constraints])) {
      return NextResponse.json(
        { error: 'Indique pelo menos dois campos úteis para gerar ideias práticas.', code: 'invalid_input' },
        { status: 400 },
      )
    }

    const limit = await checkB2BRateLimit({ action: 'ideas', ip, email, limit: 10 })
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

    const turnstile = await verifyTurnstile({ token: turnstileToken, ip, action: 'ideas' })
    if (!turnstile.ok) {
      return NextResponse.json(
        { error: 'Não conseguimos validar a verificação humana. Tente novamente.', code: 'turnstile_failed' },
        { status: 403 },
      )
    }

    const { object } = await generateAiObject({
      schema: ideaSchema,
      feature: 'b2b-ideas',
      timeoutMs: 10_000,
      temperature: 0.35,
      system: `És consultor de produto físico para a em3D, um estúdio premium de impressão 3D em Portugal.
Responde sempre em português europeu.
Gera apenas objetos físicos pequenos ou médios que façam sentido imprimir em 3D para espaços comerciais.
Não proponhas códigos digitais, tracking, instalações enormes, obras estruturais, peças médicas, fantasia, brinquedos infantis, armas, peças com carga estrutural ou promessas técnicas não verificadas.
As ideias devem ser úteis, sóbrias, fabricáveis e compatíveis com paredes, portas, balcões, mesas, receção ou sinalética.`,
      prompt: `Tipo de negócio: ${businessType}
Espaço: ${space}
Objetivo: ${goal}
Restrições: ${constraints || 'Sem restrições indicadas.'}

Devolve exatamente 3 ideias práticas. Para cada uma, explica:
- title: nome curto
- object: objeto físico a produzir
- placement: onde fica no espaço
- utility: porque é útil para o negócio
- finish: acabamento/material sugerido
- prototypeStep: primeiro passo de prototipagem`,
    })

    const ideas = object.ideas
    if (ideas.length !== 3 || ideas.some((idea) => !ideaLooksSafe(idea))) {
      console.warn('B2B AI ideas failed safety/shape check; serving fallback.', { businessType, space })
      return NextResponse.json({ ok: true, ideas: FALLBACK_B2B_IDEAS, fallback: true })
    }

    return NextResponse.json(
      { ok: true, ideas },
      { headers: rateLimitHeaders(limit.limit, limit.remaining, limit.resetAt) },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('timeout')) {
      return NextResponse.json(
        { error: 'A geração demorou demasiado. Pode enviar o formulário sem AI.', code: 'ai_timeout' },
        { status: 504 },
      )
    }
    console.error('B2B ideas failed:', error)
    return NextResponse.json(
      { error: 'Não foi possível gerar ideias neste momento.', code: 'ai_failed' },
      { status: 500 },
    )
  }
}
