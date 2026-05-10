'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { Copy, CreditCard, GripVertical, ImagePlus, Plus, Trash2 } from 'lucide-react'
import { motion, Reorder } from 'framer-motion'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import {
  HEXA_COLORS,
  HEXA_SIZES,
  type HexaColor,
  type HexaPhotoAdjustments,
  type HexaSize,
  type HexaSpaceType,
  type HexaTile,
} from '@/types/hexa'

const MAX_TILES = 30
const GAP_MM = 0
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png'])
const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'

type PositionedTile = HexaTile & {
  q: number
  r: number
  x: number
  y: number
}

type CatalogProduct = {
  id: string
  slug: string
  name: string
  priceFrom: number
  priceTo?: number
  variants?: {
    id: string
    name: string
    finalPrice?: number
    colors: { name: string; hex: string; imageUrl?: string }[]
  }[]
}

const sizeToSlug: Record<HexaSize, string> = {
  XS: 'hexa-xs',
  S: 'hexa-s',
  M: 'hexa-m',
}

const defaultAdjustments: HexaPhotoAdjustments = { zoom: 1, offsetX: 0, offsetY: 0 }

function createTile(color: HexaColor = 'Preto'): HexaTile {
  return {
    id: crypto.randomUUID(),
    color,
    photoPreviewUrl: null,
    photoName: null,
    photoAdjustments: defaultAdjustments,
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
}

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
    for (let step = 0; step < radius; step += 1) {
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
    radius += 1
  }
  return positions.slice(0, count)
}

