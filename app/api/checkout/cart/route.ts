import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { dbAdmin, id } from '@/lib/db-admin'
import { getCatalogProductBySlugForBuild } from '@/lib/catalog'
import type { CartItemPartColor, CartItemVariant } from '@/lib/cart-context'
import type { GlobalColor, Product, ProductColor } from '@/lib/products'

export const runtime = 'nodejs'

const SHIPPING_COST = 4.99
const MAX_ITEMS = 30
const MAX_QUANTITY = 99

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

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null
  return new Stripe(secretKey)
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
  const premiumColorPriceAdd = variantColorMode === 'customer_choice'
    ? getGlobalColorPriceAdd(globalColors, item.selectedColor ?? item.selectedColors?.[0])
    : variantColorMode === 'multi_part'
      ? (item.selectedParts ?? []).reduce((sum, part) => sum + getGlobalColorPriceAdd(globalColors, part), 0)
      : 0

  return basePrice + variantPriceAdd + multiColorPriceAdd + customizationPriceAdd + premiumColorPriceAdd
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

    for (const item of body.items) {
      const slug = String(item.productSlug ?? '').trim()
      const quantity = Number(item.quantity)
      if (!slug || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
        return NextResponse.json({ error: 'Um dos artigos é inválido.' }, { status: 400 })
      }

      const product = await getCatalogProductBySlugForBuild(slug)
      if (!product || product.visible === false) {
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
        customText: customText || undefined,
        unitPrice,
        itemStatus: 'new' as const,
        adminNotes: '',
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
              customText || null,
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

    // Create Stripe session first to ensure it succeeds before saving order
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customerEmail,
      client_reference_id: orderId,
      success_url: `${siteUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/checkout`,
      metadata: {
        orderId,
        flow: 'standard_order',
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
        ...(notes ? { notes } : {}),
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
