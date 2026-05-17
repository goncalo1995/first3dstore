import { getDeskItemCustomPriceAdd, getDeskProduct } from './products'
import type { DeskItem, DeskPricing, DeskSetup } from './types'

export function getDeskItemPrice(item: DeskItem) {
  const product = getDeskProduct(item.productId)
  if (!product) return 0
  return Math.round((product.price + getDeskItemCustomPriceAdd(item)) * 100) / 100
}

export function calculateDeskPricing(setup: Pick<DeskSetup, 'items'>): DeskPricing {
  const items = 'items' in setup && Array.isArray(setup.items) ? setup.items : []
  const itemsPrice = items.reduce((sum, item) => {
    return sum + getDeskItemPrice(item)
  }, 0)
  const setupDiscount = 0

  return {
    itemsPrice: Math.round(itemsPrice * 100) / 100,
    setupDiscount,
    totalPrice: Math.round((itemsPrice - setupDiscount) * 100) / 100,
  }
}

export function getAllDeskItems(setup: Pick<DeskSetup, 'topItems' | 'underItems'> | { items?: DeskItem[]; topItems?: DeskItem[]; underItems?: DeskItem[] }) {
  const candidate = setup as { items?: DeskItem[]; topItems?: DeskItem[]; underItems?: DeskItem[] }
  if (Array.isArray(candidate.topItems) || Array.isArray(candidate.underItems)) {
    return [...(candidate.topItems ?? []), ...(candidate.underItems ?? [])]
  }
  return candidate.items ?? []
}

export function calculateDeskSetupPricing(setup: Pick<DeskSetup, 'topItems' | 'underItems'> | { items?: DeskItem[]; topItems?: DeskItem[]; underItems?: DeskItem[] }): DeskPricing {
  return calculateDeskPricing({ items: getAllDeskItems(setup) } as Pick<DeskSetup, 'items'>)
}
