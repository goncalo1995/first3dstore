'use client'

import { FormEvent, useMemo, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Bot, Check, CreditCard, Loader2, Minus, Plus, RefreshCw, Ruler, Sparkles, Type } from 'lucide-react'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { db } from '@/lib/db'
import {
  MENU_EXTRA_MAX_CHARS,
  MENU_MAX_RAILS_PER_LINE,
  MENU_MAX_LINES,
  MENU_MIN_RAILS_PER_LINE,
  MENU_PACK_SIZE,
  MENU_RAIL_LENGTH_CM,
  MENU_TEXT_MAX_CHARS,
  calculateMenuQuote,
  validateMenuQuoteLimits,
} from '@/lib/menu-calculator'
import type { ProductColor } from '@/lib/products'

const MENU_RAIL_SLUG = 'menu-rail-25cm'
const MENU_PACK_SLUG = 'menu-letter-pack-standard'
const MENU_AVULSO_SLUG = 'menu-letter-custom'
const SHIPPING_COST = 4.99

type CatalogProduct = {
  id?: string
  slug?: string
  name?: string
  priceFrom?: number
  salePrice?: number
  visible?: boolean
}

type GlobalColorRecord = ProductColor & {
  id?: string
  isActive?: boolean
  spoolStatus?: 'available' | 'low' | 'archived'
  priceAdd?: number
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function toProductColor(color: GlobalColorRecord): ProductColor {
  return {
    name: color.name,
    hex: color.hex,
    imageUrl: color.imageUrl,
    globalColorId: color.id ?? color.globalColorId,
    priceAdd: color.priceAdd ?? 0,
  }
}

function findColor(colors: ProductColor[], names: string[]) {
  return colors.find(color => names.some(name => color.name.toLowerCase().includes(name))) ?? colors[0]
}

function getProductPrice(product: CatalogProduct | undefined) {
  return product?.salePrice ?? product?.priceFrom ?? 0
}

function formatAssistantMenu(value: string) {
  const fallback = 'Espresso 1,50\nFlat White 3,00\nPastel de nata 1,40'
  const source = value.trim() || fallback

  return source
    .split(/\n|,/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const match = line.match(/^(.*?)(\d+[,.]\d{1,2}\s*€?)$/)
      if (!match) return line

      const item = match[1]
        .replace(/[-–—:]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      const price = match[2].replace('.', ',').replace(/\s*€?$/, '€')
      const dots = '.'.repeat(Math.max(4, 24 - item.length - price.length))

      return `${item} ${dots} ${price}`
    })
    .join('\n')
}

function ColorPicker({
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
      <Label className="text-sm font-semibold text-stone-900">{label}</Label>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {colors.map(color => {
          const active = selected?.globalColorId
            ? selected.globalColorId === color.globalColorId
            : selected?.name === color.name

          return (
            <button
              key={color.globalColorId ?? color.name}
              type="button"
              onClick={() => onSelect(color)}
              className={`min-h-16 rounded-md border p-3 text-left transition ${
                active ? 'border-[#1f5138] bg-[#edf5ef] shadow-sm' : 'border-stone-200 bg-white hover:border-stone-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className="size-5 shrink-0 rounded-full border border-stone-300"
                  style={{
                    backgroundColor: color.hex,
                    backgroundImage: color.imageUrl ? `url(${color.imageUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <span className="min-w-0 text-sm font-semibold text-stone-950">{color.name}</span>
              </span>
              {(color.priceAdd ?? 0) > 0 && (
                <span className="mt-1 block text-xs text-stone-500">+{formatPrice(color.priceAdd ?? 0)}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ModularMenusPage() {
  const [menuText, setMenuText] = useState('Espresso ....... 1.50€\nFlat White ..... 3.00€\nPastel de nata . 1.40€')
  const [assistantText, setAssistantText] = useState('espresso 1,50, flat white 3,00\npastel de nata 1,40')
  const [extraLettersText, setExtraLettersText] = useState('€ Wi-Fi')
  const [lineRailQuantities, setLineRailQuantities] = useState<Record<number, number>>({})
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

  const query = db.useQuery({
    catalogProducts: {
      $: {
        where: {
          slug: { $in: [MENU_RAIL_SLUG, MENU_PACK_SLUG, MENU_AVULSO_SLUG] },
        },
      },
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
    () => (query.data?.catalogProducts ?? []) as CatalogProduct[],
    [query.data?.catalogProducts],
  )
  const colors = useMemo(
    () => ((query.data?.globalColors ?? []) as GlobalColorRecord[])
      .filter(color => color.isActive !== false && color.spoolStatus !== 'archived')
      .map(toProductColor),
    [query.data?.globalColors],
  )

  const selectedRailColor = railColor ?? findColor(colors, ['preto', 'black'])
  const selectedLetterColor = letterColor ?? findColor(colors, ['branco', 'white'])
  const railProduct = products.find(product => product.slug === MENU_RAIL_SLUG)
  const packProduct = products.find(product => product.slug === MENU_PACK_SLUG)
  const avulsoProduct = products.find(product => product.slug === MENU_AVULSO_SLUG)

  const quote = useMemo(
    () => calculateMenuQuote({ menuText, extraLettersText, lineRailQuantities }),
    [extraLettersText, lineRailQuantities, menuText],
  )
  const quoteErrors = validateMenuQuoteLimits(quote)
  const railUnitPrice = getProductPrice(railProduct) + (selectedRailColor?.priceAdd ?? 0)
  const letterPackPrice = getProductPrice(packProduct) + (selectedLetterColor?.priceAdd ?? 0)
  const avulsoUnitPrice = getProductPrice(avulsoProduct) + (selectedLetterColor?.priceAdd ?? 0)
  const subtotal = quote.totalRails * railUnitPrice
    + quote.standardPackQuantity * letterPackPrice
    + quote.avulsoCharacterQuantity * avulsoUnitPrice
  const shippingCost = shippingMethod === 'mainland_portugal' ? SHIPPING_COST : 0
  const total = subtotal + shippingCost
  const catalogReady = Boolean(railProduct && packProduct && avulsoProduct)

  function updateLineRailQuantity(index: number, direction: 1 | -1) {
    setLineRailQuantities(current => {
      const currentValue = current[index] ?? MENU_MIN_RAILS_PER_LINE
      const nextValue = Math.min(MENU_MAX_RAILS_PER_LINE, Math.max(MENU_MIN_RAILS_PER_LINE, currentValue + direction))
      return { ...current, [index]: nextValue }
    })
  }

  function handleMenuTextChange(value: string) {
    setMenuText(value)
  }

  function handleExtraLettersChange(value: string) {
    setExtraLettersText(value)
  }

  function handleAssistantFormat() {
    setMenuText(formatAssistantMenu(assistantText))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!catalogReady) {
      setError('O catálogo do Menu Modular ainda não está completo.')
      return
    }
    if (!selectedRailColor || !selectedLetterColor) {
      setError('Escolha a cor das calhas e a cor das letras.')
      return
    }
    if (quoteErrors.length) {
      setError(quoteErrors[0])
      return
    }
    if (shippingMethod === 'mainland_portugal' && shippingAddress.trim().length < 8) {
      setError('Indique uma morada completa para envio nacional.')
      return
    }

    const items = [
      {
        productSlug: MENU_RAIL_SLUG,
        quantity: quote.totalRails,
        selectedColor: selectedRailColor,
        customizations: [],
      },
      quote.standardPackQuantity > 0
        ? {
            productSlug: MENU_PACK_SLUG,
            quantity: quote.standardPackQuantity,
            selectedColor: selectedLetterColor,
            customizations: [],
          }
        : null,
      quote.avulsoCharacterQuantity > 0
        ? {
            productSlug: MENU_AVULSO_SLUG,
            quantity: quote.avulsoCharacterQuantity,
            selectedColor: selectedLetterColor,
            customizations: [],
          }
        : null,
    ].filter(Boolean)

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
          menuSystem: {
            menuText: quote.menuText,
            extraLettersText: quote.extraLettersText,
            railLengthCm: MENU_RAIL_LENGTH_CM,
            packSize: MENU_PACK_SIZE,
            lines: quote.lines,
            railColor: selectedRailColor,
            letterColor: selectedLetterColor,
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
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-stone-950">
      <Header />

      <section className="relative overflow-hidden bg-[#10100d] text-white">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1800&q=82"
            alt="Cafe premium com menu modular"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-62"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,8,0.88),rgba(10,10,8,0.48),rgba(10,10,8,0.2))]" />
        </div>
        <div className="relative mx-auto grid min-h-[620px] max-w-7xl content-end px-5 pb-12 pt-28 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-[#d4b46a]">
              <Sparkles className="size-4" />
              EM3D Collection 01
            </p>
            <h1 className="mt-5 font-serif text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
              O seu menu, sem limites.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              Sistemas modulares premium para cafés, pastelarias, restaurantes, studios e lojas que mudam preços, produtos e campanhas sem refazer a decoração.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-[#f8f5ef] px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
          {[
            ['Calhas de 25cm', 'Segmentos interligáveis para construir menus pequenos ou paredes completas.'],
            ['Impressão 3D local', 'Produção feita por encomenda, com cores do inventário EM3D.'],
            ['Atualização simples', 'Troque preços, pratos e símbolos sem encomendar um menu novo.'],
            ['Visual premium', 'Minimal, limpo e pensado para balcões com presença.'],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#1f5138]">{title}</p>
              <p className="mt-3 text-sm leading-6 text-stone-600">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-7 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-7">
            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#edf5ef] text-[#1f5138]">
                  <Bot className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#1f5138]">Assistente de menu</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">Tem uma foto ou texto do seu menu atual?</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                    A nossa IA organiza-o no formato perfeito para o sistema modular. Nesta versão, o assistente prepara um rascunho automático para acelerar a cotação.
                  </p>
                </div>
              </div>
              <Textarea
                value={assistantText}
                onChange={event => setAssistantText(event.target.value)}
                className="mt-5 min-h-28 border-stone-200 bg-[#fbfaf7] text-sm leading-6"
                placeholder="Cole aqui texto solto do menu atual"
              />
              <Button
                type="button"
                onClick={handleAssistantFormat}
                className="mt-4 bg-[#1f5138] text-white hover:bg-[#173d2a]"
              >
                <RefreshCw className="size-4" />
                Gerar com IA
              </Button>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#1f5138]">Calculadora inteligente</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">Cole o menu exatamente como quer montar</h2>
                </div>
                <p className="text-sm text-stone-500">{quote.menuCharacters}/{MENU_TEXT_MAX_CHARS} caracteres · {quote.lines.length}/{MENU_MAX_LINES} linhas</p>
              </div>

              <Textarea
                value={menuText}
                onChange={event => handleMenuTextChange(event.target.value)}
                className="mt-5 min-h-64 resize-y border-stone-200 bg-[#fbfaf7] font-mono text-base leading-7 text-stone-950"
                maxLength={MENU_TEXT_MAX_CHARS + 300}
              />

              <div className="mt-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <Label htmlFor="extra-letters" className="text-base font-semibold">Letras/Símbolos extra</Label>
                  <span className="text-sm text-stone-500">{quote.extraCharacters}/{MENU_EXTRA_MAX_CHARS} caracteres</span>
                </div>
                <Input
                  id="extra-letters"
                  value={extraLettersText}
                  onChange={event => handleExtraLettersChange(event.target.value)}
                  placeholder="€, @, Wi-Fi"
                  className="mt-3 h-12 border-stone-200 bg-[#fbfaf7]"
                />
              </div>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Ruler className="size-5 text-[#1f5138]" />
                <h2 className="text-xl font-bold">Calhas por linha</h2>
              </div>
              <div className="space-y-3">
                {quote.lines.length === 0 ? (
                  <p className="rounded-md bg-stone-100 p-4 text-sm text-stone-500">Escreva pelo menos uma linha para calcular as calhas.</p>
                ) : (
                  quote.lines.map(line => (
                    <div key={line.index} className="grid gap-3 rounded-md border border-stone-200 bg-[#fbfaf7] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm text-stone-900">{line.text}</p>
                        <p className="mt-1 text-sm text-stone-500">Linha {line.index} · {line.characterCount} caracteres · {line.railQuantity} calha(s) de {MENU_RAIL_LENGTH_CM}cm</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => updateLineRailQuantity(line.index, -1)}
                          disabled={line.railQuantity <= MENU_MIN_RAILS_PER_LINE}
                          aria-label={`Reduzir calhas na linha ${line.index}`}
                        >
                          <Minus className="size-4" />
                        </Button>
                        <span className="w-8 text-center text-sm font-bold">{line.railQuantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => updateLineRailQuantity(line.index, 1)}
                          disabled={line.railQuantity >= MENU_MAX_RAILS_PER_LINE}
                          aria-label={`Aumentar calhas na linha ${line.index}`}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-center gap-2">
                <Type className="size-5 text-[#1f5138]" />
                <h2 className="text-xl font-bold">Acabamentos</h2>
              </div>
              {colors.length === 0 ? (
                <p className="rounded-md bg-stone-100 p-4 text-sm text-stone-500">A carregar cores disponiveis...</p>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  <ColorPicker label="Cor das calhas" colors={colors} selected={selectedRailColor} onSelect={setRailColor} />
                  <ColorPicker label="Cor das letras" colors={colors} selected={selectedLetterColor} onSelect={setLetterColor} />
                </div>
              )}
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-xl font-bold">Dados para finalizar</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="customer-name">Nome</Label>
                  <Input id="customer-name" value={customerName} onChange={event => setCustomerName(event.target.value)} required minLength={2} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="customer-email">Email</Label>
                  <Input id="customer-email" type="email" value={customerEmail} onChange={event => setCustomerEmail(event.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="customer-phone">Telemovel</Label>
                  <Input id="customer-phone" value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} inputMode="tel" className="mt-1" />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className={`cursor-pointer rounded-md border p-4 transition ${shippingMethod === 'pickup_carcavelos' ? 'border-[#1f5138] bg-[#edf5ef]' : 'border-stone-200 bg-white'}`}>
                  <input type="radio" name="shipping" checked={shippingMethod === 'pickup_carcavelos'} onChange={() => setShippingMethod('pickup_carcavelos')} className="sr-only" />
                  <span className="font-semibold">Levantamento em Carcavelos</span>
                  <span className="mt-1 block text-sm text-stone-500">Sem custo de envio.</span>
                </label>
                <label className={`cursor-pointer rounded-md border p-4 transition ${shippingMethod === 'mainland_portugal' ? 'border-[#1f5138] bg-[#edf5ef]' : 'border-stone-200 bg-white'}`}>
                  <input type="radio" name="shipping" checked={shippingMethod === 'mainland_portugal'} onChange={() => setShippingMethod('mainland_portugal')} className="sr-only" />
                  <span className="font-semibold">Envio nacional</span>
                  <span className="mt-1 block text-sm text-stone-500">{formatPrice(SHIPPING_COST)}</span>
                </label>
              </div>

              {shippingMethod === 'mainland_portugal' && (
                <div className="mt-4">
                  <Label htmlFor="shipping-address">Morada completa</Label>
                  <Input id="shipping-address" value={shippingAddress} onChange={event => setShippingAddress(event.target.value)} required className="mt-1" />
                </div>
              )}

              <div className="mt-4">
                <Label htmlFor="notes">Notas</Label>
                <Input id="notes" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Prazo ideal, observacoes ou detalhes de montagem" className="mt-1" />
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-lg border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#1f5138]">Cotação</p>
            <h2 className="mt-2 text-2xl font-bold">Sistema Menu Modular</h2>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3 text-sm">
                <span className="text-stone-500">Calhas de {MENU_RAIL_LENGTH_CM}cm</span>
                <span className="font-semibold">{quote.totalRails} x {formatPrice(railUnitPrice)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-stone-200 pb-3 text-sm">
                <span className="text-stone-500">Pack Standard ({MENU_PACK_SIZE})</span>
                <span className="font-semibold">{quote.standardPackQuantity} x {formatPrice(letterPackPrice)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-stone-200 pb-3 text-sm">
                <span className="text-stone-500">Letras avulso</span>
                <span className="font-semibold">{quote.avulsoCharacterQuantity} x {formatPrice(avulsoUnitPrice)}</span>
              </div>
            </div>

            <div className="mt-5 rounded-md bg-[#edf5ef] p-4 text-sm leading-6 text-[#1f5138]">
              <Check className="mb-2 size-4" />
              {quote.avulsoCharacterQuantity > 0
                ? `Pagas apenas pelas letras extra necessárias, sem arredondar para outro pack.`
                : 'A quantidade encaixa exatamente nos packs standard.'}
            </div>

            <div className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Caracteres do menu</span>
                <span>{quote.menuCharacters}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Caracteres extra</span>
                <span>{quote.extraCharacters}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Margem no pack atual</span>
                <span>{quote.remainingCharacters}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Comprimento total</span>
                <span>{quote.totalRailLengthCm}cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Cor das calhas</span>
                <span>{selectedRailColor?.name ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Cor das letras</span>
                <span>{selectedLetterColor?.name ?? '-'}</span>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-3">
                <span className="text-stone-500">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Entrega</span>
                <span>{formatPrice(shippingCost)}</span>
              </div>
              <div className="flex justify-between pt-2 text-xl font-black">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {query.isLoading && (
              <p className="mt-4 text-sm text-stone-500">A carregar catalogo...</p>
            )}
            {!query.isLoading && !catalogReady && (
              <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Faltam componentes do Menu Modular para finalizar a encomenda.
              </p>
            )}
            {quoteErrors.length > 0 && (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{quoteErrors[0]}</p>
            )}
            {error && (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || query.isLoading || !catalogReady || quoteErrors.length > 0 || quote.totalRails < 1}
              className="mt-5 h-12 w-full bg-[#1f5138] text-white hover:bg-[#173d2a]"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
              Finalizar encomenda
              <ArrowRight className="size-4" />
            </Button>
          </aside>
        </div>
      </form>

      <Footer />
    </main>
  )
}
