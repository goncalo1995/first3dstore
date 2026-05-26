'use client'

import { useCallback, useEffect, useMemo, useState, type FocusEvent } from 'react'
import type { InstaQLEntity } from '@instantdb/react'
import { Check, ChevronDown, Copy, Loader2, Minus, MousePointer2, Palette, Pencil, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BottomInspector, MobileToolDock } from './builder-mobile-shell'
import { ReviewSheet } from './builder-review-sheet'
import { db } from '@/lib/db'
import type { AppSchema } from '@/instant.schema'
import { sanitizeSvg } from '@/lib/puzzle/svg'
import {
  useModularBuilderState,
  usePersistModularBuilderDraft,
} from '@/lib/modular-builder-state'
import {
  EXTRA_LETTER_PACKS,
  RAIL_LENGTH_MM,
  type ExtraLetterPackId,
  type ExtraLetterPackSelection,
} from '@/lib/modular-inventory-config'
import { sanitizeMenuText } from '@/lib/menu-calculator'
import {
  PHYSICAL_GRID_DIMENSION_SET,
  clampRailModules,
  getCharacterWidthMm,
  getColumnMetrics,
  getWallsBom,
  inferRailModulesForText,
  type FontStyle,
  type CheckoutLane,
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
const MENU_PRODUCT_SLUGS = [MENU_RAIL_SLUG, MENU_PACK_SLUG, MENU_AVULSO_SLUG]
const SHIPPING_COST = 4.99
const BUILDER_STORAGE_KEY = 'em3d-modular-builder-active'
const GENERATED_WALLS_STORAGE_KEY = 'em3d-modular-planner-walls-v1'
const BUILDER_TOAST_STORAGE_KEY = 'em3d-modular-builder-toast'
const MAX_COLUMNS_PER_ROW = 6
const MAX_LOGO_SVG_BYTES = 150 * 1024

type CatalogProductBase = InstaQLEntity<AppSchema, 'catalogProducts'>
type ProductInventoryRecord = InstaQLEntity<AppSchema, 'productInventory'>
type GlobalColorBase = InstaQLEntity<AppSchema, 'globalColors'>
type CatalogProduct = Omit<CatalogProductBase, 'updatedAt'> & {
  updatedAt: CatalogProductBase['updatedAt'] | Date
  inventory?: (Omit<ProductInventoryRecord, 'updatedAt'> & { updatedAt: ProductInventoryRecord['updatedAt'] | Date })
}
type GlobalColorRecord = Omit<GlobalColorBase, 'updatedAt'> & { updatedAt: GlobalColorBase['updatedAt'] | Date }
type CustomBrandColorTarget = 'rails' | 'letters'
type MobilePanel =
  | { type: 'closed' }
  | { type: 'structure' }
  | { type: 'column'; rowId: string; columnId: string }
  | { type: 'colors' }
  | { type: 'extras' }
  | { type: 'checkout' }
  | { type: 'walls' }
type DesktopEditorTab = 'structure' | 'edit'
type SelectedColumnRef = { rowId: string; columnId: string }
type ResolvedColorSource = 'explicit' | 'default' | 'custom' | 'missing' | 'invalid'
type ResolvedBuilderColor = {
  color?: ProductColor
  source: ResolvedColorSource
  error?: string
}

type BuilderDraftActive = {
  version: 5
  walls: PhysicalWall[]
  activeWallId: string
  fontStyle: FontStyle
  railColor?: ProductColor
  baseLetterColor?: ProductColor
  accentLetterColor?: ProductColor
  letterCardColor?: ProductColor
  customBrandColor?: string
  customBrandColorTarget?: CustomBrandColorTarget
  extraLetterPackSelections: ExtraLetterPackSelection[]
  customerName: string
  customerEmail: string
  customerPhone: string
  spaceType: string
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

function normalizeProductInventoryRecord(value: unknown) {
  if (Array.isArray(value)) return value[0] as CatalogProduct['inventory'] | undefined
  return value as CatalogProduct['inventory'] | undefined
}

const EXTRA_PACK_OPTIONS = Object.values(EXTRA_LETTER_PACKS)

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

function getByteSize(value: string) {
  return new TextEncoder().encode(value).byteLength
}

function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svg)))}`
}

function tintSvgForPreview(svg: string, color: string) {
  const tinted = svg
    .replace(/\sfill=(["'])(?!none\b|transparent\b|url\(|currentColor\b)[^"']*\1/gi, ` fill="${color}"`)
    .replace(/\sstroke=(["'])(?!none\b|transparent\b|url\(|currentColor\b)[^"']*\1/gi, ` stroke="${color}"`)
    .replace(/fill\s*:\s*(?!none\b|transparent\b|url\(|currentColor\b)[^;"']+/gi, `fill: ${color}`)
    .replace(/stroke\s*:\s*(?!none\b|transparent\b|url\(|currentColor\b)[^;"']+/gi, `stroke: ${color}`)
  return tinted.replace(/<(path|rect|circle|ellipse|polygon|polyline|text|line)\b(?![^>]*\sfill=)/gi, `<$1 fill="${color}"`)
}

function createColumn({
  id,
  kind,
  leftText,
  rightText = '',
  railModules,
  railAlign,
  textAlign,
}: {
  id?: string
  kind: 'title' | 'item'
  leftText: string
  rightText?: string
  railModules?: number
  railAlign: RailAlign
  textAlign: TextAlign
}): PhysicalColumn {
  return {
    id: id ?? makeId('col'),
    kind,
    railModules: railModules ?? inferRailModulesForText(leftText, rightText),
    leftText,
    rightText,
    railAlign,
    textAlign,
  }
}

function createRow(columns: PhysicalColumn[], id?: string): PhysicalRow {
  return {
    id: id ?? makeId('row'),
    columns,
  }
}

function createTitleRow(title: string, railModules = 2, id?: string, columnId?: string) {
  const text = sanitizeMenuText(title).replace(/\s+/g, ' ').trim().toUpperCase()
  return createRow([
    createColumn({
      id: columnId,
      kind: 'title',
      leftText: text,
      railModules: Math.max(railModules, inferRailModulesForText(text)),
      railAlign: 'center',
      textAlign: 'center',
    }),
  ], id)
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
        createTitleRow('Entradas', 2, 'main-wall-row-entradas-title', 'main-wall-col-entradas-title'),
        createRow([
          createColumn({ id: 'main-wall-col-sopa', kind: 'item', leftText: 'SOPA DO DIA', rightText: '3,50€', railModules: 2, railAlign: 'left', textAlign: 'left' }),
          createColumn({ id: 'main-wall-col-bruschetta', kind: 'item', leftText: 'BRUSCHETTA', rightText: '5,00€', railModules: 2, railAlign: 'center', textAlign: 'left' }),
          createColumn({ id: 'main-wall-col-tabua-mini', kind: 'item', leftText: 'TÁBUA MINI', rightText: '8,00€', railModules: 2, railAlign: 'right', textAlign: 'left' }),
        ], 'main-wall-row-entradas-items'),
        createTitleRow('Pratos', 2, 'main-wall-row-pratos-title', 'main-wall-col-pratos-title'),
        createRow([
          createColumn({ id: 'main-wall-col-bacalhau', kind: 'item', leftText: 'BACALHAU DA CASA', rightText: '14,50€', railModules: 3, railAlign: 'left', textAlign: 'left' }),
          createColumn({ id: 'main-wall-col-risotto', kind: 'item', leftText: 'RISOTTO', rightText: '13,00€', railModules: 2, railAlign: 'center', textAlign: 'left' }),
          createColumn({ id: 'main-wall-col-bife', kind: 'item', leftText: 'BIFE GRELHADO', rightText: '16,00€', railModules: 3, railAlign: 'right', textAlign: 'left' }),
        ], 'main-wall-row-pratos-items'),
        createTitleRow('Sobremesas', 2, 'main-wall-row-sobremesas-title', 'main-wall-col-sobremesas-title'),
        createRow([
          createColumn({ id: 'main-wall-col-mousse', kind: 'item', leftText: 'MOUSSE', rightText: '4,00€', railModules: 2, railAlign: 'left', textAlign: 'left' }),
          createColumn({ id: 'main-wall-col-pudim', kind: 'item', leftText: 'PUDIM', rightText: '4,50€', railModules: 2, railAlign: 'center', textAlign: 'left' }),
          createColumn({ id: 'main-wall-col-cafe', kind: 'item', leftText: 'CAFÉ', rightText: '1,20€', railModules: 1, railAlign: 'right', textAlign: 'left' }),
        ], 'main-wall-row-sobremesas-items'),
      ],
    },
    {
      id: 'signal-wall',
      name: 'Sinalética',
      type: 'text',
      rows: [
        createRow([
          createColumn({ id: 'signal-wall-col-wc', kind: 'title', leftText: 'WC', railModules: 1, railAlign: 'left', textAlign: 'center' }),
          createColumn({ id: 'signal-wall-col-aberto', kind: 'item', leftText: 'ABERTO', rightText: '09-19H', railModules: 2, railAlign: 'right', textAlign: 'left' }),
        ], 'signal-wall-row-main'),
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

function cleanLayoutRole(value: unknown): PhysicalRow['layoutRole'] {
  return value === 'title' || value === 'list' || value === 'grid' ? value : undefined
}

function normalizeColumn(value: unknown, index: number): PhysicalColumn | null {
  if (!isObject(value)) return null
  const leftText = sanitizeMenuText(String(value.leftText ?? '')).slice(0, 160)
  const rightText = sanitizeMenuText(String(value.rightText ?? '')).slice(0, 120)
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
        ...(Number.isFinite(Number(row.gapAfterCm)) && Number(row.gapAfterCm) > 0 ? { gapAfterCm: Math.max(0, Math.min(200, Number(row.gapAfterCm))) } : {}),
        ...(typeof row.sectionName === 'string' && row.sectionName.trim() ? { sectionName: row.sectionName.trim().slice(0, 80) } : {}),
        ...(cleanLayoutRole(row.layoutRole) ? { layoutRole: cleanLayoutRole(row.layoutRole) } : {}),
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

function normalizeCustomBrandColorTarget(value: unknown): CustomBrandColorTarget {
  return value === 'rails' ? 'rails' : 'letters'
}

function isExtraLetterPackId(value: unknown): value is ExtraLetterPackId {
  return typeof value === 'string' && value in EXTRA_LETTER_PACKS
}

function toExtraLetterPackColor(color: ProductColor | undefined): ExtraLetterPackSelection['color'] | undefined {
  if (!color?.globalColorId) return undefined
  return {
    globalColorId: color.globalColorId,
    hex: color.hex ?? '#d1d5db',
    name: color.name,
    priceAdd: color.priceAdd,
  }
}

function normalizeExtraLetterPackSelections(value: unknown): ExtraLetterPackSelection[] {
  if (!Array.isArray(value)) return []
  return value
    .map((selection, index) => {
      if (!isObject(selection) || !isExtraLetterPackId(selection.packId)) return null
      const color = normalizeDraftColor(selection.color)
      const packColor = toExtraLetterPackColor(color)
      const quantity = Math.trunc(Number(selection.quantity) || 0)
      if (!packColor || quantity < 1) return null
      return {
        id: String(selection.id ?? `extra-pack-${index}`),
        packId: selection.packId,
        color: packColor,
        quantity,
      }
    })
    .filter((selection): selection is ExtraLetterPackSelection => Boolean(selection))
}

function readInitialDraft(): BuilderDraftActive {
  if (typeof window !== 'undefined') {
    try {
      const activeRaw = window.localStorage.getItem(BUILDER_STORAGE_KEY)
      if (activeRaw) {
        const parsed = JSON.parse(activeRaw) as unknown
        if (isObject(parsed) && parsed.version === 5) {
          const walls = normalizeWalls(parsed.walls)
          const activeWallId = String(parsed.activeWallId ?? walls[0]?.id ?? '')
          if (walls.length && walls.some(wall => wall.id === activeWallId)) {
            return {
              version: 5,
              walls,
              activeWallId,
              fontStyle: parsed.fontStyle === 'modern' ? 'modern' : 'classic',
              railColor: normalizeDraftColor(parsed.railColor),
              baseLetterColor: normalizeDraftColor(parsed.baseLetterColor),
              accentLetterColor: normalizeDraftColor(parsed.accentLetterColor),
              letterCardColor: normalizeDraftColor(parsed.letterCardColor),
              customBrandColor: typeof parsed.customBrandColor === 'string' ? parsed.customBrandColor : undefined,
              customBrandColorTarget: normalizeCustomBrandColorTarget(parsed.customBrandColorTarget),
              extraLetterPackSelections: normalizeExtraLetterPackSelections(parsed.extraLetterPackSelections),
              customerName: String(parsed.customerName ?? ''),
              customerEmail: String(parsed.customerEmail ?? ''),
              customerPhone: String(parsed.customerPhone ?? ''),
              spaceType: String(parsed.spaceType ?? ''),
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
    version: 5,
    walls,
    activeWallId: walls[0]?.id ?? 'main-wall',
    fontStyle: 'classic',
    extraLetterPackSelections: [],
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    spaceType: '',
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
  const inventory = normalizeProductInventoryRecord(product?.inventory)
  const inventoryColors = inventory?.colorInventory ?? []
  const colors = inventoryColors
    .filter(color => color.offered)
    .map((color): ProductColor => {
      const globalColor = activeGlobalColors.find(candidate => {
        if (color.globalColorId && candidate.id === color.globalColorId) return true
        return candidate.name.trim().toLowerCase() === color.colorName.trim().toLowerCase()
      })

      return {
        name: globalColor?.name ?? color.colorName,
        hex: globalColor?.hex ?? color.colorHex,
        globalColorId: globalColor?.id ?? color.globalColorId,
        priceAdd: globalColor?.priceAdd ?? color.priceAdd ?? 0,
        stockQuantity: color.stockQuantity,
        gramsAvailable: color.gramsAvailable,
      }
    })

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

function normalizeHexColor(value: string) {
  const trimmed = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase()
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`
  return ''
}

