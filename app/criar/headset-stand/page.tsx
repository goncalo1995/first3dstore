'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Box, Eye, Headphones, Rotate3D, Sparkles } from 'lucide-react'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCart } from '@/lib/cart-context'
import type { Product, ProductColor } from '@/lib/products'

type StandVariantId = 'tower' | 'stealth' | 'clamp'

type StandVariant = {
  id: StandVariantId
  tabLabel: string
  name: string
  formatLabel: string
  price: number
  grams: { main: number; accent: number }
}

const standVariants: StandVariant[] = [
  {
    id: 'tower',
    tabLabel: 'De Mesa',
    name: 'De Mesa',
    formatLabel: 'Base de Mesa (Tower)',
    price: 29.90,
    grams: { main: 130, accent: 12 },
  },
  {
    id: 'stealth',
    tabLabel: 'Oculto (3M)',
    name: 'Oculto (3M)',
    formatLabel: 'Por baixo da mesa (Stealth)',
    price: 24.90,
    grams: { main: 85, accent: 10 },
  },
  {
    id: 'clamp',
    tabLabel: 'Aperto (Rosca)',
    name: 'Aperto (Rosca)',
    formatLabel: 'Aperto com Rosca (Clamp)',
    price: 34.90,
    grams: { main: 155, accent: 14 },
  },
]

const mainColors: ProductColor[] = [
  { name: 'Carbon Black', hex: '#0B0D10' },
  { name: 'Cyber White', hex: '#F4F7FB' },
]

const accentColors: ProductColor[] = [
  { name: 'Neon Lime', hex: '#A3FF12' },
  { name: 'Pulse Blue', hex: '#38BDF8' },
  { name: 'Signal Red', hex: '#FF3B5C' },
  { name: 'Cyber White', hex: '#F4F7FB' },
]

