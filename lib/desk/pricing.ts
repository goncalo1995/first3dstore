import { getDeskItemCustomPriceAdd, getDeskProduct } from './products'
import type { DeskItem, DeskPricing, DeskSetup } from './types'

export function getDeskItemPrice(item: DeskItem) {
  const product = getDeskProduct(item.productId)
  if (!product) return 0
  return Math.round((product.price + getDeskItemCustomPriceAdd(item)) * 100) / 100
}

export function calculateDeskPricing(setup: Pick<DeskSetup, 'items'>): DeskPricing {
  const itemsPrice = setup.items.reduce((sum, item) => {
    return sum + getDeskItemPrice(item)
  }, 0)
  const setupDiscount = 0

  return {
    itemsPrice: Math.round(itemsPrice * 100) / 100,
    setupDiscount,
    totalPrice: Math.round((itemsPrice - setupDiscount) * 100) / 100,
  }
}
