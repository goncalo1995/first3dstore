'use client'

import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Box,
  Bug,
  Check,
  Grid3X3,
  Headphones,
  Maximize2,
  PenLine,
  Plus,
  RotateCw,
  Save,
  Smartphone,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  DESK_SCHEMA_VERSION,
  DESK_STORAGE_KEY,
  deskColors,
  deskPresets,
  deskProducts,
  getDeskProduct,
} from '@/lib/desk/products'
import { calculateDeskPricing } from '@/lib/desk/pricing'
import type { DeskColorName, DeskItem, DeskProductDefinition, DeskRotation, DeskSetup } from '@/lib/desk/types'
import {
  clampItemToDesk,
  deskDimensionLimits,
  getItemFootprint,
  snapItemToGrid,
  validateDeskSetup,
} from '@/lib/desk/validation'

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
    items: [],
    createdAt: now,
    updatedAt: now,
  }
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
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

function itemDimensions(item: DeskItem, product: DeskProductDefinition) {
  const rotated = item.rotation === 90 || item.rotation === 270
  return {
    width: rotated ? product.footprintCm.depth : product.footprintCm.width,
    depth: rotated ? product.footprintCm.width : product.footprintCm.depth,
  }
}

function ProductGlyph({
  product,
  baseHex,
  accentHex,
  selected,
}: {
  product: DeskProductDefinition
  baseHex: string
  accentHex: string
  selected: boolean
}) {
  if (product.preview.icon === 'smartphone') {
    return (
      <Smartphone className={cn('size-5', selected ? 'text-[#09090b]' : 'text-white')} style={{ color: selected ? '#09090b' : accentHex }} />
    )
  }
  if (product.preview.icon === 'pen') {
    return <PenLine className="size-5" style={{ color: accentHex }} />
  }
  if (product.preview.icon === 'headphones') {
    return <Headphones className="size-5" style={{ color: accentHex }} />
  }
  return <Box className="size-5" style={{ color: accentHex || baseHex }} />
}

function DeskProductShape({
  item,
  product,
  selected,
  focused,
}: {
  item: DeskItem
  product: DeskProductDefinition
  selected: boolean
  focused: boolean
}) {
  const baseHex = colorHex(item.colorBase, product.defaultColors.base)
  const accentHex = colorHex(item.colorAccent, product.defaultColors.accent)
  const isCircle = product.preview.shape === 'circle'

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center border shadow-[0_18px_45px_rgba(0,0,0,0.32)] transition-colors',
        isCircle ? 'rounded-full' : 'rounded-md',
        selected ? 'border-primary bg-primary/90' : 'border-white/16 bg-black/30',
        focused && 'ring-4 ring-primary/30',
      )}
      style={{
        background: selected
          ? `linear-gradient(135deg, ${accentHex}, #a3ff12)`
          : `linear-gradient(135deg, ${baseHex}, rgba(255,255,255,0.08))`,
      }}
    >
      <div className={cn('flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.08em]', selected ? 'text-[#09090b]' : 'text-white/88')}>
        <ProductGlyph product={product} baseHex={baseHex} accentHex={accentHex} selected={selected} />
      </div>
    </div>
  )
}

