'use client'

import Image from 'next/image'
import { useMemo, useState, useTransition } from 'react'
import { CheckCircle2, ExternalLink, FileDown, ImageIcon, Loader2, Mail, PackageCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildPuzzleOpenScad, buildPuzzleParamsJson, getCutParamsFromConfig } from '@/lib/puzzle/openscad'
import { buildPuzzleGridPath } from '@/lib/puzzle/preview'
import type { SvgPuzzleConfig } from '@/lib/puzzle/types'
import { ModularProductionBom } from '@/app/admin/_components/modular-production-bom'
import { approveOrderRequestForProduction, approveOrderRequestPhoto, sendPuzzlePaymentApproval, updateOrderRequestPaymentReceived, updateOrderRequestStatus } from './actions'

type OrderRequestStatus = 'DRAFT' | 'PENDING_REVIEW' | 'AWAITING_PAYMENT' | 'PAID' | 'READY_FOR_PRODUCTION' | 'IN_PRODUCTION' | 'SHIPPED' | 'CANCELLED'
type LegacyOrderRequestStatus = OrderRequestStatus | 'MODELING' | 'B2B_LEAD'
type RequestFilter = OrderRequestStatus | 'ALL' | 'B2B'

type B2BIdea = {
  title: string
  object: string
  placement: string
  utility: string
  finish: string
  prototypeStep: string
}

type B2BMetadata = {
  version: number
  source: string
  businessType: string
  businessTypeOther?: string
  goal: string
  approximateQuantity?: number
  deadline?: string
  message: string
  aiIdeas?: B2BIdea[]
  ipHash?: string
  userAgent?: string
  emailStatus?: {
    customer?: 'sent' | 'failed' | 'skipped'
    admin?: 'sent' | 'failed' | 'skipped'
    lastError?: string
  }
  retentionReviewAt?: string
}

type OrderRequest = {
  id: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  imageUrl?: string
  companyName?: string
  productSlug?: string
  productName?: string
  svgUrl?: string
  previewUrl?: string
  paymentUrl?: string
  estimatedPrice?: number
  quotedPrice?: number
  variantId?: string
  variantName?: string
  selectedPrice?: number
  lightMode?: 'desligada' | 'quente' | 'fria'
  canvasConfig?: any
  productType?: 'hexa-memoria'
  engravingText?: string
  isPaid?: boolean
  notes?: string
  leadType?: 'custom_idea' | 'photo_request' | 'b2b'
  b2bMetadata?: B2BMetadata
  status: LegacyOrderRequestStatus
  createdAt: Date | string
  updatedAt: Date | string
}

type ProductionJob = {
  id: string
  orderRequestId?: string
  status: string
}

const statusLabels: Record<OrderRequestStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING_REVIEW: 'Pendente',
  AWAITING_PAYMENT: 'Aguarda pagamento',
  PAID: 'Pago',
  READY_FOR_PRODUCTION: 'Pronto para produção',
  IN_PRODUCTION: 'Em produção',
  SHIPPED: 'Enviado',
  CANCELLED: 'Cancelado',
}

const statusDescriptions: Record<OrderRequestStatus, string> = {
  DRAFT: 'rascunho ainda sem revisão',
  PENDING_REVIEW: 'recebido para análise',
  AWAITING_PAYMENT: 'aprovado, pagamento pendente',
  PAID: 'pagamento confirmado',
  READY_FOR_PRODUCTION: 'pagamento confirmado, pronto para criar produção',
  IN_PRODUCTION: 'em impressão/montagem',
  SHIPPED: 'enviado ao cliente',
  CANCELLED: 'cancelado',
}

