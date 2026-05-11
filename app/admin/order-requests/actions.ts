'use server'

import { revalidatePath } from 'next/cache'
import { id } from '@instantdb/admin'
import { Resend } from 'resend'
import { dbAdmin } from '@/lib/db-admin'
import { getPuzzleApprovedEmail } from '@/lib/email-templates'
import {
  baseColorToGlobalColorName,
  colorSourceToGlobalColorName,
  type ProductionJobTemplate,
} from '@/lib/products'

type OrderRequestStatus = 'PENDING_REVIEW' | 'MODELING' | 'AWAITING_PAYMENT' | 'READY_FOR_PRODUCTION' | 'IN_PRODUCTION' | 'SHIPPED' | 'B2B_LEAD'

const validStatuses = new Set<OrderRequestStatus>([
  'PENDING_REVIEW',
  'MODELING',
  'AWAITING_PAYMENT',
  'READY_FOR_PRODUCTION',
  'IN_PRODUCTION',
  'SHIPPED',
  'B2B_LEAD',
])

function getSender() {
  return process.env.RESEND_FROM_EMAIL || 'foto3d.pt <onboarding@resend.dev>'
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export async function updateOrderRequestStatus(requestId: string, status: OrderRequestStatus) {
  if (!requestId) throw new Error('Pedido inválido.')
  if (!validStatuses.has(status)) throw new Error('Estado inválido.')

  await dbAdmin.transact(
    dbAdmin.tx.orderRequests[requestId].update({
      status,
      updatedAt: new Date(),
    }),
  )

  revalidatePath('/admin/order-requests')
  revalidatePath('/admin/encomendas')
  revalidatePath('/admin/production')
}

export async function approveOrderRequestPhoto(requestId: string) {
  if (!requestId) throw new Error('Pedido inválido.')

  await dbAdmin.transact(
    dbAdmin.tx.orderRequests[requestId].update({
      status: 'AWAITING_PAYMENT',
      isPaid: false,
      updatedAt: new Date(),
    }),
  )

  revalidatePath('/admin/order-requests')
  revalidatePath('/admin/encomendas')
  revalidatePath('/admin/production')
}

export async function sendPuzzlePaymentApproval(params: {
  requestId: string
  paymentUrl: string
  quotedPrice: number
}) {
  if (!params.requestId) throw new Error('Pedido inválido.')
  if (!isValidUrl(params.paymentUrl)) throw new Error('Link de pagamento inválido.')
  if (!Number.isFinite(params.quotedPrice) || params.quotedPrice <= 0 || params.quotedPrice > 1000) {
    throw new Error('Preço final inválido.')
  }

  const requestResult = await dbAdmin.query({
    orderRequests: {
      $: { where: { id: params.requestId } },
    },
  })

  const request = requestResult.orderRequests?.[0] as any
  if (!request) throw new Error('Pedido não encontrado.')
  if (request.canvasConfig?.type !== 'svg-puzzle') throw new Error('Esta ação só está disponível para puzzles SVG.')

  // State guard: prevent regression of paid/fulfilled orders
  if (request.isPaid === true) {
    throw new Error('Operação inválida para pedidos pagos/fulfillados.')
  }
  const laterStates = new Set(['AWAITING_PRODUCTION', 'READY_FOR_PRODUCTION', 'IN_PRODUCTION', 'SHIPPED', 'FULFILLED', 'PAID'])
  if (laterStates.has(request.status)) {
    throw new Error('Operação inválida para pedidos pagos/fulfillados.')
  }

  await dbAdmin.transact(
    dbAdmin.tx.orderRequests[params.requestId].update({
      paymentUrl: params.paymentUrl,
      quotedPrice: params.quotedPrice,
      selectedPrice: params.quotedPrice,
      status: 'AWAITING_PAYMENT',
      isPaid: false,
      updatedAt: new Date(),
    }),
  )

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: getSender(),
      to: request.customerEmail,
      subject: 'O seu puzzle Foto3D.pt está pronto para confirmação',
      text: getPuzzleApprovedEmail({
        name: request.customerName,
        paymentLink: params.paymentUrl,
        price: params.quotedPrice,
        previewUrl: request.previewUrl || request.svgUrl || request.imageUrl,
      }),
    })

    if (error) {
      console.error('Puzzle approval email failed:', error)
      throw new Error('Pedido atualizado, mas o email não foi enviado.')
    }
  } else {
    const urlHost = (() => {
      try {
        return new URL(params.paymentUrl).host
      } catch {
        return 'invalid-url'
      }
    })()
    console.info('Puzzle approval email skipped because RESEND_API_KEY is missing.', {
      requestId: params.requestId,
      paymentUrlHost: urlHost,
    })
  }

  revalidatePath('/admin/order-requests')
  revalidatePath('/admin/encomendas')
  revalidatePath('/admin/production')
}

