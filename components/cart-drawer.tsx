'use client'

import { FormEvent, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Minus, Plus, ShoppingBag, Trash2, Loader2, Copy } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { Button } from '@/components/ui/button'
import { WHATSAPP_NUMBER } from '@/data/constants'
import { db, id } from '@/lib/db'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalItems, totalPrice, clearCart } = useCart()
  const [step, setStep] = useState<'items' | 'checkout'>('items')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [shippingMethod, setShippingMethod] = useState<'pickup_carcavelos' | 'mainland_portugal'>('pickup_carcavelos')
  const [shippingAddress, setShippingAddress] = useState('')
  const [paymentPreference, setPaymentPreference] = useState<'mbway' | 'bank_transfer' | 'cash_pickup' | 'other'>('mbway')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [lastOrderId, setLastOrderId] = useState('')

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [closeCart])

  useEffect(() => {
    if (!isOpen) setStep('items')
  }, [isOpen])

  useEffect(() => {
    if (items.length === 0) setStep('items')
  }, [items.length])

  const orderLines = items.map(item => {
    const customText = item.customizations.length > 0
      ? `\n  Personalizações: ${item.customizations.map(c => `${c.label}: "${c.value}"`).join(', ')}`
      : ''
    const colorText = item.selectedVariant
      ? `Opção: ${item.selectedVariant.name} (${item.selectedVariant.colors.map(color => color.name).join(', ')})`
      : item.selectedParts?.length
      ? `Peças: ${item.selectedParts.map(part => `${part.label}: ${part.colorName}`).join(', ')}`
      : item.selectedColors && item.selectedColors.length > 1
        ? `Cores: ${item.selectedColors.map(c => c.name).join(', ')}`
        : `Cor: ${item.selectedColor.name}`
    return `- ${item.product.name} x${item.quantity}
  ${colorText}${customText}
  Subtotal: €${(item.unitPrice * item.quantity).toFixed(2)}`
  }).join('\n\n')

  const shippingCost = shippingMethod === 'mainland_portugal' && totalPrice < 50 ? 9.99 : 0
  const totalWithShipping = totalPrice + shippingCost
  const resetCheckout = () => {
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setShippingMethod('pickup_carcavelos')
    setShippingAddress('')
    setPaymentPreference('mbway')
    setNotes('')
    setSubmitError('')
    setStep('items')
  }

  const generateWhatsAppOrder = (orderId?: string) => {
    const message = `Olá! Submeti uma pré-encomenda${orderId ? ` (${orderId.slice(0, 8)})` : ''}:

${orderLines}

---
Subtotal: €${totalPrice.toFixed(2)}
Envio: ${shippingMethod === 'pickup_carcavelos' ? 'Recolha em Carcavelos' : shippingCost === 0 ? 'Envio gratuito para Portugal continental' : '€9,99 envio para Portugal continental'}
Total estimado: €${totalWithShipping.toFixed(2)}
Preferência de pagamento: ${paymentPreference}

Por favor, confirme a disponibilidade e os dados de pagamento!`

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
  }

  const handlePreOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const phoneDigits = customerPhone.replace(/\D/g, '')
    const hasPhone = phoneDigits.length > 0
    const hasEmail = customerEmail.trim().length > 0

    if (!hasPhone && !hasEmail) {
      setSubmitError('Indique pelo menos um contacto: email ou telemóvel/WhatsApp.')
      return
    }

    if (hasPhone && (phoneDigits.length < 6 || phoneDigits.length > 15)) {
      setSubmitError('O número de telemóvel/WhatsApp parece inválido. Pode deixar em branco se indicar email.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')
    const orderId = id()
    const now = new Date()
    const whatsappUrl = generateWhatsAppOrder(orderId)

    try {
      await db.transact(
        db.tx.orders[orderId].update({
          customerName,
          ...(customerEmail.trim() ? { customerEmail: customerEmail.trim() } : {}),
          ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
          paymentPreference,
          shippingMethod,
          ...(shippingMethod === 'mainland_portugal' || shippingAddress.trim() ? { shippingAddress: shippingAddress.trim() } : {}),
          items: items.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            colors: item.selectedVariant
              ? item.selectedVariant.colors.map(color => color.name)
              : item.selectedParts?.length
              ? item.selectedParts.map(part => `${part.label}: ${part.colorName}`)
              : item.selectedColors?.map(color => color.name) ?? [item.selectedColor.name],
            selectedVariant: item.selectedVariant
                ? {
                  id: item.selectedVariant.id,
                  name: item.selectedVariant.name,
                  kind: item.selectedVariant.kind,
                  colors: item.selectedVariant.colors.map(color => color.name),
                }
              : undefined,
            customText: item.customizations.map(customization => `${customization.label}: ${customization.value}`).join(', '),
            unitPrice: item.unitPrice,
            itemStatus: 'new',
            adminNotes: '',
            scheduledFor: '',
            quantityDone: 0,
          })),
          subtotal: totalPrice,
          shippingCost,
          total: totalWithShipping,
          paymentStatus: 'pending',
          fulfillmentStatus: 'new',
          notes,
          createdAt: now,
          updatedAt: now,
        }),
      )

      clearCart()
      setLastOrderId(orderId)
      resetCheckout()
      // window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Não foi possível submeter a encomenda. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Fundo escuro */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Gaveta lateral */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-md bg-background z-50 shadow-xl transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho de compras"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {step === 'items' ? `Carrinho (${totalItems})` : 'Dados do pedido'}
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar carrinho"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* {items.length > 0 && (
          <div className="grid grid-cols-2 border-b border-border bg-secondary/50 p-2">
            <button
              type="button"
              onClick={() => setStep('items')}
              className={`rounded-md px-3 py-2 text-sm font-medium ${step === 'items' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              1. Artigos
            </button>
            <button
              type="button"
              onClick={() => setStep('checkout')}
              className={`rounded-md px-3 py-2 text-sm font-medium ${step === 'checkout' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              2. Finalizar
            </button>
          </div>
        )} */}

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/50 mb-4" />
              {lastOrderId ? (
                <>
                  <p className="font-semibold text-foreground">Pré-encomenda submetida</p>
                  <p className="mt-2 text-sm text-muted-foreground">Entraremos em contacto brevemente para confirmar os detalhes da sua encomenda.</p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-4">O seu carrinho está vazio</p>
                  <Button asChild onClick={closeCart}>
                    <Link href="/loja">Ver Produtos</Link>
                  </Button>
                </>
              )}
            </div>
          ) : step === 'items' ? (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="p-4 flex gap-4">
                  {/* Imagem do produto */}
                  <div className="w-20 h-20 relative rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                    <Image
                      src={item.selectedVariant?.image || item.product.image}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>

                  {/* Detalhes */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-sm line-clamp-1">
                      {item.product.name}
                    </h3>
                    
                    {/* Cores */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {item.selectedVariant ? (
                        <>
                          <div className="flex -space-x-1">
                            {item.selectedVariant.colors.map((color, i) => (
                              <span
                                key={`${color.name}-${i}`}
                                className="w-3 h-3 rounded-full border border-border"
                                style={{
                                  backgroundColor: color.hex,
                                  backgroundImage: color.imageUrl ? `url(${color.imageUrl})` : undefined,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                }}
                                aria-hidden="true"
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Opção: {item.selectedVariant.name}
                          </span>
                        </>
                      ) : item.selectedParts?.length ? (
                        <>
                          <div className="flex -space-x-1">
                            {item.selectedParts.map((part, i) => (
                              <span
                                key={`${part.label}-${i}`}
                                className="w-3 h-3 rounded-full border border-border"
                                style={{ backgroundColor: part.colorHex }}
                                aria-hidden="true"
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {item.selectedParts.map(part => `${part.label}: ${part.colorName}`).join(', ')}
                          </span>
                        </>
                      ) : item.selectedColors && item.selectedColors.length > 1 ? (
                        <>
                          <div className="flex -space-x-1">
                            {item.selectedColors.map((color, i) => (
                              <span
                                key={i}
                                className="w-3 h-3 rounded-full border border-border"
                                style={{ backgroundColor: color.hex }}
                                aria-hidden="true"
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {item.selectedColors.map(c => c.name).join(', ')}
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            className="w-3 h-3 rounded-full border border-border"
                            style={{ backgroundColor: item.selectedColor.hex }}
                            aria-hidden="true"
                          />
                          <span className="text-xs text-muted-foreground">
                            {item.selectedColor.name}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Personalizações */}
                    {item.customizations.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {item.customizations.map((c, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {c.label}: <span className="font-medium">{c.value}</span>
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Preço e Quantidade */}
                    <div className="flex items-center justify-between mt-2">
                      <p className="font-semibold text-foreground">
                        €{(item.unitPrice * item.quantity).toFixed(2)}
                      </p>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded bg-secondary text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center"
                          aria-label="Diminuir quantidade"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded bg-secondary text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center"
                          aria-label="Aumentar quantidade"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-7 h-7 rounded text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center ml-1"
                          aria-label="Remover item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <form id="cart-checkout-form" onSubmit={handlePreOrder} className="space-y-4 p-4">
              {submitError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {submitError}
                </div>
              )}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="cart-name">Nome</Label>
                  <Input id="cart-name" value={customerName} onChange={event => setCustomerName(event.target.value)} required />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="cart-phone">WhatsApp / telemóvel</Label>
                    <Input
                      id="cart-phone"
                      value={customerPhone}
                      onChange={event => setCustomerPhone(event.target.value)}
                      inputMode="tel"
                      placeholder="Opcional se indicar email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cart-email">Email</Label>
                    <Input id="cart-email" type="email" value={customerEmail} onChange={event => setCustomerEmail(event.target.value)} placeholder="Opcional se indicar telemóvel" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="cart-shipping">Entrega</Label>
                    <select
                      id="cart-shipping"
                      value={shippingMethod}
                      onChange={event => setShippingMethod(event.target.value as 'pickup_carcavelos' | 'mainland_portugal')}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="pickup_carcavelos">Recolha em Carcavelos</option>
                      <option value="mainland_portugal">Envio para Portugal continental</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="cart-payment">Preferência de pagamento</Label>
                    <select
                      id="cart-payment"
                      value={paymentPreference}
                      onChange={event => setPaymentPreference(event.target.value as 'mbway' | 'bank_transfer' | 'cash_pickup' | 'other')}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="mbway">MB Way</option>
                      <option value="bank_transfer">Transferência bancária</option>
                      <option value="cash_pickup">Dinheiro na recolha</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>
                </div>
                {shippingMethod === 'mainland_portugal' && (
                  <div>
                    <Label htmlFor="cart-address">Morada de envio</Label>
                    <Input id="cart-address" value={shippingAddress} onChange={event => setShippingAddress(event.target.value)} required />
                  </div>
                )}
                <div>
                  <Label htmlFor="cart-notes">Notas (opcional)</Label>
                  <Input id="cart-notes" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Prazo, mensagem de oferta, perguntas..." />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Rodapé */}
        {items.length > 0 && (
          <div className="border-t border-border p-4 space-y-4 bg-background">
            {/* Totais */}
            <div className="flex items-center justify-between">
              <span className="text-lg text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-foreground">
                €{totalWithShipping.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {shippingMethod === 'pickup_carcavelos'
                ? 'Recolha em Carcavelos. Os dados de pagamento são confirmados manualmente.'
                : shippingCost === 0
                  ? 'Envio gratuito para Portugal continental. Os dados de pagamento são confirmados manualmente.'
                  : `Inclui €${shippingCost.toFixed(2)} de envio para Portugal continental (gratuito acima de 50€). Os dados de pagamento são confirmados manualmente.`}
            </p>

            {/* Ações */}
            <div className="space-y-3">
              {step === 'items' ? (
                <Button
                  type="button"
                  onClick={() => setStep('checkout')}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-lg"
                >
                  Continuar para finalização
                </Button>
              ) : (
                <Button
                  type="submit"
                  form="cart-checkout-form"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 px-4 rounded-lg"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submeter pré-encomenda
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={step === 'checkout' ? () => setStep('items') : clearCart}
              >
                {step === 'checkout' ? 'Voltar aos artigos' : 'Limpar Carrinho'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
