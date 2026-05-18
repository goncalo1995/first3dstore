import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { dbAdmin, id } from '@/lib/db-admin'
import { HexaOrderConfirmationEmail } from '@/components/email-template'
import { getHexaOrderAdminNotificationEmail } from '@/lib/email-templates'

export const runtime = 'nodejs'

const resend = new Resend(process.env.RESEND_API_KEY)

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function getSender() {
  return process.env.RESEND_FROM_EMAIL || 'EM3D <onboarding@resend.dev>'
}

function getAdminEmail() {
  const configured = process.env.ADMIN_EMAILS || ''
  const emails = configured.split(',').map(email => email.trim()).filter(Boolean)
  return emails[0] || null
}

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null
  return new Stripe(secretKey)
}

function getStripeObjectId(value: string | { id?: string } | null | undefined) {
  if (!value) return undefined
  return typeof value === 'string' ? value : value.id
}

async function getOrderById(orderId: string) {
  const orderData = await dbAdmin.query({
    orders: {
      $: { where: { id: orderId } },
    },
  })

  return (orderData.orders?.[0] as any) || null
}

async function resolveStandardOrderFromSession(session: Stripe.Checkout.Session) {
  const candidateIds = [
    session.metadata?.orderId,
    session.client_reference_id,
  ].filter((value): value is string => Boolean(value))

  for (const candidateId of candidateIds) {
    const order = await getOrderById(candidateId)
    if (order) {
      return { orderId: candidateId, order, source: candidateId === session.metadata?.orderId ? 'metadata' : 'client_reference_id' }
    }
  }

  if (session.id) {
    const orderData = await dbAdmin.query({
      orders: {
        $: { where: { stripeSessionId: session.id } },
      },
    })
    const order = (orderData.orders?.[0] as any) || null
    if (order) {
      return { orderId: order.id as string, order, source: 'stripeSessionId' }
    }
  }

  return { orderId: undefined, order: null, source: undefined }
}