export default function DeskBuilderPage() {
  const [setup, setSetup] = useState<DeskSetup>(() => defaultSetup())
  const [loadWarning, setLoadWarning] = useState('')
  const [canvasSize, setCanvasSize] = useState({ width: 960, height: 560 })
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{
    itemId: string
    pointerId: number
    startClientX: number
    startClientY: number
    startX: number
    startY: number
  } | null>(null)

  const selectedItem = setup.items.find((item) => item.id === setup.selectedItemId)
  const selectedProduct = selectedItem ? getDeskProduct(selectedItem.productId) : undefined
  const validation = useMemo(() => validateDeskSetup(setup), [setup])
  const pricing = useMemo(() => calculateDeskPricing(setup), [setup])
  const maxZ = useMemo(() => Math.max(0, ...setup.items.map((item) => item.zIndex ?? 0)), [setup.items])
  const scale = Math.min(canvasSize.width / setup.desk.widthCm, canvasSize.height / setup.desk.depthCm)
  const deskWidthPx = setup.desk.widthCm * scale
  const deskDepthPx = setup.desk.depthCm * scale

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DESK_STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as DeskSetup
      const result = validateDeskSetup(parsed)
      if (!result.valid) {
        setLoadWarning('O setup guardado já não é compatível. Começámos com uma secretária limpa.')
        return
      }
      setSetup(parsed)
    } catch {
      setLoadWarning('Não foi possível carregar o setup guardado. Começámos com uma secretária limpa.')
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

  function setMode(mode: DeskSetup['mode']) {
    mutateSetup((current) => ({
      ...current,
      mode,
      selectedItemId: mode === 'view' ? undefined : current.selectedItemId,
    }))
  }

  function bringToFront(itemId: string, mode: DeskSetup['mode'] = setup.mode) {
    mutateSetup((current) => ({
      ...current,
      mode,
      selectedItemId: itemId,
      items: current.items.map((item) => (
        item.id === itemId ? { ...item, zIndex: maxZ + 1 } : item
      )),
    }))
  }

  function addProduct(product: DeskProductDefinition) {
    const quantity = setup.items.filter((item) => item.productId === product.productId).length
    if (product.validation.maxQuantity && quantity >= product.validation.maxQuantity) return

    const item: DeskItem = {
      id: newId(),
      productId: product.productId,
      xCm: setup.desk.widthCm / 2 - product.footprintCm.width / 2,
      yCm: setup.desk.depthCm / 2 - product.footprintCm.depth / 2,
      rotation: 0,
      zIndex: maxZ + 1,
      colorBase: product.defaultColors.base,
      colorAccent: product.defaultColors.accent,
    }

    const placedItem = snapItemToGrid(clampItemToDesk(item, setup.desk), setup.desk)
    mutateSetup((current) => ({
      ...current,
      mode: 'edit',
      selectedItemId: placedItem.id,
      items: [...current.items, placedItem],
    }))
    setCatalogOpen(false)
  }

  function updateDesk(patch: Partial<DeskSetup['desk']>) {
    mutateSetup((current) => ({
      ...current,
      desk: { ...current.desk, ...patch },
      items: current.items.map((item) => clampItemToDesk(item, { ...current.desk, ...patch })),
    }))
  }

  function updateSelectedItem(patch: Partial<DeskItem>) {
    if (!selectedItem) return
    mutateSetup((current) => ({
      ...current,
      items: current.items.map((item) => (
        item.id === selectedItem.id ? clampItemToDesk({ ...item, ...patch }, current.desk) : item
      )),
    }))
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
      items: current.items.filter((item) => item.id !== selectedItem.id),
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
      items: current.items.map((item) => (
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
      items: current.items.map((item) => (
        item.id === drag.itemId ? snapItemToGrid(item, current.desk) : item
      )),
    }))
  }

  const productCatalog = (
    <div className="space-y-3">
      {deskProducts.map((product) => {
        const quantity = setup.items.filter((item) => item.productId === product.productId).length
        const disabled = Boolean(product.validation.maxQuantity && quantity >= product.validation.maxQuantity)
        return (
          <article key={product.productId} className="rounded-lg border border-white/10 bg-white/7 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{product.category}</p>
                <h3 className="mt-2 text-base font-black text-white">{product.name}</h3>
                <p className="mt-2 text-sm leading-5 text-white/56">{product.description}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-white">{formatPrice(product.price)}</p>
                <p className="mt-1 text-xs text-white/40">{product.footprintCm.width} x {product.footprintCm.depth}cm</p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => addProduct(product)}
              disabled={disabled}
              className="mt-4 h-10 w-full bg-primary font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" />
              {disabled ? 'Limite atingido' : 'Adicionar'}
            </Button>
          </article>
        )
      })}
    </div>
  )

  const setupControls = (
    <div className="space-y-5">
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
        <p className="text-sm font-black text-white">Resumo</p>
        <div className="mt-3 space-y-2 text-sm text-white/62">
          <div className="flex justify-between"><span>Produtos</span><span>{setup.items.length}</span></div>
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
            <p className="font-black text-white">{formatPrice(selectedProduct.price)}</p>
          </div>
          <div className="rounded-md bg-black/24 p-3">
            <p className="text-white/42">Pegada</p>
            <p className="font-black text-white">{selectedProduct.footprintCm.width} x {selectedProduct.footprintCm.depth}cm</p>
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
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1800px] flex-col px-4 py-5 lg:grid lg:grid-cols-[320px_minmax(0,1fr)_360px] lg:gap-5 lg:px-5">
        <aside className="hidden min-h-0 space-y-5 overflow-y-auto lg:block">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">EM3D Desk Studio</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Constrói a tua secretária ideal.</h1>
            <p className="mt-3 text-sm leading-6 text-white/56">Arrasta, personaliza e guarda o teu setup em 2D com medidas reais.</p>
          </div>
          {setupControls}
        </aside>

        <section className="flex min-h-[620px] flex-col rounded-lg border border-white/10 bg-[#0f0f14] shadow-2xl lg:min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Superfície superior</p>
              <p className="text-sm font-bold text-white">{setup.desk.widthCm} x {setup.desk.depthCm} cm · {formatPrice(pricing.totalPrice)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setMode(setup.mode === 'view' ? 'edit' : 'view')} className="h-10 border-white/10 bg-white/6 text-white hover:bg-white hover:text-[#09090b]">
                <Grid3X3 className="size-4" />
                {setup.mode === 'view' ? 'Modo edição' : 'Voltar ao overview'}
              </Button>
              <Button type="button" onClick={saveSetup} className="h-10 bg-primary font-bold text-primary-foreground hover:bg-primary/90">
                <Save className="size-4" />
                Guardar setup
              </Button>
              <Button type="button" variant="outline" onClick={resetSetup} className="hidden h-10 border-white/10 bg-white/6 text-white hover:bg-white hover:text-[#09090b] sm:inline-flex">
                <Undo2 className="size-4" />
                Repor
              </Button>
            </div>
          </div>

          <div ref={canvasRef} className="relative min-h-[520px] flex-1 overflow-hidden p-4">
            <div className="absolute left-4 top-4 z-30 flex flex-col gap-2">
              {loadWarning && <div className="max-w-sm rounded-md border border-amber-300/30 bg-amber-400/12 px-3 py-2 text-xs text-amber-100">{loadWarning}</div>}
              {validation.errors.map((error) => (
                <div key={error} className="max-w-sm rounded-md border border-red-300/30 bg-red-500/12 px-3 py-2 text-xs text-red-100">{error}</div>
              ))}
              {validation.warnings.map((warning) => (
                <div key={warning} className="max-w-sm rounded-md border border-sky-300/30 bg-sky-500/12 px-3 py-2 text-xs text-sky-100">{warning}</div>
              ))}
            </div>

            <div className="flex h-full min-h-[500px] items-center justify-center">
              <motion.div
                layout
                className="relative overflow-hidden rounded-lg border border-white/14 bg-[#2d2118] shadow-[0_40px_120px_rgba(0,0,0,0.5)]"
                style={{
                  width: deskWidthPx,
                  height: deskDepthPx,
                  background:
                    setup.desk.surfaceColor === 'walnut'
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

                <AnimatePresence>
                  {setup.items.map((item) => {
                    const product = getDeskProduct(item.productId)
                    if (!product) return null
                    const dimensions = itemDimensions(item, product)
                    const selected = item.id === setup.selectedItemId
                    const focused = selected && setup.mode === 'focus'
                    return (
                      <motion.div
                        key={item.id}
                        layout
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
                          zIndex: (item.zIndex ?? 0) + (selected ? 100 : 0),
                        }}
                      >
                        <DeskProductShape item={item} product={product} selected={selected} focused={focused} />
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {setup.mode === 'focus' && selectedItem && (
                  <div className="pointer-events-none absolute inset-0 border-2 border-primary/40 bg-black/20 backdrop-blur-[1px]" />
                )}
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

        <aside className="hidden min-h-0 space-y-5 overflow-y-auto lg:block">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black">Produtos</h2>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">Top desk</span>
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
            <pre className="mt-3 max-h-96 overflow-auto rounded-lg border border-white/10 bg-black/40 p-4 text-xs text-white/68">
              {JSON.stringify({ setup, validation, pricing }, null, 2)}
            </pre>
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
