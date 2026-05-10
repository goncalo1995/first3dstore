'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { GripVertical, Copy, Plus, Send, Trash2, X } from 'lucide-react'
import { Reorder } from 'framer-motion'
import { toast } from 'sonner'
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

type FrameColor = 'black' | 'white' | 'oak' | 'terracotta' | 'sage'
type SpaceType = 'Casa' | 'Restaurante' | 'Escritório'
type InitialFormat = 'quadrado' | 'misto' | 'paisagem'
type FrameType = 'quadrado' | 'retrato' | 'paisagem'
type LayoutMode = 'grid' | 'masonry' | 'mosaic'

type WallFrame = {
  id: string
  type: FrameType
  width: number
  height: number
  border: number
  color: FrameColor
  text: string
  imageUrl: null
}

type PositionedFrame = WallFrame & {
  x: number
  y: number
}

const MAX_FRAMES = 30
const BASE_RATE = 0.025
const TEXT_FEE = 3
const CANVAS_PADDING = 28

const colors: Record<FrameColor, { label: string; hex: string; text: string }> = {
  black: { label: 'Preto mate', hex: '#1f1f1d', text: '#f8f3ea' },
  white: { label: 'Branco quente', hex: '#f8f3ea', text: '#2a2520' },
  oak: { label: 'Carvalho', hex: '#b88652', text: '#2a1d12' },
  terracotta: { label: 'Terracota', hex: '#a95536', text: '#fff7ef' },
  sage: { label: 'Verde sálvia', hex: '#78866b', text: '#fffaf0' },
}

const layoutOptions: { value: LayoutMode; label: string }[] = [
  { value: 'grid', label: 'Grelha Alinhada' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'mosaic', label: 'Mosaico' },
]

const defaultFrame = {
  width: 150,
  height: 150,
  border: 18,
  color: 'black' as FrameColor,
  text: '',
  imageUrl: null,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function asNumber(value: string, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return clamp(Math.round(parsed), min, max)
}

function parseInitialPhotos(value?: string) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return 8
  return clamp(parsed, 1, 20)
}

function parseInitialFormat(value?: string): InitialFormat {
  if (value === 'quadrado' || value === 'paisagem' || value === 'misto') return value
  return 'misto'
}

function dimensionsFor(format: InitialFormat, index: number): { type: FrameType; width: number; height: number } {
  if (format === 'quadrado') return { type: 'quadrado', width: 150, height: 150 }
  if (format === 'paisagem') return { type: 'paisagem', width: 150, height: 100 }
  return index % 2 === 0
    ? { type: 'retrato', width: 100, height: 150 }
    : { type: 'paisagem', width: 150, height: 100 }
}

function typeFromDimensions(width: number, height: number): FrameType {
  if (width === height) return 'quadrado'
  return width > height ? 'paisagem' : 'retrato'
}

function createInitialFrames(count: number, format: InitialFormat): WallFrame[] {
  return Array.from({ length: count }, (_, index) => ({
    id: crypto.randomUUID(),
    ...defaultFrame,
    ...dimensionsFor(format, index),
  }))
}

function normalizePositions(frames: PositionedFrame[]) {
  if (!frames.length) return frames
  const minX = Math.min(...frames.map((frame) => frame.x))
  const minY = Math.min(...frames.map((frame) => frame.y))
  return frames.map((frame) => ({
    ...frame,
    x: Math.round(frame.x - minX),
    y: Math.round(frame.y - minY),
  }))
}

function layoutGrid(frames: WallFrame[], gapMm: number): PositionedFrame[] {
  const columns = Math.ceil(Math.sqrt(frames.length))
  const cellWidth = Math.max(...frames.map((frame) => frame.width))
  const cellHeight = Math.max(...frames.map((frame) => frame.height))

  return frames.map((frame, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    return {
      ...frame,
      x: column * (cellWidth + gapMm) + (cellWidth - frame.width) / 2,
      y: row * (cellHeight + gapMm) + (cellHeight - frame.height) / 2,
    }
  })
}

function layoutMasonry(frames: WallFrame[], gapMm: number): PositionedFrame[] {
  const columns = clamp(Math.round(Math.sqrt(frames.length)), 1, 4)
  const columnWidth = Math.max(...frames.map((frame) => frame.width))
  const heights = Array.from({ length: columns }, () => 0)

  return frames.map((frame) => {
    const column = heights.indexOf(Math.min(...heights))
    const positioned = {
      ...frame,
      x: column * (columnWidth + gapMm) + (columnWidth - frame.width) / 2,
      y: heights[column],
    }
    heights[column] += frame.height + gapMm
    return positioned
  })
}

