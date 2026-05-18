import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { dbAdmin, id } from '@/lib/db-admin'
import { getCatalogProductBySlugForBuild } from '@/lib/catalog'
import type { CartItemPartColor, CartItemVariant } from '@/lib/cart-context'
import {
  CHARS_PER_MODULE_ESTIMATE,
  LAUNCH_DISCOUNT_PERCENT,
  MAX_GLOBAL_MODULES,
  MIN_GLOBAL_MODULES,
  MODULE_LENGTH_CM,
  calculateMenuQuote,
  validateMenuQuoteLimits,
  type MenuQuote,
  type MenuRowInput,
} from '@/lib/menu-calculator'
import type { GlobalColor, Product, ProductColor } from '@/lib/products'

export const runtime = 'nodejs'

const SHIPPING_COST = 4.99
const MAX_ITEMS = 30
const MAX_QUANTITY = 99
const MAX_MENU_QUANTITY = 2000
const MENU_RAIL_SLUG = 'menu-rail-25cm'
const MENU_PACK_SLUG = 'menu-letter-pack-standard'
const MENU_AVULSO_SLUG = 'menu-letter-custom'
const MENU_PRODUCT_COLOR_CONFIG_ERROR = 'Este produto ainda não tem cores configuradas. Contacte-nos para finalizar o pedido.'
const MENU_LETTER_COLOR_REQUEST_MAX_CHARS = 300

type CheckoutPayload = {
  customer?: {
    name?: string
    email?: string
    phone?: string
  }
  shipping?: {
    method?: 'pickup_carcavelos' | 'mainland_portugal'
    address?: string
  }
  notes?: string
  menuSystem?: {
    menuText?: string
    extraLettersText?: string
    customIconRequest?: string
    letterColorRequest?: {
      enabled?: boolean
      description?: string
    }
    moduleLengthCm?: 25
    charsPerModuleEstimate?: 5
    globalModuleCount?: number
    standardPackQuantity?: number
    avulsoCharacterQuantity?: number
    lines?: {
      index?: number
      text?: string
      label?: string
      suffix?: string
      price?: string
      characterCount?: number
      widthWarning?: boolean
    }[]
    railColor?: ProductColor
    letterColor?: ProductColor
  }
  items?: {
    productSlug?: string
    quantity?: number
    selectedColor?: ProductColor
    selectedColors?: ProductColor[]
    selectedParts?: CartItemPartColor[]
    selectedVariant?: CartItemVariant
    customizations?: {
      label?: string
      value?: string
      priceAdd?: number
    }[]
  }[]
}

type MenuItemRole = 'rails' | 'standard_pack' | 'avulso'
type MenuBaseUnitPrices = Partial<Record<MenuItemRole, number>>
type MenuProductColorRecord = {
  slug?: string
  inventory?: {
    colorInventory?: {
      globalColorId?: string
      colorName: string
      colorHex: string
      offered: boolean
      priceAdd?: number
    }[]
  }
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null
  return new Stripe(secretKey)
}

function getMenuItemRole(slug: string): MenuItemRole | undefined {
  if (slug === MENU_RAIL_SLUG) return 'rails'
  if (slug === MENU_PACK_SLUG) return 'standard_pack'
  if (slug === MENU_AVULSO_SLUG) return 'avulso'
  return undefined
}

function getMenuRows(menuSystem: NonNullable<CheckoutPayload['menuSystem']>): MenuRowInput[] | undefined {
  const rows = (menuSystem.lines ?? [])
    .map(line => ({
      label: String(line.label ?? '').trim(),
      suffix: String(line.suffix ?? '').trim(),
      price: String(line.price ?? '').trim(),
    }))
    .filter(row => row.label || row.suffix || row.price)

  return rows.length ? rows : undefined
}

async function getMenuProductColorRecords() {
  const data = await dbAdmin.query({
    catalogProducts: {
      $: {
        where: {
          slug: { $in: [MENU_RAIL_SLUG, MENU_PACK_SLUG, MENU_AVULSO_SLUG] },
        },
      },
      inventory: {},
    },
  })

  return Object.fromEntries(
    ((data.catalogProducts ?? []) as MenuProductColorRecord[]).map(product => [String(product.slug ?? ''), product]),
  ) as Record<string, MenuProductColorRecord | undefined>
}

function getMenuItemQuantity(items: NonNullable<CheckoutPayload['items']>, slug: string) {
  return items.reduce((sum, item) => sum + (String(item.productSlug ?? '').trim() === slug ? Number(item.quantity) || 0 : 0), 0)
}

