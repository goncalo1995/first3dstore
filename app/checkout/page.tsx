'use client'

import { FormEvent, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Loader2, ShoppingBag, Truck } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCart } from '@/lib/cart-context'

const SHIPPING_COST = 4.99

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function getCustomText(customizations: { label: string; value: string }[]) {
  return customizations
    .filter(customization => customization.value.trim().length > 0)
    .map(customization => `${customization.label}: ${customization.value}`)
    .join(' | ')
}

function getItemColors(item: ReturnType<typeof useCart>['items'][number]): { name: string; hex: string; imageUrl?: string }[] {
  if (item.selectedVariant?.colors.length) {
    return item.selectedVariant.colors.map(color => ({
      name: color.name,
      hex: color.hex,
      imageUrl: color.imageUrl,
    }))
  }

  if (item.selectedParts?.length) {
    return item.selectedParts.map(part => ({
      name: `${part.label}: ${part.colorName}`,
      hex: part.colorHex,
    }))
  }

  if (item.selectedColors?.length) {
    return item.selectedColors.map(color => ({
      name: color.name,
      hex: color.hex,
      imageUrl: color.imageUrl,
    }))
  }

  return [{
    name: item.selectedColor.name,
    hex: item.selectedColor.hex,
    imageUrl: item.selectedColor.imageUrl,
  }]
}

export default function CheckoutPage() {
  const { items, totalPrice } = useCart()
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [shippingMethod, setShippingMethod] = useState<'pickup_carcavelos' | 'mainland_portugal'>('pickup_carcavelos')
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const shippingCost = shippingMethod === 'mainland_portugal' ? SHIPPING_COST : 0
  const total = totalPrice + shippingCost

  const checkoutItems = useMemo(() => items.map(item => ({
    productSlug: item.product.slug,
    quantity: item.quantity,
    selectedColor: item.selectedColor,
    selectedColors: item.selectedColors,
    selectedParts: item.selectedParts,
    selectedVariant: item.selectedVariant,
    customizations: item.customizations,
  })), [items])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!items.length) {
      setError('O carrinho está vazio.')
      return
    }

    if (shippingMethod === 'mainland_portugal' && shippingAddress.trim().length < 8) {
      setError('Indique uma morada completa para envio nacional.')
      return
    }

    setIsSubmitting(true)
    try {
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
          items: checkoutItems,
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error || 'Não foi possível iniciar o pagamento.')
      }

      window.location.href = payload.checkoutUrl
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível iniciar o pagamento.')
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <section className="border-b border-border bg-[#111111] px-5 py-10 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Button asChild variant="ghost" className="mb-6 px-0 text-white/70 hover:bg-transparent hover:text-white">
            <Link href="/loja">
              <ArrowLeft className="mr-2 size-4" />
              Voltar à loja
            </Link>
          </Button>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Checkout seguro</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Finalizar encomenda</h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/66">
            Confirmamos os dados e encaminhamos para pagamento seguro por Stripe.
          </p>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-border bg-card p-5 md:p-6">
            {error && (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold">Dados de contacto</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="checkout-name">Nome</Label>
                  <Input id="checkout-name" value={customerName} onChange={event => setCustomerName(event.target.value)} required minLength={2} />
                </div>
                <div>
                  <Label htmlFor="checkout-email">Email</Label>
                  <Input id="checkout-email" type="email" value={customerEmail} onChange={event => setCustomerEmail(event.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="checkout-phone">Telemóvel</Label>
                  <Input id="checkout-phone" value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} inputMode="tel" />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold">Entrega</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className={`cursor-pointer rounded-lg border p-4 transition ${shippingMethod === 'pickup_carcavelos' ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}>
                  <input
                    type="radio"
                    name="shipping"
                    value="pickup_carcavelos"
                    checked={shippingMethod === 'pickup_carcavelos'}
                    onChange={() => setShippingMethod('pickup_carcavelos')}
                    className="sr-only"
                  />
                  <span className="font-semibold">Levantamento em Carcavelos</span>
                  <span className="mt-1 block text-sm text-muted-foreground">Sem custo de envio.</span>
                </label>
                <label className={`cursor-pointer rounded-lg border p-4 transition ${shippingMethod === 'mainland_portugal' ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}>
                  <input
                    type="radio"
                    name="shipping"
                    value="mainland_portugal"
                    checked={shippingMethod === 'mainland_portugal'}
                    onChange={() => setShippingMethod('mainland_portugal')}
                    className="sr-only"
                  />
                  <span className="font-semibold">Envio nacional</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{formatPrice(SHIPPING_COST)}</span>
                </label>
              </div>
              {shippingMethod === 'mainland_portugal' && (
                <div className="mt-4">
                  <Label htmlFor="checkout-address">Morada completa</Label>
                  <Input
                    id="checkout-address"
                    value={shippingAddress}
                    onChange={event => setShippingAddress(event.target.value)}
                    required
                    placeholder="Rua, número, código postal e localidade"
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="checkout-notes">Notas para a encomenda</Label>
              <Input
                id="checkout-notes"
                value={notes}
                onChange={event => setNotes(event.target.value)}
                placeholder="Prazo ideal, observações ou detalhes úteis"
              />
            </div>

            <Button type="submit" disabled={isSubmitting || !items.length} className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CreditCard className="mr-2 size-4" />}
              Pagar com Stripe
            </Button>
          </form>

          <aside className="h-fit rounded-lg border border-border bg-background p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <ShoppingBag className="size-5 text-primary" />
              <h2 className="text-xl font-semibold">Resumo</h2>
            </div>

            {items.length === 0 ? (
              <div className="rounded-lg bg-secondary p-5 text-center">
                <p className="text-sm text-muted-foreground">O carrinho está vazio.</p>
                <Button asChild className="mt-4">
                  <Link href="/loja">Ver loja</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map(item => {
                  const image = item.selectedVariant?.image || item.product.images?.[0] || item.product.image
                  const customText = getCustomText(item.customizations)
                  const colors = getItemColors(item)

                  return (
                    <div key={item.id} className="flex gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-secondary">
                        <Image src={image} alt={item.product.name} fill className="object-cover" sizes="64px" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold">{item.product.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>Qtd. {item.quantity}</span>
                          <span className="flex -space-x-1" aria-label={`Cores: ${colors.map(color => color.name).join(', ')}`}>
                            {colors.slice(0, 5).map((color, index) => (
                              <span
                                key={`${item.id}-${color.name}-${index}`}
                                className="size-3.5 rounded-full border border-background ring-1 ring-border"
                                style={{
                                  backgroundColor: color.hex,
                                  backgroundImage: color.imageUrl ? `url(${color.imageUrl})` : undefined,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                }}
                                title={color.name}
                              />
                            ))}
                            {colors.length > 5 && (
                              <span className="flex size-3.5 items-center justify-center rounded-full bg-secondary text-[8px] text-muted-foreground ring-1 ring-border">
                                +{colors.length - 5}
                              </span>
                            )}
                          </span>
                        </div>
                        {item.selectedVariant && (
                          <p className="mt-1 text-xs text-muted-foreground">Opção: {item.selectedVariant.name}</p>
                        )}
                        {customText && <p className="mt-1 rounded-md bg-secondary px-2 py-1 text-xs leading-5 text-muted-foreground">{customText}</p>}
                      </div>
                      <p className="text-sm font-semibold">{formatPrice(item.unitPrice * item.quantity)}</p>
                    </div>
                  )
                })}

                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground"><Truck className="size-3.5" /> Entrega</span>
                    <span>{formatPrice(shippingCost)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-lg font-bold">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>
      <Footer />
    </main>
  )
}
