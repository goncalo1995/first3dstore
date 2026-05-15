import type { DeskColorName, DeskCustomFieldDefinition, DeskCustomFieldValue, DeskItem, DeskProductDefinition, DeskProductId } from './types'

export const DESK_STORAGE_KEY = 'em3d-desk-setup-v1'
export const DESK_SCHEMA_VERSION = 1

export const deskColors: Record<DeskColorName, { hex: string; label: DeskColorName }> = {
  'Preto Fosco': { label: 'Preto Fosco', hex: '#0B0D10' },
  'Branco Stormtrooper': { label: 'Branco Stormtrooper', hex: '#F4F7FB' },
  'Madeira Walnut': { label: 'Madeira Walnut', hex: '#9A6A3D' },
  'Neon Lime': { label: 'Neon Lime', hex: '#A3FF12' },
  'Pulse Blue': { label: 'Pulse Blue', hex: '#38BDF8' },
}

export const deskPresets = [
  { label: 'Pequena', widthCm: 100, depthCm: 60 },
  { label: 'Standard', widthCm: 120, depthCm: 70 },
  { label: 'Grande', widthCm: 160, depthCm: 80 },
] as const

export const deskProducts: DeskProductDefinition[] = [
  {
    productId: 'magsafe_dock_v1',
    name: 'Suporte MagSafe',
    category: 'Carregamento',
    description: 'Dock compacto para carregamento e organização do cabo.',
    price: 15,
    footprintCm: { width: 14, depth: 7 },
    defaultColors: { base: 'Preto Fosco', accent: 'Pulse Blue' },
    allowedColors: {
      base: ['Preto Fosco', 'Branco Stormtrooper'],
      accent: ['Madeira Walnut', 'Neon Lime', 'Pulse Blue'],
    },
    preview: { shape: 'dock', icon: 'smartphone' },
    validation: { allowedSurfaces: ['top'], maxQuantity: 2 },
    customFields: [
      {
        key: 'cableExit',
        label: 'Saída do cabo',
        type: 'select',
        defaultValue: 'back',
        options: [
          { value: 'back', label: 'Trás' },
          { value: 'left', label: 'Esquerda' },
          { value: 'right', label: 'Direita' },
        ],
      },
      {
        key: 'phoneSide',
        label: 'Lado do telemóvel',
        type: 'select',
        defaultValue: 'right',
        options: [
          { value: 'left', label: 'Esquerda' },
          { value: 'right', label: 'Direita' },
        ],
      },
    ],
    generator: {
      type: 'openscad',
      moduleId: 'magsafe_v1',
      moduleName: 'magsafe_dock_v1',
      version: 'v1',
    },
  },
  {
    productId: 'pen_holder_v1',
    name: 'Copo de Canetas',
    category: 'Organização',
    description: 'Copo vertical para canetas, marcadores e ferramentas pequenas.',
    price: 8,
    footprintCm: { width: 7, depth: 7 },
    defaultColors: { base: 'Preto Fosco', accent: 'Madeira Walnut' },
    allowedColors: {
      base: ['Preto Fosco', 'Branco Stormtrooper'],
      accent: ['Madeira Walnut', 'Neon Lime', 'Pulse Blue'],
    },
    preview: { shape: 'circle', icon: 'pen' },
    validation: { allowedSurfaces: ['top'] },
    customFields: [
      {
        key: 'heightPreset',
        label: 'Altura',
        type: 'select',
        defaultValue: 'standard',
        options: [
          { value: 'low', label: 'Baixo' },
          { value: 'standard', label: 'Standard' },
          { value: 'tall', label: 'Alto' },
        ],
      },
      {
        key: 'dividers',
        label: 'Divisórias internas',
        type: 'boolean',
        defaultValue: false,
      },
    ],
    generator: {
      type: 'openscad',
      moduleId: 'pen_holder_v1',
      moduleName: 'pen_holder_v1',
      version: 'v1',
    },
  },
  {
    productId: 'desk_tray_v1',
    name: 'Bandeja Modular',
    category: 'Arrumação',
    description: 'Bandeja baixa para chaves, cartões, comandos ou pequenos acessórios.',
    price: 5,
    footprintCm: { width: 12, depth: 8 },
    defaultColors: { base: 'Preto Fosco', accent: 'Neon Lime' },
    allowedColors: {
      base: ['Preto Fosco', 'Branco Stormtrooper'],
      accent: ['Madeira Walnut', 'Neon Lime', 'Pulse Blue'],
    },
    preview: { shape: 'tray', icon: 'tray' },
    validation: { allowedSurfaces: ['top'] },
    customFields: [
      {
        key: 'size',
        label: 'Tamanho',
        type: 'select',
        defaultValue: 'S',
        options: [
          { value: 'S', label: 'Pequena', footprintCm: { width: 12, depth: 8 } },
          { value: 'M', label: 'Média', priceAdd: 3, footprintCm: { width: 16, depth: 10 } },
          { value: 'L', label: 'Grande', priceAdd: 6, footprintCm: { width: 20, depth: 12 } },
        ],
      },
    ],
    generator: {
      type: 'openscad',
      moduleId: 'desk_tray_v1',
      moduleName: 'desk_tray_v1',
      version: 'v1',
    },
  },
  {
    productId: 'headphone_stand_v1',
    name: 'Suporte de Auscultadores',
    category: 'Áudio',
    description: 'Suporte de presença discreta para manter os auscultadores no setup.',
    price: 24.9,
    footprintCm: { width: 12, depth: 10 },
    defaultColors: { base: 'Preto Fosco', accent: 'Pulse Blue' },
    allowedColors: {
      base: ['Preto Fosco', 'Branco Stormtrooper'],
      accent: ['Madeira Walnut', 'Neon Lime', 'Pulse Blue'],
    },
    preview: { shape: 'hook', icon: 'headphones' },
    validation: { allowedSurfaces: ['top'] },
    customFields: [
      {
        key: 'hookSide',
        label: 'Lado do gancho',
        type: 'select',
        defaultValue: 'right',
        options: [
          { value: 'left', label: 'Esquerda' },
          { value: 'right', label: 'Direita' },
        ],
      },
      {
        key: 'heightPreset',
        label: 'Altura',
        type: 'select',
        defaultValue: 'standard',
        options: [
          { value: 'standard', label: 'Standard' },
          { value: 'tall', label: 'Alto' },
        ],
      },
    ],
    generator: {
      type: 'openscad',
      moduleId: 'headphone_stand_v1',
      moduleName: 'headphone_stand_v1',
      version: 'v1',
    },
  },
]

