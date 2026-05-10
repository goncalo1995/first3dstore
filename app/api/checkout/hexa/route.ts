import { NextRequest, NextResponse } from 'next/server'
import { id } from '@instantdb/admin'
import Stripe from 'stripe'
import { dbAdmin } from '@/lib/db-admin'
import { HEXA_SIZES, type HexaSize, type HexaSpaceType } from '@/types/hexa'

export const runtime = 'nodejs'

const spaceTypes = new Set<HexaSpaceType>(['Casa', 'Escritório', 'Loja', 'Restaurante'])
const sizeToSlug: Record<HexaSize, string> = {
  XS: 'hexa-xs',
  S: 'hexa-s',
  M: 'hexa-m',
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

function isNumberInRange(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function getProductColors(product: any) {
  return new Set(
    (product?.variants ?? [])
      .flatMap((variant: any) => variant.colors ?? [])
      .map((color: any) => color.name)
      .filter(Boolean),
  )
}

function validatePayload(body: any) {
  if (!body || typeof body !== 'object') return 'Pedido inválido.'
  if (!body.customer || typeof body.customer !== 'object') return 'Dados de cliente inválidos.'
  if (typeof body.customer.name !== 'string' || body.customer.name.trim().length < 2) return 'Indique o seu nome.'
  if (typeof body.customer.email !== 'string' || !isEmail(body.customer.email.trim())) return 'Indique um email válido.'
  if (typeof body.customer.phone !== 'string' || (body.customer.phone.length && body.customer.phone.trim().length < 9)) return 'Indique um telemóvel válido.'
  if (!spaceTypes.has(body.customer.spaceType)) return 'Escolha o tipo de espaço.'
  if (!['XS', 'S', 'M'].includes(body.mosaicSize)) return 'Escolha um tamanho válido.'
  if (body.productSlug !== sizeToSlug[body.mosaicSize as HexaSize]) return 'O produto escolhido não corresponde ao tamanho.'
  if (!Array.isArray(body.tiles) || body.tiles.length < 1 || body.tiles.length > 30) return 'O mosaico deve ter entre 1 e 30 peças.'
  if (!body.layout || body.layout.type !== 'honeycomb' || body.layout.gapMm !== 0) return 'Layout inválido.'

  for (const tile of body.tiles) {
    if (!tile || typeof tile !== 'object') return 'Peça inválida.'
    if (typeof tile.id !== 'string' || tile.id.length < 1) return 'Peça inválida.'
    if (typeof tile.color !== 'string') return 'Cor inválida.'
    const adjustments = tile.photoAdjustments
    if (
      !adjustments ||
      !isNumberInRange(adjustments.zoom, 0.5, 2) ||
      !isNumberInRange(adjustments.offsetX, -0.2, 0.2) ||
      !isNumberInRange(adjustments.offsetY, -0.2, 0.2)
    ) {
      return 'Ajustes de fotografia inválidos.'
    }
  }

  return ''
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe não está configurado.' }, { status: 500 })
    }

    const body = await req.json()
    const payloadError = validatePayload(body)
    if (payloadError) return NextResponse.json({ error: payloadError }, { status: 400 })

    const productResult = await dbAdmin.query({
      catalogProducts: {
        $: { where: { slug: body.productSlug } },
      },
    })
    const product = productResult.catalogProducts?.[0] as any
    if (!product) return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })

    const allowedColors = getProductColors(product)
    if (!allowedColors.size) return NextResponse.json({ error: 'Produto sem cores configuradas.' }, { status: 400 })
    const invalidColor = body.tiles.find((tile: any) => !allowedColors.has(tile.color))
    if (invalidColor) return NextResponse.json({ error: 'Uma das cores escolhidas não está disponível.' }, { status: 400 })

    const unitPrice = Number(product.priceFrom)
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return NextResponse.json({ error: 'Preço do produto inválido.' }, { status: 400 })
    }

    const tileCount = body.tiles.length
    const subtotal = unitPrice * tileCount
    const discountApplied = tileCount >= 10 ? '10%' : null
    const totalPrice = Math.round((subtotal - (discountApplied ? subtotal * 0.1 : 0)) * 100) / 100
    const now = new Date()
    const requestId = id()
    const storedRequest = {
      customer: {
        name: body.customer.name.trim(),
        email: body.customer.email.trim().toLowerCase(),
        phone: body.customer.phone.trim(),
        spaceType: body.customer.spaceType,
      },
      mosaicSize: body.mosaicSize as HexaSize,
      productSlug: body.productSlug,
      tiles: body.tiles.map((tile: any) => ({
        id: tile.id,
        color: tile.color,
        photoAdjustments: tile.photoAdjustments,
      })),
      totalPrice,
      discountApplied,
      layout: body.layout,
    }

    await dbAdmin.transact(
      dbAdmin.tx.orderRequests[requestId].update({
        customerName: storedRequest.customer.name,
        customerEmail: storedRequest.customer.email,
        customerPhone: storedRequest.customer.phone,
        productType: 'hexa-memoria',
        productSlug: body.productSlug,
        productName: product.name || 'HexaMemória',
        selectedPrice: totalPrice,
        estimatedPrice: totalPrice,
        canvasConfig: {
          version: 1,
          type: 'hexa-memoria',
          submittedAt: now.toISOString(),
          request: storedRequest,
        },
        isPaid: false,
        notes: [
          'Fluxo: HexaMemória Checkout',
          `Tamanho: ${body.mosaicSize}`,
          `Peças: ${tileCount}`,
          `Desconto: ${discountApplied ?? 'sem desconto'}`,
          `Total: ${totalPrice}€`,
        ].join('\n'),
        status: 'AWAITING_PAYMENT',
        createdAt: now,
        updatedAt: now,
      }),
    )

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: storedRequest.customer.email,
      success_url: `${siteUrl()}/encomenda/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/encomenda/cancelado`,
      metadata: {
        orderRequestId: requestId,
        productType: 'hexa-memoria',
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: Math.round(totalPrice * 100),
            product_data: {
              name: `HexaMemória ${body.mosaicSize}`,
              description: `${tileCount} peça(s) · ${discountApplied ? `desconto ${discountApplied}` : 'sem desconto'}`,
            },
          },
        },
      ],
    })

    if (!session.url) {
      throw new Error('Stripe não devolveu URL de checkout.')
    }

    await dbAdmin.transact(
      dbAdmin.tx.orderRequests[requestId].update({
        paymentUrl: session.url,
        updatedAt: new Date(),
      }),
    )

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (error) {
    console.error('Hexa checkout failed:', error)
    return NextResponse.json({ error: 'Não foi possível iniciar o pagamento.' }, { status: 500 })
  }
}