function colorsMatch(left: ProductColor | undefined, right: ProductColor | undefined) {
  if (!left || !right) return false
  if (left.globalColorId && right.globalColorId) return left.globalColorId === right.globalColorId
  return normalizeName(left.name) === normalizeName(right.name)
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function formatCustomText(customizations: NonNullable<CheckoutPayload['items']>[number]['customizations']) {
  return (customizations ?? [])
    .map(customization => ({
      label: String(customization.label ?? '').trim(),
      value: String(customization.value ?? '').trim(),
    }))
    .filter(customization => customization.label && customization.value)
    .map(customization => `${customization.label}: ${customization.value}`)
    .join(' | ')
}

function getVariant(product: Product, selectedVariant?: CartItemVariant) {
  if (!selectedVariant?.id) return undefined
  return product.variants?.find(variant => variant.id === selectedVariant.id)
}

function normalizeName(value: string | undefined) {
  return String(value ?? '').trim().toLowerCase()
}

function getOfferedProductColors(product: MenuProductColorRecord | undefined) {
  return product?.inventory?.colorInventory?.filter(color => color.offered) ?? []
}

function getActiveGlobalColor(globalColors: GlobalColor[], color: ProductColor | undefined) {
  if (!color?.name && !color?.globalColorId) return undefined
  return globalColors.find(candidate => {
    const isActive = candidate.isActive !== false && candidate.spoolStatus !== 'archived'
    if (!isActive) return false
    if (color.globalColorId && (candidate.id === color.globalColorId || candidate.globalColorId === color.globalColorId)) return true
    return normalizeName(candidate.name) === normalizeName(color.name)
  })
}

function validateMenuColor(
  globalColors: GlobalColor[],
  color: ProductColor | undefined,
  label: string,
  product?: MenuProductColorRecord,
  options: { validateProductAvailability?: boolean } = { validateProductAvailability: true },
) {
  if (!color?.name && !color?.globalColorId) {
    throw new Error(`Escolha a ${label}.`)
  }

  const match = getActiveGlobalColor(globalColors, color)

  if (!match) {
    throw new Error(`A ${label} selecionada já não está disponível.`)
  }

  if (options.validateProductAvailability === false) return

  const offeredColors = getOfferedProductColors(product)
  if (offeredColors.length === 0) {
    throw new Error(MENU_PRODUCT_COLOR_CONFIG_ERROR)
  }

  const isOffered = offeredColors.some(offeredColor => {
    if (color.globalColorId && offeredColor.globalColorId === color.globalColorId) return true
    if (match.id && offeredColor.globalColorId === match.id) return true
    if (match.globalColorId && offeredColor.globalColorId === match.globalColorId) return true
    return normalizeName(offeredColor.colorName) === normalizeName(color.name) ||
      normalizeName(offeredColor.colorName) === normalizeName(match.name)
  })

  if (!isOffered) {
    throw new Error(`A ${label} selecionada não está disponível para este produto.`)
  }
}

function hasUnsupportedControlCharacters(value: string) {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(value)
}

function calculateVisibleCharacters(value: string) {
  return Array.from(String(value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '')).length
}

function validateLetterColorRequest(menuSystem: NonNullable<CheckoutPayload['menuSystem']>) {
  const request = menuSystem.letterColorRequest
  if (!request?.enabled) return
  const description = String(request.description ?? '').trim()
  if (!description) return

  if (calculateVisibleCharacters(description) > MENU_LETTER_COLOR_REQUEST_MAX_CHARS) {
    throw new Error(`O pedido de cor pode ter no máximo ${MENU_LETTER_COLOR_REQUEST_MAX_CHARS} caracteres.`)
  }
  if (hasUnsupportedControlCharacters(description)) {
    throw new Error('O pedido de cor contém caracteres não suportados.')
  }
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(description) || /(?:\+?\d[\s().-]*){7,}/.test(description)) {
    throw new Error('Descreva apenas a cor pretendida, sem contactos pessoais.')
  }
}

function sanitizeMenuColor(color: ProductColor | undefined) {
  if (!color) return undefined
  return {
    name: color.name,
    hex: color.hex,
    globalColorId: color.globalColorId,
    priceAdd: color.priceAdd,
  }
}

