import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { dbAdmin, id } from '@/lib/db-admin'
import { getCatalogProductBySlugForBuild } from '@/lib/catalog'
import type { CartItemPartColor, CartItemVariant } from '@/lib/cart-context'
import {
  MENU_PACK_SIZE,
  MENU_RAIL_LENGTH_CM,
  MENU_MAX_RAILS_PER_LINE,
  MENU_MIN_RAILS_PER_LINE,
  calculateMenuQuote,
  validateMenuQuoteLimits,
  type MenuQuote,
} from '@/lib/menu-calculator'
import type { GlobalColor, Product, ProductColor } from '@/lib/products'

export const runtime = 'nodejs'

const SHIPPING_COST = 4.99
const MAX_ITEMS = 30
const MAX_QUANTITY = 99
const MENU_RAIL_SLUG = 'menu-rail-25cm'
const MENU_PACK_SLUG = 'menu-letter-pack-standard'
const MENU_AVULSO_SLUG = 'menu-letter-custom'

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
    railLengthCm?: 25
    packSize?: 300
    lines?: {
      index?: number
      text?: string
      characterCount?: number
      railQuantity?: number
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

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null
  return new Stripe(secretKey)
}

function getMenuLineRailQuantities(menuSystem: NonNullable<CheckoutPayload['menuSystem']>) {
  const quantities: Record<number, number> = {}

  for (const line of menuSystem.lines ?? []) {
    const index = Number(line.index)
    const railQuantity = Number(line.railQuantity)

    if (!Number.isInteger(index) || index < 1) {
      throw new Error('Uma das linhas do menu é inválida.')
    }
    if (!Number.isInteger(railQuantity) || railQuantity < MENU_MIN_RAILS_PER_LINE || railQuantity > MENU_MAX_RAILS_PER_LINE) {
      throw new Error(`Cada linha deve ter entre ${MENU_MIN_RAILS_PER_LINE} e ${MENU_MAX_RAILS_PER_LINE} calhas.`)
    }

    quantities[index] = railQuantity
  }

  return quantities
}

