import { getDeskProduct } from './products'
import type { DeskPricing, DeskSetup } from './types'

export function calculateDeskPricing(setup: Pick<DeskSetup, 'items'>): DeskPricing {
  const itemsPrice = setup.items.reduce((sum, item) => {
    const product = getDeskProduct(item.productId)
    return sum + (product?.price ?? 0)
  }, 0)
  const setupDiscount = 0

  return {
    itemsPrice: Math.round(itemsPrice * 100) / 100,
    setupDiscount,
    totalPrice: Math.round((itemsPrice - setupDiscount) * 100) / 100,
  }
}
