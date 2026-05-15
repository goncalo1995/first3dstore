import type { DeskColorName, DeskProductDefinition, DeskProductId } from './types'

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