export const deskProductsById = new Map<DeskProductId, DeskProductDefinition>(
  deskProducts.map((product) => [product.productId, product]),
)

export function getDeskProduct(productId: string) {
  return deskProductsById.get(productId as DeskProductId)
}

export function getDefaultCustomConfig(product: Pick<DeskProductDefinition, 'customFields'>): Record<string, DeskCustomFieldValue> {
  return Object.fromEntries(
    (product.customFields ?? []).map((field) => [field.key, field.defaultValue]),
  ) as Record<string, DeskCustomFieldValue>
}

export function getCustomFieldOption(field: DeskCustomFieldDefinition, value: unknown) {
  if (field.type !== 'select' && field.type !== 'segmented') return undefined
  return field.options.find((option) => option.value === value)
}

function getCustomFieldValue(item: DeskItem, field: DeskCustomFieldDefinition) {
  if (!item.customConfig || typeof item.customConfig !== 'object' || Array.isArray(item.customConfig)) {
    return field.defaultValue
  }

  return item.customConfig[field.key] ?? field.defaultValue
}

function getUnrotatedItemFootprint(item: DeskItem) {
  const product = getDeskProduct(item.productId)
  if (!product) return null

  let footprint = product.footprintCm

  for (const field of product.customFields ?? []) {
    const option = getCustomFieldOption(field, getCustomFieldValue(item, field))
    if (option?.footprintCm) footprint = option.footprintCm
  }

  return footprint
}

export function getDeskItemFootprint(item: DeskItem) {
  const footprint = getUnrotatedItemFootprint(item)
  if (!footprint) return null

  const rotated = item.rotation === 90 || item.rotation === 270
  return {
    width: rotated ? footprint.depth : footprint.width,
    depth: rotated ? footprint.width : footprint.depth,
  }
}

export function getDeskItemCustomPriceAdd(item: DeskItem) {
  const product = getDeskProduct(item.productId)
  if (!product) return 0

  return (product.customFields ?? []).reduce((sum, field) => {
    if (field.type === 'number') return sum + (field.priceAdd ?? 0)
    const option = getCustomFieldOption(field, getCustomFieldValue(item, field))
    return sum + (option?.priceAdd ?? 0)
  }, 0)
}

export function getDeskItemCustomOptionSummaries(item: DeskItem) {
  const product = getDeskProduct(item.productId)
  if (!product) return []

  return (product.customFields ?? []).map((field) => {
    const value = getCustomFieldValue(item, field)
    const option = getCustomFieldOption(field, value)
    const label = field.type === 'boolean'
      ? (value === true ? 'Sim' : 'Não')
      : option?.label ?? String(value)

    return {
      key: field.key,
      label: field.label,
      value,
      valueLabel: label,
      priceAdd: field.type === 'number' ? (field.priceAdd ?? 0) : (option?.priceAdd ?? 0),
    }
  })
}
