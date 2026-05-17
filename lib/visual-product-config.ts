import type { CustomizationOption, ProductColor, ProductVariantOption } from './products'

export type VisualViewId = 'front' | 'side' | 'detail' | 'lifestyle'
export type VisualColorSlot = 'base' | 'accent'

export type VisualColor = ProductColor & {
  id: string
  label: string
}

export type VisualVariant = {
  id: string
  name: string
  shortLabel: string
  description: string
  price: number
  grams: { base: number; accent: number }
  images: Partial<Record<VisualViewId, string>>
}

export type VisualProductConfig = {
  slug: string
  views: {
    id: VisualViewId
    label: string
    description: string
  }[]
  variants: VisualVariant[]
  colors: Record<VisualColorSlot, VisualColor[]>
  imageMatrix?: Record<string, string>
  preloadImages: string[]
  engraving: {
    label: string
    maxChars: number
    priceAdd: number
    allowedPattern: string
  }
}

export const visualProductConfigBySlug: Record<string, VisualProductConfig> = {
  'headset-stand': {
    slug: 'headset-stand',
    views: [
      { id: 'front', label: 'Frente', description: 'Vista principal para confirmar a silhueta.' },
      { id: 'side', label: 'Lado', description: 'Perfil e profundidade da peça.' },
      { id: 'detail', label: 'Detalhe', description: 'Zona da gravação e acabamento.' },
      { id: 'lifestyle', label: 'Setup', description: 'Como a peça vive na secretária.' },
    ],
    variants: [
      {
        id: 'tower',
        name: 'De Mesa',
        shortLabel: 'Mesa',
        description: 'Base estável para pousar no setup.',
        price: 29.9,
        grams: { base: 130, accent: 12 },
        images: {},
      },
      {
        id: 'stealth',
        name: 'Oculto (3M)',
        shortLabel: 'Oculto',
        description: 'Fica por baixo da mesa com fixação discreta.',
        price: 24.9,
        grams: { base: 85, accent: 10 },
        images: {},
      },
      {
        id: 'clamp',
        name: 'Aperto (Rosca)',
        shortLabel: 'Clamp',
        description: 'Aperto com rosca para uma fixação mais robusta.',
        price: 34.9,
        grams: { base: 155, accent: 14 },
        images: {},
      },
    ],
    colors: {
      base: [
        { id: 'carbon-black', label: 'Carbon Black', name: 'Carbon Black', hex: '#0B0D10' },
        { id: 'cyber-white', label: 'Cyber White', name: 'Cyber White', hex: '#F4F7FB' },
      ],
      accent: [
        { id: 'neon-lime', label: 'Neon Lime', name: 'Neon Lime', hex: '#A3FF12' },
        { id: 'pulse-blue', label: 'Pulse Blue', name: 'Pulse Blue', hex: '#38BDF8' },
        { id: 'signal-red', label: 'Signal Red', name: 'Signal Red', hex: '#FF3B5C' },
        { id: 'cyber-white', label: 'Cyber White', name: 'Cyber White', hex: '#F4F7FB' },
      ],
    },
    imageMatrix: {},
    preloadImages: [],
    engraving: {
      label: 'Gravação',
      maxChars: 16,
      priceAdd: 5,
      allowedPattern: "^[\\p{L}\\p{N} .'-]+$",
    },
  },
}

export function getVisualProductConfig(slug: string | undefined) {
  if (!slug) return undefined
  return visualProductConfigBySlug[slug]
}

export function getVisualVariant(slug: string | undefined, variantId: string | undefined) {
  const config = getVisualProductConfig(slug)
  if (!config || !variantId) return undefined
  return config.variants.find((variant) => variant.id === variantId)
}

export function visualVariantToProductVariant(variant: VisualVariant): ProductVariantOption {
  return {
    id: variant.id,
    name: variant.name,
    kind: 'preset_pack',
    colorMode: 'multi_part',
    finalPrice: variant.price,
    formatLabel: variant.name,
    colors: [],
    parts: [
      { label: 'Estrutura', grams: variant.grams.base, materialType: 'PLA', colorSource: 'partColor' },
      { label: 'Detalhe/Texto', grams: variant.grams.accent, materialType: 'PLA', colorSource: 'partColor' },
    ],
  }
}

export function getVisualEngravingOption(config: VisualProductConfig): CustomizationOption {
  return {
    type: 'text',
    label: config.engraving.label,
    maxChars: config.engraving.maxChars,
    priceAdd: config.engraving.priceAdd,
  }
}

export function validateVisualEngraving(value: string, config: VisualProductConfig) {
  const trimmed = value.trim()
  if (!trimmed) return
  if (trimmed.length > config.engraving.maxChars) {
    throw new Error(`${config.engraving.label} excede o limite de caracteres.`)
  }
  const pattern = new RegExp(config.engraving.allowedPattern, 'u')
  if (!pattern.test(trimmed)) {
    throw new Error(`${config.engraving.label} contém caracteres inválidos.`)
  }
}

export function collectVisualProductImages(config: VisualProductConfig) {
  const images = new Set(config.preloadImages)
  Object.values(config.imageMatrix ?? {}).forEach((image) => images.add(image))
  config.variants.forEach((variant) => {
    Object.values(variant.images).forEach((image) => {
      if (image) images.add(image)
    })
  })
  return Array.from(images).filter(Boolean)
}