function getMenuItemRole(slug: string): MenuItemRole | undefined {
  if (slug === MENU_RAIL_SLUG) return 'rails'
  if (slug === MENU_PACK_SLUG) return 'standard_pack'
  if (slug === MENU_AVULSO_SLUG) return 'avulso'
  return undefined
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

function validateMenuColor(globalColors: GlobalColor[], color: ProductColor | undefined, label: string) {
  if (!color?.name && !color?.globalColorId) {
    throw new Error(`Escolha a ${label}.`)
  }

  const match = globalColors.find(candidate => {
    const isActive = candidate.isActive !== false && candidate.spoolStatus !== 'archived'
    if (!isActive) return false
    if (color.globalColorId && (candidate.id === color.globalColorId || candidate.globalColorId === color.globalColorId)) return true
    return normalizeName(candidate.name) === normalizeName(color.name)
  })

  if (!match) {
    throw new Error(`A ${label} selecionada já não está disponível.`)
  }
}

function validateMenuPayload(body: CheckoutPayload, globalColors: GlobalColor[]): MenuQuote | null {
  if (!body.menuSystem) return null

  const items = body.items ?? []
  if (body.menuSystem.railLengthCm !== undefined && body.menuSystem.railLengthCm !== MENU_RAIL_LENGTH_CM) {
    throw new Error(`As calhas do Menu Modular usam ${MENU_RAIL_LENGTH_CM}cm.`)
  }
  if (body.menuSystem.packSize !== undefined && body.menuSystem.packSize !== MENU_PACK_SIZE) {
    throw new Error(`O pack standard tem ${MENU_PACK_SIZE} caracteres.`)
  }

  const quote = calculateMenuQuote({
    menuText: String(body.menuSystem.menuText ?? ''),
    extraLettersText: String(body.menuSystem.extraLettersText ?? ''),
    lineRailQuantities: getMenuLineRailQuantities(body.menuSystem),
  })
  const limitErrors = validateMenuQuoteLimits(quote)

  if (limitErrors.length) {
    throw new Error(limitErrors[0])
  }

  const expectedQuantities = [
    { slug: MENU_RAIL_SLUG, quantity: quote.totalRails, label: 'calhas' },
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

  validateMenuColor(globalColors, body.menuSystem.railColor, 'cor das calhas')
  validateMenuColor(globalColors, body.menuSystem.letterColor, 'cor das letras')

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
    railLengthCm: quote.railLengthCm,
    totalRailLengthCm: quote.totalRailLengthCm,
    packSize: quote.packSize,
    menuText: quote.menuText,
    extraLettersText: quote.extraLettersText || undefined,
    menuCharacters: quote.menuCharacters,
    extraCharacters: quote.extraCharacters,
    totalCharacters: quote.totalCharacters,
    totalRails: quote.totalRails,
    standardPackQuantity: quote.standardPackQuantity,
    avulsoCharacterQuantity: quote.avulsoCharacterQuantity,
    remainingCharacters: quote.remainingCharacters,
    characterFrequencyMap: quote.characterFrequencyMap,
    railColor: menuSystem?.railColor,
    letterColor: menuSystem?.letterColor,
  }

  if (role === 'rails') {
    return { ...base, lines: quote.lines }
  }

  return base
}

function getMenuCustomText(role: MenuItemRole | undefined, quote: MenuQuote | null, customText: string) {
  if (!role || !quote) return customText || undefined

  const menuText = role === 'rails'
    ? `${quote.totalRails} calhas de ${quote.railLengthCm}cm`
    : role === 'standard_pack'
      ? `${quote.standardPackQuantity} pack(s) de ${quote.packSize} caracteres`
      : `${quote.avulsoCharacterQuantity} letras avulso`

  return [customText, menuText].filter(Boolean).join(' | ')
}

function getMenuOrderNotes(quote: MenuQuote | null) {
  if (!quote) return ''
  return `Sistema Menu Modular: ${quote.totalRails} calhas de ${quote.railLengthCm}cm, ${quote.standardPackQuantity} pack standard, ${quote.avulsoCharacterQuantity} letras avulso, ${quote.totalCharacters} caracteres totais.`
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
    let menuQuote: MenuQuote | null = null

    try {
      menuQuote = validateMenuPayload(body, globalColors)
    } catch (menuError) {
      return NextResponse.json(
        { error: menuError instanceof Error ? menuError.message : 'Configuração do menu inválida.' },
        { status: 400 },
      )
    }

    for (const item of body.items) {
      const slug = String(item.productSlug ?? '').trim()
      const quantity = Number(item.quantity)
      if (!slug || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
        return NextResponse.json({ error: 'Um dos artigos é inválido.' }, { status: 400 })
      }

      const product = await getCatalogProductBySlugForBuild(slug)
      const isMenuComponent = Boolean(menuQuote && getMenuItemRole(slug))
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

      const unitPrice = getUnitPrice(product, item, globalColors, variant)
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return NextResponse.json({ error: `Preço inválido para ${product.name}.` }, { status: 400 })
      }

      const colors = getItemColors(product, item, variant)
      const selectedColorPayload = getSelectedColorPayload(product, item, globalColors, variant)
      const customText = formatCustomText(item.customizations)
      const menuRole = menuQuote ? getMenuItemRole(slug) : undefined
      const menuDetails = getMenuItemDetails(menuRole, menuQuote, body.menuSystem)
      const itemCustomText = getMenuCustomText(menuRole, menuQuote, customText)

      orderItems.push({
        productId: product.id,
        productName: product.name,
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
            name: product.name,
            description: [
              variant?.name,
              colors.length ? colors.join(', ') : null,
              itemCustomText || null,
            ].filter(Boolean).join(' · ').slice(0, 1000),
          },
        },
      })
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
              railQuantity: String(menuQuote.totalRails),
              standardPackQuantity: String(menuQuote.standardPackQuantity),
              avulsoCharacterQuantity: String(menuQuote.avulsoCharacterQuantity),
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
        ...(menuQuote || notes ? { notes: [getMenuOrderNotes(menuQuote), notes].filter(Boolean).join('\n\n') } : {}),
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
