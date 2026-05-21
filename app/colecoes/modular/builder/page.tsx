'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion'
import type { InstaQLEntity } from '@instantdb/react'
import {
  ArrowRight,
  Check,
  CreditCard,
  Edit3,
  Layers,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { db } from '@/lib/db'
import type { AppSchema } from '@/instant.schema'
import {
  CHARS_PER_MODULE_ESTIMATE,
  CHARACTER_WIDTH_MM,
  FALLBACK_CHARACTER_WIDTH_MM,
  MAX_GLOBAL_MODULES,
  MENU_CUSTOM_ICON_MAX_CHARS,
  MENU_EXTRA_MAX_CHARS,
  MENU_LETTER_COLOR_REQUEST_MAX_CHARS,
  MENU_MAX_LINES,
  MENU_TEXT_MAX_CHARS,
  MIN_GLOBAL_MODULES,
  MODULE_LENGTH_CM,
  STANDARD_PACK_SIZE,
  buildMenuTextFromRows,
  calculateCharacters,
  calculateMenuQuote,
  validateMenuQuoteLimits,
  type MenuRowInput,
} from '@/lib/menu-calculator'
import type { ProductColor } from '@/lib/products'

const MENU_RAIL_SLUG = 'menu-rail-25cm'
const MENU_PACK_SLUG = 'menu-letter-pack-standard'
const MENU_AVULSO_SLUG = 'menu-letter-custom'
const SHIPPING_COST = 4.99
// TODO: V1.1 may add custom SVG/icon upload after storage, SVG validation, pricing, and admin preview are ready.

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

type EditableMenuLine = {
  id: string
  label: string
  detail: string
  useAccent: boolean
}

type MenuTemplate = {
  id: string
  name: string
  audience: string
  description: string
  globalModuleCount: number
  extraLettersText: string
  lines: EditableMenuLine[]
}

type BackgroundPreset = {
  id: string
  label: string
  image?: string
  gradient: string
}

type BuilderDraft = {
  version: 1
  currentStep: string
  selectedIntentId: string
  rows: EditableMenuLine[]
  globalModuleCount: number
  customWallHex: string
  railColor?: ProductColor
  baseLetterColor?: ProductColor
  accentLetterColor?: ProductColor
  letterCardColor?: ProductColor
  specialLetterColorRequestEnabled: boolean
  specialLetterColorRequest: string
  customIconRequest: string
  extraLettersText: string
  standardPackQuantity: number
  avulsoCharacterQuantity: number
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingMethod: 'pickup_carcavelos' | 'mainland_portugal'
  shippingAddress: string
  notes: string
}

const BUILDER_STORAGE_KEY = 'em3d-modular-builder-v1'
const builderSteps = [
  { id: 'intent', label: 'Intenção' },
  { id: 'content', label: 'Conteúdo' },
  { id: 'style', label: 'Largura e cores' },
  { id: 'review', label: 'Resumo' },
  { id: 'checkout', label: 'Checkout' },
]

const backgroundPresets: BackgroundPreset[] = [
  {
    id: 'studio',
    label: 'Studio',
    image: '/about/workshop.jpg',
    gradient: 'linear-gradient(135deg,#d8d1c3,#b8aa94)',
  },
  {
    id: 'retail',
    label: 'Loja',
    image: '/about/products.jpg',
    gradient: 'linear-gradient(135deg,#d6d0c4,#a9a08f)',
  },
  {
    id: 'workshop',
    label: 'Oficina',
    image: '/about/printer.jpg',
    gradient: 'linear-gradient(135deg,#d9d2c6,#b5a78d)',
  },
  {
    id: 'quiet',
    label: 'Neutro',
    gradient: 'radial-gradient(circle at 22% 14%,rgba(255,255,255,0.8),transparent 28%),linear-gradient(135deg,#e6dfd2,#b9aa91)',
  },
]

let lineIdCounter = 0

const menuTemplates: MenuTemplate[] = [
  {
    id: 'cafe-classico',
    name: 'Café clássico',
    audience: 'cafés e brunch',
    description: 'Bebidas principais e leitura rápida ao balcão.',
    globalModuleCount: 4,
    extraLettersText: '€ descafeinado Wi-Fi',
    lines: [
      createLine('Espresso', '1,20€', true),
      createLine('Americano', '1,80€', true),
      createLine('Flat White', '3,00€', true),
      createLine('Cappuccino', '2,80€', true),
      createLine('Chai Latte', '3,50€', true),
    ],
  },
  {
    id: 'pastelaria',
    name: 'Pastelaria',
    audience: 'pastelarias',
    description: 'Vitrine, pequeno-almoço e combos.',
    globalModuleCount: 5,
    extraLettersText: '€ unidade dose',
    lines: [
      createLine('Pastel de nata', '1,40€', true),
      createLine('Croissant brioche', '2,20€', true),
      createLine('Tosta mista', '3,90€', true),
      createLine('Sumo natural', '3,20€', true),
      createLine('Menu pequeno-almoço', '6,50€', true),
    ],
  },
  {
    id: 'barbearia-studio',
    name: 'Barbearia/Studio',
    audience: 'studios e beleza',
    description: 'Serviços com acabamento sóbrio.',
    globalModuleCount: 6,
    extraLettersText: '€ desde membro',
    lines: [
      createLine('Corte masculino', '18€', true),
      createLine('Barba', '12€', true),
      createLine('Corte + barba', '26€', true),
      createLine('Coloração', 'desde 35€', true),
      createLine('Consulta privada', 'sob marcação', true),
    ],
  },
  {
    id: 'retail',
    name: 'Retail price list',
    audience: 'lojas e pop-ups',
    description: 'Produtos, packs e campanhas interiores.',
    globalModuleCount: 5,
    extraLettersText: '€ novo pack',
    lines: [
      createLine('Produto assinatura', '24€', true),
      createLine('Pack oferta', '39€', true),
      createLine('Edição limitada', 'sob consulta', true),
      createLine('Personalização', '+8€', true),
    ],
  },
  {
    id: 'servicos',
    name: 'Serviços',
    audience: 'clínicas e oficinas',
    description: 'Valores base, tempos e opções.',
    globalModuleCount: 7,
    extraLettersText: '€ consulta urgente',
    lines: [
      createLine('Avaliação inicial', '25€', true),
      createLine('Plano mensal', 'desde 49€', true),
      createLine('Sessão individual', '35€', true),
      createLine('Serviço expresso', '+15€', true),
    ],
  },
  {
    id: 'promocao',
    name: 'Promoção curta',
    audience: 'campanhas',
    description: 'Poucas linhas, grande impacto.',
    globalModuleCount: 4,
    extraLettersText: '% € novo hoje',
    lines: [
      createLine('Novo menu de almoço', '9,90€', true),
      createLine('Café + nata', '2,40€', true),
      createLine('Só esta semana', '-15%', true),
    ],
  },
]

const assemblyVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.18,
      staggerChildren: 0.1,
    },
  },
}

const wallVariants: Variants = {
  hidden: { opacity: 0, scale: 0.985 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const guideVariants: Variants = {
  hidden: { opacity: 0, scaleX: 0 },
  visible: { opacity: 1, scaleX: 1, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
}

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -12, scale: 0.98, transition: { duration: 0.18 } },
}

const segmentVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
}

const tileContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.02,
    },
  },
}

