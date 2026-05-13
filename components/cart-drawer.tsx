'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { Button } from '@/components/ui/button'

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function getItemDescriptor(item: ReturnType<typeof useCart>['items'][number]) {
  if (item.selectedVariant) {
    return `Opção: ${item.selectedVariant.name}`
  }

  if (item.selectedParts?.length) {
    return item.selectedParts.map(part => `${part.label}: ${part.colorName}`).join(' · ')
  }

  if (item.selectedColors?.length) {
    return `Cores: ${item.selectedColors.map(color => color.name).join(', ')}`
  }

  // Guard legacy/stale items
  if (item.selectedColor && typeof item.selectedColor === 'object' && item.selectedColor.name) {
    return `Cor: ${item.selectedColor.name}`
  }

  return ''
}

function getCustomText(item: ReturnType<typeof useCart>['items'][number]) {
  // Guard legacy/stale items - ensure customizations is an array
  if (!Array.isArray(item.customizations)) {
    return ''
  }
  return item.customizations
    .filter(customization => customization.value?.trim?.().length > 0)
    .map(customization => `${customization.label}: ${customization.value}`)
    .join(' | ')
}

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalItems, totalPrice, clearCart } = useCart()

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCart()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [closeCart])

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/55 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho de compras"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Carrinho ({totalItems})</h2>
          </div>
          <button
            onClick={closeCart}
            className="-mr-2 p-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Fechar carrinho"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-5 text-center">
              <ShoppingBag className="mb-4 size-12 text-muted-foreground/45" />
              <p className="font-medium text-foreground">O carrinho está vazio</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Adiciona uma peça da loja para começares a encomenda.
              </p>
              <Button asChild onClick={closeCart} className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/loja">Ver loja</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => {
                const customText = getCustomText(item)
                const itemImage = item.selectedVariant?.image || item.product.images?.[0] || item.product.image

                return (
                  <article key={item.id} className="flex gap-4 p-5">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                      <Image
                        src={itemImage}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                            {item.product.name}
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {getItemDescriptor(item)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remover item"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      {customText && (
                        <p className="mt-2 rounded-md bg-secondary px-2.5 py-1.5 text-xs leading-5 text-muted-foreground">
                          {customText}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Unidade</p>
                          <p className="text-sm font-semibold text-foreground">{formatPrice(item.unitPrice)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="flex size-8 items-center justify-center rounded-md bg-secondary text-foreground transition-colors hover:bg-secondary/80"
                            aria-label="Diminuir quantidade"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="flex size-8 items-center justify-center rounded-md bg-secondary text-foreground transition-colors hover:bg-secondary/80"
                            aria-label="Aumentar quantidade"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
                        <span className="text-xs text-muted-foreground">Total do item</span>
                        <span className="font-semibold text-foreground">
                          {formatPrice(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-4 border-t border-border bg-background p-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">{formatPrice(totalPrice)}</span>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Portes calculados no checkout. Recolha em Carcavelos disponível sem custo.
              </p>
            </div>

            <Button asChild onClick={closeCart} className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/checkout">Finalizar encomenda</Link>
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={clearCart}>
              Limpar carrinho
            </Button>
          </div>
        )}
      </aside>
    </>
  )
}
