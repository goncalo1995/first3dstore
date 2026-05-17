'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Eye, Palette, RotateCw, ShoppingBag, Sparkles, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCart } from '@/lib/cart-context'
import type { Product } from '@/lib/products'
import {
  collectVisualProductImages,
  getVisualEngravingOption,
  getVisualProductConfig,
  visualProductConfigBySlug,
  visualVariantToProductVariant,
  type VisualColor,
  type VisualProductConfig,
  type VisualVariant,
  type VisualViewId,
} from '@/lib/visual-product-config'

export type CinematicProductExperienceProps = {
  product: Product
  fallbackHref?: string
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function getConfig(product: Product) {
  return getVisualProductConfig(product.slug) ?? visualProductConfigBySlug['headset-stand']
}

function imageMatrixKey(variant: VisualVariant, baseColor: VisualColor, accentColor: VisualColor, viewId: VisualViewId) {
  return `${variant.id}.${baseColor.id}.${accentColor.id}.${viewId}`
}

function resolveImage(config: VisualProductConfig, variant: VisualVariant, baseColor: VisualColor, accentColor: VisualColor, viewId: VisualViewId) {
  return config.imageMatrix?.[imageMatrixKey(variant, baseColor, accentColor, viewId)]
    ?? variant.images[viewId]
    ?? null
}

function validateEngraving(value: string, config: VisualProductConfig) {
  const trimmed = value.trim()
  if (!trimmed) return { value: '', error: '' }
  if (trimmed.length > config.engraving.maxChars) {
    return { value: trimmed, error: `A gravação pode ter no máximo ${config.engraving.maxChars} caracteres.` }
  }
  const pattern = new RegExp(config.engraving.allowedPattern, 'u')
  if (!pattern.test(trimmed)) {
    return { value: trimmed, error: 'Usa apenas letras, números, espaços, hífen, apóstrofo ou ponto.' }
  }
  return { value: trimmed, error: '' }
}

function ProductImagePreloader({ images }: { images: string[] }) {
  if (!images.length) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed -left-[9999px] top-0 size-px overflow-hidden opacity-0">
      {images.map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" loading="eager" decoding="async" />
      ))}
    </div>
  )
}

function PremiumPlaceholder({
  product,
  variant,
  baseColor,
  accentColor,
  view,
  engraving,
}: {
  product: Product
  variant: VisualVariant
  baseColor: VisualColor
  accentColor: VisualColor
  view: VisualProductConfig['views'][number]
  engraving: string
}) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.18),transparent_30%),linear-gradient(145deg,#17171d,#060607_72%)]">
      <div className="absolute inset-x-[12%] bottom-[12%] h-[10%] rounded-full bg-black/45 blur-xl" />
      <div className="absolute left-1/2 top-[18%] h-[58%] w-[38%] -translate-x-1/2">
        <div
          className="absolute left-1/2 top-[10%] h-[62%] w-[18%] -translate-x-1/2 rounded-full shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
          style={{ background: `linear-gradient(180deg, ${baseColor.hex}, rgba(0,0,0,0.72))` }}
        />
        <div
          className="absolute left-[22%] top-[9%] h-[18%] w-[64%] rounded-full"
          style={{ background: `linear-gradient(90deg, ${baseColor.hex}, rgba(255,255,255,0.18))` }}
        />
        <div
          className="absolute left-[18%] bottom-[0%] h-[18%] w-[72%] rounded-full border border-white/12"
          style={{ background: `linear-gradient(90deg, ${baseColor.hex}, rgba(255,255,255,0.08))` }}
        />
        <div
          className="absolute bottom-[15%] left-[28%] h-[2.5%] w-[44%] rounded-full shadow-[0_0_26px_rgba(163,255,18,0.28)]"
          style={{ backgroundColor: accentColor.hex }}
        />
        {variant.id === 'clamp' && (
          <div
            className="absolute right-[2%] top-[48%] h-[22%] w-[18%] rounded-lg border border-white/14"
            style={{ background: `linear-gradient(180deg, ${baseColor.hex}, rgba(0,0,0,0.55))` }}
          />
        )}
        {variant.id === 'stealth' && (
          <div
            className="absolute left-[10%] top-[26%] h-[8%] w-[80%] rounded-lg border border-white/14"
            style={{ backgroundColor: baseColor.hex }}
          />
        )}
      </div>
      <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/32 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white/52 backdrop-blur-md">
        Imagem provisória
      </div>
      <div className="absolute inset-x-5 bottom-5 rounded-lg border border-white/10 bg-black/42 p-4 backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{view.label}</p>
        <p className="mt-1 text-lg font-black text-white">{product.name}</p>
        <p className="mt-1 text-sm text-white/58">{variant.name} · {baseColor.label} / {accentColor.label}</p>
        {engraving && <p className="mt-3 font-mono text-sm font-black tracking-[0.16em]" style={{ color: accentColor.hex }}>{engraving}</p>}
      </div>
    </div>
  )
}

