'use client'

import { FormEvent, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion'
import type { InstaQLEntity } from '@instantdb/react'
import {
  ArrowRight,
  Bot,
  Check,
  CreditCard,
  Edit3,
  Layers,
  Loader2,
  Menu,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
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

type CatalogProductBase = InstaQLEntity<AppSchema, 'catalogProducts'>
type ProductInventoryRecord = InstaQLEntity<AppSchema, 'productInventory'>
type GlobalColorBase = InstaQLEntity<AppSchema, 'globalColors'>
type CatalogProduct = Omit<CatalogProductBase, 'updatedAt'> & {
  updatedAt: CatalogProductBase['updatedAt'] | Date
  inventory?: (Omit<ProductInventoryRecord, 'updatedAt'> & { updatedAt: ProductInventoryRecord['updatedAt'] | Date })
}
type GlobalColorRecord = Omit<GlobalColorBase, 'updatedAt'> & { updatedAt: GlobalColorBase['updatedAt'] | Date }
type MenuColorPayload = Pick<ProductColor, 'name' | 'hex' | 'globalColorId' | 'priceAdd'>

type EditableMenuLine = {
  id: string
  label: string
  suffix: string
  price: string
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

const productExamples = [
  {
    title: 'Café de bairro',
    copy: 'Menu principal, especiais da semana e símbolos extra para rotação rápida.',
    image: 'https://pub-f8e78bd948414156890e0632ecc170b9.r2.dev/collections/menu/fabrizio-coco-9bi4ilWgMmU-unsplash%20(1).jpg',
  },
  {
    title: 'Loja e showroom',
    copy: 'Lista de preços, campanha curta ou painel interior de produto.',
    image: 'https://pub-f8e78bd948414156890e0632ecc170b9.r2.dev/collections/menu/sokha-michael-Pv1mDy4FWWc-unsplash%20(1).jpg',
  },
  {
    title: 'Studio de serviços',
    copy: 'Serviços, preços desde, marcações e mensagens sazonais.',
    image: 'https://pub-f8e78bd948414156890e0632ecc170b9.r2.dev/collections/menu/matthew-jungling-IY44r8Wd5XI-unsplash%20(1).jpg',
  },
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
      createLine('Espresso', '', '1,20€'),
      createLine('Americano', '', '1,80€'),
      createLine('Flat White', '', '3,00€'),
      createLine('Cappuccino', '', '2,80€'),
      createLine('Chai Latte', '', '3,50€'),
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
      createLine('Pastel de nata', '', '1,40€'),
      createLine('Croissant brioche', '', '2,20€'),
      createLine('Tosta mista', '', '3,90€'),
      createLine('Sumo natural', '', '3,20€'),
      createLine('Menu pequeno-almoço', '', '6,50€'),
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
      createLine('Corte masculino', '', '18€'),
      createLine('Barba', '', '12€'),
      createLine('Corte + barba', '', '26€'),
      createLine('Coloração', 'desde', '35€'),
      createLine('Consulta privada', '', 'sob marcação'),
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
      createLine('Produto assinatura', '', '24€'),
      createLine('Pack oferta', '', '39€'),
      createLine('Edição limitada', '', 'sob consulta'),
      createLine('Personalização', '', '+8€'),
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
      createLine('Avaliação inicial', '', '25€'),
      createLine('Plano mensal', 'desde', '49€'),
      createLine('Sessão individual', '', '35€'),
      createLine('Serviço expresso', '', '+15€'),
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
      createLine('Novo menu de almoço', '', '9,90€'),
      createLine('Café + nata', '', '2,40€'),
      createLine('Só esta semana', '', '-15%'),
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

function createLine(label: string, suffix = '', price = ''): EditableMenuLine {
  lineIdCounter += 1
  return {
    id: `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${lineIdCounter}`,
    label,
    suffix,
    price,
  }
}

function cloneTemplateLines(template: MenuTemplate) {
  return template.lines.map(line => createLine(line.label, line.suffix, line.price))
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

function findColor(colors: ProductColor[], names: string[]) {
  return colors.find(color => names.some(name => color.name.toLowerCase().includes(name))) ?? colors[0]
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

      return createLine(
        match[1].replace(/[-:]+$/g, '').replace(/\s+/g, ' ').trim(),
        '',
        match[2].replace('.', ',').replace(/\s*€$/, '€').trim(),
      )
    })
}

function formatAssistantMenu(value: string) {
  const fallback = 'Espresso 1,50\nFlat White 3,00\nPastel de nata 1,40'
  const source = value.trim() || fallback
  const matches = Array.from(source.matchAll(/([^,\n]+?)\s+(\d+(?:[,.]\d{1,2})?\s*€?)(?=,|\n|$)/gi))

  if (matches.length) {
    return matches.map(match => createLine(
      match[1].replace(/[-:]+$/g, '').replace(/\s+/g, ' ').trim(),
      '',
      match[2].replace('.', ',').replace(/\s*€?$/, '€'),
    ))
  }

  return parseRawMenuText(source)
}

function toCalculatorRows(lines: EditableMenuLine[]): MenuRowInput[] {
  return lines.map(line => ({
    label: line.label,
    suffix: line.suffix,
    price: line.price,
  }))
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

function MenuBoardRow({
  line,
  index,
  quoteLine,
  globalModuleCount,
  railColor,
  letterColor,
  editing,
  onPatch,
  reducedMotion,
}: {
  line: EditableMenuLine
  index: number
  quoteLine?: { widthWarning?: boolean; characterCount?: number }
  globalModuleCount: number
  railColor?: ProductColor
  letterColor?: ProductColor
  editing: boolean
  onPatch: (patch: Partial<EditableMenuLine>) => void
  reducedMotion: boolean
}) {
  const railHex = railColor?.hex ?? '#111111'
  const letterHex = letterColor?.hex ?? '#f8f4e9'

  return (
    <motion.div
      layout
      variants={rowVariants}
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      exit="exit"
      className="rounded-xl border border-white/10 bg-black/12 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    >
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px] md:items-end">
        {editing ? (
          <>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_130px]">
              <Input
                value={line.label}
                onChange={event => onPatch({ label: event.target.value })}
                className="h-10 border-white/10 bg-white/10 text-white placeholder:text-white/35"
                placeholder="Texto"
                aria-label={`Texto da linha ${index + 1}`}
              />
              <Input
                value={line.suffix}
                onChange={event => onPatch({ suffix: event.target.value })}
                className="h-10 border-white/10 bg-white/10 text-white placeholder:text-white/35"
                placeholder="Extra"
                aria-label={`Extra da linha ${index + 1}`}
              />
            </div>
            <Input
              value={line.price}
              onChange={event => onPatch({ price: event.target.value })}
              className="h-10 border-white/10 bg-white/10 text-white placeholder:text-white/35"
              placeholder="Preço"
              aria-label={`Preço da linha ${index + 1}`}
            />
          </>
        ) : (
          <>
            <div className="min-w-0">
              <span
                className="block truncate font-sans text-base font-semibold tracking-[0.02em] sm:text-lg"
                style={{
                  color: letterHex,
                  textShadow: '0 1px 0 rgba(255,255,255,0.22), 0 3px 8px rgba(0,0,0,0.45)',
                }}
              >
                {[line.label, line.suffix].filter(Boolean).join(' ') || 'Linha vazia'}
              </span>
            </div>
            <span
              className="truncate text-left font-sans text-base font-semibold sm:text-lg md:text-right"
              style={{
                color: letterHex,
                textShadow: '0 1px 0 rgba(255,255,255,0.22), 0 3px 8px rgba(0,0,0,0.45)',
              }}
            >
              {line.price}
            </span>
          </>
        )}
      </div>

      <div className="mt-3 flex h-5 overflow-hidden rounded-full border border-white/12 shadow-[0_8px_18px_rgba(0,0,0,0.22)]">
        {Array.from({ length: globalModuleCount }).map((_, moduleIndex) => (
          <motion.div
            key={moduleIndex}
            variants={segmentVariants}
            className={`relative flex-1 border-r border-white/12 last:border-r-0 ${moduleIndex === 0 ? 'min-w-12' : ''}`}
            style={{
              background: moduleIndex === 0
                ? `linear-gradient(180deg, color-mix(in srgb, ${railHex} 70%, white 30%), ${railHex} 52%, color-mix(in srgb, ${railHex} 70%, black 30%))`
                : `linear-gradient(180deg, color-mix(in srgb, ${railHex} 82%, white 18%), ${railHex} 52%, color-mix(in srgb, ${railHex} 84%, black 16%))`,
            }}
            title={moduleIndex === 0 ? 'Módulo starter/base' : 'Módulo extensor'}
          >
            {moduleIndex === 0 && <span className="absolute inset-y-0 left-2 w-1 rounded-full bg-white/24" />}
          </motion.div>
        ))}
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
  const [activeTemplateId, setActiveTemplateId] = useState(initialTemplate.id)
  const [globalModuleCount, setGlobalModuleCount] = useState(initialTemplate.globalModuleCount)
  const [savedRows, setSavedRows] = useState<EditableMenuLine[]>(() => cloneTemplateLines(initialTemplate))
  const [draftRows, setDraftRows] = useState<EditableMenuLine[] | null>(null)
  const [assistantText, setAssistantText] = useState('espresso 1,50, flat white 3,00\npastel de nata 1,40')
  const [extraLettersText, setExtraLettersText] = useState(initialTemplate.extraLettersText)
  const [customIconRequest, setCustomIconRequest] = useState('')
  const [letterColorRequestEnabled, setLetterColorRequestEnabled] = useState(false)
  const [letterColorRequestDescription, setLetterColorRequestDescription] = useState('')
  const [standardPackQuantity, setStandardPackQuantity] = useState(0)
  const [avulsoCharacterQuantity, setAvulsoCharacterQuantity] = useState(0)
  const [backgroundPresetId, setBackgroundPresetId] = useState(backgroundPresets[0].id)
  const [rowsAreDirty, setRowsAreDirty] = useState(false)
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null)
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false)
  const [rawEditorOpen, setRawEditorOpen] = useState(false)
  const [rawDraft, setRawDraft] = useState('')
  const [cartOpen, setCartOpen] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [shippingMethod, setShippingMethod] = useState<'pickup_carcavelos' | 'mainland_portugal'>('pickup_carcavelos')
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [railColor, setRailColor] = useState<ProductColor | undefined>()
  const [letterColor, setLetterColor] = useState<ProductColor | undefined>()
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
  const selectedLetterColor = letterColor && letterColors.some(color => colorMatches(color, letterColor))
    ? letterColor
    : findColor(letterColors, ['branco', 'white'])
  const railModuleUnitPrice = getProductPrice(railProduct) + (selectedRailColor?.priceAdd ?? 0)
  const standardPackUnitPrice = getProductPrice(packProduct) + (selectedLetterColor?.priceAdd ?? 0)
  const avulsoUnitPrice = getProductPrice(avulsoProduct) + (selectedLetterColor?.priceAdd ?? 0)

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
    }),
    [avulsoUnitPrice, customIconRequest, effectiveAvulsoCharacters, effectiveStandardPacks, extraLettersText, globalModuleCount, railModuleUnitPrice, standardPackUnitPrice, visibleRows],
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
    }),
    [avulsoCharacterQuantity, avulsoUnitPrice, customIconRequest, extraLettersText, globalModuleCount, railModuleUnitPrice, savedRows, standardPackQuantity, standardPackUnitPrice],
  )
  const quoteErrors = validateMenuQuoteLimits(displayQuote)
  const shippingCost = shippingMethod === 'mainland_portugal' ? SHIPPING_COST : 0
  const total = displayQuote.totalAfterDiscount + shippingCost
  const checkoutBlockedByDraft = editing

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
    setSavedRows([createLine('Nova linha', '', '0,00€')])
    setDraftRows(null)
    setExtraLettersText('')
    setRowsAreDirty(true)
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
    setSavedRows(draftRows)
    setDraftRows(null)
    setRowsAreDirty(true)
  }

  function discardDraft() {
    setDraftRows(null)
  }

  function handleAssistantFormat() {
    const nextLines = formatAssistantMenu(assistantText)
    if (!nextLines.length) return
    setActiveTemplateId('custom')
    setDraftRows(nextLines)
    setRowsAreDirty(true)
  }

  function openRawEditor() {
    setRawDraft(buildMenuTextFromRows(toCalculatorRows(visibleRows)))
    setRawEditorOpen(true)
  }

  function applyRawEditor() {
    const nextLines = parseRawMenuText(rawDraft)
    if (nextLines.length) {
      setActiveTemplateId('custom')
      setDraftRows(nextLines)
      setRowsAreDirty(true)
    }
    setRawEditorOpen(false)
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
        setError('O catálogo do Menu3D ainda não está completo.')
        return
      }
      if (!selectedRailColor || !selectedLetterColor) {
        setError('Escolha a cor das calhas e a cor das letras.')
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
      const letterColorPayload = stripMenuColor(selectedLetterColor)
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
              selectedColor: letterColorPayload,
              customizations: [],
            }
          : null,
        savedQuote.avulsoCharacterQuantity > 0
          ? {
              productSlug: MENU_AVULSO_SLUG,
              quantity: savedQuote.avulsoCharacterQuantity,
              selectedColor: letterColorPayload,
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
              suffix: line.suffix,
              price: line.price,
              characterCount: line.characterCount,
              widthWarning: line.widthWarning,
            })),
            railColor: railColorPayload,
            letterColor: letterColorPayload,
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

          <div className={`relative mx-auto grid max-w-[1600px] gap-5 ${cartOpen ? 'lg:grid-cols-[minmax(0,1fr)_420px]' : 'lg:grid-cols-1'}`}>
            <motion.div
              variants={assemblyVariants}
              initial={reducedMotion ? false : 'hidden'}
              animate="visible"
              className="min-h-[68vh] rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-2xl backdrop-blur-xl sm:p-6 lg:min-h-[calc(100vh-120px)]"
            >
              <motion.div variants={wallVariants} className="relative flex h-full min-h-[640px] flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#d8d1c3] text-stone-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                <div className="absolute inset-0" style={{ background: selectedBackground.gradient }} />
                {selectedBackground.image && (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-[0.42]"
                    style={{ backgroundImage: `url(${selectedBackground.image})` }}
                    aria-hidden="true"
                  />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.74),rgba(255,255,255,0.2)_42%,rgba(70,55,35,0.28)),radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.55),transparent_26%)]" />
                <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(90deg,rgba(90,73,52,.22)_1px,transparent_1px),linear-gradient(rgba(90,73,52,.18)_1px,transparent_1px)] [background-size:38px_38px]" />

                <div className="relative z-10 flex flex-col gap-4 p-5 sm:p-8 lg:p-10">
                  <div className="absolute left-4 top-4 z-20 rounded-full border border-stone-950/10 bg-white/72 p-1 shadow-sm backdrop-blur-md">
                    <div className="flex items-center gap-1">
                      {backgroundPresets.map(background => (
                        <button
                          key={background.id}
                          type="button"
                          onClick={() => setBackgroundPresetId(background.id)}
                          className={`size-7 overflow-hidden rounded-full border transition ${
                            backgroundPresetId === background.id ? 'border-stone-950 ring-2 ring-white' : 'border-stone-300 hover:border-stone-700'
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
                    </div>
                  </div>

                  <div className="max-w-3xl pt-8 sm:pt-0">
                    <motion.p variants={rowVariants} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#6a5130]">
                      <Sparkles className="size-4" />
                      Menu3D · módulos de {MODULE_LENGTH_CM}cm
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
                          letterColor={selectedLetterColor}
                          editing={editing}
                          onPatch={patch => updateDraftLine(line.id, patch)}
                          reducedMotion={reducedMotion}
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
              <aside className="rounded-[1.5rem] border border-white/12 bg-[#f8f6f0] p-4 text-stone-950 shadow-2xl lg:max-h-[calc(100vh-40px)] lg:overflow-y-auto">
                <div className="flex items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1f5138]">Configuração</p>
                    <h2 className="mt-2 text-2xl font-bold">Menu3D à medida</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-600">Preço calculado pelos módulos de 25cm necessários para cada linha.</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setCartOpen(false)} aria-label="Fechar resumo">
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="mt-4 space-y-4">
                  <section className="rounded-2xl bg-white p-4 shadow-sm">
                    <Label className="text-sm font-bold">Templates</Label>
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
                  </section>

                  <section className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold">Largura do menu</Label>
                      <span className="text-sm text-stone-500">{displayQuote.globalWidthCm}cm</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-stone-200 p-2">
                      <Button type="button" variant="outline" size="icon" onClick={() => updateGlobalModuleCount(-1)} disabled={globalModuleCount <= MIN_GLOBAL_MODULES} aria-label="Diminuir largura do menu">
                        <Minus className="size-4" />
                      </Button>
                      <div className="text-center">
                        <p className="text-lg font-black">{globalModuleCount} módulos · {displayQuote.globalWidthCm}cm</p>
                        <p className="text-xs text-stone-500">máx. {MAX_GLOBAL_MODULES} módulos / {MAX_GLOBAL_MODULES * MODULE_LENGTH_CM}cm</p>
                      </div>
                      <Button type="button" variant="outline" size="icon" onClick={() => updateGlobalModuleCount(1)} disabled={globalModuleCount >= MAX_GLOBAL_MODULES} aria-label="Aumentar largura do menu">
                        <Plus className="size-4" />
                      </Button>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-stone-500">
                      Cada módulo tem {MODULE_LENGTH_CM}cm e acomoda cerca de {CHARS_PER_MODULE_ESTIMATE} caracteres. Todas as linhas usam a mesma largura.
                    </p>
                  </section>

                  <section className="rounded-2xl bg-white p-4 shadow-sm">
                    {query.isLoading ? (
                      <p className="text-sm text-stone-500">A carregar cores disponíveis...</p>
                    ) : (
                      <div className="grid gap-5">
                        {railColors.length > 0 ? (
                          <SwatchPicker label="Cor das calhas" colors={railColors} selected={selectedRailColor} onSelect={setRailColor} />
                        ) : (
                          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            As calhas ainda não têm cores configuradas.
                          </p>
                        )}
                        {letterColors.length > 0 ? (
                          <SwatchPicker label="Cor das letras" colors={letterColors} selected={selectedLetterColor} onSelect={setLetterColor} />
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
                  </section>

                  <section className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Bot className="size-4 text-[#1f5138]" />
                      <Label className="text-sm font-bold">Colar menu em texto</Label>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">Cole uma lista completa ou texto solto. O sistema transforma em linhas editáveis.</p>
                    <Textarea
                      value={assistantText}
                      onChange={event => setAssistantText(event.target.value)}
                      className="mt-3 min-h-24 border-stone-200 bg-[#fbfaf7] text-sm leading-6"
                      placeholder="ex: espresso 1,50, flat white 3,00"
                    />
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button type="button" onClick={handleAssistantFormat} className="bg-[#1f5138] text-white hover:bg-[#173d2a]">
                        <RefreshCw className="size-4" />
                        Gerar linhas
                      </Button>
                      <Button type="button" variant="outline" onClick={openRawEditor}>
                        <Edit3 className="size-4" />
                        Editor avançado
                      </Button>
                    </div>
                  </section>

                  <section className="rounded-2xl bg-white p-4 shadow-sm">
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
                          <span>Pack Standard {STANDARD_PACK_SIZE}</span>
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
                  </section>

                  <section className="rounded-2xl bg-white p-4 shadow-sm">
                    <Label htmlFor="custom-icon-request" className="text-sm font-bold">Ícone ou logótipo opcional</Label>
                    <Textarea
                      id="custom-icon-request"
                      value={customIconRequest}
                      onChange={event => setCustomIconRequest(event.target.value)}
                      maxLength={MENU_CUSTOM_ICON_MAX_CHARS + 50}
                      placeholder="Ex: incluir símbolo de Wi-Fi, logótipo simples ou ícone de café."
                      className="mt-3 min-h-20 border-stone-200 bg-[#fbfaf7]"
                    />
                    <p className="mt-2 text-xs text-stone-500">{customIconRequest.length}/{MENU_CUSTOM_ICON_MAX_CHARS} caracteres</p>
                  </section>

                  <section className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1f5138]">Resumo claro</p>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-stone-500">Módulos de 25cm</span><span>{displayQuote.totalRailModules} x {formatPrice(railModuleUnitPrice)}</span></div>
                      <div className="flex justify-between"><span className="text-stone-500">Pack Standard 300</span><span>{displayQuote.standardPackQuantity} x {formatPrice(standardPackUnitPrice)}</span></div>
                      <div className="flex justify-between"><span className="text-stone-500">Letras avulso</span><span>{displayQuote.avulsoCharacterQuantity} x {formatPrice(avulsoUnitPrice)}</span></div>
                      <div className="flex justify-between"><span className="text-stone-500">Linhas</span><span>{displayQuote.lineCount}</span></div>
                      <div className="flex justify-between"><span className="text-stone-500">Caracteres</span><span>{displayQuote.totalCharacters}</span></div>
                      <div className="flex justify-between border-t border-stone-200 pt-3"><span className="text-stone-500">Subtotal</span><span>{formatPrice(displayQuote.subtotalBeforeDiscount)}</span></div>
                      <div className="flex justify-between text-[#1f5138]"><span>Campanha de lançamento -20%</span><span>-{formatPrice(displayQuote.launchDiscountAmount)}</span></div>
                      <div className="flex justify-between pt-2 text-xl font-black"><span>Total</span><span>{formatPrice(displayQuote.totalAfterDiscount)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-stone-500">Entrega</span><span>{formatPrice(shippingCost)}</span></div>
                    </div>
                    <div className="mt-4 rounded-md bg-[#eef7f0] p-3 text-sm leading-6 text-[#1f5138]">
                      <Check className="mb-2 size-4" />
                      Campanha de lançamento: -20% no sistema completo.
                    </div>
                  </section>

                  <section className="rounded-2xl bg-white p-4 shadow-sm">
                    <h2 className="text-lg font-bold">Dados para finalizar</h2>
                    <div className="mt-4 grid gap-3">
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

                    <div className="mt-4 grid gap-2">
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
                      <div className="mt-3">
                        <Label htmlFor="shipping-address">Morada completa</Label>
                        <Input id="shipping-address" value={shippingAddress} onChange={event => setShippingAddress(event.target.value)} required className="mt-1" />
                      </div>
                    )}

                    <div className="mt-3">
                      <Label htmlFor="notes">Notas</Label>
                      <Input id="notes" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Prazo ideal ou detalhes de montagem" className="mt-1" />
                    </div>
                  </section>

                  {query.isLoading && <p className="text-sm text-stone-500">A carregar catálogo...</p>}
                  {!query.isLoading && !catalogReady && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Faltam componentes do Menu3D para finalizar a encomenda.
                    </p>
                  )}
                  {quoteErrors.length > 0 && (
                    <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{quoteErrors[0]}</p>
                  )}
                  {checkoutBlockedByDraft && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Guarda as alterações antes de finalizar.</p>
                  )}
                  {error && (
                    <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting || checkoutBlockedByDraft || query.isLoading || !catalogReady || quoteErrors.length > 0 || displayQuote.totalRailModules < 1}
                    className="h-12 w-full bg-[#1f5138] text-white hover:bg-[#173d2a]"
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

      <section className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#1f5138]">Exemplos de uso</p>
            <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight">A mesma base para vários interiores.</h2>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {productExamples.map(example => (
              <article key={example.title} className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                <div className="relative aspect-[4/3]">
                  <Image src={example.image} alt={example.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold">{example.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{example.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

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

      <Dialog open={rawEditorOpen} onOpenChange={setRawEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Colar menu em texto</DialogTitle>
            <DialogDescription>Uma linha por item. Ao aplicar, o texto passa para linhas editáveis e continua a gerar a mesma cotação.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rawDraft}
            onChange={event => setRawDraft(event.target.value)}
            className="min-h-72 font-mono"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRawEditorOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={applyRawEditor}>Aplicar texto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </main>
  )
}