function layoutStaggeredRows(frames: WallFrame[], gapMm: number): PositionedFrame[] {
  const columns = Math.ceil(Math.sqrt(frames.length))
  const cellWidth = Math.max(...frames.map((frame) => frame.width))
  const cellHeight = Math.max(...frames.map((frame) => frame.height))

  return frames.map((frame, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    return {
      ...frame,
      x: column * (cellWidth + gapMm) + (row % 2 ? (cellWidth + gapMm) / 2 : 0),
      y: row * (cellHeight + gapMm),
    }
  })
}

function layoutMosaic(frames: WallFrame[], gapMm: number): PositionedFrame[] {
  if (frames.length <= 2) return layoutGrid(frames, gapMm)

  const sorted = [...frames].sort((a, b) => b.width * b.height - a.width * a.height)
  const center = sorted[0]
  const rest = sorted.slice(1)
  const left = rest.filter((_, index) => index % 2 === 0)
  const right = rest.filter((_, index) => index % 2 === 1)
  const sideColumn = [...left, ...right]

  if (!center || !sideColumn.length) return layoutGrid(frames, gapMm)
  if (sideColumn.length > 16) return layoutStaggeredRows(sorted, gapMm)

  const leftWidth = left.length ? Math.max(...left.map((frame) => frame.width)) : 0
  const rightWidth = right.length ? Math.max(...right.map((frame) => frame.width)) : 0
  const stackHeight = (items: WallFrame[]) =>
    items.reduce((sum, frame, index) => sum + frame.height + (index > 0 ? gapMm : 0), 0)
  const leftHeight = stackHeight(left)
  const rightHeight = stackHeight(right)
  const totalHeight = Math.max(center.height, leftHeight, rightHeight)
  const centerX = leftWidth > 0 ? leftWidth + gapMm : 0
  const centerY = (totalHeight - center.height) / 2
  const positioned: PositionedFrame[] = [{ ...center, x: centerX, y: centerY }]

  let leftY = (totalHeight - leftHeight) / 2
  for (const frame of left) {
    positioned.push({
      ...frame,
      x: leftWidth - frame.width,
      y: leftY,
    })
    leftY += frame.height + gapMm
  }

  let rightY = (totalHeight - rightHeight) / 2
  for (const frame of right) {
    positioned.push({
      ...frame,
      x: centerX + center.width + gapMm,
      y: rightY,
    })
    rightY += frame.height + gapMm
  }

  return normalizePositions(positioned)
}

function computeLayout(frames: WallFrame[], layoutMode: LayoutMode, gapMm: number): PositionedFrame[] {
  if (!frames.length) return []
  const positioned =
    layoutMode === 'grid'
      ? layoutGrid(frames, gapMm)
      : layoutMode === 'masonry'
        ? layoutMasonry(frames, gapMm)
        : layoutMosaic(frames, gapMm)

  return normalizePositions(positioned)
}

function layoutBounds(frames: PositionedFrame[]) {
  if (!frames.length) return { width: 1, height: 1 }
  return {
    width: Math.max(...frames.map((frame) => frame.x + frame.width)),
    height: Math.max(...frames.map((frame) => frame.y + frame.height)),
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
}

function priceFrames(frames: WallFrame[]) {
  const subtotal = frames.reduce((sum, frame) => {
    const areaCm2 = (frame.width * frame.height) / 100
    const engraving = frame.text.trim() ? TEXT_FEE : 0
    return sum + areaCm2 * BASE_RATE + engraving
  }, 0)
  const discountRate = frames.length >= 20 ? 0.15 : frames.length >= 10 ? 0.1 : 0
  const discountAmount = subtotal * discountRate
  const total = subtotal - discountAmount

  return {
    subtotal,
    discountAmount,
    total,
    discountApplied: discountRate ? `${Math.round(discountRate * 100)}%` : '0%',
  }
}

function framePayload(
  frames: PositionedFrame[],
  globalColorFallback: FrameColor,
  layoutMode: LayoutMode,
  gapMm: number,
) {
  const pricing = priceFrames(frames)
  return {
    totalPrice: Math.round(pricing.total * 100) / 100,
    discountApplied: pricing.discountApplied,
    globalColorFallback,
    layoutMode,
    gapMm,
    frames: frames.map((frame) => ({
      id: frame.id,
      type: frame.type,
      x: Math.round(frame.x),
      y: Math.round(frame.y),
      width: frame.width,
      height: frame.height,
      border: frame.border,
      color: frame.color,
      text: frame.text,
      imageUrl: null,
    })),
  }
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#766c61]">{label}</Label>
      {children}
    </div>
  )
}