const characterTileVariants: Variants = {
  hidden: { opacity: 0, y: -16, rotateX: 18, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
}

const MAX_ANIMATED_TILES_PER_ROW = 90
const MAX_RENDERED_TILES_PER_ROW = 140
const MAX_ANIMATED_TILES_TOTAL = 360

function createLine(label: string, detail = '', useAccent = false): EditableMenuLine {
  lineIdCounter += 1
  return {
    id: `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${lineIdCounter}`,
    label,
    detail,
    useAccent,
  }
}

function cloneTemplateLines(template: MenuTemplate) {
  return template.lines.map(line => createLine(line.label, line.detail, line.useAccent))
}

function formatPrice(value: number) {
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

function stripMenuColor(color: ProductColor): MenuColorPayload {
  return {
    name: color.name,
    hex: color.hex,
    globalColorId: color.globalColorId,
    priceAdd: color.priceAdd ?? 0,
  }
}

function hasUnsupportedControlCharacters(value: string) {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(value)
}

function validateLetterColorRequest(enabled: boolean, description: string) {
  if (!enabled) return ''
  const trimmed = description.trim()
  if (!trimmed) return ''
  if (calculateCharacters(trimmed) > MENU_LETTER_COLOR_REQUEST_MAX_CHARS) {
    return `O pedido de cor pode ter no máximo ${MENU_LETTER_COLOR_REQUEST_MAX_CHARS} caracteres.`
  }
  if (hasUnsupportedControlCharacters(description)) {
    return 'O pedido de cor contém caracteres não suportados.'
  }
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(trimmed) || /(?:\+?\d[\s().-]*){7,}/.test(trimmed)) {
    return 'Descreva apenas a cor pretendida, sem contactos pessoais.'
  }
  return ''
}

function getConfigSectionForStep(stepId: string) {
  if (stepId === 'intent') return 'system'
  if (stepId === 'content') return 'menu'
  if (stepId === 'style') return 'colors'
  if (stepId === 'checkout') return 'checkout'
  return 'review'
}

function getStepForConfigSection(sectionId: string) {
  if (sectionId === 'system') return 'intent'
  if (sectionId === 'menu') return 'content'
  if (sectionId === 'colors') return 'style'
  if (sectionId === 'checkout') return 'checkout'
  return 'review'
}

function findColor(colors: ProductColor[], names: string[]) {
  return colors.find(color => names.some(name => color.name.toLowerCase().includes(name))) ?? colors[0]
}

function findLightCardColor(colors: ProductColor[]) {
  return colors.find(color => ['branco', 'white', 'natural', 'marfim', 'cream'].some(name => color.name.toLowerCase().includes(name)))
    ?? colors.find(color => getRelativeLuminance(color.hex) > 0.72)
    ?? colors[0]
}

function getProductPrice(product: CatalogProduct | undefined) {
  return product?.salePrice ?? product?.priceFrom ?? 0
}

function clampModuleCount(value: number) {
  if (!Number.isFinite(value)) return MIN_GLOBAL_MODULES
  return Math.min(MAX_GLOBAL_MODULES, Math.max(MIN_GLOBAL_MODULES, Math.trunc(value)))
}

function parseRawMenuText(value: string): EditableMenuLine[] {
  return value
    .split(/\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, MENU_MAX_LINES)
    .map(line => {
      const cleaned = line.replace(/\s*\.{2,}\s*/g, ' ')
      const match = cleaned.match(/^(.*?)(\d+(?:[,.]\d{1,2})?\s*€?|desde\s+\d+(?:[,.]\d{1,2})?\s*€?|sob\s+consulta|sob\s+marcação|sob\s+marcacao|\-\d+%|\+\d+(?:[,.]\d{1,2})?\s*€?)$/i)
      if (!match) return createLine(cleaned)

      return createLine(match[1].replace(/[-:]+$/g, '').replace(/\s+/g, ' ').trim(), match[2].replace('.', ',').replace(/\s*€$/, '€').trim(), true)
    })
}

function parseAssistantSegment(segment: string) {
  const cleaned = segment.trim().replace(/\s*\.{2,}\s*/g, ' ')
  if (!cleaned) return null
  const match = cleaned.match(/^(.*?)(\d+(?:[,.]\d{1,2})?\s*€?|desde\s+\d+(?:[,.]\d{1,2})?\s*€?|sob\s+consulta|sob\s+marcação|sob\s+marcacao|\-\d+%|\+\d+(?:[,.]\d{1,2})?\s*€?)$/i)
  if (!match) return createLine(cleaned, '', false)

  return createLine(match[1].replace(/[-:]+$/g, '').replace(/\s+/g, ' ').trim(), match[2].replace('.', ',').replace(/\s*€?$/, '€'), true)
}

function formatAssistantMenu(value: string) {
  const fallback = 'Espresso 1,50\nFlat White 3,00\nPastel de nata 1,40'
  const source = value.trim() || fallback
  return source
    .split(/\n|,(?!\d)/)
    .map(parseAssistantSegment)
    .filter((line): line is EditableMenuLine => Boolean(line))
    .slice(0, MENU_MAX_LINES)
}

function toCalculatorRows(lines: EditableMenuLine[]): MenuRowInput[] {
  return lines.map(line => ({
    id: line.id,
    label: line.label,
    detail: line.detail,
    useAccent: line.useAccent,
  }))
}

function isBlankEditableRow(line: EditableMenuLine) {
  return buildMenuTextFromRows([{ label: line.label, detail: line.detail, useAccent: line.useAccent }]).length === 0
}

function buildLineDisplayText(line: EditableMenuLine) {
  return [line.label, line.detail]
    .map(part => part.trim())
    .filter(Boolean)
    .join(' ')
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeDraftRows(value: unknown): EditableMenuLine[] | null {
  if (!Array.isArray(value)) return null
  const rows = value
    .map((row, index) => {
      if (!isObject(row)) return null
      const label = String(row.label ?? '').slice(0, 160)
      const detail = String(row.detail ?? '').slice(0, 160)
      if (!label.trim() && !detail.trim()) return null
      return {
        id: String(row.id ?? `draft-${index}`),
        label,
        detail,
        useAccent: Boolean(row.useAccent),
      }
    })
    .filter((row): row is EditableMenuLine => Boolean(row))

  return rows.length ? rows.slice(0, MENU_MAX_LINES) : null
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

function readBuilderDraft(): BuilderDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(BUILDER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isObject(parsed) || parsed.version !== 1) return null
    const rows = normalizeDraftRows(parsed.rows)
    if (!rows) return null
    const currentStep = builderSteps.some(step => step.id === parsed.currentStep) ? String(parsed.currentStep) : 'intent'
    const shippingMethod = parsed.shippingMethod === 'mainland_portugal' ? 'mainland_portugal' : 'pickup_carcavelos'

    return {
      version: 1,
      currentStep,
      selectedIntentId: String(parsed.selectedIntentId ?? menuTemplates[0].id),
      rows,
      globalModuleCount: clampModuleCount(Number(parsed.globalModuleCount)),
      customWallHex: normalizeHexColor(String(parsed.customWallHex ?? '')),
      railColor: normalizeDraftColor(parsed.railColor),
      baseLetterColor: normalizeDraftColor(parsed.baseLetterColor),
      accentLetterColor: normalizeDraftColor(parsed.accentLetterColor),
      letterCardColor: normalizeDraftColor(parsed.letterCardColor),
      specialLetterColorRequestEnabled: Boolean(parsed.specialLetterColorRequestEnabled),
      specialLetterColorRequest: String(parsed.specialLetterColorRequest ?? '').slice(0, MENU_LETTER_COLOR_REQUEST_MAX_CHARS + 50),
      customIconRequest: String(parsed.customIconRequest ?? '').slice(0, MENU_CUSTOM_ICON_MAX_CHARS + 50),
      extraLettersText: String(parsed.extraLettersText ?? '').slice(0, MENU_EXTRA_MAX_CHARS + 50),
      standardPackQuantity: Math.max(0, Math.trunc(Number(parsed.standardPackQuantity) || 0)),
      avulsoCharacterQuantity: Math.max(0, Math.trunc(Number(parsed.avulsoCharacterQuantity) || 0)),
      customerName: String(parsed.customerName ?? ''),
      customerEmail: String(parsed.customerEmail ?? ''),
      customerPhone: String(parsed.customerPhone ?? ''),
      shippingMethod,
      shippingAddress: String(parsed.shippingAddress ?? ''),
      notes: String(parsed.notes ?? ''),
    }
  } catch {
    return null
  }
}

function getCharacterTileWidth(character: string) {
  return Math.max(0.36, (CHARACTER_WIDTH_MM[character] ?? FALLBACK_CHARACTER_WIDTH_MM) / 42)
}

function getTileLabel(character: string, index: number, length: number) {
  if (index === length - 1 && character === '…') return '…'
  return character
}

function normalizeHexColor(value: string | undefined) {
  const trimmed = String(value ?? '').trim()
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash : ''
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

function getContrastRatio(firstHex: string, secondHex: string) {
  const first = getRelativeLuminance(firstHex)
  const second = getRelativeLuminance(secondHex)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

function hasLowColorContrast(colors: string[], backingHex: string) {
  return colors.some(color => getContrastRatio(color, backingHex) < 3)
}

function capPreviewCharacters(value: string, fallback: string, max: number, colorHex: string) {
  const characters = Array.from(value || fallback)
  const capped = characters.length > max ? [...characters.slice(0, Math.max(0, max - 1)), '…'] : characters
  return capped.map(character => ({ character, hex: colorHex }))
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
              title={`${color.name}${(color.priceAdd ?? 0) > 0 ? ` +${formatPrice(color.priceAdd ?? 0)}` : ''}`}
              aria-label={`${label}: ${color.name}`}
              className={`flex size-9 items-center justify-center rounded-full border transition ${
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
}

function PhysicalRailPreview({
  line,
  globalModuleCount,
  railHex,
  baseLetterHex,
  accentLetterHex,
  letterCardHex,
  animateTiles,
  reducedMotion,
}: {
  line: EditableMenuLine
  globalModuleCount: number
  railHex: string
  baseLetterHex: string
  accentLetterHex: string
  letterCardHex: string
  animateTiles: boolean
  reducedMotion: boolean
}) {
  const detailColor = line.useAccent ? accentLetterHex : baseLetterHex
  const hasDetail = Boolean(line.detail.trim())
  const labelMaxCharacters = hasDetail ? Math.floor(MAX_RENDERED_TILES_PER_ROW * 0.58) : MAX_RENDERED_TILES_PER_ROW
  const detailMaxCharacters = MAX_RENDERED_TILES_PER_ROW - labelMaxCharacters
  const labelCharacters = capPreviewCharacters(line.label, 'Linha vazia', labelMaxCharacters, baseLetterHex)
  const detailCharacters = hasDetail
    ? capPreviewCharacters(line.detail, '', Math.max(1, detailMaxCharacters), detailColor)
    : []

  function LetterTiles({
    characters,
    align = 'left',
  }: {
    characters: { character: string; hex: string }[]
    align?: 'left' | 'right'
  }) {
    return (
      <motion.div
        className={`flex min-w-0 flex-wrap items-end gap-0 ${align === 'right' ? 'justify-end' : 'justify-start'}`}
        variants={animateTiles && !reducedMotion ? tileContainerVariants : undefined}
        initial={animateTiles && !reducedMotion ? 'hidden' : false}
        animate="visible"
        layout
      >
        {characters.map((tile, index) => {
          const character = tile.character
          const isSpace = character === ' '
          const width = getCharacterTileWidth(character)

          return (
            <motion.span
              key={`${character}-${index}`}
              layout
              variants={animateTiles && !reducedMotion ? characterTileVariants : undefined}
              className="relative inline-flex h-8 items-center justify-center rounded-[0.18rem] text-sm font-black leading-none shadow-[0_1px_1px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.72)] sm:h-9 sm:text-base"
              style={{
                width: `${width}rem`,
                color: isSpace ? 'transparent' : tile.hex,
                background: isSpace ? 'transparent' : letterCardHex,
                boxShadow: isSpace
                  ? 'none'
                  : '0 1px 1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.72)',
              }}
            >
              {!isSpace && (
                <>
                  <span className="absolute inset-x-1 top-1 h-px rounded-full bg-white/70" />
                  <span className="relative">
                    {getTileLabel(character, index, characters.length)}
                  </span>
                </>
              )}
            </motion.span>
          )
        })}
      </motion.div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-lg border border-white/16 bg-white/8 px-4 pb-4 pt-5 shadow-[0_18px_42px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]"
    >
      <div className="relative min-h-[72px] pb-5">
        <div className={`relative z-10 grid min-h-[44px] items-end gap-4 ${hasDetail ? 'grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)]' : 'grid-cols-1'}`}>
          <LetterTiles characters={labelCharacters} />
          {hasDetail ? <LetterTiles characters={detailCharacters} align="right" /> : <span aria-hidden="true" />}
        </div>

        <div className="absolute inset-x-0 bottom-2 h-[9px] rounded-b-md shadow-[0_5px_9px_rgba(0,0,0,0.18)]" style={{ background: railHex }}>
          <div className="absolute inset-x-0 top-0 h-px bg-white/24" />
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/22" />
          <div className="absolute inset-0 flex">
            {Array.from({ length: globalModuleCount }).map((_, moduleIndex) => (
              <motion.span
                key={moduleIndex}
                variants={segmentVariants}
                className="relative flex-1 border-r border-white/18 last:border-r-0"
              >
                <span className="absolute inset-y-1 left-0 w-px bg-black/18" />
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MenuBoardRow({
  line,
  index,
  quoteLine,
  globalModuleCount,
  railColor,
  baseLetterColor,
  accentLetterColor,
  letterCardColor,
  editing,
  onPatch,
  reducedMotion,
  animateTiles,
}: {
  line: EditableMenuLine
  index: number
  quoteLine?: { widthWarning?: boolean; characterCount?: number }
  globalModuleCount: number
  railColor?: ProductColor
  baseLetterColor?: ProductColor
  accentLetterColor?: ProductColor
  letterCardColor?: ProductColor
  editing: boolean
  onPatch: (patch: Partial<EditableMenuLine>) => void
  reducedMotion: boolean
  animateTiles: boolean
}) {
  const railHex = railColor?.hex ?? '#111111'
  const baseLetterHex = baseLetterColor?.hex ?? '#f8f4e9'
  const accentLetterHex = accentLetterColor?.hex ?? '#d7b06f'
  const letterCardHex = letterCardColor?.hex ?? '#f7f2e8'
  const lineText = buildLineDisplayText(line)

  return (
    <motion.div
      layout
      variants={rowVariants}
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      exit="exit"
      className="rounded-xl border border-white/10 bg-black/12 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    >
      <div className={editing ? 'grid gap-2 md:grid-cols-[minmax(0,1fr)_180px] md:items-end' : 'sr-only'}>
        {editing ? (
          <>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
              <Input
                value={line.label}
                onChange={event => onPatch({ label: event.target.value })}
                className="h-10 border-white/10 bg-white/10 text-white placeholder:text-white/35"
                placeholder="Texto principal"
                aria-label={`Texto principal da linha ${index + 1}`}
              />
              <Input
                value={line.detail}
                onChange={event => onPatch({ detail: event.target.value })}
                className="h-10 border-white/10 bg-white/10 text-white placeholder:text-white/35"
                placeholder="Detalhe"
                aria-label={`Detalhe da linha ${index + 1}`}
              />
            </div>
            <label className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/10 px-3 text-sm text-white">
              <input
                type="checkbox"
                checked={line.useAccent}
                onChange={event => onPatch({ useAccent: event.target.checked })}
              />
              Detalhe em destaque
            </label>
          </>
        ) : (
          <span>{lineText || 'Linha vazia'}</span>
        )}
      </div>

      <div className={editing ? 'mt-3' : ''}>
      <PhysicalRailPreview
        line={line}
        globalModuleCount={globalModuleCount}
        railHex={railHex}
        baseLetterHex={baseLetterHex}
        accentLetterHex={accentLetterHex}
        letterCardHex={letterCardHex}
        animateTiles={animateTiles && lineText.length <= MAX_ANIMATED_TILES_PER_ROW}
        reducedMotion={reducedMotion}
      />
      </div>

      {quoteLine?.widthWarning && (
        <p className="mt-2 text-xs font-medium text-amber-200">
          Esta linha pode ficar apertada para a largura escolhida.
        </p>
      )}
    </motion.div>
  )
}

export default function ModularMenusPage() {
  const initialTemplate = menuTemplates[0]
  const prefersReducedMotion = useReducedMotion()
  const reducedMotion = Boolean(prefersReducedMotion)
  const [draftHydrated, setDraftHydrated] = useState(false)
  const [currentStep, setCurrentStep] = useState('intent')
  const [activeTemplateId, setActiveTemplateId] = useState(initialTemplate.id)
  const [globalModuleCount, setGlobalModuleCount] = useState(initialTemplate.globalModuleCount)
  const [savedRows, setSavedRows] = useState<EditableMenuLine[]>(() => cloneTemplateLines(initialTemplate))
  const [draftRows, setDraftRows] = useState<EditableMenuLine[] | null>(null)
  const [extraLettersText, setExtraLettersText] = useState(initialTemplate.extraLettersText)
  const [customIconRequest, setCustomIconRequest] = useState('')
  const [letterColorRequestEnabled, setLetterColorRequestEnabled] = useState(false)
  const [letterColorRequestDescription, setLetterColorRequestDescription] = useState('')
  const [standardPackQuantity, setStandardPackQuantity] = useState(0)
  const [avulsoCharacterQuantity, setAvulsoCharacterQuantity] = useState(0)
  const [backgroundPresetId, setBackgroundPresetId] = useState(backgroundPresets[0].id)
  const [customWallHex, setCustomWallHex] = useState('')
  const [rowsAreDirty, setRowsAreDirty] = useState(false)
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null)
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(true)
  const [openConfigSection, setOpenConfigSection] = useState('system')
  const accordionSectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [shippingMethod, setShippingMethod] = useState<'pickup_carcavelos' | 'mainland_portugal'>('pickup_carcavelos')
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [railColor, setRailColor] = useState<ProductColor | undefined>()
  const [baseLetterColor, setBaseLetterColor] = useState<ProductColor | undefined>()
  const [accentLetterColor, setAccentLetterColor] = useState<ProductColor | undefined>()
  const [letterCardColor, setLetterCardColor] = useState<ProductColor | undefined>()
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

  const products = useMemo(
    () => query.data?.catalogProducts ?? [],
    [query.data?.catalogProducts],
  )
  const activeGlobalColors = useMemo(
    () => (query.data?.globalColors ?? [])
      .filter(color => color.isActive !== false && color.spoolStatus !== 'archived'),
    [query.data?.globalColors],
  )
  const railProduct = products.find(product => product.slug === MENU_RAIL_SLUG)
  const packProduct = products.find(product => product.slug === MENU_PACK_SLUG)
  const avulsoProduct = products.find(product => product.slug === MENU_AVULSO_SLUG)
  const selectedBackground = backgroundPresets.find(background => background.id === backgroundPresetId) ?? backgroundPresets[0]
  const previewWallHex = normalizeHexColor(customWallHex)
  const editing = draftRows !== null
  const visibleRows = draftRows ?? savedRows
  const catalogReady = Boolean(railProduct && packProduct && avulsoProduct)
  const railColors = useMemo(
    () => getProductOfferedColors(railProduct, activeGlobalColors),
    [activeGlobalColors, railProduct],
  )
  const packColors = useMemo(
    () => getProductOfferedColors(packProduct, activeGlobalColors),
    [activeGlobalColors, packProduct],
  )
  const avulsoColors = useMemo(
    () => getProductOfferedColors(avulsoProduct, activeGlobalColors),
    [activeGlobalColors, avulsoProduct],
  )
  const baseMinimumQuote = useMemo(
    () => calculateMenuQuote({
      rows: toCalculatorRows(visibleRows),
      extraLettersText,
      customIconRequest,
      globalModuleCount,
    }),
    [customIconRequest, extraLettersText, globalModuleCount, visibleRows],
  )
  const effectiveStandardPacks = Math.max(standardPackQuantity, baseMinimumQuote.standardPackMinimum)
  const effectiveAvulsoCharacters = Math.max(avulsoCharacterQuantity, baseMinimumQuote.avulsoMinimum)
  const letterColors = useMemo(() => {
    const requiredSets = [
      effectiveStandardPacks > 0 ? packColors : null,
      effectiveAvulsoCharacters > 0 ? avulsoColors : null,
    ].filter((set): set is ProductColor[] => Boolean(set))

    if (requiredSets.length > 0) return intersectColorSets(requiredSets)
    return uniqueColors([...packColors, ...avulsoColors])
  }, [avulsoColors, effectiveAvulsoCharacters, effectiveStandardPacks, packColors])
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
  const railModuleUnitPrice = getProductPrice(railProduct) + (selectedRailColor?.priceAdd ?? 0)
  const letterColorPriceAdd = Math.max(
    selectedBaseLetterColor?.priceAdd ?? 0,
    selectedAccentLetterColor?.priceAdd ?? 0,
    selectedLetterCardColor?.priceAdd ?? 0,
  )
  const standardPackUnitPrice = getProductPrice(packProduct) + letterColorPriceAdd
  const avulsoUnitPrice = getProductPrice(avulsoProduct) + letterColorPriceAdd
  const activeTextColorHexes = [
    selectedBaseLetterColor?.hex,
    visibleRows.some(line => line.useAccent) ? selectedAccentLetterColor?.hex : undefined,
  ].filter((hex): hex is string => Boolean(hex))
  const showLetterCardContrastHint = Boolean(
    selectedLetterCardColor?.hex &&
    activeTextColorHexes.length > 0 &&
    hasLowColorContrast(activeTextColorHexes, selectedLetterCardColor.hex),
  )

  const displayQuote = useMemo(
    () => calculateMenuQuote({
      rows: toCalculatorRows(visibleRows),
      extraLettersText,
      customIconRequest,
      globalModuleCount,
      standardPackQuantity: effectiveStandardPacks,
      avulsoCharacterQuantity: effectiveAvulsoCharacters,
      railModuleUnitPrice,
      standardPackUnitPrice,
      avulsoUnitPrice,
      baseLetterColor: selectedBaseLetterColor ? stripMenuColor(selectedBaseLetterColor) : undefined,
      accentLetterColor: selectedAccentLetterColor ? stripMenuColor(selectedAccentLetterColor) : undefined,
    }),
    [avulsoUnitPrice, customIconRequest, effectiveAvulsoCharacters, effectiveStandardPacks, extraLettersText, globalModuleCount, railModuleUnitPrice, selectedAccentLetterColor, selectedBaseLetterColor, standardPackUnitPrice, visibleRows],
  )
  const savedQuote = useMemo(
    () => calculateMenuQuote({
      rows: toCalculatorRows(savedRows),
      extraLettersText,
      customIconRequest,
      globalModuleCount,
      standardPackQuantity: Math.max(standardPackQuantity, calculateMenuQuote({ rows: toCalculatorRows(savedRows), extraLettersText, customIconRequest, globalModuleCount }).standardPackMinimum),
      avulsoCharacterQuantity: Math.max(avulsoCharacterQuantity, calculateMenuQuote({ rows: toCalculatorRows(savedRows), extraLettersText, customIconRequest, globalModuleCount }).avulsoMinimum),
      railModuleUnitPrice,
      standardPackUnitPrice,
      avulsoUnitPrice,
      baseLetterColor: selectedBaseLetterColor ? stripMenuColor(selectedBaseLetterColor) : undefined,
      accentLetterColor: selectedAccentLetterColor ? stripMenuColor(selectedAccentLetterColor) : undefined,
    }),
    [avulsoCharacterQuantity, avulsoUnitPrice, customIconRequest, extraLettersText, globalModuleCount, railModuleUnitPrice, savedRows, selectedAccentLetterColor, selectedBaseLetterColor, standardPackQuantity, standardPackUnitPrice],
  )
  const quoteErrors = validateMenuQuoteLimits(displayQuote)
  const shippingCost = shippingMethod === 'mainland_portugal' ? SHIPPING_COST : 0
  const total = displayQuote.totalAfterDiscount + shippingCost
  const checkoutBlockedByDraft = editing
  const previewTileCount = visibleRows.reduce((sum, line) => sum + Array.from(buildLineDisplayText(line)).length, 0)
  const animatePreviewTiles = !reducedMotion && previewTileCount <= MAX_ANIMATED_TILES_TOTAL

  useEffect(() => {
    const draft = readBuilderDraft()
    if (draft) {
      setCurrentStep(draft.currentStep)
      setOpenConfigSection(getConfigSectionForStep(draft.currentStep))
      setActiveTemplateId(draft.selectedIntentId)
      setGlobalModuleCount(draft.globalModuleCount)
      setCustomWallHex(draft.customWallHex)
      setSavedRows(draft.rows)
      setDraftRows(null)
      setRailColor(draft.railColor)
      setBaseLetterColor(draft.baseLetterColor)
      setAccentLetterColor(draft.accentLetterColor)
      setLetterCardColor(draft.letterCardColor)
      setLetterColorRequestEnabled(draft.specialLetterColorRequestEnabled)
      setLetterColorRequestDescription(draft.specialLetterColorRequest)
      setCustomIconRequest(draft.customIconRequest)
      setExtraLettersText(draft.extraLettersText)
      setStandardPackQuantity(draft.standardPackQuantity)
      setAvulsoCharacterQuantity(draft.avulsoCharacterQuantity)
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
    const draft: BuilderDraft = {
      version: 1,
      currentStep,
      selectedIntentId: activeTemplateId,
      rows: savedRows,
      globalModuleCount,
      customWallHex: previewWallHex,
      railColor: selectedRailColor,
      baseLetterColor: selectedBaseLetterColor,
      accentLetterColor: selectedAccentLetterColor,
      letterCardColor: selectedLetterCardColor,
      specialLetterColorRequestEnabled: letterColorRequestEnabled,
      specialLetterColorRequest: letterColorRequestDescription,
      customIconRequest,
      extraLettersText,
      standardPackQuantity: effectiveStandardPacks,
      avulsoCharacterQuantity: effectiveAvulsoCharacters,
      customerName,
      customerEmail,
      customerPhone,
      shippingMethod,
      shippingAddress,
      notes,
    }
    window.localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(draft))
  }, [
    activeTemplateId,
    avulsoCharacterQuantity,
    currentStep,
    customWallHex,
    customIconRequest,
    draftHydrated,
    effectiveAvulsoCharacters,
    effectiveStandardPacks,
    extraLettersText,
    globalModuleCount,
    letterColorRequestDescription,
    letterColorRequestEnabled,
    notes,
    previewWallHex,
    savedRows,
    selectedAccentLetterColor,
    selectedBaseLetterColor,
    selectedLetterCardColor,
    selectedRailColor,
    shippingAddress,
    shippingMethod,
    standardPackQuantity,
    customerEmail,
    customerName,
    customerPhone,
  ])

  useEffect(() => {
    const section = accordionSectionRefs.current[openConfigSection]
    if (!section) return

    window.setTimeout(() => {
      section.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' })
    }, 80)
  }, [openConfigSection, reducedMotion])

  function markDirty() {
    setRowsAreDirty(true)
  }

  function commitTemplate(template: MenuTemplate) {
    setActiveTemplateId(template.id)
    setGlobalModuleCount(template.globalModuleCount)
    setSavedRows(cloneTemplateLines(template))
    setDraftRows(null)
    setExtraLettersText(template.extraLettersText)
    setRowsAreDirty(false)
    setError('')
  }

  function startFromZero() {
    setActiveTemplateId('custom')
    setSavedRows([createLine('Nova linha', 'Detalhe', true)])
    setDraftRows(null)
    setExtraLettersText('')
    setRowsAreDirty(true)
  }

  function goToStep(stepId: string) {
    setCurrentStep(stepId)
    setOpenConfigSection(getConfigSectionForStep(stepId))
  }

  function handleTemplateSelect(value: string) {
    if (value === activeTemplateId) return
    if (rowsAreDirty || editing) {
      setPendingTemplateId(value)
      setTemplateConfirmOpen(true)
      return
    }

    if (value === 'custom') {
      startFromZero()
      return
    }

    const template = menuTemplates.find(candidate => candidate.id === value)
    if (template) commitTemplate(template)
  }

  function confirmTemplateSelection() {
    const value = pendingTemplateId
    if (!value) return

    if (value === 'custom') {
      startFromZero()
    } else {
      const template = menuTemplates.find(candidate => candidate.id === value)
      if (template) commitTemplate(template)
    }

    setPendingTemplateId(null)
    setTemplateConfirmOpen(false)
  }

  function updateDraftLine(id: string, patch: Partial<EditableMenuLine>) {
    setDraftRows(current => (current ?? savedRows).map(line => line.id === id ? { ...line, ...patch } : line))
  }

  function addLine() {
    if (!editing) setDraftRows(savedRows)
    setDraftRows(current => [...(current ?? savedRows), createLine('Nova linha')])
  }

  function beginEdit() {
    setDraftRows(savedRows.map(line => ({ ...line })))
  }

  function saveDraft() {
    if (!draftRows) return
    const filteredRows = draftRows.filter(line => !isBlankEditableRow(line))
    setSavedRows(filteredRows)
    setDraftRows(null)
    setRowsAreDirty(true)
  }

  function discardDraft() {
    setDraftRows(null)
  }

  function updateGlobalModuleCount(direction: 1 | -1) {
    setGlobalModuleCount(current => clampModuleCount(current + direction))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmittingRef.current) return

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setError('')

    try {
      if (checkoutBlockedByDraft) {
        setError('Guarda as alterações antes de finalizar.')
        return
      }
      if (!catalogReady) {
        setError('O catálogo do Sinalética Modular ainda não está completo.')
        return
      }
      if (!selectedRailColor) {
        setError('As cores das calhas não estão configuradas.')
        return
      }
      if (!selectedBaseLetterColor || !selectedAccentLetterColor || !selectedLetterCardColor) {
        setError('Escolha a cor das letras, o destaque e o fundo das letras.')
        return
      }
      const savedErrors = validateMenuQuoteLimits(savedQuote)
      if (savedErrors.length) {
        setError(savedErrors[0])
        return
      }
      const letterColorRequestError = validateLetterColorRequest(letterColorRequestEnabled, letterColorRequestDescription)
      if (letterColorRequestError) {
        setError(letterColorRequestError)
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
      const specialLetterDescription = letterColorRequestDescription.trim()
      const letterColorRequest = {
        enabled: letterColorRequestEnabled && Boolean(specialLetterDescription),
        description: letterColorRequestEnabled ? specialLetterDescription : '',
      }
      const items = [
        {
          productSlug: MENU_RAIL_SLUG,
          quantity: savedQuote.totalRailModules,
          selectedColor: railColorPayload,
          customizations: [],
        },
        savedQuote.standardPackQuantity > 0
          ? {
              productSlug: MENU_PACK_SLUG,
              quantity: savedQuote.standardPackQuantity,
              selectedColor: baseLetterColorPayload,
              customizations: [],
            }
          : null,
        savedQuote.avulsoCharacterQuantity > 0
          ? {
              productSlug: MENU_AVULSO_SLUG,
              quantity: savedQuote.avulsoCharacterQuantity,
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
            menuText: savedQuote.menuText,
            extraLettersText: savedQuote.extraLettersText,
            customIconRequest: savedQuote.customIconRequest,
            moduleLengthCm: MODULE_LENGTH_CM,
            charsPerModuleEstimate: CHARS_PER_MODULE_ESTIMATE,
            globalModuleCount: savedQuote.globalModuleCount,
            standardPackQuantity: savedQuote.standardPackQuantity,
            avulsoCharacterQuantity: savedQuote.avulsoCharacterQuantity,
            letterColorRequest,
            lines: savedQuote.lines.map(line => ({
              index: line.index,
              text: line.text,
              label: line.label,
              detail: line.detail,
              useAccent: line.useAccent,
              characterCount: line.characterCount,
              widthWarning: line.widthWarning,
            })),
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

  return (
    <main className="min-h-screen bg-[#f5f2eb] text-stone-950">
      <Header />

      <form onSubmit={handleSubmit}>
        <section className="relative overflow-hidden bg-[#0c0c0a] px-4 py-5 text-white sm:px-6 lg:min-h-[calc(100vh-80px)] lg:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(216,185,104,0.22),transparent_32%),radial-gradient(circle_at_78%_12%,rgba(94,116,91,0.26),transparent_28%),linear-gradient(135deg,#10100d,#242016_44%,#0c0c0a)]" />
          <div className="absolute inset-0 opacity-[0.17] [background-image:linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:54px_54px]" />

          <div className={`relative mx-auto grid max-w-[1600px] items-stretch gap-5 ${cartOpen ? 'lg:grid-cols-[minmax(0,1fr)_420px]' : 'lg:grid-cols-1'}`}>
            <motion.div
              variants={assemblyVariants}
              initial={reducedMotion ? false : 'hidden'}
              animate="visible"
              className="min-h-[68vh] rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-2xl backdrop-blur-xl sm:p-6 lg:min-h-[calc(100vh-120px)]"
            >
              <motion.div variants={wallVariants} className="relative flex h-full min-h-[640px] flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#d8d1c3] text-stone-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                <div className="absolute inset-0" style={{ background: previewWallHex || selectedBackground.gradient }} />
                {!previewWallHex && selectedBackground.image && (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-[0.42]"
                    style={{ backgroundImage: `url(${selectedBackground.image})` }}
                    aria-hidden="true"
                  />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.74),rgba(255,255,255,0.2)_42%,rgba(70,55,35,0.28)),radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.55),transparent_26%)]" />
                <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(90deg,rgba(90,73,52,.22)_1px,transparent_1px),linear-gradient(rgba(90,73,52,.18)_1px,transparent_1px)] [background-size:38px_38px]" />

                <div className="relative z-10 flex flex-col gap-4 p-5 sm:p-8 lg:p-10">
                  <div className="absolute left-4 top-4 z-20 rounded-lg border border-stone-950/10 bg-white/78 p-1.5 shadow-sm backdrop-blur-md">
                    <div className="flex items-center gap-1.5">
                      {backgroundPresets.map(background => (
                        <button
                          key={background.id}
                          type="button"
                          onClick={() => {
                            setBackgroundPresetId(background.id)
                            setCustomWallHex('')
                          }}
                          className={`size-7 overflow-hidden rounded-full border transition ${
                            !previewWallHex && backgroundPresetId === background.id ? 'border-stone-950 ring-2 ring-white' : 'border-stone-300 hover:border-stone-700'
                          }`}
                          aria-label={`Usar ambiente ${background.label}`}
                          title={background.label}
                          style={{
                            background: background.image ? undefined : background.gradient,
                            backgroundImage: background.image ? `url(${background.image})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        />
                      ))}
                      <label className="ml-1 flex items-center gap-1 rounded-full border border-stone-200 bg-white/80 px-2 py-1">
                        <span className="sr-only">Cor personalizada da parede</span>
                        <span
                          aria-hidden="true"
                          className="size-4 rounded-full border border-stone-300"
                          style={{ background: previewWallHex || '#f8f4e9' }}
                        />
                        <Input
                          value={customWallHex}
                          onChange={event => setCustomWallHex(event.target.value.slice(0, 7))}
                          placeholder="#f5f1e8"
                          inputMode="text"
                          className="h-7 w-[88px] border-0 bg-transparent px-1 text-xs font-semibold text-stone-800 shadow-none focus-visible:ring-1"
                          aria-label="Cor personalizada da parede em hexadecimal"
                        />
                      </label>
                    </div>
                    {customWallHex && !previewWallHex && (
                      <p role="alert" className="px-2 pb-1 pt-1 text-[10px] font-medium text-amber-800">
                        Use uma cor hexadecimal como #f5f1e8.
                      </p>
                    )}
                  </div>

                  <div className="max-w-3xl pt-8 sm:pt-0">
                    <motion.p variants={rowVariants} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#6a5130]">
                      <Sparkles className="size-4" />
                      Sinalética Modular · módulos de {MODULE_LENGTH_CM}cm
                    </motion.p>
                    <motion.h1 variants={rowVariants} className="mt-4 max-w-4xl font-serif text-4xl font-bold leading-[0.98] tracking-tight text-stone-950 sm:text-6xl lg:text-7xl">
                      Um menu modular até 3 metros.
                    </motion.h1>
                    <motion.p variants={rowVariants} className="mt-4 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">
                      Escolha a largura global, edite as linhas e veja todos os módulos a crescerem juntos.
                    </motion.p>
                  </div>

                  <motion.div variants={guideVariants} className="h-px origin-left bg-[#8d744b]/45" />

                  <motion.div className="relative mx-auto mt-2 w-full max-w-5xl" layout>
                    <AnimatePresence initial={false}>
                      {visibleRows.map((line, index) => (
                        <MenuBoardRow
                          key={line.id}
                          line={line}
                          index={index}
                          quoteLine={displayQuote.lines[index]}
                          globalModuleCount={displayQuote.globalModuleCount}
                          railColor={selectedRailColor}
                          baseLetterColor={selectedBaseLetterColor}
                          accentLetterColor={selectedAccentLetterColor}
                          letterCardColor={selectedLetterCardColor}
                          editing={editing}
                          onPatch={patch => updateDraftLine(line.id, patch)}
                          reducedMotion={reducedMotion}
                          animateTiles={animatePreviewTiles}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>

                  <motion.div variants={rowVariants} className="mt-auto flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-950/10 bg-white/44 p-3 text-sm text-stone-700 backdrop-blur-md">
                    <span>
                      Total de módulos de 25cm: {displayQuote.totalRailModules} · largura {displayQuote.globalWidthCm}cm
                      <span className="mt-1 block text-xs text-stone-500">Pré-visualização aproximada. Confirmamos proporções antes da produção.</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {!editing ? (
                        <Button type="button" onClick={beginEdit} className="bg-stone-950 text-white hover:bg-stone-800">
                          <Edit3 className="size-4" />
                          Editar linhas
                        </Button>
                      ) : (
                        <>
                          <Button type="button" variant="outline" onClick={discardDraft} className="bg-white/70">
                            Descartar
                          </Button>
                          <Button type="button" onClick={saveDraft} className="bg-stone-950 text-white hover:bg-stone-800">
                            Guardar
                          </Button>
                        </>
                      )}
                      <Button type="button" onClick={addLine} className="bg-stone-950 text-white hover:bg-stone-800">
                        <Plus className="size-4" />
                        Nova linha
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>

            {cartOpen ? (
              <aside className="flex min-h-0 flex-col rounded-[1.5rem] border border-white/12 bg-[#f8f6f0] p-4 text-stone-950 shadow-2xl lg:sticky lg:top-5 lg:h-[calc(100vh-120px)] lg:max-h-[calc(100vh-120px)]">
                <div className="flex items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1f5138]">Builder</p>
                    <h2 className="mt-2 text-2xl font-bold">Sinalética Modular</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-600">Configure intenção, conteúdo, largura e cores. Finalize quando o resumo estiver pronto.</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setCartOpen(false)} aria-label="Fechar resumo">
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-5 gap-1 rounded-2xl bg-white p-2 shadow-sm">
                  {builderSteps.map((step, index) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => goToStep(step.id)}
                      className={`rounded-lg px-1 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] transition ${
                        currentStep === step.id ? 'bg-[#1f5138] text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                    >
                      <span className="block text-xs">{index + 1}</span>
                      {step.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pb-36 pr-1">
                  <Accordion
                    type="single"
                    collapsible
                    value={openConfigSection}
                    onValueChange={value => {
                      if (!value) return
                      setOpenConfigSection(value)
                      setCurrentStep(getStepForConfigSection(value))
                    }}
                    className="space-y-3"
                  >
                    <div ref={node => { accordionSectionRefs.current.system = node }}>
                      <AccordionItem value="system" className="rounded-2xl border border-stone-200 bg-white px-4 shadow-sm">
                        <AccordionTrigger className="py-4 text-base font-bold hover:no-underline">
                          O Sistema
                        </AccordionTrigger>
                        <AccordionContent className="space-y-5 pb-5">
                          <div>
                            <Label className="text-sm font-bold">Template</Label>
                            <Select value={activeTemplateId} onValueChange={handleTemplateSelect}>
                              <SelectTrigger className="mt-3 h-11 w-full bg-white">
                                <SelectValue placeholder="Escolher template" />
                              </SelectTrigger>
                              <SelectContent>
                                {menuTemplates.map(template => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                  </SelectItem>
                                ))}
                                <SelectItem value="custom">Começar do zero</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="mt-2 text-xs leading-5 text-stone-500">
                              {activeTemplateId === 'custom'
                                ? 'Base livre para criar sem exemplo.'
                                : menuTemplates.find(template => template.id === activeTemplateId)?.description}
                            </p>
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-bold">Largura do sistema</Label>
                              <span className="text-sm text-stone-500">{displayQuote.globalWidthCm}cm</span>
                            </div>
                            <div className="mt-3 flex items-center justify-between rounded-xl border border-stone-200 p-2">
                              <Button type="button" variant="outline" size="icon" onClick={() => updateGlobalModuleCount(-1)} disabled={globalModuleCount <= MIN_GLOBAL_MODULES} aria-label="Diminuir largura do sistema">
                                <Minus className="size-4" />
                              </Button>
                              <div className="text-center">
                                <p className="text-lg font-black">{globalModuleCount} módulos · {displayQuote.globalWidthCm}cm</p>
                                <p className="text-xs text-stone-500">máx. {MAX_GLOBAL_MODULES} módulos / {MAX_GLOBAL_MODULES * MODULE_LENGTH_CM}cm</p>
                              </div>
                              <Button type="button" variant="outline" size="icon" onClick={() => updateGlobalModuleCount(1)} disabled={globalModuleCount >= MAX_GLOBAL_MODULES} aria-label="Aumentar largura do sistema">
                                <Plus className="size-4" />
                              </Button>
                            </div>
                            <p className="mt-3 text-xs leading-5 text-stone-500">
                              Cada linha usa a mesma largura e é composta por módulos de {MODULE_LENGTH_CM}cm.
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </div>

                    <div ref={node => { accordionSectionRefs.current.menu = node }}>
                      <AccordionItem value="menu" className="rounded-2xl border border-stone-200 bg-white px-4 shadow-sm">
                        <AccordionTrigger className="py-4 text-base font-bold hover:no-underline">
                          O Menu
                        </AccordionTrigger>
                        <AccordionContent className="space-y-5 pb-5">
                          <div className="rounded-xl border border-stone-200 bg-[#fbfaf7] p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold">Linhas</p>
                                <p className="mt-1 text-xs text-stone-500">{editing ? 'Edite e guarde para atualizar a encomenda.' : 'Ative edição para alterar textos e preços.'}</p>
                              </div>
                              {!editing ? (
                                <Button type="button" size="sm" onClick={beginEdit} className="bg-stone-950 text-white hover:bg-stone-800">
                                  <Edit3 className="size-4" />
                                  Editar
                                </Button>
                              ) : (
                                <div className="flex gap-2">
                                  <Button type="button" size="sm" variant="outline" onClick={discardDraft}>
                                    Descartar
                                  </Button>
                                  <Button type="button" size="sm" onClick={saveDraft} className="bg-stone-950 text-white hover:bg-stone-800">
                                    Guardar
                                  </Button>
                                </div>
                              )}
                            </div>
                            <Button type="button" variant="outline" onClick={addLine} className="mt-3 w-full bg-white">
                              <Plus className="size-4" />
                              Nova linha
                            </Button>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <Layers className="size-4 text-[#1f5138]" />
                              <Label htmlFor="extra-letters" className="text-sm font-bold">Letras e símbolos</Label>
                            </div>
                            <Input
                              id="extra-letters"
                              value={extraLettersText}
                              onChange={event => setExtraLettersText(event.target.value)}
                              placeholder="€, @, Wi-Fi"
                              className="mt-3 h-11 border-stone-200 bg-[#fbfaf7]"
                            />
                            <p className="mt-2 text-xs text-stone-500">{displayQuote.extraCharacters}/{MENU_EXTRA_MAX_CHARS} caracteres extra</p>
                            <div className="mt-4 grid gap-3">
                              <div>
                                <div className="flex items-center justify-between text-sm">
                                  <span>Pack Standard</span>
                                  <span>mín. {displayQuote.standardPackMinimum}</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <Button type="button" variant="outline" size="icon" onClick={() => setStandardPackQuantity(Math.max(displayQuote.standardPackMinimum, effectiveStandardPacks - 1))} disabled={effectiveStandardPacks <= displayQuote.standardPackMinimum} aria-label="Diminuir packs standard">
                                    <Minus className="size-4" />
                                  </Button>
                                  <span className="w-10 text-center font-bold">{effectiveStandardPacks}</span>
                                  <Button type="button" variant="outline" size="icon" onClick={() => setStandardPackQuantity(effectiveStandardPacks + 1)} aria-label="Aumentar packs standard">
                                    <Plus className="size-4" />
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center justify-between text-sm">
                                  <span>Letras avulso</span>
                                  <span>mín. {displayQuote.avulsoMinimum}</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <Button type="button" variant="outline" size="icon" onClick={() => setAvulsoCharacterQuantity(Math.max(displayQuote.avulsoMinimum, effectiveAvulsoCharacters - 1))} disabled={effectiveAvulsoCharacters <= displayQuote.avulsoMinimum} aria-label="Diminuir letras avulso">
                                    <Minus className="size-4" />
                                  </Button>
                                  <span className="w-10 text-center font-bold">{effectiveAvulsoCharacters}</span>
                                  <Button type="button" variant="outline" size="icon" onClick={() => setAvulsoCharacterQuantity(effectiveAvulsoCharacters + 1)} aria-label="Aumentar letras avulso">
                                    <Plus className="size-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <p className="mt-3 text-xs leading-5 text-stone-500">Pode adicionar letras extra para futuras alterações ao menu.</p>
                          </div>

                          <div>
                            <Label htmlFor="custom-icon-request" className="text-sm font-bold">Pedido de símbolo/logótipo personalizado</Label>
                            <Textarea
                              id="custom-icon-request"
                              value={customIconRequest}
                              onChange={event => setCustomIconRequest(event.target.value)}
                              maxLength={MENU_CUSTOM_ICON_MAX_CHARS + 50}
                              placeholder="Ex: símbolo de Wi-Fi, logótipo simples ou ícone de café."
                              className="mt-3 min-h-20 border-stone-200 bg-[#fbfaf7]"
                            />
                            <p className="mt-2 text-xs leading-5 text-stone-500">
                              Precisa de um símbolo, ícone ou logótipo? Descreva-o aqui. Confirmamos a viabilidade antes da produção.
                              <span className="mt-1 block">{customIconRequest.length}/{MENU_CUSTOM_ICON_MAX_CHARS} caracteres</span>
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </div>

                    <div ref={node => { accordionSectionRefs.current.colors = node }}>
                      <AccordionItem value="colors" className="rounded-2xl border border-stone-200 bg-white px-4 shadow-sm">
                        <AccordionTrigger className="py-4 text-base font-bold hover:no-underline">
                          As Cores
                        </AccordionTrigger>
                        <AccordionContent className="pb-5">
                          {query.isLoading ? (
                            <p className="text-sm text-stone-500">A carregar cores disponíveis...</p>
                          ) : (
                            <div className="grid gap-5">
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
                                  <SwatchPicker label="Cor de destaque" colors={letterColors} selected={selectedAccentLetterColor} onSelect={setAccentLetterColor} />
                                  <SwatchPicker label="Cor do fundo das letras" colors={letterColors} selected={selectedLetterCardColor} onSelect={setLetterCardColor} />
                                  {showLetterCardContrastHint && (
                                    <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                      Pouco contraste. Recomendamos testar outra combinação.
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                  As letras ainda não têm cores configuradas.
                                </p>
                              )}
                              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-[#fbfaf7] p-3 text-sm">
                                <input
                                  type="checkbox"
                                  checked={letterColorRequestEnabled}
                                  onChange={event => setLetterColorRequestEnabled(event.target.checked)}
                                  className="mt-1"
                                />
                                <span>
                                  <span className="block font-semibold text-stone-900">Não encontra a cor ideal? Pedir outra cor</span>
                                  <span className="mt-1 block text-stone-500">Confirmamos disponibilidade antes da produção.</span>
                                </span>
                              </label>
                              {letterColorRequestEnabled && (
                                <div>
                                  <Label htmlFor="letter-color-request" className="text-sm font-bold">Descreva a cor pretendida</Label>
                                  <Textarea
                                    id="letter-color-request"
                                    value={letterColorRequestDescription}
                                    onChange={event => setLetterColorRequestDescription(event.target.value)}
                                    maxLength={MENU_LETTER_COLOR_REQUEST_MAX_CHARS + 30}
                                    placeholder="Ex: azul tipo Tiffany ou dourado escovado"
                                    className="mt-2 min-h-20 border-stone-200 bg-[#fbfaf7]"
                                  />
                                  <p className="mt-2 text-xs text-stone-500">
                                    {calculateCharacters(letterColorRequestDescription)}/{MENU_LETTER_COLOR_REQUEST_MAX_CHARS} caracteres
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </div>

                    <div ref={node => { accordionSectionRefs.current.review = node }}>
                      <AccordionItem value="review" className="rounded-2xl border border-stone-200 bg-white px-4 shadow-sm">
                        <AccordionTrigger className="py-4 text-base font-bold hover:no-underline">
                          Resumo de produção
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pb-5 text-sm">
                          <div className="grid gap-2 rounded-xl border border-stone-200 bg-[#fbfaf7] p-3">
                            <div className="flex justify-between gap-3"><span className="text-stone-500">Linhas</span><span className="font-bold">{displayQuote.lineCount}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-stone-500">Largura do sistema</span><span className="font-bold">{displayQuote.globalModuleCount} módulos · {displayQuote.globalWidthCm}cm</span></div>
                            <div className="flex justify-between gap-3"><span className="text-stone-500">Módulos de 25cm</span><span className="font-bold">{displayQuote.totalRailModules}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-stone-500">Pack Standard</span><span className="font-bold">{displayQuote.standardPackQuantity}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-stone-500">Letras avulso</span><span className="font-bold">{displayQuote.avulsoCharacterQuantity}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-stone-500">Cor das calhas</span><span className="font-bold">{selectedRailColor?.name ?? '-'}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-stone-500">Cor das letras</span><span className="font-bold">{selectedBaseLetterColor?.name ?? '-'}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-stone-500">Cor do fundo das letras</span><span className="font-bold">{selectedLetterCardColor?.name ?? '-'}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-stone-500">Avisos de largura</span><span className="font-bold">{displayQuote.lines.filter(line => line.widthWarning).length}</span></div>
                          </div>

                          <details className="rounded-xl border border-stone-200 bg-[#fbfaf7] p-3">
                            <summary className="cursor-pointer text-sm font-bold text-stone-900">Ver detalhe do preço</summary>
                            <div className="mt-3 grid gap-2 border-t border-stone-200 pt-3">
                              <div className="flex justify-between gap-3"><span className="text-stone-500">Módulos de 25cm</span><span>{displayQuote.totalRailModules} x {formatPrice(railModuleUnitPrice)}</span></div>
                              <div className="flex justify-between gap-3"><span className="text-stone-500">Pack Standard</span><span>{displayQuote.standardPackQuantity} x {formatPrice(standardPackUnitPrice)}</span></div>
                              <div className="flex justify-between gap-3"><span className="text-stone-500">Letras avulso</span><span>{displayQuote.avulsoCharacterQuantity} x {formatPrice(avulsoUnitPrice)}</span></div>
                              <div className="flex justify-between gap-3"><span className="text-stone-500">Subtotal</span><span>{formatPrice(displayQuote.subtotalBeforeDiscount)}</span></div>
                              <div className="flex justify-between gap-3 text-[#1f5138]"><span>Desconto campanha</span><span>-{formatPrice(displayQuote.launchDiscountAmount)}</span></div>
                              <div className="flex justify-between gap-3"><span className="text-stone-500">Entrega</span><span>{formatPrice(shippingCost)}</span></div>
                              <div className="flex justify-between gap-3 border-t border-stone-200 pt-2 text-base font-black"><span>Total</span><span>{formatPrice(total)}</span></div>
                            </div>
                          </details>

                          <Button type="button" className="w-full bg-[#1f5138] text-white hover:bg-[#173d2a]" onClick={() => goToStep('checkout')}>
                            Avançar para checkout
                            <ArrowRight className="size-4" />
                          </Button>
                        </AccordionContent>
                      </AccordionItem>
                    </div>

                    <div ref={node => { accordionSectionRefs.current.checkout = node }}>
                      <AccordionItem value="checkout" className="rounded-2xl border border-stone-200 bg-white px-4 shadow-sm">
                        <AccordionTrigger className="py-4 text-base font-bold hover:no-underline">
                          Checkout
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pb-5">
                          <div>
                            <h2 className="text-lg font-bold">Dados para finalizar</h2>
                            <p className="mt-1 text-sm leading-6 text-stone-500">Estes dados seguem para a encomenda e pagamento seguro.</p>
                          </div>

                          <div className="grid gap-3">
                            <div>
                              <Label htmlFor="customer-name">Nome</Label>
                              <Input id="customer-name" value={customerName} onChange={event => setCustomerName(event.target.value)} required minLength={2} className="mt-1" />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                              <div>
                                <Label htmlFor="customer-email">Email</Label>
                                <Input id="customer-email" type="email" value={customerEmail} onChange={event => setCustomerEmail(event.target.value)} required className="mt-1" />
                              </div>
                              <div>
                                <Label htmlFor="customer-phone">Telemóvel</Label>
                                <Input id="customer-phone" value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} inputMode="tel" className="mt-1" />
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <label className={`cursor-pointer rounded-md border p-3 transition ${shippingMethod === 'pickup_carcavelos' ? 'border-[#1f5138] bg-[#eef7f0]' : 'border-stone-200 bg-white'}`}>
                              <input type="radio" name="shipping" checked={shippingMethod === 'pickup_carcavelos'} onChange={() => setShippingMethod('pickup_carcavelos')} className="sr-only" />
                              <span className="font-semibold">Levantamento em Carcavelos</span>
                              <span className="mt-1 block text-sm text-stone-500">Sem custo de envio.</span>
                            </label>
                            <label className={`cursor-pointer rounded-md border p-3 transition ${shippingMethod === 'mainland_portugal' ? 'border-[#1f5138] bg-[#eef7f0]' : 'border-stone-200 bg-white'}`}>
                              <input type="radio" name="shipping" checked={shippingMethod === 'mainland_portugal'} onChange={() => setShippingMethod('mainland_portugal')} className="sr-only" />
                              <span className="font-semibold">Envio nacional</span>
                              <span className="mt-1 block text-sm text-stone-500">{formatPrice(SHIPPING_COST)}</span>
                            </label>
                          </div>

                          {shippingMethod === 'mainland_portugal' && (
                            <div>
                              <Label htmlFor="shipping-address">Morada completa</Label>
                              <Input id="shipping-address" value={shippingAddress} onChange={event => setShippingAddress(event.target.value)} required className="mt-1" />
                            </div>
                          )}

                          <div>
                            <Label htmlFor="notes">Notas</Label>
                            <Input id="notes" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Prazo ideal ou detalhes de montagem" className="mt-1" />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </div>
                  </Accordion>
                </div>

                <div className="sticky bottom-0 mt-4 rounded-2xl border border-stone-200 bg-white/96 p-4 shadow-[0_-18px_42px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Total estimado</p>
                      <p className="mt-1 text-2xl font-black">{formatPrice(total)}</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">
                        {displayQuote.totalRailModules} módulos · {displayQuote.standardPackQuantity} packs · {displayQuote.avulsoCharacterQuantity} letras avulso
                      </p>
                    </div>
                    <div className="rounded-full bg-[#eef7f0] p-2 text-[#1f5138]" title="Campanha de lançamento aplicada">
                      <Check className="size-4" />
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {query.isLoading && <p className="text-sm text-stone-500">A carregar catálogo...</p>}
                  {!query.isLoading && !catalogReady && (
                    <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Faltam componentes do Sinalética Modular para finalizar a encomenda.
                    </p>
                  )}
                  {quoteErrors.length > 0 && (
                    <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{quoteErrors[0]}</p>
                  )}
                  {!query.isLoading && catalogReady && !selectedRailColor && (
                    <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">As cores das calhas não estão configuradas.</p>
                  )}
                  {!query.isLoading && catalogReady && selectedRailColor && (!selectedBaseLetterColor || !selectedAccentLetterColor || !selectedLetterCardColor) && (
                    <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Escolha a cor das letras, o destaque e o fundo das letras.</p>
                  )}
                  {checkoutBlockedByDraft && (
                    <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Guarda as alterações antes de finalizar.</p>
                  )}
                  {error && (
                    <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
                  )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || checkoutBlockedByDraft || query.isLoading || !catalogReady || !selectedRailColor || !selectedBaseLetterColor || !selectedAccentLetterColor || !selectedLetterCardColor || quoteErrors.length > 0 || displayQuote.totalRailModules < 1}
                    className="mt-3 h-12 w-full bg-[#1f5138] text-white hover:bg-[#173d2a]"
                  >
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                    Finalizar encomenda
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </aside>
            ) : (
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="fixed bottom-4 right-4 z-40 rounded-full border border-white/15 bg-[#10100d] px-5 py-3 text-left text-white shadow-2xl"
              >
                <span className="flex items-center gap-3">
                  <ShoppingBag className="size-5" />
                  <span>
                    <span className="block text-xs uppercase tracking-[0.16em] text-white/58">Resumo</span>
                    <span className="font-bold">{formatPrice(total)} · {displayQuote.totalRailModules} módulos</span>
                  </span>
                </span>
              </button>
            )}
          </div>
        </section>
      </form>

      <Dialog open={templateConfirmOpen} onOpenChange={setTemplateConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Substituir o menu atual?</DialogTitle>
            <DialogDescription>
              Escolher outro template troca as linhas que já editou. Alterações por guardar serão perdidas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingTemplateId(null)
                setTemplateConfirmOpen(false)
              }}
            >
              Manter menu
            </Button>
            <Button type="button" onClick={confirmTemplateSelection}>
              Substituir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </main>
  )
}
