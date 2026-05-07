'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, PackageSearch } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type TrackedOrder = {
  id: string
  customerName: string
  shippingMethod: 'pickup_carcavelos' | 'mainland_portugal'
  items: {
    productName: string
    quantity: number
    colors: string[]
    selectedVariant?: {
      name: string
      kind?: 'single_color' | 'preset_pack' | 'custom_text'
      colors: string[]
    }
    customText?: string
    unitPrice: number
    itemStatus: 'new' | 'waiting_color' | 'scheduled' | 'printing' | 'done' | 'blocked'
    scheduledFor?: string
    quantityDone: number
  }[]
  subtotal: number
  shippingCost: number
  total: number
  paymentStatus: 'pending' | 'paid' | 'refunded'
  fulfillmentStatus: 'new' | 'printing' | 'ready' | 'shipped' | 'completed' | 'cancelled'
  notes?: string
  createdAt: string
  updatedAt: string
}

const fulfillmentLabels: Record<TrackedOrder['fulfillmentStatus'], string> = {
  new: 'Recebida',
  printing: 'Em produção',
  ready: 'Pronta',
  shipped: 'Enviada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}

const paymentLabels: Record<TrackedOrder['paymentStatus'], string> = {
  pending: 'Pagamento por confirmar',
  paid: 'Pagamento confirmado',
  refunded: 'Reembolsada',
}

const itemLabels: Record<TrackedOrder['items'][number]['itemStatus'], string> = {
  new: 'Recebido',
  waiting_color: 'A aguardar cor',
  scheduled: 'Agendado',
  printing: 'A imprimir',
  done: 'Concluído',
  blocked: 'Bloqueado',
}

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('')
  const [contact, setContact] = useState('')
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setOrderId(new URLSearchParams(window.location.search).get('orderId') ?? '')
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setOrder(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, contact }),
      })
      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error ?? 'Não foi possível encontrar a encomenda.')
        return
      }

      setOrder(payload.order)
    } catch {
      setError('Não foi possível consultar a encomenda.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-secondary">
        <section className="container mx-auto max-w-5xl px-4 py-10">
          <div className="mb-6">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <PackageSearch className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Acompanhar encomenda</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Use o ID completo da encomenda e o email ou telemóvel usado no pedido.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <Label htmlFor="track-order-id" className="mb-2">ID da encomenda</Label>
              <Input id="track-order-id" value={orderId} maxLength={36} onChange={event => setOrderId(event.target.value)} required />
            </div>
            <div>
              <Label htmlFor="track-contact" className="mb-2">Email ou telemóvel</Label>
              <Input id="track-contact" value={contact} maxLength={60} onChange={event => setContact(event.target.value)} required />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Consultar
            </Button>
          </form>

          {error && <div className="mt-4 rounded-lg border border-destructive/30 bg-background p-4 text-sm text-destructive">{error}</div>}

          {order && (
            <section className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">#{order.id.slice(0, 8)}</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{order.customerName}</h2>
                <div className="mt-4 space-y-3">
                  <div className="rounded-md bg-secondary p-3">
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <p className="font-semibold text-foreground">{fulfillmentLabels[order.fulfillmentStatus]}</p>
                  </div>
                  <div className="rounded-md bg-secondary p-3">
                    <p className="text-xs text-muted-foreground">Pagamento</p>
                    <p className="font-semibold text-foreground">{paymentLabels[order.paymentStatus]}</p>
                  </div>
                  <div className="rounded-md bg-secondary p-3">
                    <p className="text-xs text-muted-foreground">Entrega</p>
                    <p className="font-semibold text-foreground">
                      {order.shippingMethod === 'pickup_carcavelos' ? 'Recolha em Carcavelos' : 'Envio para Portugal continental'}
                    </p>
                  </div>
                  <div className="rounded-md bg-secondary p-3">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-semibold text-foreground">€{order.total.toFixed(2)}</p>
                  </div>
                </div>
                {order.notes && (
                  <div className="mt-4 rounded-md border border-border p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Notas do pedido</p>
                    <p className="mt-1">{order.notes}</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <h2 className="mb-4 text-xl font-semibold text-foreground">Artigos</h2>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <article key={`${item.productName}-${index}`} className="rounded-lg border border-border bg-secondary p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{item.quantity}x {item.productName}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.selectedVariant
                              ? `Opção: ${item.selectedVariant.name}${item.selectedVariant.colors.length ? ` (${item.selectedVariant.colors.join(', ')})` : ''}`
                              : item.colors.join(', ')}
                          </p>
                          {item.customText && <p className="mt-1 text-sm text-muted-foreground">{item.customText}</p>}
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                          {itemLabels[item.itemStatus]}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <p className="text-muted-foreground">Concluídos: {item.quantityDone}/{item.quantity}</p>
                        {item.scheduledFor && <p className="text-muted-foreground">Agendado: {item.scheduledFor}</p>}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          <p className="mt-6 text-sm text-muted-foreground">
            Precisa de alterar alguma coisa? <Link href="/contact" className="font-medium text-primary hover:underline">Contacte-nos</Link>.
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