export async function updateOrderRequestPaymentReceived(requestId: string, isPaid: boolean) {
  if (!requestId) throw new Error('Pedido inválido.')

  const requestResult = await dbAdmin.query({
    orderRequests: {
      $: { where: { id: requestId } },
    },
  })

  const request = requestResult.orderRequests?.[0] as any
  if (!request) throw new Error('Pedido não encontrado.')
  if (request.status !== 'AWAITING_PAYMENT') {
    throw new Error('O pagamento só pode ser confirmado quando o pedido aguarda pagamento.')
  }

  await dbAdmin.transact(
    dbAdmin.tx.orderRequests[requestId].update({
      isPaid,
      updatedAt: new Date(),
    }),
  )

  revalidatePath('/admin/order-requests')
  revalidatePath('/admin/encomendas')
  revalidatePath('/admin/production')
}

function getColorFromSource(
  colorSource: ProductionJobTemplate['colorSource'],
  baseColor: string | undefined,
  globalColors: { id: string; name: string; hex: string }[]
): { colorId: string; colorName: string; colorHex: string } {
  // Determine target color name based on colorSource
  let targetColorName: string

  if (colorSource === 'baseColor') {
    // Map baseColor value to global color name
    const mappedName = baseColor ? baseColorToGlobalColorName[baseColor] : undefined
    targetColorName = mappedName || 'Branco'
  } else {
    // For 'none' or 'lithophane', use Branco (white)
    targetColorName = colorSourceToGlobalColorName[colorSource] || 'Branco'
  }

  // Look up in globalColors
  const globalColor = globalColors.find(c => c.name === targetColorName)

  if (globalColor) {
    return {
      colorId: globalColor.id,
      colorName: globalColor.name,
      colorHex: globalColor.hex,
    }
  }

  // Fallback values with warning
  console.warn(`[approveOrderRequestForProduction] Global color not found: ${targetColorName}. Using fallback.`)

  const fallbackHex: Record<string, string> = {
    'Preto': '#000000',
    'Madeira': '#8B4513',
    'Branco': '#ffffff',
  }

  return {
    colorId: 'fallback',
    colorName: targetColorName,
    colorHex: fallbackHex[targetColorName] || '#ffffff',
  }
}