function resolveColorSlot({
  explicitColor,
  availableColors,
  defaultNames,
  label,
}: {
  explicitColor?: ProductColor
  availableColors: ProductColor[]
  defaultNames: string[]
  label: string
}): ResolvedBuilderColor {
  if (explicitColor) {
    const matchedColor = availableColors.find(color => colorMatches(color, explicitColor))
    if (matchedColor) return { color: matchedColor, source: 'explicit' }
    return {
      source: 'invalid',
      error: `${label}: "${explicitColor.name}" já não está disponível para este produto.`,
    }
  }

  const defaultColor = findColor(availableColors, defaultNames)
  if (defaultColor) return { color: defaultColor, source: 'default' }

  return {
    source: 'missing',
    error: `${label}: não há cores disponíveis no inventário activo.`,
  }
}

function resolveBuilderCheckoutColors({
  railColor,
  baseLetterColor,
  accentLetterColor,
  letterCardColor,
  railColors,
  letterColors,
  customBrandColor,
  customBrandColorTarget,
}: {
  railColor?: ProductColor
  baseLetterColor?: ProductColor
  accentLetterColor?: ProductColor
  letterCardColor?: ProductColor
  railColors: ProductColor[]
  letterColors: ProductColor[]
  customBrandColor: string
  customBrandColorTarget: CustomBrandColorTarget
}) {
  const rail = resolveColorSlot({
    explicitColor: railColor,
    availableColors: railColors,
    defaultNames: ['preto', 'black'],
    label: 'Cor das calhas',
  })
  const baseLetter = resolveColorSlot({
    explicitColor: baseLetterColor,
    availableColors: letterColors,
    defaultNames: ['branco', 'white'],
    label: 'Letras base',
  })
  const accentLetter = resolveColorSlot({
    explicitColor: accentLetterColor,
    availableColors: letterColors,
    defaultNames: ['amarelo', 'dourado', 'gold'],
    label: 'Letras destaque',
  })
  const letterCard = resolveColorSlot({
    explicitColor: letterCardColor,
    availableColors: letterColors,
    defaultNames: ['branco', 'white', 'marfim', 'ivory', 'bege'],
    label: 'Cartões das letras',
  })
  const customHex = normalizeHexColor(customBrandColor)
  const customColor = customHex
    ? {
        hex: customHex,
        target: customBrandColorTarget,
        source: 'custom' as const,
      }
    : undefined
  const customColorError = customBrandColor.trim() && !customHex
    ? 'Cor personalizada: use um HEX válido, por exemplo #d4af37.'
    : undefined
  const errors = [rail.error, baseLetter.error, accentLetter.error, letterCard.error, customColorError].filter((error): error is string => Boolean(error))

  return {
    railColor: rail,
    baseLetterColor: baseLetter,
    accentLetterColor: accentLetter.color ? accentLetter : baseLetter,
    letterCardColor: letterCard,
    customColor,
    errors,
  }
}

function scrollFocusedInputIntoView(event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  const element = event.currentTarget
  const rect = element.getBoundingClientRect()
  const parentRect = element.offsetParent?.getBoundingClientRect()
  const topPadding = 112

  let top = rect.top
  if (parentRect) {
    top = rect.top - parentRect.top
  }

  const neededScroll = top - topPadding

  window.setTimeout(() => {
    element.parentElement?.scrollTo({
      top: neededScroll > 0 ? neededScroll : 0,
      behavior: 'smooth',
    })
  }, 120)
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
  const characters = Array.from(String(text ?? ''))
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
  column,
  metrics,
  railHex,
  baseLetterHex,
  accentLetterHex,
  letterCardHex,
  selected = false,
  onEdit,
}: {
  column: PhysicalColumn
  metrics: PhysicalColumnMetrics
  railHex: string
  baseLetterHex: string
  accentLetterHex: string
  letterCardHex: string
  selected?: boolean
  onEdit?: () => void
}) {
  const hasRightText = Boolean(column.rightText.trim())

  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={!onEdit}
      className={`relative block w-full min-h-[82px] rounded-xl border p-3 pb-6 text-left transition touch-manipulation ${
        metrics.overflow
          ? 'border-red-400 bg-red-950/25 shadow-[0_0_0_2px_rgba(248,113,113,0.22)]'
          : selected
            ? 'border-[#d4af37] bg-black/22 shadow-[0_0_0_2px_rgba(212,175,55,0.28)]'
          : 'border-white/10 bg-black/14'
      } ${onEdit ? 'cursor-pointer hover:border-[#d4af37]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/60' : 'cursor-default'}`}
      aria-label={`${metrics.rowId} ${column.id}`}
      aria-pressed={selected}
    >
      <div className={hasRightText ? 'grid min-h-[42px] grid-cols-[minmax(0,1fr)_minmax(0,0.55fr)] items-end gap-3' : 'min-h-[42px]'}>
        <LetterTiles text={column.leftText || ' '} railModules={column.railModules} colorHex={baseLetterHex} cardHex={letterCardHex} textAlign={column.textAlign} />
        {hasRightText && <LetterTiles text={column.rightText} railModules={column.railModules} colorHex={accentLetterHex} cardHex={letterCardHex} textAlign="right" />}
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
    </button>
  )
}

