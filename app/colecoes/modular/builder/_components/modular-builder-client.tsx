'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, Loader2, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { ReviewSheet } from './builder-review-sheet'
import { db } from '@/lib/db'
import {
  EXTRA_LETTER_PACKS,
  RAIL_LENGTH_MM,
  type ExtraLetterPackId,
  type ExtraLetterPackSelection,
} from '@/lib/modular-inventory-config'
import {
  PHYSICAL_GRID_DIMENSION_SET,
  getWallsBom,
  type CheckoutLane,
  type PhysicalWallsBom,
} from '@/lib/modular-physical-grid'
import {
  MENU_V1_ACTIVE_DRAFT_KEY,
  MENU_V1_AUTOPAY_CHARACTER_LIMIT,
  MENU_V1_TEMPLATE_DRAFT_KEY,
  buildSyntheticMenuWall,
  buildV1MenuSystemPayload,
  countExtraPackCharacters,
  createMenuV1Line,
  getV1LineMetrics,
  sanitizeV1Lines,
  type MenuV1Draft,
  type MenuV1Line,
} from '@/lib/modular-menu-v1'
import type { ProductColor } from '@/lib/products'

const MENU_RAIL_SLUG = 'menu-rail-25cm'
const MENU_PACK_SLUG = 'menu-letter-pack-standard'
const MENU_AVULSO_SLUG = 'menu-letter-custom'
const MENU_PRODUCT_SLUGS = [MENU_RAIL_SLUG, MENU_PACK_SLUG, MENU_AVULSO_SLUG]
const SHIPPING_COST = 4.99
const OLD_BUILDER_STORAGE_KEYS = [
  'em3d-modular-builder-active',
  'em3d-modular-builder-v3',
  'em3d-modular-planner-walls-v1',
]

const DEFAULT_LINES = [
  { label: 'ESPRESSO', detail: '1,50' },
  { label: 'CAPPUCCINO', detail: '2,80' },
  { label: 'CROISSANT', detail: '2,50' },
].map((line, index) => createMenuV1Line(index, line))

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function normalizeProductInventoryRecord(value: unknown) {
  if (Array.isArray(value)) return value[0] as any
  return value as any
}

function colorMatches(left: ProductColor | undefined, right: ProductColor | undefined) {
  if (!left || !right) return false
  if (left.globalColorId && right.globalColorId) return left.globalColorId === right.globalColorId
  return left.name.trim().toLowerCase() === right.name.trim().toLowerCase()
}

