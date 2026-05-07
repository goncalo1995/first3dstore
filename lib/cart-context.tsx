'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Product, ProductColor } from './products'

export interface CartItemCustomization {
  label: string
  value: string
  priceAdd: number
}

export interface CartItemPartColor {
  label: string
  colorName: string
  colorHex: string
  grams: number
}

export interface CartItemVariant {
  id?: string
  name: string
  kind: 'single_color' | 'preset_pack' | 'custom_text'
  colors: {
    colorName: string
    colorHex: string
  }[]
  image?: string
  priceAdd?: number
  finalPrice?: number
}

export interface CartItem {
  id: string // unique cart item id
  product: Product
  quantity: number
  selectedColor: ProductColor
  selectedColors?: ProductColor[] // for multi-color products
  selectedParts?: CartItemPartColor[]
  selectedVariant?: CartItemVariant
  customizations: CartItemCustomization[]
  unitPrice: number
}

interface CartContextType {
  items: CartItem[]
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)
const CART_STORAGE_KEY = 'golfprint-cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CART_STORAGE_KEY)
      if (saved) setItems(JSON.parse(saved) as CartItem[])
    } catch {
      setItems([])
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])
  const toggleCart = useCallback(() => setIsOpen(prev => !prev), [])

  const addItem = useCallback((newItem: Omit<CartItem, 'id'>) => {
    const partKey = newItem.selectedVariant?.name
      ?? newItem.selectedParts?.map(part => `${part.label}:${part.colorName}`).join('-')
      ?? newItem.selectedColor.name
    const id = `${newItem.product.id}-${partKey}-${newItem.customizations.map(c => c.value).join('-')}-${Date.now()}`
    setItems(prev => [...prev, { ...newItem, id }])
    setIsOpen(true)
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(id)
      return
    }
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    )
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