function FrameCanvas({
  frames,
  selectedId,
  onSelect,
}: {
  frames: PositionedFrame[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 560 })
  const bounds = useMemo(() => layoutBounds(frames), [frames])
  const scale = Math.min(
    1,
    Math.max(
      0.25,
      Math.min(
        (canvasSize.width - CANVAS_PADDING * 2) / bounds.width,
        (canvasSize.height - CANVAS_PADDING * 2) / bounds.height,
      ),
    ),
  )

  useEffect(() => {
    const element = canvasRef.current
    if (!element) return

    const update = () => setCanvasSize({ width: element.clientWidth, height: element.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={canvasRef}
      className="relative h-full min-h-[360px] overflow-hidden rounded-lg border border-[#d5c8b8] bg-[#f6efe4] shadow-inner"
      style={{
        backgroundImage:
          'linear-gradient(rgba(80,68,54,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(80,68,54,0.08) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
      <div className="pointer-events-none absolute left-5 top-5 rounded-md bg-white/82 px-3 py-2 text-sm font-semibold text-[#62574d] shadow-sm">
        Parede viva
      </div>
      {frames.map((frame) => {
        const palette = colors[frame.color]
        const border = Math.max(5, frame.border * scale)
        return (
          <div
            key={frame.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(frame.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(frame.id)
              }
            }}
            className={cn(
              'absolute select-none rounded-[6px] text-left shadow-lg outline-offset-4 transition-all duration-300 ease-out',
              selectedId === frame.id && 'outline outline-2 outline-[#1b6b45]',
            )}
            style={{
              left: CANVAS_PADDING + frame.x * scale,
              top: CANVAS_PADDING + frame.y * scale,
              width: frame.width * scale,
              height: frame.height * scale,
              backgroundColor: palette.hex,
              color: palette.text,
              padding: border,
            }}
            aria-label={`Selecionar moldura ${frame.type}`}
          >
            <span className="flex h-full w-full items-center justify-center rounded-[3px] bg-[#eee6da] text-center text-[10px] font-semibold text-[#8c8174]">
              Foto
            </span>
            {frame.text.trim() && frame.border >= 15 && (
              <span className="absolute inset-x-1 bottom-1 truncate px-1 text-center text-[9px] font-semibold uppercase tracking-wide">
                {frame.text}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function WallConfigurator({
  initialPhotos,
  initialFormat,
}: {
  initialPhotos?: string
  initialFormat?: string
}) {
  const [frames, setFrames] = useState(() => createInitialFrames(parseInitialPhotos(initialPhotos), parseInitialFormat(initialFormat)))
  const [selectedId, setSelectedId] = useState(() => frames[0]?.id ?? '')
  const [globalColor, setGlobalColor] = useState<FrameColor>('black')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('masonry')
  const [gapMm, setGapMm] = useState(40)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contact, setContact] = useState({ name: '', email: '', phone: '', spaceType: 'Casa' as SpaceType })

  const positionedFrames = useMemo(() => computeLayout(frames, layoutMode, gapMm), [frames, layoutMode, gapMm])
  const selectedFrame = frames.find((frame) => frame.id === selectedId) ?? frames[0]
  const pricing = useMemo(() => priceFrames(frames), [frames])
  const wallConfig = useMemo(
    () => framePayload(positionedFrames, globalColor, layoutMode, gapMm),
    [positionedFrames, globalColor, layoutMode, gapMm],
  )

  function updateSelected(patch: Partial<WallFrame>) {
    if (!selectedFrame) return
    const nextPatch: Partial<WallFrame> = {
      ...patch,
    }
    if (typeof patch.width === 'number' || typeof patch.height === 'number') {
      nextPatch.type = typeFromDimensions(patch.width ?? selectedFrame.width, patch.height ?? selectedFrame.height)
    }
    setFrames((current) => current.map((frame) => (frame.id === selectedFrame.id ? { ...frame, ...nextPatch } : frame)))
  }

  function addFrame(source?: WallFrame) {
    if (frames.length >= MAX_FRAMES) {
      toast.info('Máximo de 30 molduras por projecto.')
      return
    }
    const next: WallFrame = {
      ...(source ?? { ...defaultFrame, type: 'quadrado' as FrameType }),
      id: crypto.randomUUID(),
      imageUrl: null,
    }
    setFrames((current) => [...current, next])
    setSelectedId(next.id)
  }

  function removeSelected() {
    if (!selectedFrame) return
    setFrames((current) => {
      const next = current.filter((frame) => frame.id !== selectedFrame.id)
      setSelectedId(next[0]?.id ?? '')
      return next
    })
  }

  function applyGlobalColor(color: FrameColor) {
    setGlobalColor(color)
    setFrames((current) => current.map((frame) => ({ ...frame, color })))
  }

  function clearAll() {
    const next = createInitialFrames(1, 'quadrado')
    setFrames(next)
    setSelectedId(next[0]?.id ?? '')
  }

  async function submitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (contact.name.trim().length < 2) {
      toast.error('Indique o seu nome.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
      toast.error('Indique um email válido.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/wall/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: contact.name,
          customerEmail: contact.email,
          customerPhone: contact.phone,
          spaceType: contact.spaceType,
          wallConfig,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível enviar o pedido.')
      toast.success('Pedido enviado. Vamos rever a sua parede e responder por email.')
      setQuoteOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar o pedido.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const controls = (
    <div className="space-y-5">
      <div className="rounded-lg border border-[#e5dbce] bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Preço estimado</p>
            <p className="text-3xl font-bold">{formatCurrency(pricing.total)}</p>
          </div>
          <div className="rounded-md bg-[#eff7f1] px-3 py-2 text-right text-sm text-[#1b6b45]">
            {frames.length} molduras
          </div>
        </div>
        <div className="space-y-1 text-sm text-[#62574d]">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(pricing.subtotal)}</span></div>
          <div className="flex justify-between"><span>Desconto</span><span>{pricing.discountApplied} ({formatCurrency(pricing.discountAmount)})</span></div>
        </div>
      </div>

      <div className="rounded-lg border border-[#e5dbce] bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold">Definições globais</h2>
        <div className="space-y-4">
          <Field label="Layout inteligente">
            <div className="grid grid-cols-3 gap-2">
              {layoutOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLayoutMode(option.value)}
                  className={cn(
                    'min-h-10 rounded-md border px-2 text-xs font-semibold transition',
                    layoutMode === option.value
                      ? 'border-[#1b6b45] bg-[#1b6b45] text-white'
                      : 'border-[#e1d7ca] bg-[#fbf8f2] text-[#5d5147] hover:border-[#9b6b42]',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label={`Espaçamento: ${gapMm}mm`}>
            <Slider min={20} max={100} step={5} value={[gapMm]} onValueChange={(value) => setGapMm(value[0] ?? 40)} />
          </Field>

          <Field label="Cor de todas as molduras">
            <Select value={globalColor} onValueChange={(value) => applyGlobalColor(value as FrameColor)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(colors).map(([value, color]) => (
                  <SelectItem key={value} value={value}>{color.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => addFrame()}>
              <Plus className="size-4" />
              Adicionar
            </Button>
            <Button variant="outline" onClick={clearAll}>
              <X className="size-4" />
              Limpar
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#e5dbce] bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold">Molduras</h2>
        <Reorder.Group axis="y" values={frames} onReorder={setFrames} className="space-y-2">
          {frames.map((frame, index) => {
            const palette = colors[frame.color]
            return (
              <Reorder.Item key={frame.id} value={frame} as="div">
                <button
                  type="button"
                  onClick={() => setSelectedId(frame.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md border bg-[#fbf8f2] p-3 text-left shadow-sm transition',
                    selectedFrame?.id === frame.id ? 'border-[#1b6b45] ring-2 ring-[#1b6b45]/15' : 'border-[#e5dbce]',
                  )}
                >
                  <GripVertical className="size-4 shrink-0 text-[#9b6b42]" />
                  <span className="size-8 shrink-0 rounded-sm border" style={{ backgroundColor: palette.hex }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">Moldura {index + 1}</span>
                    <span className="block text-xs text-[#766c61]">{frame.width} x {frame.height}mm</span>
                  </span>
                </button>
              </Reorder.Item>
            )
          })}
        </Reorder.Group>
      </div>

      {selectedFrame && (
        <div className="rounded-lg border border-[#e5dbce] bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold">Moldura selecionada</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Largura mm">
              <Input value={selectedFrame.width} inputMode="numeric" onChange={(event) => updateSelected({ width: asNumber(event.target.value, selectedFrame.width, 60, 300) })} />
            </Field>
            <Field label="Altura mm">
              <Input value={selectedFrame.height} inputMode="numeric" onChange={(event) => updateSelected({ height: asNumber(event.target.value, selectedFrame.height, 60, 300) })} />
            </Field>
            <Field label="Borda mm">
              <Input value={selectedFrame.border} inputMode="numeric" onChange={(event) => updateSelected({ border: asNumber(event.target.value, selectedFrame.border, 8, 45) })} />
            </Field>
            <Field label="Cor">
              <Select value={selectedFrame.color} onValueChange={(value) => updateSelected({ color: value as FrameColor })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(colors).map(([value, color]) => (
                    <SelectItem key={value} value={value}>{color.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="engraving" className="text-xs font-semibold uppercase tracking-[0.16em] text-[#766c61]">Texto gravado</Label>
            <Input
              id="engraving"
              value={selectedFrame.text}
              maxLength={30}
              disabled={selectedFrame.border < 15}
              onChange={(event) => updateSelected({ text: event.target.value.slice(0, 30) })}
              placeholder="Bali 2023"
            />
            {selectedFrame.border < 15 && (
              <p className="text-sm text-[#a95536]">A borda deve ter no mínimo 15mm para gravação de texto.</p>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => addFrame(selectedFrame)}>
              <Copy className="size-4" />
              Duplicar
            </Button>
            <Button variant="outline" className="text-destructive" onClick={removeSelected} disabled={frames.length <= 1}>
              <Trash2 className="size-4" />
              Remover
            </Button>
          </div>
        </div>
      )}

      <Button className="h-12 w-full bg-[#1b6b45] text-base hover:bg-[#145236]" onClick={() => setQuoteOpen(true)}>
        Pedir Orçamento Gratuito
        <Send className="size-4" />
      </Button>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#241f19]">
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col lg:grid lg:grid-cols-[410px_1fr]">
        <aside className="hidden overflow-y-auto border-r border-[#e1d7ca] bg-[#fbf8f2] p-5 lg:block">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9b6b42]">Wall-Forge</p>
            <h1 className="mt-2 text-3xl font-bold">Configure a sua parede</h1>
          </div>
          {controls}
        </aside>

        <section className="flex min-h-screen flex-col">
          <header className="flex items-center justify-between border-b border-[#e1d7ca] bg-white/78 px-4 py-3 backdrop-blur lg:px-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9b6b42]">Estúdio de parede</p>
              <p className="text-sm text-[#62574d]">Reordene as molduras e o layout recalcula a parede sem sobreposições.</p>
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

          <div className="sticky top-0 z-10 h-[60vh] bg-[#ede6da] p-3 lg:static lg:h-auto lg:flex-1 lg:p-6">
            <FrameCanvas frames={positionedFrames} selectedId={selectedFrame?.id ?? ''} onSelect={setSelectedId} />
          </div>
        </section>
      </div>

      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedir Orçamento Gratuito</DialogTitle>
            <DialogDescription>Enviamos uma revisão da composição e uma proposta personalizada por email.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitQuote}>
            <Field label="Nome">
              <Input value={contact.name} onChange={(event) => setContact((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="Email">
              <Input type="email" value={contact.email} onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))} />
            </Field>
            <Field label="Telefone opcional">
              <Input value={contact.phone} onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
            <Field label="Tipo de espaço">
              <Select value={contact.spaceType} onValueChange={(value) => setContact((current) => ({ ...current, spaceType: value as SpaceType }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Casa">Casa</SelectItem>
                  <SelectItem value="Restaurante">Restaurante</SelectItem>
                  <SelectItem value="Escritório">Escritório</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button className="h-11 w-full bg-[#1b6b45] hover:bg-[#145236]" disabled={isSubmitting}>
              {isSubmitting ? 'A enviar...' : 'Enviar pedido'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}
