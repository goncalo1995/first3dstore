'use client'

import { ChangeEvent, FormEvent, ReactNode, useMemo, useRef, useState } from 'react'
import { Check, FileCode2, Loader2, MoveHorizontal, MoveVertical, Puzzle, Ruler, Send, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { estimatePuzzlePrice } from '@/lib/puzzle/pricing'
import { buildPuzzleGridPath } from '@/lib/puzzle/preview'
import { sanitizeSvg, type SvgAnalysis } from '@/lib/puzzle/svg'
import type { ConnectorType } from '@/lib/puzzle/types'
import { cn } from '@/lib/utils'

type PuzzleConfig = {
  widthMm: number
  heightMm: number
  rows: number
  columns: number
  sunkenImage: boolean
  pieceGapMm: number
  thicknessMm: number
  imageScalePercent: number
  offsetXmm: number
  offsetYmm: number
  connectorType: ConnectorType
}

const defaultConfig: PuzzleConfig = {
  widthMm: 150,
  heightMm: 120,
  rows: 7,
  columns: 8,
  sunkenImage: false,
  pieceGapMm: 0.18,
  thicknessMm: 3,
  imageScalePercent: 100,
  offsetXmm: 0,
  offsetYmm: 0,
  connectorType: 'redondo',
}

const maxSvgSize = 2 * 1024 * 1024
const connectorLabels: Record<ConnectorType, string> = {
  recto: 'Recto',
  redondo: 'Puzzle clássico',
  chanfrado: 'Chanfrado',
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function parseNumber(value: string, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return clamp(parsed, min, max)
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function uniqueColors(colors: string[]) {
  return [...new Set(colors.map((color) => color.toLowerCase()))]
}

function SliderField({
  id,
  label,
  value,
  min,
  max,
  step,
  suffix,
  icon,
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix: string
  icon?: ReactNode
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="flex items-center gap-2 text-sm text-white">
          {icon}
          {label}
        </Label>
        <span className="min-w-20 rounded-md border border-white/10 bg-white/8 px-2 py-1 text-right text-xs text-white">
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-emerald-400"
      />
    </div>
  )
}

export default function PuzzlePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [config, setConfig] = useState<PuzzleConfig>(defaultConfig)
  const [widthDraft, setWidthDraft] = useState(String(defaultConfig.widthMm))
  const [heightDraft, setHeightDraft] = useState(String(defaultConfig.heightMm))
  const [svgFile, setSvgFile] = useState<File | null>(null)
  const [rawSvg, setRawSvg] = useState('')
  const [analysis, setAnalysis] = useState<SvgAnalysis | null>(null)
  const [colorMappings, setColorMappings] = useState<Record<string, string>>({})
  const [validationOpen, setValidationOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [submittedRequestId, setSubmittedRequestId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const mappedAnalysis = useMemo(() => {
    if (!rawSvg) return null
    return sanitizeSvg(rawSvg, colorMappings)
  }, [rawSvg, colorMappings])

  const colors = mappedAnalysis?.colors ?? analysis?.colors ?? []
  const finalColors = uniqueColors(Object.values(colorMappings).filter(Boolean))
  const pieceWidthMm = config.widthMm / config.columns
  const pieceHeightMm = config.heightMm / config.rows
  const pieceCount = config.rows * config.columns
  const estimatedPrice = estimatePuzzlePrice({
    widthMm: config.widthMm,
    heightMm: config.heightMm,
    rows: config.rows,
    columns: config.columns,
    colorCount: Math.max(1, finalColors.length),
  })
  const previewSvg = mappedAnalysis?.sanitizedSvg ?? ''
  const previewAspect = `${config.widthMm} / ${config.heightMm}`
  const gridPath = buildPuzzleGridPath({
    width: config.widthMm,
    height: config.heightMm,
    rows: config.rows,
    columns: config.columns,
    connectorType: config.connectorType,
  })

  function updateConfig(patch: Partial<PuzzleConfig>) {
    setConfig((current) => ({ ...current, ...patch }))
  }

  function commitDimension(kind: 'widthMm' | 'heightMm', value: string) {
    const next = parseNumber(value, defaultConfig[kind], 50, 300)
    updateConfig({ [kind]: next })
    if (kind === 'widthMm') setWidthDraft(String(next))
    else setHeightDraft(String(next))
  }

  async function handleSvgFile(file: File | null) {
    if (!file) return
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')

    if (!isSvg) {
      toast.error('Use um ficheiro SVG.')
      return
    }

    if (file.size > maxSvgSize) {
      toast.error('O SVG deve ter no máximo 2MB.')
      return
    }

    const text = await file.text()
    const nextAnalysis = sanitizeSvg(text)
    const initialMappings = Object.fromEntries(nextAnalysis.colors.map((color) => [color, color]))

    setSvgFile(file)
    setRawSvg(text)
    setAnalysis(nextAnalysis)
    setColorMappings(initialMappings)
    setValidationOpen(true)
    setSubmittedRequestId('')
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    void handleSvgFile(event.target.files?.[0] ?? null)
    event.target.value = ''
  }

  function updateColorMapping(sourceColor: string, targetColor: string) {
    setColorMappings((current) => ({ ...current, [sourceColor]: targetColor.toLowerCase() }))
  }

  function validateForm() {
    if (!svgFile || !rawSvg || !mappedAnalysis?.ok) return 'Carregue e valide um SVG antes de submeter.'
    // if (finalColors.length < 1 || finalColors.length > 4) return 'O SVG deve ter entre 1 e 4 cores finais.'
    if (customerName.trim().length < 2) return 'Indique o seu nome.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) return 'Indique um email válido.'
    if (customerPhone.trim().length < 6) return 'Indique um telemóvel válido.'
    return ''
  }

  function buildCanvasConfig() {
    return {
      version: 1,
      type: 'svg-puzzle',
      product: {
        slug: 'puzzle-foto',
        name: 'Puzzle SVG Personalizado',
      },
      ...config,
      pieceWidthMm: round2(pieceWidthMm),
      pieceHeightMm: round2(pieceHeightMm),
      colorMappings,
      finalColors,
      originalColors: colors,
      colorCount: finalColors.length,
      viewBox: mappedAnalysis?.viewBox ?? '',
      svgFileName: svgFile?.name ?? '',
      svgSize: svgFile?.size ?? 0,
      estimatedPrice,
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    if (!svgFile) return
    setIsSubmitting(true)

    async function submitRequest(file: File) {
      try {
        const formData = new FormData()
        formData.set('customerName', customerName.trim())
        formData.set('customerEmail', customerEmail.trim())
        formData.set('customerPhone', customerPhone.trim())
        formData.set('canvasConfig', JSON.stringify(buildCanvasConfig()))
        formData.set('svg', file)

        const response = await fetch('/api/puzzle/request', {
          method: 'POST',
          body: formData,
        })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload.error || 'Não foi possível registar o pedido.')
        }

        setSubmittedRequestId(payload.requestId ?? '')
        toast.success('Pedido de puzzle SVG recebido.')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível registar o pedido.')
      } finally {
        setIsSubmitting(false)
      }
    }

    void submitRequest(svgFile)
  }

  const canUseSvg = Boolean(mappedAnalysis?.ok && finalColors.length >= 1 && finalColors.length <= 4)

  return (
    <main className="min-h-screen bg-[#101315] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[430px_minmax(0,1fr)] lg:px-8">
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-lg border border-white/10 bg-[#171b1f] p-4 shadow-2xl shadow-black/20 sm:p-5"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-300">
              <Puzzle className="size-5" />
              <span className="text-sm font-semibold uppercase tracking-[0.18em]">foto3d.pt</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">
              Puzzle SVG Multicolor
            </h1>
            <p className="text-sm leading-6 text-white/66">
              Importe um SVG simples, escolha até 4 cores finais e confirme o puzzle antes de pedir orçamento.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              void handleSvgFile(event.dataTransfer.files?.[0] ?? null)
            }}
            className={cn(
              'flex min-h-36 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/22 bg-white/6 px-4 py-5 text-center transition hover:border-emerald-300 hover:bg-emerald-300/8',
              svgFile && 'border-emerald-300/70 bg-emerald-300/10',
            )}
          >
            <FileCode2 className="size-7 text-emerald-300" />
            <span className="text-sm font-medium text-white">
              {svgFile ? svgFile.name : 'Arraste um SVG ou clique para escolher'}
            </span>
            <span className="text-xs text-white/55">SVG vetorial, máximo 2MB, até 4 cores sólidas</span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/svg+xml,.svg" className="hidden" onChange={handleFileInput} />

          {analysis && (
            <div className={cn('rounded-lg border p-3 text-sm', analysis.ok ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-50' : 'border-red-300/30 bg-red-300/10 text-red-50')}>
              <div className="flex items-center gap-2 font-semibold">
                {analysis.ok ? <Check className="size-4" /> : <ShieldAlert className="size-4" />}
                {analysis.ok ? 'SVG validado' : 'SVG precisa de correções'}
              </div>
              <p className="mt-1 text-xs opacity-80">viewBox: {analysis.viewBox || '-'}</p>
              <Button type="button" variant="outline" className="mt-3 h-8 border-white/15 bg-white/5 text-xs text-white hover:bg-white/10" onClick={() => setValidationOpen(true)}>
                Rever cores
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="customer-name" className="text-white">Nome</Label>
              <Input id="customer-name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="border-white/12 bg-white/8 text-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone" className="text-white">Telemóvel</Label>
              <Input id="customer-phone" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} className="border-white/12 bg-white/8 text-white" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="customer-email" className="text-white">Email</Label>
              <Input id="customer-email" type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} className="border-white/12 bg-white/8 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="puzzle-width" className="flex items-center gap-2 text-white">
                <Ruler className="size-4" />
                Largura mm
              </Label>
              <Input
                id="puzzle-width"
                inputMode="decimal"
                value={widthDraft}
                onChange={(event) => setWidthDraft(event.target.value)}
                onBlur={() => commitDimension('widthMm', widthDraft)}
                className="border-white/12 bg-white/8 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="puzzle-height" className="flex items-center gap-2 text-white">
                <Ruler className="size-4" />
                Altura mm
              </Label>
              <Input
                id="puzzle-height"
                inputMode="decimal"
                value={heightDraft}
                onChange={(event) => setHeightDraft(event.target.value)}
                onBlur={() => commitDimension('heightMm', heightDraft)}
                className="border-white/12 bg-white/8 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rows" className="text-white">Número de linhas</Label>
              <Input id="rows" type="number" min={2} max={20} value={config.rows} onChange={(event) => updateConfig({ rows: Math.round(parseNumber(event.target.value, 7, 2, 20)) })} className="border-white/12 bg-white/8 text-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="columns" className="text-white">Número de colunas</Label>
              <Input id="columns" type="number" min={2} max={20} value={config.columns} onChange={(event) => updateConfig({ columns: Math.round(parseNumber(event.target.value, 8, 2, 20)) })} className="border-white/12 bg-white/8 text-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="connector-type" className="text-white">Tipo de conector</Label>
              <Select value={config.connectorType} onValueChange={(value) => updateConfig({ connectorType: value as ConnectorType })}>
                <SelectTrigger id="connector-type" className="w-full border-white/12 bg-white/8 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="redondo">Puzzle clássico</SelectItem>
                  <SelectItem value="recto">Recto</SelectItem>
                  <SelectItem value="chanfrado">Chanfrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="piece-gap" className="text-white">Espaçamento mm</Label>
              <Input id="piece-gap" type="number" min={0} max={0.5} step={0.01} value={config.pieceGapMm} onChange={(event) => updateConfig({ pieceGapMm: parseNumber(event.target.value, 0.18, 0, 0.5) })} className="border-white/12 bg-white/8 text-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thickness" className="text-white">Espessura mm</Label>
              <Input id="thickness" type="number" min={2} max={6} step={0.1} value={config.thicknessMm} onChange={(event) => updateConfig({ thicknessMm: parseNumber(event.target.value, 3, 2, 6) })} className="border-white/12 bg-white/8 text-white" />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-white/10 bg-black/18 p-4">
            <SliderField id="image-scale" label="Escala SVG" value={config.imageScalePercent} min={50} max={200} step={1} suffix="%" onChange={(value) => updateConfig({ imageScalePercent: value })} />
            <SliderField id="offset-x" label="Offset X" value={config.offsetXmm} min={-50} max={50} step={1} suffix="mm" icon={<MoveHorizontal className="size-4" />} onChange={(value) => updateConfig({ offsetXmm: value })} />
            <SliderField id="offset-y" label="Offset Y" value={config.offsetYmm} min={-50} max={50} step={1} suffix="mm" icon={<MoveVertical className="size-4" />} onChange={(value) => updateConfig({ offsetYmm: value })} />
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/6 px-3 py-3 text-sm text-white">
            <Checkbox checked={config.sunkenImage} onCheckedChange={(checked) => updateConfig({ sunkenImage: checked === true })} />
            Sunken Image
          </label>

          <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-50">
            <p className="font-semibold">Estimativa: {estimatedPrice.toFixed(2)}€</p>
            <p className="mt-1 text-xs text-emerald-100/75">Sujeita a confirmação manual antes do pagamento.</p>
          </div>

          <Button type="submit" disabled={isSubmitting || !canUseSvg} className="w-full bg-emerald-400 text-emerald-950 hover:bg-emerald-300">
            {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
            Pedir orçamento
          </Button>

          {submittedRequestId ? (
            <div className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-3 text-sm text-emerald-100">
              Pedido recebido: <span className="font-mono">{submittedRequestId}</span>
            </div>
          ) : null}
        </form>

        <section className="min-w-0 space-y-4 rounded-lg border border-white/10 bg-[#f3f5f1] p-4 text-slate-950 shadow-2xl shadow-black/20 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">Pré-visualização final</h2>
              <p className="text-sm text-slate-600">
                {config.widthMm} x {config.heightMm}mm · {config.rows} x {config.columns} peças · {round2(pieceWidthMm)} x {round2(pieceHeightMm)}mm cada
              </p>
            </div>
            <div className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white">
              {connectorLabels[config.connectorType]}
            </div>
          </div>

          <div className="flex min-h-[52vh] items-center justify-center rounded-lg bg-[#d8ddd4] p-3">
            <div className="relative w-full max-w-4xl overflow-hidden rounded-md bg-white shadow-2xl shadow-slate-950/25" style={{ aspectRatio: previewAspect }}>
              {previewSvg && mappedAnalysis?.ok ? (
                <div
                  className="absolute left-1/2 top-1/2 h-full w-full"
                  style={{
                    transform: `translate(calc(-50% + ${(config.offsetXmm / config.widthMm) * 100}%), calc(-50% + ${(config.offsetYmm / config.heightMm) * 100}%)) scale(${config.imageScalePercent / 100})`,
                  }}
                  dangerouslySetInnerHTML={{ __html: previewSvg }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-center text-slate-500">
                  <div>
                    <FileCode2 className="mx-auto mb-3 size-10 opacity-40" />
                    <p className="font-semibold text-slate-700">Carregue um SVG</p>
                    <p className="mt-1 text-sm">A matriz de cortes aparece por cima do desenho.</p>
                  </div>
                </div>
              )}
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${config.widthMm} ${config.heightMm}`} preserveAspectRatio="none">
                <path
                  d={gridPath}
                  fill="none"
                  stroke={config.sunkenImage ? 'rgba(0,0,0,0.82)' : 'rgba(255,255,255,0.96)'}
                  strokeWidth={Math.max(config.pieceGapMm * 2.2, 0.9)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: config.sunkenImage ? 'drop-shadow(0 1px 2px rgba(255,255,255,0.45))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.75))' }}
                />
                <rect x="0" y="0" width={config.widthMm} height={config.heightMm} fill="none" stroke="rgba(15,23,42,0.7)" strokeWidth="0.8" />
              </svg>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-4">
            <div className="rounded-md border border-slate-300 bg-white/70 px-3 py-2">Peças <span className="font-semibold text-slate-950">{pieceCount}</span></div>
            <div className="rounded-md border border-slate-300 bg-white/70 px-3 py-2">Cores <span className="font-semibold text-slate-950">{finalColors.length || '-'}</span></div>
            <div className="rounded-md border border-slate-300 bg-white/70 px-3 py-2">Escala <span className="font-semibold text-slate-950">{config.imageScalePercent}%</span></div>
            <div className="rounded-md border border-slate-300 bg-white/70 px-3 py-2">Preço <span className="font-semibold text-slate-950">{estimatedPrice.toFixed(2)}€</span></div>
          </div>
        </section>
      </div>

      <Dialog open={validationOpen} onOpenChange={setValidationOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-[#121212] text-white sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Validar SVG e cores</DialogTitle>
            <DialogDescription className="text-white/62">
              Confirmamos o viewBox, removemos width/height fixos e aplicamos o mapeamento de cores antes do preview e submissão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {analysis?.errors.length ? (
              <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
                <p className="font-semibold">Corrija antes de continuar:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {analysis.errors.map((error) => <li key={error}>{error}</li>)}
                </ul>
              </div>
            ) : null}

            {analysis?.warnings.length ? (
              <div className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-50">
                {analysis.warnings.map((warning) => <p key={warning}>{warning}</p>)}
              </div>
            ) : null}

            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/6 p-3">
                <p className="text-white/55">viewBox</p>
                <p className="mt-1 font-mono text-xs">{analysis?.viewBox || '-'}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/6 p-3">
                <p className="text-white/55">Cores detetadas</p>
                <p className="mt-1 font-semibold">{colors.length}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/6 p-3">
                <p className="text-white/55">Cores finais</p>
                <p className="mt-1 font-semibold">{finalColors.length}</p>
              </div>
            </div>

            <div className="space-y-3">
              {colors.map((color) => (
                <div key={color} className="grid grid-cols-[1fr_auto_96px] items-center gap-3 rounded-lg border border-white/10 bg-white/6 p-3">
                  <div className="flex items-center gap-3">
                    <span className="size-8 rounded-md border border-white/20" style={{ backgroundColor: color }} />
                    <div>
                      <p className="text-sm font-semibold">{color}</p>
                      <p className="text-xs text-white/50">Cor original</p>
                    </div>
                  </div>
                  <span className="text-xs text-white/45">para</span>
                  <Input type="color" value={colorMappings[color] || color} onChange={(event) => updateColorMapping(color, event.target.value)} className="h-10 border-white/12 bg-white/8 p-1" />
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-white/10 bg-white/6 p-3 text-xs leading-5 text-white/62">
              Elementos sem fill ou com currentColor são tratados como preto. fill="none" é preservado como transparente.
            </div>

            <Button type="button" disabled={!canUseSvg} onClick={() => setValidationOpen(false)} className="w-full bg-emerald-400 text-emerald-950 hover:bg-emerald-300">
              <Check className="mr-2 size-4" />
              Usar este SVG
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