function ProductImageStage({
  product,
  config,
  variant,
  baseColor,
  accentColor,
  view,
  engraving,
}: {
  product: Product
  config: VisualProductConfig
  variant: VisualVariant
  baseColor: VisualColor
  accentColor: VisualColor
  view: VisualProductConfig['views'][number]
  engraving: string
}) {
  const reducedMotion = useReducedMotion()
  const image = resolveImage(config, variant, baseColor, accentColor, view.id)
  const stageKey = image ?? `${variant.id}-${baseColor.id}-${accentColor.id}-${view.id}`
  const alt = `${product.name}, ${variant.name}, vista ${view.label}, ${baseColor.label} com detalhe ${accentColor.label}`

  return (
    <div className="relative aspect-[4/5] min-h-[420px] overflow-hidden rounded-lg border border-white/10 bg-[#09090b] shadow-[0_40px_140px_rgba(0,0,0,0.55)] sm:aspect-[5/4] lg:min-h-[620px]">
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={stageKey}
          className="absolute inset-0"
          initial={{ opacity: reducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: reducedMotion ? 1 : 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
        >
          {image ? (
            <Image
              src={image}
              alt={alt}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 64vw, 760px"
            />
          ) : (
            <PremiumPlaceholder
              product={product}
              variant={variant}
              baseColor={baseColor}
              accentColor={accentColor}
              view={view}
              engraving={engraving}
            />
          )}
        </motion.div>
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),transparent_22%,transparent_68%,rgba(0,0,0,0.45))]" />
    </div>
  )
}

