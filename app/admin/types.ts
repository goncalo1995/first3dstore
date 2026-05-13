import type {
  CatalogProductRecord,
  GlobalColor,
  ProductInventory,
} from '@/lib/products'

export type ColorRecord = GlobalColor & { id: string }
export type GlobalColorRecord = ColorRecord & { isActive?: boolean; spoolStatus: string }

export type InventoryRecord = ProductInventory & { id: string; updatedAt?: Date }

export type CatalogRecord = CatalogProductRecord & { id: string; updatedAt?: Date }

export type CategoryRecord = {
  id: string
  slug: string
  label: string
  description?: string
  sortOrder: number
  visible: boolean
  updatedAt?: Date
  products?: CatalogRecord[]
  primaryProducts?: CatalogRecord[]
}

export type OrderRecord = {
  id: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  paymentPreference?: 'mbway' | 'bank_transfer' | 'cash_pickup' | 'other' | 'stripe'
  shippingMethod: 'pickup_carcavelos' | 'mainland_portugal'
  shippingAddress?: string
  stripeSessionId?: string
  stripePaymentIntentId?: string
  paymentUrl?: string
  paidAt?: Date
  items: {
    productId?: string
    productName: string
    quantity: number
    colors: string[]
    selectedColor?: {
      name: string
      hex: string
      imageUrl?: string
      globalColorId?: string
      colorPriceAdd?: number
    }
    selectedColors?: {
      name: string
      hex: string
      imageUrl?: string
      globalColorId?: string
      colorPriceAdd?: number
    }[]
    selectedParts?: {
      label: string
      colorName: string
      colorHex: string
      globalColorId?: string
      colorPriceAdd?: number
      resolvedBy?: 'globalColorId' | 'name' | 'hex' | 'unresolved'
      grams: number
    }[]
    selectedVariant?: {
      id?: string
      name: string
      kind?: 'single_color' | 'preset_pack' | 'custom_text'
      colorMode?: 'fixed' | 'customer_choice' | 'multi_part'
      allowedGlobalColorIds?: string[]
      colors: {
        name: string
        hex: string
        imageUrl?: string
        globalColorId?: string
        priceAdd?: number
      }[]
    }
    customText?: string
    unitPrice: number
    itemStatus?: 'new' | 'waiting_color' | 'scheduled' | 'printing' | 'printed' | 'assembled' | 'done' | 'blocked'
    adminNotes?: string
    scheduledFor?: string
    quantityDone?: number
  }[]
  subtotal: number
  shippingCost: number
  total: number
  paymentStatus: 'pending' | 'paid' | 'refunded'
  fulfillmentStatus: 'new' | 'printing' | 'ready' | 'ready_for_pickup' | 'shipped' | 'completed' | 'cancelled'
  notes?: string
  createdAt: Date
  updatedAt: Date
}
