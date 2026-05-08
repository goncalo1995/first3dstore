'use client'

import NextImage from 'next/image'
import Link from 'next/link'
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { ArrowDown, ArrowLeft, Check, Gift, ImageIcon, Layers3, Lamp, Loader2, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { applyCatalogProduct, type CatalogProductRecord, type Product, type ProductVariantOption } from '@/lib/products'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type LightMode = 'desligada' | 'quente' | 'fria'

const aspectRatios: Record<string, [number, number]> = {
  'colecao-lithophane': [1, 1],
  'moldura-quadrada': [10, 10],
  'moldura-retrato': [7.5, 10],
  'moldura-paisagem': [10, 7.5],
}

const variantAspectRatios: Record<string, [number, number]> = {
  quadrada: [1, 1],
  retrato: [4, 5],
  paisagem: [16, 9],
}

const variantUploadGuidance: Record<string, { label: string; guidance: string }> = {
  quadrada: {
    label: 'Formato Quadrado · crop 1:1',
    guidance: 'Ideal para fotos de Instagram, retratos centrados e composições simétricas.',
  },
  retrato: {
    label: 'Formato Retrato · crop 4:5',
    guidance: 'Ideal para pessoas, fotografias verticais e momentos com o rosto em destaque.',
  },
  paisagem: {
    label: 'Formato Paisagem · crop 16:9',
    guidance: 'Ideal para viagens, casas, horizontes, grupos e fotografias horizontais.',
  },
}

const lightModes: { value: LightMode; label: string; description: string; glow: string }[] = [
  { value: 'desligada', label: 'Luz Desligada', description: 'Aspeto mate, como uma escultura branca.', glow: '#64605a' },
  { value: 'quente', label: 'Luz Quente', description: 'Tom Vela acolhedor para ambientes íntimos.', glow: '#ffaa00' },
  { value: 'fria', label: 'Luz Fria', description: 'Branco LED nítido e moderno.', glow: '#e6f2ff' },
]

const trustItems = [
  {
    title: 'Arte em 3D',
    text: 'Impresso camada a camada em Portugal.',
    icon: Layers3,
  },
  {
    title: 'Magia Oculta',
    text: 'Parece uma escultura branca até acender a luz.',
    icon: Sparkles,
  },
  {
    title: 'Presente Perfeito',
    text: 'Pronto a oferecer, montado à mão.',
    icon: Gift,
  },
]

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function getVariantPrice(product: Product, variant?: ProductVariantOption) {
  const basePrice = product.salePrice ?? product.priceFrom
  if (variant?.finalPrice !== undefined) return variant.finalPrice
  return basePrice + (variant?.priceAdd ?? 0)
}

function getHeroHeadline(product: Product) {
  const normalized = product.slug.toLowerCase()
  if (normalized.includes('retrato')) return 'A luz perfeita para rostos que nunca quer esquecer.'
  if (normalized.includes('paisagem')) return 'Transforme uma viagem, uma casa ou um horizonte numa luz.'
  if (normalized.includes('quadrada')) return 'A magia de reviver o seu melhor momento.'
  return product.benefit || 'A magia de reviver o seu melhor momento.'
}

function getVariantSwatch(variant?: ProductVariantOption) {
  return variant?.colors?.[0]?.colorHex || '#f3efe7'
}

function getVariantAspectRatio(productSlug: string, variant?: ProductVariantOption): [number, number] {
  if (variant?.aspectRatio) return variant.aspectRatio
  if (productSlug === 'colecao-lithophane' && variant?.id && variantAspectRatios[variant.id]) {
    return variantAspectRatios[variant.id]
  }
  return aspectRatios[productSlug] ?? [10, 10]
}

function getVariantFormatInfo(productSlug: string, variant?: ProductVariantOption) {
  if (variant?.formatLabel || variant?.uploadGuidance) {
    return {
      label: variant.formatLabel ?? `Formato ${variant.name}`,
      guidance: variant.uploadGuidance ?? 'Ajuste a fotografia ao formato selecionado antes de pedir revisão.',
    }
  }

  if (productSlug === 'colecao-lithophane' && variant?.id && variantUploadGuidance[variant.id]) {
    return variantUploadGuidance[variant.id]
  }

  const [width, height] = getVariantAspectRatio(productSlug, variant)
  return {
    label: `Formato ativo · crop ${width}:${height}`,
    guidance: 'Ajuste a fotografia ao formato selecionado antes de pedir revisão.',
  }
}

function getFrameColor(variant?: ProductVariantOption) {
  const colorName = variant?.colors?.[0]?.colorName?.toLowerCase() ?? ''
  if (colorName.includes('madeira')) return '#9a673d'
  if (colorName.includes('preto')) return '#171412'
  return getVariantSwatch(variant)
}

function getLightOverlay(lightMode: LightMode) {
  if (lightMode === 'fria') {
    return {
      background: 'radial-gradient(circle at 50% 42%, rgba(230,242,255,0.42), rgba(230,242,255,0.12) 48%, transparent 76%)',
      boxShadow: '0 0 70px rgba(230,242,255,0.18)',
    }
  }

  if (lightMode === 'quente') {
    return {
      background: 'radial-gradient(circle at 50% 42%, rgba(255,170,0,0.48), rgba(255,170,0,0.16) 50%, transparent 76%)',
      boxShadow: '0 0 80px rgba(255,170,0,0.22)',
    }
  }

  return {
    background: 'transparent',
    boxShadow: '0 0 28px rgba(255,255,255,0.05)',
  }
}

function TwoDimensionalFramePreview({
  imageUrl,
  fallbackImage,
  productName,
  planeSize,
  frameColor,
  lightMode,
  selectedVariant,
}: {
  imageUrl: string | null
  fallbackImage?: string
  productName: string
  planeSize: [number, number]
  frameColor: string
  lightMode: LightMode
  selectedVariant?: ProductVariantOption
}) {
  const image = imageUrl || selectedVariant?.image || fallbackImage
  const lightOverlay = getLightOverlay(lightMode)
  const isLit = lightMode !== 'desligada'

  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-white/10 bg-[#161616] p-5 shadow-2xl shadow-black/40 sm:p-8">
      <div aria-hidden className="absolute inset-0 opacity-80" style={lightOverlay} />
      <div className="absolute inset-x-8 bottom-8 h-12 rounded-full bg-black/55 blur-2xl" />

      <div className="relative z-10 flex min-h-[460px] items-center justify-center">
        <div
          className="relative w-full max-w-[520px] rounded-[24px] p-5 shadow-2xl transition-all duration-500"
          style={{
            aspectRatio: `${planeSize[0]} / ${planeSize[1]}`,
            background: `linear-gradient(145deg, ${frameColor}, #0d0b0a)`,
            boxShadow: isLit
              ? `0 0 56px ${lightMode === 'fria' ? 'rgba(230,242,255,0.24)' : 'rgba(255,170,0,0.28)'}, inset 0 0 0 1px rgba(255,255,255,0.14)`
              : 'inset 0 0 0 1px rgba(255,255,255,0.12)',
          }}
        >
          <div className="relative h-full overflow-hidden rounded-[14px] bg-[#f5efe2] shadow-[inset_0_0_28px_rgba(0,0,0,0.2)]">
            {image ? (
              <img
                src={image}
                alt={imageUrl ? 'Pré-visualização da fotografia na moldura' : productName}
                className="lithophane-preview  h-full w-full object-cover transition duration-500"
                style={{
                  filter: isLit
                    ? 'grayscale(1) contrast(1.25) brightness(1.24) sepia(0.18)'
                    : 'grayscale(1) contrast(0.95) brightness(1.05)',
                  opacity: isLit ? 0.78 : 0.38,
                  mixBlendMode: isLit ? 'multiply' : 'normal',
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[radial-gradient(circle,#ffffff,transparent_62%)]">
                <ImageIcon className="h-14 w-14 text-black/18" />
              </div>
            )}
            <div
              aria-hidden
              className="absolute inset-0 transition-opacity duration-500"
              style={{
                background: isLit
                  ? lightMode === 'fria'
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.62), rgba(230,242,255,0.34))'
                    : 'linear-gradient(180deg, rgba(255,242,205,0.68), rgba(255,170,0,0.28))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))',
                mixBlendMode: isLit ? 'screen' : 'normal',
              }}
            />
            <div className="absolute inset-0 border border-white/30" />
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/24 p-4 font-sans text-sm text-white/68 backdrop-blur-md">
        <div>
          <p className="font-semibold text-white">{selectedVariant?.name ?? 'Acabamento selecionado'}</p>
          <p className="mt-1 text-xs">Preview 2D ao vivo com a proporção final da moldura.</p>
        </div>
        <div className="flex -space-x-2">
          {(selectedVariant?.colors ?? []).slice(0, 5).map((color, index) => (
            <span
              key={`${color.colorName}-${index}`}
              className="h-7 w-7 rounded-full border border-white/20 shadow-md"
              style={{ backgroundColor: color.colorHex || frameColor }}
              title={color.colorName}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function validateFile(file: File) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) return 'Use uma fotografia em JPG ou PNG.'
  if (file.size > 5 * 1024 * 1024) return 'A fotografia deve ter no máximo 5MB.'
  return null
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', reject)
    image.src = src
  })
}

async function createCroppedImageFile(imageSrc: string, cropPixels: Area, originalFileName: string) {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Não foi possível preparar o recorte da fotografia.')
  }

  canvas.width = cropPixels.width
  canvas.height = cropPixels.height
  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height,
  )

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.92)
  })

  if (!blob) {
    throw new Error('Não foi possível guardar o recorte da fotografia.')
  }

  const baseName = originalFileName.replace(/\.[^.]+$/, '') || 'fotografia'
  return new File([blob], `${baseName}-recorte.jpg`, { type: 'image/jpeg' })
}

