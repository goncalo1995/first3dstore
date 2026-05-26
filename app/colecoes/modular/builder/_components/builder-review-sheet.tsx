'use client'

import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  EXTRA_LETTER_PACKS,
  type ExtraLetterPackSelection,
} from '@/lib/modular-inventory-config'
import type { CheckoutLane, PhysicalWallsBom } from '@/lib/modular-physical-grid'

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

export function ReviewSheet({
  open,
  bom,
  shippingCost,
  checkoutLane,
  extraLetterPackSelections,
  isSubmitting,
  catalogLoading,
  disabled,
  onClose,
  onSubmit,
}: {
  open: boolean
  bom: PhysicalWallsBom
  shippingCost: number
  checkoutLane: CheckoutLane
  extraLetterPackSelections: ExtraLetterPackSelection[]
  isSubmitting: boolean
  catalogLoading: boolean
  disabled: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  if (!open) return null
  const total = bom.totalAfterDiscount + shippingCost

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:py-6">
      <div className="max-h-[min(82dvh,720px)] w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-white text-stone-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">Revisão final</p>
            <h2 className="mt-1 text-2xl font-black">{formatMoney(total)}</h2>
            <p className="mt-1 text-xs font-bold text-stone-500">
              {checkoutLane === 'manual_quote' ? 'Orçamento manual' : 'Pagamento seguro Stripe'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-stone-100 text-stone-500 transition hover:text-stone-950"
            aria-label="Fechar revisão"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[calc(min(82dvh,720px)-10rem)] overflow-y-auto overscroll-contain px-5 py-4">
          <div className="grid gap-3 text-sm">
            {[
              ['Paredes', `${bom.wallCount}`],
              ['Calhas de 25cm', `${bom.totalRailModules}`],
              ['Packs standard', `${bom.standardPackQuantity}`],
              ['Letras avulso', `${bom.avulsoCharacterQuantity}`],
              ['Letras/símbolos extra', `${extraLetterPackSelections.length}`],
              ['Subtotal modular', formatMoney(bom.totalAfterDiscount)],
              ['Envio', shippingCost > 0 ? formatMoney(shippingCost) : 'Levantamento'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <span className="font-bold text-stone-500">{label}</span>
                <span className="font-black text-stone-950">{value}</span>
              </div>
            ))}
          </div>
          {extraLetterPackSelections.length > 0 && (
            <div className="mt-4 rounded-2xl border border-stone-200 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">Packs extra</p>
              <div className="mt-3 grid gap-2 text-sm">
                {extraLetterPackSelections.map(selection => (
                  <div key={selection.id} className="flex items-center justify-between gap-3">
                    <span className="font-bold">{selection.quantity}x {EXTRA_LETTER_PACKS[selection.packId]?.label ?? selection.packId}</span>
                    <span className="inline-flex items-center gap-2 text-stone-500">
                      <span className="size-3 rounded-full border border-stone-300" style={{ backgroundColor: selection.color.hex }} />
                      {selection.color.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {bom.hasOverflow && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              Existe texto maior do que a calha física.
            </p>
          )}
        </div>
        <div className="border-t border-stone-200 p-4">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={catalogLoading || isSubmitting || disabled}
            className="h-13 w-full rounded-full bg-stone-950 text-white hover:bg-[#d4af37] hover:text-stone-950"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {catalogLoading ? 'A carregar inventário...' : checkoutLane === 'manual_quote' ? 'Pedir Orçamento Gratuito' : 'Pagar com Stripe'}
          </Button>
        </div>
      </div>
    </div>
  )
}