function ChoiceButton({
  selected,
  children,
  onClick,
  ariaLabel,
}: {
  selected: boolean
  children: React.ReactNode
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'min-h-12 rounded-md border px-3 text-left text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        selected ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_28px_rgba(163,255,18,0.18)]' : 'border-white/10 bg-white/7 text-white/66 hover:border-white/24 hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function CinematicProductExperience({
  product,
  fallbackHref = '/criar/headset-stand',
}: CinematicProductExperienceProps) {
  const router = useRouter()
  const { addItem } = useCart()
  const config = getConfig(product)
  const [selectedViewId, setSelectedViewId] = useState<VisualViewId>(config.views[0]?.id ?? 'front')
  const [selectedVariantId, setSelectedVariantId] = useState(config.variants[0]?.id ?? 'tower')
  const [baseColorId, setBaseColorId] = useState(config.colors.base[0]?.id ?? '')
  const [accentColorId, setAccentColorId] = useState(config.colors.accent[0]?.id ?? '')
  const [engravingInput, setEngravingInput] = useState('')

  const selectedView = config.views.find((view) => view.id === selectedViewId) ?? config.views[0]
  const selectedVariant = config.variants.find((variant) => variant.id === selectedVariantId) ?? config.variants[0]
  const baseColor = config.colors.base.find((color) => color.id === baseColorId) ?? config.colors.base[0]
  const accentColor = config.colors.accent.find((color) => color.id === accentColorId) ?? config.colors.accent[0]
  const engraving = validateEngraving(engravingInput, config)
  const hasEngraving = Boolean(engraving.value && !engraving.error)
  const totalPrice = selectedVariant.price + (hasEngraving ? config.engraving.priceAdd : 0)
  const preloadImages = useMemo(() => collectVisualProductImages(config), [config])

  function handleEngravingChange(value: string) {
    setEngravingInput(value.slice(0, config.engraving.maxChars))
  }

  function buildCartProduct(): Product {
    const variants = config.variants.map(visualVariantToProductVariant)
    const engravingOption = getVisualEngravingOption(config)

    return {
      ...product,
      priceFrom: Math.min(...config.variants.map((variant) => variant.price)),
      priceTo: Math.max(...config.variants.map((variant) => variant.price)),
      colors: [...config.colors.base, ...config.colors.accent],
      customizable: true,
      customizationOptions: [engravingOption],
      multiColor: true,
      multiColorCount: 2,
      colorSelectionMode: 'preset_options',
      variants,
    }
  }

  function addConfiguredItem(next: 'cart' | 'checkout') {
    if (engraving.error) return

    addItem({
      product: buildCartProduct(),
      quantity: 1,
      selectedColor: baseColor,
      selectedColors: [baseColor, accentColor],
      selectedParts: [
        {
          label: 'Estrutura',
          colorName: baseColor.name,
          colorHex: baseColor.hex,
          globalColorId: baseColor.globalColorId,
          colorPriceAdd: baseColor.priceAdd,
          grams: selectedVariant.grams.base,
        },
        {
          label: 'Detalhe/Texto',
          colorName: accentColor.name,
          colorHex: accentColor.hex,
          globalColorId: accentColor.globalColorId,
          colorPriceAdd: accentColor.priceAdd,
          grams: selectedVariant.grams.accent,
        },
      ],
      selectedVariant: {
        id: selectedVariant.id,
        name: selectedVariant.name,
        kind: 'preset_pack',
        colorMode: 'multi_part',
        colors: [],
        finalPrice: selectedVariant.price,
      },
      customizations: hasEngraving
        ? [{ label: config.engraving.label, value: engraving.value, priceAdd: config.engraving.priceAdd }]
        : [],
      unitPrice: totalPrice,
    })

    if (next === 'checkout') router.push('/checkout')
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <ProductImagePreloader images={preloadImages} />

      <section className="relative min-h-screen px-4 pb-36 pt-4 sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[70vh] max-w-6xl bg-[radial-gradient(circle_at_50%_0%,rgba(163,255,18,0.2),rgba(56,189,248,0.1)_34%,transparent_70%)] blur-3xl"
        />

        <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-3 py-2">
          <Button asChild variant="ghost" className="px-0 text-white/72 hover:bg-transparent hover:text-white">
            <Link href="/">
              <ArrowLeft className="mr-2 size-4" />
              EM3D
            </Link>
          </Button>
          <div className="hidden rounded-full border border-white/10 bg-white/7 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white/54 backdrop-blur-xl sm:block">
            Preview premium sem 3D
          </div>
          <Button asChild variant="outline" className="h-10 border-white/10 bg-white/7 text-white hover:bg-white hover:text-[#050505]">
            <Link href={fallbackHref}>Configurador clássico</Link>
          </Button>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-6 py-5 lg:grid-cols-[minmax(0,1.18fr)_430px] lg:items-start">
          <section>
            <div className="mb-5">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
                <Sparkles className="size-4" />
                Experiência premium
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.94] tracking-tight sm:text-6xl lg:text-7xl">
                Configura o suporte perfeito para o teu setup.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/62 sm:text-lg">
                Escolhe a versão, combina as cores e adiciona uma gravação curta. A pré-visualização troca de vista como uma rotação de estúdio, sem peso extra no telemóvel.
              </p>
            </div>

            <ProductImageStage
              product={product}
              config={config}
              variant={selectedVariant}
              baseColor={baseColor}
              accentColor={accentColor}
              view={selectedView}
              engraving={engraving.value}
            />

            <div className="mt-3 grid grid-cols-4 gap-2 rounded-lg border border-white/10 bg-black/28 p-1.5 backdrop-blur-xl">
              {config.views.map((view) => (
                <ChoiceButton
                  key={view.id}
                  selected={selectedView.id === view.id}
                  onClick={() => setSelectedViewId(view.id)}
                  ariaLabel={`Ver ${view.label}`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {view.id === 'front' && <Eye className="size-3.5" />}
                    {view.id !== 'front' && <RotateCw className="size-3.5" />}
                    {view.label}
                  </span>
                </ChoiceButton>
              ))}
            </div>
          </section>

          <aside className="rounded-lg border border-white/10 bg-black/42 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.46)] backdrop-blur-xl lg:sticky lg:top-5">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">Total</p>
                <p className="mt-1 text-3xl font-black text-white">{formatPrice(totalPrice)}</p>
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/12 px-3 py-1 text-xs font-black text-primary">
                {selectedVariant.shortLabel}
              </span>
            </div>

            <section className="mt-5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-4 text-primary" />
                <h2 className="font-black text-white">Escolhe a versão</h2>
              </div>
              <div className="mt-3 grid gap-2">
                {config.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    aria-pressed={selectedVariant.id === variant.id}
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={[
                      'rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      selectedVariant.id === variant.id ? 'border-primary bg-primary/12' : 'border-white/10 bg-white/6 hover:border-white/24',
                    ].join(' ')}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block font-black text-white">{variant.name}</span>
                        <span className="mt-1 block text-xs leading-5 text-white/52">{variant.description}</span>
                      </span>
                      <span className="shrink-0 font-black text-primary">{formatPrice(variant.price)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-6">
              <div className="flex items-center gap-2">
                <Palette className="size-4 text-primary" />
                <h2 className="font-black text-white">Cor principal</h2>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {config.colors.base.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    aria-label={`Selecionar cor principal ${color.label}`}
                    aria-pressed={baseColor.id === color.id}
                    onClick={() => setBaseColorId(color.id)}
                    className={[
                      'flex min-h-12 items-center gap-2 rounded-md border px-3 text-left text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      baseColor.id === color.id ? 'border-primary bg-primary/12 text-white' : 'border-white/10 bg-white/6 text-white/66 hover:border-white/24',
                    ].join(' ')}
                  >
                    <span className="size-5 rounded-full border border-white/24" style={{ backgroundColor: color.hex }} />
                    <span>{color.label}</span>
                    {baseColor.id === color.id && <Check className="ml-auto size-4 text-primary" />}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-6">
              <h2 className="font-black text-white">Detalhe</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {config.colors.accent.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    aria-label={`Selecionar detalhe ${color.label}`}
                    aria-pressed={accentColor.id === color.id}
                    onClick={() => setAccentColorId(color.id)}
                    className={[
                      'flex min-h-12 items-center gap-2 rounded-md border px-3 text-left text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      accentColor.id === color.id ? 'border-primary bg-primary/12 text-white' : 'border-white/10 bg-white/6 text-white/66 hover:border-white/24',
                    ].join(' ')}
                  >
                    <span className="size-5 rounded-full border border-white/24" style={{ backgroundColor: color.hex }} />
                    <span>{color.label}</span>
                    {accentColor.id === color.id && <Check className="ml-auto size-4 text-primary" />}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="visual-engraving" className="flex items-center gap-2 font-black text-white">
                  <Type className="size-4 text-primary" />
                  {config.engraving.label}
                </Label>
                <span className="text-xs font-bold text-white/42">{engravingInput.length}/{config.engraving.maxChars}</span>
              </div>
              <Input
                id="visual-engraving"
                value={engravingInput}
                onChange={(event) => handleEngravingChange(event.target.value)}
                maxLength={config.engraving.maxChars}
                placeholder="Ex: João M."
                aria-invalid={Boolean(engraving.error)}
                className="mt-3 h-12 border-white/10 bg-black/32 text-base font-bold text-white placeholder:text-white/24"
              />
              <p className="mt-2 text-xs leading-5 text-white/48">
                Letras, números, espaços, hífen, apóstrofo ou ponto. Adiciona {formatPrice(config.engraving.priceAdd)}.
              </p>
              {engraving.error && (
                <p className="mt-2 rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                  {engraving.error}
                </p>
              )}
            </section>

            <div className="mt-6 grid gap-2">
              <Button
                type="button"
                disabled={Boolean(engraving.error)}
                onClick={() => addConfiguredItem('checkout')}
                className="h-12 bg-primary font-black text-primary-foreground hover:bg-primary/90"
              >
                Finalizar encomenda
                <ArrowRight className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={Boolean(engraving.error)}
                onClick={() => addConfiguredItem('cart')}
                className="h-11 border-white/10 bg-white/7 font-bold text-white hover:bg-white hover:text-[#050505]"
              >
                Adicionar ao carrinho
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
