import { NextRequest, NextResponse } from 'next/server'
import { id } from '@instantdb/admin'
import { dbAdmin } from '@/lib/db-admin'

export const runtime = 'nodejs'

type WallFramePayload = {
  id: string
  type?: string
  x: number
  y: number
  width: number
  height: number
  border: number
  color: string
  text: string
  imageUrl: null
}

type WallConfigPayload = {
  totalPrice: number
  discountApplied: string
  globalColorFallback: string
  layoutMode?: string
  gapMm?: number
  frames: WallFramePayload[]
}

const colors = new Set(['black', 'white', 'oak', 'terracotta', 'sage'])
const spaceTypes = new Set(['Casa', 'Restaurante', 'Escritório'])
const layoutModes = new Set(['grid', 'masonry', 'mosaic'])
const BASE_RATE = 0.025
const TEXT_FEE = 3

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isNumberInRange(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function validateFrame(frame: unknown): frame is WallFramePayload {
  if (!frame || typeof frame !== 'object') return false
  const item = frame as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    item.id.length >= 1 &&
    (item.type === undefined || item.type === 'quadrado' || item.type === 'retrato' || item.type === 'paisagem') &&
    isNumberInRange(item.x, 0, 5000) &&
    isNumberInRange(item.y, 0, 5000) &&
    isNumberInRange(item.width, 60, 300) &&
    isNumberInRange(item.height, 60, 300) &&
    isNumberInRange(item.border, 8, 45) &&
    typeof item.color === 'string' &&
    colors.has(item.color) &&
    typeof item.text === 'string' &&
    item.text.length <= 30 &&
    item.imageUrl === null
  )
}

function validateWallConfig(value: unknown): value is WallConfigPayload {
  if (!value || typeof value !== 'object') return false
  const config = value as Record<string, unknown>
  return (
    isNumberInRange(config.totalPrice, 0, 10000) &&
    typeof config.discountApplied === 'string' &&
    ['0%', '10%', '15%'].includes(config.discountApplied) &&
    typeof config.globalColorFallback === 'string' &&
    colors.has(config.globalColorFallback) &&
    (config.layoutMode === undefined || (typeof config.layoutMode === 'string' && layoutModes.has(config.layoutMode))) &&
    (config.gapMm === undefined || isNumberInRange(config.gapMm, 20, 100)) &&
    Array.isArray(config.frames) &&
    config.frames.length >= 1 &&
    config.frames.length <= 30 &&
    config.frames.every(validateFrame)
  )
}

function framesOverlap(a: WallFramePayload, b: WallFramePayload) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

function hasOverlaps(frames: WallFramePayload[]) {
  for (let i = 0; i < frames.length; i += 1) {
    for (let j = i + 1; j < frames.length; j += 1) {
      if (framesOverlap(frames[i], frames[j])) return true
    }
  }
  return false
}

function priceFrames(frames: WallFramePayload[]) {
  const subtotal = frames.reduce((sum, frame) => {
    const areaCm2 = (frame.width * frame.height) / 100
    const engraving = frame.text.trim() ? TEXT_FEE : 0
    return sum + areaCm2 * BASE_RATE + engraving
  }, 0)
  const discountRate = frames.length >= 20 ? 0.15 : frames.length >= 10 ? 0.1 : 0
  const total = subtotal - subtotal * discountRate

  return {
    totalPrice: Math.round(total * 100) / 100,
    discountApplied: discountRate ? `${Math.round(discountRate * 100)}%` : '0%',
  }
}

function buildNotes({
  wallConfig,
  spaceType,
  customerPhone,
}: {
  wallConfig: WallConfigPayload
  spaceType: string
  customerPhone: string
}) {
  return [
    'Fluxo: Wall-Forge',
    `Tipo de espaço: ${spaceType}`,
    `Molduras: ${wallConfig.frames.length}`,
    wallConfig.layoutMode ? `Layout: ${wallConfig.layoutMode}` : null,
    wallConfig.gapMm ? `Espaçamento: ${wallConfig.gapMm}mm` : null,
    `Desconto aplicado: ${wallConfig.discountApplied}`,
    `Preço estimado: ${wallConfig.totalPrice}€`,
    customerPhone ? `Telefone: ${customerPhone}` : 'Telefone: não indicado',
  ].filter(Boolean).join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : ''
    const customerEmail = typeof body.customerEmail === 'string' ? body.customerEmail.trim().toLowerCase() : ''
    const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone.trim() : ''
    const spaceType = typeof body.spaceType === 'string' ? body.spaceType.trim() : ''
    const wallConfig = body.wallConfig

    if (customerName.length < 2) {
      return NextResponse.json({ error: 'Indique o seu nome.' }, { status: 400 })
    }

    if (!isEmail(customerEmail)) {
      return NextResponse.json({ error: 'Indique um email válido.' }, { status: 400 })
    }

    if (!spaceTypes.has(spaceType)) {
      return NextResponse.json({ error: 'Escolha o tipo de espaço.' }, { status: 400 })
    }

    if (!validateWallConfig(wallConfig)) {
      return NextResponse.json({ error: 'A configuração da parede não é válida.' }, { status: 400 })
    }

    if (hasOverlaps(wallConfig.frames)) {
      return NextResponse.json(
        { error: 'A configuração da parede contém molduras sobrepostas.' },
        { status: 400 },
      )
    }

    const serverPrice = priceFrames(wallConfig.frames)
    const storedWallConfig: WallConfigPayload = {
      ...wallConfig,
      totalPrice: serverPrice.totalPrice,
      discountApplied: serverPrice.discountApplied,
    }
    const requestId = id()
    const now = new Date()
    const canvasConfig = {
      version: 1,
      type: 'wall-forge' as const,
      submittedAt: now.toISOString(),
      spaceType,
      wallConfig: storedWallConfig,
    }

    await dbAdmin.transact(
      dbAdmin.tx.orderRequests[requestId].update({
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        productSlug: 'wall-forge',
        productName: 'Wall-Forge',
        selectedPrice: storedWallConfig.totalPrice,
        estimatedPrice: storedWallConfig.totalPrice,
        canvasConfig,
        isPaid: false,
        notes: buildNotes({ wallConfig: storedWallConfig, spaceType, customerPhone }),
        status: 'PENDING_REVIEW',
        createdAt: now,
        updatedAt: now,
      }),
    )

    return NextResponse.json({ ok: true, requestId })
  } catch (error) {
    console.error('Wall-Forge request failed:', error)
    return NextResponse.json(
      { error: 'Não foi possível registar o pedido. Tente novamente.' },
      { status: 500 },
    )
  }
}
