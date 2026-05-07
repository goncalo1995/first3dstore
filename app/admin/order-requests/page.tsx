'use client'

import Image from 'next/image'
import { useMemo, useState, useTransition } from 'react'
import { CheckCircle2, ExternalLink, ImageIcon, Loader2, PackageCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { approveOrderRequestForProduction, approveOrderRequestPhoto, updateOrderRequestPaymentReceived, updateOrderRequestStatus } from './actions'

type OrderRequestStatus = 'PENDING_REVIEW' | 'MODELING' | 'AWAITING_PAYMENT' | 'IN_PRODUCTION' | 'SHIPPED'

type OrderRequest = {
  id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  imageUrl: string
  productSlug?: string
  productName?: string
  variantId?: string
  variantName?: string
  selectedPrice?: number
  lightMode?: 'desligada' | 'quente' | 'fria'
  canvasConfig?: any
  engravingText?: string
  isPaid?: boolean
  notes?: string
  status: OrderRequestStatus
  createdAt: Date | string
  updatedAt: Date | string
}

type ProductionJob = {
  id: string
  orderRequestId?: string
  status: string
}

const statusLabels: Record<OrderRequestStatus, string> = {
  PENDING_REVIEW: 'Pendente',
  MODELING: 'Modelação',
  AWAITING_PAYMENT: 'Aguarda pagamento',
  IN_PRODUCTION: 'Em produção',
  SHIPPED: 'Enviado',
}

const statusDescriptions: Record<OrderRequestStatus, string> = {
  PENDING_REVIEW: 'recebido para análise',
  MODELING: 'ficheiros/modelação em preparação',
  AWAITING_PAYMENT: 'aprovado, pagamento pendente',
  IN_PRODUCTION: 'em impressão/montagem',
  SHIPPED: 'enviado ao cliente',
}

const statusTone: Record<OrderRequestStatus, string> = {
  PENDING_REVIEW: 'bg-sky-100 text-sky-900',
  MODELING: 'bg-violet-100 text-violet-900',
  AWAITING_PAYMENT: 'bg-amber-100 text-amber-900',
  IN_PRODUCTION: 'bg-emerald-100 text-emerald-900',
  SHIPPED: 'bg-indigo-100 text-indigo-900',
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
  const relatedJobs = jobs.filter((job) => job.orderRequestId === request.id)

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
        toast.success(result.created ? 'Pedido aprovado e job criado' : 'Pedido aprovado; job já existia')
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
                <p><span className="font-semibold">Telemóvel:</span> {request.customerPhone}</p>
                <p><span className="font-semibold">Criado:</span> {formatDate(request.createdAt)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Produto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="font-semibold">Produto:</span> {request.productName || request.productSlug || '-'}</p>
                <p><span className="font-semibold">Variante:</span> {request.variantName || request.variantId || '-'}</p>
                <p><span className="font-semibold">Preço:</span> {formatPrice(request.selectedPrice)}</p>
                <p><span className="font-semibold">Pagamento:</span> {request.isPaid === true ? 'Pago' : 'Pagamento por confirmar'}</p>
                <p><span className="font-semibold">Luz:</span> {request.lightMode || '-'}</p>
                <p><span className="font-semibold">Gravação:</span> {request.engravingText || '-'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label htmlFor="request-status">Estado do pedido</Label>
                <select
                  id="request-status"
                  value={request.status}
                  onChange={(event) => runStatusUpdate(event.target.value as OrderRequestStatus)}
                  disabled={isPending}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground">{statusDescriptions[request.status]}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><span className="font-semibold">Tipo:</span> {request.canvasConfig?.type === 'modular-list' ? 'Modular' : 'Simples'}</p>
                <p><span className="font-semibold">Versão:</span> {request.canvasConfig?.version ?? '-'}</p>
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
            <Card>
              <CardHeader>
                <CardTitle>Fotografia</CardTitle>
              </CardHeader>
              <CardContent>
                {request.imageUrl ? (
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
                {request.status === 'AWAITING_PAYMENT' && relatedJobs.length === 0 && (
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
                <Button onClick={approvePhoto} disabled={isPending || request.status === 'AWAITING_PAYMENT' || relatedJobs.length > 0} variant="outline" className="w-full">
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Aprovar Foto
                </Button>
                <Button onClick={approve} disabled={isPending || request.status !== 'AWAITING_PAYMENT' || request.isPaid !== true || relatedJobs.length > 0} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                  Aprovar para Produção
                </Button>
                {request.status !== 'AWAITING_PAYMENT' && relatedJobs.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    A produção só fica disponível depois de aprovar a fotografia e confirmar o pagamento.
                  </p>
                )}
                {request.status === 'AWAITING_PAYMENT' && request.isPaid !== true && relatedJobs.length === 0 && (
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
  const selectedRequest = requests.find((request) => request.id === selectedId)

  const counts = useMemo(() => {
    return requests.reduce<Record<OrderRequestStatus, number>>((acc, request) => {
      acc[request.status] = (acc[request.status] ?? 0) + 1
      return acc
    }, { PENDING_REVIEW: 0, MODELING: 0, AWAITING_PAYMENT: 0, IN_PRODUCTION: 0, SHIPPED: 0 })
  }, [requests])

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
          Pedidos de revisão gratuita e pipeline de produção Foto3D.pt.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(statusLabels).map(([status, label]) => (
          <Card key={status}>
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
          <CardTitle>Pedidos recentes</CardTitle>
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
                {requests.map((request) => {
                  const relatedJobs = jobs.filter((job) => job.orderRequestId === request.id)
                  return (
                    <tr
                      key={request.id}
                      className="cursor-pointer transition-colors hover:bg-secondary/50"
                      onClick={() => setSelectedId(request.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{request.customerName}</p>
                        <p className="text-xs text-muted-foreground">{request.customerEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{request.productName || request.productSlug || '-'}</p>
                        <p className="text-xs text-muted-foreground">{request.variantName || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusTone[request.status]}>{statusLabels[request.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={request.isPaid === true ? 'default' : 'outline'}>
                          {request.isPaid === true ? 'Pago' : 'Por confirmar'}
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
                {requests.length === 0 && (
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