async function sendHexaOrderEmails(orderRequest: any, orderRequestId: string) {
  try {
    const request = orderRequest.canvasConfig?.request
    if (!request) return

    const customer = request.customer
    const tiles = request.tiles || []
    const colors = [...new Set(tiles.map((t: any) => t.color))] as string[]

    // Send confirmation email to customer
    await resend.emails.send({
      from: getSender(),
      to: customer.email,
      subject: 'Encomenda confirmada - HexaMemória Foto3D.pt',
      react: HexaOrderConfirmationEmail({
        name: customer.name,
        tileCount: tiles.length,
        mosaicSize: request.mosaicSize,
        colors,
        total: orderRequest.selectedPrice || request.totalPrice,
        discountApplied: request.discountApplied || null,
        siteUrl: siteUrl(),
      }),
    })

    // Send notification to admin
    const adminEmail = getAdminEmail()
    if (adminEmail) {
      await resend.emails.send({
        from: getSender(),
        to: adminEmail,
        subject: `Nova venda HexaMemória - ${customer.name}`,
        text: getHexaOrderAdminNotificationEmail({
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone || '',
          customerSpaceType: customer.spaceType || '',
          tileCount: tiles.length,
          mosaicSize: request.mosaicSize,
          colors,
          total: orderRequest.selectedPrice || request.totalPrice,
          discountApplied: request.discountApplied || null,
          orderRequestId,
        }),
      })
    }
  } catch (error) {
    // Log error but don't fail the webhook
    console.error('Failed to send hexa order emails:', error)
  }
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function getShippingLabel(method: string) {
  return method === 'mainland_portugal' ? 'Envio nacional' : 'Levantamento em Carcavelos'
}

function getMenuOrderSummary(order: any) {
  const menuItems = (order.items ?? []).filter((item: any) => item.menuSystem)
  const menuItem = menuItems.find((item: any) => (item.menuSystem?.lines ?? []).length > 0) ?? menuItems[0]
  const menuSystem = menuItem?.menuSystem
  if (!menuSystem) return ''

  const lineBreakdown = (menuSystem.lines ?? [])
    .map((line: any) => `- Linha ${line.index}: ${line.characterCount} caracteres${line.widthWarning ? ' | aviso: pode ficar apertada' : ''} | ${line.text}`)
    .join('\n')
  const frequencySummary = Object.entries(menuSystem.characterFrequencyMap ?? {})
    .sort(([a], [b]) => a.localeCompare(b, 'pt-PT'))
    .map(([character, count]) => `${character === ' ' ? 'Espaço' : character}: ${count}`)
    .join(', ')

  return `\n\nDetalhes Menu Modular:
Linhas: ${menuSystem.lineCount ?? '-'}
Módulos por linha: ${menuSystem.globalModuleCount ?? '-'} (${menuSystem.globalWidthCm ?? '-'}cm)
Módulos totais: ${menuSystem.totalRailModules ?? '-'}
Starter/base: ${menuSystem.starterQuantity ?? '-'}
Extensões por linha: ${menuSystem.extensionQuantityPerLine ?? '-'}
Extensões totais: ${menuSystem.totalExtensionQuantity ?? '-'}
Fonte produção: ${menuSystem.productionFont || 'em3d-standard'}
Tamanho produção: ${menuSystem.productionSize || 'standard'}
Cor das calhas: ${menuSystem.railColor?.name || '-'}
Cor das letras: ${menuSystem.letterColor?.name || '-'}
Pedido de cor especial para letras: ${menuSystem.letterColorRequest?.enabled ? menuSystem.letterColorRequest.description || '-' : '-'}
Pack standard: ${menuSystem.standardPackQuantity ?? 0}
Letras avulso: ${menuSystem.avulsoCharacterQuantity ?? 0}
Caracteres do menu: ${menuSystem.menuCharacters ?? 0}
Caracteres extra: ${menuSystem.extraCharacters ?? 0}
Total de caracteres: ${menuSystem.totalCharacters ?? 0}
Subtotal antes desconto: ${formatPrice(Number(menuSystem.subtotalBeforeDiscount ?? 0))}
Desconto lançamento: -${menuSystem.launchDiscountPercent ?? 20}% (${formatPrice(Number(menuSystem.launchDiscountAmount ?? 0))})
Total Menu3D após desconto: ${formatPrice(Number(menuSystem.totalAfterDiscount ?? 0))}
Mapa de caracteres: ${frequencySummary || '-'}

Menu original:
${menuSystem.menuText || '-'}

Letras/simbolos extra:
${menuSystem.extraLettersText || '-'}

Pedido de ícone/logótipo:
${menuSystem.customIconRequest || '-'}

Linhas:
${lineBreakdown || '-'}`
}

async function sendStandardOrderEmails(order: any, orderId: string) {
  try {
    const menuSummary = getMenuOrderSummary(order)
    const itemLines = (order.items ?? [])
      .map((item: any) => {
        const details = [
          item.selectedVariant?.name ? `Opção: ${item.selectedVariant.name}` : null,
          item.colors?.length ? `Cores: ${item.colors.join(', ')}` : null,
          item.customText ? `Personalização: ${item.customText}` : null,
        ].filter(Boolean).join(' | ')

        return `- ${item.productName} x${item.quantity} — ${formatPrice(Number(item.unitPrice) * Number(item.quantity))}
${details ? `  ${details}` : ''}`
      })
      .join('\n')

    await resend.emails.send({
      from: getSender(),
      to: order.customerEmail,
      subject: 'Encomenda confirmada - EM3D',
      text: `Olá ${order.customerName},

Recebemos o pagamento da sua encomenda EM3D.

ID da encomenda: ${orderId}

Artigos:
${itemLines}

Subtotal: ${formatPrice(order.subtotal)}
Entrega: ${formatPrice(order.shippingCost)} (${getShippingLabel(order.shippingMethod)})
Total: ${formatPrice(order.total)}
${menuSummary}

Vamos preparar a encomenda e enviaremos novidades por email.

A equipa EM3D`,
    })

    const adminEmail = getAdminEmail()
    if (adminEmail) {
      await resend.emails.send({
        from: getSender(),
        to: adminEmail,
        subject: `Nova encomenda EM3D - ${order.customerName}`,
        text: `Nova encomenda paga.

ID: ${orderId}
Cliente: ${order.customerName}
Email: ${order.customerEmail}
Telefone: ${order.customerPhone || '-'}
Entrega: ${getShippingLabel(order.shippingMethod)}
Total: ${formatPrice(order.total)}

Artigos:
${itemLines}${menuSummary}`,
      })
    }
  } catch (error) {
    console.error('Failed to send standard order emails:', error)
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripe = getStripe()

  if (!signature || !webhookSecret || !stripe) {
    return NextResponse.json({ error: 'Webhook Stripe não configurado.' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    const payload = await req.text()
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    console.error('Stripe webhook signature failed:', error)
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 400 })
  }

  try {
    const now = new Date()
    const transactions: any[] = []
    let orderRequestId: string | undefined
    let orderId: string | undefined
    let stripeSessionId: string | undefined
    let stripePaymentIntentId: string | undefined
    let productType: string | undefined
    let shouldSendHexaEmails = false
    let shouldSendStandardOrderEmails = false

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      stripeSessionId = session.id
      stripePaymentIntentId = getStripeObjectId(session.payment_intent)
      orderRequestId = session.metadata?.orderRequestId || undefined
      productType = session.metadata?.productType

      if (orderRequestId) {
        transactions.push(
          dbAdmin.tx.orderRequests[orderRequestId].update({
            status: 'READY_FOR_PRODUCTION',
            isPaid: true,
            paymentUrl: session.url || undefined,
            updatedAt: now,
          }),
        )

        // Mark for email sending after transaction
        if (productType === 'hexa-memoria') {
          shouldSendHexaEmails = true
        }
      }

      const resolvedOrder = await resolveStandardOrderFromSession(session)
      orderId = resolvedOrder.orderId

      if (orderId) {
        transactions.push(
          dbAdmin.tx.orders[orderId].update({
            paymentStatus: 'paid',
            paidAt: now,
            stripeSessionId,
            ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
            updatedAt: now,
          }),
        )
        shouldSendStandardOrderEmails = resolvedOrder.order?.paymentStatus !== 'paid'
      }

      if (!orderRequestId && !orderId) {
        console.warn('Stripe checkout.session.completed did not resolve to an order or order request.', {
          eventId: event.id,
          sessionId: session.id,
          clientReferenceId: session.client_reference_id,
          metadata: session.metadata,
        })
      } else {
        console.info('Stripe checkout.session.completed resolved.', {
          eventId: event.id,
          sessionId: session.id,
          orderId,
          orderRequestId,
          resolutionSource: resolvedOrder.source,
        })
      }
    }

    // Atomic dedupe: attempt to insert the event record with a unique eventId
    // If this fails due to duplicate eventId constraint, we know it's a duplicate
    const webhookEventId = id()
    transactions.push(
      dbAdmin.tx.stripeWebhookEvents[webhookEventId].update({
        eventId: event.id,
        type: event.type,
        orderRequestId,
        orderId,
        stripeSessionId,
        processedAt: now,
      }),
    )

    try {
      await dbAdmin.transact(transactions)
    } catch (txError: any) {
      // Check if this is a duplicate constraint violation
      // If eventId already exists, treat as duplicate
      const isDuplicate = txError?.body?.type === 'record-not-unique'

      if (isDuplicate) {
        return NextResponse.json({ received: true, duplicate: true })
      }
      // Re-throw if it's a different error
      throw txError
    }

    // Send emails only after successful transaction
    if (shouldSendHexaEmails && orderRequestId) {
      const orderData = await dbAdmin.query({
        orderRequests: {
          $: { where: { id: orderRequestId } },
        },
      })
      const orderRequest = (orderData.orderRequests?.[0] as any) || null
      if (orderRequest) {
        await sendHexaOrderEmails(orderRequest, orderRequestId)
      }
    }

    if (shouldSendStandardOrderEmails && orderId) {
      const orderData = await dbAdmin.query({
        orders: {
          $: { where: { id: orderId } },
        },
      })
      const order = (orderData.orders?.[0] as any) || null
      if (order?.customerEmail) {
        await sendStandardOrderEmails(order, orderId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook failed:', error)
    return NextResponse.json({ error: 'Não foi possível processar o webhook.' }, { status: 500 })
  }
}