const statusTone: Record<OrderRequestStatus, string> = {
  DRAFT: 'bg-secondary text-muted-foreground',
  PENDING_REVIEW: 'bg-sky-100 text-sky-900',
  AWAITING_PAYMENT: 'bg-amber-100 text-amber-900',
  PAID: 'bg-green-100 text-green-900',
  READY_FOR_PRODUCTION: 'bg-lime-100 text-lime-900',
  IN_PRODUCTION: 'bg-emerald-100 text-emerald-900',
  SHIPPED: 'bg-indigo-100 text-indigo-900',
  CANCELLED: 'bg-destructive/10 text-destructive',
}

function normalizeRequestStatus(status: LegacyOrderRequestStatus): OrderRequestStatus {
  if (status === 'MODELING' || status === 'B2B_LEAD') return 'PENDING_REVIEW'
  return status
}

function isB2BRequest(request: OrderRequest) {
  return request.leadType === 'b2b' || request.status === 'B2B_LEAD'
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatPrice(value?: number) {
  if (value === undefined) return '-'
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function getHexaProductionSummary(request: OrderRequest) {
  if (request.canvasConfig?.type !== 'hexa-memoria') return null

  const hexaRequest = request.canvasConfig.request ?? request.canvasConfig.hexaRequest ?? {}
  const tiles = (Array.isArray(hexaRequest.tiles) ? hexaRequest.tiles : []) as any[]
  const size = hexaRequest.mosaicSize ?? request.productSlug?.replace('hexa-', '').toUpperCase() ?? '-'
  const colorCounts = tiles.reduce<Record<string, number>>((acc, tile: any) => {
    const color = typeof tile.color === 'string' ? tile.color : 'Preto'
    acc[color] = (acc[color] ?? 0) + 1
    return acc
  }, {})
  const colorSummary = Object.entries(colorCounts)
    .map(([color, quantity]) => `${quantity}x ${color}`)
    .join(', ')

  return {
    size,
    total: tiles.length,
    colorSummary,
    label: `Total Parts to Print: ${tiles.length}x Size ${size}${colorSummary ? ` (${colorSummary})` : ''}`,
  }
}

function downloadTextFile(filename: string, content: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function PuzzleRequestPreview({
  request,
  config,
}: {
  request: OrderRequest
  config: SvgPuzzleConfig
}) {
  const gridPath = buildPuzzleGridPath({
    width: config.widthMm,
    height: config.heightMm,
    rows: config.rows,
    columns: config.columns,
    connectorType: config.connectorType,
  })
  const source = request.previewUrl || request.svgUrl || request.imageUrl

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg border border-border bg-white" style={{ aspectRatio: `${config.widthMm} / ${config.heightMm}` }}>
        {source ? (
          <img
            src={source}
            alt="Pré-visualização final do puzzle"
            className="absolute left-1/2 top-1/2 h-full w-full"
            style={{
              transform: `translate(calc(-50% + ${(config.offsetXmm / config.widthMm) * 100}%), calc(-50% + ${(config.offsetYmm / config.heightMm) * 100}%)) scale(${config.imageScalePercent / 100})`,
            }}
          />
        ) : null}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${config.widthMm} ${config.heightMm}`} preserveAspectRatio="none">
          <path
            d={gridPath}
            fill="none"
            stroke={config.sunkenImage ? 'rgba(0,0,0,0.82)' : 'rgba(255,255,255,0.96)'}
            strokeWidth={Math.max(config.pieceGapMm * 2.2, 0.9)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="0" y="0" width={config.widthMm} height={config.heightMm} fill="none" stroke="rgba(15,23,42,0.7)" strokeWidth="0.8" />
        </svg>
      </div>
      <div className="grid gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-md bg-secondary p-2">Dimensão<br /><span className="font-semibold">{config.widthMm} x {config.heightMm}mm</span></div>
        <div className="rounded-md bg-secondary p-2">Grelha<br /><span className="font-semibold">{config.rows} x {config.columns}</span></div>
        <div className="rounded-md bg-secondary p-2">Peças<br /><span className="font-semibold">{config.rows * config.columns}</span></div>
        <div className="rounded-md bg-secondary p-2">Cores<br /><span className="font-semibold">{config.finalColors?.length ?? '-'}</span></div>
      </div>
    </div>
  )
}

function RequestDrawer({
  request,
  jobs,
  onClose,
}: {
  request: OrderRequest
  jobs: ProductionJob[]
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const puzzleConfig = request.canvasConfig?.type === 'svg-puzzle' ? request.canvasConfig as SvgPuzzleConfig : null
  const [paymentUrl, setPaymentUrl] = useState(request.paymentUrl || '')
  const [quotedPrice, setQuotedPrice] = useState(String(request.quotedPrice ?? request.selectedPrice ?? request.estimatedPrice ?? puzzleConfig?.estimatedPrice ?? ''))
  const relatedJobs = jobs.filter((job) => job.orderRequestId === request.id)
  const normalizedStatus = normalizeRequestStatus(request.status)
  const isB2BLead = isB2BRequest(request)
  const b2bMetadata = request.b2bMetadata
  const isHexaRequest = request.canvasConfig?.type === 'hexa-memoria'
  const hexaProductionSummary = getHexaProductionSummary(request)
  const canApproveProduction = isHexaRequest
    ? normalizedStatus === 'READY_FOR_PRODUCTION' && request.isPaid === true
    : (normalizedStatus === 'PAID' || normalizedStatus === 'READY_FOR_PRODUCTION') && request.isPaid === true

  const runStatusUpdate = (status: OrderRequestStatus) => {
    startTransition(async () => {
      try {
        await updateOrderRequestStatus(request.id, status)
        toast.success('Estado atualizado')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o estado.')
      }
    })
  }

  const approve = () => {
    startTransition(async () => {
      try {
        const result = await approveOrderRequestForProduction(request.id)
        const jobCount = result.jobIds?.length || 0
        toast.success(result.created ? `Pedido aprovado e ${jobCount} job(s) criado(s)` : 'Pedido aprovado; job(s) já existia(m)')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível aprovar para produção.')
      }
    })
  }

  const approvePhoto = () => {
    startTransition(async () => {
      try {
        await approveOrderRequestPhoto(request.id)
        toast.success('Fotografia aprovada; pedido aguarda pagamento')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível aprovar a fotografia.')
      }
    })
  }

  const updatePayment = (isPaid: boolean) => {
    startTransition(async () => {
      try {
        await updateOrderRequestPaymentReceived(request.id, isPaid)
        toast.success(isPaid ? 'Pagamento marcado como recebido' : 'Pagamento marcado como por confirmar')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o pagamento.')
      }
    })
  }

  const sendPaymentApproval = () => {
    startTransition(async () => {
      try {
        await sendPuzzlePaymentApproval({
          requestId: request.id,
          paymentUrl: paymentUrl.trim(),
          quotedPrice: Number(quotedPrice),
        })
        toast.success('Aprovação enviada ao cliente.')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a aprovação.')
      }
    })
  }

  const downloadOpenScad = () => {
    if (!puzzleConfig) return
    downloadTextFile(`puzzle-${request.id.slice(0, 8)}-cut-matrix.scad`, buildPuzzleOpenScad(getCutParamsFromConfig(puzzleConfig)))
  }

  const downloadParams = () => {
    if (!puzzleConfig) return
    downloadTextFile(`puzzle-${request.id.slice(0, 8)}-params.json`, buildPuzzleParamsJson(puzzleConfig), 'application/json')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-border bg-background shadow-xl sm:mx-auto sm:max-w-5xl sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Pedido #{request.id.slice(0, 8)}</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">{request.customerName}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Fechar pedido">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-4 lg:grid-cols-[1fr_1fr]">
          <section className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="font-semibold">Nome:</span> {request.customerName}</p>
                <p><span className="font-semibold">Email:</span> {request.customerEmail}</p>
                <p><span className="font-semibold">Telemóvel:</span> {request.customerPhone || '-'}</p>
                <p><span className="font-semibold">Empresa:</span> {request.companyName || '-'}</p>
                <p><span className="font-semibold">Criado:</span> {formatDate(request.createdAt)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Produto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="font-semibold">Produto:</span> {isB2BLead ? 'Pedido empresarial' : request.productName || request.productSlug || '-'}</p>
                {request.productType && <p><span className="font-semibold">Tipo:</span> {request.productType === 'hexa-memoria' ? 'HexaMemória' : request.productType}</p>}
                <p><span className="font-semibold">Variante:</span> {request.variantName || request.variantId || '-'}</p>
                <p><span className="font-semibold">Preço:</span> {formatPrice(request.quotedPrice ?? request.selectedPrice)}</p>
                {request.estimatedPrice !== undefined && <p><span className="font-semibold">Estimativa:</span> {formatPrice(request.estimatedPrice)}</p>}
                {request.paymentUrl && (
                  <p><span className="font-semibold">Pagamento:</span> <a href={request.paymentUrl} target="_blank" rel="noreferrer" className="text-primary underline">abrir link</a></p>
                )}
                <p><span className="font-semibold">Pagamento:</span> {request.isPaid === true ? 'Pago' : 'Pagamento por confirmar'}</p>
                {!isHexaRequest && <p><span className="font-semibold">Luz:</span> {request.lightMode || '-'}</p>}
                {!isHexaRequest && <p><span className="font-semibold">Gravação:</span> {request.engravingText || '-'}</p>}
              </CardContent>
            </Card>

            {isB2BLead && b2bMetadata && (
              <Card>
                <CardHeader>
                  <CardTitle>Lead B2B</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p><span className="font-semibold">Tipo:</span> {b2bMetadata.businessTypeOther || b2bMetadata.businessType || '-'}</p>
                    <p><span className="font-semibold">Quantidade:</span> {b2bMetadata.approximateQuantity ?? '-'}</p>
                    <p><span className="font-semibold">Prazo:</span> {b2bMetadata.deadline || '-'}</p>
                    <p><span className="font-semibold">Origem:</span> {b2bMetadata.source || 'empresas'} v{b2bMetadata.version || 1}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Objetivo</p>
                    <p className="mt-1 text-muted-foreground">{b2bMetadata.goal || '-'}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Mensagem</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{b2bMetadata.message || request.notes || '-'}</p>
                  </div>
                  {b2bMetadata.aiIdeas?.length ? (
                    <div>
                      <p className="font-semibold">Ideias AI anexadas</p>
                      <div className="mt-2 space-y-2">
                        {b2bMetadata.aiIdeas.map((idea, index) => (
                          <div key={`${idea.title}-${index}`} className="rounded-lg border border-border bg-secondary/40 p-3">
                            <p className="font-medium">{index + 1}. {idea.title}</p>
                            <p className="mt-1 text-muted-foreground">Objeto: {idea.object}</p>
                            <p className="text-muted-foreground">Local: {idea.placement}</p>
                            <p className="text-muted-foreground">Utilidade: {idea.utility}</p>
                            <p className="text-muted-foreground">Acabamento: {idea.finish}</p>
                            <p className="text-muted-foreground">Primeiro passo: {idea.prototypeStep}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
                    <p>Email cliente: {b2bMetadata.emailStatus?.customer || '-'}</p>
                    <p>Email admin: {b2bMetadata.emailStatus?.admin || '-'}</p>
                    {b2bMetadata.emailStatus?.lastError && <p className="mt-1 text-destructive">Erro: {b2bMetadata.emailStatus.lastError}</p>}
                    {b2bMetadata.retentionReviewAt && <p className="mt-1">Revisão de retenção: {formatDate(b2bMetadata.retentionReviewAt)}</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label htmlFor="request-status">Estado do pedido</Label>
                <select
                  id="request-status"
                  value={normalizedStatus}
                  onChange={(event) => runStatusUpdate(event.target.value as OrderRequestStatus)}
                  disabled={isPending}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground">{statusDescriptions[normalizedStatus]}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><span className="font-semibold">Tipo:</span> {request.canvasConfig?.type === 'svg-puzzle' ? 'Puzzle SVG' : request.canvasConfig?.type === 'modular-list' ? 'Modular' : request.canvasConfig?.type === 'hexa-memoria' ? 'HexaMemória' : 'Simples'}</p>
                <p><span className="font-semibold">Versão:</span> {request.canvasConfig?.version ?? '-'}</p>
                {hexaProductionSummary && (
                  <div className="rounded-lg border border-lime-200 bg-lime-50 p-3 text-lime-950">
                    <p className="font-semibold">Resumo de produção</p>
                    <p className="mt-1">{hexaProductionSummary.label}</p>
                  </div>
                )}
                {puzzleConfig && (
                  <>
                    <p><span className="font-semibold">Dimensão física:</span> {puzzleConfig.widthMm} x {puzzleConfig.heightMm}mm</p>
                    <p><span className="font-semibold">Cortes:</span> {puzzleConfig.rows} linhas x {puzzleConfig.columns} colunas</p>
                    <p><span className="font-semibold">Conector:</span> {puzzleConfig.connectorType}</p>
                    <div className="flex flex-wrap gap-2">
                      {(puzzleConfig.finalColors ?? []).map((color) => (
                        <span key={color} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs">
                          <span className="size-3 rounded-sm border border-border" style={{ backgroundColor: color }} />
                          {color}
                        </span>
                      ))}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button type="button" variant="outline" onClick={downloadOpenScad}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Download OpenSCAD
                      </Button>
                      <Button type="button" variant="outline" onClick={downloadParams}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Download JSON
                      </Button>
                    </div>
                  </>
                )}
                {!request.canvasConfig && isB2BLead && (
                  <p className="text-muted-foreground">Lead B2B sem configuração de moldura.</p>
                )}
                {request.canvasConfig?.type === 'modular-list' && (
                  <>
                    <p><span className="font-semibold">Dimensão estimada:</span> {request.canvasConfig.estimate?.widthCm}x{request.canvasConfig.estimate?.heightCm}cm</p>
                    <p><span className="font-semibold">Perímetro LED:</span> {request.canvasConfig.estimate?.perimeterM}m</p>
                    <div>
                      <p className="font-semibold">Peças:</p>
                      <ul className="mt-2 space-y-1 text-muted-foreground">
                        {(request.canvasConfig.parts ?? []).map((part: any) => (
                          <li key={part.id}>{part.quantity}x {part.name} {part.uploadedImageName ? `(${part.uploadedImageName})` : ''}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
                <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
                  {request.canvasConfig ? JSON.stringify(request.canvasConfig, null, 2) : 'Sem configuração.'}
                </pre>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <ModularProductionBom record={request} />

            <Card>
              <CardHeader>
                <CardTitle>{puzzleConfig ? 'Pré-visualização do puzzle' : isHexaRequest ? 'Mosaico HexaMemória' : 'Fotografia'}</CardTitle>
              </CardHeader>
              <CardContent>
                {puzzleConfig ? (
                  <div className="space-y-3">
                    <PuzzleRequestPreview request={request} config={puzzleConfig} />
                    {(request.svgUrl || request.imageUrl) && (
                      <Button asChild variant="outline" className="w-full">
                        <a href={request.svgUrl || request.imageUrl} target="_blank" rel="noreferrer">
                          Abrir SVG
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                ) : isHexaRequest ? (
                  <div className="flex h-48 flex-col items-center justify-center rounded-lg bg-secondary px-6 text-center text-sm text-muted-foreground">
                    <PackageCheck className="mb-3 h-8 w-8" />
                    As fotografias são pré-visualizações locais do cliente e não são guardadas. Produzir apenas as molduras físicas.
                  </div>
                ) : request.imageUrl ? (
                  <div className="space-y-3">
                    <Image
                      src={request.imageUrl}
                      alt="Fotografia submetida pelo cliente"
                      width={720}
                      height={540}
                      className="max-h-[360px] w-full rounded-lg object-contain bg-secondary"
                      unoptimized
                    />
                    <Button asChild variant="outline" className="w-full">
                      <a href={request.imageUrl} target="_blank" rel="noreferrer">
                        Abrir fotografia
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap rounded-lg bg-secondary p-3 text-sm text-muted-foreground">{request.notes || 'Sem notas.'}</pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Produção</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {puzzleConfig && (
                  <div className="space-y-3 rounded-lg border border-border bg-secondary/35 p-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                      <div className="space-y-2">
                        <Label htmlFor="payment-url">Payment URL</Label>
                        <Input
                          id="payment-url"
                          value={paymentUrl}
                          onChange={(event) => setPaymentUrl(event.target.value)}
                          placeholder="https://buy.stripe.com/..."
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quoted-price">Preço final</Label>
                        <Input
                          id="quoted-price"
                          type="number"
                          min={1}
                          step={0.5}
                          value={quotedPrice}
                          onChange={(event) => setQuotedPrice(event.target.value)}
                          disabled={isPending}
                        />
                      </div>
                    </div>
                    <Button type="button" onClick={sendPaymentApproval} disabled={isPending || !paymentUrl.trim() || Number(quotedPrice) <= 0} className="w-full">
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                      Enviar aprovação e link de pagamento
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Guarda o preço final, muda o pedido para “Aguarda pagamento” e envia o email ao cliente.
                    </p>
                  </div>
                )}
                {hexaProductionSummary && (
                  <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                    <p className="font-semibold text-foreground">Resumo agregado</p>
                    <p className="mt-1 text-muted-foreground">{hexaProductionSummary.label}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      O botão cria jobs agrupados por cor para imprimir STLs físicos iguais por tamanho.
                    </p>
                  </div>
                )}
                {relatedJobs.length > 0 ? (
                  relatedJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                      <span>Job #{job.id.slice(0, 8)}</span>
                      <Badge variant="outline">{job.status}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Ainda não existe job de produção.</p>
                )}
                {!isHexaRequest && normalizedStatus === 'AWAITING_PAYMENT' && relatedJobs.length === 0 && (
                  <label className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={request.isPaid === true}
                      disabled={isPending}
                      onChange={(event) => updatePayment(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary"
                    />
                    <span>
                      <span className="block font-semibold text-foreground">Pagamento Recebido?</span>
                      <span className="mt-1 block text-muted-foreground">Confirme apenas depois de verificar Stripe/MBWay.</span>
                    </span>
                  </label>
                )}
                {!isHexaRequest && (
                  <Button onClick={approvePhoto} disabled={isPending || isB2BLead || normalizedStatus === 'AWAITING_PAYMENT' || relatedJobs.length > 0} variant="outline" className="w-full">
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Aprovar Foto
                  </Button>
                )}
                <Button onClick={approve} disabled={isPending || isB2BLead || !canApproveProduction || relatedJobs.length > 0} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                  Aprovar para Produção
                </Button>
                {isB2BLead && (
                  <p className="text-xs text-muted-foreground">
                    Este pedido é um lead empresarial. Qualifique o contacto antes de criar um orçamento ou produção.
                  </p>
                )}
                {!isB2BLead && !isHexaRequest && normalizedStatus !== 'AWAITING_PAYMENT' && relatedJobs.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    A produção só fica disponível depois de aprovar a fotografia e confirmar o pagamento.
                  </p>
                )}
                {isHexaRequest && !canApproveProduction && relatedJobs.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    A produção HexaMemória fica disponível automaticamente depois do pagamento Stripe ser confirmado.
                  </p>
                )}
                {!isHexaRequest && normalizedStatus === 'AWAITING_PAYMENT' && request.isPaid !== true && relatedJobs.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Marque “Pagamento Recebido?” para desbloquear a produção.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}

export default function AdminOrderRequestsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<RequestFilter>('ALL')
  const query = db.useQuery({
    orderRequests: {
      $: {
        order: { createdAt: 'desc' },
      },
    },
    productionJobs: {},
  })

  const requests = (query.data?.orderRequests ?? []) as OrderRequest[]
  const jobs = (query.data?.productionJobs ?? []) as ProductionJob[]
  const visibleRequests = statusFilter === 'ALL'
    ? requests
    : statusFilter === 'B2B'
    ? requests.filter(isB2BRequest)
    : requests.filter((request) => normalizeRequestStatus(request.status) === statusFilter)
  const selectedRequest = requests.find((request) => request.id === selectedId)

  const counts = useMemo(() => {
    return requests.reduce<Record<OrderRequestStatus, number>>((acc, request) => {
      const status = normalizeRequestStatus(request.status)
      acc[status] = (acc[status] ?? 0) + 1
      return acc
    }, { DRAFT: 0, PENDING_REVIEW: 0, AWAITING_PAYMENT: 0, PAID: 0, READY_FOR_PRODUCTION: 0, IN_PRODUCTION: 0, SHIPPED: 0, CANCELLED: 0 })
  }, [requests])

  const b2bCount = useMemo(() => requests.filter(isB2BRequest).length, [requests])

  if (query.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Encomendas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pedidos, leads B2B e pipeline de produção em3D.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 xl:grid-cols-9">
        <Card
          className={statusFilter === 'B2B' ? 'ring-2 ring-primary' : ''}
          onClick={() => setStatusFilter('B2B')}
        >
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">B2B</p>
            <p className="mt-2 text-3xl font-bold">{b2bCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">leads empresariais</p>
          </CardContent>
        </Card>
        {Object.entries(statusLabels).map(([status, label]) => (
          <Card
            key={status}
            className={statusFilter === status ? 'ring-2 ring-primary' : ''}
            onClick={() => setStatusFilter(status as OrderRequestStatus)}
          >
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-bold">{counts[status as OrderRequestStatus]}</p>
              <p className="mt-1 text-xs text-muted-foreground">{statusDescriptions[status as OrderRequestStatus]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Pedidos recentes</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter" className="text-xs text-muted-foreground">Filtrar</Label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as RequestFilter)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="ALL">Todos</option>
                <option value="B2B">B2B</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3">Produção</th>
                  <th className="px-4 py-3 text-right">Criado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleRequests.map((request) => {
                  const relatedJobs = jobs.filter((job) => job.orderRequestId === request.id)
                  const normalizedStatus = normalizeRequestStatus(request.status)
                  const isB2BLead = isB2BRequest(request)
                  return (
                    <tr
                      key={request.id}
                      className="cursor-pointer transition-colors hover:bg-secondary/50"
                      onClick={() => setSelectedId(request.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{request.customerName || 'Contacto B2B'}</p>
                        <p className="text-xs text-muted-foreground">{request.customerEmail}</p>
                        {request.companyName && <p className="text-xs text-muted-foreground">{request.companyName}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p>{isB2BLead ? 'Para Empresas' : request.productName || request.productSlug || '-'}</p>
                        <p className="text-xs text-muted-foreground">{request.variantName || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusTone[normalizedStatus]}>{isB2BLead ? 'B2B · ' : ''}{statusLabels[normalizedStatus]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={request.isPaid === true ? 'default' : 'outline'}>
                          {isB2BLead ? 'N/A' : request.isPaid === true ? 'Pago' : 'Por confirmar'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {relatedJobs.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {relatedJobs.length} job
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem job</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatDate(request.createdAt)}</td>
                    </tr>
                  )
                })}
                {visibleRequests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Ainda não há pedidos de revisão.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedRequest && (
        <RequestDrawer
          request={selectedRequest}
          jobs={jobs}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
