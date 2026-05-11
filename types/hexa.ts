export type HexaSize = 'XS' | 'S' | 'M'

export type HexaColor = 'Preto' | 'Branco' | 'Madeira' | 'Cinza' | 'Verde sálvia'

export type HexaSpaceType = 'Casa' | 'Escritório' | 'Loja' | 'Restaurante'

export type HexaPhotoAdjustments = {
  zoom: number
  offsetX: number
  offsetY: number
}

export type HexaTile = {
  id: string
  color: HexaColor
  photoPreviewUrl?: string | null
  photoName?: string | null
  photoAdjustments: HexaPhotoAdjustments
}

export type HexaRequestTile = {
  id: string
  color: HexaColor
  photoAdjustments: HexaPhotoAdjustments
}

export type HexaCustomer = {
  name: string
  email: string
  phone: string
  spaceType: HexaSpaceType
}

export type HexaRequest = {
  customer: HexaCustomer
  mosaicSize: HexaSize
  productSlug: string
  tiles: HexaRequestTile[]
  layout: {
    type: 'honeycomb'
    gapMm: number
  }
}

export const HEXA_SIZES: Record<HexaSize, { label: HexaSize; width: number; height: number; price: number; note: string }> = {
  XS: { label: 'XS', width: 120, height: 104, price: 14.99, note: 'Cabe 2x2 na placa' },
  S: { label: 'S', width: 160, height: 138.6, price: 19.99, note: 'Uma peça por placa' },
  M: { label: 'M', width: 200, height: 173.2, price: 29.99, note: 'Impressão separada' },
}

export const HEXA_COLORS: Record<HexaColor, { label: HexaColor; hex: string; text: string }> = {
  Preto: { label: 'Preto', hex: '#1f1f1d', text: '#f8f3ea' },
  Branco: { label: 'Branco', hex: '#f7f3ea', text: '#2a2520' },
  Madeira: { label: 'Madeira', hex: '#b88452', text: '#2a1d12' },
  Cinza: { label: 'Cinza', hex: '#8b8a84', text: '#fffaf0' },
  'Verde sálvia': { label: 'Verde sálvia', hex: '#77856c', text: '#fffaf0' },
}