function validateMenuPayload(
  body: CheckoutPayload,
  globalColors: GlobalColor[],
  menuProducts: Record<string, MenuProductColorRecord | undefined> = {},
): MenuQuote | null {
  if (!body.menuSystem) return null

  const items = body.items ?? []
  if (body.menuSystem.moduleLengthCm !== undefined && body.menuSystem.moduleLengthCm !== MODULE_LENGTH_CM) {
    throw new Error(`Os módulos do Menu3D usam ${MODULE_LENGTH_CM}cm.`)
  }
  if (body.menuSystem.charsPerModuleEstimate !== undefined && body.menuSystem.charsPerModuleEstimate !== CHARS_PER_MODULE_ESTIMATE) {
    throw new Error(`Cada módulo estima cerca de ${CHARS_PER_MODULE_ESTIMATE} caracteres.`)
  }
  if (!Number.isInteger(Number(body.menuSystem.globalModuleCount))) {
    throw new Error('Escolha a largura do Menu3D em módulos.')
  }
  if (Number(body.menuSystem.globalModuleCount) < MIN_GLOBAL_MODULES || Number(body.menuSystem.globalModuleCount) > MAX_GLOBAL_MODULES) {
    throw new Error(`A largura deve ter entre ${MIN_GLOBAL_MODULES} e ${MAX_GLOBAL_MODULES} módulos.`)
  }

  const quote = calculateMenuQuote({
    rows: getMenuRows(body.menuSystem),
    menuText: String(body.menuSystem.menuText ?? ''),
    extraLettersText: String(body.menuSystem.extraLettersText ?? ''),
    customIconRequest: String(body.menuSystem.customIconRequest ?? ''),
    globalModuleCount: Number(body.menuSystem.globalModuleCount),
    standardPackQuantity: Number(body.menuSystem.standardPackQuantity),
    avulsoCharacterQuantity: Number(body.menuSystem.avulsoCharacterQuantity),
  })
  const limitErrors = validateMenuQuoteLimits(quote)

  if (limitErrors.length) {
    throw new Error(limitErrors[0])
  }

  const expectedQuantities = [
    { slug: MENU_RAIL_SLUG, quantity: quote.totalRailModules, label: 'módulos de 25cm' },
    { slug: MENU_PACK_SLUG, quantity: quote.standardPackQuantity, label: 'packs standard' },
    { slug: MENU_AVULSO_SLUG, quantity: quote.avulsoCharacterQuantity, label: 'letras avulso' },
  ]

  for (const expected of expectedQuantities) {
    if (getMenuItemQuantity(items, expected.slug) !== expected.quantity) {
      throw new Error(`A quantidade de ${expected.label} não corresponde ao cálculo do menu.`)
    }
  }

  for (const item of items) {
    const slug = String(item.productSlug ?? '').trim()
    if (!getMenuItemRole(slug)) {
      throw new Error('A encomenda do Menu Modular só pode incluir componentes do menu.')
    }
  }

  validateLetterColorRequest(body.menuSystem)
  validateMenuColor(globalColors, body.menuSystem.railColor, 'cor das calhas', menuProducts[MENU_RAIL_SLUG])

  const hasStandardPack = getMenuItemQuantity(items, MENU_PACK_SLUG) > 0
  const hasAvulsoLetters = getMenuItemQuantity(items, MENU_AVULSO_SLUG) > 0
  if (hasStandardPack) {
    validateMenuColor(globalColors, body.menuSystem.letterColor, 'cor das letras', menuProducts[MENU_PACK_SLUG])
  }
  if (hasAvulsoLetters) {
    validateMenuColor(globalColors, body.menuSystem.letterColor, 'cor das letras', menuProducts[MENU_AVULSO_SLUG])
  }
  if (!hasStandardPack && !hasAvulsoLetters) {
    validateMenuColor(globalColors, body.menuSystem.letterColor, 'cor das letras', undefined, { validateProductAvailability: false })
  }

  for (const item of items) {
    const slug = String(item.productSlug ?? '').trim()
    if (slug === MENU_RAIL_SLUG && !colorsMatch(item.selectedColor, body.menuSystem.railColor)) {
      throw new Error('A cor das calhas no carrinho não corresponde ao cálculo do menu.')
    }
    if ((slug === MENU_PACK_SLUG || slug === MENU_AVULSO_SLUG) && !colorsMatch(item.selectedColor, body.menuSystem.letterColor)) {
      throw new Error('A cor das letras no carrinho não corresponde ao cálculo do menu.')
    }
  }

  return quote
}

