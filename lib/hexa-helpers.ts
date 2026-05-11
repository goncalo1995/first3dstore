// lib/hexa-utils.ts
import { CatalogProduct } from '@/types'
import { HEXA_COLORS, HEXA_SIZES, HexaPhotoAdjustments, type HexaColor, type HexaSize, type HexaTile } from '@/types/hexa'
import { id } from '@instantdb/react'

const GAP_MM = 0
export const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'

export type PositionedTile = HexaTile & {
  q: number
  r: number
  x: number
  y: number
}

export const sizeToSlug: Record<HexaSize, string> = {
  XS: 'hexa-xs',
  S: 'hexa-s',
  M: 'hexa-m',
}

export const defaultAdjustments: HexaPhotoAdjustments = { zoom: 1, offsetX: 0, offsetY: 0 }

function axialRing(radius: number) {
  if (radius === 0) return [{ q: 0, r: 0 }]
  const directions = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ]
  const cells: { q: number; r: number }[] = []
  let q = -radius
  let r = radius
  for (const direction of directions) {
    for (let step = 0; step < radius; step++) {
      cells.push({ q, r })
      q += direction.q
      r += direction.r
    }
  }
  return cells
}

function axialPositions(count: number) {
  const positions: { q: number; r: number }[] = []
  let radius = 0
  while (positions.length < count) {
    positions.push(...axialRing(radius))
    radius++
  }
  return positions.slice(0, count)
}

export function computeHoneycomb(tiles: HexaTile[], size: HexaSize): PositionedTile[] {
  const dimensions = HEXA_SIZES[size]
  const positions = axialPositions(tiles.length)
  return tiles.map((tile, index) => {
    const cell = positions[index] ?? { q: 0, r: 0 }
    const centerX = (dimensions.width + GAP_MM) * (cell.q + cell.r / 2)
    const centerY = (dimensions.height * 0.75 + GAP_MM) * cell.r
    return {
      ...tile,
      q: cell.q,
      r: cell.r,
      x: centerX - dimensions.width / 2,
      y: centerY - dimensions.height / 2,
    }
  })
}

export function normalizeHoneycomb(tiles: PositionedTile[], size: HexaSize) {
  if (!tiles.length) return tiles
  const dimensions = HEXA_SIZES[size]
  const minX = Math.min(...tiles.map((t) => t.x))
  const minY = Math.min(...tiles.map((t) => t.y))
  return tiles.map((tile) => ({
    ...tile,
    x: tile.x - minX,
    y: tile.y - minY,
    width: dimensions.width,
    height: dimensions.height,
  }))
}

export function layoutBounds(tiles: ReturnType<typeof normalizeHoneycomb>, size: HexaSize) {
  if (!tiles.length) return { width: 1, height: 1 }
  const dimensions = HEXA_SIZES[size]
  return {
    width: Math.max(...tiles.map((t) => t.x + dimensions.width)),
    height: Math.max(...tiles.map((t) => t.y + dimensions.height)),
  }
}

export function createTile(color: HexaColor = 'Preto'): HexaTile {
  return {
    id: id(),
    color,
    photoPreviewUrl: null,
    photoName: null,
    photoAdjustments: defaultAdjustments,
  }
}

export function pricePreview(tileCount: number, unitPrice: number) {
  const subtotal = tileCount * unitPrice
  const discountAmount = tileCount >= 10 ? subtotal * 0.1 : 0
  return {
    subtotal,
    discountAmount,
    total: subtotal - discountAmount,
    discountApplied: tileCount >= 10 ? '10%' : null,
  }
}

export function productColors(product?: CatalogProduct) {
  const fromProduct = (product?.variants ?? [])
    .flatMap((variant) => variant.colors ?? [])
    .filter((color, index, list) => color.name && list.findIndex((item) => item.name === color.name) === index)

  if (fromProduct.length > 0) return fromProduct

  return (['Preto', 'Branco', 'Madeira'] as HexaColor[]).map((name) => ({
    name,
    hex: HEXA_COLORS[name].hex,
  }))
}


// Helper functions (podes colocar num ficheiro separado)
export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
}

export function colorHex(name: string, availableColors: { name: string; hex: string }[]) {
  return availableColors.find((color) => color.name === name)?.hex || HEXA_COLORS.Preto.hex
}