function getReadableSwatchIconColor(hex: string) {
  const normalized = hex.replace('#', '').trim()
  const expanded = normalized.length === 3
    ? normalized.split('').map(character => `${character}${character}`).join('')
    : normalized
  const value = Number.parseInt(expanded.slice(0, 6), 16)
  if (Number.isNaN(value)) return '#111111'

  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
  return luminance > 0.58 ? '#111111' : '#ffffff'
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

function getProductOfferedColors(product: any, activeGlobalColors: any[]) {
  const inventory = normalizeProductInventoryRecord(product?.inventory)
  const inventoryColors = inventory?.colorInventory ?? []
  const colors = inventoryColors
    .filter((color: any) => color.offered)
    .map((color: any): ProductColor => {
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

function getProductPrice(product: any) {
  return product?.salePrice ?? product?.priceFrom ?? 0
}

function stripMenuColor(color: ProductColor) {
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

function toExtraLetterPackColor(color: ProductColor | undefined): ExtraLetterPackSelection['color'] | undefined {
  if (!color?.globalColorId) return undefined
  return {
    globalColorId: color.globalColorId,
    hex: color.hex ?? '#d1d5db',
    name: color.name,
    priceAdd: color.priceAdd,
  }
}

function readProductColors(product: any, inventoryBySlug: Map<string, any>) {
  return {
    ...product,
    inventory: normalizeProductInventoryRecord(product.inventory) ?? inventoryBySlug.get(product.slug),
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

function isExtraLetterPackId(value: unknown): value is ExtraLetterPackId {
  return typeof value === 'string' && value in EXTRA_LETTER_PACKS
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

function createDefaultDraft(lines: MenuV1Line[] = DEFAULT_LINES): MenuV1Draft {
  return {
    version: 1,
    lines,
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

function readInitialDraft(): MenuV1Draft {
  if (typeof window === 'undefined') return createDefaultDraft()

  for (const key of OLD_BUILDER_STORAGE_KEYS) {
    window.localStorage.removeItem(key)
  }

  try {
    const templateRaw = window.localStorage.getItem(MENU_V1_TEMPLATE_DRAFT_KEY)
    if (templateRaw) {
      window.localStorage.removeItem(MENU_V1_TEMPLATE_DRAFT_KEY)
      const parsed = JSON.parse(templateRaw) as unknown
      const lines = isObject(parsed) ? sanitizeV1Lines(parsed.lines) : []
      if (lines.length) return createDefaultDraft(lines)
    }

    const activeRaw = window.localStorage.getItem(MENU_V1_ACTIVE_DRAFT_KEY)
    if (activeRaw) {
      const parsed = JSON.parse(activeRaw) as unknown
      if (isObject(parsed) && parsed.version === 1 && Array.isArray(parsed.lines)) {
        const lines = sanitizeV1Lines(parsed.lines)
        if (lines.length) {
          return {
            version: 1,
            lines,
            railColor: normalizeDraftColor(parsed.railColor),
            baseLetterColor: normalizeDraftColor(parsed.baseLetterColor),
            accentLetterColor: normalizeDraftColor(parsed.accentLetterColor),
            letterCardColor: normalizeDraftColor(parsed.letterCardColor),
            customBrandColor: typeof parsed.customBrandColor === 'string' ? parsed.customBrandColor : undefined,
            customBrandColorTarget: parsed.customBrandColorTarget === 'rails' ? 'rails' : 'letters',
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
  } catch {
    window.localStorage.removeItem(MENU_V1_ACTIVE_DRAFT_KEY)
  }

  return createDefaultDraft()
}

function resolveColorSlot({
  explicitColor,
  availableColors,
  defaultColor,
  label,
}: {
  explicitColor?: ProductColor
  availableColors: ProductColor[]
  defaultColor?: ProductColor
  label: string
}) {
  if (explicitColor) {
    const matched = availableColors.find(color => colorMatches(color, explicitColor))
    if (matched) return { color: matched, error: '' }
    return { color: undefined, error: `${label}: "${explicitColor.name}" já não está disponível.` }
  }
  if (defaultColor) return { color: defaultColor, error: '' }
  return { color: undefined, error: `${label}: não há cores disponíveis no inventário activo.` }
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
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        {selected ? <p className="text-xs font-semibold text-foreground">{selected.name}</p> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {colors.map(color => {
          const active = colorMatches(color, selected)
          return (
            <button
              key={color.globalColorId ?? color.name}
              type="button"
              onClick={() => onSelect(color)}
              aria-pressed={active}
              aria-label={`${label}: ${color.name}`}
              className={`flex min-h-11 min-w-11 cursor-pointer items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-xs font-semibold text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-3 ${active ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-border hover:border-stone-400'}`}
            >
              <span className="relative size-7 shrink-0 rounded-sm border border-black/10" style={{ backgroundColor: color.hex }}>
                {active ? (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check className="size-4 stroke-[3]" style={{ color: getReadableSwatchIconColor(color.hex) }} />
                  </span>
                ) : null}
              </span>
              <span className="hidden sm:inline">{color.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ExtraLettersSection({
  selections,
  colors,
  onAdd,
  onRemove,
  onUpdate,
}: {
  selections: ExtraLetterPackSelection[]
  colors: ProductColor[]
  onAdd: () => void
  onRemove: (id: string) => void
  onUpdate: (id: string, patch: Partial<ExtraLetterPackSelection>) => void
}) {
  return (
    <section className="rounded-lg border border-border bg-white p-5 text-stone-950">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black">Letras extra</h2>
          <p className="mt-1 text-sm text-muted-foreground">Packs opcionais por cor para stock físico.</p>
        </div>
        <Button type="button" variant="outline" onClick={onAdd} className="cursor-pointer">
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>

      {selections.length > 0 && (
        <div className="mt-4 divide-y divide-border">
          {selections.map(selection => {
            const pack = EXTRA_LETTER_PACKS[selection.packId]
            return (
              <div key={selection.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_96px_1fr_auto] sm:items-end">
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Pack
                  <select
                    value={selection.packId}
                    onChange={event => onUpdate(selection.id, { packId: event.target.value as ExtraLetterPackId })}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground"
                  >
                    {Object.values(EXTRA_LETTER_PACKS).map(option => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Qtd.
                  <input
                    type="number"
                    min={1}
                    value={selection.quantity}
                    onChange={event => onUpdate(selection.id, { quantity: Math.max(1, Math.trunc(Number(event.target.value) || 1)) })}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Cor
                  <select
                    value={selection.color.globalColorId}
                    onChange={event => {
                      const color = colors.find(candidate => candidate.globalColorId === event.target.value)
                      const packColor = toExtraLetterPackColor(color)
                      if (packColor) onUpdate(selection.id, { color: packColor })
                    }}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground"
                  >
                    {colors.filter(color => color.globalColorId).map(color => (
                      <option key={color.globalColorId} value={color.globalColorId}>{color.name}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => onRemove(selection.id)}
                  className="flex size-10 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-red-50 hover:text-red-700"
                  aria-label={`Remover pack extra ${pack?.label ?? selection.packId}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function BomSummary({ bom, shippingCost, checkoutLane }: { bom: PhysicalWallsBom; shippingCost: number; checkoutLane: CheckoutLane }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">{checkoutLane === 'manual_quote' ? 'Orçamento manual' : 'Total estimado'}</p>
        <p className="text-2xl font-black">{formatMoney(bom.totalAfterDiscount + shippingCost)}</p>
      </div>
      <p className="text-sm text-stone-500">
        {bom.lineCount} linhas · {bom.totalRailModules} calhas · {bom.totalCharacters} caracteres · {bom.standardPackQuantity} pack · {bom.avulsoCharacterQuantity} avulso
      </p>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:py-6">
      <div className="w-full max-w-lg rounded-lg border border-border bg-white p-5 text-stone-950 shadow-2xl">
        <h2 className="text-2xl font-black">Pedir orçamento gratuito</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Este menu precisa de revisão manual por dimensão, volume ou cor personalizada.
        </p>
        <div className="mt-5 grid gap-3">
          <input className="h-11 rounded-md border border-input px-3 text-sm" placeholder="Nome" value={customerName} onChange={event => onCustomerNameChange(event.target.value)} />
          <input className="h-11 rounded-md border border-input px-3 text-sm" placeholder="Email" value={customerEmail} onChange={event => onCustomerEmailChange(event.target.value)} />
          <input className="h-11 rounded-md border border-input px-3 text-sm" placeholder="Telemóvel" value={customerPhone} onChange={event => onCustomerPhoneChange(event.target.value)} />
          <input className="h-11 rounded-md border border-input px-3 text-sm" placeholder="Tipo de espaço (ex.: café, barbearia, cowork)" value={spaceType} onChange={event => onSpaceTypeChange(event.target.value)} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">Voltar</Button>
          <Button type="button" onClick={onSubmit} disabled={isSubmitting} className="cursor-pointer bg-stone-950 text-white hover:bg-[#d4af37] hover:text-stone-950">
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Enviar pedido
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ModularBuilderClient() {
  const [draftHydrated, setDraftHydrated] = useState(false)
  const [lines, setLines] = useState<MenuV1Line[]>(DEFAULT_LINES)
  const [railColor, setRailColor] = useState<ProductColor | undefined>()
  const [baseLetterColor, setBaseLetterColor] = useState<ProductColor | undefined>()
  const [accentLetterColor, setAccentLetterColor] = useState<ProductColor | undefined>()
  const [letterCardColor, setLetterCardColor] = useState<ProductColor | undefined>()
  const [customBrandColor, setCustomBrandColor] = useState('')
  const [customBrandColorTarget, setCustomBrandColorTarget] = useState<'rails' | 'letters'>('letters')
  const [extraLetterPackSelections, setExtraLetterPackSelections] = useState<ExtraLetterPackSelection[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [spaceType, setSpaceType] = useState('')
  const [shippingMethod, setShippingMethod] = useState<'pickup_carcavelos' | 'mainland_portugal'>('pickup_carcavelos')
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [manualQuoteModalOpen, setManualQuoteModalOpen] = useState(false)
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

  useEffect(() => {
    const draft = readInitialDraft()
    setLines(draft.lines)
    setRailColor(draft.railColor)
    setBaseLetterColor(draft.baseLetterColor)
    setAccentLetterColor(draft.accentLetterColor)
    setLetterCardColor(draft.letterCardColor)
    setCustomBrandColor(draft.customBrandColor ?? '')
    setCustomBrandColorTarget(draft.customBrandColorTarget ?? 'letters')
    setExtraLetterPackSelections(draft.extraLetterPackSelections)
    setCustomerName(draft.customerName)
    setCustomerEmail(draft.customerEmail)
    setCustomerPhone(draft.customerPhone)
    setSpaceType(draft.spaceType)
    setShippingMethod(draft.shippingMethod)
    setShippingAddress(draft.shippingAddress)
    setNotes(draft.notes)
    setDraftHydrated(true)
  }, [])

  const products = useMemo(() => {
    const inventoryBySlug = new Map((query.data?.productInventory ?? []).map(inventory => [inventory.productSlug, inventory]))
    return (query.data?.catalogProducts ?? []).map(product => readProductColors(product, inventoryBySlug))
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

  const selectedRailColorResult = resolveColorSlot({
    explicitColor: railColor,
    availableColors: railColors,
    defaultColor: findColor(railColors, ['preto', 'black']),
    label: 'Calhas',
  })
  const selectedBaseLetterColorResult = resolveColorSlot({
    explicitColor: baseLetterColor,
    availableColors: letterColors,
    defaultColor: findColor(letterColors, ['branco', 'white']),
    label: 'Letras base',
  })
  const selectedAccentLetterColorResult = resolveColorSlot({
    explicitColor: accentLetterColor,
    availableColors: letterColors,
    defaultColor: findColor(letterColors, ['dourado', 'gold', 'ouro']),
    label: 'Letras destaque',
  })
  const selectedLetterCardColorResult = resolveColorSlot({
    explicitColor: letterCardColor,
    availableColors: letterColors,
    defaultColor: findLightCardColor(letterColors),
    label: 'Fundo das letras',
  })

  const selectedRailColor = selectedRailColorResult.color
  const selectedBaseLetterColor = selectedBaseLetterColorResult.color
  const selectedAccentLetterColor = selectedAccentLetterColorResult.color ?? selectedBaseLetterColor
  const selectedLetterCardColor = selectedLetterCardColorResult.color
  const colorErrors = [
    selectedRailColorResult.error,
    selectedBaseLetterColorResult.error,
    selectedAccentLetterColorResult.error,
    selectedLetterCardColorResult.error,
  ].filter(Boolean)
  const activeCustomBrandColor = normalizeHexColor(customBrandColor)

  useEffect(() => {
    if (!draftHydrated) return
    const draft: MenuV1Draft = {
      version: 1,
      lines,
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
    }
    window.localStorage.setItem(MENU_V1_ACTIVE_DRAFT_KEY, JSON.stringify(draft))
  }, [
    activeCustomBrandColor,
    customBrandColorTarget,
    customerEmail,
    customerName,
    customerPhone,
    draftHydrated,
    extraLetterPackSelections,
    lines,
    notes,
    selectedAccentLetterColor,
    selectedBaseLetterColor,
    selectedLetterCardColor,
    selectedRailColor,
    shippingAddress,
    shippingMethod,
    spaceType,
  ])

  const validLines = useMemo(() => sanitizeV1Lines(lines), [lines])
  const syntheticWall = useMemo(() => buildSyntheticMenuWall(validLines), [validLines])
  const lineMetrics = useMemo(() => validLines.map(getV1LineMetrics), [validLines])
  const hasLongLine = lineMetrics.some(metric => metric.isLong)
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
      walls: [syntheticWall],
      extraLetterPackSelections,
      baseLetterColor: selectedBaseLetterColor ? stripMenuColor(selectedBaseLetterColor) : undefined,
      accentLetterColor: selectedAccentLetterColor ? stripMenuColor(selectedAccentLetterColor) : undefined,
      hasCustomBrandColor: Boolean(activeCustomBrandColor),
      railModuleUnitPrice,
      standardPackUnitPrice,
      avulsoUnitPrice,
    }),
    [activeCustomBrandColor, avulsoUnitPrice, extraLetterPackSelections, railModuleUnitPrice, selectedAccentLetterColor, selectedBaseLetterColor, standardPackUnitPrice, syntheticWall],
  )
  const totalCharactersWithExtras = bom.menuCharacters + countExtraPackCharacters(extraLetterPackSelections)
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
  const checkoutLane: CheckoutLane = bom.totalRailModules > 30 || totalCharactersWithExtras > MENU_V1_AUTOPAY_CHARACTER_LIMIT || Boolean(activeCustomBrandColor)
    ? 'manual_quote'
    : 'stripe_auto_pay'
  const checkoutDisabled = catalogLoading ||
    isSubmitting ||
    bom.hasOverflow ||
    colorErrors.length > 0 ||
    extraLetterColorErrors.length > 0 ||
    validLines.length === 0 ||
    !selectedRailColor ||
    !selectedBaseLetterColor ||
    !selectedAccentLetterColor ||
    !selectedLetterCardColor

  const updateLine = useCallback((lineId: string, field: 'label' | 'detail', value: string) => {
    setLines(current => current.map(line => line.id === lineId ? { ...line, [field]: value } : line))
  }, [])

  const addLine = useCallback(() => {
    setLines(current => [...current, createMenuV1Line(current.length, { label: '', detail: '' })])
  }, [])

  const removeLine = useCallback((lineId: string) => {
    setLines(current => current.filter(line => line.id !== lineId))
  }, [])

  const addExtraLetterPack = useCallback(() => {
    const defaultColor = selectedBaseLetterColor?.globalColorId
      ? selectedBaseLetterColor
      : letterColors.find(color => Boolean(color.globalColorId))
    const packColor = toExtraLetterPackColor(defaultColor)
    if (!packColor) {
      toast.error('Não há cores disponíveis para Letras Extra no inventário activo.')
      return
    }
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `extra-pack-${Date.now().toString(36)}`
    setExtraLetterPackSelections(current => [...current, { id, packId: 'numbers', color: packColor, quantity: 1 }])
  }, [letterColors, selectedBaseLetterColor])

  const updateExtraLetterPack = useCallback((id: string, patch: Partial<ExtraLetterPackSelection>) => {
    setExtraLetterPackSelections(current => current.map(selection => selection.id === id ? { ...selection, ...patch } : selection))
  }, [])

  const removeExtraLetterPack = useCallback((id: string) => {
    setExtraLetterPackSelections(current => current.filter(selection => selection.id !== id))
  }, [])

  async function submitCheckout(forceManualSubmit = false) {
    if (catalogLoading) {
      toast.info('A carregar cores e preços do inventário.')
      return
    }
    if (validLines.length === 0) {
      toast.error('Adicione pelo menos uma linha ao menu.')
      return
    }
    if (colorErrors.length || !selectedRailColor || !selectedBaseLetterColor || !selectedAccentLetterColor || !selectedLetterCardColor) {
      toast.error('Corrija as cores antes de finalizar.', {
        description: colorErrors[0] ?? 'Escolha cores disponíveis no inventário activo.',
      })
      return
    }
    if (bom.hasOverflow) {
      toast.error('Existe texto maior do que a calha física.')
      return
    }
    if (extraLetterColorErrors.length) {
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
    if (shippingMethod === 'mainland_portugal' && shippingAddress.trim().length < 8) {
      toast.error('Indique uma morada completa para envio.')
      return
    }

    setIsSubmitting(true)
    try {
      const railColorPayload = stripMenuColor(selectedRailColor)
      const baseLetterColorPayload = stripMenuColor(selectedBaseLetterColor)
      const accentLetterColorPayload = stripMenuColor(selectedAccentLetterColor)
      const letterCardColorPayload = stripMenuColor(selectedLetterCardColor)
      const menuSystem = buildV1MenuSystemPayload({
        lines: validLines,
        fontStyle: 'classic',
        railColor: railColorPayload,
        baseLetterColor: baseLetterColorPayload,
        accentLetterColor: accentLetterColorPayload,
        letterCardColor: letterCardColorPayload,
        extraLetterPackSelections,
        checkoutLane,
        customBrandColor: activeCustomBrandColor || undefined,
        customBrandColorTarget,
        totalRailModules: bom.totalRailModules,
        standardPackQuantity: bom.standardPackQuantity,
        avulsoCharacterQuantity: bom.avulsoCharacterQuantity,
        characterFrequencyMap: bom.characterFrequencyMap,
        characterFrequencyByColor: bom.characterFrequencyByColor,
      })

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
          menuSystem,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível iniciar o checkout.')
      if (payload?.checkoutUrl || payload?.url) window.location.href = payload.checkoutUrl ?? payload.url
      if (payload?.redirectTo) {
        window.localStorage.removeItem(MENU_V1_ACTIVE_DRAFT_KEY)
        window.location.href = payload.redirectTo
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível iniciar o checkout.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-dvh bg-[#f8f7f3] text-[#171717]">
      <Header />
      <section className="px-4 pb-36 pt-6 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto grid max-w-[1500px] gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Link href="/colecoes/menus" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft className="size-4" />
                  Templates
                </Link>
                <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Calculadora de Menu Modular</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Escreva cada linha do menu. O nome usa a cor base; o detalhe/preço usa a cor de destaque.
                </p>
              </div>
              <div className="rounded-lg border border-black/10 bg-white px-4 py-3 text-sm">
                <p className="font-black">{bom.totalRailModules} calhas · {bom.totalCharacters} caracteres</p>
                <p className="text-xs text-muted-foreground">{checkoutLane === 'manual_quote' ? 'Revisão manual' : 'Stripe automático'}</p>
              </div>
            </div>

            {(hasLongLine || totalCharactersWithExtras > MENU_V1_AUTOPAY_CHARACTER_LIMIT) && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p className="flex items-start gap-2 font-semibold">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {totalCharactersWithExtras > MENU_V1_AUTOPAY_CHARACTER_LIMIT
                    ? 'Este pedido tem mais de 500 caracteres e será revisto manualmente antes de pagamento.'
                    : 'Uma das linhas precisa de mais de 10 calhas; pode ficar difícil de ler ou instalar.'}
                </p>
              </div>
            )}

            <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(96px,180px)_40px] gap-3 border-b border-border px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-muted-foreground max-sm:hidden">
                <span>Nome/Produto</span>
                <span>Detalhe/Preço</span>
                <span />
              </div>
              <div className="divide-y divide-border">
                {lines.map((line) => {
                  const previewMetric = getV1LineMetrics({
                    id: line.id,
                    label: line.label,
                    detail: line.detail,
                  })
                  return (
                    <div key={line.id} className="px-4 py-4">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(120px,190px)_40px] sm:items-start">
                        <input
                          value={line.label}
                          onChange={event => updateLine(line.id, 'label', event.target.value)}
                          placeholder="Nome/Produto"
                          className="h-11 min-w-0 rounded-md border border-transparent bg-stone-50 px-3 text-sm font-semibold outline-none transition placeholder:font-normal focus:border-stone-300 focus:bg-white"
                        />
                        <input
                          value={line.detail}
                          onChange={event => updateLine(line.id, 'detail', event.target.value)}
                          placeholder="Detalhe/Preço"
                          className="h-11 min-w-0 rounded-md border border-transparent bg-stone-50 px-3 text-sm font-semibold text-[#7b5a2b] outline-none transition placeholder:font-normal focus:border-stone-300 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="flex size-10 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-red-50 hover:text-red-700"
                          aria-label="Remover linha"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Comprimento: {previewMetric.widthCm}cm | Usa {previewMetric.railModules} Calha{previewMetric.railModules === 1 ? '' : 's'} (25cm)
                      </p>
                    </div>
                  )
                })}
              </div>
              <div className="sticky bottom-0 border-t border-border bg-white/92 px-4 py-3 backdrop-blur">
                <Button type="button" variant="outline" onClick={addLine} className="h-11 w-full cursor-pointer border-dashed">
                  <Plus className="size-4" />
                  Adicionar Linha
                </Button>
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-lg border border-border bg-white p-5 text-stone-950">
              <h2 className="text-base font-black">Cores globais</h2>
              <div className="mt-5 grid gap-5">
                <SwatchPicker label="Cor das calhas" colors={railColors} selected={selectedRailColor} onSelect={setRailColor} />
                <SwatchPicker label="Nome/Produto" colors={letterColors} selected={selectedBaseLetterColor} onSelect={setBaseLetterColor} />
                <SwatchPicker label="Detalhe/Preço" colors={letterColors} selected={selectedAccentLetterColor} onSelect={setAccentLetterColor} />
                <SwatchPicker label="Fundo das letras" colors={letterColors} selected={selectedLetterCardColor} onSelect={setLetterCardColor} />
              </div>
              <div className="mt-5 border-t border-border pt-5">
                <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Cor personalizada opcional
                  <input
                    value={customBrandColor}
                    onChange={event => setCustomBrandColor(event.target.value)}
                    placeholder="#d4af37"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground"
                  />
                </label>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {(['letters', 'rails'] as const).map(target => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => setCustomBrandColorTarget(target)}
                      className={`h-10 cursor-pointer rounded-md border text-sm font-semibold transition ${customBrandColorTarget === target ? 'border-stone-950 bg-stone-950 text-white' : 'border-border bg-background text-foreground'}`}
                    >
                      {target === 'letters' ? 'Letras' : 'Calhas'}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <ExtraLettersSection
              selections={extraLetterPackSelections}
              colors={letterColors}
              onAdd={addExtraLetterPack}
              onRemove={removeExtraLetterPack}
              onUpdate={updateExtraLetterPack}
            />

            <section className="rounded-lg border border-border bg-white p-5 text-stone-950">
              <h2 className="text-base font-black">Dados do pedido</h2>
              <div className="mt-4 grid gap-3">
                <input className="h-11 rounded-md border border-input px-3 text-sm" placeholder="Nome" value={customerName} onChange={event => setCustomerName(event.target.value)} />
                <input className="h-11 rounded-md border border-input px-3 text-sm" placeholder="Email" value={customerEmail} onChange={event => setCustomerEmail(event.target.value)} />
                <input className="h-11 rounded-md border border-input px-3 text-sm" placeholder="Telefone" value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} />
                <select value={shippingMethod} onChange={event => setShippingMethod(event.target.value as typeof shippingMethod)} className="h-11 rounded-md border border-input px-3 text-sm">
                  <option value="pickup_carcavelos">Levantamento em Carcavelos</option>
                  <option value="mainland_portugal">Envio Portugal continental</option>
                </select>
                {shippingMethod === 'mainland_portugal' && (
                  <textarea className="min-h-20 rounded-md border border-input px-3 py-2 text-sm" placeholder="Morada completa" value={shippingAddress} onChange={event => setShippingAddress(event.target.value)} />
                )}
                <textarea className="min-h-20 rounded-md border border-input px-3 py-2 text-sm" placeholder="Notas" value={notes} onChange={event => setNotes(event.target.value)} />
              </div>
            </section>
          </aside>
        </div>
      </section>

      <div className="sticky bottom-0 z-30 border-t border-stone-200 bg-white/90 px-4 py-3 text-stone-950 backdrop-blur-xl sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1500px] gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <BomSummary bom={bom} shippingCost={shippingCost} checkoutLane={checkoutLane} />
          <Button
            type="button"
            onClick={() => setReviewOpen(true)}
            disabled={catalogLoading}
            className="h-14 cursor-pointer rounded-md bg-[#09090b] px-7 text-white hover:bg-[#26262c]"
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
