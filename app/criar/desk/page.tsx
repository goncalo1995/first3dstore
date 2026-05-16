'use client'

import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Bug,
  Check,
  Cable,
  Grid3X3,
  Info,
  Layers3,
  Maximize2,
  Plus,
  RotateCw,
  Save,
  Send,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  DESK_SCHEMA_VERSION,
  DESK_STORAGE_KEY,
  deskColors,
  deskPresets,
  deskProducts,
  getDefaultCustomConfig,
  getDeskItemCustomOptionSummaries,
  getDeskItemFootprint,
  getDeskProduct,
} from '@/lib/desk/products'
import { calculateDeskPricing, getDeskItemPrice } from '@/lib/desk/pricing'
import type { DeskColorName, DeskCustomFieldDefinition, DeskItem, DeskProductCategory, DeskProductDefinition, DeskRotation, DeskSetup, DeskSurface } from '@/lib/desk/types'
import {
  clampItemToDesk,
  deskDimensionLimits,
  getAllDeskSetupItems,
  getDeskItemsForSurface,
  normalizeDeskSetupColors,
  snapItemToGrid,
  validateDeskSetup,
} from '@/lib/desk/validation'

const ONBOARDING_STORAGE_KEY = 'em3d-desk-onboarding-dismissed-v1'
const surfaceLabels: Record<DeskSurface, string> = {
  top: 'Em cima da secretária',
  under: 'Por baixo da secretária',
}
const categoryFilters: Array<DeskProductCategory | 'Todos'> = ['Todos', 'Carregamento', 'Organização', 'Arrumação', 'Áudio', 'Gestão de cabos']
const quoteTrustPoints = [
  'Sem pagamento automático',
  'Revemos o teu setup antes da produção',
  'Recebes confirmação de preço e prazo',
]
const quoteNextSteps = [
  'Pedido recebido',
  'Revisão manual do setup',
  'Confirmação de preço/prazo',
  'Produção após aprovação',
]

const defaultSetup = (): DeskSetup => {
  const now = new Date().toISOString()
  return {
    type: 'desk-setup',
    schemaVersion: DESK_SCHEMA_VERSION,
    surface: 'top',
    mode: 'view',
    desk: {
      widthCm: 120,
      depthCm: 70,
      surfaceColor: 'walnut',
      showGrid: true,
      snapToGrid: true,
      snapSizeCm: 5,
    },
    topItems: [],
    underItems: [],
    createdAt: now,
    updatedAt: now,
  }
}

const starterTemplates = [
  {
    id: 'gaming',
    label: 'Setup Gaming',
    description: 'Auscultadores, carregamento e cabos escondidos.',
    items: [
      { productId: 'magsafe_dock_v1', surface: 'top', xCm: 8, yCm: 8 },
      { productId: 'headphone_stand_v1', surface: 'top', xCm: 95, yCm: 10 },
      { productId: 'cable_tray_v1', surface: 'under', xCm: 36, yCm: 8 },
      { productId: 'headphone_hook_under_v1', surface: 'under', xCm: 104, yCm: 8 },
    ],
  },
  {
    id: 'creator',
    label: 'Criador de Conteúdo',
    description: 'Organização visível com cabos e transformadores controlados.',
    items: [
      { productId: 'magsafe_dock_v1', surface: 'top', xCm: 10, yCm: 10 },
      { productId: 'pen_holder_v1', surface: 'top', xCm: 30, yCm: 10 },
      { productId: 'desk_tray_v1', surface: 'top', xCm: 45, yCm: 10 },
      { productId: 'power_brick_mount_v1', surface: 'under', xCm: 52, yCm: 14 },
    ],
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Poucas peças, muito controlo visual.',
    items: [
      { productId: 'magsafe_dock_v1', surface: 'top', xCm: 14, yCm: 12 },
      { productId: 'cable_clip_v1', surface: 'under', xCm: 48, yCm: 12 },
    ],
  },
  {
    id: 'home-office',
    label: 'Home Office',
    description: 'Arrumação discreta para trabalho diário.',
    items: [
      { productId: 'pen_holder_v1', surface: 'top', xCm: 14, yCm: 12 },
      { productId: 'desk_tray_v1', surface: 'top', xCm: 28, yCm: 12 },
      { productId: 'under_desk_drawer_v1', surface: 'under', xCm: 18, yCm: 10 },
      { productId: 'cable_tray_v1', surface: 'under', xCm: 60, yCm: 10 },
    ],
  },
  {
    id: 'cable-management',
    label: 'Gestão de Cabos',
    description: 'Começa por limpar tudo o que fica por baixo.',
    items: [
      { productId: 'cable_tray_v1', surface: 'under', xCm: 34, yCm: 8 },
      { productId: 'cable_clip_v1', surface: 'under', xCm: 18, yCm: 20 },
      { productId: 'power_brick_mount_v1', surface: 'under', xCm: 74, yCm: 18 },
    ],
  },
] as const

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
}