export async function approveOrderRequestForProduction(requestId: string) {
  if (!requestId) throw new Error('Pedido inválido.')

  const [requestResult, existingJobsResult] = await Promise.all([
    dbAdmin.query({
      orderRequests: {
        $: { where: { id: requestId } },
      },
    }),
    dbAdmin.query({
      productionJobs: {
        $: { where: { orderRequestId: requestId } },
      },
    }),
  ])

  const request = requestResult.orderRequests?.[0] as any
  if (!request) throw new Error('Pedido não encontrado.')
  const isHexa = request.canvasConfig?.type === 'hexa-memoria'
  if (isHexa && request.status !== 'READY_FOR_PRODUCTION') {
    throw new Error('A encomenda HexaMemória tem de estar paga antes de criar a produção.')
  }
  if (!isHexa && request.status !== 'AWAITING_PAYMENT') {
    throw new Error('A fotografia deve ser aprovada e o pagamento confirmado antes de criar a produção.')
  }
  if (request.isPaid !== true) {
    throw new Error('Confirme o pagamento antes de aprovar para produção.')
  }

  const existingJobs = existingJobsResult.productionJobs ?? []
  if (existingJobs.length > 0) {
    await updateOrderRequestStatus(requestId, 'IN_PRODUCTION')
    return { created: false, jobIds: existingJobs.map((j: any) => j.id) }
  }

  // Fetch catalog product and global colors
  const [catalogResult, colorsResult] = await Promise.all([
    dbAdmin.query({
      catalogProducts: {
        $: { where: { slug: request.productSlug || '' } },
      },
    }),
    dbAdmin.query({ globalColors: {} }),
  ])

  const catalogProduct = (catalogResult.catalogProducts?.[0] as any) || null
  const globalColors = (colorsResult.globalColors || []) as { id: string; name: string; hex: string }[]
  const now = new Date()
  const jobIds: string[] = []
  const transactions: any[] = []

  if (isHexa) {
    const hexaRequest = request.canvasConfig?.request ?? request.canvasConfig?.hexaRequest
    const tiles = (Array.isArray(hexaRequest?.tiles) ? hexaRequest.tiles : []) as any[]

    // Fail fast: prevent mutation if no tiles
    if (tiles.length === 0) {
      throw new Error('Cannot create production jobs: no tiles found in hexaRequest.')
    }

    const size = hexaRequest?.mosaicSize || '-'
    const materialGrams = Number(catalogProduct?.materialGrams) || (size === 'XS' ? 42 : size === 'M' ? 112 : 72)
    const groups = tiles.reduce<Record<string, number>>((acc, tile: any) => {
      const color = typeof tile.color === 'string' ? tile.color : 'Preto'
      acc[color] = (acc[color] ?? 0) + 1
      return acc
    }, {})

    transactions.push(
      dbAdmin.tx.orderRequests[requestId].update({
        status: 'IN_PRODUCTION',
        updatedAt: now,
      }),
    )

    Object.entries(groups).forEach(([colorName, quantity], index) => {
      const jobId = id()
      jobIds.push(jobId)
      const globalColor = globalColors.find((color) => color.name === colorName)
      const colorHex = globalColor?.hex || (colorName === 'Branco' ? '#ffffff' : colorName === 'Madeira' ? '#b88452' : '#1f1f1d')
      const colorId = globalColor?.id || 'fallback'
      const jobTx = dbAdmin.tx.productionJobs[jobId].update({
        orderId: `request-${requestId}`,
        orderRequestId: requestId,
        orderItemIndex: index,
        productSlug: request.productSlug,
        productName: request.productName || catalogProduct?.name || `HexaMemória ${size}`,
        source: 'order_request',
        partLabel: `Moldura HexaMemória ${size}`,
        colorName,
        colorHex,
        materialGrams,
        materialType: 'PLA',
        quantity,
        status: 'queued',
        isMultiColor: false,
        colorRequirements: [{
          colorId,
          colorName,
          colorHex,
          grams: materialGrams * quantity,
          materialType: 'PLA',
        }],
        requiredColorIds: colorId,
        totalGrams: materialGrams * quantity,
        outsourced: false,
        notes: [
          request.notes,
          `Produção HexaMemória: ${quantity}x tamanho ${size} em ${colorName}`,
          `Total Parts to Print: ${tiles.length}x Size ${size}`,
          request.canvasConfig ? `CanvasConfig: ${JSON.stringify(request.canvasConfig)}` : null,
        ].filter(Boolean).join('\n\n'),
        createdAt: now,
        updatedAt: now,
      })

      if (globalColor?.id) {
        jobTx.link({ globalColor: globalColor.id })
      }
      transactions.push(jobTx)
    })

    await dbAdmin.transact(transactions)
    revalidatePath('/admin/order-requests')
    revalidatePath('/admin/encomendas')
    revalidatePath('/admin/production')
    return { created: true, jobIds }
  }

  // Get production job templates from product
  const templates: ProductionJobTemplate[] = catalogProduct?.productionJobTemplates || []

  // Default template if none defined
  const effectiveTemplates: ProductionJobTemplate[] =
    templates.length > 0
      ? templates
      : [{ partLabel: 'Parte principal', colorSource: 'baseColor', materialGrams: 100, materialType: 'PLA' }]

  // Update order request status
  transactions.push(
    dbAdmin.tx.orderRequests[requestId].update({
      status: 'IN_PRODUCTION',
      updatedAt: now,
    })
  )

  // Build notes from order request data
  const notesParts = [
    request.notes,
    request.imageUrl ? `Foto: ${request.imageUrl}` : null,
    request.selectedPrice ? `Preço: ${request.selectedPrice}€` : null,
    request.engravingText ? `Gravação: ${request.engravingText}` : null,
    request.lightMode ? `Luz: ${request.lightMode}` : null,
    request.canvasConfig ? `CanvasConfig: ${JSON.stringify(request.canvasConfig)}` : null,
  ].filter(Boolean)

  // Create a job for each template
  effectiveTemplates.forEach((template, index) => {
    const jobId = id()
    jobIds.push(jobId)

    const colorInfo = getColorFromSource(template.colorSource, request.baseColor, globalColors)
    const materialType = template.materialType || 'PLA'

    const colorRequirements = [{
      colorId: colorInfo.colorId,
      colorName: colorInfo.colorName,
      colorHex: colorInfo.colorHex,
      grams: template.materialGrams,
      materialType,
    }]

    const jobNotes = [
      ...notesParts,
      template.requiresLithophaneProcessing ? '⚠️ Requer processamento litofânico (ItsLitho)' : null,
    ].filter(Boolean).join('\n\n')

    const jobTx = dbAdmin.tx.productionJobs[jobId].update({
      orderId: `request-${requestId}`, // Required field - using prefixed request ID
      orderRequestId: requestId,
      orderItemIndex: index,
      productSlug: request.productSlug,
      selectedVariantId: request.variantId,
      selectedVariantName: request.variantName,
      productName: request.productName || catalogProduct?.name || 'Foto3D.pt',
      imageUrl: request.imageUrl,
      source: 'order_request',
      partLabel: template.partLabel,
      colorName: colorInfo.colorName,
      colorHex: colorInfo.colorHex,
      materialGrams: template.materialGrams,
      materialType,
      quantity: 1,
      status: 'queued',
      isMultiColor: false,
      colorRequirements,
      requiredColorIds: colorInfo.colorId,
      totalGrams: template.materialGrams,
      outsourced: false,
      customText: request.engravingText || '',
      notes: jobNotes,
      createdAt: now,
      updatedAt: now,
    })

    // Link to global color if it's a real color ID
    if (colorInfo.colorId && colorInfo.colorId !== 'fallback') {
      jobTx.link({ globalColor: colorInfo.colorId })
    }

    transactions.push(jobTx)
  })

  await dbAdmin.transact(transactions)

  revalidatePath('/admin/order-requests')
  revalidatePath('/admin/encomendas')
  revalidatePath('/admin/production')

  return { created: true, jobIds }
}
