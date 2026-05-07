import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { id } from '@instantdb/admin'
import { Resend } from 'resend'
import { dbAdmin } from '@/lib/db-admin'
import { s3, BUCKET_NAME, PUBLIC_URL } from '@/lib/s3'

export const runtime = 'nodejs'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png'])
const VALID_BASE_COLORS = new Set(['black', 'wood'])
const VALID_LIGHT_MODES = new Set(['desligada', 'quente', 'fria'])

function asString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanPathSegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getRecipients() {
  const configured = process.env.LITHOPHANE_REQUEST_TO || process.env.ADMIN_EMAILS || ''
  return configured.split(',').map((email) => email.trim()).filter(Boolean)
}

function getSender() {
  return process.env.RESEND_FROM_EMAIL || 'foto3d.pt <onboarding@resend.dev>'
}

async function notifyAdmin(params: {
  requestId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  imageUrl: string
  baseColor: string
  productSlug?: string
  productName?: string
  variantId?: string
  variantName?: string
  selectedPrice?: number
  lightMode?: string
  engravingText?: string
  notes?: string
}) {
  const recipients = getRecipients()

  if (!process.env.RESEND_API_KEY || !recipients.length) {
    console.info('New lithophane request:', params)
    return { mode: 'console' as const }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: getSender(),
    to: recipients,
    subject: `Novo pedido foto3d.pt - ${params.customerName}`,
    text: [
      `Novo pedido: ${params.requestId}`,
      `Nome: ${params.customerName}`,
      `Email: ${params.customerEmail}`,
      `Telemovel: ${params.customerPhone}`,
      `Produto: ${params.productName || '-'} (${params.productSlug || '-'})`,
      `Variante: ${params.variantName || '-'} (${params.variantId || '-'})`,
      `Preço: ${params.selectedPrice ? `${params.selectedPrice}€` : '-'}`,
      `Luz: ${params.lightMode || '-'}`,
      `Base: ${params.baseColor}`,
      `Gravacao: ${params.engravingText || '-'}`,
      `Notas: ${params.notes || '-'}`,
      `Imagem: ${params.imageUrl}`,
    ].join('\n'),
  })

  if (error) {
    console.error('Lithophane notification email failed:', error)
    return { mode: 'email_failed' as const }
  }

  return { mode: 'email' as const }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const customerName = asString(formData.get('customerName'))
    const customerEmail = asString(formData.get('customerEmail')).toLowerCase()
    const customerPhone = asString(formData.get('customerPhone'))
    const baseColor = asString(formData.get('baseColor'))
    const productSlug = asString(formData.get('productSlug'))
    const productName = asString(formData.get('productName'))
    const variantId = asString(formData.get('variantId'))
    const variantName = asString(formData.get('variantName'))
    const selectedPriceRaw = asString(formData.get('selectedPrice'))
    const selectedPrice = selectedPriceRaw ? Number(selectedPriceRaw) : undefined
    const lightMode = asString(formData.get('lightMode'))
    const canvasConfigRaw = asString(formData.get('canvasConfig'))
    const engravingText = asString(formData.get('engravingText')).slice(0, 20)
    const notes = asString(formData.get('notes'))
    const image = formData.get('image')

    if (customerName.length < 2) {
      return NextResponse.json({ error: 'Indique o seu nome.' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return NextResponse.json({ error: 'Indique um email válido.' }, { status: 400 })
    }

    if (customerPhone.length < 6) {
      return NextResponse.json({ error: 'Indique um telemóvel válido.' }, { status: 400 })
    }

    if (baseColor && !VALID_BASE_COLORS.has(baseColor)) {
      return NextResponse.json({ error: 'Escolha uma cor de base valida.' }, { status: 400 })
    }

    if (lightMode && !VALID_LIGHT_MODES.has(lightMode)) {
      return NextResponse.json({ error: 'Escolha um modo de luz válido.' }, { status: 400 })
    }

    if (selectedPrice !== undefined && (!Number.isFinite(selectedPrice) || selectedPrice < 0)) {
      return NextResponse.json({ error: 'O preço selecionado não é válido.' }, { status: 400 })
    }

    let canvasConfig: any | undefined
    if (canvasConfigRaw) {
      try {
        canvasConfig = JSON.parse(canvasConfigRaw)
      } catch {
        return NextResponse.json({ error: 'A configuração do pedido não é válida.' }, { status: 400 })
      }

      if (canvasConfig?.version !== 1) {
        return NextResponse.json({ error: 'A versão da configuração do pedido não é suportada.' }, { status: 400 })
      }
    }

    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'Carregue uma fotografia.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(image.type)) {
      return NextResponse.json({ error: 'Use uma fotografia JPG ou PNG.' }, { status: 400 })
    }

    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'A fotografia deve ter no máximo 5MB.' }, { status: 400 })
    }

    const requestId = id()
    const safeName = cleanPathSegment(image.name || 'fotografia')
    const key = `lithophane-requests/${requestId}/${safeName || 'fotografia'}`
    const bytes = Buffer.from(await image.arrayBuffer())

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: bytes,
        ContentType: image.type,
      }),
    )

    const imageUrl = `https://${PUBLIC_URL}/${key}`
    const now = new Date()
    const storedCanvasConfig = canvasConfig
      ? {
          ...canvasConfig,
          primaryImageUrl: imageUrl,
          submittedAt: now.toISOString(),
        }
      : undefined

    await dbAdmin.transact(
      dbAdmin.tx.orderRequests[requestId].update({
        customerName,
        customerEmail,
        customerPhone,
        imageUrl,
        baseColor: baseColor ? (baseColor as 'black' | 'wood') : undefined,
        productSlug: productSlug || undefined,
        productName: productName || undefined,
        variantId: variantId || undefined,
        variantName: variantName || undefined,
        selectedPrice,
        lightMode: lightMode ? (lightMode as 'desligada' | 'quente' | 'fria') : undefined,
        canvasConfig: storedCanvasConfig,
        engravingText: engravingText || undefined,
        isPaid: false,
        notes: notes || undefined,
        status: 'PENDING_REVIEW',
        createdAt: now,
        updatedAt: now,
      }),
    )

    const notification = await notifyAdmin({
      requestId,
      customerName,
      customerEmail,
      customerPhone,
      imageUrl,
      baseColor,
      productSlug,
      productName,
      variantId,
      variantName,
      selectedPrice,
      lightMode,
      engravingText,
      notes,
    })

    return NextResponse.json({
      ok: true,
      requestId,
      imageUrl,
      notificationMode: notification.mode,
    })
  } catch (error) {
    console.error('Lithophane request failed:', error)
    return NextResponse.json(
      { error: 'Não foi possível registar o pedido. Tente novamente.' },
      { status: 500 },
    )
  }
}