function getMenuItemDetails(role: MenuItemRole | undefined, quote: MenuQuote | null, menuSystem?: CheckoutPayload['menuSystem']) {
  if (!role || !quote) return undefined

  const base = {
    role,
    moduleLengthCm: quote.moduleLengthCm,
    charsPerModuleEstimate: quote.charsPerModuleEstimate,
    menuText: quote.menuText,
    extraLettersText: quote.extraLettersText || undefined,
    customIconRequest: quote.customIconRequest || undefined,
    lineCount: quote.lineCount,
    globalModuleCount: quote.globalModuleCount,
    globalWidthCm: quote.globalWidthCm,
    estimatedCharsPerLine: quote.estimatedCharsPerLine,
    productionFont: quote.productionFont,
    productionSize: quote.productionSize,
    starterQuantity: quote.starterQuantity,
    extensionQuantityPerLine: quote.extensionQuantityPerLine,
    totalExtensionQuantity: quote.totalExtensionQuantity,
    totalRailModules: quote.totalRailModules,
    menuCharacters: quote.menuCharacters,
    extraCharacters: quote.extraCharacters,
    totalCharacters: quote.totalCharacters,
    standardPackMinimum: quote.standardPackMinimum,
    standardPackQuantity: quote.standardPackQuantity,
    avulsoMinimum: quote.avulsoMinimum,
    avulsoCharacterQuantity: quote.avulsoCharacterQuantity,
    characterFrequencyMap: quote.characterFrequencyMap,
    railModuleUnitPrice: quote.railModuleUnitPrice,
    standardPackUnitPrice: quote.standardPackUnitPrice,
    avulsoUnitPrice: quote.avulsoUnitPrice,
    modulesSubtotal: quote.modulesSubtotal,
    standardPacksSubtotal: quote.standardPacksSubtotal,
    avulsoSubtotal: quote.avulsoSubtotal,
    subtotalBeforeDiscount: quote.subtotalBeforeDiscount,
    launchDiscountPercent: quote.launchDiscountPercent,
    launchDiscountAmount: quote.launchDiscountAmount,
    totalAfterDiscount: quote.totalAfterDiscount,
    railColor: sanitizeMenuColor(menuSystem?.railColor),
    letterColor: sanitizeMenuColor(menuSystem?.letterColor),
    letterColorRequest: menuSystem?.letterColorRequest?.enabled
      ? {
          enabled: true,
          description: String(menuSystem.letterColorRequest.description ?? '').trim(),
        }
      : undefined,
  }

  if (role === 'rails') {
    return { ...base, lines: quote.lines }
  }

  return base
}

function getMenuCustomText(role: MenuItemRole | undefined, quote: MenuQuote | null, customText: string) {
  if (!role || !quote) return customText || undefined

  const menuText = role === 'rails'
    ? `${quote.totalRailModules} módulos de ${quote.moduleLengthCm}cm (${quote.lineCount} linhas, ${quote.globalModuleCount} por linha)`
    : role === 'standard_pack'
      ? `${quote.standardPackQuantity} pack(s) de 300 caracteres`
      : `${quote.avulsoCharacterQuantity} letras avulso`

  return [customText, menuText].filter(Boolean).join(' | ')
}

