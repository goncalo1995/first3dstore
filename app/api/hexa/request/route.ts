import { NextRequest, NextResponse } from 'next/server'
import { id } from '@instantdb/admin'
import { dbAdmin } from '@/lib/db-admin'
import {
  HEXA_COLORS,
  HEXA_ENGRAVING_FEE,
  HEXA_SIZES,
  type HexaColor,
  type HexaRequest,
  type HexaSize,
  type HexaSpaceType,
} from '@/types/hexa'

export const runtime = 'nodejs'

const spaceTypes = new Set<HexaSpaceType>(['Casa', 'Escritório', 'Loja', 'Restaurante'])
const sizes = new Set<HexaSize>(['XS', 'S', 'M'])
const colors = new Set<HexaColor>(Object.keys(HEXA_COLORS) as HexaColor[])

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isNumberInRange(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function priceRequest(request: HexaRequest) {
  const tilePrice = HEXA_SIZES[request.mosaicSize].price
  const subtotal = request.tiles.reduce((sum, tile) => {
    const engraving = tile.engravingText ? HEXA_ENGRAVING_FEE : 0
    return sum + tilePrice + engraving
  }, 0)
  const discountRate = request.tiles.length >= 10 ? 0.1 : 0
  const total = subtotal - subtotal * discountRate

  return {
    totalPrice: Math.round(total * 100) / 100,
    discountApplied: discountRate ? '10%' as const : null,
  }
}

function validateRequest(value: unknown): value is HexaRequest {
  if (!value || typeof value !== 'object') return false
  const request = value as Record<string, any>
  const customer = request.customer

  if (!customer || typeof customer !== 'object') return false
  if (typeof customer.name !== 'string' || customer.name.trim().length < 2) return false
  if (typeof customer.email !== 'string' || !isEmail(customer.email.trim())) return false
  if (typeof customer.phone !== 'string' || (customer.phone.trim().length > 0 && customer.phone.trim().length < 9)) return false
  if (!spaceTypes.has(customer.spaceType)) return false
  if (!sizes.has(request.mosaicSize)) return false
  if (!Array.isArray(request.tiles) || request.tiles.length < 1 || request.tiles.length > 20) return false
  if (!request.layout || request.layout.type !== 'honeycomb' || request.layout.gapMm !== 0) return false
  if (!(request.discountApplied === null || request.discountApplied === '10%')) return false
  if (!isNumberInRange(request.totalPrice, 0, 10000)) return false

  return request.tiles.every((tile: Record<string, unknown>) => {
    if (!tile || typeof tile !== 'object') return false
    if ('size' in tile || 'width' in tile || 'height' in tile) return false
    const adjustments = tile.photoAdjustments as Record<string, unknown> | undefined
    return (
      typeof tile.id === 'string' &&
      tile.id.length >= 1 &&
      typeof tile.color === 'string' &&
      colors.has(tile.color as HexaColor) &&
      adjustments &&
      isNumberInRange(adjustments.zoom, 0.5, 2) &&
      isNumberInRange(adjustments.offsetX, -0.2, 0.2) &&
      isNumberInRange(adjustments.offsetY, -0.2, 0.2) &&
      (tile.engravingText === null || (typeof tile.engravingText === 'string' && tile.engravingText.length <= 30)) &&
      isNumberInRange(tile.price, 0, 1000)
    )
  })
}

function buildNotes(request: HexaRequest) {
  return [
    'Fluxo: HexaMemória',
    `Tipo de espaço: ${request.customer.spaceType}`,
    `Tamanho: ${request.mosaicSize} (${HEXA_SIZES[request.mosaicSize].width} x ${HEXA_SIZES[request.mosaicSize].height}mm)`,
    `Peças: ${request.tiles.length}`,
    `Desconto aplicado: ${request.discountApplied ?? 'sem desconto'}`,
    `Preço estimado: ${request.totalPrice}€`,
  ].join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!validateRequest(body)) {
      return NextResponse.json({ error: 'A configuração do mosaico não é válida.' }, { status: 400 })
    }

    const serverPrice = priceRequest(body)
    const storedRequest: HexaRequest = {
      ...body,
      customer: {
        name: body.customer.name.trim(),
        email: body.customer.email.trim().toLowerCase(),
        phone: body.customer.phone.trim(),
        spaceType: body.customer.spaceType,
      },
      totalPrice: serverPrice.totalPrice,
      discountApplied: serverPrice.discountApplied,
      tiles: body.tiles.map((tile) => ({
        ...tile,
        engravingText: tile.engravingText?.trim() || null,
        price: HEXA_SIZES[body.mosaicSize].price,
      })),
    }

    const requestId = id()
    const now = new Date()
    const canvasConfig = {
      version: 1,
      type: 'hexa-memoria' as const,
      submittedAt: now.toISOString(),
      request: storedRequest,
    }

    await dbAdmin.transact(
      dbAdmin.tx.orderRequests[requestId].update({
        customerName: storedRequest.customer.name,
        customerEmail: storedRequest.customer.email,
        customerPhone: storedRequest.customer.phone,
        productSlug: 'hexa-memoria',
        productName: 'HexaMemória',
        selectedPrice: storedRequest.totalPrice,
        estimatedPrice: storedRequest.totalPrice,
        canvasConfig,
        engravingText: storedRequest.tiles.some((tile) => tile.engravingText) ? 'Gravações em peças individuais' : undefined,
        isPaid: false,
        notes: buildNotes(storedRequest),
        status: 'PENDING_REVIEW',
        createdAt: now,
        updatedAt: now,
      }),
    )

    return NextResponse.json({ ok: true, requestId })
  } catch (error) {
    console.error('HexaMemória request failed:', error)
    return NextResponse.json(
      { error: 'Não foi possível registar o pedido. Tente novamente.' },
      { status: 500 },
    )
  }
}
