'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { ArrowLeft, Check, Eye, Flame, ImageIcon, Lamp, Lightbulb, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { applyCatalogProduct, getProductMaterialRecipe, type CatalogProductRecord, type GlobalColor, type Product, type ProductVariantOption } from '@/lib/products'
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
type PrintMode = 'grayscale' | 'multi_color'
type SelectedVariantColor = {
  globalColorId?: string
  name: string
  hex: string
  imageUrl?: string
}
type SelectedPartColor = {
  globalColorId?: string
  name: string
  hex: string
}

const aspectRatios: Record<string, [number, number]> = {
  moldura: [1, 1],
  'colecao-lithophane': [1, 1],
  'moldura-quadrada': [1, 1],
  'moldura-retrato': [4, 5],
  'moldura-paisagem': [16, 9],
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

function getVariantSwatch(variant?: ProductVariantOption) {
  return variant?.colors?.[0]?.hex || '#f3efe7'
}

function getVariantTypeInfo(variant?: ProductVariantOption) {
  const variantType = variant?.variantType?.trim()
  if (!variantType) return null

  if (variantType === 'led') return { label: 'LED incluído', icon: Lightbulb }
  if (variantType === 'candle') return { label: 'Formato vela', icon: Flame }
  if (variantType === 'bulb') return { label: 'Formato lâmpada', icon: Lamp }

  return {
    label: variantType
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    icon: Lightbulb,
  }
}

function getVariantAspectRatio(productSlug: string, variant?: ProductVariantOption): [number, number] {
  if (variant?.aspectRatio) return variant.aspectRatio
  if ((productSlug === 'moldura' || productSlug === 'colecao-lithophane') && variant?.id && variantAspectRatios[variant.id]) {
    return variantAspectRatios[variant.id]
  }
  return aspectRatios[productSlug] ?? [10, 10]
}

function getProductAspectRatio(product: Product, variant?: ProductVariantOption): [number, number] {
  return product.aspectRatio ?? getVariantAspectRatio(product.slug, variant)
}

function hasSameAspectRatio(left: [number, number], right: [number, number]) {
  return Math.abs(left[0] / left[1] - right[0] / right[1]) < 0.001
}

function getVariantFormatInfo(productSlug: string, variant?: ProductVariantOption) {
  if (variant?.formatLabel || variant?.uploadGuidance) {
    return {
      label: variant.formatLabel ?? `Formato ${variant.name}`,
      guidance: variant.uploadGuidance ?? 'Ajuste a fotografia ao formato selecionado antes de pedir revisão.',
    }
  }

  if ((productSlug === 'moldura' || productSlug === 'colecao-lithophane') && variant?.id && variantUploadGuidance[variant.id]) {
    return variantUploadGuidance[variant.id]
  }

  const [width, height] = getVariantAspectRatio(productSlug, variant)
  return {
    label: `Formato ativo · crop ${width}:${height}`,
    guidance: 'Ajuste a fotografia ao formato selecionado antes de pedir revisão.',
  }
}

function getProductFormatInfo(product: Product, variant?: ProductVariantOption) {
  if (product.slug === 'moldura-quadrada') return variantUploadGuidance.quadrada
  if (product.slug === 'moldura-retrato') return variantUploadGuidance.retrato
  if (product.slug === 'moldura-paisagem') return variantUploadGuidance.paisagem
  return getVariantFormatInfo(product.slug, variant)
}

function getFrameColor(variant?: ProductVariantOption) {
  const colorName = variant?.colors?.[0]?.name?.toLowerCase() ?? ''
  if (colorName.includes('madeira')) return '#9a673d'
  if (colorName.includes('preto')) return '#171412'
  return getVariantSwatch(variant)
}

function getVariantColors(variant?: ProductVariantOption): SelectedVariantColor[] {
  return (variant?.colors ?? [])
    .map(color => ({
      globalColorId: color.globalColorId,
      name: color.name,
      hex: color.hex,
      imageUrl: color.imageUrl,
    }))
    .filter(color => color.name && color.hex)
}

function getFinishOptions(variant: ProductVariantOption | undefined, product: Product): SelectedVariantColor[] {
  const variantColors = getVariantColors(variant)
  if (variantColors.length) return variantColors

  return product.colors.map(color => ({
    name: color.name,
    hex: color.hex,
    imageUrl: color.imageUrl,
  }))
}

function resolveVariantColor(
  current: SelectedVariantColor | null,
  options: SelectedVariantColor[],
) {
  if (!options.length) return null
  if (!current) return options[0]
  if (current.globalColorId) {
    const byId = options.find(color => color.globalColorId && color.globalColorId === current.globalColorId)
    if (byId) return byId
  }
  return options.find(color => color.name === current.name) ?? options[0]
}

function colorFromGlobal(color: GlobalColor & { id?: string }): SelectedPartColor {
  return {
    globalColorId: color.id,
    name: color.name,
    hex: color.hex,
  }
}

function getCustomTextOverlay(engravingText: string, variant?: ProductVariantOption) {
  const text = engravingText.trim()
  if (!text || !variant?.textOverlay) return undefined
  return {
    text,
    ...variant.textOverlay,
  }
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
  selectedVariantColor,
  lightMode,
  selectedVariant,
  engravingText,
}: {
  imageUrl: string | null
  fallbackImage?: string
  productName: string
  planeSize: [number, number]
  selectedVariantColor: SelectedVariantColor | null
  lightMode: LightMode
  selectedVariant?: ProductVariantOption
  engravingText?: string
}) {
  const image = imageUrl || selectedVariant?.image || fallbackImage
  const lightOverlay = getLightOverlay(lightMode)
  const isLit = lightMode !== 'desligada'
  const frameColor = selectedVariantColor?.hex ?? getFrameColor(selectedVariant)
  const textOverlay = getCustomTextOverlay(engravingText ?? '', selectedVariant)
  const textAlign = textOverlay?.align ?? 'center'
  const frameBackground = selectedVariantColor?.imageUrl
    ? {
        backgroundImage: `url(${selectedVariantColor.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: `linear-gradient(145deg, ${frameColor}, #0d0b0a)`,
      }

  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-white/10 bg-[#161616] p-5 shadow-2xl shadow-black/40 sm:p-8">
      <div aria-hidden className="absolute inset-0 opacity-80" style={lightOverlay} />
      <div className="absolute inset-x-8 bottom-8 h-12 rounded-full bg-black/55 blur-2xl" />

      <div className="relative z-10 flex min-h-[460px] items-center justify-center">
        <div
          className="relative w-full max-w-[520px] rounded-[24px] p-5 shadow-2xl transition-all duration-500"
          style={{
            aspectRatio: `${planeSize[0]} / ${planeSize[1]}`,
            ...frameBackground,
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
          {textOverlay && (
            <div
              className="pointer-events-none absolute z-20 max-w-[85%] px-2 font-sans font-semibold uppercase"
              style={{
                left: textOverlay.left !== undefined ? `${textOverlay.left}%` : textOverlay.x !== undefined ? `${textOverlay.x}%` : textAlign === 'center' ? '50%' : undefined,
                top: textOverlay.y !== undefined ? `${textOverlay.y}%` : undefined,
                bottom: textOverlay.bottom !== undefined ? `${textOverlay.bottom}%` : textOverlay.y === undefined ? '6%' : undefined,
                width: textOverlay.width !== undefined ? `${textOverlay.width}%` : undefined,
                transform: textAlign === 'center' ? 'translateX(-50%)' : undefined,
                textAlign,
                fontSize: textOverlay.fontSize ? `${textOverlay.fontSize}px` : 'clamp(0.7rem, 2vw, 1rem)',
                color: textOverlay.color ?? 'rgba(255,255,255,0.72)',
                textShadow: '0 1px 0 rgba(255,255,255,0.22), 0 -1px 1px rgba(0,0,0,0.72), 1px 1px 2px rgba(0,0,0,0.42)',
                letterSpacing: '0',
              }}
            >
              {textOverlay.text}
            </div>
          )}
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
              key={`${color.name}-${index}`}
              className="h-7 w-7 rounded-full border border-white/20 shadow-md"
              style={{
                backgroundColor: color.hex || frameColor,
                backgroundImage: color.imageUrl ? `url(${color.imageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              title={color.name}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function LightModeControl({
  lightMode,
  onChange,
}: {
  lightMode: LightMode
  onChange: (mode: LightMode) => void
}) {
  return (
    <div className="relative z-10 mt-4 rounded-lg border border-white/10 bg-black/24 p-3 font-sans backdrop-blur-md">
      <div className="grid grid-cols-3 gap-2">
        {lightModes.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={cn(
              'flex min-h-12 items-center justify-center gap-2 rounded-md border px-2 text-xs font-semibold transition sm:text-sm',
              lightMode === mode.value ? 'border-[#ffaa00] bg-primary/15 text-white' : 'border-white/10 bg-white/5 text-white/62 hover:border-white/24 hover:text-white',
            )}
            aria-pressed={lightMode === mode.value}
            title={mode.description}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: mode.glow, boxShadow: `0 0 14px ${mode.glow}` }} />
            {mode.value === 'desligada' ? 'Off' : mode.value === 'quente' ? 'Warm' : 'Cold'}
          </button>
        ))}
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

function toLegacyBaseColor(color?: SelectedVariantColor | null): 'black' | 'wood' {
  const name = color?.name.toLowerCase() ?? ''
  if (name.includes('madeira') || name.includes('wood')) return 'wood'
  return 'black'
}

export function ProductConfigurator({
  product,
  lithophaneProducts,
}: {
  product: Product
  lithophaneProducts: Product[]
}) {
  const router = useRouter()
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants?.[0]?.id ?? '')
  const [selectedVariantColor, setSelectedVariantColor] = useState<SelectedVariantColor | null>(null)
  const [selectedPartColors, setSelectedPartColors] = useState<Record<string, SelectedPartColor>>({})
  const [printMode, setPrintMode] = useState<PrintMode>('grayscale')
  const [lightMode, setLightMode] = useState<LightMode>('quente')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null)
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null)
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [pendingVariantRollbackId, setPendingVariantRollbackId] = useState<string | null>(null)
  const [pendingProductRollbackSlug, setPendingProductRollbackSlug] = useState<string | null>(null)
  const [pendingVariantColorRollback, setPendingVariantColorRollback] = useState<SelectedVariantColor | null>(null)
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
    globalColors: {
      $: {
        where: {
          isActive: true,
        },
      },
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
  const planeSize = getProductAspectRatio(displayProduct, selectedVariant)
  const cropAspect = planeSize[0] / planeSize[1]
  const selectedLight = lightModes.find((mode) => mode.value === lightMode) ?? lightModes[1]
  const activeFormatInfo = getProductFormatInfo(displayProduct, selectedVariant)
  const globalColors = (catalogQuery.data?.globalColors ?? []) as (GlobalColor & { id: string })[]
  const variantColorOptions = useMemo<SelectedVariantColor[]>(() => getFinishOptions(selectedVariant, displayProduct), [displayProduct, selectedVariant])
  const partColorOptions = useMemo<SelectedPartColor[]>(() => {
    if (globalColors.length) return globalColors.map(colorFromGlobal)
    return displayProduct.colors.map(color => ({
      name: color.name,
      hex: color.hex,
    }))
  }, [displayProduct.colors, globalColors])
  const activeParts = useMemo(
    () => selectedVariant?.parts?.length ?
    selectedVariant.parts : getProductMaterialRecipe(displayProduct),
    [displayProduct, selectedVariant],
  )
  const usesPartColors = activeParts.length > 1 || selectedVariant?.requiresPartColorSelection === true
  const selectedParts = useMemo(() => {
    if (!usesPartColors) return []
    return activeParts.map((part, index) => {
      const key = `${part.label}-${index}`
      return {
        key,
        partLabel: part.label || `Parte ${index + 1}`,
        grams: Number(part.grams) || 0,
        materialType: part.materialType,
        colorSource: part.colorSource,
        color: selectedPartColors[key] ?? partColorOptions[0],
      }
    }).filter(part => part.color)
  }, [activeParts, partColorOptions, selectedPartColors, usesPartColors])
  const customTextOverlay = getCustomTextOverlay(engravingText, selectedVariant)

  function handleProductSelect(nextProduct: Product) {
    if (nextProduct.slug === displayProduct.slug) return

    const currentAspect = getProductAspectRatio(displayProduct, selectedVariant)
    const nextAspect = getProductAspectRatio(nextProduct, nextProduct.variants?.[0])

    if (selectedFile && originalImageFile && !hasSameAspectRatio(currentAspect, nextAspect)) {
      if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl)
      setPendingProductRollbackSlug(displayProduct.slug)
      setPendingVariantRollbackId(null)
      setPendingVariantColorRollback(selectedVariantColor)
      setCropSourceFile(originalImageFile)
      setCropSourceUrl(URL.createObjectURL(originalImageFile))
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
      setCropModalOpen(true)
      toast.info('O formato mudou. Ajuste o recorte para a nova proporção.')
    }

    router.push(`/configurador?produto=${encodeURIComponent(nextProduct.slug)}`)
  }

  function handleVariantSelect(variantId: string) {
    if (variantId === selectedVariantId) return

    const nextVariant = variants.find((variant) => variant.id === variantId)
    const currentAspect = getProductAspectRatio(displayProduct, selectedVariant)
    const nextAspect = getProductAspectRatio(displayProduct, nextVariant)
    const nextColor = resolveVariantColor(selectedVariantColor, getFinishOptions(nextVariant, displayProduct))

    setSelectedVariantId(variantId)
    setSelectedVariantColor(nextColor)

    if (selectedFile && originalImageFile && !hasSameAspectRatio(currentAspect, nextAspect)) {
      if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl)
      setPendingVariantRollbackId(selectedVariantId)
      setPendingVariantColorRollback(selectedVariantColor)
      setCropSourceFile(originalImageFile)
      setCropSourceUrl(URL.createObjectURL(originalImageFile))
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
      setCropModalOpen(true)
      toast.info('O formato mudou. Ajuste o recorte para a nova proporção.')
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
    if (!variantColorOptions.length) {
      setSelectedVariantColor(null)
      return
    }
    setSelectedVariantColor(current => resolveVariantColor(current, variantColorOptions))
  }, [variantColorOptions])

  useEffect(() => {
    if (!usesPartColors || !partColorOptions.length) return
    setSelectedPartColors(current => {
      const next: Record<string, SelectedPartColor> = {}
      activeParts.forEach((part, index) => {
        const key = `${part.label}-${index}`
        const saved = current[key]
        next[key] = saved && partColorOptions.some(color => color.globalColorId === saved.globalColorId || color.name === saved.name)
          ? saved
          : partColorOptions[0]
      })
      return next
    })
  }, [activeParts, partColorOptions, usesPartColors])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (originalImageUrl) URL.revokeObjectURL(originalImageUrl)
      if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl)
    }
  }, [previewUrl, originalImageUrl, cropSourceUrl])

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
    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl)
    const persistentOriginalUrl = URL.createObjectURL(file)
    setCropSourceFile(file)
    setCropSourceUrl(URL.createObjectURL(file))
    setOriginalImageFile(file)
    setOriginalImageUrl(persistentOriginalUrl)
    setOriginalFileName(file.name)
    setPendingVariantRollbackId(null)
    setPendingProductRollbackSlug(null)
    setPendingVariantColorRollback(null)
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
    if (pendingProductRollbackSlug) {
      router.replace(`/configurador?produto=${encodeURIComponent(pendingProductRollbackSlug)}`)
      setSelectedVariantColor(pendingVariantColorRollback)
      setPendingProductRollbackSlug(null)
      setPendingVariantColorRollback(null)
      toast.info('Mantivemos o formato anterior porque o novo recorte não foi aplicado.')
      return
    }
    if (pendingVariantRollbackId) {
      setSelectedVariantId(pendingVariantRollbackId)
      setSelectedVariantColor(pendingVariantColorRollback)
      setPendingVariantRollbackId(null)
      setPendingVariantColorRollback(null)
      toast.info('Mantivemos a variante anterior porque o novo recorte não foi aplicado.')
    }
  }

  function chooseAnotherFile() {
    fileInputRef.current?.click()
    cancelCrop()
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
      setPendingVariantRollbackId(null)
      setPendingProductRollbackSlug(null)
      setPendingVariantColorRollback(null)
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

    setSubmitted(false)
    setModalOpen(true)
  }

  function validateContact() {
    if (!selectedFile) return 'Carregue uma fotografia antes de pedir a revisão.'
    if (customerName.trim().length < 2) return 'Indique o seu nome.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) return 'Indique um email válido.'
    const phoneValue = customerPhone?.trim() ?? ''
    if (phoneValue.length > 0 && phoneValue.length < 9) return 'Indique um telemóvel válido.'
    return null
  }

  function buildCanvasConfig() {
    return {
      version: 1,
      type: 'simple',
      product: {
        slug: displayProduct.slug,
        name: displayProduct.name,
        aspectRatio: displayProduct.aspectRatio ?? planeSize,
      },
      variant: selectedVariant
        ? {
            id: selectedVariant.id,
            name: selectedVariant.name,
            variantType: selectedVariant.variantType,
            price: currentPrice,
          }
        : null,
      lightMode,
      printMode,
      baseColor: toLegacyBaseColor(selectedVariantColor),
      selectedVariantColor,
      activeParts,
      selectedPartColors: selectedParts.map(part => ({
        partLabel: part.partLabel,
        materialType: part.materialType,
        colorSource: part.colorSource,
        color: part.color,
      })),
      customTextOverlay,
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
          `Modo de impressão: ${printMode === 'grayscale' ? 'Escala de cinza' : 'Multi-cor'}`,
          selectedVariantColor ? `Acabamento: ${selectedVariantColor.name} (${selectedVariantColor.hex})` : 'Acabamento: sem cor selecionada',
          selectedParts.length
            ? `Cores por peça: ${selectedParts.map(part => `${part.partLabel}: ${part.color.name}`).join(', ')}`
            : 'Cores por peça: não aplicável',
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
        formData.set('baseColor', buildCanvasConfig().baseColor || 'black')
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

  const preview = (
    <TwoDimensionalFramePreview
      imageUrl={previewUrl}
      fallbackImage={selectedVariant?.image || heroImages[0]}
      productName={displayProduct.name}
      lightMode={lightMode}
      planeSize={planeSize}
      selectedVariantColor={selectedVariantColor}
      selectedVariant={selectedVariant}
      engravingText={engravingText}
    />
  )
  const previewWithControls = (
    <>
      {preview}
      <LightModeControl lightMode={lightMode} onChange={setLightMode} />
    </>
  )

  return (
    <main className="min-h-screen bg-[#121212] px-5 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex items-center justify-between">
          <Button asChild variant="ghost" className="px-0 font-sans text-white/70 hover:bg-transparent hover:text-white">
            <Link href={`/loja`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <p className="hidden font-sans text-sm text-white/50 sm:block">{displayProduct.name}</p>
        </nav>

        <section className="py-10 lg:py-14">
          <div className="mb-8">
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.24em] text-primary">Configurador</p>
            <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-6xl">Personalize a sua luz.</h1>
            <p className="mt-4 max-w-2xl font-sans text-base leading-7 text-white/62">
              Escolha a variante, carregue a fotografia, ajuste o recorte e peça a revisão gratuita antes do pagamento.
            </p>
          </div>

          <div className="mb-6 flex flex-wrap gap-3">
            {lithophaneProducts.map((item) => {
              const isActive = item.slug === displayProduct.slug
              const isConfigurable = Boolean(item.variants?.length)

              return (
                <button
                  key={item.slug}
                  type="button"
                  disabled={!isConfigurable}
                  onClick={() => {
                    if (!isConfigurable || isActive) return
                    handleProductSelect(item)
                  }}
                  className={cn(
                    'rounded-lg border px-4 py-3 text-left font-sans transition',
                    isActive ? 'border-[#ffaa00] bg-primary/12 text-white' : 'border-white/10 bg-white/8 text-white/72 hover:border-white/25',
                    !isConfigurable && 'cursor-not-allowed opacity-55 hover:border-white/10',
                  )}
                >
                  <span className="block text-sm font-semibold">{item.name}</span>
                  <span className="mt-1 block text-xs text-white/48">
                    {isConfigurable ? 'Configurável' : 'Brevemente'}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
            <div className="sticky top-6 z-20 hidden lg:block">
              {previewWithControls}
            </div>

            <aside className="space-y-4">
              <Button
                type="button"
                onClick={() => setPreviewModalOpen(true)}
                variant="outline"
                className="h-12 w-full border-white/15 bg-white/8 font-sans text-white hover:bg-white/15 hover:text-white lg:hidden"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver pré-visualização
              </Button>
              <Card className="rounded-lg border-white/10 bg-white/8 text-white shadow-2xl shadow-black/20 backdrop-blur-md">
                <CardContent className="space-y-4 p-5">
                  <div>
                    <h3 className="font-serif text-2xl font-bold">Carregar Foto</h3>
                    <p className="mt-1 font-sans text-sm text-white/56">JPG ou PNG, máximo 5MB. A imagem aparece no modelo em segundos.</p>
                    <div className="mt-3 rounded-lg border border-[#ffaa00]/25 bg-primary/10 p-3 font-sans text-sm text-[#ffe0a3]">
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

              {usesPartColors && (
                <Card className="rounded-lg border-white/10 bg-white/8 text-white shadow-2xl shadow-black/20 backdrop-blur-md">
                  <CardContent className="space-y-4 p-5">
                    <div>
                      <h3 className="font-serif text-2xl font-bold">Cores das Partes</h3>
                      <p className="mt-1 font-sans text-sm text-white/56">
                        Materiais de impressão definidos pela receita de produção.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {selectedParts.map((part) => (
                        <div key={part.key} className="rounded-lg border border-white/10 bg-white/5 p-3">
                          <div className="mb-3 flex items-center justify-between gap-3 font-sans">
                            <div>
                              <p className="font-semibold text-white">{part.partLabel}</p>
                              <p className="text-xs text-white/46">{part.grams}g estimados</p>
                            </div>
                            <span
                              className="h-7 w-7 rounded-full border border-white/20"
                              style={{ backgroundColor: part.color.hex }}
                              aria-hidden="true"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {partColorOptions.map((color) => {
                              const isSelected = part.color.name === color.name
                              return (
                                <button
                                  key={`${part.key}-${color.globalColorId ?? color.name}`}
                                  type="button"
                                  onClick={() => setSelectedPartColors(current => ({ ...current, [part.key]: color }))}
                                  className={cn(
                                    'flex items-center gap-2 rounded-md border px-2.5 py-2 font-sans text-xs transition',
                                    isSelected ? 'border-[#ffaa00] bg-primary/12 text-white' : 'border-white/10 bg-black/10 text-white/62 hover:border-white/24',
                                  )}
                                  aria-pressed={isSelected}
                                >
                                  <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: color.hex }} />
                                  {color.name}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* <Card className="rounded-lg border-white/10 bg-white/8 text-white shadow-2xl shadow-black/20 backdrop-blur-md">
                <CardContent className="space-y-4 p-5">
                  <div>
                    <h3 className="font-serif text-2xl font-bold">Modo de Impressão</h3>
                    <p className="mt-1 font-sans text-sm text-white/56">Escala de cinza é o modo ativo do MVP.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPrintMode('grayscale')}
                      className={cn(
                        'rounded-lg border p-3 text-left font-sans transition',
                        printMode === 'grayscale' ? 'border-[#ffaa00] bg-primary/12 text-white' : 'border-white/10 bg-white/5 text-white/68',
                      )}
                    >
                      <span className="block font-semibold">Grayscale</span>
                      <span className="mt-1 block text-xs text-white/50">Lithophane clássico</span>
                    </button>
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-lg border border-white/10 bg-white/5 p-3 text-left font-sans text-white/35"
                    >
                      <span className="block font-semibold">Multi-color</span>
                      <span className="mt-1 block text-xs">Brevemente</span>
                    </button>
                  </div>
                </CardContent>
              </Card> */}

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
                          selectedVariant?.id === variant.id ? 'border-[#ffaa00] bg-primary/12' : 'border-white/10 bg-white/5 hover:border-white/24',
                        )}
                      >
                        <span className="h-8 w-8 rounded-full border border-white/15" style={{ backgroundColor: getVariantSwatch(variant) }} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{variant.name}</span>
                          <span className="block text-sm text-white/52">{formatPrice(getVariantPrice(displayProduct, variant))}</span>
                          <span className="mt-1 block text-xs text-white/46">
                            Acabamento visual
                          </span>
                          {(() => {
                            const typeInfo = getVariantTypeInfo(variant)
                            if (!typeInfo) return null
                            const TypeIcon = typeInfo.icon
                            return (
                              <span className="mt-2 flex items-center gap-1.5 text-xs text-[#ffd38b]">
                                <TypeIcon className="h-3.5 w-3.5" />
                                {typeInfo.label}
                              </span>
                            )
                          })()}
                        </span>
                        {selectedVariant?.id === variant.id && <Check className="h-5 w-5 text-primary" />}
                      </button>
                    ))
                  ) : (
                    <p className="font-sans text-sm text-white/58">Este produto ainda não tem variantes configuradas.</p>
                  )}
                </CardContent>
              </Card>

              {variantColorOptions.length > 1 && (
              <Card className="rounded-lg border-white/10 bg-white/8 text-white shadow-2xl shadow-black/20 backdrop-blur-md">
                <CardContent className="space-y-4 p-5">
                  <div>
                    <h3 className="font-serif text-2xl font-bold">Acabamento Visual</h3>
                    <p className="mt-1 font-sans text-sm text-white/56">
                      Afeta apenas o aspeto da moldura no preview; os materiais de impressão ficam separados.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {variantColorOptions.map((color) => {
                      const isSelected = selectedVariantColor?.name === color.name
                      return (
                        <button
                          key={`${color.globalColorId ?? color.name}-${color.hex}`}
                          type="button"
                          onClick={() => setSelectedVariantColor(color)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg border px-3 py-2 font-sans text-sm transition',
                            isSelected ? 'border-[#ffaa00] bg-primary/12 text-white' : 'border-white/10 bg-white/5 text-white/68 hover:border-white/24',
                          )}
                          aria-pressed={isSelected}
                        >
                          <span
                            className="h-6 w-6 rounded-full border border-white/20 shadow-md"
                            style={{
                              backgroundColor: color.hex,
                              backgroundImage: color.imageUrl ? `url(${color.imageUrl})` : undefined,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                            aria-hidden="true"
                          />
                          <span>{color.name}</span>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      )
                    })}
                  </div>
                  {selectedVariantColor && (
                    <p className="font-sans text-xs text-white/46">
                      Guardado no pedido como snapshot: {selectedVariantColor.name} · {selectedVariantColor.hex}
                    </p>
                  )}
                </CardContent>
              </Card>
              )}

              <Card className="rounded-lg border-white/10 bg-white/8 text-white shadow-2xl shadow-black/20 backdrop-blur-md">
                <CardContent className="space-y-3 p-5">
                  <div>
                    <h3 className="font-serif text-2xl font-bold">Gravação Opcional na Base</h3>
                    <p className="mt-1 font-sans text-sm text-white/56">Uma pequena dedicatória gravada na base e posicionada no preview quando a variante tiver área definida.</p>
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
                <Button type="button" onClick={openReviewModal} className="h-12 w-full bg-primary font-sans text-base text-[#121212] hover:bg-[#ffc14a]">
                  <Send className="mr-2 h-4 w-4" />
                  Pedir Revisão Gratuita
                </Button>
              </div>
            </aside>
          </div>
        </section>
      </div>

      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-[#121212] p-3 text-white sm:max-w-3xl sm:p-6">
          <DialogHeader className="px-2 pt-2">
            <DialogTitle>Pré-visualização</DialogTitle>
            <DialogDescription className="text-white/62">
              Simulação 2D da moldura com o recorte aplicado.
            </DialogDescription>
          </DialogHeader>
          {previewWithControls}
        </DialogContent>
      </Dialog>

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
              <Button type="button" onClick={applyCrop} disabled={isCropping} className="bg-primary font-sans text-[#121212] hover:bg-[#ffc14a]">
                {isCropping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Aplicar Recorte
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) setSubmitted(false); setModalOpen(open) }}>
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
              <Button className="w-full bg-[#121212] text-white hover:bg-[#2a2a2a]" onClick={() => { setSubmitted(false); setModalOpen(false) }}>
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
                  <Input id="customerPhone" type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} required={customerPhone?.trim()?.length > 0} />
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
