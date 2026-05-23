'use client'

import { FormEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { InstaQLEntity } from '@instantdb/react'
import { toast } from 'sonner'
import {
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Sparkles,
} from 'lucide-react'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { db } from '@/lib/db'
import type { AppSchema } from '@/instant.schema'
import {
  CHARS_PER_MODULE_ESTIMATE,
  MAX_GLOBAL_MODULES,
  MIN_GLOBAL_MODULES,
  MODULE_LENGTH_CM,
  RAIL_LENGTH_MM,
  sanitizeMenuText,
} from '@/lib/menu-calculator'
import {
  PHYSICAL_GRID_DIMENSION_SET,
  clampRailModules,
  getCharacterWidthMm,
  getColumnMetrics,
  getGridBom,
  measureColumnTextMm,
  measureTextMm,
  type ExtraLetterGroup,
  type FontStyle,
  type PhysicalCategory,
  type PhysicalColumn,
  type PhysicalColumnMetrics,
  type PhysicalGridBom,
  type PhysicalRow,
  type PhysicalWall,
} from '@/lib/modular-physical-grid'
import type { ProductColor } from '@/lib/products'

const MENU_RAIL_SLUG = 'menu-rail-25cm'
const MENU_PACK_SLUG = 'menu-letter-pack-standard'
const MENU_AVULSO_SLUG = 'menu-letter-custom'
const SHIPPING_COST = 4.99
const BUILDER_STORAGE_KEY = 'em3d-modular-builder-v3'
const GENERATED_WALLS_STORAGE_KEY = 'em3d-modular-planner-walls-v1'
const LEGACY_BUILDER_STORAGE_KEY = 'em3d-modular-builder-v1'
const BUILDER_TOAST_STORAGE_KEY = 'em3d-modular-builder-toast'

type CatalogProductBase = InstaQLEntity<AppSchema, 'catalogProducts'>
type ProductInventoryRecord = InstaQLEntity<AppSchema, 'productInventory'>
type GlobalColorBase = InstaQLEntity<AppSchema, 'globalColors'>
type CatalogProduct = Omit<CatalogProductBase, 'updatedAt'> & {
  updatedAt: CatalogProductBase['updatedAt'] | Date
  inventory?: (Omit<ProductInventoryRecord, 'updatedAt'> & { updatedAt: ProductInventoryRecord['updatedAt'] | Date })
}
type GlobalColorRecord = Omit<GlobalColorBase, 'updatedAt'> & { updatedAt: GlobalColorBase['updatedAt'] | Date }

type MenuColorPayload = {
  name: string
  hex?: string
  globalColorId?: string
  priceAdd?: number
}

type BuilderDraftV3 = {
  version: 3
  currentStep: string
  selectedIntentId: string
  categories: PhysicalCategory[]
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

type EditingColumnState = {
  rowId: string
  columnId: string
  leftText: string
  rightText: string
} | null

type MenuTemplate = {
  id: string
  name: string
  description: string
  categories: PhysicalCategory[]
}

const fontStyles: { value: FontStyle; label: string; description: string }[] = [
  { value: 'classic', label: 'Classic', description: 'Letra editorial, legível e intemporal.' },
  { value: 'modern', label: 'Modern', description: 'Letra mais limpa para espaços contemporâneos.' },
]

const defaultExtraLetterGroups: ExtraLetterGroup[] = [
  { id: 'numbers', label: 'Números', charactersPerUnit: '0123456789', quantity: 0 },
  { id: 'vowels', label: 'Vogais', charactersPerUnit: 'aeiouAEIOUáàãéêíóõú', quantity: 0 },
  { id: 'symbols', label: 'Símbolos', charactersPerUnit: '€.,:-+/%&?!', quantity: 0 },
]

let idCounter = 0

function makeId(prefix: string) {
  idCounter += 1
  return `${prefix}-${idCounter}`
}

function inferRailModules(leftText: string, rightText = '') {
  return clampRailModules(Math.ceil(measureTextMm(`${leftText}${rightText}`) / RAIL_LENGTH_MM) || 1)
}

function createColumn(leftText: string, rightText = '', railModules?: number): PhysicalColumn {
  return {
    id: makeId('col'),
    railModules: railModules ?? inferRailModules(leftText, rightText),
    leftText,
    rightText,
  }
}

function createTitleRow(title: string): PhysicalRow {
  const text = sanitizeMenuText(title).replace(/\s+/g, ' ').trim().toUpperCase()
  return createRow({
    ...createColumn(text, '', Math.max(1, inferRailModules(text))),
    align: 'center',
  })
}

function createRow(...columns: PhysicalColumn[]): PhysicalRow {
  return {
    id: makeId('row'),
    columns,
  }
}

function createCategory(title: string, rows: PhysicalRow[], collapsed = false, includePhysicalTitle = true): PhysicalCategory {
  const normalizedTitle = sanitizeMenuText(title).replace(/\s+/g, ' ').trim().toUpperCase()
  const firstColumn = rows[0]?.columns[0]
  const alreadyStartsWithTitle = Boolean(firstColumn && firstColumn.leftText.toUpperCase() === normalizedTitle && !firstColumn.rightText)

  return {
    id: makeId('cat'),
    title,
    collapsed,
    rows: includePhysicalTitle && normalizedTitle && !alreadyStartsWithTitle
      ? [createTitleRow(title), ...rows]
      : rows,
  }
}

const menuTemplates: MenuTemplate[] = [
  {
    id: 'cafe-classico',
    name: 'Café clássico',
    description: 'Bebidas principais com categorias compactas e preços à direita.',
    categories: [
      createCategory('Cafés', [
        createRow(createColumn('ESPRESSO', '1,20€')),
        createRow(createColumn('AMERICANO', '1,80€')),
        createRow(createColumn('FLAT WHITE', '3,00€')),
      ]),
      createCategory('Especiais', [
        createRow(createColumn('CAPPUCCINO', '2,80€')),
        createRow(createColumn('CHAI LATTE', '3,50€')),
      ]),
    ],
  },
  {
    id: 'pastelaria',
    name: 'Pastelaria',
    description: 'Vitrine, pequeno-almoço e combos com mais largura por linha.',
    categories: [
      createCategory('Pastelaria', [
        createRow(createColumn('PASTEL DE NATA', '1,40€')),
        createRow(createColumn('CROISSANT BRIOCHE', '2,20€')),
        createRow(createColumn('TOSTA MISTA', '3,90€')),
      ]),
      createCategory('Bebidas', [
        createRow(createColumn('SUMO NATURAL', '3,20€')),
        createRow(createColumn('MENU PEQUENO-ALMOÇO', '6,50€')),
      ]),
    ],
  },
  {
    id: 'servicos',
    name: 'Serviços',
    description: 'Ideal para clínicas, oficinas e studios com valores desde.',
    categories: [
      createCategory('Serviços', [
        createRow(createColumn('AVALIAÇÃO INICIAL', '25€')),
        createRow(createColumn('PLANO MENSAL', 'desde 49€')),
        createRow(createColumn('SESSÃO INDIVIDUAL', '35€')),
        createRow(createColumn('SERVIÇO EXPRESSO', '+15€')),
      ]),
    ],
  },
]

function cloneColumn(column: PhysicalColumn): PhysicalColumn {
  return {
    ...column,
    id: makeId('col'),
  }
}

function cloneRow(row: PhysicalRow): PhysicalRow {
  return {
    id: makeId('row'),
    columns: row.columns.map(cloneColumn),
  }
}

function cloneCategory(category: PhysicalCategory): PhysicalCategory {
  return {
    ...category,
    id: makeId('cat'),
    rows: category.rows.map(cloneRow),
  }
}

function cloneTemplateCategories(template: MenuTemplate) {
  return template.categories.map(cloneCategory)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
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

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
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

function normalizeColumn(value: unknown, index: number): PhysicalColumn | null {
  if (!isObject(value)) return null
  const leftText = sanitizeMenuText(String(value.leftText ?? value.label ?? '')).slice(0, 160)
  const rightText = sanitizeMenuText(String(value.rightText ?? value.detail ?? '')).slice(0, 160)
  if (!leftText.trim() && !rightText.trim()) return null

  return {
    id: String(value.id ?? `column-${index}`),
    railModules: clampRailModules(Number(value.railModules ?? value.moduleCount ?? inferRailModules(leftText, rightText))),
    leftText,
    rightText,
    align: value.align === 'left' || value.align === 'center' || value.align === 'right' || value.align === 'split' ? value.align : undefined,
    colorOverride: typeof value.colorOverride === 'string' ? value.colorOverride : undefined,
  }
}

function normalizePhysicalRows(value: unknown): PhysicalRow[] {
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

function normalizeCategories(value: unknown): PhysicalCategory[] {
  if (!Array.isArray(value)) return []
  return value
    .map((category, categoryIndex) => {
      if (!isObject(category)) return null
      const rows = normalizePhysicalRows(category.rows)
      if (!rows.length) return null
      return {
        id: String(category.id ?? `category-${categoryIndex}`),
        title: String(category.title ?? `Categoria ${categoryIndex + 1}`).trim() || `Categoria ${categoryIndex + 1}`,
        collapsed: Boolean(category.collapsed),
        rows,
      }
    })
    .filter((category): category is PhysicalCategory => Boolean(category))
}

function normalizeGeneratedWalls(value: unknown): PhysicalWall[] {
  if (!Array.isArray(value)) return []
  return value
    .map((wall, wallIndex) => {
      if (!isObject(wall)) return null
      const type: PhysicalWall['type'] = wall.type === 'logo' ? 'logo' : 'text'
      const rows = type === 'logo' ? [] : normalizePhysicalRows(wall.rows)
      if (type !== 'logo' && !rows.length) return null
      const normalizedWall: PhysicalWall = {
        id: String(wall.id ?? `wall-${wallIndex + 1}`),
        name: String(wall.name ?? `Parede ${wallIndex + 1}`).trim() || `Parede ${wallIndex + 1}`,
        type,
        maxWidthCm: Number.isFinite(Number(wall.maxWidthCm)) ? Number(wall.maxWidthCm) : undefined,
        rows,
        logoSvgUrl: typeof wall.logoSvgUrl === 'string' ? wall.logoSvgUrl : undefined,
        logoSvgText: typeof wall.logoSvgText === 'string' ? wall.logoSvgText : undefined,
        brandColor: typeof wall.brandColor === 'string' ? wall.brandColor : undefined,
      }
      return normalizedWall
    })
    .filter((wall): wall is PhysicalWall => Boolean(wall))
}

function generatedWallsToCategories(walls: PhysicalWall[]): PhysicalCategory[] {
  return walls.map((wall, wallIndex) => ({
    id: `generated-${wall.id || wallIndex}`,
    title: wall.type === 'logo' ? `${wall.name} · upload SVG no próximo passo` : wall.name,
    collapsed: false,
    rows: wall.rows,
  }))
}

function readGeneratedWallsCategories(): PhysicalCategory[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(GENERATED_WALLS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!isObject(parsed)) return []
    const walls = normalizeGeneratedWalls(parsed.walls)
    if (!walls.length) return []
    window.localStorage.removeItem(GENERATED_WALLS_STORAGE_KEY)
    return generatedWallsToCategories(walls)
  } catch {
    return []
  }
}

function migrateLegacyRows(parsed: Record<string, unknown>): PhysicalCategory[] {
  const rows = Array.isArray(parsed.rows) ? parsed.rows : []
  const globalModuleCount = clampRailModules(Number(parsed.globalModuleCount ?? 2))
  const physicalRows = rows
    .map((row, index) => {
      if (!isObject(row)) return null
      const leftText = sanitizeMenuText(String(row.label ?? '')).slice(0, 160)
      const rightText = sanitizeMenuText(String(row.detail ?? '')).slice(0, 160)
      if (!leftText.trim() && !rightText.trim()) return null
      const moduleCount = Number.isFinite(Number(row.moduleCount))
        ? clampRailModules(Number(row.moduleCount))
        : rightText ? Math.max(2, inferRailModules(leftText, rightText)) : Math.min(globalModuleCount, inferRailModules(leftText, rightText))
      return {
        id: String(row.id ?? `legacy-row-${index}`),
        columns: [{
          id: `legacy-column-${index}`,
          railModules: moduleCount,
          leftText,
          rightText,
        }],
      }
    })
    .filter((row): row is PhysicalRow => Boolean(row))

  return physicalRows.length ? [createCategory('Menu', physicalRows)] : cloneTemplateCategories(menuTemplates[0])
}

function normalizeExtraLetterGroups(value: unknown): ExtraLetterGroup[] {
  if (!Array.isArray(value)) return defaultExtraLetterGroups
  const byId = new Map(defaultExtraLetterGroups.map(group => [group.id, group]))
  return defaultExtraLetterGroups.map(defaultGroup => {
    const found = value.find(candidate => isObject(candidate) && candidate.id === defaultGroup.id)
    if (!isObject(found)) return defaultGroup
    return {
      ...defaultGroup,
      quantity: Math.max(0, Math.trunc(Number(found.quantity) || 0)),
      color: normalizeDraftColor(found.color),
      charactersPerUnit: String(found.charactersPerUnit ?? byId.get(defaultGroup.id)?.charactersPerUnit ?? defaultGroup.charactersPerUnit),
    }
  })
}

function readBuilderDraft(): BuilderDraftV3 | null {
  if (typeof window === 'undefined') return null
  try {
    const generatedCategories = readGeneratedWallsCategories()
    if (generatedCategories.length) {
      return {
        version: 3,
        currentStep: 'menu',
        selectedIntentId: 'ai-generated',
        categories: generatedCategories,
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

    const raw = window.localStorage.getItem(BUILDER_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (isObject(parsed) && parsed.version === 3) {
        const categories = normalizeCategories(parsed.categories)
        if (categories.length) {
          return {
            version: 3,
            currentStep: String(parsed.currentStep ?? 'menu'),
            selectedIntentId: String(parsed.selectedIntentId ?? menuTemplates[0].id),
            categories,
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

    const legacyRaw = window.localStorage.getItem(LEGACY_BUILDER_STORAGE_KEY)
    if (!legacyRaw) return null
    const legacy = JSON.parse(legacyRaw) as unknown
    if (!isObject(legacy)) return null
    return {
      version: 3,
      currentStep: String(legacy.currentStep ?? 'menu'),
      selectedIntentId: String(legacy.selectedIntentId ?? menuTemplates[0].id),
      categories: migrateLegacyRows(legacy),
      fontStyle: 'classic',
      railColor: normalizeDraftColor(legacy.railColor),
      baseLetterColor: normalizeDraftColor(legacy.baseLetterColor),
      accentLetterColor: normalizeDraftColor(legacy.accentLetterColor),
      letterCardColor: normalizeDraftColor(legacy.letterCardColor),
      extraLetterGroups: defaultExtraLetterGroups,
      customerName: String(legacy.customerName ?? ''),
      customerEmail: String(legacy.customerEmail ?? ''),
      customerPhone: String(legacy.customerPhone ?? ''),
      shippingMethod: legacy.shippingMethod === 'mainland_portugal' ? 'mainland_portugal' : 'pickup_carcavelos',
      shippingAddress: String(legacy.shippingAddress ?? ''),
      notes: String(legacy.notes ?? ''),
    }
  } catch {
    return null
  }
}

function buildPhysicalGrid(categories: PhysicalCategory[]) {
  return categories.flatMap(category => category.rows)
}

function findColumn(categories: PhysicalCategory[], rowId: string, columnId: string) {
  for (const category of categories) {
    for (const row of category.rows) {
      if (row.id !== rowId) continue
      const column = row.columns.find(candidate => candidate.id === columnId)
      if (column) return column
    }
  }
  return undefined
}

function updateColumnInCategories(
  categories: PhysicalCategory[],
  rowId: string,
  columnId: string,
  updater: (column: PhysicalColumn) => PhysicalColumn,
) {
  return categories.map(category => ({
    ...category,
    rows: category.rows.map(row => row.id === rowId
      ? {
          ...row,
          columns: row.columns.map(column => column.id === columnId ? updater(column) : column),
        }
      : row),
  }))
}

function getExtraColorError(groups: ExtraLetterGroup[]) {
  return groups.some(group => group.quantity > 0 && !group.color?.name)
}

function getRelativeLuminance(hex: string) {
  const normalized = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return 0
  const red = parseInt(normalized.slice(0, 2), 16)
  const green = parseInt(normalized.slice(2, 4), 16)
  const blue = parseInt(normalized.slice(4, 6), 16)

  const channel = (value: number) => {
    const normalizedValue = value / 255
    return normalizedValue <= 0.03928
      ? normalizedValue / 12.92
      : ((normalizedValue + 0.055) / 1.055) ** 2.4
  }

  return (0.2126 * channel(red)) + (0.7152 * channel(green)) + (0.0722 * channel(blue))
}

function findLightCardColor(colors: ProductColor[]) {
  return colors.find(color => ['branco', 'white', 'natural', 'marfim', 'cream'].some(name => color.name.toLowerCase().includes(name)))
    ?? colors.find(color => getRelativeLuminance(color.hex) > 0.72)
    ?? colors[0]
}

const SwatchPicker = memo(function SwatchPicker({
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
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-semibold text-stone-900">{label}</Label>
        <span className="min-w-0 truncate text-sm text-stone-500">{selected?.name ?? 'Escolher'}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {colors.map(color => {
          const active = selected?.globalColorId
            ? selected.globalColorId === color.globalColorId
            : selected?.name === color.name

          return (
            <button
              key={color.globalColorId ?? color.name}
              type="button"
              onClick={() => onSelect(color)}
              title={`${color.name}${(color.priceAdd ?? 0) > 0 ? ` +${formatMoney(color.priceAdd ?? 0)}` : ''}`}
              aria-label={`${label}: ${color.name}`}
              className={`flex size-9 cursor-pointer items-center justify-center rounded-full border transition ${
                active ? 'border-[#1f5138] bg-[#eef7f0] shadow-sm ring-2 ring-[#1f5138]/20' : 'border-stone-200 bg-white hover:border-stone-400'
              }`}
            >
              <span
                className="size-7 rounded-full border border-stone-300"
                style={{
                  backgroundColor: color.hex,
                  backgroundImage: color.imageUrl ? `url(${color.imageUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
})

function LetterTiles({
  text,
  railModules,
  colorHex,
  cardHex,
  align = 'left',
}: {
  text: string
  railModules: number
  colorHex: string
  cardHex: string
  align?: 'left' | 'right'
}) {
  const availableWidth = clampRailModules(railModules) * RAIL_LENGTH_MM
  const characters = Array.from(text)

  return (
    <div className={`flex min-w-0 items-end ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
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

const PreviewColumn = memo(function PreviewColumn({
  rowId,
  column,
  maxRailModules,
  metrics,
  active,
  railHex,
  baseLetterHex,
  accentLetterHex,
  letterCardHex,
}: {
  rowId: string
  column: PhysicalColumn
  maxRailModules: number
  metrics: PhysicalColumnMetrics
  active: boolean
  railHex: string
  baseLetterHex: string
  accentLetterHex: string
  letterCardHex: string
}) {
  const widthPercent = (clampRailModules(column.railModules) / Math.max(1, maxRailModules)) * 100

  return (
    <div
      className={`relative min-h-[82px] rounded-xl border p-3 pb-6 transition ${
        metrics.overflow
          ? 'border-red-400 bg-red-950/25 shadow-[0_0_0_2px_rgba(248,113,113,0.22)]'
          : active
            ? 'border-emerald-300 bg-emerald-950/20 shadow-[0_0_24px_rgba(16,185,129,0.28)]'
            : 'border-white/10 bg-black/14'
      }`}
      style={{ width: `${widthPercent}%` }}
      aria-label={`${rowId} ${column.id}`}
    >
      <div className="grid min-h-[42px] grid-cols-[minmax(0,1fr)_minmax(0,0.55fr)] items-end gap-3">
        <LetterTiles text={column.leftText || ' '} railModules={column.railModules} colorHex={baseLetterHex} cardHex={letterCardHex} />
        <LetterTiles text={column.rightText} railModules={column.railModules} colorHex={accentLetterHex} cardHex={letterCardHex} align="right" />
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
      {metrics.overflow && (
        <p className="mt-2 text-xs font-bold text-red-100">Texto excede o tamanho da calha física.</p>
      )}
    </div>
  )
})

const PhysicalGridPreview = memo(function PhysicalGridPreview({
  categories,
  metricsByColumn,
  editingColumn,
  railColor,
  baseLetterColor,
  accentLetterColor,
  letterCardColor,
  maxRailModules,
}: {
  categories: PhysicalCategory[]
  metricsByColumn: Map<string, PhysicalColumnMetrics>
  editingColumn: EditingColumnState
  railColor?: ProductColor
  baseLetterColor?: ProductColor
  accentLetterColor?: ProductColor
  letterCardColor?: ProductColor
  maxRailModules: number
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
          Grelha física · módulos de {MODULE_LENGTH_CM}cm
        </p>
        <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold leading-[0.98] tracking-tight text-stone-950 sm:text-6xl">
          Menu físico, calha por calha.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-stone-700">
          A pré-visualização usa as mesmas proporções da produção: cada coluna cresce em múltiplos reais de 250mm.
        </p>

        <div className="mt-8 space-y-5">
          {categories.map(category => (
            <div key={category.id} className="space-y-3">
              {category.collapsed ? (
                <div className="rounded-xl border border-stone-950/10 bg-white/48 p-4 text-sm font-semibold text-stone-700 backdrop-blur-sm">
                  {category.title}: {category.rows.length} linhas recolhidas · continuam no BOM
                </div>
              ) : (
                <div className="space-y-3">
                  {category.rows.map(row => (
                    <div key={row.id} className="flex flex-wrap gap-3">
                      {row.columns.map(column => {
                        const metrics = metricsByColumn.get(`${row.id}:${column.id}`) ?? getColumnMetrics(row.id, column)
                        return (
                          <PreviewColumn
                            key={column.id}
                            rowId={row.id}
                            column={column}
                            maxRailModules={maxRailModules}
                            metrics={metrics}
                            active={editingColumn?.rowId === row.id && editingColumn.columnId === column.id}
                            railHex={railHex}
                            baseLetterHex={baseLetterHex}
                            accentLetterHex={accentLetterHex}
                            letterCardHex={letterCardHex}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

const PhysicalColumnEditor = memo(function PhysicalColumnEditor({
  rowId,
  column,
  metrics,
  editing,
  onBeginEdit,
  onEditingChange,
  onCommitEdit,
  onCancelEdit,
  onModuleChange,
}: {
  rowId: string
  column: PhysicalColumn
  metrics: PhysicalColumnMetrics
  editing: EditingColumnState
  onBeginEdit: (rowId: string, column: PhysicalColumn) => void
  onEditingChange: (patch: Partial<NonNullable<EditingColumnState>>) => void
  onCommitEdit: () => void
  onCancelEdit: () => void
  onModuleChange: (rowId: string, columnId: string, direction: 1 | -1) => void
}) {
  const isEditing = editing?.rowId === rowId && editing.columnId === column.id

  return (
    <div className={`rounded-xl border p-3 transition ${metrics.overflow ? 'border-red-300 bg-red-50' : isEditing ? 'border-[#1f5138] bg-[#eef7f0]' : 'border-stone-200 bg-white'}`}>
      {isEditing ? (
        <div className="grid gap-2">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.55fr)_44px]">
            <Input
              value={editing?.leftText ?? ''}
              onChange={event => onEditingChange({ leftText: event.target.value })}
              onKeyDown={event => {
                if (event.key === 'Escape') onCancelEdit()
                if (event.key === 'Enter') onCommitEdit()
              }}
              placeholder="Texto esquerdo"
              aria-label="Texto esquerdo"
              className="h-10 bg-white"
            />
            <Input
              value={editing?.rightText ?? ''}
              onChange={event => onEditingChange({ rightText: event.target.value })}
              onKeyDown={event => {
                if (event.key === 'Escape') onCancelEdit()
                if (event.key === 'Enter') onCommitEdit()
              }}
              placeholder="Texto direito/preço"
              aria-label="Texto direito ou preço"
              className="h-10 bg-white"
            />
            <Button type="button" size="icon" onClick={onCommitEdit} className="bg-[#1f5138] text-white hover:bg-[#173d2a]" aria-label="Guardar coluna">
              <Check className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onBeginEdit(rowId, column)}
          className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-3 text-left"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-black tracking-[0.08em] text-stone-950">{column.leftText || 'Linha vazia'}</span>
            {column.rightText && <span className="mt-1 block truncate text-sm font-semibold text-[#1f5138]">{column.rightText}</span>}
          </span>
          <span className="text-xs font-semibold text-stone-500">{metrics.totalTextWidthMm}mm / {metrics.availableWidthMm}mm</span>
        </button>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={() => onModuleChange(rowId, column.id, -1)} disabled={column.railModules <= MIN_GLOBAL_MODULES} aria-label="Diminuir módulos">
            <Minus className="size-4" />
          </Button>
          <span className="min-w-24 text-center text-sm font-black">{column.railModules}x · {column.railModules * RAIL_LENGTH_MM}mm</span>
          <Button type="button" variant="outline" size="icon" onClick={() => onModuleChange(rowId, column.id, 1)} disabled={column.railModules >= MAX_GLOBAL_MODULES} aria-label="Aumentar módulos">
            <Plus className="size-4" />
          </Button>
        </div>
        <span className="text-xs text-stone-500">Calha física</span>
      </div>

      {metrics.overflow && (
        <p className="mt-2 rounded-md border border-red-200 bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
          Texto excede o tamanho da calha física.
        </p>
      )}
    </div>
  )
})

const MenuCategoryAccordion = memo(function MenuCategoryAccordion({
  category,
  metricsByColumn,
  editingColumn,
  onToggle,
  onBeginEdit,
  onEditingChange,
  onCommitEdit,
  onCancelEdit,
  onModuleChange,
}: {
  category: PhysicalCategory
  metricsByColumn: Map<string, PhysicalColumnMetrics>
  editingColumn: EditingColumnState
  onToggle: (categoryId: string) => void
  onBeginEdit: (rowId: string, column: PhysicalColumn) => void
  onEditingChange: (patch: Partial<NonNullable<EditingColumnState>>) => void
  onCommitEdit: () => void
  onCancelEdit: () => void
  onModuleChange: (rowId: string, columnId: string, direction: 1 | -1) => void
}) {
  const metrics = category.rows.flatMap(row => row.columns.map(column => metricsByColumn.get(`${row.id}:${column.id}`) ?? getColumnMetrics(row.id, column)))
  const moduleCount = metrics.reduce((sum, metric) => sum + metric.railModules, 0)
  const overflowCount = metrics.filter(metric => metric.overflow).length

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => onToggle(category.id)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-4 text-left"
        aria-expanded={!category.collapsed}
      >
        <span>
          <span className="block text-base font-black text-stone-950">{category.title}</span>
          <span className="mt-1 block text-xs text-stone-500">
            {category.rows.length} linhas · {moduleCount} módulos · {overflowCount} avisos
          </span>
        </span>
        <ChevronDown className={`size-4 transition ${category.collapsed ? '-rotate-90' : ''}`} />
      </button>

      {!category.collapsed && (
        <div className="space-y-3 border-t border-stone-100 p-4">
          {category.rows.map(row => (
            <div key={row.id} className="grid gap-3">
              {row.columns.map(column => {
                const metricsForColumn = metricsByColumn.get(`${row.id}:${column.id}`) ?? getColumnMetrics(row.id, column)
                return (
                  <PhysicalColumnEditor
                    key={column.id}
                    rowId={row.id}
                    column={column}
                    metrics={metricsForColumn}
                    editing={editingColumn}
                    onBeginEdit={onBeginEdit}
                    onEditingChange={onEditingChange}
                    onCommitEdit={onCommitEdit}
                    onCancelEdit={onCancelEdit}
                    onModuleChange={onModuleChange}
                  />
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

function ExtraLettersPanel({
  groups,
  colors,
  onQuantityChange,
  onColorChange,
}: {
  groups: ExtraLetterGroup[]
  colors: ProductColor[]
  onQuantityChange: (id: ExtraLetterGroup['id'], direction: 1 | -1) => void
  onColorChange: (id: ExtraLetterGroup['id'], color: ProductColor) => void
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-black text-stone-950">Letras Extra</h3>
      <p className="mt-1 text-sm text-stone-500">Adicione conjuntos físicos para futuras alterações. Cada conjunto precisa de cor.</p>
      <div className="mt-4 grid gap-3">
        {groups.map(group => (
          <div key={group.id} className={`rounded-xl border p-3 ${group.quantity > 0 && !group.color ? 'border-amber-300 bg-amber-50' : 'border-stone-200 bg-[#fbfaf7]'}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-stone-950">{group.label}</p>
                <p className="mt-1 max-w-[16rem] truncate text-xs text-stone-500">{group.charactersPerUnit}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => onQuantityChange(group.id, -1)} disabled={group.quantity <= 0} aria-label={`Diminuir ${group.label}`}>
                  <Minus className="size-4" />
                </Button>
                <span className="w-8 text-center font-black">{group.quantity}</span>
                <Button type="button" variant="outline" size="icon" onClick={() => onQuantityChange(group.id, 1)} aria-label={`Aumentar ${group.label}`}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
            {group.quantity > 0 && (
              <div className="mt-3">
                <SwatchPicker
                  label={`Cor ${group.label}`}
                  colors={colors}
                  selected={group.color as ProductColor | undefined}
                  onSelect={color => onColorChange(group.id, color)}
                />
              </div>
            )}
            {group.quantity > 0 && !group.color && (
              <p className="mt-2 text-xs font-bold text-amber-800">Escolha a cor antes de finalizar.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function BomSummary({
  bom,
  shippingCost,
}: {
  bom: PhysicalGridBom
  shippingCost: number
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white/96 p-4 shadow-[0_-18px_42px_rgba(15,23,42,0.12)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">BOM físico</p>
          <p className="mt-1 text-2xl font-black">{formatMoney(bom.totalAfterDiscount + shippingCost)}</p>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            {bom.totalRailModules} calhas · {bom.standardPackQuantity} packs · {bom.avulsoCharacterQuantity} letras avulso
          </p>
        </div>
        <div className={`rounded-full p-2 ${bom.hasOverflow ? 'bg-red-100 text-red-700' : 'bg-[#eef7f0] text-[#1f5138]'}`} title={bom.hasOverflow ? 'Existe texto em overflow' : 'BOM sem overflow'}>
          <Check className="size-4" />
        </div>
      </div>
    </div>
  )
}

export default function ModularMenusPage() {
  const initialTemplate = menuTemplates[0]
  const [draftHydrated, setDraftHydrated] = useState(false)
  const [selectedIntentId, setSelectedIntentId] = useState(initialTemplate.id)
  const [categories, setCategories] = useState<PhysicalCategory[]>(() => cloneTemplateCategories(initialTemplate))
  const [fontStyle, setFontStyle] = useState<FontStyle>('classic')
  const [editingColumn, setEditingColumn] = useState<EditingColumnState>(null)
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
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)

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
    () => (query.data?.globalColors ?? [])
      .filter(color => color.isActive !== false && color.spoolStatus !== 'archived'),
    [query.data?.globalColors],
  )
  const railProduct = products.find(product => product.slug === MENU_RAIL_SLUG)
  const packProduct = products.find(product => product.slug === MENU_PACK_SLUG)
  const avulsoProduct = products.find(product => product.slug === MENU_AVULSO_SLUG)
  const catalogReady = Boolean(railProduct && packProduct && avulsoProduct)
  const railColors = useMemo(() => getProductOfferedColors(railProduct, activeGlobalColors), [activeGlobalColors, railProduct])
  const packColors = useMemo(() => getProductOfferedColors(packProduct, activeGlobalColors), [activeGlobalColors, packProduct])
  const avulsoColors = useMemo(() => getProductOfferedColors(avulsoProduct, activeGlobalColors), [activeGlobalColors, avulsoProduct])
  const letterColors = useMemo(() => {
    if (packColors.length && avulsoColors.length) return intersectColorSets([packColors, avulsoColors])
    return uniqueColors([...packColors, ...avulsoColors])
  }, [avulsoColors, packColors])
  const selectedRailColor = railColor && railColors.some(color => colorMatches(color, railColor))
    ? railColor
    : findColor(railColors, ['preto', 'black'])
  const selectedBaseLetterColor = baseLetterColor && letterColors.some(color => colorMatches(color, baseLetterColor))
    ? baseLetterColor
    : findColor(letterColors, ['branco', 'white'])
  const selectedAccentLetterColor = accentLetterColor && letterColors.some(color => colorMatches(color, accentLetterColor))
    ? accentLetterColor
    : findColor(letterColors, ['amarelo', 'dourado', 'gold', 'azul', 'blue']) ?? selectedBaseLetterColor
  const selectedLetterCardColor = letterCardColor && letterColors.some(color => colorMatches(color, letterCardColor))
    ? letterCardColor
    : findLightCardColor(letterColors)

  const physicalGrid = useMemo(() => buildPhysicalGrid(categories), [categories])
  const metricsByColumn = useMemo(() => {
    const map = new Map<string, PhysicalColumnMetrics>()
    for (const row of physicalGrid) {
      for (const column of row.columns) {
        map.set(`${row.id}:${column.id}`, getColumnMetrics(row.id, column))
      }
    }
    return map
  }, [physicalGrid])
  const railModuleUnitPrice = getProductPrice(railProduct) + (selectedRailColor?.priceAdd ?? 0)
  const letterColorPriceAdd = Math.max(
    selectedBaseLetterColor?.priceAdd ?? 0,
    selectedAccentLetterColor?.priceAdd ?? 0,
    selectedLetterCardColor?.priceAdd ?? 0,
  )
  const standardPackUnitPrice = getProductPrice(packProduct) + letterColorPriceAdd
  const avulsoUnitPrice = getProductPrice(avulsoProduct) + letterColorPriceAdd
  const bom = useMemo(
    () => getGridBom({
      grid: physicalGrid,
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
    [avulsoUnitPrice, extraLetterGroups, physicalGrid, railModuleUnitPrice, selectedAccentLetterColor, selectedBaseLetterColor, standardPackUnitPrice],
  )
  const shippingCost = shippingMethod === 'mainland_portugal' ? SHIPPING_COST : 0
  const extraColorError = getExtraColorError(extraLetterGroups)

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const fallbackMessage = window.localStorage.getItem(BUILDER_TOAST_STORAGE_KEY)
    if (searchParams.get('fallback') === 'true' || fallbackMessage) {
      toast.info('Plano automático indisponível', {
        description: fallbackMessage ?? 'A IA teve uma falha de criatividade. Mas não se preocupe, pode usar os nossos templates!',
        duration: 9000,
      })
      window.localStorage.removeItem(BUILDER_TOAST_STORAGE_KEY)
    }

    const draft = readBuilderDraft()
    if (draft) {
      setSelectedIntentId(draft.selectedIntentId)
      setCategories(draft.categories)
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
    }
    setDraftHydrated(true)
  }, [])

  useEffect(() => {
    if (!draftHydrated) return
    const draft: BuilderDraftV3 = {
      version: 3,
      currentStep: 'menu',
      selectedIntentId,
      categories,
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
    categories,
    customerEmail,
    customerName,
    customerPhone,
    draftHydrated,
    extraLetterGroups,
    fontStyle,
    notes,
    selectedAccentLetterColor,
    selectedBaseLetterColor,
    selectedIntentId,
    selectedLetterCardColor,
    selectedRailColor,
    shippingAddress,
    shippingMethod,
  ])

  const handleTemplateSelect = useCallback((value: string) => {
    const template = menuTemplates.find(candidate => candidate.id === value)
    if (!template) return
    setSelectedIntentId(template.id)
    setCategories(cloneTemplateCategories(template))
    setEditingColumn(null)
    setError('')
  }, [])

  const toggleCategory = useCallback((categoryId: string) => {
    setCategories(current => current.map(category => category.id === categoryId
      ? { ...category, collapsed: !category.collapsed }
      : category))
  }, [])

  const beginColumnEdit = useCallback((rowId: string, column: PhysicalColumn) => {
    setEditingColumn({
      rowId,
      columnId: column.id,
      leftText: column.leftText,
      rightText: column.rightText,
    })
  }, [])

  const updateEditingColumn = useCallback((patch: Partial<NonNullable<EditingColumnState>>) => {
    setEditingColumn(current => current ? { ...current, ...patch } : current)
  }, [])

  const cancelColumnEdit = useCallback(() => {
    setEditingColumn(null)
  }, [])

  const commitColumnEdit = useCallback(() => {
    setEditingColumn(current => {
      if (!current) return null
      const leftText = sanitizeMenuText(current.leftText).replace(/\s+/g, ' ').trim()
      const rightText = sanitizeMenuText(current.rightText).replace(/\s+/g, ' ').trim()
      setCategories(categoriesNow => updateColumnInCategories(categoriesNow, current.rowId, current.columnId, column => ({
        ...column,
        leftText,
        rightText,
      })))
      return null
    })
  }, [])

  const updateColumnRailModules = useCallback((rowId: string, columnId: string, direction: 1 | -1) => {
    setCategories(current => updateColumnInCategories(current, rowId, columnId, column => ({
      ...column,
      railModules: clampRailModules(column.railModules + direction),
    })))
  }, [])

  const updateExtraQuantity = useCallback((id: ExtraLetterGroup['id'], direction: 1 | -1) => {
    setExtraLetterGroups(current => current.map(group => group.id === id
      ? { ...group, quantity: Math.max(0, group.quantity + direction) }
      : group))
  }, [])

  const updateExtraColor = useCallback((id: ExtraLetterGroup['id'], color: ProductColor) => {
    setExtraLetterGroups(current => current.map(group => group.id === id ? { ...group, color } : group))
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmittingRef.current) return

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setError('')

    try {
      if (editingColumn) {
        setError('Guarda a coluna em edição antes de finalizar.')
        return
      }
      if (!catalogReady) {
        setError('O catálogo do Sinalética Modular ainda não está completo.')
        return
      }
      if (!selectedRailColor || !selectedBaseLetterColor || !selectedAccentLetterColor || !selectedLetterCardColor) {
        setError('Escolha as cores das calhas, letras, destaque e fundo das letras.')
        return
      }
      if (bom.hasOverflow) {
        setError('Corrija as linhas com texto maior do que a calha física.')
        return
      }
      if (extraColorError) {
        setError('Escolha a cor de todos os conjuntos de Letras Extra.')
        return
      }
      if (shippingMethod === 'mainland_portugal' && shippingAddress.trim().length < 8) {
        setError('Indique uma morada completa para envio nacional.')
        return
      }

      const railColorPayload = stripMenuColor(selectedRailColor)
      const baseLetterColorPayload = stripMenuColor(selectedBaseLetterColor)
      const accentLetterColorPayload = stripMenuColor(selectedAccentLetterColor)
      const letterCardColorPayload = stripMenuColor(selectedLetterCardColor)
      const extraGroupsPayload = extraLetterGroups.map(group => ({
        ...group,
        color: group.color ? stripMenuColor(group.color as ProductColor) : undefined,
      }))
      const items = [
        {
          productSlug: MENU_RAIL_SLUG,
          quantity: bom.totalRailModules,
          selectedColor: railColorPayload,
          customizations: [],
        },
        bom.standardPackQuantity > 0
          ? {
              productSlug: MENU_PACK_SLUG,
              quantity: bom.standardPackQuantity,
              selectedColor: baseLetterColorPayload,
              customizations: [],
            }
          : null,
        bom.avulsoCharacterQuantity > 0
          ? {
              productSlug: MENU_AVULSO_SLUG,
              quantity: bom.avulsoCharacterQuantity,
              selectedColor: baseLetterColorPayload,
              customizations: [],
            }
          : null,
      ].filter(Boolean)

      const response = await fetch('/api/checkout/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          },
          shipping: {
            method: shippingMethod,
            address: shippingAddress,
          },
          notes,
          menuSystem: {
            dimensionSet: PHYSICAL_GRID_DIMENSION_SET,
            fontStyle,
            physicalGrid,
            categories,
            extraLetterGroups: extraGroupsPayload,
            moduleLengthCm: MODULE_LENGTH_CM,
            charsPerModuleEstimate: CHARS_PER_MODULE_ESTIMATE,
            globalModuleCount: bom.maxRailModules,
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
          items,
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error || 'Não foi possível iniciar o pagamento.')
      }

      window.location.href = payload.checkoutUrl
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível iniciar o pagamento.')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const checkoutDisabled = isSubmitting ||
    Boolean(editingColumn) ||
    query.isLoading ||
    !catalogReady ||
    !selectedRailColor ||
    !selectedBaseLetterColor ||
    !selectedAccentLetterColor ||
    !selectedLetterCardColor ||
    bom.hasOverflow ||
    extraColorError ||
    bom.totalRailModules < 1

  return (
    <main className="min-h-screen bg-[#f5f2eb] text-stone-950">
      <Header />

      <form onSubmit={handleSubmit}>
        <section className="relative overflow-hidden bg-[#0c0c0a] px-4 py-5 text-white sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(216,185,104,0.2),transparent_32%),radial-gradient(circle_at_78%_12%,rgba(94,116,91,0.24),transparent_28%),linear-gradient(135deg,#10100d,#242016_44%,#0c0c0a)]" />
          <div className="absolute inset-0 opacity-[0.15] [background-image:linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:54px_54px]" />

          <div className="relative mx-auto grid max-w-[1600px] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_430px]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-2xl backdrop-blur-xl sm:p-6">
              <PhysicalGridPreview
                categories={categories}
                metricsByColumn={metricsByColumn}
                editingColumn={editingColumn}
                railColor={selectedRailColor}
                baseLetterColor={selectedBaseLetterColor}
                accentLetterColor={selectedAccentLetterColor}
                letterCardColor={selectedLetterCardColor}
                maxRailModules={bom.maxRailModules}
              />
            </div>

            <aside className="flex min-h-0 flex-col rounded-[1.5rem] border border-white/12 bg-[#f8f6f0] p-4 text-stone-950 shadow-2xl lg:sticky lg:top-5 lg:max-h-[calc(100vh-40px)]">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1f5138]">Builder físico</p>
                <h2 className="mt-2 text-2xl font-bold">Sinalética Modular</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Configure a grelha de calhas reais. Cada coluna tem módulos de 250mm e letras medidas em milímetros.
                </p>
              </div>

              <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pb-5 pr-1">
                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <Label className="text-sm font-bold">Template</Label>
                  <Select value={selectedIntentId} onValueChange={handleTemplateSelect}>
                    <SelectTrigger className="mt-3 h-11 w-full bg-white">
                      <SelectValue placeholder="Escolher template" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs leading-5 text-stone-500">
                    {menuTemplates.find(template => template.id === selectedIntentId)?.description}
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <Label className="text-sm font-bold">Estilo de letra STL</Label>
                  <div className="mt-3 grid gap-2">
                    {fontStyles.map(style => (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() => setFontStyle(style.value)}
                        className={`cursor-pointer rounded-xl border p-3 text-left transition ${fontStyle === style.value ? 'border-[#1f5138] bg-[#eef7f0]' : 'border-stone-200 bg-white hover:bg-stone-50'}`}
                      >
                        <span className="block font-bold">{style.label}</span>
                        <span className="mt-1 block text-sm text-stone-500">{style.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {categories.map(category => (
                    <MenuCategoryAccordion
                      key={category.id}
                      category={category}
                      metricsByColumn={metricsByColumn}
                      editingColumn={editingColumn}
                      onToggle={toggleCategory}
                      onBeginEdit={beginColumnEdit}
                      onEditingChange={updateEditingColumn}
                      onCommitEdit={commitColumnEdit}
                      onCancelEdit={cancelColumnEdit}
                      onModuleChange={updateColumnRailModules}
                    />
                  ))}
                </div>

                <ExtraLettersPanel
                  groups={extraLetterGroups}
                  colors={letterColors}
                  onQuantityChange={updateExtraQuantity}
                  onColorChange={updateExtraColor}
                />

                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <h3 className="text-base font-black text-stone-950">Cores</h3>
                  <div className="mt-4 grid gap-5">
                    {railColors.length > 0 ? (
                      <SwatchPicker label="Cor das calhas" colors={railColors} selected={selectedRailColor} onSelect={setRailColor} />
                    ) : (
                      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        As cores das calhas não estão configuradas.
                      </p>
                    )}
                    {letterColors.length > 0 ? (
                      <>
                        <SwatchPicker label="Cor das letras" colors={letterColors} selected={selectedBaseLetterColor} onSelect={setBaseLetterColor} />
                        <SwatchPicker label="Cor de destaque/preço" colors={letterColors} selected={selectedAccentLetterColor} onSelect={setAccentLetterColor} />
                        <SwatchPicker label="Cor do fundo das letras" colors={letterColors} selected={selectedLetterCardColor} onSelect={setLetterCardColor} />
                      </>
                    ) : (
                      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        As letras ainda não têm cores configuradas.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <h3 className="text-base font-black text-stone-950">Dados para checkout</h3>
                  <div className="mt-4 grid gap-3">
                    <div>
                      <Label htmlFor="customer-name">Nome</Label>
                      <Input id="customer-name" value={customerName} onChange={event => setCustomerName(event.target.value)} required minLength={2} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="customer-email">Email</Label>
                      <Input id="customer-email" type="email" value={customerEmail} onChange={event => setCustomerEmail(event.target.value)} required className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="customer-phone">Telemóvel</Label>
                      <Input id="customer-phone" value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} inputMode="tel" className="mt-1" />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <label className={`cursor-pointer rounded-md border p-3 transition ${shippingMethod === 'pickup_carcavelos' ? 'border-[#1f5138] bg-[#eef7f0]' : 'border-stone-200 bg-white'}`}>
                      <input type="radio" name="shipping" checked={shippingMethod === 'pickup_carcavelos'} onChange={() => setShippingMethod('pickup_carcavelos')} className="sr-only" />
                      <span className="font-semibold">Levantamento em Carcavelos</span>
                      <span className="mt-1 block text-sm text-stone-500">Sem custo de envio.</span>
                    </label>
                    <label className={`cursor-pointer rounded-md border p-3 transition ${shippingMethod === 'mainland_portugal' ? 'border-[#1f5138] bg-[#eef7f0]' : 'border-stone-200 bg-white'}`}>
                      <input type="radio" name="shipping" checked={shippingMethod === 'mainland_portugal'} onChange={() => setShippingMethod('mainland_portugal')} className="sr-only" />
                      <span className="font-semibold">Envio nacional</span>
                      <span className="mt-1 block text-sm text-stone-500">{formatMoney(SHIPPING_COST)}</span>
                    </label>
                  </div>

                  {shippingMethod === 'mainland_portugal' && (
                    <div className="mt-3">
                      <Label htmlFor="shipping-address">Morada completa</Label>
                      <Input id="shipping-address" value={shippingAddress} onChange={event => setShippingAddress(event.target.value)} required className="mt-1" />
                    </div>
                  )}

                  <div className="mt-3">
                    <Label htmlFor="notes">Notas</Label>
                    <Input id="notes" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Prazo ideal ou detalhes de montagem" className="mt-1" />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 mt-4 space-y-3">
                <BomSummary bom={bom} shippingCost={shippingCost} />
                <div className="space-y-2">
                  {query.isLoading && <p className="text-sm text-stone-500">A carregar catálogo...</p>}
                  {bom.hasOverflow && (
                    <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                      Existe texto maior do que a calha física.
                    </p>
                  )}
                  {editingColumn && (
                    <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Guarda a coluna em edição antes de finalizar.
                    </p>
                  )}
                  {extraColorError && (
                    <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Escolha a cor das Letras Extra selecionadas.
                    </p>
                  )}
                  {error && (
                    <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={checkoutDisabled}
                  className="h-12 w-full bg-[#1f5138] text-white hover:bg-[#173d2a]"
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                  Adicionar ao carrinho
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </aside>
          </div>
        </section>
      </form>

      <Footer />
    </main>
  )
}