const headsetProduct: Product = {
  id: 'headset-stand',
  slug: 'headset-stand',
  name: 'Suporte de Auscultadores Personalizado',
  category: 'secretaria',
  categorySlugs: ['secretaria', 'gaming', 'headset-stand'],
  priceFrom: 24.90,
  priceTo: 34.90,
  benefit: 'Eleva o setup com um suporte feito à medida em Portugal',
  description: 'Suporte de auscultadores premium para setups gaming e trabalho, com estrutura à escolha, detalhe colorido e gamertag opcional.',
  image: '/placeholder.svg',
  images: ['/placeholder.svg'],
  colors: [...mainColors, ...accentColors],
  customizable: true,
  customizationOptions: [{ type: 'text', label: 'Gamertag', maxChars: 15, priceAdd: 5 }],
  multiColor: true,
  multiColorCount: 2,
  colorSelectionMode: 'preset_options',
  isModular: true,
  featured: true,
  featuredRank: 1,
  visible: true,
  materialGrams: 142,
  materialRecipe: [
    { label: 'Estrutura', grams: 130, materialType: 'PLA', colorSource: 'partColor' },
    { label: 'Detalhe/Texto', grams: 12, materialType: 'PLA', colorSource: 'partColor' },
  ],
  stockStatus: 'made_to_order',
  leadTimeDays: 4,
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function HeadsetStandPreview({
  variant,
  mainColor,
  accentColor,
  gamertagText,
}: {
  variant: StandVariantId
  mainColor: ProductColor
  accentColor: ProductColor
  gamertagText: string
}) {
  const isStealth = variant === 'stealth'
  const isClamp = variant === 'clamp'
  const label = gamertagText.trim() || 'EM3D'

  return (
    <svg
      viewBox="0 0 420 360"
      role="img"
      aria-label="Pré-visualização 2D do suporte de auscultadores"
      className="h-full w-full"
    >
      <defs>
        <filter id="headset-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="preview-surface" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <rect x="18" y="18" width="384" height="324" rx="22" fill="url(#preview-surface)" stroke="rgba(255,255,255,0.1)" />
      <path d="M70 292 C130 314 290 314 350 292" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round" />

      {isStealth ? (
        <>
          <rect x="96" y="94" width="228" height="34" rx="12" fill={mainColor.hex} stroke="rgba(255,255,255,0.22)" strokeWidth="3" />
          <path d="M130 128 V236 C130 262 152 282 178 282 H242 C268 282 290 262 290 236 V128" fill="none" stroke={mainColor.hex} strokeWidth="32" strokeLinecap="round" />
          <path d="M146 136 H274" stroke={accentColor.hex} strokeWidth="7" strokeLinecap="round" filter="url(#headset-glow)" />
          <path d="M166 244 H254" stroke={accentColor.hex} strokeWidth="8" strokeLinecap="round" />
        </>
      ) : isClamp ? (
        <>
          <path d="M218 78 V260" stroke={mainColor.hex} strokeWidth="38" strokeLinecap="round" />
          <path d="M156 88 H280 C308 88 330 110 330 138 V156" fill="none" stroke={mainColor.hex} strokeWidth="32" strokeLinecap="round" />
          <rect x="128" y="246" width="180" height="38" rx="13" fill={mainColor.hex} stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
          <path d="M308 132 H354 V210 H306" fill="none" stroke={mainColor.hex} strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="350" cy="250" r="22" fill="none" stroke={accentColor.hex} strokeWidth="9" filter="url(#headset-glow)" />
          <path d="M328 250 H278" stroke={accentColor.hex} strokeWidth="8" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M210 76 V254" stroke={mainColor.hex} strokeWidth="38" strokeLinecap="round" />
          <path d="M142 90 H278 C304 90 324 110 324 136 V156" fill="none" stroke={mainColor.hex} strokeWidth="32" strokeLinecap="round" />
          <path d="M134 270 H286" stroke={mainColor.hex} strokeWidth="40" strokeLinecap="round" />
          <path d="M164 252 H256" stroke={accentColor.hex} strokeWidth="8" strokeLinecap="round" filter="url(#headset-glow)" />
          <circle cx="210" cy="132" r="12" fill={accentColor.hex} filter="url(#headset-glow)" />
        </>
      )}

      <text
        x="210"
        y="312"
        textAnchor="middle"
        fill={accentColor.hex}
        fontFamily="Inter, sans-serif"
        fontSize="22"
        fontWeight="800"
        letterSpacing="0"
      >
        {label.slice(0, 15)}
      </text>
    </svg>
  )
}

export default function HeadsetStandConfiguratorPage() {
  const router = useRouter()
  const { addItem } = useCart()
  const [selectedVariant, setSelectedVariant] = useState<StandVariantId>('tower')
  const [mainColor, setMainColor] = useState<ProductColor>(mainColors[0])
  const [accentColor, setAccentColor] = useState<ProductColor>(accentColors[0])
  const [gamertagText, setGamertagText] = useState('')
  const [preview3dOpen, setPreview3dOpen] = useState(false)

  const activeVariant = useMemo(
    () => standVariants.find((variant) => variant.id === selectedVariant) ?? standVariants[0],
    [selectedVariant],
  )
  const gamertagPrice = gamertagText.trim().length > 0 ? 5 : 0
  const totalPrice = activeVariant.price + gamertagPrice

  function handleGamertagChange(value: string) {
    setGamertagText(value.toUpperCase().slice(0, 15))
  }

  function handleCheckout() {
    const trimmedGamertag = gamertagText.trim()

    addItem({
      product: {
        ...headsetProduct,
        variants: standVariants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          kind: 'preset_pack',
          colorMode: 'multi_part',
          finalPrice: variant.price,
          formatLabel: variant.formatLabel,
          colors: [],
        })),
      },
      quantity: 1,
      selectedColor: mainColor,
      selectedColors: [mainColor, accentColor],
      selectedParts: [
        {
          label: 'Estrutura',
          colorName: mainColor.name,
          colorHex: mainColor.hex,
          globalColorId: mainColor.globalColorId,
          colorPriceAdd: mainColor.priceAdd,
          grams: activeVariant.grams.main,
        },
        {
          label: 'Detalhe/Texto',
          colorName: accentColor.name,
          colorHex: accentColor.hex,
          globalColorId: accentColor.globalColorId,
          colorPriceAdd: accentColor.priceAdd,
          grams: activeVariant.grams.accent,
        },
      ],
      selectedVariant: {
        id: activeVariant.id,
        name: activeVariant.name,
        kind: 'preset_pack',
        colorMode: 'multi_part',
        colors: [],
        finalPrice: activeVariant.price,
      },
      customizations: trimmedGamertag
        ? [{ label: 'Gamertag', value: trimmedGamertag, priceAdd: 5 }]
        : [],
      unitPrice: totalPrice,
    })

    router.push('/checkout')
  }

  return (
    <main className="min-h-screen bg-[#09090b] pb-32 text-white">
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="size-4" />
              Configurador EM3D
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Suporte de auscultadores</h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-white/58 md:text-right">
            Preview 2D instantâneo para máxima performance mobile. A visualização 3D fica disponível em janela separada.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-3 rounded-lg border border-white/10 bg-white/7 p-1">
          {standVariants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => setSelectedVariant(variant.id)}
              className={`min-h-12 rounded-md px-2 text-sm font-bold transition ${
                selectedVariant === variant.id
                  ? 'bg-primary text-primary-foreground shadow-[0_0_24px_rgba(163,255,18,0.22)]'
                  : 'text-white/68 hover:bg-white/8 hover:text-white'
              }`}
            >
              {variant.tabLabel}
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_420px]">
          <section className="overflow-hidden rounded-lg border border-white/10 bg-[#101015]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-white/64">
                <Headphones className="size-4 text-primary" />
                Preview 2D
              </div>
              <span className="text-sm font-semibold text-primary">{activeVariant.formatLabel}</span>
            </div>
            <div className="relative aspect-[4/3] min-h-[360px] bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.16),transparent_34%),linear-gradient(180deg,#15151b,#0b0b0e)] p-3">
              <HeadsetStandPreview
                variant={selectedVariant}
                mainColor={mainColor}
                accentColor={accentColor}
                gamertagText={gamertagText}
              />
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-lg border border-white/10 bg-white/7 p-5">
              <div className="flex items-center gap-2">
                <Box className="size-5 text-primary" />
                <h2 className="text-lg font-bold">Acabamento</h2>
              </div>

              <div className="mt-5">
                <Label className="text-white/80">Cor da Estrutura</Label>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {mainColors.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setMainColor(color)}
                      className={`min-h-16 rounded-lg border p-3 text-left transition ${
                        mainColor.name === color.name ? 'border-primary bg-primary/12' : 'border-white/10 bg-black/20 hover:border-white/25'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="size-6 rounded-full border border-white/20" style={{ backgroundColor: color.hex }} />
                        <span className="text-sm font-bold">{color.name}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <Label className="text-white/80">Cor do Detalhe/Texto</Label>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {accentColors.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setAccentColor(color)}
                      className={`min-h-16 rounded-lg border p-3 text-left transition ${
                        accentColor.name === color.name ? 'border-primary bg-primary/12' : 'border-white/10 bg-black/20 hover:border-white/25'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="size-6 rounded-full border border-white/20" style={{ backgroundColor: color.hex }} />
                        <span className="text-sm font-bold">{color.name}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/7 p-5">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="gamertag" className="text-white/80">O teu Gamertag</Label>
                <span className="text-xs font-bold text-white/48">{gamertagText.length}/15</span>
              </div>
              <Input
                id="gamertag"
                value={gamertagText}
                onChange={(event) => handleGamertagChange(event.target.value)}
                maxLength={15}
                placeholder="EX: RIFT"
                className="mt-3 h-12 border-white/10 bg-black/30 text-base font-bold uppercase text-white placeholder:text-white/24"
              />
              <p className="mt-3 text-sm leading-6 text-white/54">
                Personalização com texto adiciona {formatPrice(5)} ao total.
              </p>
            </section>
          </aside>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#09090b]/92 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Total</p>
            <p className="text-2xl font-black text-white">{formatPrice(totalPrice)}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPreview3dOpen(true)}
            className="h-12 border-white/12 bg-white/6 px-3 text-xs font-bold text-white hover:bg-white hover:text-[#09090b] sm:px-4 sm:text-sm"
          >
            <Rotate3D className="size-4" />
            Ver em 3D
          </Button>
          <Button
            type="button"
            onClick={handleCheckout}
            className="h-12 bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90 sm:px-5 sm:text-sm"
          >
            Avançar para Compra
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      <Dialog open={preview3dOpen} onOpenChange={setPreview3dOpen}>
        <DialogContent className="border-white/10 bg-[#111116] text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black">
              <Eye className="size-5 text-primary" />
              Visualização 3D
            </DialogTitle>
            <DialogDescription className="text-white/58">
              A experiência 3D completa será ligada aqui. Para já, a configuração final usa o preview 2D otimizado para telemóvel.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-white/10 bg-black/24 p-4">
            <HeadsetStandPreview
              variant={selectedVariant}
              mainColor={mainColor}
              accentColor={accentColor}
              gamertagText={gamertagText}
            />
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