export function ProductExperience({ product }: { product: Product }) {
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants?.[0]?.id ?? '')
  const [lightMode, setLightMode] = useState<LightMode>('quente')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null)
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [isCropping, setIsCropping] = useState(false)
  const [originalFileName, setOriginalFileName] = useState('')
  const [engravingText, setEngravingText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [isSubmitting, startSubmitting] = useTransition()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const catalogQuery = db.useQuery({
    catalogProducts: {
      $: {
        where: {
          slug: product.slug,
        },
      },
      primaryCategory: {},
      categories: {},
      inventory: {},
    },
  })

  const displayProduct = useMemo(() => {
    const catalogProduct = catalogQuery.data?.catalogProducts?.[0] as CatalogProductRecord | undefined
    return applyCatalogProduct(product, catalogProduct)
  }, [catalogQuery.data?.catalogProducts, product])

  const variants = displayProduct.variants ?? []
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0]
  const currentPrice = getVariantPrice(displayProduct, selectedVariant)
  const productImages = displayProduct.images?.length ? displayProduct.images : [displayProduct.image]
  const heroImages = productImages.filter(Boolean).slice(0, 3)
  const planeSize = getVariantAspectRatio(displayProduct.slug, selectedVariant)
  const cropAspect = planeSize[0] / planeSize[1]
  const selectedLight = lightModes.find((mode) => mode.value === lightMode) ?? lightModes[1]
  const activeFormatInfo = getVariantFormatInfo(displayProduct.slug, selectedVariant)

  function handleVariantSelect(variantId: string) {
    if (variantId === selectedVariantId) return
    setSelectedVariantId(variantId)

    if (selectedFile || previewUrl) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setSelectedFile(null)
      setPreviewUrl(null)
      toast.info('O formato mudou. Carregue novamente a fotografia para aplicar o recorte correto.')
    }
  }

  useEffect(() => {
    if (!variants.length) return
    setSelectedVariantId((current) => {
      if (variants.some((variant) => variant.id === current)) return current
      return variants[0]?.id ?? ''
    })
  }, [variants])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl)
    }
  }, [previewUrl, cropSourceUrl])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const error = validateFile(file)
    if (error) {
      toast.error(error)
      event.target.value = ''
      return
    }

    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl)
    setCropSourceFile(file)
    setCropSourceUrl(URL.createObjectURL(file))
    setOriginalFileName(file.name)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setCropModalOpen(true)
    event.target.value = ''
  }

  function cancelCrop() {
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl)
    setCropSourceFile(null)
    setCropSourceUrl(null)
    setCropModalOpen(false)
    setCroppedAreaPixels(null)
  }

  function chooseAnotherFile() {
    cancelCrop()
    fileInputRef.current?.click()
  }

  async function applyCrop() {
    if (!cropSourceUrl || !cropSourceFile || !croppedAreaPixels) {
      toast.error('Ajuste a fotografia antes de aplicar o recorte.')
      return
    }

    setIsCropping(true)

    try {
      const croppedFile = await createCroppedImageFile(cropSourceUrl, croppedAreaPixels, cropSourceFile.name)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setSelectedFile(croppedFile)
      setPreviewUrl(URL.createObjectURL(croppedFile))
      setCropModalOpen(false)
      URL.revokeObjectURL(cropSourceUrl)
      setCropSourceFile(null)
      setCropSourceUrl(null)
      toast.success('Recorte aplicado à pré-visualização.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível aplicar o recorte.')
    } finally {
      setIsCropping(false)
    }
  }

  function openReviewModal() {
    if (!selectedFile) {
      toast.error('Carregue uma fotografia antes de pedir a revisão.')
      return
    }

    setModalOpen(true)
  }

  function validateContact() {
    if (!selectedFile) return 'Carregue uma fotografia antes de pedir a revisão.'
    if (customerName.trim().length < 2) return 'Indique o seu nome.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) return 'Indique um email válido.'
    if (customerPhone.trim().length < 6) return 'Indique um telemóvel válido.'
    return null
  }

  function buildCanvasConfig() {
    return {
      version: 1,
      type: 'simple',
      product: {
        slug: displayProduct.slug,
        name: displayProduct.name,
        aspectRatio: planeSize,
      },
      variant: selectedVariant
        ? {
            id: selectedVariant.id,
            name: selectedVariant.name,
            price: currentPrice,
          }
        : null,
      lightMode,
      pricing: {
        total: currentPrice,
        currency: 'EUR',
      },
      engravingText: engravingText.trim() || undefined,
      crop: {
        aspectRatio: cropAspect,
        outputMimeType: 'image/jpeg',
        originalFileName,
        croppedFileName: selectedFile?.name ?? '',
      },
      uploadedImageName: selectedFile?.name ?? '',
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateContact()
    if (validationError) {
      toast.error(validationError)
      return
    }

    if (!selectedFile) return

    startSubmitting(async () => {
      try {
        const lightLabel = lightModes.find((mode) => mode.value === lightMode)?.label ?? lightMode
        const notes = [
          'Fluxo: Modelo fixo',
          `Produto: ${displayProduct.name} (${displayProduct.slug})`,
          selectedVariant ? `Variante: ${selectedVariant.name} (${selectedVariant.id})` : 'Variante: sem variante selecionada',
          `Modo de luz: ${lightLabel}`,
          engravingText.trim() ? `Gravação: ${engravingText.trim()}` : 'Gravação: sem gravação',
          `Preço selecionado: ${formatPrice(currentPrice)}`,
        ].join('\n')

        const formData = new FormData()
        formData.set('customerName', customerName.trim())
        formData.set('customerEmail', customerEmail.trim())
        formData.set('customerPhone', customerPhone.trim())
        formData.set('productSlug', displayProduct.slug)
        formData.set('productName', displayProduct.name)
        formData.set('variantId', selectedVariant?.id ?? '')
        formData.set('variantName', selectedVariant?.name ?? '')
        formData.set('selectedPrice', String(currentPrice))
        formData.set('lightMode', lightMode)
        formData.set('engravingText', engravingText.trim())
        formData.set('notes', notes)
        formData.set('canvasConfig', JSON.stringify(buildCanvasConfig()))
        formData.set('image', selectedFile)

        const response = await fetch('/api/lithophane/request', {
          method: 'POST',
          body: formData,
        })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload.error || 'Não foi possível registar o pedido.')
        }

        setSubmitted(true)
        toast.success('Pedido recebido.')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível registar o pedido.')
      }
    })
  }

  return (
    <main className="min-h-screen bg-[#121212] text-white">
      <section className="relative min-h-screen overflow-hidden px-5 py-6 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[72vh] max-w-6xl blur-2xl"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(255,170,0,0.45), rgba(255,170,0,0.12) 35%, transparent 72%)',
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,18,18,0)_0%,#121212_88%)]" />

        <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
          <nav className="flex items-center justify-between">
            <Button asChild variant="ghost" className="px-0 font-sans text-white/70 hover:bg-transparent hover:text-white">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Foto3D.pt
              </Link>
            </Button>
            <Button asChild className="hidden border border-white/15 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 sm:inline-flex">
              <a href="#configurador">Personalizar</a>
            </Button>
          </nav>

          <div className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1fr)]">
            <div>
              <p className="font-sans text-sm font-semibold uppercase tracking-[0.24em] text-[#ffaa00]">
                {displayProduct.name}
              </p>
              <h1 className="mt-5 max-w-4xl font-serif text-5xl font-bold leading-[0.98] tracking-tight text-white sm:text-7xl lg:text-8xl">
                {getHeroHeadline(displayProduct)}
              </h1>
              <p className="mt-7 max-w-2xl font-sans text-lg leading-8 text-white/70">
                {displayProduct.description || 'Uma fotografia especial transformada numa luz feita à mão em Portugal.'}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-14 bg-[#ffaa00] px-8 font-sans text-base text-[#121212] hover:bg-[#ffc14a]">
                  <a href="#configurador">
                    Personalizar Agora
                    <ArrowDown className="ml-2 h-5 w-5" />
                  </a>
                </Button>
                <div className="flex items-center rounded-full border border-white/10 bg-white/8 px-5 py-3 font-sans text-sm text-white/72 backdrop-blur-md">
                  Total desde <span className="ml-2 font-semibold text-white">{formatPrice(displayProduct.salePrice ?? displayProduct.priceFrom)}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_0.72fr]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-white/10 bg-white/8 shadow-2xl shadow-black/40 backdrop-blur-md">
                {heroImages[0] ? (
                  <NextImage
                    src={heroImages[0]}
                    alt={displayProduct.name}
                    fill
                    className="object-cover opacity-90"
                    sizes="(max-width: 1024px) 100vw, 44vw"
                    priority
                    unoptimized={heroImages[0].startsWith('http')}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[radial-gradient(circle,#ffaa0040,transparent_62%)]">
                    <ImageIcon className="h-16 w-16 text-white/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/10 bg-black/35 p-4 font-sans text-sm text-white/76 backdrop-blur-md">
                  Feito à mão em Portugal, revisto por uma pessoa antes da produção.
                </div>
              </div>

              <div className="hidden gap-4 sm:grid">
                {[heroImages[1], heroImages[2]].map((image, index) => (
                  <div key={index} className="relative overflow-hidden rounded-lg border border-white/10 bg-white/8 backdrop-blur-md">
                    {image ? (
                      <NextImage
                        src={image}
                        alt={`${displayProduct.name} ${index + 2}`}
                        fill
                        className="object-cover opacity-82"
                        sizes="22vw"
                        unoptimized={image.startsWith('http')}
                      />
                    ) : (
                      <div className="flex h-full min-h-44 items-center justify-center bg-[radial-gradient(circle,#ffffff1f,transparent_62%)]">
                        <Lamp className="h-10 w-10 text-[#ffaa00]/70" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 md:grid-cols-3">
            {trustItems.map((item) => (
              <Card key={item.title} className="rounded-lg border-white/10 bg-white/8 text-white shadow-2xl shadow-black/20 backdrop-blur-md">
                <CardContent className="p-6">
                  <item.icon className="h-8 w-8 text-[#ffaa00]" />
                  <h2 className="mt-5 font-serif text-2xl font-bold">{item.title}</h2>
                  <p className="mt-3 font-sans text-sm leading-6 text-white/62">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="configurador" className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.24em] text-[#ffaa00]">Configurador</p>
            <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-6xl">Veja a sua luz antes da revisão.</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
            <div className="sticky top-3 z-20 -mx-5 border-y border-white/10 bg-[#121212]/94 px-5 py-3 backdrop-blur-md sm:mx-0 sm:rounded-lg sm:border lg:top-6">
              <TwoDimensionalFramePreview
                imageUrl={previewUrl}
                fallbackImage={selectedVariant?.image || heroImages[0]}
                productName={displayProduct.name}
                lightMode={lightMode}
                planeSize={planeSize}
                frameColor={getFrameColor(selectedVariant)}
                selectedVariant={selectedVariant}
              />
            </div>

            <aside className="space-y-4">
              <Card className="rounded-lg border-white/10 bg-white/8 text-white shadow-2xl shadow-black/20 backdrop-blur-md">
                <CardContent className="space-y-4 p-5">
                  <div>
                    <h3 className="font-serif text-2xl font-bold">Carregar Foto</h3>
                    <p className="mt-1 font-sans text-sm text-white/56">JPG ou PNG, máximo 5MB. A imagem aparece no modelo em segundos.</p>
                    <div className="mt-3 rounded-lg border border-[#ffaa00]/25 bg-[#ffaa00]/10 p-3 font-sans text-sm text-[#ffe0a3]">
                      <p className="font-semibold text-white">{activeFormatInfo.label}</p>
                      <p className="mt-1 leading-5 text-[#ffe0a3]/86">{activeFormatInfo.guidance}</p>
                    </div>
                  </div>
                  <Input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={handleFileChange} className="border-white/10 text-white file:text-white" />
                  {selectedFile && (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 font-sans text-sm text-white/70">
                      <p className="truncate font-semibold text-white">{selectedFile.name}</p>
                      <p className="mt-1 text-xs">{(selectedFile.size / (1024 * 1024)).toFixed(2)}MB</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-lg border-white/10 bg-white/8 text-white shadow-2xl shadow-black/20 backdrop-blur-md">
                <CardContent className="space-y-3 p-5">
                  <h3 className="font-serif text-2xl font-bold">Luz</h3>
                  <div className="grid gap-2">
                    {lightModes.map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setLightMode(mode.value)}
                        className={cn(
                          'rounded-lg border p-4 text-left font-sans transition',
                          lightMode === mode.value ? 'border-[#ffaa00] bg-[#ffaa00]/12' : 'border-white/10 bg-white/5 hover:border-white/24',
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: mode.glow, boxShadow: `0 0 18px ${mode.glow}` }} />
                          <span className="font-semibold">{mode.label}</span>
                          {lightMode === mode.value && <Check className="ml-auto h-4 w-4 text-[#ffaa00]" />}
                        </span>
                        <span className="mt-2 block text-sm text-white/56">{mode.description}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-lg border-white/10 bg-white/8 text-white shadow-2xl shadow-black/20 backdrop-blur-md">
                <CardContent className="space-y-3 p-5">
                  <h3 className="font-serif text-2xl font-bold">Acabamento</h3>
                  {variants.length > 0 ? (
                    variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => handleVariantSelect(variant.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg border p-4 text-left font-sans transition',
                          selectedVariant?.id === variant.id ? 'border-[#ffaa00] bg-[#ffaa00]/12' : 'border-white/10 bg-white/5 hover:border-white/24',
                        )}
                      >
                        <span className="h-8 w-8 rounded-full border border-white/15" style={{ backgroundColor: getVariantSwatch(variant) }} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{variant.name}</span>
                          <span className="block text-sm text-white/52">{formatPrice(getVariantPrice(displayProduct, variant))}</span>
                          <span className="mt-1 block text-xs text-white/46">
                            {getVariantFormatInfo(displayProduct.slug, variant).label}
                          </span>
                        </span>
                        {selectedVariant?.id === variant.id && <Check className="h-5 w-5 text-[#ffaa00]" />}
                      </button>
                    ))
                  ) : (
                    <p className="font-sans text-sm text-white/58">Este produto ainda não tem variantes configuradas.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-lg border-white/10 bg-white/8 text-white shadow-2xl shadow-black/20 backdrop-blur-md">
                <CardContent className="space-y-3 p-5">
                  <div>
                    <h3 className="font-serif text-2xl font-bold">Gravação Opcional na Base</h3>
                    <p className="mt-1 font-sans text-sm text-white/56">Uma pequena dedicatória gravada na base. Não aparece na pré-visualização 3D.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="engravingText">Texto até 20 caracteres</Label>
                    <Input
                      id="engravingText"
                      value={engravingText}
                      maxLength={20}
                      placeholder="Ex: Max 2010-2024"
                      onChange={(event) => setEngravingText(event.target.value.slice(0, 20))}
                      className="border-white/10 text-white placeholder:text-white/35"
                    />
                    <p className="text-right font-sans text-xs text-white/52">{engravingText.length}/20</p>
                  </div>
                </CardContent>
              </Card>

              <div className="sticky bottom-4 rounded-lg border border-white/10 bg-[#181818]/95 p-5 shadow-2xl shadow-black/60 backdrop-blur-md">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div className="font-sans">
                    <p className="text-sm text-white/58">Total</p>
                    <p className="font-serif text-4xl font-bold">{formatPrice(currentPrice)}</p>
                  </div>
                  <div className="text-right font-sans text-sm text-white/58">
                    <p>{selectedVariant?.name ?? 'Sem variante'}</p>
                    <p>{selectedLight.label}</p>
                  </div>
                </div>
                <Button type="button" onClick={openReviewModal} className="h-12 w-full bg-[#ffaa00] font-sans text-base text-[#121212] hover:bg-[#ffc14a]">
                  <Send className="mr-2 h-4 w-4" />
                  Pedir Revisão Gratuita
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Dialog open={cropModalOpen} onOpenChange={(open) => {
        if (!open) cancelCrop()
      }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-[#121212] text-white sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ajustar Fotografia</DialogTitle>
            <DialogDescription className="text-white/62">
              Ajuste a fotografia ao formato da moldura para evitar cortes ou distorções na impressão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="relative h-[360px] overflow-hidden rounded-lg border border-white/10 bg-black sm:h-[460px]">
              {cropSourceUrl && (
                <Cropper
                  image={cropSourceUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={cropAspect}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between font-sans text-sm text-white/70">
                <Label htmlFor="cropZoom">Zoom</Label>
                <span>{zoom.toFixed(1)}x</span>
              </div>
              <input
                id="cropZoom"
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-[#ffaa00]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
              <Button type="button" variant="outline" onClick={cancelCrop} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                Cancelar
              </Button>
              <Button type="button" variant="outline" onClick={chooseAnotherFile} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                Escolher Outra Foto
              </Button>
              <Button type="button" onClick={applyCrop} disabled={isCropping} className="bg-[#ffaa00] font-sans text-[#121212] hover:bg-[#ffc14a]">
                {isCropping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Aplicar Recorte
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto">
          {submitted ? (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff2d6] text-[#9a6200]">
                <Check className="h-7 w-7" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-center">Pedido recebido</DialogTitle>
                <DialogDescription className="text-center leading-6">
                  Foto recebida! Vamos rever a qualidade da fotografia e enviar-lhe os próximos passos por email.
                </DialogDescription>
              </DialogHeader>
              <Button className="w-full bg-[#121212] text-white hover:bg-[#2a2a2a]" onClick={() => setModalOpen(false)}>
                Fechar
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Pedir Revisão Gratuita</DialogTitle>
                <DialogDescription>
                  Deixe os seus dados para validarmos a fotografia antes do pagamento.
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nome</Label>
                  <Input id="customerName" value={customerName} onChange={(event) => setCustomerName(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input id="customerEmail" type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Telemóvel</Label>
                  <Input id="customerPhone" type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} required />
                </div>
                <Button type="submit" disabled={isSubmitting} className="h-11 w-full bg-[#121212] text-white hover:bg-[#2a2a2a]">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A enviar...
                    </>
                  ) : (
                    'Enviar pedido'
                  )}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
