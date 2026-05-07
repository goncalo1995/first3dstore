'use server'

import { revalidatePath } from 'next/cache'
import { id } from '@instantdb/admin'
import { dbAdmin } from '@/lib/db-admin'

type OrderRequestStatus = 'PENDING_REVIEW' | 'MODELING' | 'AWAITING_PAYMENT' | 'IN_PRODUCTION' | 'SHIPPED'

const validStatuses = new Set<OrderRequestStatus>([
  'PENDING_REVIEW',
  'MODELING',
  'AWAITING_PAYMENT',
  'IN_PRODUCTION',
  'SHIPPED',
])

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
  revalidatePath('/admin/production')
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
  if (request.status !== 'AWAITING_PAYMENT') {
    throw new Error('A fotografia deve ser aprovada e o pagamento confirmado antes de criar a produção.')
  }
  if (request.isPaid !== true) {
    throw new Error('Confirme o pagamento antes de aprovar para produção.')
  }

  const existingJobs = existingJobsResult.productionJobs ?? []
  if (existingJobs.length > 0) {
    await updateOrderRequestStatus(requestId, 'IN_PRODUCTION')
    return { created: false, jobId: existingJobs[0].id as string }
  }

  const now = new Date()
  const jobId = id()
  const lightLabel = request.lightMode === 'fria'
    ? 'Luz Fria'
    : request.lightMode === 'quente'
      ? 'Luz Quente'
      : 'Luz Desligada'

  await dbAdmin.transact([
    dbAdmin.tx.orderRequests[requestId].update({
      status: 'IN_PRODUCTION',
      updatedAt: now,
    }),
    dbAdmin.tx.productionJobs[jobId].update({
      orderId: requestId,
      orderRequestId: requestId,
      orderItemIndex: 0,
      productSlug: request.productSlug,
      selectedVariantId: request.variantId,
      selectedVariantName: request.variantName,
      productName: request.productName || 'Foto3D.pt',
      imageUrl: request.imageUrl,
      source: 'order_request',
      partLabel: request.canvasConfig?.type === 'modular-list' ? 'Projeto modular' : 'Peça simples',
      colorName: lightLabel,
      colorHex: request.lightMode === 'fria' ? '#e6f2ff' : '#ffaa00',
      materialGrams: 120,
      materialType: 'PLA',
      quantity: 1,
      status: 'queued',
      isMultiColor: false,
      colorRequirements: [{
        colorId: 'manual',
        colorName: lightLabel,
        colorHex: request.lightMode === 'fria' ? '#e6f2ff' : '#ffaa00',
        grams: 120,
        materialType: 'PLA',
      }],
      requiredColorIds: 'manual',
      totalGrams: 120,
      outsourced: false,
      customText: request.engravingText || '',
      notes: [
        request.notes,
        request.imageUrl ? `Foto: ${request.imageUrl}` : null,
        request.selectedPrice ? `Preço: ${request.selectedPrice}€` : null,
        request.canvasConfig ? `CanvasConfig: ${JSON.stringify(request.canvasConfig)}` : null,
      ].filter(Boolean).join('\n\n'),
      createdAt: now,
      updatedAt: now,
    }),
  ])

  revalidatePath('/admin/order-requests')
  revalidatePath('/admin/production')

  return { created: true, jobId }
}
