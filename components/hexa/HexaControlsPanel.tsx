// components/hexa/HexaControlsPanel.tsx
'use client'

import { Copy, CreditCard, GripVertical, Plus, Trash2 } from 'lucide-react'
import { Reorder } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { type HexaSize, type HexaTile } from '@/types/hexa'
import { colorHex, formatCurrency } from '@/lib/hexa-helpers'

interface CatalogProduct { 
  id: string
  slug: string
  name: string
  priceFrom: number
  priceTo?: number
  variants?: {
    id: string
    name: string
    finalPrice?: number
    colors: { name: string; hex: string; imageUrl?: string }[]
  }[]
}

interface HexaControlsPanelProps {
  mosaicSize: HexaSize
  setMosaicSize: (size: HexaSize) => void
  tiles: HexaTile[]
  setTiles: (tiles: HexaTile[]) => void
  selectedTile: HexaTile | undefined
  setSelectedId: (id: string) => void
  availableColors: { name: string; hex: string }[]
  unitPrice: number
  pricing: { total: number; subtotal: number; discountAmount: number; discountApplied: string | null }
  products: CatalogProduct[]
  onAddTile: () => void
  onDuplicateTile: (tile: HexaTile) => void
  onRemoveTile: (id: string) => void
  onOpenCheckout: () => void
}

export function HexaControlsPanel({
  mosaicSize,
  setMosaicSize,
  tiles,
  setTiles,
  selectedTile,
  setSelectedId,
  availableColors,
  unitPrice,
  pricing,
  products,
  onAddTile,
  onDuplicateTile,
  onRemoveTile,
  onOpenCheckout,
}: HexaControlsPanelProps) {
  return (
    <div className="space-y-5">
      {/* Tamanho do Mosaico */}
      <div className="rounded-lg border border-border bg-white p-4">
        {/* ... Select ... */}
      </div>

      {/* Resumo de Preço */}
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Total estimado</p>
            <p className="text-3xl font-bold">{formatCurrency(pricing.total)}</p>
          </div>
          <div className="rounded-md bg-[#fff3d7] px-3 py-2 text-right text-sm text-[#7b5420]">
            {tiles.length} peças
          </div>
        </div>
        <div className="space-y-1 text-sm text-[#62574d]">
          <div className="flex justify-between"><span>Preço unitário</span><span>{formatCurrency(unitPrice)}</span></div>
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(pricing.subtotal)}</span></div>
          <div className="flex justify-between"><span>Desconto</span><span>{pricing.discountApplied ?? 'Sem desconto'} ({formatCurrency(pricing.discountAmount)})</span></div>
        </div>
      </div>

      {/* Lista ordenável de peças */}
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Peças</h2>
          <Button size="sm" variant="outline" onClick={onAddTile}>
            <Plus className="size-4" /> Adicionar
          </Button>
        </div>
        <Reorder.Group axis="y" values={tiles} onReorder={setTiles} className="space-y-2">
          {tiles.map((tile, idx) => {
            const frameColor = colorHex(tile.color, availableColors)
            return (
              <Reorder.Item key={tile.id} value={tile} as="div">
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-md border bg-card p-2 shadow-sm',
                    selectedTile?.id === tile.id ? 'border-primary ring-2 ring-primary/25' : '',
                  )}
                >
                  <button type="button" className="cursor-grab px-1 text-primary" aria-label="Reordenar peça">
                    <GripVertical className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => setSelectedId(tile.id)}
                  >
                    <span
                      className="size-9 shrink-0 overflow-hidden border"
                      style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', borderColor: frameColor, backgroundColor: frameColor }}
                    >
                      {tile.photoPreviewUrl && <img src={tile.photoPreviewUrl} alt="" className="h-full w-full object-cover" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">Peça {idx + 1}</span>
                      <span className="block text-xs text-[#766c61]">{mosaicSize} · {tile.color}</span>
                    </span>
                  </button>
                  <Button size="icon" variant="ghost" onClick={() => onDuplicateTile(tile)} aria-label="Duplicar peça">
                    <Copy className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onRemoveTile(tile.id)} disabled={tiles.length <= 1} aria-label="Remover peça">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Reorder.Item>
            )
          })}
        </Reorder.Group>
      </div>

      {/* Botão finalizar encomenda */}
      <Button className="h-12 w-full bg-primary text-base text-primary-foreground hover:bg-primary/90" onClick={onOpenCheckout}>
        Finalizar Encomenda
        <CreditCard className="size-4" />
      </Button>
    </div>
  )
}