function trackDeskStudioEvent(event: string, details?: Record<string, string | number | boolean | undefined>) {
  if (process.env.NODE_ENV !== 'development') return
  console.info('[Desk Studio]', event, details ?? {})
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `item_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function isColorName(value: string): value is DeskColorName {
  return value in deskColors
}

function colorHex(value: string | undefined, fallback: DeskColorName) {
  const colorName = value && isColorName(value) ? value : fallback
  return deskColors[colorName].hex
}

function getCustomValue(item: DeskItem, field: DeskCustomFieldDefinition) {
  if (!item.customConfig || typeof item.customConfig !== 'object' || Array.isArray(item.customConfig)) {
    return field.defaultValue
  }
  return item.customConfig[field.key] ?? field.defaultValue
}

function hasCustomPriceOptions(product: DeskProductDefinition) {
  return (product.customFields ?? []).some((field) => (
    field.type === 'number'
      ? Boolean(field.priceAdd)
      : field.type !== 'boolean' && field.options.some((option) => Boolean(option.priceAdd))
  ))
}

function optionSummaryText(item: DeskItem) {
  return getDeskItemCustomOptionSummaries(item)
    .map((option) => `${option.label}: ${option.valueLabel}`)
    .join(' · ')
}

function previewItem(product: DeskProductDefinition): DeskItem {
  return {
    id: `preview-${product.productId}`,
    productId: product.productId,
    xCm: 0,
    yCm: 0,
    rotation: 0,
    customConfig: getDefaultCustomConfig(product),
  }
}

function ProductVisual({
  item,
  product,
  selected,
  focused,
  compact = false,
}: {
  item: DeskItem
  product: DeskProductDefinition
  selected: boolean
  focused: boolean
  compact?: boolean
}) {
  const baseHex = colorHex(item.colorBase, product.defaultColors.base)
  const accentHex = colorHex(item.colorAccent, product.defaultColors.accent)
  const shellClass = cn(
    'relative h-full w-full overflow-hidden border transition-[border-color,box-shadow,filter] duration-200',
    product.preview.shape === 'circle' ? 'rounded-full' : 'rounded-md',
    selected ? 'border-primary shadow-[0_0_0_2px_rgba(163,255,18,0.34),0_16px_42px_rgba(0,0,0,0.45)]' : 'border-white/18 shadow-[0_16px_36px_rgba(0,0,0,0.35)]',
    focused && 'shadow-[0_0_0_3px_rgba(163,255,18,0.28),0_24px_70px_rgba(163,255,18,0.14)]',
  )
  const detailScale = compact ? 'scale-90' : 'scale-100'

  if (product.preview.shape === 'circle') {
    return (
      <div className={shellClass} style={{ background: `radial-gradient(circle at 42% 34%, rgba(255,255,255,0.26), transparent 18%), radial-gradient(circle at center, ${baseHex} 0%, ${baseHex} 52%, rgba(0,0,0,0.55) 100%)` }}>
        <div className="absolute inset-[12%] rounded-full border border-white/26 bg-black/18 shadow-inner" />
        <div className="absolute inset-[28%] rounded-full border border-black/30" style={{ background: `radial-gradient(circle, ${accentHex} 0 9%, transparent 10% 100%)` }} />
        <div className={cn('absolute left-[30%] top-[20%] h-[42%] w-[10%] rounded-full bg-white/70 shadow-sm', detailScale)} />
        <div className={cn('absolute left-[48%] top-[18%] h-[48%] w-[10%] rounded-full shadow-sm', detailScale)} style={{ backgroundColor: accentHex }} />
        <div className={cn('absolute left-[62%] top-[26%] h-[34%] w-[8%] rounded-full bg-white/45 shadow-sm', detailScale)} />
      </div>
    )
  }

  if (product.preview.shape === 'tray') {
    return (
      <div className={shellClass} style={{ background: `linear-gradient(135deg, ${baseHex}, rgba(255,255,255,0.08))` }}>
        <div className="absolute inset-[9%] rounded-[inherit] border border-black/36 bg-black/22 shadow-[inset_0_3px_12px_rgba(0,0,0,0.42)]" />
        <div className="absolute inset-x-[18%] top-[22%] h-px bg-white/30" />
        <div className="absolute inset-x-[18%] bottom-[22%] h-px bg-black/36" />
        <div className="absolute right-[12%] top-[16%] h-[68%] w-[8%] rounded-full" style={{ background: `linear-gradient(${accentHex}, rgba(255,255,255,0.18))` }} />
      </div>
    )
  }

  if (product.preview.shape === 'rail') {
    return (
      <div className={shellClass} style={{ background: `linear-gradient(135deg, ${baseHex}, rgba(255,255,255,0.08))` }}>
        <div className="absolute inset-x-[8%] top-[28%] h-[44%] rounded-full border border-white/18 bg-black/28 shadow-inner" />
        <div className="absolute left-[13%] top-[42%] h-[16%] w-[74%] rounded-full" style={{ backgroundColor: accentHex }} />
        <div className="absolute left-[8%] top-[18%] h-[64%] w-px bg-white/25" />
        <div className="absolute right-[8%] top-[18%] h-[64%] w-px bg-white/25" />
      </div>
    )
  }

  if (product.preview.shape === 'clip') {
    return (
      <div className={shellClass} style={{ background: `linear-gradient(135deg, ${baseHex}, rgba(255,255,255,0.08))` }}>
        <div className="absolute inset-[18%] rounded-full border-[4px] border-white/18 border-r-transparent" />
        <div className="absolute inset-y-[28%] right-[18%] w-[18%] rounded-full" style={{ backgroundColor: accentHex }} />
      </div>
    )
  }

  if (product.preview.shape === 'brick') {
    return (
      <div className={shellClass} style={{ background: `linear-gradient(135deg, ${baseHex}, rgba(255,255,255,0.08))` }}>
        <div className="absolute inset-[15%] rounded-md border border-white/22 bg-black/28" />
        <div className="absolute left-[22%] top-[30%] h-[40%] w-[56%] rounded-sm border border-white/14 bg-black/22" />
        <div className="absolute left-[18%] top-[45%] h-[10%] w-[64%] rounded-full" style={{ backgroundColor: accentHex }} />
      </div>
    )
  }

  if (product.preview.shape === 'drawer') {
    return (
      <div className={shellClass} style={{ background: `linear-gradient(135deg, ${baseHex}, rgba(255,255,255,0.08))` }}>
        <div className="absolute inset-[10%] rounded-md border border-white/22 bg-black/22 shadow-inner" />
        <div className="absolute inset-x-[22%] top-[24%] h-px bg-white/24" />
        <div className="absolute left-[42%] bottom-[22%] h-[12%] w-[16%] rounded-full" style={{ backgroundColor: accentHex }} />
      </div>
    )
  }

  if (product.preview.shape === 'hook') {
    return (
      <div className={shellClass} style={{ background: `linear-gradient(135deg, ${baseHex}, rgba(255,255,255,0.06))` }}>
        <div className="absolute left-[20%] top-[18%] h-[64%] w-[18%] rounded-full bg-white/12 shadow-inner" />
        <div className="absolute left-[29%] top-[20%] h-[58%] w-[16%] rounded-full" style={{ backgroundColor: accentHex }} />
        <div className="absolute bottom-[18%] left-[34%] h-[18%] w-[44%] rounded-full border border-white/18 bg-black/32" />
        <div className="absolute bottom-[26%] right-[18%] h-[34%] w-[26%] rounded-br-full rounded-tr-full border-b-[5px] border-r-[5px]" style={{ borderColor: accentHex }} />
      </div>
    )
  }

  return (
    <div className={shellClass} style={{ background: `linear-gradient(135deg, ${baseHex}, rgba(255,255,255,0.09))` }}>
      <div className="absolute inset-[16%] rounded-[inherit] border border-white/18 bg-black/18" />
      <div className="absolute left-[20%] top-[22%] h-[58%] w-[36%] rounded-sm border border-white/30 bg-black/28 shadow-[inset_0_0_12px_rgba(255,255,255,0.12)]" />
      <div className="absolute left-[29%] top-[34%] h-[28%] w-[18%] rounded-full border-2" style={{ borderColor: accentHex }} />
      <div className="absolute left-[58%] top-[18%] h-[64%] w-[18%] rounded-full bg-white/14" />
      <div className="absolute left-[66%] top-[30%] h-[40%] w-[6%] rounded-full" style={{ backgroundColor: accentHex }} />
    </div>
  )
}

function DeskProductShape(props: {
  item: DeskItem
  product: DeskProductDefinition
  selected: boolean
  focused: boolean
}) {
  return <ProductVisual {...props} />
}

export default function DeskBuilderPage() {
  const [setup, setSetup] = useState<DeskSetup>(() => defaultSetup())
  const [loadWarning, setLoadWarning] = useState('')
  const [canvasSize, setCanvasSize] = useState({ width: 960, height: 560 })
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false)
  const [quoteError, setQuoteError] = useState('')
  const [quoteSuccess, setQuoteSuccess] = useState('')
  const [quoteForm, setQuoteForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    notes: '',
  })
  const [categoryFilter, setCategoryFilter] = useState<DeskProductCategory | 'Todos'>('Todos')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{
    itemId: string
    pointerId: number
    startClientX: number
    startClientY: number
    startX: number
    startY: number
  } | null>(null)

  const activeItems = getDeskItemsForSurface(setup, setup.surface)
  const allItems = getAllDeskSetupItems(setup)
  const selectedItem = allItems.find((item) => item.id === setup.selectedItemId)
  const selectedProduct = selectedItem ? getDeskProduct(selectedItem.productId) : undefined
  const selectedFootprint = selectedItem ? getDeskItemFootprint(selectedItem) : null
  const selectedPrice = selectedItem ? getDeskItemPrice(selectedItem) : 0
  const validation = useMemo(() => validateDeskSetup(setup), [setup])
  const pricing = useMemo(() => calculateDeskPricing({ items: allItems } as Pick<DeskSetup, 'items'>), [allItems])
  const maxZ = useMemo(() => Math.max(0, ...allItems.map((item) => item.zIndex ?? 0)), [allItems])
  const productGroups = useMemo(() => (
    Array.from(
      deskProducts
        .filter((product) => product.validation.allowedSurfaces.includes(setup.surface))
        .filter((product) => categoryFilter === 'Todos' || product.category === categoryFilter)
        .reduce((groups, product) => {
        const products = groups.get(product.category) ?? []
        products.push(product)
        groups.set(product.category, products)
        return groups
      }, new Map<string, DeskProductDefinition[]>()),
    )
  ), [setup.surface, categoryFilter])
  const setupItemSummaries = useMemo(() => (
    allItems.map((item) => {
      const product = getDeskProduct(item.productId)
      const footprint = getDeskItemFootprint(item)
      return {
        item,
        product,
        footprint,
        price: getDeskItemPrice(item),
        options: optionSummaryText(item),
      }
    })
  ), [allItems])
  const scale = Math.min(canvasSize.width / setup.desk.widthCm, canvasSize.height / setup.desk.depthCm)
  const deskWidthPx = setup.desk.widthCm * scale
  const deskDepthPx = setup.desk.depthCm * scale

  useEffect(() => {
    try {
      setShowOnboarding(window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== 'true')
      const saved = window.localStorage.getItem(DESK_STORAGE_KEY) ?? window.localStorage.getItem('em3d-desk-setup-v1')
      if (!saved) return
      const parsed = JSON.parse(saved) as DeskSetup
      const normalized = normalizeDeskSetupColors(parsed)
      const result = validateDeskSetup(normalized.setup)
      if (!result.valid) {
        setLoadWarning('Encontrámos um setup antigo ou inválido. Começámos com uma secretária limpa para proteger o teu pedido.')
        return
      }
      if (normalized.warnings.length) {
        setLoadWarning(normalized.warnings.join(' '))
      }
      setSetup(normalized.setup)
      window.localStorage.setItem(DESK_STORAGE_KEY, JSON.stringify(normalized.setup))
    } catch {
      setLoadWarning('Não foi possível recuperar o setup guardado neste dispositivo. Começámos com uma secretária limpa.')
    }
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      setCanvasSize({
        width: Math.max(320, entry.contentRect.width - 32),
        height: Math.max(320, entry.contentRect.height - 32),
      })
    })

    observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false
      return Boolean(
        target.isContentEditable ||
        target.closest('input, textarea, select, [contenteditable="true"], [role="switch"], [role="combobox"], [data-ignore-shortcuts]'),
      )
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return

      if (event.key === 'Escape') {
        event.preventDefault()
        if (setup.mode === 'focus') {
          closeFocus()
          return
        }
        mutateSetup((current) => ({ ...current, selectedItemId: undefined, mode: current.mode === 'view' ? 'view' : 'edit' }))
        return
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedItem && setup.mode === 'edit') {
        event.preventDefault()
        removeSelected()
        return
      }

      if (event.key.toLowerCase() === 'r' && selectedItem && setup.mode !== 'view') {
        event.preventDefault()
        rotateSelected()
        return
      }

      if (event.key.toLowerCase() === 'g') {
        event.preventDefault()
        updateDesk({ showGrid: !setup.desk.showGrid })
        return
      }

      if (event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveSetup()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItem, setup.desk.showGrid, setup.mode, setup])

  function mutateSetup(updater: (current: DeskSetup) => DeskSetup) {
    setSetup((current) => {
      const next = updater(current)
      return { ...next, updatedAt: new Date().toISOString() }
    })
  }

  function saveSetup() {
    window.localStorage.setItem(DESK_STORAGE_KEY, JSON.stringify(setup))
  }

  function resetSetup() {
    const next = defaultSetup()
    setSetup(next)
    setLoadWarning('')
    try {
      window.localStorage.removeItem(DESK_STORAGE_KEY)
    } catch {
      // localStorage can fail in private modes; state reset still works.
    }
  }

  function dismissOnboarding() {
    setShowOnboarding(false)
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
  }

  function exportDebugJson() {
    const payload = JSON.stringify({ setup, validation, pricing }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `em3d-desk-setup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function openQuoteModal() {
    trackDeskStudioEvent('quote_modal_opened', {
      topItems: setup.topItems.length,
      underItems: setup.underItems.length,
      warnings: validation.warnings.length,
      hasErrors: validation.errors.length > 0,
    })
    setQuoteOpen(true)
  }

  function switchSurface(surface: DeskSurface) {
    trackDeskStudioEvent('surface_switched', { surface })
    mutateSetup((current) => ({ ...current, surface, selectedItemId: undefined, mode: current.mode === 'view' ? 'view' : 'edit' }))
  }

  function quoteFailureMessage(error: unknown) {
    if (error instanceof TypeError) {
      return 'Falha de ligação. O teu setup continua guardado neste ecrã; tenta novamente dentro de momentos.'
    }
    if (error instanceof Error && error.message) return error.message
    return 'Não foi possível enviar o pedido. O teu setup não foi perdido; tenta novamente.'
  }

  async function submitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmittingQuote) return

    setQuoteError('')
    setQuoteSuccess('')

    if (allItems.length === 0) {
      setQuoteError('Adiciona pelo menos uma peça antes de pedir orçamento. O teu setup continua guardado.')
      trackDeskStudioEvent('quote_failed', { reason: 'empty_setup' })
      return
    }

    if (validation.errors.length > 0) {
      setQuoteError('Há detalhes do setup para rever antes do pedido. Corrige os avisos assinalados e tenta novamente.')
      trackDeskStudioEvent('quote_failed', { reason: 'invalid_setup', errors: validation.errors.length })
      return
    }

    setIsSubmittingQuote(true)

    try {
      const response = await fetch('/api/desk/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...quoteForm,
          setup,
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || payload.success !== true) {
        const fieldMessage = payload.fieldErrors
          ? Object.values(payload.fieldErrors as Record<string, string>).join(' ')
          : ''
        throw new Error(fieldMessage || payload.message || 'Não foi possível enviar o pedido. O teu setup não foi perdido; tenta novamente.')
      }

      saveSetup()
      setQuoteSuccess(payload.message || 'Pedido enviado para revisão.')
      trackDeskStudioEvent('quote_submitted_successfully', {
        topItems: setup.topItems.length,
        underItems: setup.underItems.length,
        total: pricing.totalPrice,
      })
    } catch (error) {
      setQuoteError(quoteFailureMessage(error))
      trackDeskStudioEvent('quote_failed', {
        hasValidationErrors: validation.errors.length > 0,
        topItems: setup.topItems.length,
        underItems: setup.underItems.length,
      })
    } finally {
      setIsSubmittingQuote(false)
    }
  }

  function setMode(mode: DeskSetup['mode']) {
    mutateSetup((current) => ({
      ...current,
      mode,
      selectedItemId: mode === 'view' ? undefined : current.selectedItemId,
    }))
  }

  function mapSurfaceItems(current: DeskSetup, surface: DeskSurface, mapper: (items: DeskItem[]) => DeskItem[]) {
    return surface === 'top'
      ? { ...current, topItems: mapper(current.topItems) }
      : { ...current, underItems: mapper(current.underItems) }
  }

  function bringToFront(itemId: string, mode: DeskSetup['mode'] = setup.mode) {
    mutateSetup((current) => ({
      ...current,
      mode,
      selectedItemId: itemId,
      topItems: current.topItems.map((item) => (
        item.id === itemId ? { ...item, zIndex: maxZ + 1 } : item
      )),
      underItems: current.underItems.map((item) => (
        item.id === itemId ? { ...item, zIndex: maxZ + 1 } : item
      )),
    }))
  }

  function addProduct(product: DeskProductDefinition) {
    const surface = setup.surface
    if (!product.validation.allowedSurfaces.includes(surface)) return
    const quantity = getDeskItemsForSurface(setup, surface).filter((item) => item.productId === product.productId).length
    if (product.validation.maxQuantity && quantity >= product.validation.maxQuantity) return

    const customConfig = getDefaultCustomConfig(product)
    const footprint = getDeskItemFootprint({
      id: 'new',
      productId: product.productId,
      xCm: 0,
      yCm: 0,
      rotation: 0,
      customConfig,
    }) ?? { width: 0, depth: 0 }

    const item: DeskItem = {
      id: newId(),
      productId: product.productId,
      xCm: setup.desk.widthCm / 2 - footprint.width / 2,
      yCm: setup.desk.depthCm / 2 - footprint.depth / 2,
      rotation: 0,
      zIndex: maxZ + 1,
      colorBase: product.defaultColors.base,
      colorAccent: product.defaultColors.accent,
      customConfig,
    }

    const placedItem = snapItemToGrid(clampItemToDesk(item, setup.desk), setup.desk)
    mutateSetup((current) => ({
      ...mapSurfaceItems(current, surface, (items) => [...items, placedItem]),
      surface,
      mode: 'edit',
      selectedItemId: placedItem.id,
    }))
    trackDeskStudioEvent('product_added', { productId: product.productId, surface })
    setCatalogOpen(false)
  }

  function updateDesk(patch: Partial<DeskSetup['desk']>) {
    mutateSetup((current) => ({
      ...current,
      desk: { ...current.desk, ...patch },
      topItems: current.topItems.map((item) => clampItemToDesk(item, { ...current.desk, ...patch })),
      underItems: current.underItems.map((item) => clampItemToDesk(item, { ...current.desk, ...patch })),
    }))
  }

  function updateSelectedItem(patch: Partial<DeskItem>) {
    if (!selectedItem) return
    mutateSetup((current) => ({
      ...current,
      topItems: current.topItems.map((item) => (
        item.id === selectedItem.id ? clampItemToDesk({ ...item, ...patch }, current.desk) : item
      )),
      underItems: current.underItems.map((item) => (
        item.id === selectedItem.id ? clampItemToDesk({ ...item, ...patch }, current.desk) : item
      )),
    }))
  }

  function updateSelectedCustomField(key: string, value: unknown) {
    if (!selectedItem) return
    trackDeskStudioEvent('product_customized', {
      productId: selectedItem.productId,
      field: key,
    })
    updateSelectedItem({
      customConfig: {
        ...(selectedItem.customConfig ?? {}),
        [key]: value,
      },
    })
  }

  function rotateSelected() {
    if (!selectedItem) return
    const rotations: DeskRotation[] = [0, 90, 180, 270]
    const nextRotation = rotations[(rotations.indexOf(selectedItem.rotation) + 1) % rotations.length]
    updateSelectedItem({ rotation: nextRotation })
  }

  function removeSelected() {
    if (!selectedItem) return
    mutateSetup((current) => ({
      ...current,
      mode: current.mode === 'focus' ? 'edit' : current.mode,
      selectedItemId: undefined,
      topItems: current.topItems.filter((item) => item.id !== selectedItem.id),
      underItems: current.underItems.filter((item) => item.id !== selectedItem.id),
    }))
    setFocusOpen(false)
  }

  function startFocus(itemId: string) {
    bringToFront(itemId, 'focus')
    setFocusOpen(true)
  }

  function closeFocus() {
    mutateSetup((current) => ({ ...current, mode: 'edit' }))
    setFocusOpen(false)
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>, item: DeskItem) {
    if (setup.mode === 'view') return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      itemId: item.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: item.xCm,
      startY: item.yCm,
    }
    bringToFront(item.id, setup.mode === 'focus' ? 'focus' : 'edit')
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaXcm = (event.clientX - drag.startClientX) / scale
    const deltaYcm = (event.clientY - drag.startClientY) / scale
    const nextX = drag.startX + deltaXcm
    const nextY = drag.startY + deltaYcm

    setSetup((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      topItems: current.topItems.map((item) => (
        item.id === drag.itemId
          ? clampItemToDesk({ ...item, xCm: nextX, yCm: nextY }, current.desk)
          : item
      )),
      underItems: current.underItems.map((item) => (
        item.id === drag.itemId
          ? clampItemToDesk({ ...item, xCm: nextX, yCm: nextY }, current.desk)
          : item
      )),
    }))
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null

    mutateSetup((current) => ({
      ...current,
      topItems: current.topItems.map((item) => (
        item.id === drag.itemId ? snapItemToGrid(item, current.desk) : item
      )),
      underItems: current.underItems.map((item) => (
        item.id === drag.itemId ? snapItemToGrid(item, current.desk) : item
      )),
    }))
  }

  function createTemplateItem(productId: string, xCm: number, yCm: number): DeskItem | null {
    const product = getDeskProduct(productId)
    if (!product) return null
    const item: DeskItem = {
      id: newId(),
      productId,
      xCm,
      yCm,
      rotation: 0,
      zIndex: maxZ + 1,
      colorBase: product.defaultColors.base,
      colorAccent: product.defaultColors.accent,
      customConfig: getDefaultCustomConfig(product),
    }
    return clampItemToDesk(item, setup.desk)
  }

  function applyTemplate(template: typeof starterTemplates[number]) {
    if (allItems.length > 0 && !window.confirm('Este template substitui os produtos atuais. Queres continuar?')) return
    const topItems = template.items
      .filter((item) => item.surface === 'top')
      .map((item) => createTemplateItem(item.productId, item.xCm, item.yCm))
      .filter(Boolean) as DeskItem[]
    const underItems = template.items
      .filter((item) => item.surface === 'under')
      .map((item) => createTemplateItem(item.productId, item.xCm, item.yCm))
      .filter(Boolean) as DeskItem[]

    mutateSetup((current) => ({
      ...current,
      mode: 'edit',
      surface: template.id === 'cable-management' ? 'under' : 'top',
      selectedItemId: undefined,
      topItems,
      underItems,
    }))
    trackDeskStudioEvent('template_applied', { templateId: template.id, topItems: topItems.length, underItems: underItems.length })
  }

  function startFromZero() {
    if (allItems.length > 0 && !window.confirm('Queres remover os produtos atuais e começar do zero?')) return
    mutateSetup((current) => ({
      ...current,
      mode: 'edit',
      selectedItemId: undefined,
      topItems: [],
      underItems: [],
    }))
  }

  const productCatalog = (
    <div className="space-y-5">
      <div className="rounded-lg border border-white/10 bg-white/7 p-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Catálogo ativo</p>
        <p className="mt-1 text-sm font-black text-white">{surfaceLabels[setup.surface]}</p>
        {setup.surface === 'under' && (
          <p className="mt-2 flex items-center gap-2 text-xs leading-5 text-primary">
            <Cable className="size-3.5" />
            Produtos focados em gestão de cabos e arrumação discreta.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {categoryFilters.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-bold',
                categoryFilter === category ? 'border-primary bg-primary text-primary-foreground' : 'border-white/10 bg-black/22 text-white/58',
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      {productGroups.map(([category, products]) => (
        <section key={category} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-primary">{category}</h3>
            <span className="h-px flex-1 bg-white/10" />
          </div>
          {products.map((product) => {
            const quantity = activeItems.filter((item) => item.productId === product.productId).length
            const disabled = Boolean(product.validation.maxQuantity && quantity >= product.validation.maxQuantity)
            const itemPreview = previewItem(product)
            const footprint = getDeskItemFootprint(itemPreview)
            const fromPrice = hasCustomPriceOptions(product)
            const defaultOptions = optionSummaryText(itemPreview)
            return (
              <article key={product.productId} className="rounded-lg border border-white/10 bg-linear-to-br from-white/10 to-white/4 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
                <div className="flex gap-3">
                  <div className="h-16 w-20 shrink-0 rounded-md border border-white/10 bg-black/24 p-2" aria-hidden="true">
                    <ProductVisual item={itemPreview} product={product} selected={false} focused={false} compact />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-base font-black text-white">{product.name}</h4>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/42">{fromPrice ? 'A partir de' : 'Preço'}</p>
                        <p className="text-sm font-black text-white">{formatPrice(getDeskItemPrice(itemPreview))}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-white/58">{product.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-white/58">
                  <span className="rounded-full border border-white/10 bg-black/22 px-2 py-1">{footprint?.width ?? 0} x {footprint?.depth ?? 0}cm</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/22 px-2 py-1">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: deskColors[product.defaultColors.base].hex }} />
                    {product.defaultColors.base}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/22 px-2 py-1">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: deskColors[product.defaultColors.accent].hex }} />
                    {product.defaultColors.accent}
                  </span>
                </div>
                {defaultOptions && <p className="mt-2 text-xs leading-5 text-white/42">{defaultOptions}</p>}
                <Button
                  type="button"
                  onClick={() => addProduct(product)}
                  disabled={disabled}
                  className="mt-4 h-10 w-full bg-primary font-bold text-primary-foreground hover:bg-primary/90"
                  aria-label={`${disabled ? 'Limite atingido para' : 'Adicionar'} ${product.name}`}
                >
                  <Plus className="size-4" />
                  {disabled ? 'Limite atingido' : 'Adicionar'}
                </Button>
              </article>
            )
          })}
        </section>
      ))}
    </div>
  )

  const setupControls = (
    <div className="space-y-5">
      <section className="rounded-lg border border-white/10 bg-white/7 p-4">
        <p className="text-sm font-black text-white">Superfície</p>
        <div className="mt-3 grid gap-2">
          {(['top', 'under'] as DeskSurface[]).map((surface) => (
            <button
              key={surface}
              type="button"
              onClick={() => switchSurface(surface)}
              className={cn(
                'min-h-11 rounded-md border px-3 text-left text-sm font-bold transition',
                setup.surface === surface ? 'border-primary bg-primary text-primary-foreground' : 'border-white/10 bg-black/20 text-white/66 hover:border-white/24',
              )}
            >
              {surfaceLabels[surface]}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/7 p-4">
        <p className="text-sm font-black text-white">Dimensões</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {deskPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => updateDesk({ widthCm: preset.widthCm, depthCm: preset.depthCm })}
              className={cn(
                'min-h-11 rounded-md border px-2 text-xs font-bold transition',
                setup.desk.widthCm === preset.widthCm && setup.desk.depthCm === preset.depthCm
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-white/10 bg-black/20 text-white/66 hover:border-white/24 hover:text-white',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="desk-width" className="text-white/70">Largura</Label>
            <Input
              id="desk-width"
              type="number"
              min={deskDimensionLimits.width.min}
              max={deskDimensionLimits.width.max}
              value={setup.desk.widthCm}
              onChange={(event) => updateDesk({ widthCm: Number(event.target.value) })}
              className="mt-2 border-white/10 bg-black/30 text-white"
            />
          </div>
          <div>
            <Label htmlFor="desk-depth" className="text-white/70">Profundidade</Label>
            <Input
              id="desk-depth"
              type="number"
              min={deskDimensionLimits.depth.min}
              max={deskDimensionLimits.depth.max}
              value={setup.desk.depthCm}
              onChange={(event) => updateDesk({ depthCm: Number(event.target.value) })}
              className="mt-2 border-white/10 bg-black/30 text-white"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/7 p-4">
        <p className="text-sm font-black text-white">Grelha e snap</p>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="show-grid" className="text-white/70">Mostrar grelha</Label>
            <Switch id="show-grid" checked={setup.desk.showGrid} onCheckedChange={(checked) => updateDesk({ showGrid: checked })} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="snap-grid" className="text-white/70">Snap à grelha</Label>
            <Switch id="snap-grid" checked={setup.desk.snapToGrid} onCheckedChange={(checked) => updateDesk({ snapToGrid: checked })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[5, 10].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => updateDesk({ snapSizeCm: value as 5 | 10 })}
                className={cn(
                  'min-h-10 rounded-md border text-sm font-bold',
                  setup.desk.snapSizeCm === value ? 'border-primary bg-primary text-primary-foreground' : 'border-white/10 bg-black/20 text-white/62',
                )}
              >
                {value} cm
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/7 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-white">Pronto para orçamento</p>
          <span className="rounded-full border border-white/10 bg-black/24 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/52">{allItems.length} produtos</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-white/10 bg-black/20 p-2">
            <p className="text-white/42">Em cima</p>
            <p className="text-lg font-black text-white">{setup.topItems.length}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 p-2">
            <p className="text-white/42">Por baixo</p>
            <p className="text-lg font-black text-white">{setup.underItems.length}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 p-2">
            <p className="text-white/42">Avisos</p>
            <p className="text-lg font-black text-white">{validation.warnings.length}</p>
          </div>
          <div className="rounded-md border border-primary/20 bg-primary/10 p-2">
            <p className="text-white/42">Total</p>
            <p className="text-lg font-black text-primary">{formatPrice(pricing.totalPrice)}</p>
          </div>
        </div>
        <Button type="button" onClick={openQuoteModal} className="mt-3 h-10 w-full bg-white font-bold text-[#09090b] hover:bg-white/90">
          <Send className="size-4" />
          Pedir orçamento
        </Button>
        <div className="mt-3 grid gap-2 text-xs leading-5 text-white/58">
          {quoteTrustPoints.map((point) => (
            <div key={point} className="flex items-center gap-2 rounded-md border border-white/10 bg-black/18 px-2.5 py-2">
              <Check className="size-3.5 shrink-0 text-primary" />
              {point}
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {setupItemSummaries.length === 0 ? (
            <div className="rounded-md border border-dashed border-white/14 bg-black/18 p-3 text-sm leading-5 text-white/54">
              Ainda não há produtos na secretária.
            </div>
          ) : (
            setupItemSummaries.map(({ item, product, footprint, price, options }) => (
              <button
                key={item.id}
                type="button"
                onClick={() => bringToFront(item.id, setup.mode === 'view' ? 'edit' : setup.mode)}
                className={cn(
                  'w-full rounded-md border p-3 text-left transition',
                  item.id === setup.selectedItemId ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/18 hover:border-white/22',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{product?.name ?? item.productId}</p>
                    <p className="mt-1 text-xs text-white/45">{footprint?.width ?? 0} x {footprint?.depth ?? 0}cm · x {item.xCm.toFixed(0)} / y {item.yCm.toFixed(0)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-white">{formatPrice(price)}</p>
                </div>
                {options && <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/48">{options}</p>}
              </button>
            ))
          )}
        </div>
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="mt-3 space-y-2">
            {validation.errors.map((error) => (
              <div key={error} className="flex gap-2 rounded-md border border-red-300/24 bg-red-500/10 p-2 text-xs leading-5 text-red-100">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {error}
              </div>
            ))}
            {validation.warnings.map((warning) => (
              <div key={warning} className="flex gap-2 rounded-md border border-sky-300/24 bg-sky-500/10 p-2 text-xs leading-5 text-sky-100">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                {warning}
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-sm text-white/62">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(pricing.itemsPrice)}</span></div>
          <div className="flex justify-between"><span>Desconto</span><span>{formatPrice(pricing.setupDiscount)}</span></div>
          <div className="flex justify-between text-lg font-black text-white"><span>Total</span><span>{formatPrice(pricing.totalPrice)}</span></div>
        </div>
      </section>
    </div>
  )

  const focusPanel = selectedItem && selectedProduct ? (
    <div className="space-y-5">
      <section className="rounded-lg border border-white/10 bg-white/7 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Produto selecionado</p>
        <h2 className="mt-2 text-2xl font-black text-white">{selectedProduct.name}</h2>
        <p className="mt-2 text-sm leading-6 text-white/58">{selectedProduct.description}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md bg-black/24 p-3">
            <p className="text-white/42">Preço</p>
            <p className="font-black text-white">{formatPrice(selectedPrice)}</p>
          </div>
          <div className="rounded-md bg-black/24 p-3">
            <p className="text-white/42">Pegada</p>
            <p className="font-black text-white">{selectedFootprint?.width ?? 0} x {selectedFootprint?.depth ?? 0}cm</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/7 p-4">
        <p className="text-sm font-black text-white">Cor principal</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {selectedProduct.allowedColors.base.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => updateSelectedItem({ colorBase: color })}
              className={cn(
                'flex min-h-12 items-center gap-2 rounded-md border px-3 text-left text-xs font-bold',
                (selectedItem.colorBase ?? selectedProduct.defaultColors.base) === color ? 'border-primary bg-primary/12 text-white' : 'border-white/10 bg-black/20 text-white/62',
              )}
            >
              <span className="size-5 rounded-full border border-white/20" style={{ backgroundColor: deskColors[color].hex }} />
              {color}
            </button>
          ))}
        </div>

        <p className="mt-5 text-sm font-black text-white">Cor de detalhe</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {selectedProduct.allowedColors.accent.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => updateSelectedItem({ colorAccent: color })}
              className={cn(
                'flex min-h-12 items-center gap-2 rounded-md border px-3 text-left text-xs font-bold',
                (selectedItem.colorAccent ?? selectedProduct.defaultColors.accent) === color ? 'border-primary bg-primary/12 text-white' : 'border-white/10 bg-black/20 text-white/62',
              )}
            >
              <span className="size-5 rounded-full border border-white/20" style={{ backgroundColor: deskColors[color].hex }} />
              {color}
            </button>
          ))}
        </div>
      </section>

      {Boolean(selectedProduct.customFields?.length) && (
        <section className="rounded-lg border border-white/10 bg-white/7 p-4">
          <p className="text-sm font-black text-white">Personalização</p>
          <div className="mt-4 space-y-4">
            {selectedProduct.customFields?.map((field) => {
              const value = getCustomValue(selectedItem, field)

              if (field.type === 'boolean') {
                return (
                  <div key={field.key} className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-black/20 p-3">
                    <Label htmlFor={`custom-${field.key}`} className="text-white/72">{field.label}</Label>
                    <Switch
                      id={`custom-${field.key}`}
                      checked={value === true}
                      onCheckedChange={(checked) => updateSelectedCustomField(field.key, checked)}
                    />
                  </div>
                )
              }

              if (field.type === 'number') {
                return (
                  <div key={field.key}>
                    <Label htmlFor={`custom-${field.key}`} className="text-white/72">{field.label}</Label>
                    <Input
                      id={`custom-${field.key}`}
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step ?? 1}
                      value={typeof value === 'number' ? value : field.defaultValue}
                      onChange={(event) => updateSelectedCustomField(field.key, Number(event.target.value))}
                      className="mt-2 border-white/10 bg-black/30 text-white"
                    />
                  </div>
                )
              }

              if (field.type === 'segmented') {
                return (
                  <div key={field.key}>
                    <p className="text-sm font-medium text-white/72">{field.label}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {field.options.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateSelectedCustomField(field.key, option.value)}
                          className={cn(
                            'min-h-11 rounded-md border px-3 text-sm font-bold transition',
                            value === option.value ? 'border-primary bg-primary/12 text-white' : 'border-white/10 bg-black/20 text-white/62 hover:border-white/24',
                          )}
                        >
                          {option.label}
                          {option.priceAdd ? <span className="ml-1 text-xs text-primary">+{formatPrice(option.priceAdd)}</span> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              }

              return (
                <div key={field.key}>
                  <Label className="text-white/72">{field.label}</Label>
                  <Select value={String(value)} onValueChange={(nextValue) => updateSelectedCustomField(field.key, nextValue)}>
                    <SelectTrigger className="mt-2 w-full border-white/10 bg-black/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#111116] text-white">
                      {field.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}{option.priceAdd ? ` (+${formatPrice(option.priceAdd)})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={rotateSelected} className="h-11 border-white/10 bg-white/6 text-white hover:bg-white hover:text-[#09090b]">
          <RotateCw className="size-4" />
          Rodar
        </Button>
        <Button type="button" variant="outline" onClick={removeSelected} className="h-11 border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500 hover:text-white">
          <Trash2 className="size-4" />
          Remover
        </Button>
      </div>
      <Button type="button" onClick={closeFocus} className="h-11 w-full bg-primary font-bold text-primary-foreground hover:bg-primary/90">
        <Undo2 className="size-4" />
        Voltar à secretária
      </Button>
    </div>
  ) : (
    <div className="rounded-lg border border-white/10 bg-white/7 p-4 text-sm text-white/58">
      Seleciona um produto para personalizar.
    </div>
  )

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <Header />
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1800px] flex-col px-4 pb-28 pt-5 lg:grid lg:h-[calc(100svh-4rem)] lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)_360px] lg:gap-5 lg:overflow-hidden lg:px-5 lg:pb-5">
        <aside className="hidden min-h-0 space-y-5 overflow-y-auto lg:block lg:h-full">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">EM3D Desk Studio</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Constrói a tua secretária ideal.</h1>
            <p className="mt-3 text-sm leading-6 text-white/56">Arrasta, personaliza e guarda o teu setup em 2D com medidas reais.</p>
          </div>
          {setupControls}
        </aside>

        <section className="flex min-h-[620px] flex-col rounded-lg border border-white/10 bg-[#0f0f14] shadow-2xl lg:h-full lg:min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">{surfaceLabels[setup.surface]}</p>
              <p className="text-sm font-bold text-white">{setup.desk.widthCm} x {setup.desk.depthCm} cm · {setup.topItems.length} em cima · {setup.underItems.length} por baixo · {formatPrice(pricing.totalPrice)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-md border border-white/10 bg-black/20 p-1">
                {(['top', 'under'] as DeskSurface[]).map((surface) => (
                  <button
                    key={surface}
                    type="button"
                    onClick={() => switchSurface(surface)}
                    className={cn(
                      'rounded px-3 py-2 text-xs font-black transition',
                      setup.surface === surface ? 'bg-primary text-primary-foreground' : 'text-white/58 hover:text-white',
                    )}
                  >
                    {surface === 'top' ? 'Em cima' : 'Por baixo'}
                  </button>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={() => setMode(setup.mode === 'view' ? 'edit' : 'view')} className="h-10 border-white/10 bg-white/6 text-white hover:bg-white hover:text-[#09090b]">
                <Grid3X3 className="size-4" />
                {setup.mode === 'view' ? 'Modo edição' : 'Voltar ao overview'}
              </Button>
              <Button type="button" onClick={saveSetup} className="h-10 bg-primary font-bold text-primary-foreground hover:bg-primary/90">
                <Save className="size-4" />
                Guardar setup
              </Button>
              <Button type="button" onClick={openQuoteModal} className="h-10 bg-white font-bold text-[#09090b] hover:bg-white/90">
                <Send className="size-4" />
                Pedir orçamento
              </Button>
              <Button type="button" variant="outline" onClick={resetSetup} className="hidden h-10 border-white/10 bg-white/6 text-white hover:bg-white hover:text-[#09090b] sm:inline-flex">
                <Undo2 className="size-4" />
                Repor
              </Button>
            </div>
          </div>

          <div ref={canvasRef} className="relative min-h-[520px] flex-1 overflow-hidden p-4 lg:min-h-0">
            <div className="absolute left-4 top-4 z-30 flex flex-col gap-2">
              {loadWarning && (
                <div className="flex max-w-sm gap-2 rounded-md border border-amber-300/30 bg-amber-400/12 px-3 py-2 text-xs leading-5 text-amber-100">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {loadWarning}
                </div>
              )}
              {validation.errors.map((error) => (
                <div key={error} className="flex max-w-sm gap-2 rounded-md border border-red-300/30 bg-red-500/12 px-3 py-2 text-xs leading-5 text-red-100">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {error}
                </div>
              ))}
              {validation.warnings.map((warning) => (
                <div key={warning} className="flex max-w-sm gap-2 rounded-md border border-sky-300/30 bg-sky-500/12 px-3 py-2 text-xs leading-5 text-sky-100">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  {warning}
                </div>
              ))}
            </div>

            {showOnboarding && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-4 top-4 z-30 max-w-sm rounded-lg border border-primary/20 bg-[#111116]/92 p-4 shadow-2xl backdrop-blur-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">Como funciona</p>
                    <p className="mt-2 text-sm leading-6 text-white/62">
                      Escolhe o tamanho da secretária, adiciona produtos, arrasta para reorganizar, clica para personalizar e pede orçamento quando estiver pronto.
                    </p>
                  </div>
                  <button type="button" onClick={dismissOnboarding} className="text-white/42 hover:text-white" aria-label="Fechar ajuda">
                    <X className="size-5" />
                  </button>
                </div>
                <Button type="button" onClick={dismissOnboarding} className="mt-4 h-10 w-full bg-primary font-bold text-primary-foreground">
                  Entendido
                </Button>
              </motion.div>
            )}

            <div className="flex h-full min-h-[500px] items-center justify-center lg:min-h-0">
              <motion.div
                layout
                className="relative overflow-hidden rounded-lg border border-white/14 bg-[#2d2118] shadow-[0_40px_120px_rgba(0,0,0,0.5)]"
                style={{
                  width: deskWidthPx,
                  height: deskDepthPx,
                  background: setup.surface === 'under'
                    ? 'linear-gradient(135deg,#161820,#0b0d12 55%,#1b2230)'
                    : setup.desk.surfaceColor === 'walnut'
                      ? 'linear-gradient(135deg,#3a281d,#211913 55%,#4a3020)'
                      : '#17171c',
                }}
                onPointerDown={(event) => {
                  if (event.target === event.currentTarget && setup.mode !== 'view') {
                    mutateSetup((current) => ({ ...current, selectedItemId: undefined, mode: 'edit' }))
                  }
                }}
              >
                {setup.desk.showGrid && (
                  <div
                    className="pointer-events-none absolute inset-0 opacity-25"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)',
                      backgroundSize: `${setup.desk.snapSizeCm * scale}px ${setup.desk.snapSizeCm * scale}px`,
                    }}
                  />
                )}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-linear-to-b from-white/18 to-transparent" />

                {setup.mode === 'focus' && selectedItem && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="pointer-events-none absolute inset-0 z-[5] border-2 border-primary/40 bg-black/24 backdrop-blur-[1px]"
                  />
                )}

                {activeItems.length === 0 && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
                    <div className="max-w-2xl rounded-lg border border-white/14 bg-[#111116]/90 p-5 text-center shadow-2xl backdrop-blur-xl">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-primary/30 bg-primary/12 text-primary">
                        <Layers3 className="size-5" />
                      </div>
                      <p className="mt-4 text-lg font-black text-white">Começa com um objetivo</p>
                      <p className="mt-2 text-sm leading-6 text-white/58">Escolhe um ponto de partida ou começa do zero. Podes editar tudo depois.</p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {starterTemplates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => applyTemplate(template)}
                            className="rounded-md border border-white/10 bg-white/7 p-3 text-left hover:border-primary/40"
                          >
                            <span className="block text-sm font-black text-white">{template.label}</span>
                            <span className="mt-1 block text-xs leading-5 text-white/52">{template.description}</span>
                          </button>
                        ))}
                      </div>
                      <Button
                        type="button"
                        onClick={startFromZero}
                        variant="outline"
                        className="mt-4 h-10 border-white/10 bg-white/6 font-bold text-white hover:bg-white hover:text-[#09090b]"
                        aria-label="Começar setup do zero"
                      >
                        Começar do zero
                      </Button>
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {activeItems.map((item) => {
                    const product = getDeskProduct(item.productId)
                    if (!product) return null
                    const dimensions = getDeskItemFootprint(item)
                    if (!dimensions) return null
                    const selected = item.id === setup.selectedItemId
                    const focused = selected && setup.mode === 'focus'
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.78 }}
                        animate={{ opacity: setup.mode === 'focus' && !selected ? 0.28 : 1, scale: focused ? 1.08 : 1 }}
                        exit={{ opacity: 0, scale: 0.72 }}
                        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                        onPointerDown={(event) => handlePointerDown(event, item)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onClick={(event) => {
                          event.stopPropagation()
                          bringToFront(item.id, setup.mode === 'focus' ? 'focus' : 'edit')
                        }}
                        onDoubleClick={(event) => {
                          event.stopPropagation()
                          startFocus(item.id)
                        }}
                        className={cn('absolute touch-none select-none', setup.mode === 'view' ? 'cursor-default' : 'cursor-grab active:cursor-grabbing')}
                        style={{
                          left: item.xCm * scale,
                          top: item.yCm * scale,
                          width: dimensions.width * scale,
                          height: dimensions.depth * scale,
                          zIndex: 10 + (item.zIndex ?? 0) + (selected ? 100 : 0),
                        }}
                      >
                        <DeskProductShape item={item} product={product} selected={selected} focused={focused} />
                        {selected && (
                          <div className="pointer-events-none absolute -top-9 left-0 z-20 max-w-[220px] rounded-md border border-primary/28 bg-[#09090b]/90 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-[0_12px_34px_rgba(0,0,0,0.38)] backdrop-blur-md" aria-hidden="true">
                            <span className="block truncate">{product.name}</span>
                            <span className="block text-primary">{formatPrice(getDeskItemPrice(item))}</span>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

              </motion.div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-3 lg:hidden">
            <Drawer open={catalogOpen} onOpenChange={setCatalogOpen}>
              <DrawerTrigger asChild>
                <Button type="button" className="h-11 bg-primary font-bold text-primary-foreground">
                  <Plus className="size-4" />
                  Produtos
                </Button>
              </DrawerTrigger>
              <DrawerContent className="border-white/10 bg-[#111116] text-white">
                <DrawerHeader>
                  <DrawerTitle>Kits e produtos</DrawerTitle>
                </DrawerHeader>
                <div className="max-h-[62vh] overflow-y-auto px-4 pb-5">{productCatalog}</div>
              </DrawerContent>
            </Drawer>
            <Drawer open={focusOpen} onOpenChange={setFocusOpen}>
              <DrawerTrigger asChild>
                <Button type="button" variant="outline" className="h-11 border-white/10 bg-white/6 text-white">
                  <Maximize2 className="size-4" />
                  Foco
                </Button>
              </DrawerTrigger>
              <DrawerContent className="border-white/10 bg-[#111116] text-white">
                <DrawerHeader>
                  <DrawerTitle>Personalização</DrawerTitle>
                </DrawerHeader>
                <div className="max-h-[62vh] overflow-y-auto px-4 pb-5">{focusPanel}</div>
              </DrawerContent>
            </Drawer>
          </div>
        </section>

        <aside className="hidden min-h-0 space-y-5 overflow-y-auto lg:block lg:h-full">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black">Produtos</h2>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">{setup.surface === 'top' ? 'Em cima' : 'Por baixo'}</span>
            </div>
            {productCatalog}
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black">Foco</h2>
              {setup.mode === 'focus' && (
                <button type="button" onClick={closeFocus} className="text-white/50 hover:text-white" aria-label="Fechar foco">
                  <X className="size-5" />
                </button>
              )}
            </div>
            {focusPanel}
          </section>
        </aside>
      </section>

      {!quoteOpen && (
        <div className="fixed inset-x-3 bottom-3 z-40 rounded-lg border border-white/10 bg-[#111116]/94 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/42">Pronto para orçamento</p>
              <p className="mt-1 truncate text-sm font-black text-white">{allItems.length} produtos · {formatPrice(pricing.totalPrice)}</p>
            </div>
            <Button type="button" onClick={openQuoteModal} aria-label="Pedir orçamento" className="h-11 shrink-0 bg-primary px-4 font-black text-primary-foreground hover:bg-primary/90">
              <Send className="size-4" />
              Pedir
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-white/54">
            <span className="rounded-full border border-white/10 bg-black/24 px-2 py-1">Sem pagamento automático</span>
            <span className="rounded-full border border-white/10 bg-black/24 px-2 py-1">{validation.warnings.length} avisos</span>
          </div>
        </div>
      )}

      <Dialog open={quoteOpen} onOpenChange={(open) => {
        setQuoteOpen(open)
        if (open) {
          trackDeskStudioEvent('quote_modal_opened', {
            topItems: setup.topItems.length,
            underItems: setup.underItems.length,
            warnings: validation.warnings.length,
            hasErrors: validation.errors.length > 0,
          })
          setQuoteError('')
          setQuoteSuccess('')
        }
      }}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto border-white/10 bg-[#111116] text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Pedir orçamento</DialogTitle>
            <DialogDescription className="text-white/58">
              Envia o teu setup para revisão manual. Respondemos por email com confirmação de preço e prazo antes da produção.
            </DialogDescription>
          </DialogHeader>

          {quoteSuccess ? (
            <div className="rounded-lg border border-primary/20 bg-primary/12 p-5">
              <p className="font-black text-primary">Pedido enviado para revisão</p>
              <p className="mt-2 text-sm leading-6 text-white/64">
                Mantivemos o setup guardado neste dispositivo para poderes continuar a ajustar depois.
              </p>
              <div className="mt-4 space-y-2">
                {quoteNextSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-md border border-white/10 bg-black/18 px-3 py-2 text-sm text-white/74">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">{index + 1}</span>
                    <span className="font-bold">{step}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-white/52">{quoteSuccess}</p>
              <Button type="button" onClick={() => setQuoteOpen(false)} className="mt-5 h-11 w-full bg-primary font-bold text-primary-foreground">
                Fechar
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submitQuote}>
              <div className="grid gap-2 sm:grid-cols-3">
                {quoteTrustPoints.map((point) => (
                  <div key={point} className="rounded-md border border-white/10 bg-black/24 p-3 text-xs leading-5 text-white/66">
                    <Check className="mb-2 size-4 text-primary" />
                    {point}
                  </div>
                ))}
              </div>
              <div className="rounded-md border border-primary/18 bg-primary/10 p-3 text-sm leading-6 text-white/70">
                <p className="font-black text-white">Peças feitas por encomenda</p>
                <p className="mt-1">Sem pagamento automático nesta fase. Podes ajustar antes de avançar.</p>
              </div>
              {quoteError && (
                <div className="flex gap-2 rounded-md border border-red-300/30 bg-red-500/12 px-3 py-2 text-sm leading-6 text-red-100">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {quoteError}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="quote-name" className="text-white/78">Nome</Label>
                  <Input
                    id="quote-name"
                    value={quoteForm.customerName}
                    onChange={(event) => setQuoteForm((current) => ({ ...current, customerName: event.target.value.slice(0, 120) }))}
                    maxLength={120}
                    required
                    className="mt-2 border-white/10 bg-black/30 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="quote-email" className="text-white/78">Email</Label>
                  <Input
                    id="quote-email"
                    type="email"
                    value={quoteForm.customerEmail}
                    onChange={(event) => setQuoteForm((current) => ({ ...current, customerEmail: event.target.value.slice(0, 180) }))}
                    maxLength={180}
                    required
                    className="mt-2 border-white/10 bg-black/30 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="quote-phone" className="text-white/78">Telemóvel</Label>
                  <Input
                    id="quote-phone"
                    value={quoteForm.customerPhone}
                    onChange={(event) => setQuoteForm((current) => ({ ...current, customerPhone: event.target.value.slice(0, 40) }))}
                    maxLength={40}
                    className="mt-2 border-white/10 bg-black/30 text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="quote-address" className="text-white/78">Morada</Label>
                  <Input
                    id="quote-address"
                    value={quoteForm.shippingAddress}
                    onChange={(event) => setQuoteForm((current) => ({ ...current, shippingAddress: event.target.value.slice(0, 500) }))}
                    maxLength={500}
                    className="mt-2 border-white/10 bg-black/30 text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="quote-notes" className="text-white/78">Notas</Label>
                  <Textarea
                    id="quote-notes"
                    value={quoteForm.notes}
                    onChange={(event) => setQuoteForm((current) => ({ ...current, notes: event.target.value.slice(0, 1000) }))}
                    maxLength={1000}
                    className="mt-2 min-h-24 border-white/10 bg-black/30 text-white"
                  />
                </div>
              </div>
              <div className="rounded-md border border-white/10 bg-black/24 p-3 text-sm text-white/64">
                Total estimado: <span className="font-black text-white">{formatPrice(pricing.totalPrice)}</span>
              </div>
              <Button type="submit" disabled={isSubmittingQuote} className="h-12 w-full bg-primary font-black text-primary-foreground hover:bg-primary/90">
                <Send className="size-4" />
                {isSubmittingQuote ? 'A enviar...' : 'Enviar pedido'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {process.env.NODE_ENV !== 'production' && (
        <section className="mx-auto max-w-[1800px] px-4 pb-8 lg:px-5">
          <button
            type="button"
            onClick={() => setDebugOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/7 px-4 py-3 text-left text-sm font-bold text-white"
          >
            <span className="flex items-center gap-2"><Bug className="size-4 text-primary" /> Debug JSON</span>
            <span>{debugOpen ? 'Fechar' : 'Abrir'}</span>
          </button>
          {debugOpen && (
            <div className="mt-3 rounded-lg border border-white/10 bg-black/40">
              <div className="flex justify-end border-b border-white/10 p-3">
                <Button type="button" variant="outline" onClick={exportDebugJson} className="h-9 border-white/10 bg-white/6 text-white hover:bg-white hover:text-[#09090b]">
                  Exportar JSON
                </Button>
              </div>
              <pre className="max-h-96 overflow-auto p-4 text-xs text-white/68">
                {JSON.stringify({ setup, validation, pricing }, null, 2)}
              </pre>
            </div>
          )}
        </section>
      )}

      <div className="fixed bottom-4 right-4 z-50 hidden rounded-full border border-primary/20 bg-primary/12 px-4 py-2 text-sm font-bold text-primary backdrop-blur-xl lg:flex">
        <Check className="mr-2 size-4" />
        Coordenadas guardadas em cm
      </div>
    </main>
  )
}