function PreviewRow({
  wall,
  row,
  maxRowModules,
  metricsByColumn,
  railHex,
  baseLetterHex,
  accentLetterHex,
  letterCardHex,
  selectedColumn,
  onEditColumn,
}: {
  wall: PhysicalWall
  row: PhysicalRow
  maxRowModules: number
  metricsByColumn: Map<string, PhysicalColumnMetrics>
  railHex: string
  baseLetterHex: string
  accentLetterHex: string
  letterCardHex: string
  selectedColumn?: { rowId: string; columnId: string }
  onEditColumn?: (rowId: string, columnId: string) => void
}) {
  const rowModules = row.columns.reduce((sum, column) => sum + clampRailModules(column.railModules), 0)
  const rowWidthPercent = `${Math.min(100, (rowModules / Math.max(1, maxRowModules)) * 100)}%`
  const rowGapAfterPx = Math.min(120, Math.max(0, Number(row.gapAfterCm ?? 0)) * 4)
  const rowStyle = rowGapAfterPx ? { marginBottom: `${rowGapAfterPx}px` } : undefined

  if (row.columns.length === 1) {
    const column = row.columns[0]
    const justify = column.railAlign === 'right' ? 'justify-end' : column.railAlign === 'center' ? 'justify-center' : 'justify-start'
    const metrics = metricsByColumn.get(`${row.id}:${column.id}`) ?? getColumnMetrics(row.id, column, wall)

    return (
      <div className={`flex w-full ${justify}`} style={rowStyle}>
        <div style={{ width: rowWidthPercent, minWidth: 'min(100%, 10rem)' }}>
          <PreviewColumn
            column={column}
            metrics={metrics}
            railHex={railHex}
            baseLetterHex={baseLetterHex}
            accentLetterHex={accentLetterHex}
            letterCardHex={letterCardHex}
            selected={selectedColumn?.rowId === row.id && selectedColumn.columnId === column.id}
            onEdit={onEditColumn ? () => onEditColumn(row.id, column.id) : undefined}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full justify-center" style={rowStyle}>
      <div className="flex min-w-0 gap-3" style={{ width: rowWidthPercent }}>
        {row.columns.map(column => {
          const metrics = metricsByColumn.get(`${row.id}:${column.id}`) ?? getColumnMetrics(row.id, column, wall)
          return (
            <div key={column.id} className="min-w-0" style={{ flex: `${clampRailModules(column.railModules)} 1 0` }}>
              <PreviewColumn
                column={column}
                metrics={metrics}
                railHex={railHex}
                baseLetterHex={baseLetterHex}
                accentLetterHex={accentLetterHex}
                letterCardHex={letterCardHex}
                selected={selectedColumn?.rowId === row.id && selectedColumn.columnId === column.id}
                onEdit={onEditColumn ? () => onEditColumn(row.id, column.id) : undefined}
              />
            </div>
          )
        })}
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
  customBrandColor,
  customBrandColorTarget,
  selectedColumn,
  onEditColumn,
}: {
  wall: PhysicalWall
  metricsByColumn: Map<string, PhysicalColumnMetrics>
  railColor?: ProductColor
  baseLetterColor?: ProductColor
  accentLetterColor?: ProductColor
  letterCardColor?: ProductColor
  customBrandColor?: string
  customBrandColorTarget: CustomBrandColorTarget
  selectedColumn?: { rowId: string; columnId: string }
  onEditColumn?: (rowId: string, columnId: string) => void
}) {
  const customHex = customBrandColor ? normalizeHexColor(customBrandColor) : ''
  const railHex = customHex && customBrandColorTarget === 'rails' ? customHex : railColor?.hex ?? '#111111'
  const baseLetterHex = customHex && customBrandColorTarget === 'letters' ? customHex : baseLetterColor?.hex ?? '#f8f4e9'
  const accentLetterHex = customHex && customBrandColorTarget === 'letters' ? customHex : accentLetterColor?.hex ?? '#d7b06f'
  const letterCardHex = letterCardColor?.hex ?? '#f7f2e8'
  const maxRowModules = Math.max(1, ...wall.rows.map(row => row.columns.reduce((sum, column) => sum + clampRailModules(column.railModules), 0)))
  const logoTint = customHex && customBrandColorTarget === 'letters' ? customHex : baseLetterHex
  const logoPreviewSvg = wall.logoSvgText ? tintSvgForPreview(wall.logoSvgText, logoTint) : ''

  return (
    <div className="relative h-[calc(100dvh-16.5rem)] min-h-[360px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#d8d1c3] p-5 text-stone-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:p-8 lg:h-auto lg:min-h-[640px]">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.78),rgba(255,255,255,0.25)_42%,rgba(70,55,35,0.24)),radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.55),transparent_26%)]" />
      <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(90deg,rgba(90,73,52,.22)_1px,transparent_1px),linear-gradient(rgba(90,73,52,.18)_1px,transparent_1px)] [background-size:38px_38px]" />
      <div className="relative z-10 h-full overflow-y-auto lg:h-auto lg:overflow-visible">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#6a5130]">
          <Sparkles className="size-4" />
          {wall.name} · grelha física
        </p>
        <h1 className="mt-3 max-w-4xl font-serif text-3xl font-bold leading-[0.98] tracking-tight text-stone-950 sm:text-6xl lg:mt-4">
          {wall.type === 'logo' ? 'Identidade em vector.' : 'Calha por calha.'}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700 sm:text-base sm:leading-7 lg:mt-4">
          Esta vista mostra apenas a parede activa. O BOM no rodapé soma todas as paredes do projecto.
        </p>

        <div className="mt-5 space-y-4 lg:mt-8">
          {wall.type === 'logo' ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-stone-950/10 bg-white/55 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
              {logoPreviewSvg ? (
                <div className="flex size-full min-h-[220px] items-center justify-center rounded-xl border border-stone-950/10 bg-white p-8 shadow-sm">
                  <div
                    className="max-h-[210px] w-full max-w-[520px] [&_svg]:mx-auto [&_svg]:h-full [&_svg]:max-h-[210px] [&_svg]:w-full"
                    style={{ color: logoTint }}
                    dangerouslySetInnerHTML={{ __html: logoPreviewSvg }}
                  />
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-black text-stone-800">Logótipo vectorial</p>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">
                    Faça upload do SVG no painel para ver a identidade da marca nesta parede.
                  </p>
                </div>
              )}
            </div>
          ) : (
            wall.rows.map(row => (
              <PreviewRow
                key={row.id}
                wall={wall}
                row={row}
                maxRowModules={maxRowModules}
                metricsByColumn={metricsByColumn}
                railHex={railHex}
                baseLetterHex={baseLetterHex}
                accentLetterHex={accentLetterHex}
                letterCardHex={letterCardHex}
                selectedColumn={selectedColumn}
                onEditColumn={onEditColumn}
              />
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
  onEditWall,
}: {
  walls: PhysicalWall[]
  activeWallId: string
  onSelect: (wallId: string) => void
  onAdd: () => void
  onRemove: (wallId: string) => void
  onEditWall?: (wallId: string) => void
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
      <div className="flex flex-wrap items-center gap-2">
        {walls.map(wall => {
          const active = wall.id === activeWallId
          const wallLabel = wall.name.trim() || 'Parede sem nome'
          return (
            <div key={wall.id} className={`flex items-center gap-1 rounded-full border px-2 py-1 transition ${active ? 'border-[#d4af37]/60 bg-[#d4af37]/18' : 'border-white/10 bg-black/20 hover:border-white/25'}`}>
              <button
                type="button"
                onClick={() => onSelect(wall.id)}
                className={`cursor-pointer rounded-full px-3 py-2 text-sm font-bold ${active ? 'text-white' : 'text-zinc-300'}`}
                aria-current={active ? 'page' : undefined}
                aria-label={active ? `${wallLabel} · Parede activa` : `Abrir ${wallLabel}`}
              >
                {wallLabel}
              </button>
              {active && onEditWall && (
                <button
                  type="button"
                  onClick={() => onEditWall(wall.id)}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-full text-[#d4af37] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/70"
                  aria-label={`Editar parede ${wall.name}`}
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
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

function SegmentedControl<T extends RailAlign | TextAlign>({
  label,
  value,
  onChange,
}: {
  label: string
  value: T
  onChange: (value: T) => void
}) {
  const options: { value: T; label: string }[] = [
    { value: 'left' as T, label: 'Esq' },
    { value: 'center' as T, label: 'Centro' },
    { value: 'right' as T, label: 'Dir' },
  ]

  return (
    <div>
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <div className="mt-2 grid grid-cols-3 rounded-xl border border-stone-200 bg-stone-50 p-1">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-8 cursor-pointer rounded-lg text-xs font-black transition ${
              value === option.value ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-500 hover:bg-white hover:text-stone-950'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ModuleStepper({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  const modules = clampRailModules(value)

  return (
    <div>
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-stone-500">Módulos</p>
      <div className="mt-2 flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-1">
        <button
          type="button"
          onClick={() => onChange(modules - 1)}
          disabled={modules <= 1}
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-stone-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Reduzir módulos"
        >
          <Minus className="size-4" />
        </button>
        <span className="min-w-28 text-center text-sm font-black text-stone-950">
          {modules}x · {(modules * RAIL_LENGTH_MM) / 10}cm
        </span>
        <button
          type="button"
          onClick={() => onChange(modules + 1)}
          disabled={modules >= 12}
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-stone-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Aumentar módulos"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

function StructurePanel({
  walls,
  wall,
  bom,
  metricsByColumn,
  baseLetterColor,
  customBrandColor,
  customBrandColorTarget,
  selectedRowId,
  onSelectWall,
  onAddWall,
  onRemoveWall,
  onRenameWall,
  onUpdateWallMaxWidthCm,
  onSelectRow,
  onAddTitleRow,
  onAddItemRow,
  onDuplicateRow,
  onRemoveRow,
  onAddColumnToRow,
  onRemoveColumn,
  onUpdateRowGapAfterCm,
  onUpdateRowSectionName,
  onEditColumn,
  onUploadLogoSvg,
}: {
  walls: PhysicalWall[]
  wall: PhysicalWall
  bom: PhysicalWallsBom
  metricsByColumn: Map<string, PhysicalColumnMetrics>
  baseLetterColor?: ProductColor
  customBrandColor?: string
  customBrandColorTarget: CustomBrandColorTarget
  selectedRowId?: string
  onSelectWall: (wallId: string) => void
  onAddWall: () => void
  onRemoveWall: (wallId: string) => void
  onRenameWall: (wallId: string, name: string) => void
  onUpdateWallMaxWidthCm: (value: number | undefined) => void
  onSelectRow: (rowId: string) => void
  onAddTitleRow: () => void
  onAddItemRow: () => void
  onDuplicateRow: (rowId: string) => void
  onRemoveRow: (rowId: string) => void
  onAddColumnToRow: (rowId: string) => void
  onRemoveColumn: (rowId: string, columnId: string) => void
  onUpdateRowGapAfterCm: (rowId: string, gapAfterCm: number) => void
  onUpdateRowSectionName: (rowId: string, sectionName: string) => void
  onEditColumn: (rowId: string, columnId: string) => void
  onUploadLogoSvg: (file: File) => void
}) {
  const activeRowId = selectedRowId ?? wall.rows[0]?.id ?? ''
  const wallMetrics = bom.walls.find(metric => metric.wallId === wall.id)
  const customHex = customBrandColor ? normalizeHexColor(customBrandColor) : ''
  const logoTint = customHex && customBrandColorTarget === 'letters' ? customHex : baseLetterColor?.hex || '#111111'
  const logoPreviewSvg = wall.logoSvgText ? tintSvgForPreview(wall.logoSvgText, logoTint) : ''

  if (wall.type === 'logo') {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-5 text-stone-950 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Estrutura</p>
        <input
          value={wall.name}
          onChange={event => onRenameWall(wall.id, event.target.value)}
          onFocus={scrollFocusedInputIntoView}
          className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-lg font-black outline-none transition focus:border-stone-950"
          aria-label="Nome da parede activa"
        />
        <label className="mt-4 grid gap-2">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-stone-500">Largura máxima da parede</span>
          <div className="flex items-center rounded-xl border border-stone-200 bg-white px-3 transition focus-within:border-stone-950">
            <input
              type="number"
              min={25}
              max={600}
              step={5}
              value={wall.maxWidthCm ?? ''}
              onChange={event => onUpdateWallMaxWidthCm(event.target.value === '' ? undefined : Number(event.target.value))}
              onFocus={scrollFocusedInputIntoView}
              className="h-11 min-w-0 flex-1 bg-transparent text-sm font-black outline-none"
              placeholder="Sem limite"
              aria-label="Largura máxima da parede em centímetros"
            />
            <span className="text-xs font-black text-stone-400">cm</span>
          </div>
        </label>
        <div className="mt-4">
          <WallTabs walls={walls} activeWallId={wall.id} onSelect={onSelectWall} onAdd={onAddWall} onRemove={onRemoveWall} />
        </div>
        <label
          className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center transition hover:border-stone-950 hover:bg-white"
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            event.preventDefault()
            const file = event.dataTransfer.files?.[0]
            if (file) onUploadLogoSvg(file)
          }}
        >
          <input
            type="file"
            accept=".svg,image/svg+xml"
            className="sr-only"
            onChange={event => {
              const file = event.target.files?.[0]
              if (file) onUploadLogoSvg(file)
              event.currentTarget.value = ''
            }}
          />
          <span className="flex size-12 items-center justify-center rounded-full bg-stone-950 text-white">
            <Upload className="size-5" />
          </span>
          <span className="mt-4 text-sm font-black">Carregar logótipo SVG</span>
          <span className="mt-2 max-w-xs text-xs leading-5 text-stone-500">
            Use um SVG vectorial optimizado com menos de 150KB. O ficheiro fica sanitizado antes de entrar no pedido.
          </span>
        </label>
        {logoPreviewSvg && (
          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Preview sanitizada</p>
            <div className="mt-3 flex min-h-36 items-center justify-center rounded-xl bg-white p-5">
              <div
                className="max-h-32 w-full max-w-64 [&_svg]:mx-auto [&_svg]:h-full [&_svg]:max-h-32 [&_svg]:w-full"
                style={{ color: logoTint }}
                dangerouslySetInnerHTML={{ __html: logoPreviewSvg }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 text-stone-950 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Estrutura</p>
          <h2 className="mt-2 text-2xl font-black">Layout da parede</h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAddTitleRow}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-stone-200 px-3 text-xs font-black text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
          >
            <Plus className="size-3.5" />
            Título
          </button>
          <button
            type="button"
            onClick={onAddItemRow}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-stone-950 px-3 text-xs font-black text-white transition hover:bg-[#d4af37] hover:text-stone-950"
          >
            <Plus className="size-3.5" />
            Linha
          </button>
        </div>
      </div>
      <label className="mt-5 grid gap-2">
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-stone-500">Nome da parede activa</span>
        <input
          value={wall.name}
          onChange={event => onRenameWall(wall.id, event.target.value)}
          onFocus={scrollFocusedInputIntoView}
          className="h-11 rounded-xl border border-stone-200 px-3 text-sm font-black outline-none transition focus:border-stone-950"
          aria-label="Nome da parede activa"
        />
      </label>
      <label className="mt-4 grid gap-2">
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-stone-500">Largura máxima da parede</span>
        <div className="flex items-center rounded-xl border border-stone-200 bg-white px-3 transition focus-within:border-stone-950">
          <input
            type="number"
            min={25}
            max={600}
            step={5}
            value={wall.maxWidthCm ?? ''}
            onChange={event => onUpdateWallMaxWidthCm(event.target.value === '' ? undefined : Number(event.target.value))}
            onFocus={scrollFocusedInputIntoView}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm font-black outline-none"
            placeholder="Sem limite"
            aria-label="Largura máxima da parede em centímetros"
          />
          <span className="text-xs font-black text-stone-400">cm</span>
        </div>
        <span className="text-xs leading-5 text-stone-500">
          Usada para avisar quando uma linha passa da largura disponível.
        </span>
      </label>
      <div className="mt-4">
        <WallTabs walls={walls} activeWallId={wall.id} onSelect={onSelectWall} onAdd={onAddWall} onRemove={onRemoveWall} />
      </div>
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

      <div className="mt-5 space-y-4">
        {wall.rows.map((row, rowIndex) => {
          const canAddColumn = row.columns.length < MAX_COLUMNS_PER_ROW
          const rowSummary = row.columns
            .map(column => [column.leftText, column.rightText].filter(Boolean).join(' '))
            .filter(Boolean)
            .join(' · ')
          const rowLabel = `Linha ${rowIndex + 1}: ${row.columns.length} coluna${row.columns.length === 1 ? '' : 's'}`
          const isOpen = activeRowId === row.id
          const gapAfterCm = Math.max(0, Math.min(30, Number(row.gapAfterCm ?? 0)))
          return (
            <Collapsible
              key={row.id}
              open={isOpen}
              onOpenChange={open => {
                if (open) onSelectRow(row.id)
              }}
              className="rounded-2xl border border-stone-200 bg-stone-50 p-3 transition hover:border-stone-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="min-w-0 flex-1 cursor-pointer rounded-xl px-1 py-1 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-stone-950/20"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <ChevronDown className={`size-4 shrink-0 text-stone-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      <span className="min-w-0">
                        <span className="block text-xs font-black uppercase tracking-[0.16em] text-stone-500">{rowLabel}</span>
                        <span className="mt-1 block truncate text-xs text-stone-500">{rowSummary || 'Sem texto definido'}</span>
                      </span>
                    </span>
                  </button>
                </CollapsibleTrigger>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectRow(row.id)
                      onAddColumnToRow(row.id)
                    }}
                    disabled={!canAddColumn}
                    className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-stone-200 bg-white px-3 text-xs font-black text-stone-700 transition hover:border-stone-950 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-40"
                    title={canAddColumn ? 'Adicionar coluna' : 'Limite de 4 colunas por linha'}
                  >
                    <Plus className="size-3.5" />
                    Coluna
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectRow(row.id)
                      onDuplicateRow(row.id)
                    }}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition hover:border-stone-950 hover:text-stone-950"
                    aria-label={`Duplicar linha ${rowIndex + 1}`}
                  >
                    <Copy className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveRow(row.id)}
                    disabled={wall.rows.length <= 1}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`Remover linha ${rowIndex + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="mt-3 space-y-4">
                  <div className="rounded-2xl border border-stone-200 bg-white p-3">
                    <label className="grid gap-1.5">
                      <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-stone-500">Nome da secção</span>
                      <input
                        value={row.sectionName ?? ''}
                        onChange={event => onUpdateRowSectionName(row.id, event.target.value)}
                        onFocus={scrollFocusedInputIntoView}
                        className="h-10 rounded-xl border border-stone-200 px-3 text-sm font-semibold outline-none transition focus:border-stone-950"
                        placeholder={row.layoutRole === 'title' ? 'ENTRADAS' : 'Ex: Entradas'}
                      />
                    </label>
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-stone-500">Espaço depois</span>
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-black text-stone-700">{gapAfterCm}cm</span>
                      </div>
                      <Slider
                        className="mt-3"
                        min={0}
                        max={30}
                        step={1}
                        value={[gapAfterCm]}
                        onValueChange={value => onUpdateRowGapAfterCm(row.id, value[0] ?? 0)}
                      />
                    </div>
                  </div>
                {row.columns.map((column, columnIndex) => {
                  const metrics = metricsByColumn.get(`${row.id}:${column.id}`) ?? getColumnMetrics(row.id, column, wall)
                  return (
                    <div key={column.id} className={`rounded-2xl border p-3 ${metrics.overflow ? 'border-red-300 bg-white ring-2 ring-red-100' : columnIndex % 2 === 0 ? 'border-stone-200 bg-white' : 'border-stone-200 bg-stone-100/70'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                            {column.kind === 'title' ? 'Título' : `Coluna ${columnIndex + 1}`}
                          </p>
                          <p className="mt-1 text-xs text-stone-400">{metrics.totalTextWidthMm}mm / {metrics.availableWidthMm}mm</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveColumn(row.id, column.id)}
                          disabled={row.columns.length <= 1}
                          className="flex size-8 cursor-pointer items-center justify-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label={`Remover coluna ${columnIndex + 1}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onEditColumn(row.id, column.id)}
                        className="mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-stone-950 text-xs font-black text-white transition hover:bg-[#d4af37] hover:text-stone-950"
                      >
                        <MousePointer2 className="size-3.5" />
                        Editar texto da calha
                      </button>

                      {metrics.overflow && (
                        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                          Texto excede o tamanho da calha física.
                        </p>
                      )}
                    </div>
                  )
                })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}

function ExtraLettersSection({
  selections,
  colors,
  onAddPack,
  onRemovePack,
  onUpdatePack,
}: {
  selections: ExtraLetterPackSelection[]
  colors: ProductColor[]
  onAddPack: () => void
  onRemovePack: (selectionId: string) => void
  onUpdatePack: (selectionId: string, updater: (selection: ExtraLetterPackSelection) => ExtraLetterPackSelection) => void
}) {
  const availableColors = colors.filter(color => Boolean(color.globalColorId))
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 text-stone-950 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-black">Adicionar Letras/Símbolos Extra</h3>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            Packs anti-desperdício por cor, para stock físico separado por cliente.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddPack}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-stone-950 px-4 text-sm font-black text-white transition hover:bg-[#d4af37] hover:text-stone-950"
        >
          <Plus className="size-4" />
          Adicionar Pack
        </button>
      </div>
      <div className="mt-5 grid gap-4">
        {selections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm leading-6 text-stone-500">
            Sem packs extra. O BOM usa apenas as letras necessárias para o menu actual.
          </div>
        ) : null}
        {selections.map(selection => {
          const pack = EXTRA_LETTER_PACKS[selection.packId]
          const selectedColor = availableColors.find(color => color.globalColorId === selection.color.globalColorId)
          const needsColor = !selectedColor
          return (
            <div key={selection.id} className={`rounded-2xl border p-3 ${needsColor ? 'border-red-300 bg-red-50' : 'border-stone-200 bg-stone-50'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <label className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">Pack</label>
                  <select
                    value={selection.packId}
                    onChange={event => {
                      const nextPackId = event.target.value
                      if (!isExtraLetterPackId(nextPackId)) return
                      onUpdatePack(selection.id, current => ({ ...current, packId: nextPackId }))
                    }}
                    className="mt-1 h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-black outline-none transition focus:border-stone-500"
                  >
                    {EXTRA_PACK_OPTIONS.map(option => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                  <p className="mt-1 max-w-full truncate text-xs text-stone-500">{pack.characters}</p>
                </div>
                <div className="flex items-center rounded-full border border-stone-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => onUpdatePack(selection.id, current => ({ ...current, quantity: Math.max(1, current.quantity - 1) }))}
                    disabled={selection.quantity <= 1}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`Reduzir ${pack.label}`}
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="min-w-8 text-center text-sm font-black">{selection.quantity}x</span>
                  <button
                    type="button"
                    onClick={() => onUpdatePack(selection.id, current => ({ ...current, quantity: current.quantity + 1 }))}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100"
                    aria-label={`Aumentar ${pack.label}`}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onRemovePack(selection.id)}
                  className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  aria-label={`Remover ${pack.label}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-4">
                <SwatchPicker
                  label="Cor deste pack"
                  colors={availableColors}
                  selected={selectedColor ?? selection.color}
                  onSelect={color => {
                    const nextColor = toExtraLetterPackColor(color)
                    if (!nextColor) return
                    onUpdatePack(selection.id, current => ({ ...current, color: nextColor }))
                  }}
                />
                {needsColor && (
                  <p className="mt-2 text-xs font-bold text-red-700">
                    Esta cor já não está disponível para Letras Extra.
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BrandColorSection({
  value,
  target,
  onChange,
  onTargetChange,
}: {
  value: string
  target: CustomBrandColorTarget
  onChange: (value: string) => void
  onTargetChange: (value: CustomBrandColorTarget) => void
}) {
  const normalizedValue = normalizeHexColor(value)
  const pickerValue = normalizedValue || '#d4af37'
  const hasValue = Boolean(value.trim())

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 text-stone-950 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-stone-950 text-white">
          <Palette className="size-4" />
        </span>
        <div>
          <h3 className="text-base font-black">Cor Personalizada</h3>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            Simule uma cor exacta da marca nas calhas ou nas letras. Isto muda o fluxo para orçamento manual.
          </p>
        </div>
      </div>
      {!hasValue ? (
        <button
          type="button"
          onClick={() => onChange('#d4af37')}
          className="mt-4 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-stone-200 px-4 text-sm font-black text-stone-800 transition hover:border-stone-950 hover:bg-stone-50"
        >
          <Palette className="size-4" />
          Activar Cor Personalizada
        </button>
      ) : (
        <div className="mt-4 grid gap-4">
          <div className="grid grid-cols-2 rounded-full border border-stone-200 bg-stone-50 p-1 text-xs font-black">
            {([
              ['rails', 'Calhas'],
              ['letters', 'Letras'],
            ] as const).map(([targetValue, label]) => (
              <button
                key={targetValue}
                type="button"
                onClick={() => onTargetChange(targetValue)}
                className={`h-9 cursor-pointer rounded-full transition ${
                  target === targetValue ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-500 hover:text-stone-950'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={pickerValue}
              onChange={event => onChange(event.target.value)}
              className="h-11 w-14 cursor-pointer rounded-xl border border-stone-200 bg-white p-1"
              aria-label="Escolher cor de marca"
            />
            <input
              value={value}
              onChange={event => onChange(event.target.value)}
              onFocus={scrollFocusedInputIntoView}
              placeholder="#d4af37"
              className={`h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm font-semibold outline-none transition focus:border-stone-500 ${
                value.trim() && !normalizedValue ? 'border-red-300 bg-red-50 text-red-800' : 'border-stone-200'
              }`}
            />
            <button
              type="button"
              onClick={() => onChange('')}
              className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-stone-200 text-stone-500 transition hover:text-stone-950"
              aria-label="Remover cor de marca"
            >
              <X className="size-4" />
            </button>
          </div>
          {value.trim() && !normalizedValue && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              Use um HEX válido, por exemplo #d4af37.
            </p>
          )}
          {normalizedValue && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
              Orçamento manual activo para sourcing de filamento personalizado.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function RailEditor({
  row,
  column,
  metrics,
  onRemoveColumn,
  onUpdateColumnText,
  onUpdateColumnModules,
  onUpdateColumnAlignment,
}: {
  row: PhysicalRow
  column: PhysicalColumn
  metrics: PhysicalColumnMetrics
  onRemoveColumn: (rowId: string, columnId: string) => void
  onUpdateColumnText: (rowId: string, columnId: string, field: 'leftText' | 'rightText', value: string) => void
  onUpdateColumnModules: (rowId: string, columnId: string, value: number) => void
  onUpdateColumnAlignment: (rowId: string, columnId: string, field: 'railAlign' | 'textAlign', value: RailAlign | TextAlign) => void
}) {
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
          {column.kind === 'title' ? 'Título' : 'Item'}
        </p>
        <p className="mt-1 text-xs text-stone-500">{metrics.totalTextWidthMm}mm usados / {metrics.availableWidthMm}mm disponíveis</p>
      </div>

      <label className="grid gap-1.5">
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-stone-500">
          {column.kind === 'title' ? 'Título' : 'Texto esquerdo'}
        </span>
        <input
          value={column.leftText ?? ''}
          onChange={event => onUpdateColumnText(row.id, column.id, 'leftText', event.target.value)}
          onFocus={scrollFocusedInputIntoView}
          className="h-11 rounded-xl border border-stone-200 px-3 text-base font-semibold outline-none transition focus:border-stone-950"
          placeholder={column.kind === 'title' ? 'ENTRADAS' : 'Nome do item'}
        />
      </label>

      {column.kind !== 'title' && (
        <label className="grid gap-1.5">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-stone-500">Texto direito/preço</span>
          <input
            value={column.rightText ?? ''}
            onChange={event => onUpdateColumnText(row.id, column.id, 'rightText', event.target.value)}
            onFocus={scrollFocusedInputIntoView}
            className="h-11 rounded-xl border border-stone-200 px-3 text-base font-semibold outline-none transition focus:border-stone-950"
            placeholder="0,00€"
          />
        </label>
      )}

      <ModuleStepper value={column.railModules} onChange={value => onUpdateColumnModules(row.id, column.id, value)} />
      <SegmentedControl<RailAlign> label="Calha" value={column.railAlign} onChange={value => onUpdateColumnAlignment(row.id, column.id, 'railAlign', value)} />
      <SegmentedControl<TextAlign> label="Texto" value={column.textAlign} onChange={value => onUpdateColumnAlignment(row.id, column.id, 'textAlign', value)} />

      {metrics.overflow && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          Texto excede o tamanho da calha física.
        </p>
      )}

      <button
        type="button"
        onClick={() => onRemoveColumn(row.id, column.id)}
        disabled={row.columns.length <= 1}
        className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-red-200 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Trash2 className="size-4" />
        Remover coluna
      </button>
    </div>
  )
}

function ManualQuoteModal({
  open,
  customerName,
  customerEmail,
  customerPhone,
  spaceType,
  isSubmitting,
  onClose,
  onSubmit,
  onCustomerNameChange,
  onCustomerEmailChange,
  onCustomerPhoneChange,
  onSpaceTypeChange,
}: {
  open: boolean
  customerName: string
  customerEmail: string
  customerPhone: string
  spaceType: string
  isSubmitting: boolean
  onClose: () => void
  onSubmit: () => void
  onCustomerNameChange: (value: string) => void
  onCustomerEmailChange: (value: string) => void
  onCustomerPhoneChange: (value: string) => void
  onSpaceTypeChange: (value: string) => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 py-5 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white p-5 text-stone-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">Orçamento gratuito</p>
            <h2 className="mt-2 text-2xl font-black">Vamos rever o projecto consigo.</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              Para projectos maiores, logótipos ou cores de marca, confirmamos produção e preço final manualmente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-stone-100 text-stone-500 transition hover:text-stone-950"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          <input className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-500" placeholder="Nome" value={customerName} onChange={event => onCustomerNameChange(event.target.value)} onFocus={scrollFocusedInputIntoView} />
          <input className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-500" placeholder="Email" value={customerEmail} onChange={event => onCustomerEmailChange(event.target.value)} onFocus={scrollFocusedInputIntoView} />
          <input className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-500" placeholder="Telemóvel" value={customerPhone} onChange={event => onCustomerPhoneChange(event.target.value)} onFocus={scrollFocusedInputIntoView} />
          <input className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-500" placeholder="Tipo de espaço, ex: café, bar, clínica" value={spaceType} onChange={event => onSpaceTypeChange(event.target.value)} onFocus={scrollFocusedInputIntoView} />
        </div>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="mt-5 h-12 w-full rounded-full bg-stone-950 text-white hover:bg-[#d4af37] hover:text-stone-950"
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Enviar pedido de orçamento
        </Button>
      </div>
    </div>
  )
}

function BomSummary({ bom, shippingCost, extraLetterPackSelections }: { bom: PhysicalWallsBom; shippingCost: number; extraLetterPackSelections: ExtraLetterPackSelection[] }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white/96 p-4 shadow-[0_-18px_42px_rgba(15,23,42,0.12)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">BOM físico · todas as paredes</p>
          <p className="mt-1 text-2xl font-black">{formatMoney(bom.totalAfterDiscount + shippingCost)}</p>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            {bom.wallCount} paredes · {bom.totalRailModules} calhas · {extraLetterPackSelections.length} packs · {bom.avulsoCharacterQuantity} letras avulso
          </p>
        </div>
        <div className={`rounded-full p-2 ${bom.hasOverflow ? 'bg-red-100 text-red-700' : 'bg-[#eef7f0] text-[#1f5138]'}`} title={bom.hasOverflow ? 'Existe texto em overflow' : 'BOM sem overflow'}>
          <Check className="size-4" />
        </div>
      </div>
    </div>
  )
}

export function ModularBuilderClient() {
  const builderState = useModularBuilderState()
  const {
    draftHydrated,
    walls,
    activeWallId,
    setActiveWallId,
    fontStyle,
    extraLetterPackSelections,
    railColor,
    setRailColor,
    baseLetterColor,
    setBaseLetterColor,
    accentLetterColor,
    setAccentLetterColor,
    letterCardColor,
    setLetterCardColor,
    customBrandColor,
    setCustomBrandColor,
    customBrandColorTarget,
    setCustomBrandColorTarget,
    customerName,
    setCustomerName,
    customerEmail,
    setCustomerEmail,
    customerPhone,
    setCustomerPhone,
    spaceType,
    setSpaceType,
    shippingMethod,
    shippingAddress,
    notes,
    setNotes,
    addWall,
    removeWall,
    renameWall,
    updateActiveWall,
    addTitleRow,
    addItemRow,
    removeRow,
    duplicateRow,
    updateRowGapAfterCm,
    updateRowSectionName,
    addColumnToRow,
    removeColumn,
    updateColumnText,
    updateColumnModules,
    updateColumnAlignment,
    addExtraLetterPack: addExtraLetterPackSelection,
    removeExtraLetterPack,
    updateExtraLetterPack,
  } = builderState
  const [manualQuoteModalOpen, setManualQuoteModalOpen] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>({ type: 'closed' })
  const [desktopEditorTab, setDesktopEditorTab] = useState<DesktopEditorTab>('structure')
  const [selectedColumn, setSelectedColumn] = useState<SelectedColumnRef | null>(null)
  const [selectedRowId, setSelectedRowId] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const query = db.useQuery({
    catalogProducts: {
      $: {
        where: {
          slug: { $in: MENU_PRODUCT_SLUGS },
        },
      },
      inventory: {},
    },
    productInventory: {
      $: {
        where: {
          productSlug: { $in: MENU_PRODUCT_SLUGS },
        },
      },
    },
    globalColors: {
      $: {
        where: {
          isActive: true,
        },
      },
    },
  })

  const products = useMemo(() => {
    const inventoryBySlug = new Map((query.data?.productInventory ?? []).map(inventory => [inventory.productSlug, inventory]))
    return (query.data?.catalogProducts ?? []).map(product => ({
      ...product,
      inventory: normalizeProductInventoryRecord(product.inventory) ?? inventoryBySlug.get(product.slug),
    }))
  }, [query.data?.catalogProducts, query.data?.productInventory])
  const catalogLoading = query.isLoading
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

  const colorResolution = useMemo(
    () => resolveBuilderCheckoutColors({
      railColor,
      baseLetterColor,
      accentLetterColor,
      letterCardColor,
      railColors,
      letterColors,
      customBrandColor,
      customBrandColorTarget,
    }),
    [accentLetterColor, baseLetterColor, customBrandColor, customBrandColorTarget, letterCardColor, letterColors, railColor, railColors],
  )
  const selectedRailColor = colorResolution.railColor.color
  const selectedBaseLetterColor = colorResolution.baseLetterColor.color
  const selectedAccentLetterColor = colorResolution.accentLetterColor.color
  const selectedLetterCardColor = colorResolution.letterCardColor.color
  const activeCustomBrandColor = colorResolution.customColor?.hex ?? ''

  const activeWall = useMemo(() => walls.find(wall => wall.id === activeWallId) ?? walls[0] ?? createDefaultWalls()[0], [activeWallId, walls])
  const activeRowId = selectedRowId && activeWall.rows.some(row => row.id === selectedRowId)
    ? selectedRowId
    : activeWall.rows[0]?.id ?? ''
  const selectedRail = selectedColumn && activeWall.rows.some(row => row.id === selectedColumn.rowId && row.columns.some(column => column.id === selectedColumn.columnId))
    ? selectedColumn
    : null
  const selectedRailRow = selectedRail
    ? activeWall.rows.find(row => row.id === selectedRail.rowId)
    : undefined
  const selectedRailColumn = selectedRailRow
    ? selectedRailRow.columns.find(column => column.id === selectedRail?.columnId)
    : undefined
  const metricsByColumn = useMemo(() => {
    const map = new Map<string, PhysicalColumnMetrics>()
    for (const row of activeWall.rows) {
      for (const column of row.columns) {
        map.set(`${row.id}:${column.id}`, getColumnMetrics(row.id, column, activeWall))
      }
    }
    return map
  }, [activeWall])

  useEffect(() => {
    if (!activeWall.rows.length) return
    if (!activeWall.rows.some(row => row.id === selectedRowId)) {
      setSelectedRowId(activeWall.rows[0]?.id ?? '')
    }
  }, [activeWall, selectedRowId])

  useEffect(() => {
    if (!selectedColumn) return
    const stillExists = activeWall.rows.some(row => (
      row.id === selectedColumn.rowId && row.columns.some(column => column.id === selectedColumn.columnId)
    ))
    if (!stillExists) {
      setSelectedColumn(null)
      if (mobilePanel.type === 'column') setMobilePanel({ type: 'closed' })
      setDesktopEditorTab('structure')
    }
  }, [activeWall, mobilePanel.type, selectedColumn])

  const railModuleUnitPrice = getProductPrice(railProduct) + (selectedRailColor?.priceAdd ?? 0)
  const extraPackColorPriceAdd = Math.max(
    0,
    ...extraLetterPackSelections.map(selection => (
      letterColors.find(color => color.globalColorId === selection.color.globalColorId)?.priceAdd ??
      selection.color.priceAdd ??
      0
    )),
  )
  const letterColorPriceAdd = Math.max(
    selectedBaseLetterColor?.priceAdd ?? 0,
    selectedAccentLetterColor?.priceAdd ?? 0,
    selectedLetterCardColor?.priceAdd ?? 0,
    extraPackColorPriceAdd,
  )
  const standardPackUnitPrice = getProductPrice(packProduct) + letterColorPriceAdd
  const avulsoUnitPrice = getProductPrice(avulsoProduct) + letterColorPriceAdd
  const bom = useMemo(
    () => getWallsBom({
      walls,
      extraLetterPackSelections,
      baseLetterColor: selectedBaseLetterColor ? stripMenuColor(selectedBaseLetterColor) : undefined,
      accentLetterColor: selectedAccentLetterColor ? stripMenuColor(selectedAccentLetterColor) : undefined,
      hasCustomBrandColor: Boolean(activeCustomBrandColor),
      railModuleUnitPrice,
      standardPackUnitPrice,
      avulsoUnitPrice,
    }),
    [activeCustomBrandColor, avulsoUnitPrice, extraLetterPackSelections, railModuleUnitPrice, selectedAccentLetterColor, selectedBaseLetterColor, standardPackUnitPrice, walls],
  )
  const shippingCost = shippingMethod === 'mainland_portugal' ? SHIPPING_COST : 0
  const extraLetterColorErrors = extraLetterPackSelections.flatMap(selection => {
    const pack = EXTRA_LETTER_PACKS[selection.packId]
    if (!pack) return ['Pack extra inválido.']
    if (!Number.isInteger(selection.quantity) || selection.quantity < 1) return [`${pack.label}: quantidade inválida.`]
    if (!selection.color?.globalColorId) return [`${pack.label}: escolha uma cor para adicionar este extra.`]
    if (!letterColors.some(color => colorMatches(color, selection.color))) {
      return [`${pack.label}: "${selection.color.name}" já não está disponível para letras extra.`]
    }
    return []
  })
  const hasExtraLetterColorMissing = extraLetterColorErrors.length > 0
  const hasUploadedLogo = walls.some(wall => wall.type === 'logo' && Boolean(wall.logoSvgText || wall.logoSvgUrl))
  const checkoutLane: CheckoutLane = bom.totalRailModules > 30 || Boolean(activeCustomBrandColor) || hasUploadedLogo ? 'manual_quote' : 'stripe_auto_pay'
  const checkoutDisabled = catalogLoading || isSubmitting || bom.hasOverflow || hasExtraLetterColorMissing || (!bom.totalRailModules && !hasUploadedLogo)

  useEffect(() => {
    const fallbackMessage = window.localStorage.getItem(BUILDER_TOAST_STORAGE_KEY)
    if (fallbackMessage) {
      toast.info('Plano automático indisponível', { description: fallbackMessage, duration: 9000 })
      window.localStorage.removeItem(BUILDER_TOAST_STORAGE_KEY)
    }
  }, [])

  usePersistModularBuilderDraft({
    draftHydrated,
    walls,
    activeWallId,
    fontStyle,
    railColor: selectedRailColor,
    baseLetterColor: selectedBaseLetterColor,
    accentLetterColor: selectedAccentLetterColor,
    letterCardColor: selectedLetterCardColor,
    customBrandColor: activeCustomBrandColor || undefined,
    customBrandColorTarget,
    extraLetterPackSelections,
    customerName,
    customerEmail,
    customerPhone,
    spaceType,
    shippingMethod,
    shippingAddress,
    notes,
  })

  const addExtraLetterPack = useCallback(() => {
    const defaultColor = selectedBaseLetterColor?.globalColorId
      ? selectedBaseLetterColor
      : letterColors.find(color => Boolean(color.globalColorId))
    const packColor = toExtraLetterPackColor(defaultColor)
    if (!packColor) {
      toast.error('Não há cores disponíveis para Letras Extra no inventário activo.')
      return
    }
    addExtraLetterPackSelection(packColor)
  }, [addExtraLetterPackSelection, letterColors, selectedBaseLetterColor])

  const openStructurePanel = useCallback((wallId?: string) => {
    if (wallId) setActiveWallId(wallId)
    setDesktopEditorTab('structure')
    setMobilePanel({ type: 'structure' })
  }, [setActiveWallId])

  const closeMobilePanel = useCallback(() => {
    setMobilePanel({ type: 'closed' })
  }, [])

  const updateActiveWallMaxWidthCm = useCallback((value: number | undefined) => {
    updateActiveWall(wall => {
      if (value === undefined) return { ...wall, maxWidthCm: undefined }
      if (!Number.isFinite(value)) return wall
      const nextWidth = Math.max(25, Math.min(600, Math.round(Number(value))))
      return { ...wall, maxWidthCm: nextWidth }
    })
  }, [updateActiveWall])

  const editColumn = useCallback((rowId: string, columnId: string) => {
    setSelectedRowId(rowId)
    setSelectedColumn({ rowId, columnId })
    setDesktopEditorTab('edit')
    setMobilePanel({ type: 'column', rowId, columnId })
  }, [])

  const uploadLogoSvg = useCallback((file: File) => {
    if (file.size > MAX_LOGO_SVG_BYTES) {
      toast.error('O ficheiro do logótipo é demasiado grande. Por favor, use um SVG otimizado com menos de 150KB.')
      return
    }
    if (file.type && file.type !== 'image/svg+xml' && !file.name.toLowerCase().endsWith('.svg')) {
      toast.error('Carregue um ficheiro SVG válido.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const rawSvg = String(reader.result ?? '')
      const analysis = sanitizeSvg(rawSvg)
      if (!analysis.ok) {
        toast.error(analysis.errors[0] || 'O SVG não é válido para produção.')
        return
      }
      if (getByteSize(analysis.sanitizedSvg) > MAX_LOGO_SVG_BYTES) {
        toast.error('O ficheiro do logótipo é demasiado grande. Por favor, use um SVG otimizado com menos de 150KB.')
        return
      }

      updateActiveWall(wall => {
        if (wall.type !== 'logo') return wall
        return {
          ...wall,
          logoSvgText: analysis.sanitizedSvg,
          logoSvgUrl: svgToDataUrl(analysis.sanitizedSvg),
        }
      })
      toast.success('Logótipo SVG sanitizado e aplicado.')
    }
    reader.onerror = () => toast.error('Não foi possível ler o ficheiro SVG.')
    reader.readAsText(file)
  }, [updateActiveWall])

  async function submitCheckout(forceManualSubmit = false) {
    if (catalogLoading) {
      toast.info('A carregar cores e preços do inventário.')
      return
    }
    if (colorResolution.errors.length || !selectedRailColor || !selectedBaseLetterColor || !selectedAccentLetterColor || !selectedLetterCardColor) {
      toast.error('Corrija as cores antes de finalizar.', {
        description: colorResolution.errors[0] ?? 'Escolha cores disponíveis no inventário activo.',
      })
      return
    }
    if (bom.hasOverflow) {
      toast.error('Existe texto maior do que a calha física.')
      return
    }
    if (hasExtraLetterColorMissing) {
      toast.error('Escolha a cor das Letras Extra antes de finalizar.', {
        description: extraLetterColorErrors[0],
      })
      return
    }
    if (checkoutLane === 'manual_quote' && !forceManualSubmit) {
      setManualQuoteModalOpen(true)
      return
    }
    if (checkoutLane === 'manual_quote') {
      if (customerName.trim().length < 2) {
        toast.error('Indique o seu nome.')
        return
      }
      if (!customerEmail.includes('@')) {
        toast.error('Indique um email válido.')
        return
      }
      if (customerPhone.trim().length < 6) {
        toast.error('Indique o seu telemóvel.')
        return
      }
      if (spaceType.trim().length < 2) {
        toast.error('Indique o tipo de espaço.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      const railColorPayload = stripMenuColor(selectedRailColor)
      const baseLetterColorPayload = stripMenuColor(selectedBaseLetterColor)
      const accentLetterColorPayload = stripMenuColor(selectedAccentLetterColor)
      const letterCardColorPayload = stripMenuColor(selectedLetterCardColor)

      const response = await fetch('/api/checkout/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: customerName, email: customerEmail, phone: customerPhone },
          shipping: { method: shippingMethod, address: shippingAddress },
          notes,
          manualQuote: {
            requested: checkoutLane === 'manual_quote',
            spaceType: spaceType.trim() || undefined,
          },
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
            extraLetterPackSelections,
            totalRailModules: bom.totalRailModules,
            standardPackQuantity: bom.standardPackQuantity,
            avulsoCharacterQuantity: bom.avulsoCharacterQuantity,
            characterFrequencyMap: bom.characterFrequencyMap,
            characterFrequencyByColor: bom.characterFrequencyByColor,
            checkoutLane,
            customBrandColor: activeCustomBrandColor || undefined,
            customBrandColorTarget: activeCustomBrandColor ? customBrandColorTarget : undefined,
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
      if (payload?.checkoutUrl || payload?.url) window.location.href = payload.checkoutUrl ?? payload.url
      if (payload?.redirectTo) {
        window.localStorage.removeItem(BUILDER_STORAGE_KEY)
        window.location.href = payload.redirectTo
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível iniciar o checkout.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedRailMetrics = selectedRailRow && selectedRailColumn
    ? metricsByColumn.get(`${selectedRailRow.id}:${selectedRailColumn.id}`) ?? getColumnMetrics(selectedRailRow.id, selectedRailColumn, activeWall)
    : undefined

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <Header />
      <section className="relative overflow-hidden px-4 pb-32 pt-5 sm:px-8 lg:px-10 lg:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(212,175,55,0.14),transparent_34%),radial-gradient(circle_at_76%_4%,rgba(56,189,248,0.10),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-[1600px] gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
          <div className="sticky top-0 z-20 space-y-3 overflow-hidden pb-2 lg:static lg:space-y-5 lg:overflow-visible lg:pb-0">
            <WallTabs
              walls={walls}
              activeWallId={activeWall.id}
              onSelect={setActiveWallId}
              onAdd={addWall}
              onRemove={removeWall}
              onEditWall={openStructurePanel}
            />
            <PhysicalGridPreview
              wall={activeWall}
              metricsByColumn={metricsByColumn}
              railColor={selectedRailColor}
              baseLetterColor={selectedBaseLetterColor}
              accentLetterColor={selectedAccentLetterColor}
              letterCardColor={selectedLetterCardColor}
              customBrandColor={activeCustomBrandColor || undefined}
              customBrandColorTarget={customBrandColorTarget}
              selectedColumn={selectedRail ?? undefined}
              onEditColumn={editColumn}
            />
          </div>

          <aside className="hidden max-h-[calc(100svh-7rem)] min-h-0 flex-col overflow-hidden bg-transparent p-0 pr-1 xl:flex">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <Tabs value={desktopEditorTab} onValueChange={value => setDesktopEditorTab(value as DesktopEditorTab)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-1">
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-2xl bg-black/24 p-1 text-zinc-300">
                <TabsTrigger value="structure" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-stone-950">Estrutura</TabsTrigger>
                <TabsTrigger value="edit" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-stone-950">Edição</TabsTrigger>
              </TabsList>
              <TabsContent value="structure" className="mt-3">
                <StructurePanel
                  walls={walls}
                  wall={activeWall}
                  bom={bom}
                  metricsByColumn={metricsByColumn}
                  baseLetterColor={selectedBaseLetterColor}
                  customBrandColor={activeCustomBrandColor || undefined}
                  customBrandColorTarget={customBrandColorTarget}
                  selectedRowId={activeRowId}
                  onSelectWall={setActiveWallId}
                  onAddWall={addWall}
                  onRemoveWall={removeWall}
                  onRenameWall={renameWall}
                  onUpdateWallMaxWidthCm={updateActiveWallMaxWidthCm}
                  onSelectRow={setSelectedRowId}
                  onAddTitleRow={addTitleRow}
                  onAddItemRow={addItemRow}
                  onDuplicateRow={duplicateRow}
                  onRemoveRow={removeRow}
                  onAddColumnToRow={addColumnToRow}
                  onRemoveColumn={removeColumn}
                  onUpdateRowGapAfterCm={updateRowGapAfterCm}
                  onUpdateRowSectionName={updateRowSectionName}
                  onEditColumn={editColumn}
                  onUploadLogoSvg={uploadLogoSvg}
                />
              </TabsContent>
              <TabsContent value="edit" className="mt-3">
                {selectedRailRow && selectedRailColumn && selectedRailMetrics ? (
                  <div className="rounded-2xl border border-stone-200 bg-white p-5 text-stone-950 shadow-sm">
                    <RailEditor
                      row={selectedRailRow}
                      column={selectedRailColumn}
                      metrics={selectedRailMetrics}
                      onRemoveColumn={removeColumn}
                      onUpdateColumnText={updateColumnText}
                      onUpdateColumnModules={updateColumnModules}
                      onUpdateColumnAlignment={updateColumnAlignment}
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-stone-200 bg-white p-5 text-stone-950 shadow-sm">
                    <span className="flex size-11 items-center justify-center rounded-full bg-stone-950 text-white">
                      <MousePointer2 className="size-4" />
                    </span>
                    <h3 className="mt-4 text-lg font-black">Toque numa calha na preview.</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-500">
                      A edição fica focada apenas no texto, alinhamento e módulos dessa calha.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
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
            <BrandColorSection
              value={customBrandColor}
              target={customBrandColorTarget}
              onChange={setCustomBrandColor}
              onTargetChange={setCustomBrandColorTarget}
            />
            <ExtraLettersSection
              selections={extraLetterPackSelections}
              colors={letterColors}
              onAddPack={addExtraLetterPack}
              onRemovePack={removeExtraLetterPack}
              onUpdatePack={updateExtraLetterPack}
            />
            <div className="rounded-2xl border border-stone-200 bg-white p-5 text-stone-950 shadow-sm">
              <h3 className="text-base font-black">Checkout</h3>
              <div className="mt-4 grid gap-3">
                <input id="nome" className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-500" placeholder="Nome" value={customerName} onChange={event => setCustomerName(event.target.value)} onFocus={scrollFocusedInputIntoView} />
                <input id="email" className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-500" placeholder="Email" value={customerEmail} onChange={event => setCustomerEmail(event.target.value)} onFocus={scrollFocusedInputIntoView} />
                <input id="telefone" className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-500" placeholder="Telefone" value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} onFocus={scrollFocusedInputIntoView} />
                <textarea id="notas" className="min-h-20 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-500" placeholder="Notas" value={notes} onChange={event => setNotes(event.target.value)} onFocus={scrollFocusedInputIntoView} />
              </div>
            </div>
            </div>
          </aside>
        </div>
      </section>

      <MobileToolDock onOpenPanel={setMobilePanel} />

      <BottomInspector
        open={mobilePanel.type === 'structure'}
        title="Estrutura"
        subtitle="Organize paredes, linhas, colunas e espaçamentos."
        onClose={closeMobilePanel}
      >
        <StructurePanel
          walls={walls}
          wall={activeWall}
          bom={bom}
          metricsByColumn={metricsByColumn}
          baseLetterColor={selectedBaseLetterColor}
          customBrandColor={activeCustomBrandColor || undefined}
          customBrandColorTarget={customBrandColorTarget}
          selectedRowId={activeRowId}
          onSelectWall={setActiveWallId}
          onAddWall={addWall}
          onRemoveWall={removeWall}
          onRenameWall={renameWall}
          onUpdateWallMaxWidthCm={updateActiveWallMaxWidthCm}
          onSelectRow={setSelectedRowId}
          onAddTitleRow={addTitleRow}
          onAddItemRow={addItemRow}
          onDuplicateRow={duplicateRow}
          onRemoveRow={removeRow}
          onAddColumnToRow={addColumnToRow}
          onRemoveColumn={removeColumn}
          onUpdateRowGapAfterCm={updateRowGapAfterCm}
          onUpdateRowSectionName={updateRowSectionName}
          onEditColumn={editColumn}
          onUploadLogoSvg={uploadLogoSvg}
        />
      </BottomInspector>

      <BottomInspector
        open={mobilePanel.type === 'column' && Boolean(selectedRailRow && selectedRailColumn && selectedRailMetrics)}
        title={selectedRailColumn?.kind === 'title' ? 'Editar título' : 'Editar item'}
        subtitle="A preview actualiza ao vivo enquanto escreve."
        onClose={closeMobilePanel}
      >
        {selectedRailRow && selectedRailColumn && selectedRailMetrics && (
          <RailEditor
            row={selectedRailRow}
            column={selectedRailColumn}
            metrics={selectedRailMetrics}
            onRemoveColumn={removeColumn}
            onUpdateColumnText={updateColumnText}
            onUpdateColumnModules={updateColumnModules}
            onUpdateColumnAlignment={updateColumnAlignment}
          />
        )}
      </BottomInspector>

      <BottomInspector
        open={mobilePanel.type === 'colors'}
        title="Cores globais"
        subtitle="Aplicadas a todas as paredes deste projecto."
        onClose={closeMobilePanel}
      >
        <div className="grid gap-5">
          <SwatchPicker label="Cor das calhas" colors={railColors} selected={selectedRailColor} onSelect={setRailColor} />
          <SwatchPicker label="Letras base" colors={letterColors} selected={selectedBaseLetterColor} onSelect={setBaseLetterColor} />
          <SwatchPicker label="Letras destaque" colors={letterColors} selected={selectedAccentLetterColor} onSelect={setAccentLetterColor} />
          <SwatchPicker label="Cartões das letras" colors={letterColors} selected={selectedLetterCardColor} onSelect={setLetterCardColor} />
          <BrandColorSection
            value={customBrandColor}
            target={customBrandColorTarget}
            onChange={setCustomBrandColor}
            onTargetChange={setCustomBrandColorTarget}
          />
        </div>
      </BottomInspector>

      <BottomInspector
        open={mobilePanel.type === 'extras'}
        title="Packs extra"
        subtitle="Adicione letras/símbolos por cor para stock físico."
        onClose={closeMobilePanel}
      >
        <ExtraLettersSection
          selections={extraLetterPackSelections}
          colors={letterColors}
          onAddPack={addExtraLetterPack}
          onRemovePack={removeExtraLetterPack}
          onUpdatePack={updateExtraLetterPack}
        />
      </BottomInspector>

      <BottomInspector
        open={mobilePanel.type === 'walls'}
        title="Paredes"
        subtitle="Troque ou adicione paredes sem sair da preview."
        onClose={closeMobilePanel}
      >
        <WallTabs walls={walls} activeWallId={activeWall.id} onSelect={setActiveWallId} onAdd={addWall} onRemove={removeWall} onEditWall={openStructurePanel} />
      </BottomInspector>

      <BottomInspector
        open={mobilePanel.type === 'checkout'}
        title="Dados do pedido"
        subtitle="Usados para pagamento, entrega ou orçamento manual."
        onClose={closeMobilePanel}
      >
        <div className="grid gap-3">
          <input id="mobile-nome" className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-500" placeholder="Nome" value={customerName} onChange={event => setCustomerName(event.target.value)} onFocus={scrollFocusedInputIntoView} />
          <input id="mobile-email" className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-500" placeholder="Email" value={customerEmail} onChange={event => setCustomerEmail(event.target.value)} onFocus={scrollFocusedInputIntoView} />
          <input id="mobile-telefone" className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-500" placeholder="Telefone" value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} onFocus={scrollFocusedInputIntoView} />
          <textarea id="mobile-notas" className="min-h-20 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-500" placeholder="Notas" value={notes} onChange={event => setNotes(event.target.value)} onFocus={scrollFocusedInputIntoView} />
        </div>
      </BottomInspector>

      <div className="sticky bottom-0 z-30 border-t border-stone-200 bg-white/90 px-4 py-3 text-stone-950 backdrop-blur-xl sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1600px] gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="hidden md:block">
            <BomSummary bom={bom} shippingCost={shippingCost} extraLetterPackSelections={extraLetterPackSelections} />
          </div>
          <div className="md:hidden">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">{checkoutLane === 'manual_quote' ? 'Orçamento manual' : 'Total estimado'}</p>
            <p className="text-xl font-black">{formatMoney(bom.totalAfterDiscount + shippingCost)}</p>
            <p className="text-xs text-stone-500">{bom.wallCount} paredes · {bom.totalRailModules} calhas · {extraLetterPackSelections.length} extras</p>
          </div>
          <Button
            type="button"
            onClick={() => setReviewOpen(true)}
            disabled={catalogLoading}
            className="h-14 rounded-full bg-[#09090b] px-7 text-white hover:bg-[#26262c]"
          >
            {catalogLoading ? 'A carregar inventário...' : 'Rever e finalizar'}
          </Button>
        </div>
      </div>
      <ReviewSheet
        open={reviewOpen}
        bom={bom}
        shippingCost={shippingCost}
        checkoutLane={checkoutLane}
        extraLetterPackSelections={extraLetterPackSelections}
        isSubmitting={isSubmitting}
        catalogLoading={catalogLoading}
        disabled={checkoutDisabled}
        onClose={() => setReviewOpen(false)}
        onSubmit={() => submitCheckout()}
      />
      <ManualQuoteModal
        open={manualQuoteModalOpen}
        customerName={customerName}
        customerEmail={customerEmail}
        customerPhone={customerPhone}
        spaceType={spaceType}
        isSubmitting={isSubmitting}
        onClose={() => setManualQuoteModalOpen(false)}
        onSubmit={() => submitCheckout(true)}
        onCustomerNameChange={setCustomerName}
        onCustomerEmailChange={setCustomerEmail}
        onCustomerPhoneChange={setCustomerPhone}
        onSpaceTypeChange={setSpaceType}
      />
    </main>
  )
}
