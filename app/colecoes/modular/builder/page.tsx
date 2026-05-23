'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { InstaQLEntity } from '@instantdb/react'
import { Check, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/db'
import type { AppSchema } from '@/instant.schema'
import {
  RAIL_LENGTH_MM,
  sanitizeMenuText,
} from '@/lib/menu-calculator'
import {
  PHYSICAL_GRID_DIMENSION_SET,
  clampRailModules,
  flattenTextRowsFromWalls,
  getCharacterWidthMm,
  getColumnMetrics,
  getWallsBom,
  inferRailModulesForText,
  measureTextMm,
  physicalGridToMenuRows,
  type ExtraLetterGroup,
  type FontStyle,
  type PhysicalColumn,
  type PhysicalColumnMetrics,
  type PhysicalRow,
  type PhysicalWall,
  type PhysicalWallsBom,
  type RailAlign,
  type TextAlign,
} from '@/lib/modular-physical-grid'
import type { ProductColor } from '@/lib/products'

const MENU_RAIL_SLUG = 'menu-rail-25cm'
const MENU_PACK_SLUG = 'menu-letter-pack-standard'
const MENU_AVULSO_SLUG = 'menu-letter-custom'
const SHIPPING_COST = 4.99
const BUILDER_STORAGE_KEY = 'em3d-modular-builder-active'
const GENERATED_WALLS_STORAGE_KEY = 'em3d-modular-planner-walls-v1'
const BUILDER_TOAST_STORAGE_KEY = 'em3d-modular-builder-toast'

type CatalogProductBase = InstaQLEntity<AppSchema, 'catalogProducts'>
type ProductInventoryRecord = InstaQLEntity<AppSchema, 'productInventory'>
type GlobalColorBase = InstaQLEntity<AppSchema, 'globalColors'>
type CatalogProduct = Omit<CatalogProductBase, 'updatedAt'> & {
  updatedAt: CatalogProductBase['updatedAt'] | Date
  inventory?: (Omit<ProductInventoryRecord, 'updatedAt'> & { updatedAt: ProductInventoryRecord['updatedAt'] | Date })
}
type GlobalColorRecord = Omit<GlobalColorBase, 'updatedAt'> & { updatedAt: GlobalColorBase['updatedAt'] | Date }

type BuilderDraftActive = {
  version: 4
  walls: PhysicalWall[]
  activeWallId: string
  fontStyle: FontStyle
  railColor?: ProductColor
  baseLetterColor?: ProductColor
  accentLetterColor?: ProductColor
  letterCardColor?: ProductColor
  extraLetterGroups: ExtraLetterGroup[]
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingMethod: 'pickup_carcavelos' | 'mainland_portugal'
  shippingAddress: string
  notes: string
}

type MenuColorPayload = {
  name: string
  hex?: string
  globalColorId?: string
  priceAdd?: number
}

const defaultExtraLetterGroups: ExtraLetterGroup[] = [
  { id: 'numbers', label: 'Números', charactersPerUnit: '0123456789', quantity: 0 },
  { id: 'vowels', label: 'Vogais', charactersPerUnit: 'aeiouAEIOUáàãéêíóõú', quantity: 0 },
  { id: 'symbols', label: 'Símbolos', charactersPerUnit: '€.,:-+/%&?!', quantity: 0 },
]

let idCounter = 0

function makeId(prefix: string) {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function createColumn({
  kind,
  leftText,
  rightText = '',
  railModules,
  railAlign,
  textAlign,
}: {
  kind: 'title' | 'item'
  leftText: string
  rightText?: string
  railModules?: number
  railAlign: RailAlign
  textAlign: TextAlign
}): PhysicalColumn {
  return {
    id: makeId('col'),
    kind,
    railModules: railModules ?? inferRailModulesForText(leftText, rightText),
    leftText,
    rightText,
    railAlign,
    textAlign,
  }
}

function createRow(columns: PhysicalColumn[]): PhysicalRow {
  return {
    id: makeId('row'),
    columns,
  }
}

function createTitleRow(title: string, railModules = 2) {
  const text = sanitizeMenuText(title).replace(/\s+/g, ' ').trim().toUpperCase()
  return createRow([
    createColumn({
      kind: 'title',
      leftText: text,
      railModules: Math.max(railModules, inferRailModulesForText(text)),
      railAlign: 'center',
      textAlign: 'center',
    }),
  ])
}

function createItemRow(leftText: string, rightText: string, railModules = 2, railAlign: RailAlign = 'left') {
  return createRow([
    createColumn({
      kind: 'item',
      leftText,
      rightText,
      railModules: Math.max(railModules, inferRailModulesForText(leftText, rightText)),
      railAlign,
      textAlign: 'left',
    }),
  ])
}

function createDefaultWalls(): PhysicalWall[] {
  return [
    {
      id: 'main-wall',
      name: 'Parede Principal',
      type: 'text',
      maxWidthCm: 200,
      rows: [
        createTitleRow('Entradas', 2),
        createRow([
          createColumn({ kind: 'item', leftText: 'SOPA DO DIA', rightText: '3,50€', railModules: 2, railAlign: 'left', textAlign: 'left' }),
          createColumn({ kind: 'item', leftText: 'TÁBUA MINI', rightText: '8,00€', railModules: 2, railAlign: 'right', textAlign: 'left' }),
        ]),
        createTitleRow('Pratos', 2),
        createRow([
          createColumn({ kind: 'item', leftText: 'BACALHAU DA CASA', rightText: '14,50€', railModules: 3, railAlign: 'left', textAlign: 'left' }),
          createColumn({ kind: 'item', leftText: 'BIFE GRELHADO', rightText: '16,00€', railModules: 3, railAlign: 'right', textAlign: 'left' }),
        ]),
        createTitleRow('Sobremesas', 2),
        createRow([
          createColumn({ kind: 'item', leftText: 'MOUSSE', rightText: '4,00€', railModules: 2, railAlign: 'left', textAlign: 'left' }),
          createColumn({ kind: 'item', leftText: 'CAFÉ', rightText: '1,20€', railModules: 2, railAlign: 'right', textAlign: 'left' }),
        ]),
      ],
    },
    {
      id: 'signal-wall',
      name: 'Sinalética',
      type: 'text',
      rows: [
        createRow([
          createColumn({ kind: 'title', leftText: 'WC', railModules: 1, railAlign: 'left', textAlign: 'center' }),
          createColumn({ kind: 'item', leftText: 'ABERTO', rightText: '09-19H', railModules: 2, railAlign: 'right', textAlign: 'left' }),
        ]),
      ],
    },
  ]
}

function createEmptyWall(index: number): PhysicalWall {
  const name = `Parede ${index}`
  return {
    id: makeId('wall'),
    name,
    type: 'text',
    rows: [createTitleRow(name, 2)],
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function cleanAlign(value: unknown): RailAlign | TextAlign | undefined {
  return value === 'left' || value === 'center' || value === 'right' ? value : undefined
}

function normalizeColumn(value: unknown, index: number): PhysicalColumn | null {
  if (!isObject(value)) return null
  const leftText = sanitizeMenuText(String(value.leftText ?? '')).slice(0, 160)
  const rightText = sanitizeMenuText(String(value.rightText ?? '')).slice(0, 120)
  if (!leftText.trim() && !rightText.trim()) return null

  const kind = value.kind === 'title' ? 'title' : 'item'
  const railAlign = cleanAlign(value.railAlign) ?? (kind === 'title' ? 'center' : 'left')
  const textAlign = cleanAlign(value.textAlign) ?? (kind === 'title' ? 'center' : 'left')

  return {
    id: String(value.id ?? `column-${index}`),
    kind,
    railModules: clampRailModules(Number(value.railModules ?? inferRailModulesForText(leftText, rightText))),
    leftText,
    rightText,
    railAlign,
    textAlign,
    colorOverride: typeof value.colorOverride === 'string' ? value.colorOverride : undefined,
  }
}

function normalizeRows(value: unknown): PhysicalRow[] {
  if (!Array.isArray(value)) return []
  return value
    .map((row, rowIndex) => {
      if (!isObject(row)) return null
      const columns = Array.isArray(row.columns)
        ? row.columns.map(normalizeColumn).filter((column): column is PhysicalColumn => Boolean(column))
        : []
      if (!columns.length) return null
      return {
        id: String(row.id ?? `row-${rowIndex}`),
        columns,
      }
    })
    .filter((row): row is PhysicalRow => Boolean(row))
}

function normalizeWalls(value: unknown): PhysicalWall[] {
  if (!Array.isArray(value)) return []
  return value
    .map((wall, wallIndex) => {
      if (!isObject(wall)) return null
      const type = wall.type === 'logo' ? 'logo' : 'text'
      const rows = type === 'logo' ? [] : normalizeRows(wall.rows)
      if (type === 'text' && !rows.length) return null
      const normalizedWall: PhysicalWall = {
        id: String(wall.id ?? `wall-${wallIndex + 1}`),
        name: String(wall.name ?? `Parede ${wallIndex + 1}`).trim() || `Parede ${wallIndex + 1}`,
        type,
        maxWidthCm: Number.isFinite(Number(wall.maxWidthCm)) ? Number(wall.maxWidthCm) : undefined,
        rows,
        logoSvgUrl: typeof wall.logoSvgUrl === 'string' ? wall.logoSvgUrl : undefined,
        logoSvgText: typeof wall.logoSvgText === 'string' ? wall.logoSvgText : undefined,
      }
      return normalizedWall
    })
    .filter((wall): wall is PhysicalWall => Boolean(wall))
}

function normalizeDraftColor(value: unknown): ProductColor | undefined {
  if (!isObject(value)) return undefined
  const name = String(value.name ?? '').trim()
  if (!name) return undefined
  return {
    name,
    hex: typeof value.hex === 'string' ? value.hex : '#d1d5db',
    globalColorId: typeof value.globalColorId === 'string' ? value.globalColorId : undefined,
    priceAdd: Number.isFinite(Number(value.priceAdd)) ? Number(value.priceAdd) : undefined,
  }
}

function normalizeExtraLetterGroups(value: unknown): ExtraLetterGroup[] {
  if (!Array.isArray(value)) return defaultExtraLetterGroups
  return defaultExtraLetterGroups.map(defaultGroup => {
    const found = value.find(candidate => isObject(candidate) && candidate.id === defaultGroup.id)
    if (!isObject(found)) return defaultGroup
    return {
      ...defaultGroup,
      quantity: Math.max(0, Math.trunc(Number(found.quantity) || 0)),
      color: normalizeDraftColor(found.color),
      charactersPerUnit: String(found.charactersPerUnit ?? defaultGroup.charactersPerUnit),
    }
  })
}

function readInitialDraft(): BuilderDraftActive {
  if (typeof window !== 'undefined') {
    try {
      const activeRaw = window.localStorage.getItem(BUILDER_STORAGE_KEY)
      if (activeRaw) {
        const parsed = JSON.parse(activeRaw) as unknown
        if (isObject(parsed) && parsed.version === 4) {
          const walls = normalizeWalls(parsed.walls)
          const activeWallId = String(parsed.activeWallId ?? walls[0]?.id ?? '')
          if (walls.length && walls.some(wall => wall.id === activeWallId)) {
            return {
              version: 4,
              walls,
              activeWallId,
              fontStyle: parsed.fontStyle === 'modern' ? 'modern' : 'classic',
              railColor: normalizeDraftColor(parsed.railColor),
              baseLetterColor: normalizeDraftColor(parsed.baseLetterColor),
              accentLetterColor: normalizeDraftColor(parsed.accentLetterColor),
              letterCardColor: normalizeDraftColor(parsed.letterCardColor),
              extraLetterGroups: normalizeExtraLetterGroups(parsed.extraLetterGroups),
              customerName: String(parsed.customerName ?? ''),
              customerEmail: String(parsed.customerEmail ?? ''),
              customerPhone: String(parsed.customerPhone ?? ''),
              shippingMethod: parsed.shippingMethod === 'mainland_portugal' ? 'mainland_portugal' : 'pickup_carcavelos',
              shippingAddress: String(parsed.shippingAddress ?? ''),
              notes: String(parsed.notes ?? ''),
            }
          }
        }
      }

      const generatedRaw = window.localStorage.getItem(GENERATED_WALLS_STORAGE_KEY)
      if (generatedRaw) {
        const parsed = JSON.parse(generatedRaw) as unknown
        const walls = isObject(parsed) ? normalizeWalls(parsed.walls) : []
        window.localStorage.removeItem(GENERATED_WALLS_STORAGE_KEY)
        if (walls.length) {
          return {
            ...createDefaultDraft(walls),
            activeWallId: walls[0].id,
          }
        }
      }
    } catch {
      // Invalid localStorage should fall through to the clean default template.
    }
  }

  return createDefaultDraft(createDefaultWalls())
}

function createDefaultDraft(walls: PhysicalWall[]): BuilderDraftActive {
  return {
    version: 4,
    walls,
    activeWallId: walls[0]?.id ?? 'main-wall',
    fontStyle: 'classic',
    extraLetterGroups: defaultExtraLetterGroups,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingMethod: 'pickup_carcavelos',
    shippingAddress: '',
    notes: '',
  }
}

function colorMatches(left: ProductColor | undefined, right: ProductColor | undefined) {
  if (!left || !right) return false
  if (left.globalColorId && right.globalColorId) return left.globalColorId === right.globalColorId
  return left.name.trim().toLowerCase() === right.name.trim().toLowerCase()
}

function uniqueColors(colors: ProductColor[]) {
  const byKey = new Map<string, ProductColor>()
  for (const color of colors) {
    const key = color.globalColorId ?? color.name.trim().toLowerCase()
    if (!byKey.has(key)) byKey.set(key, color)
  }
  return [...byKey.values()]
}

function intersectColorSets(colorSets: ProductColor[][]) {
  if (colorSets.length === 0) return []
  return colorSets[0].filter(color => colorSets.every(set => set.some(candidate => colorMatches(candidate, color))))
}

function getProductOfferedColors(product: CatalogProduct | undefined, activeGlobalColors: GlobalColorRecord[]) {
  const inventoryColors = product?.inventory?.colorInventory ?? []
  const colors = inventoryColors
    .filter(color => color.offered)
    .map((color): ProductColor | null => {
      const globalColor = activeGlobalColors.find(candidate => {
        if (color.globalColorId && candidate.id === color.globalColorId) return true
        return candidate.name.trim().toLowerCase() === color.colorName.trim().toLowerCase()
      })
      if (!globalColor) return null

      return {
        name: globalColor.name,
        hex: globalColor.hex,
        globalColorId: globalColor.id,
        priceAdd: globalColor.priceAdd ?? 0,
      }
    })
    .filter((color): color is ProductColor => Boolean(color))

  return uniqueColors(colors)
}

function findColor(colors: ProductColor[], names: string[]) {
  return colors.find(color => names.some(name => color.name.toLowerCase().includes(name))) ?? colors[0]
}

function findLightCardColor(colors: ProductColor[]) {
  return findColor(colors, ['branco', 'white', 'marfim', 'ivory', 'bege']) ?? colors[0]
}

function getProductPrice(product: CatalogProduct | undefined) {
  return product?.salePrice ?? product?.priceFrom ?? 0
}

function stripMenuColor(color: ProductColor): MenuColorPayload {
  return {
    name: color.name,
    hex: color.hex,
    globalColorId: color.globalColorId,
    priceAdd: color.priceAdd ?? 0,
  }
}

function SwatchPicker({
  label,
  colors,
  selected,
  onSelect,
}: {
  label: string
  colors: ProductColor[]
  selected?: ProductColor
  onSelect: (color: ProductColor) => void
}) {
  if (!colors.length) return null

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {colors.map(color => {
          const selectedColor = colorMatches(color, selected)
          return (
            <button
              key={color.globalColorId ?? color.name}
              type="button"
              onClick={() => onSelect(color)}
              className={`relative flex size-9 cursor-pointer items-center justify-center rounded-full border transition ${
                selectedColor ? 'border-stone-950 ring-2 ring-stone-950/20' : 'border-stone-300 hover:border-stone-500'
              }`}
              title={color.name}
              aria-label={`Escolher ${color.name}`}
            >
              <span className="size-7 rounded-full border border-stone-300" style={{ backgroundColor: color.hex }} />
              {selectedColor && <Check className="absolute size-4 text-white drop-shadow" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LetterTiles({
  text,
  railModules,
  colorHex,
  cardHex,
  textAlign,
}: {
  text: string
  railModules: number
  colorHex: string
  cardHex: string
  textAlign: TextAlign
}) {
  const availableWidth = clampRailModules(railModules) * RAIL_LENGTH_MM
  const characters = Array.from(text)
  const justify = textAlign === 'right' ? 'justify-end' : textAlign === 'center' ? 'justify-center' : 'justify-start'

  return (
    <div className={`flex min-w-0 items-end ${justify}`}>
      {characters.map((character, index) => {
        const isSpace = character === ' '
        const widthPercent = (getCharacterWidthMm(character) / availableWidth) * 100
        return (
          <span
            key={`${character}-${index}`}
            className="relative inline-flex h-8 min-w-[0.24rem] items-center justify-center rounded-[0.18rem] text-xs font-black leading-none sm:h-9 sm:text-sm"
            style={{
              width: `${widthPercent}%`,
              color: isSpace ? 'transparent' : colorHex,
              background: isSpace ? 'transparent' : cardHex,
              boxShadow: isSpace ? 'none' : '0 1px 1px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.72)',
            }}
          >
            {!isSpace && (
              <>
                <span className="absolute inset-x-1 top-1 h-px rounded-full bg-white/70" />
                <span className="relative truncate">{character}</span>
              </>
            )}
          </span>
        )
      })}
    </div>
  )
}

function PreviewColumn({
  rowId,
  column,
  metrics,
  railHex,
  baseLetterHex,
  accentLetterHex,
  letterCardHex,
}: {
  rowId: string
  column: PhysicalColumn
  metrics: PhysicalColumnMetrics
  railHex: string
  baseLetterHex: string
  accentLetterHex: string
  letterCardHex: string
}) {
  const justify = column.railAlign === 'right' ? 'justify-end' : column.railAlign === 'center' ? 'justify-center' : 'justify-start'
  const widthPercent = `${(clampRailModules(column.railModules) / 12) * 100}%`

  return (
    <div className={`flex w-full ${justify}`} aria-label={`${rowId} ${column.id}`}>
      <div
        className={`relative min-h-[82px] rounded-xl border p-3 pb-6 transition ${
          metrics.overflow
            ? 'border-red-400 bg-red-950/25 shadow-[0_0_0_2px_rgba(248,113,113,0.22)]'
            : 'border-white/10 bg-black/14'
        }`}
        style={{ width: widthPercent }}
      >
        <div className="grid min-h-[42px] grid-cols-[minmax(0,1fr)_minmax(0,0.55fr)] items-end gap-3">
          <LetterTiles text={column.leftText || ' '} railModules={column.railModules} colorHex={baseLetterHex} cardHex={letterCardHex} textAlign={column.textAlign} />
          <LetterTiles text={column.rightText} railModules={column.railModules} colorHex={accentLetterHex} cardHex={letterCardHex} textAlign="right" />
        </div>

        <div className="absolute inset-x-3 bottom-3 h-[10px] overflow-hidden rounded-b-md shadow-[0_5px_9px_rgba(0,0,0,0.2)]" style={{ background: railHex }}>
          <div className="absolute inset-x-0 top-0 h-px bg-white/24" />
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/22" />
          <div className="absolute inset-0 flex">
            {Array.from({ length: clampRailModules(column.railModules) }).map((_, moduleIndex) => (
              <span key={moduleIndex} className="relative flex-1 border-r border-white/18 last:border-r-0">
                <span className="absolute inset-y-1 left-0 w-px bg-black/18" />
              </span>
            ))}
          </div>
        </div>
        {metrics.overflow && <p className="mt-2 text-xs font-bold text-red-100">Texto excede o tamanho da calha física.</p>}
      </div>
    </div>
  )
}

function PhysicalGridPreview({
  wall,
  metricsByColumn,
  railColor,
  baseLetterColor,
  accentLetterColor,
  letterCardColor,
}: {
  wall: PhysicalWall
  metricsByColumn: Map<string, PhysicalColumnMetrics>
  railColor?: ProductColor
  baseLetterColor?: ProductColor
  accentLetterColor?: ProductColor
  letterCardColor?: ProductColor
}) {
  const railHex = railColor?.hex ?? '#111111'
  const baseLetterHex = baseLetterColor?.hex ?? '#f8f4e9'
  const accentLetterHex = accentLetterColor?.hex ?? '#d7b06f'
  const letterCardHex = letterCardColor?.hex ?? '#f7f2e8'

  return (
    <div className="relative min-h-[640px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#d8d1c3] p-5 text-stone-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:p-8">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.78),rgba(255,255,255,0.25)_42%,rgba(70,55,35,0.24)),radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.55),transparent_26%)]" />
      <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(90deg,rgba(90,73,52,.22)_1px,transparent_1px),linear-gradient(rgba(90,73,52,.18)_1px,transparent_1px)] [background-size:38px_38px]" />
      <div className="relative z-10">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#6a5130]">
          <Sparkles className="size-4" />
          {wall.name} · grelha física
        </p>
        <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold leading-[0.98] tracking-tight text-stone-950 sm:text-6xl">
          {wall.type === 'logo' ? 'Identidade em vector.' : 'Calha por calha.'}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-stone-700">
          Esta vista mostra apenas a parede activa. O BOM no rodapé soma todas as paredes do projecto.
        </p>

        <div className="mt-8 space-y-4">
          {wall.type === 'logo' ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-stone-950/10 bg-white/45 p-8 text-center text-sm font-semibold text-stone-700">
              Upload SVG entra no próximo passo. Esta parede já conta como pedido manual.
            </div>
          ) : (
            wall.rows.map(row => (
              <div key={row.id} className="grid gap-3">
                {row.columns.map(column => {
                  const metrics = metricsByColumn.get(`${row.id}:${column.id}`) ?? getColumnMetrics(row.id, column, wall)
                  return (
                    <PreviewColumn
                      key={column.id}
                      rowId={row.id}
                      column={column}
                      metrics={metrics}
                      railHex={railHex}
                      baseLetterHex={baseLetterHex}
                      accentLetterHex={accentLetterHex}
                      letterCardHex={letterCardHex}
                    />
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function WallTabs({
  walls,
  activeWallId,
  onSelect,
  onAdd,
  onRemove,
}: {
  walls: PhysicalWall[]
  activeWallId: string
  onSelect: (wallId: string) => void
  onAdd: () => void
  onRemove: (wallId: string) => void
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
      <div className="flex flex-wrap items-center gap-2">
        {walls.map(wall => {
          const active = wall.id === activeWallId
          return (
            <div key={wall.id} className={`flex items-center gap-1 rounded-full border px-2 py-1 transition ${active ? 'border-[#d4af37]/60 bg-[#d4af37]/18' : 'border-white/10 bg-black/20 hover:border-white/25'}`}>
              <button
                type="button"
                onClick={() => onSelect(wall.id)}
                className={`cursor-pointer rounded-full px-3 py-2 text-sm font-bold ${active ? 'text-white' : 'text-zinc-300'}`}
                aria-current={active ? 'page' : undefined}
                aria-label={active ? `${wall.name} · Parede activa` : `Abrir ${wall.name}`}
              >
                {wall.name}
              </button>
              {walls.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemove(wall.id)}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-white"
                  aria-label={`Remover parede ${wall.name}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          )
        })}
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white px-4 py-3 text-sm font-black text-[#09090b] transition hover:bg-[#d4af37]"
        >
          <Plus className="size-4" />
          Adicionar Parede
        </button>
      </div>
    </div>
  )
}

function WallInspector({
  wall,
  bom,
}: {
  wall: PhysicalWall
  bom: PhysicalWallsBom
}) {
  const wallMetrics = bom.walls.find(metric => metric.wallId === wall.id)
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Parede activa</p>
      <h2 className="mt-2 text-2xl font-black text-stone-950">{wall.name}</h2>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-stone-50 p-3">
          <p className="text-xs text-stone-500">Linhas</p>
          <p className="mt-1 text-xl font-black">{wallMetrics?.rowCount ?? 0}</p>
        </div>
        <div className="rounded-xl bg-stone-50 p-3">
          <p className="text-xs text-stone-500">Módulos</p>
          <p className="mt-1 text-xl font-black">{wallMetrics?.railModules ?? 0}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-stone-500">
        Nesta tranche, a edição fina de linhas, colunas, alinhamentos e logo fica preparada para o próximo passo. A navegação e o BOM já são multi-parede.
      </p>
    </div>
  )
}

function BomSummary({ bom, shippingCost }: { bom: PhysicalWallsBom; shippingCost: number }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white/96 p-4 shadow-[0_-18px_42px_rgba(15,23,42,0.12)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">BOM físico · todas as paredes</p>
          <p className="mt-1 text-2xl font-black">{formatMoney(bom.totalAfterDiscount + shippingCost)}</p>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            {bom.wallCount} paredes · {bom.totalRailModules} calhas · {bom.standardPackQuantity} packs · {bom.avulsoCharacterQuantity} letras avulso
          </p>
        </div>
        <div className={`rounded-full p-2 ${bom.hasOverflow ? 'bg-red-100 text-red-700' : 'bg-[#eef7f0] text-[#1f5138]'}`} title={bom.hasOverflow ? 'Existe texto em overflow' : 'BOM sem overflow'}>
          <Check className="size-4" />
        </div>
      </div>
    </div>
  )
}

export default function ModularBuilderPage() {
  const [draftHydrated, setDraftHydrated] = useState(false)
  const [walls, setWalls] = useState<PhysicalWall[]>(() => createDefaultWalls())
  const [activeWallId, setActiveWallId] = useState('main-wall')
  const [fontStyle, setFontStyle] = useState<FontStyle>('classic')
  const [extraLetterGroups, setExtraLetterGroups] = useState<ExtraLetterGroup[]>(defaultExtraLetterGroups)
  const [railColor, setRailColor] = useState<ProductColor | undefined>()
  const [baseLetterColor, setBaseLetterColor] = useState<ProductColor | undefined>()
  const [accentLetterColor, setAccentLetterColor] = useState<ProductColor | undefined>()
  const [letterCardColor, setLetterCardColor] = useState<ProductColor | undefined>()
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [shippingMethod, setShippingMethod] = useState<'pickup_carcavelos' | 'mainland_portugal'>('pickup_carcavelos')
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const query = db.useQuery({
    catalogProducts: {
      $: {
        where: {
          slug: { $in: [MENU_RAIL_SLUG, MENU_PACK_SLUG, MENU_AVULSO_SLUG] },
        },
      },
      inventory: {},
    },
    globalColors: {
      $: {
        where: {
          isActive: true,
        },
      },
    },
  })

  const products = useMemo(() => query.data?.catalogProducts ?? [], [query.data?.catalogProducts])
  const activeGlobalColors = useMemo(
    () => (query.data?.globalColors ?? []).filter(color => color.isActive !== false && color.spoolStatus !== 'archived'),
    [query.data?.globalColors],
  )
  const railProduct = products.find(product => product.slug === MENU_RAIL_SLUG)
  const packProduct = products.find(product => product.slug === MENU_PACK_SLUG)
  const avulsoProduct = products.find(product => product.slug === MENU_AVULSO_SLUG)
  const railColors = useMemo(() => getProductOfferedColors(railProduct, activeGlobalColors), [activeGlobalColors, railProduct])
  const packColors = useMemo(() => getProductOfferedColors(packProduct, activeGlobalColors), [activeGlobalColors, packProduct])
  const avulsoColors = useMemo(() => getProductOfferedColors(avulsoProduct, activeGlobalColors), [activeGlobalColors, avulsoProduct])
  const letterColors = useMemo(() => {
    if (packColors.length && avulsoColors.length) return intersectColorSets([packColors, avulsoColors])
    return uniqueColors([...packColors, ...avulsoColors])
  }, [avulsoColors, packColors])

  const selectedRailColor = railColor && railColors.some(color => colorMatches(color, railColor)) ? railColor : findColor(railColors, ['preto', 'black'])
  const selectedBaseLetterColor = baseLetterColor && letterColors.some(color => colorMatches(color, baseLetterColor)) ? baseLetterColor : findColor(letterColors, ['branco', 'white'])
  const selectedAccentLetterColor = accentLetterColor && letterColors.some(color => colorMatches(color, accentLetterColor)) ? accentLetterColor : findColor(letterColors, ['amarelo', 'dourado', 'gold']) ?? selectedBaseLetterColor
  const selectedLetterCardColor = letterCardColor && letterColors.some(color => colorMatches(color, letterCardColor)) ? letterCardColor : findLightCardColor(letterColors)

  const activeWall = useMemo(() => walls.find(wall => wall.id === activeWallId) ?? walls[0] ?? createDefaultWalls()[0], [activeWallId, walls])
  const metricsByColumn = useMemo(() => {
    const map = new Map<string, PhysicalColumnMetrics>()
    for (const row of activeWall.rows) {
      for (const column of row.columns) {
        map.set(`${row.id}:${column.id}`, getColumnMetrics(row.id, column, activeWall))
      }
    }
    return map
  }, [activeWall])

  const railModuleUnitPrice = getProductPrice(railProduct) + (selectedRailColor?.priceAdd ?? 0)
  const letterColorPriceAdd = Math.max(
    selectedBaseLetterColor?.priceAdd ?? 0,
    selectedAccentLetterColor?.priceAdd ?? 0,
    selectedLetterCardColor?.priceAdd ?? 0,
  )
  const standardPackUnitPrice = getProductPrice(packProduct) + letterColorPriceAdd
  const avulsoUnitPrice = getProductPrice(avulsoProduct) + letterColorPriceAdd
  const bom = useMemo(
    () => getWallsBom({
      walls,
      extraLetterGroups: extraLetterGroups.map(group => ({
        ...group,
        color: group.color ? stripMenuColor(group.color as ProductColor) : undefined,
      })),
      baseLetterColor: selectedBaseLetterColor ? stripMenuColor(selectedBaseLetterColor) : undefined,
      accentLetterColor: selectedAccentLetterColor ? stripMenuColor(selectedAccentLetterColor) : undefined,
      railModuleUnitPrice,
      standardPackUnitPrice,
      avulsoUnitPrice,
    }),
    [avulsoUnitPrice, extraLetterGroups, railModuleUnitPrice, selectedAccentLetterColor, selectedBaseLetterColor, standardPackUnitPrice, walls],
  )
  const shippingCost = shippingMethod === 'mainland_portugal' ? SHIPPING_COST : 0

  useEffect(() => {
    const fallbackMessage = window.localStorage.getItem(BUILDER_TOAST_STORAGE_KEY)
    if (fallbackMessage) {
      toast.info('Plano automático indisponível', { description: fallbackMessage, duration: 9000 })
      window.localStorage.removeItem(BUILDER_TOAST_STORAGE_KEY)
    }

    const draft = readInitialDraft()
    setWalls(draft.walls)
    setActiveWallId(draft.activeWallId)
    setFontStyle(draft.fontStyle)
    setRailColor(draft.railColor)
    setBaseLetterColor(draft.baseLetterColor)
    setAccentLetterColor(draft.accentLetterColor)
    setLetterCardColor(draft.letterCardColor)
    setExtraLetterGroups(draft.extraLetterGroups)
    setCustomerName(draft.customerName)
    setCustomerEmail(draft.customerEmail)
    setCustomerPhone(draft.customerPhone)
    setShippingMethod(draft.shippingMethod)
    setShippingAddress(draft.shippingAddress)
    setNotes(draft.notes)
    setDraftHydrated(true)
  }, [])

  useEffect(() => {
    if (!draftHydrated) return
    const draft: BuilderDraftActive = {
      version: 4,
      walls,
      activeWallId,
      fontStyle,
      railColor: selectedRailColor,
      baseLetterColor: selectedBaseLetterColor,
      accentLetterColor: selectedAccentLetterColor,
      letterCardColor: selectedLetterCardColor,
      extraLetterGroups,
      customerName,
      customerEmail,
      customerPhone,
      shippingMethod,
      shippingAddress,
      notes,
    }
    window.localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(draft))
  }, [
    activeWallId,
    customerEmail,
    customerName,
    customerPhone,
    draftHydrated,
    extraLetterGroups,
    fontStyle,
    notes,
    selectedAccentLetterColor,
    selectedBaseLetterColor,
    selectedLetterCardColor,
    selectedRailColor,
    shippingAddress,
    shippingMethod,
    walls,
  ])

  const addWall = useCallback(() => {
    setWalls(current => {
      const nextWall = createEmptyWall(current.length + 1)
      setActiveWallId(nextWall.id)
      return [...current, nextWall]
    })
  }, [])

  const removeWall = useCallback((wallId: string) => {
    setWalls(current => {
      if (current.length <= 1) return current
      const next = current.filter(wall => wall.id !== wallId)
      if (wallId === activeWallId) setActiveWallId(next[0]?.id ?? '')
      return next
    })
  }, [activeWallId])

  async function submitCheckout() {
    if (!selectedRailColor || !selectedBaseLetterColor || !selectedAccentLetterColor || !selectedLetterCardColor) {
      toast.error('Escolha as cores antes de finalizar.')
      return
    }
    if (bom.hasOverflow) {
      toast.error('Existe texto maior do que a calha física.')
      return
    }

    setIsSubmitting(true)
    try {
      const railColorPayload = stripMenuColor(selectedRailColor)
      const baseLetterColorPayload = stripMenuColor(selectedBaseLetterColor)
      const accentLetterColorPayload = stripMenuColor(selectedAccentLetterColor)
      const letterCardColorPayload = stripMenuColor(selectedLetterCardColor)
      const physicalGrid = flattenTextRowsFromWalls(walls)

      const response = await fetch('/api/checkout/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: customerName, email: customerEmail, phone: customerPhone },
          shipping: { method: shippingMethod, address: shippingAddress },
          notes,
          items: [
            {
              productSlug: MENU_RAIL_SLUG,
              quantity: bom.totalRailModules,
              selectedColor: railColorPayload,
              customizations: [],
            },
            {
              productSlug: MENU_PACK_SLUG,
              quantity: bom.standardPackQuantity,
              selectedColor: baseLetterColorPayload,
              customizations: [],
            },
            {
              productSlug: MENU_AVULSO_SLUG,
              quantity: bom.avulsoCharacterQuantity,
              selectedColor: baseLetterColorPayload,
              customizations: [],
            },
          ].filter(item => item.quantity > 0),
          menuSystem: {
            dimensionSet: PHYSICAL_GRID_DIMENSION_SET,
            fontStyle,
            walls,
            physicalGrid,
            lines: physicalGridToMenuRows(physicalGrid),
            totalRailModules: bom.totalRailModules,
            standardPackQuantity: bom.standardPackQuantity,
            avulsoCharacterQuantity: bom.avulsoCharacterQuantity,
            characterFrequencyMap: bom.characterFrequencyMap,
            characterFrequencyByColor: bom.characterFrequencyByColor,
            railColor: railColorPayload,
            letterColor: baseLetterColorPayload,
            baseLetterColor: baseLetterColorPayload,
            accentLetterColor: accentLetterColorPayload,
            letterCardColor: letterCardColorPayload,
          },
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível iniciar o checkout.')
      if (payload?.url) window.location.href = payload.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível iniciar o checkout.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <Header />
      <section className="relative overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(212,175,55,0.14),transparent_34%),radial-gradient(circle_at_76%_4%,rgba(56,189,248,0.10),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-[1600px] gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
          <div className="space-y-5">
            <WallTabs walls={walls} activeWallId={activeWall.id} onSelect={setActiveWallId} onAdd={addWall} onRemove={removeWall} />
            <PhysicalGridPreview
              wall={activeWall}
              metricsByColumn={metricsByColumn}
              railColor={selectedRailColor}
              baseLetterColor={selectedBaseLetterColor}
              accentLetterColor={selectedAccentLetterColor}
              letterCardColor={selectedLetterCardColor}
            />
          </div>

          <aside className="space-y-4">
            <WallInspector wall={activeWall} bom={bom} />
            <div className="rounded-2xl border border-stone-200 bg-white p-5 text-stone-950 shadow-sm">
              <h3 className="text-base font-black">Cores globais</h3>
              <p className="mt-1 text-sm text-stone-500">Aplicadas a todas as paredes deste projecto.</p>
              <div className="mt-5 grid gap-5">
                <SwatchPicker label="Cor das calhas" colors={railColors} selected={selectedRailColor} onSelect={setRailColor} />
                <SwatchPicker label="Letras base" colors={letterColors} selected={selectedBaseLetterColor} onSelect={setBaseLetterColor} />
                <SwatchPicker label="Letras destaque" colors={letterColors} selected={selectedAccentLetterColor} onSelect={setAccentLetterColor} />
                <SwatchPicker label="Cartões das letras" colors={letterColors} selected={selectedLetterCardColor} onSelect={setLetterCardColor} />
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-5 text-stone-950 shadow-sm">
              <h3 className="text-base font-black">Checkout</h3>
              <div className="mt-4 grid gap-3">
                <input className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-500" placeholder="Nome" value={customerName} onChange={event => setCustomerName(event.target.value)} />
                <input className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-500" placeholder="Email" value={customerEmail} onChange={event => setCustomerEmail(event.target.value)} />
                <input className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-500" placeholder="Telefone" value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} />
                <textarea className="min-h-20 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-500" placeholder="Notas" value={notes} onChange={event => setNotes(event.target.value)} />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="sticky bottom-0 z-30 border-t border-stone-200 bg-white/86 px-5 py-4 text-stone-950 backdrop-blur-xl sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1600px] gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <BomSummary bom={bom} shippingCost={shippingCost} />
          <Button
            type="button"
            onClick={submitCheckout}
            disabled={isSubmitting || bom.hasOverflow || !bom.totalRailModules}
            className="h-14 rounded-full bg-[#09090b] px-7 text-white hover:bg-[#26262c]"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Adicionar ao carrinho
          </Button>
        </div>
      </div>
      <Footer />
    </main>
  )
}