function computeHoneycomb(tiles: HexaTile[], size: HexaSize): PositionedTile[] {
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

function normalizeHoneycomb(tiles: PositionedTile[], size: HexaSize) {
  if (!tiles.length) return tiles
  const dimensions = HEXA_SIZES[size]
  const minX = Math.min(...tiles.map((tile) => tile.x))
  const minY = Math.min(...tiles.map((tile) => tile.y))
  return tiles.map((tile) => ({
    ...tile,
    x: tile.x - minX,
    y: tile.y - minY,
    width: dimensions.width,
    height: dimensions.height,
  }))
}

function layoutBounds(tiles: ReturnType<typeof normalizeHoneycomb>, size: HexaSize) {
  if (!tiles.length) return { width: 1, height: 1 }
  const dimensions = HEXA_SIZES[size]
  return {
    width: Math.max(...tiles.map((tile) => tile.x + dimensions.width)),
    height: Math.max(...tiles.map((tile) => tile.y + dimensions.height)),
  }
}

function pricePreview(tileCount: number, unitPrice: number) {
  const subtotal = tileCount * unitPrice
  const discountAmount = tileCount >= 10 ? subtotal * 0.1 : 0
  return {
    subtotal,
    discountAmount,
    total: subtotal - discountAmount,
    discountApplied: tileCount >= 10 ? '10%' : null,
  }
}

function productColors(product?: CatalogProduct) {
  const fromProduct = (product?.variants ?? [])
    .flatMap((variant) => variant.colors ?? [])
    .filter((color, index, list) => color.name && list.findIndex((item) => item.name === color.name) === index)

  if (fromProduct.length > 0) return fromProduct

  return (['Preto', 'Branco', 'Madeira'] as HexaColor[]).map((name) => ({
    name,
    hex: HEXA_COLORS[name].hex,
  }))
}

function colorHex(name: string, availableColors: { name: string; hex: string }[]) {
  return availableColors.find((color) => color.name === name)?.hex || HEXA_COLORS.Preto.hex
}

function HexaCanvas({
  tiles,
  selectedId,
  mosaicSize,
  availableColors,
  onSelect,
}: {
  tiles: HexaTile[]
  selectedId: string
  mosaicSize: HexaSize
  availableColors: { name: string; hex: string }[]
  onSelect: (id: string) => void
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 560 })
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [userZoom, setUserZoom] = useState(1)
  const positioned = useMemo(() => normalizeHoneycomb(computeHoneycomb(tiles, mosaicSize), mosaicSize), [tiles, mosaicSize])
  const bounds = useMemo(() => layoutBounds(positioned, mosaicSize), [positioned, mosaicSize])
  const autoFitScale = Math.min(
    1.1,
    Math.max(0.18, Math.min((canvasSize.width - 56) / bounds.width, (canvasSize.height - 56) / bounds.height)),
  )
  const scale = autoFitScale * userZoom
  const groupWidth = bounds.width * scale
  const groupHeight = bounds.height * scale
  const offsetX = (canvasSize.width - groupWidth) / 2
  const offsetY = (canvasSize.height - groupHeight) / 2

  useEffect(() => {
    const element = canvasRef.current
    if (!element) return
    const update = () => setCanvasSize({ width: element.clientWidth, height: element.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  function resetView() {
    setPan({ x: 0, y: 0 })
    setUserZoom(1)
  }

  return (
    <div
      ref={canvasRef}
      className="relative h-full min-h-[360px] overflow-hidden rounded-lg border border-[#d8c8ae] bg-[#f5ead9] shadow-inner"
      style={{
        backgroundImage:
          'linear-gradient(rgba(70,55,36,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(70,55,36,0.08) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }}
    >
      <div className="absolute right-3 top-3 z-20 flex w-44 flex-col gap-2 rounded-md border border-border bg-white/90 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#6e5b43]">Zoom {Math.round(userZoom * 100)}%</span>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={resetView}>
            Centrar
          </Button>
        </div>
        <Slider min={0.6} max={1.6} step={0.05} value={[userZoom]} onValueChange={(value) => setUserZoom(value[0] ?? 1)} />
      </div>

      <motion.div
        drag
        dragMomentum={false}
        className="absolute cursor-grab touch-none active:cursor-grabbing"
        style={{
          left: offsetX,
          top: offsetY,
          width: groupWidth,
          height: groupHeight,
          x: pan.x,
          y: pan.y,
        }}
        onDragEnd={(_, info) => setPan((current) => ({ x: current.x + info.offset.x, y: current.y + info.offset.y }))}
      >
        {positioned.map((tile) => {
          const frameColor = colorHex(tile.color, availableColors)
          const width = HEXA_SIZES[mosaicSize].width * scale
          const height = HEXA_SIZES[mosaicSize].height * scale
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelect(tile.id)}
              className={cn(
                'absolute overflow-hidden border-[5px] shadow-lg transition-all duration-300 ease-out',
                selectedId === tile.id ? 'ring-4 ring-primary ring-offset-2 ring-offset-[#f5ead9]' : 'ring-0',
              )}
              style={{
                left: tile.x * scale,
                top: tile.y * scale,
                width,
                height,
                clipPath: HEX_CLIP,
                borderColor: frameColor,
                backgroundColor: frameColor,
              }}
              aria-label="Selecionar peça hexagonal"
            >
              {tile.photoPreviewUrl ? (
                <img
                  src={tile.photoPreviewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                  style={{
                    transform: `scale(${tile.photoAdjustments.zoom}) translate(${tile.photoAdjustments.offsetX * 100}%, ${tile.photoAdjustments.offsetY * 100}%)`,
                    transformOrigin: 'center',
                  }}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-[#efe3d0] text-xs font-semibold text-[#8b7b66]">
                  Foto
                </span>
              )}
            </button>
          )
        })}
      </motion.div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#766c61]">{label}</Label>
      {children}
    </div>
  )
}

export default function HexaConfiguratorPage() {
  const [mosaicSize, setMosaicSize] = useState<HexaSize>('S')
  const [tiles, setTiles] = useState<HexaTile[]>(() => [createTile(), createTile(), createTile()])
  const [selectedId, setSelectedId] = useState(() => tiles[0]?.id ?? '')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', spaceType: 'Casa' as HexaSpaceType })
  const productsQuery = db.useQuery({
    catalogProducts: {
      $: {
        where: { slug: { $in: Object.values(sizeToSlug) } },
      },
    },
  })

  const products = (productsQuery.data?.catalogProducts ?? []) as CatalogProduct[]
  const selectedSlug = sizeToSlug[mosaicSize]
  const selectedProduct = products.find((product) => product.slug === selectedSlug)
  const availableColors = useMemo(() => productColors(selectedProduct), [selectedProduct])
  const unitPrice = selectedProduct?.priceFrom ?? HEXA_SIZES[mosaicSize].price
  const selectedTile = tiles.find((tile) => tile.id === selectedId) ?? tiles[0]
  const pricing = useMemo(() => pricePreview(tiles.length, unitPrice), [tiles.length, unitPrice])

  useEffect(() => {
    const allowed = new Set(availableColors.map((color) => color.name))
    const fallback = (availableColors[0]?.name || 'Preto') as HexaColor
    setTiles((current) => current.map((tile) => allowed.has(tile.color) ? tile : { ...tile, color: fallback }))
  }, [availableColors])

  function updateSelected(patch: Partial<HexaTile>) {
    if (!selectedTile) return
    setTiles((current) => current.map((tile) => (tile.id === selectedTile.id ? { ...tile, ...patch } : tile)))
  }

  function updateSelectedAdjustments(patch: Partial<HexaTile['photoAdjustments']>) {
    if (!selectedTile) return
    updateSelected({ photoAdjustments: { ...selectedTile.photoAdjustments, ...patch } })
  }

  function addTile(source?: HexaTile) {
    if (tiles.length >= MAX_TILES) {
      toast.info('Máximo de 30 peças. Para encomendas maiores, por favor contacte-nos.')
      return
    }
    const fallback = (availableColors[0]?.name || 'Preto') as HexaColor
    const next = source
      ? { ...source, id: crypto.randomUUID(), photoPreviewUrl: source.photoPreviewUrl ?? null }
      : createTile(fallback)
    setTiles((current) => [...current, next])
    setSelectedId(next.id)
  }

  function removeTile(id: string) {
    setTiles((current) => {
      if (current.length <= 1) return current
      const next = current.filter((tile) => tile.id !== id)
      if (selectedId === id) setSelectedId(next[0]?.id ?? '')
      return next
    })
  }

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selectedTile) return

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error('Use uma fotografia JPG ou PNG.')
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('A fotografia deve ter no máximo 5MB.')
      return
    }

    updateSelected({ photoPreviewUrl: URL.createObjectURL(file), photoName: file.name })
    toast.success('Fotografia adicionada à pré-visualização.')
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedProduct) {
      toast.error('Não foi possível carregar o produto selecionado.')
      return
    }
    if (customer.name.trim().length < 2) {
      toast.error('Indique o seu nome.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) {
      toast.error('Indique um email válido.')
      return
    }
    if (customer.phone?.length && customer.phone.trim().length < 9) {
      toast.error('Indique um telemóvel válido.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/checkout/hexa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          mosaicSize,
          productSlug: selectedProduct.slug,
          tiles: tiles.map((tile) => ({
            id: tile.id,
            color: tile.color,
            photoAdjustments: tile.photoAdjustments,
          })),
          layout: { type: 'honeycomb', gapMm: GAP_MM },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível iniciar o pagamento.')
      window.location.href = data.checkoutUrl
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível iniciar o pagamento.')
      setIsSubmitting(false)
    }
  }

  const controls = (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-white p-4">
        <Field label="Tamanho do Mosaico">
          <Select value={mosaicSize} onValueChange={(value) => setMosaicSize(value as HexaSize)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(sizeToSlug) as HexaSize[]).map((size) => {
                const product = products.find((item) => item.slug === sizeToSlug[size])
                const dimensions = HEXA_SIZES[size]
                return (
                  <SelectItem key={size} value={size}>
                    {size} - {dimensions.width} x {dimensions.height}mm - {formatCurrency(product?.priceFrom ?? dimensions.price)}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </Field>
        <p className="mt-3 text-sm leading-6 text-[#6c5f50]">As cores disponíveis vêm do produto selecionado no catálogo.</p>
      </div>

      <div className="rounded-lg border border-border bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Total estimado</p>
            <p className="text-3xl font-bold">{formatCurrency(pricing.total)}</p>
          </div>
          <div className="rounded-md bg-[#fff3d7] px-3 py-2 text-right text-sm text-[#7b5420]">
            {tiles.length} peças
          </div>
        </div>
        <div className="space-y-1 text-sm text-[#62574d]">
          <div className="flex justify-between"><span>Preço unitário</span><span>{formatCurrency(unitPrice)}</span></div>
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(pricing.subtotal)}</span></div>
          <div className="flex justify-between"><span>Desconto</span><span>{pricing.discountApplied ?? 'Sem desconto'} ({formatCurrency(pricing.discountAmount)})</span></div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Peças</h2>
          <Button size="sm" variant="outline" onClick={() => addTile()}>
            <Plus className="size-4" />
            Adicionar
          </Button>
        </div>
        <Reorder.Group axis="y" values={tiles} onReorder={setTiles} className="space-y-2">
          {tiles.map((tile, index) => {
            const frameColor = colorHex(tile.color, availableColors)
            return (
              <Reorder.Item key={tile.id} value={tile} as="div">
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-md border bg-card p-2 shadow-sm',
                    selectedTile?.id === tile.id ? 'border-primary ring-2 ring-primary/25' : '',
                  )}
                >
                  <button type="button" className="cursor-grab px-1 text-primary" aria-label="Reordenar peça">
                    <GripVertical className="size-4" />
                  </button>
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setSelectedId(tile.id)}>
                    <span
                      className="size-9 shrink-0 overflow-hidden border"
                      style={{ clipPath: HEX_CLIP, borderColor: frameColor, backgroundColor: frameColor }}
                    >
                      {tile.photoPreviewUrl ? <img src={tile.photoPreviewUrl} alt="" className="h-full w-full object-cover" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">Peça {index + 1}</span>
                      <span className="block text-xs text-[#766c61]">{mosaicSize} · {tile.color}</span>
                    </span>
                  </button>
                  <Button size="icon" variant="ghost" onClick={() => addTile(tile)} aria-label="Duplicar peça">
                    <Copy className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeTile(tile.id)} disabled={tiles.length <= 1} aria-label="Remover peça">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Reorder.Item>
            )
          })}
        </Reorder.Group>
      </div>

      {selectedTile && (
        <div className="rounded-lg border border-border bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold">Peça selecionada</h2>
          <div className="space-y-4">
            <Field label="Fotografia">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-[#cdbb9e] bg-card px-3 py-4 text-sm font-semibold text-[#6c5f50] hover:border-primary">
                <ImagePlus className="size-4" />
                {selectedTile.photoName || 'Carregar JPG/PNG até 5MB'}
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </Field>

            <Field label={`Zoom: ${Math.round(selectedTile.photoAdjustments.zoom * 100)}%`}>
              <Slider min={0.5} max={2} step={0.05} value={[selectedTile.photoAdjustments.zoom]} onValueChange={(value) => updateSelectedAdjustments({ zoom: value[0] ?? 1 })} />
            </Field>
            <Field label={`Offset X: ${Math.round(selectedTile.photoAdjustments.offsetX * 100)}%`}>
              <Slider min={-0.2} max={0.2} step={0.01} value={[selectedTile.photoAdjustments.offsetX]} onValueChange={(value) => updateSelectedAdjustments({ offsetX: value[0] ?? 0 })} />
            </Field>
            <Field label={`Offset Y: ${Math.round(selectedTile.photoAdjustments.offsetY * 100)}%`}>
              <Slider min={-0.2} max={0.2} step={0.01} value={[selectedTile.photoAdjustments.offsetY]} onValueChange={(value) => updateSelectedAdjustments({ offsetY: value[0] ?? 0 })} />
            </Field>

            <Field label="Cor da moldura">
              <Select value={selectedTile.color} onValueChange={(value) => updateSelected({ color: value as HexaColor })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableColors.map((color) => (
                    <SelectItem key={color.name} value={color.name}>{color.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      )}

      <Button className="h-12 w-full bg-primary text-base text-primary-foreground hover:bg-primary/90" onClick={() => setCheckoutOpen(true)}>
        Finalizar Encomenda
        <CreditCard className="size-4" />
      </Button>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#f7f2ea] text-[#231f19]">
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col lg:grid lg:grid-cols-[30%_70%]">
        <aside className="hidden overflow-y-auto border-r border-border bg-card p-5 lg:block">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">HexaMemória</p>
            <h1 className="mt-2 text-3xl font-bold">Construa o seu mosaico</h1>
          </div>
          {controls}
        </aside>

        <section className="flex min-h-screen flex-col">
          <header className="flex items-center justify-between border-b border-border bg-white/78 px-4 py-3 backdrop-blur lg:px-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Colmeia 2D</p>
              <p className="text-sm text-[#62574d]">Reordene a lista para reorganizar automaticamente as peças.</p>
            </div>
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button className="lg:hidden">Controlos</Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[40vh] rounded-t-lg">
                <DrawerHeader>
                  <DrawerTitle>Controlos</DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto px-4 pb-5">{controls}</div>
              </DrawerContent>
            </Drawer>
          </header>
          <div className="sticky top-0 z-10 h-[60vh] bg-[#ede0cb] p-3 lg:static lg:h-auto lg:flex-1 lg:p-6">
            <HexaCanvas tiles={tiles} selectedId={selectedTile?.id ?? ''} mosaicSize={mosaicSize} availableColors={availableColors} onSelect={setSelectedId} />
          </div>
        </section>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Encomenda</DialogTitle>
            <DialogDescription>Vamos abrir o pagamento seguro Stripe. Depois do pagamento, preparamos a sua produção.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitCheckout}>
            <Field label="Nome">
              <Input value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="Email">
              <Input type="email" value={customer.email} onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))} />
            </Field>
            <Field label="Telemóvel">
              <Input value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
            <Field label="Tipo de espaço">
              <Select value={customer.spaceType} onValueChange={(value) => setCustomer((current) => ({ ...current, spaceType: value as HexaSpaceType }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Casa">Casa</SelectItem>
                  <SelectItem value="Escritório">Escritório</SelectItem>
                  <SelectItem value="Loja">Loja</SelectItem>
                  <SelectItem value="Restaurante">Restaurante</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting ? 'A preparar pagamento...' : 'Pagar com Stripe'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}