function getMenuOrderNotes(quote: MenuQuote | null, menuSystem?: CheckoutPayload['menuSystem']) {
  if (!quote) return ''
  const letterColorRequest = menuSystem?.letterColorRequest?.enabled
    ? String(menuSystem.letterColorRequest.description ?? '').trim()
    : ''
  return `Sistema Menu Modular: ${quote.lineCount} linhas, ${quote.globalModuleCount} módulos por linha (${quote.globalWidthCm}cm), ${quote.totalRailModules} módulos totais, ${quote.standardPackQuantity} packs standard, ${quote.avulsoCharacterQuantity} letras avulso, ${quote.totalCharacters} caracteres, subtotal ${formatMoney(quote.subtotalBeforeDiscount)}, desconto lançamento -${quote.launchDiscountPercent}%, total ${formatMoney(quote.totalAfterDiscount)}.${quote.customIconRequest ? ` Pedido ícone/logótipo: ${quote.customIconRequest}.` : ''}${letterColorRequest ? ` Pedido de cor especial para letras: ${letterColorRequest}.` : ''}`
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function getGlobalColorPriceAdd(
  globalColors: GlobalColor[],
  color: { globalColorId?: string; name?: string; colorName?: string } | undefined,
) {
  if (!color) return 0
  const globalColor = color.globalColorId
    ? globalColors.find(candidate => candidate.id === color.globalColorId || candidate.globalColorId === color.globalColorId)
    : globalColors.find(candidate => normalizeName(candidate.name) === normalizeName(color.name ?? color.colorName))
  return globalColor?.priceAdd ?? 0
}

function validateCustomizations(product: Product, item: NonNullable<CheckoutPayload['items']>[number], variant?: NonNullable<Product['variants']>[number]) {
  const options = variant?.kind === 'custom_text'
    ? variant.customizationOptions ?? []
    : product.customizationOptions ?? []
  const customizations = item.customizations ?? []

  for (const customization of customizations) {
    const label = String(customization.label ?? '').trim()
    const value = String(customization.value ?? '').trim()
    if (!label || !value) continue

    const option = options.find(candidate => candidate.label === label)
    if (!option) {
      throw new Error(`Personalização inválida para ${product.name}.`)
    }
    if (value.length > option.maxChars) {
      throw new Error(`${option.label} excede o limite de caracteres.`)
    }
  }

  return customizations.reduce((sum, customization) => {
    const label = String(customization.label ?? '').trim()
    const value = String(customization.value ?? '').trim()
    if (!label || !value) return sum

    const option = options.find(candidate => candidate.label === label)
    return sum + (option?.priceAdd ?? 0)
  }, 0)
}

function getItemColors(product: Product, item: NonNullable<CheckoutPayload['items']>[number], variant?: NonNullable<Product['variants']>[number]) {
  if (variant && variant.colorMode !== 'customer_choice' && variant.colorMode !== 'multi_part') {
    return variant.colors.map(color => color.name)
  }

  if (item.selectedParts?.length) {
    return item.selectedParts.map(part => `${part.label}: ${part.colorName}`)
  }

  if (item.selectedColors?.length) {
    return item.selectedColors.map(color => color.name)
  }

  if (item.selectedColor?.name) {
    return [item.selectedColor.name]
  }

  return product.colors[0]?.name ? [product.colors[0].name] : []
}

function withColorPriceAdd<T extends ProductColor>(globalColors: GlobalColor[], color: T | undefined): T | undefined {
  if (!color) return undefined
  return {
    ...color,
    colorPriceAdd: getGlobalColorPriceAdd(globalColors, color),
  } as T & { colorPriceAdd: number }
}

function getSelectedColorPayload(
  product: Product,
  item: NonNullable<CheckoutPayload['items']>[number],
  globalColors: GlobalColor[],
  variant?: NonNullable<Product['variants']>[number],
) {
  if (variant?.colors?.length && variant.colorMode !== 'customer_choice' && variant.colorMode !== 'multi_part') {
    return {
      selectedColor: withColorPriceAdd(globalColors, variant.colors[0]),
      selectedColors: variant.colors.map(color => withColorPriceAdd(globalColors, color)).filter(Boolean),
      selectedParts: undefined,
    }
  }

  if (item.selectedParts?.length) {
    return {
      selectedColor: withColorPriceAdd(globalColors, item.selectedColor),
      selectedColors: item.selectedParts.map(part => ({
        name: part.colorName,
        hex: part.colorHex,
        globalColorId: part.globalColorId,
        colorPriceAdd: getGlobalColorPriceAdd(globalColors, part),
      })),
      selectedParts: item.selectedParts.map(part => ({
        ...part,
        colorPriceAdd: getGlobalColorPriceAdd(globalColors, part),
      })),
    }
  }

  if (item.selectedColors?.length) {
    return {
      selectedColor: withColorPriceAdd(globalColors, item.selectedColors[0]),
      selectedColors: item.selectedColors.map(color => withColorPriceAdd(globalColors, color)).filter(Boolean),
      selectedParts: undefined,
    }
  }

  const selectedColor = item.selectedColor ?? product.colors[0]
  return {
    selectedColor: withColorPriceAdd(globalColors, selectedColor),
    selectedColors: selectedColor ? [withColorPriceAdd(globalColors, selectedColor)].filter(Boolean) : [],
    selectedParts: undefined,
  }
}

function getUnitPrice(
  product: Product,
  item: NonNullable<CheckoutPayload['items']>[number],
  globalColors: GlobalColor[],
  variant?: NonNullable<Product['variants']>[number],
) {
  const basePrice = product.salePrice ?? product.priceFrom
  const customizationPriceAdd = validateCustomizations(product, item, variant)
  const variantColorMode = variant?.colorMode

  if (variant?.finalPrice !== undefined) {
    const premiumColorPriceAdd = variantColorMode === 'customer_choice'
      ? getGlobalColorPriceAdd(globalColors, item.selectedColor ?? item.selectedColors?.[0])
      : variantColorMode === 'multi_part'
        ? (item.selectedParts ?? []).reduce((sum, part) => sum + getGlobalColorPriceAdd(globalColors, part), 0)
        : 0
    return variant.finalPrice + customizationPriceAdd + premiumColorPriceAdd
  }

  const variantPriceAdd = variant?.priceAdd ?? 0
  const multiColorPriceAdd = !variant && item.selectedColors && item.selectedColors.length > 1
    ? product.multiColorPriceAdd ?? 0
    : 0
  const menuColorPriceAdd = !variant && getMenuItemRole(product.slug)
    ? getGlobalColorPriceAdd(globalColors, item.selectedColor ?? item.selectedColors?.[0])
    : 0
  const premiumColorPriceAdd = variantColorMode === 'customer_choice'
    ? getGlobalColorPriceAdd(globalColors, item.selectedColor ?? item.selectedColors?.[0])
    : variantColorMode === 'multi_part'
      ? (item.selectedParts ?? []).reduce((sum, part) => sum + getGlobalColorPriceAdd(globalColors, part), 0)
      : 0

  return basePrice + variantPriceAdd + multiColorPriceAdd + customizationPriceAdd + premiumColorPriceAdd + menuColorPriceAdd
}

function cents(value: number) {
  return Math.round(value * 100)
}

function discountedMenuUnitPrice(unitPrice: number) {
  return Math.round(unitPrice * (1 - LAUNCH_DISCOUNT_PERCENT / 100) * 100) / 100
}

function validateSelectedColors(
  product: Product,
  item: NonNullable<CheckoutPayload['items']>[number],
  variant: NonNullable<Product['variants']>[number] | undefined,
  globalColors: GlobalColor[],
): string | null {
  if (!variant) return null

  const colorMode = variant.colorMode
  const allowedGlobalColorIds = variant.allowedGlobalColorIds ?? []

  // Validate single color mode
  if (colorMode === 'customer_choice') {
    const selectedColor = item.selectedColor ?? item.selectedColors?.[0]
    if (selectedColor?.globalColorId && allowedGlobalColorIds.length > 0) {
      if (!allowedGlobalColorIds.includes(selectedColor.globalColorId)) {
        return `Selected color is not allowed for this variant of ${product.name}`
      }
    }
    if (!item.selectedColor && !item.selectedColors?.length) {
      return `Color selection is required for ${product.name}`
    }
    if (item.selectedColors && item.selectedColors.length > 1) {
      return `Only one color allowed for this variant of ${product.name}`
    }
  }

  // Validate multi-part mode
  if (colorMode === 'multi_part' && variant.parts?.length) {
    const selectedParts = item.selectedParts ?? []
    if (selectedParts.length !== variant.parts.length) {
      return `Invalid part selection for ${product.name}`
    }

    for (let i = 0; i < variant.parts.length; i++) {
      const partDef = variant.parts[i]
      const selectedPart = selectedParts[i]

      if (!selectedPart) {
        return `Missing color selection for ${partDef.label} in ${product.name}`
      }

      // Check fixed color constraint
      if (partDef.fixedGlobalColorId && selectedPart.globalColorId !== partDef.fixedGlobalColorId) {
        return `Invalid color for ${partDef.label} in ${product.name}`
      }

      // Check allowed colors constraint
      if (partDef.allowedGlobalColorIds?.length && selectedPart.globalColorId) {
        if (!partDef.allowedGlobalColorIds.includes(selectedPart.globalColorId)) {
          return `Selected color not allowed for ${partDef.label} in ${product.name}`
        }
      }
    }
  }

  // Validate fixed mode - customer shouldn't be setting colors
  if (colorMode === 'fixed') {
    if (item.selectedColor || item.selectedColors?.length || item.selectedParts?.length) {
      return `Color selection not allowed for this variant of ${product.name} (colors are pre-set)`
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe não está configurado.' }, { status: 500 })
    }

    const body = await request.json() as CheckoutPayload
    const customerName = String(body.customer?.name ?? '').trim()
    const customerEmail = String(body.customer?.email ?? '').trim().toLowerCase()
    const customerPhone = String(body.customer?.phone ?? '').trim()
    const shippingMethod = body.shipping?.method
    const shippingAddress = String(body.shipping?.address ?? '').trim()
    const notes = String(body.notes ?? '').trim()

    if (customerName.length < 2) return NextResponse.json({ error: 'Indique o seu nome.' }, { status: 400 })
    if (!isEmail(customerEmail)) return NextResponse.json({ error: 'Indique um email válido.' }, { status: 400 })
    if (shippingMethod !== 'pickup_carcavelos' && shippingMethod !== 'mainland_portugal') {
      return NextResponse.json({ error: 'Método de envio inválido.' }, { status: 400 })
    }
    if (shippingMethod === 'mainland_portugal' && shippingAddress.length < 8) {
      return NextResponse.json({ error: 'Indique uma morada completa.' }, { status: 400 })
    }
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > MAX_ITEMS) {
      return NextResponse.json({ error: 'Carrinho inválido.' }, { status: 400 })
    }

    const orderItems = []
    const lineItems: Stripe.Checkout.SessionCreateParams['line_items'] = []
    const globalColorData = await dbAdmin.query({ globalColors: {} })
    const globalColors = (globalColorData.globalColors ?? []) as GlobalColor[]
    const menuProducts = body.menuSystem ? await getMenuProductColorRecords() : {}
    let menuQuote: MenuQuote | null = null
    const menuBaseUnitPrices: MenuBaseUnitPrices = {}

    try {
      menuQuote = validateMenuPayload(body, globalColors, menuProducts)
    } catch (menuError) {
      return NextResponse.json(
        { error: menuError instanceof Error ? menuError.message : 'Configuração do menu inválida.' },
        { status: 400 },
      )
    }

    for (const item of body.items) {
      const slug = String(item.productSlug ?? '').trim()
      const quantity = Number(item.quantity)
      const menuRole = menuQuote ? getMenuItemRole(slug) : undefined
      const maxQuantityForItem = menuRole ? MAX_MENU_QUANTITY : MAX_QUANTITY
      if (!slug || !Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantityForItem) {
        return NextResponse.json({ error: 'Um dos artigos é inválido.' }, { status: 400 })
      }

      const product = await getCatalogProductBySlugForBuild(slug)
      const isMenuComponent = Boolean(menuRole)
      if (!product || (product.visible === false && !isMenuComponent)) {
        return NextResponse.json({ error: `Produto indisponível: ${slug}.` }, { status: 404 })
      }

      const variant = getVariant(product, item.selectedVariant)
      if (item.selectedVariant?.id && !variant) {
        return NextResponse.json({ error: `Opção inválida para ${product.name}.` }, { status: 400 })
      }

      // Validate color selections against variant rules
      const colorValidationError = validateSelectedColors(product, item, variant, globalColors)
      if (colorValidationError) {
        return NextResponse.json({ error: colorValidationError }, { status: 400 })
      }

      const baseUnitPrice = getUnitPrice(product, item, globalColors, variant)
      if (!Number.isFinite(baseUnitPrice) || baseUnitPrice < 0) {
        return NextResponse.json({ error: `Preço inválido para ${product.name}.` }, { status: 400 })
      }
      if (menuRole) {
        menuBaseUnitPrices[menuRole] = baseUnitPrice
      }

      const unitPrice = menuRole ? discountedMenuUnitPrice(baseUnitPrice) : baseUnitPrice

      const colors = getItemColors(product, item, variant)
      const selectedColorPayload = getSelectedColorPayload(product, item, globalColors, variant)
      const customText = formatCustomText(item.customizations)
      const menuDetails = getMenuItemDetails(menuRole, menuQuote, body.menuSystem)
      const itemCustomText = getMenuCustomText(menuRole, menuQuote, customText)
      const productDisplayName = menuRole === 'rails' ? 'Módulo Menu 25cm' : product.name

      orderItems.push({
        productId: product.id,
        productName: productDisplayName,
        quantity,
        colors,
        selectedColor: selectedColorPayload.selectedColor,
        selectedColors: selectedColorPayload.selectedColors,
        selectedParts: selectedColorPayload.selectedParts,
        selectedVariant: variant
          ? {
              id: variant.id,
              name: variant.name,
              kind: variant.kind,
              colorMode: variant.colorMode,
              allowedGlobalColorIds: variant.allowedGlobalColorIds,
              colors: variant.colors.map(color => ({
                name: color.name,
                hex: color.hex,
                imageUrl: color.imageUrl,
                globalColorId: color.globalColorId,
                priceAdd: color.priceAdd,
              })),
            }
          : undefined,
        menuSystem: menuDetails,
        customText: itemCustomText,
        unitPrice,
        itemStatus: 'new' as const,
        adminNotes: menuDetails ? JSON.stringify(menuDetails) : '',
        scheduledFor: '',
        quantityDone: 0,
      })

      lineItems.push({
        quantity,
        price_data: {
          currency: 'eur',
          unit_amount: cents(unitPrice),
          product_data: {
            name: productDisplayName,
            description: [
              variant?.name,
              colors.length ? colors.join(', ') : null,
              itemCustomText || null,
              menuRole ? `Campanha de lançamento -${LAUNCH_DISCOUNT_PERCENT}% aplicada` : null,
            ].filter(Boolean).join(' · ').slice(0, 1000),
          },
        },
      })
    }

    if (menuQuote) {
      menuQuote = calculateMenuQuote({
        menuText: menuQuote.menuText,
        extraLettersText: menuQuote.extraLettersText,
        customIconRequest: menuQuote.customIconRequest,
        globalModuleCount: menuQuote.globalModuleCount,
        standardPackQuantity: menuQuote.standardPackQuantity,
        avulsoCharacterQuantity: menuQuote.avulsoCharacterQuantity,
        railModuleUnitPrice: menuBaseUnitPrices.rails ?? 0,
        standardPackUnitPrice: menuBaseUnitPrices.standard_pack ?? 0,
        avulsoUnitPrice: menuBaseUnitPrices.avulso ?? 0,
      })

      for (const orderItem of orderItems) {
        const role = orderItem.menuSystem?.role as MenuItemRole | undefined
        if (!role) continue
        const menuDetails = getMenuItemDetails(role, menuQuote, body.menuSystem)
        orderItem.menuSystem = menuDetails
        orderItem.adminNotes = menuDetails ? JSON.stringify(menuDetails) : ''
      }
    }

    const subtotal = Math.round(orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 100) / 100
    const shippingCost = shippingMethod === 'mainland_portugal' ? SHIPPING_COST : 0
    const total = Math.round((subtotal + shippingCost) * 100) / 100

    if (shippingCost > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: cents(shippingCost),
          product_data: {
            name: 'Envio nacional',
            description: 'Entrega em Portugal continental',
          },
        },
      })
    }

    const orderId = id()
    const flow = menuQuote ? 'menu_modular' : 'standard_order'

    // Create Stripe session first to ensure it succeeds before saving order
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customerEmail,
      client_reference_id: orderId,
      success_url: `${siteUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}${menuQuote ? '/colecoes/menus' : '/checkout'}`,
      metadata: {
        orderId,
        flow,
        ...(menuQuote
          ? {
              railModuleQuantity: String(menuQuote.totalRailModules),
              globalModuleCount: String(menuQuote.globalModuleCount),
              standardPackQuantity: String(menuQuote.standardPackQuantity),
              avulsoCharacterQuantity: String(menuQuote.avulsoCharacterQuantity),
              launchDiscountPercent: String(menuQuote.launchDiscountPercent),
            }
          : {}),
      },
      line_items: lineItems,
    })

    if (!session.url) {
      throw new Error('Stripe não devolveu URL de checkout.')
    }

    // Now create the order atomically with Stripe session info
    const now = new Date()
    await dbAdmin.transact(
      dbAdmin.tx.orders[orderId].update({
        customerName,
        customerEmail,
        ...(customerPhone ? { customerPhone } : {}),
        paymentPreference: 'stripe',
        shippingMethod,
        ...(shippingMethod === 'mainland_portugal' ? { shippingAddress } : {}),
        items: orderItems,
        subtotal,
        shippingCost,
        total,
        paymentStatus: 'pending',
        fulfillmentStatus: 'new',
        ...(menuQuote || notes ? { notes: [getMenuOrderNotes(menuQuote, body.menuSystem), notes].filter(Boolean).join('\n\n') } : {}),
        stripeSessionId: session.id,
        paymentUrl: session.url,
        createdAt: now,
        updatedAt: now,
      }),
    )

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (error) {
    console.error('Cart checkout failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível iniciar o pagamento.' },
      { status: 500 },
    )
  }
}
