'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import {
  HEXA_SIZES,
  type HexaColor,
  type HexaSize,
  type HexaSpaceType,
  type HexaTile,
} from '@/types/hexa'
import { HexaCheckoutDialog } from '@/components/hexa/HexaCheckoutDialog'
import { HexaControlsPanel } from '@/components/hexa/HexaControlsPanel'
import { CatalogProduct } from '@/types'
import { HexaCanvas } from '@/components/hexa/HexaCanvas'
import { createTile, pricePreview, productColors, sizeToSlug } from '@/lib/hexa-helpers'
import { HexaEditModal } from '@/components/hexa/HexaEditModal'

const MAX_TILES = 30
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png'])

export default function HexaConfiguratorPage() {
  const [mosaicSize, setMosaicSize] = useState<HexaSize>('S')
  const [tiles, setTiles] = useState<HexaTile[]>(() => [createTile(), createTile(), createTile()])
  const [selectedId, setSelectedId] = useState(() => tiles[0]?.id ?? '')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', spaceType: 'Casa' as HexaSpaceType })

  const productsQuery = db.useQuery({
    catalogProducts: {
      $: { where: { slug: { $in: Object.values(sizeToSlug) } } },
    },
  })
  // Forçar tipo com 'any' para evitar conflito de Date
  const products = (productsQuery.data?.catalogProducts ?? []) as any as CatalogProduct[]
  const selectedSlug = sizeToSlug[mosaicSize]
  const selectedProduct = products.find((p) => p.slug === selectedSlug)
  const availableColors = useMemo(() => productColors(selectedProduct), [selectedProduct])
  const unitPrice = selectedProduct?.priceFrom ?? HEXA_SIZES[mosaicSize].price
  const selectedTile = tiles.find((t) => t.id === selectedId) ?? tiles[0]
  const pricing = useMemo(() => pricePreview(tiles.length, unitPrice), [tiles.length, unitPrice])

  useEffect(() => {
    const allowed = new Set(availableColors.map((c) => c.name))
    const fallback = (availableColors[0]?.name || 'Preto') as HexaColor
    setTiles((current) =>
      current.map((tile) => (allowed.has(tile.color) ? tile : { ...tile, color: fallback }))
    )
  }, [availableColors])

  function updateSelected(patch: Partial<HexaTile>) {
    if (!selectedTile) return
    setTiles((current) => current.map((t) => (t.id === selectedTile.id ? { ...t, ...patch } : t)))
  }

  function addTile(source?: HexaTile) {
    if (tiles.length >= MAX_TILES) {
      toast.info('Máximo de 30 peças. Para encomendas maiores, por favor contacte-nos.')
      return
    }
    const fallback = (availableColors[0]?.name || 'Preto') as HexaColor
    const next = source
      ? { ...source, id: crypto.randomUUID(), photoPreviewUrl: source.photoPreviewUrl ?? null }
      : createTile(fallback)
    setTiles([...tiles, next])
    setSelectedId(next.id)
  }

  function duplicateTile(tile: HexaTile) {
    addTile(tile)
  }

  function removeTile(id: string) {
    if (tiles.length <= 1) return
    const next = tiles.filter((t) => t.id !== id)
    if (selectedId === id) setSelectedId(next[0]?.id ?? '')
    setTiles(next)
  }

  async function handlePhotoUpload(file: File) {
    if (!selectedTile) return
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error('Use uma fotografia JPG ou PNG.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('A fotografia deve ter no máximo 5MB.')
      return
    }
    updateSelected({
      photoPreviewUrl: URL.createObjectURL(file),
      photoName: file.name,
      photoAdjustments: { ...selectedTile.photoAdjustments }, // mantém ajustes atuais
    })
    toast.success('Fotografia adicionada à pré-visualização.')
    setEditModalOpen(false)
  }

  async function submitCheckout(customerData: typeof customer) {
    if (!selectedProduct) {
      toast.error('Não foi possível carregar o produto selecionado.')
      return
    }
    if (customerData.name.trim().length < 2) {
      toast.error('Indique o seu nome.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email.trim())) {
      toast.error('Indique um email válido.')
      return
    }
    if (customerData.phone?.length && customerData.phone.trim().length < 9) {
      toast.error('Indique um telemóvel válido.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/checkout/hexa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerData,
          mosaicSize,
          productSlug: selectedProduct.slug,
          tiles: tiles.map((tile) => ({
            id: tile.id,
            color: tile.color,
            photoAdjustments: tile.photoAdjustments,
          })),
          layout: { type: 'honeycomb', gapMm: 0 },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível iniciar o pagamento.')
      window.location.href = data.checkoutUrl
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível iniciar o pagamento.')
      setIsSubmitting(false)
    }
  }

  const controlsProps = {
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
    onAddTile: () => addTile(),
    onDuplicateTile: duplicateTile,
    onRemoveTile: removeTile,
    onOpenCheckout: () => setCheckoutOpen(true),
    onEditTile: () => setEditModalOpen(true), // abrir modal de edição
  }

  return (
    <main className="min-h-screen bg-[#f7f2ea] text-[#231f19]">
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col lg:grid lg:grid-cols-[30%_70%]">
        <aside className="hidden overflow-y-auto border-r border-border bg-card p-5 lg:sticky lg:top-0 lg:block lg:max-h-screen">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">HexaMemória</p>
            <h1 className="mt-2 text-3xl font-bold">Construa o seu mosaico</h1>
          </div>
          <HexaControlsPanel {...controlsProps} />
        </aside>

        <section className="flex min-h-screen flex-col">
          <header className="flex items-center justify-between border-b border-border bg-white/78 px-4 py-3 backdrop-blur lg:px-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Colmeia 2D</p>
              <p className="text-sm text-[#62574d]">Reordene a lista para reorganizar automaticamente as peças.</p>
            </div>
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button className="lg:hidden">Controlos</Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[40vh] rounded-t-lg">
                <DrawerHeader>
                  <DrawerTitle>Controlos</DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto px-4 pb-5">
                  <HexaControlsPanel {...controlsProps} />
                </div>
              </DrawerContent>
            </Drawer>
          </header>
          <div className="flex-1 p-3 lg:p-6">
            <HexaCanvas
              tiles={tiles}
              selectedId={selectedTile?.id ?? ''}
              mosaicSize={mosaicSize}
              availableColors={availableColors}
              onSelect={(id) => {
                setSelectedId(id)
                setEditModalOpen(true) // abre modal ao clicar na peça
              }}
            />
          </div>
        </section>
      </div>

      <HexaCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        onSubmit={submitCheckout}
        isSubmitting={isSubmitting}
        customer={customer}
        setCustomer={setCustomer}
      />

      <HexaEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        tile={selectedTile}
        availableColors={availableColors}
        onUpdate={updateSelected}
        onPhotoUpload={handlePhotoUpload}
      />
    </main>
  )
}
