import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { id } from '@instantdb/admin'
import { dbAdmin } from '@/lib/db-admin'
import { BUCKET_NAME, PUBLIC_URL, s3 } from '@/lib/s3'
import { estimatePuzzlePrice } from '@/lib/puzzle/pricing'
import { sanitizeSvg } from '@/lib/puzzle/svg'
import type { ConnectorType, SvgPuzzleConfig } from '@/lib/puzzle/types'

export const runtime = 'nodejs'

const MAX_SVG_SIZE = 2 * 1024 * 1024
const CONNECTOR_TYPES = new Set<ConnectorType>(['recto', 'redondo', 'chanfrado'])

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

function isHexColor(value: unknown) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

function isNumberInRange(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function validateConfig(config: any): config is SvgPuzzleConfig {
  return (
    config &&
    config.version === 1 &&
    config.type === 'svg-puzzle' &&
    isNumberInRange(config.widthMm, 50, 300) &&
    isNumberInRange(config.heightMm, 50, 300) &&
    Number.isInteger(config.rows) &&
    config.rows >= 2 &&
    config.rows <= 20 &&
    Number.isInteger(config.columns) &&
    config.columns >= 2 &&
    config.columns <= 20 &&
    typeof config.sunkenImage === 'boolean' &&
    isNumberInRange(config.pieceGapMm, 0, 0.5) &&
    isNumberInRange(config.thicknessMm, 2, 6) &&
    isNumberInRange(config.imageScalePercent, 50, 200) &&
    isNumberInRange(config.offsetXmm, -50, 50) &&
    isNumberInRange(config.offsetYmm, -50, 50) &&
    CONNECTOR_TYPES.has(config.connectorType) &&
    config.colorMappings &&
    typeof config.colorMappings === 'object' &&
    Array.isArray(config.finalColors) &&
    config.finalColors.length >= 1 &&
    config.finalColors.length <= 4 &&
    config.finalColors.every(isHexColor)
  )
}

function buildNotes(config: SvgPuzzleConfig) {
  return [
    'Fluxo: Puzzle SVG multicolor',
    `Dimensões: ${config.widthMm}mm x ${config.heightMm}mm`,
    `Grelha: ${config.rows} linhas x ${config.columns} colunas (${config.rows * config.columns} peças)`,
    `Peça: ${config.pieceWidthMm}mm x ${config.pieceHeightMm}mm`,
    `Conector: ${config.connectorType}`,
    `Sunken image: ${config.sunkenImage ? 'sim' : 'não'}`,
    `Espaçamento entre peças: ${config.pieceGapMm}mm`,
    `Espessura pretendida: ${config.thicknessMm}mm`,
    `Escala SVG: ${config.imageScalePercent}%`,
    `Offset: X ${config.offsetXmm}mm, Y ${config.offsetYmm}mm`,
    `Cores finais: ${config.finalColors.join(', ')}`,
    `Preço estimado: ${config.estimatedPrice}€`,
  ].join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const customerName = asString(formData.get('customerName'))
    const customerEmail = asString(formData.get('customerEmail')).toLowerCase()
    const customerPhone = asString(formData.get('customerPhone'))
    const configRaw = asString(formData.get('canvasConfig'))
    const svgFile = formData.get('svg')

    if (customerName.length < 2) {
      return NextResponse.json({ error: 'Indique o seu nome.' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return NextResponse.json({ error: 'Indique um email válido.' }, { status: 400 })
    }

    if (customerPhone.length && customerPhone.length < 9) {
      return NextResponse.json({ error: 'Indique um telemóvel válido.' }, { status: 400 })
    }

    if (!(svgFile instanceof File)) {
      return NextResponse.json({ error: 'Carregue um SVG.' }, { status: 400 })
    }

    if (svgFile.type && svgFile.type !== 'image/svg+xml') {
      return NextResponse.json({ error: 'Use um ficheiro SVG válido.' }, { status: 400 })
    }

    if (svgFile.size > MAX_SVG_SIZE) {
      return NextResponse.json({ error: 'O SVG deve ter no máximo 2MB.' }, { status: 400 })
    }

    let canvasConfig: unknown
    try {
      canvasConfig = JSON.parse(configRaw)
    } catch {
      return NextResponse.json({ error: 'A configuração do puzzle não é válida.' }, { status: 400 })
    }

    if (!validateConfig(canvasConfig)) {
      return NextResponse.json({ error: 'Verifique os parâmetros do puzzle.' }, { status: 400 })
    }

    const svgText = await svgFile.text()
    const analysis = sanitizeSvg(svgText, canvasConfig.colorMappings)
    if (!analysis.ok) {
      return NextResponse.json({ error: analysis.errors.join(' ') }, { status: 400 })
    }

    const estimatedPrice = estimatePuzzlePrice({
      widthMm: canvasConfig.widthMm,
      heightMm: canvasConfig.heightMm,
      rows: canvasConfig.rows,
      columns: canvasConfig.columns,
      colorCount: canvasConfig.finalColors.length,
    })

    const requestId = id()
    const safeName = cleanPathSegment(svgFile.name || 'puzzle.svg')
    const key = `puzzle-requests/${requestId}/${safeName || 'puzzle.svg'}`

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: Buffer.from(analysis.sanitizedSvg, 'utf8'),
        ContentType: 'image/svg+xml',
      }),
    )

    const svgUrl = `https://${PUBLIC_URL}/${key}`
    const now = new Date()
    const storedCanvasConfig: SvgPuzzleConfig & Record<string, unknown> = {
      ...canvasConfig,
      viewBox: analysis.viewBox,
      estimatedPrice,
      svgUrl,
      submittedAt: now.toISOString(),
      productionFlow: 'manual-svg-model-plus-negative-volume',
    }

    await dbAdmin.transact(
      dbAdmin.tx.orderRequests[requestId].update({
        customerName,
        customerEmail,
        customerPhone,
        imageUrl: svgUrl,
        svgUrl,
        previewUrl: svgUrl,
        productSlug: 'puzzle-foto',
        productName: 'Puzzle SVG Personalizado',
        selectedPrice: estimatedPrice,
        estimatedPrice,
        canvasConfig: storedCanvasConfig,
        isPaid: false,
        notes: buildNotes(storedCanvasConfig),
        status: 'PENDING_REVIEW',
        createdAt: now,
        updatedAt: now,
      }),
    )

    return NextResponse.json({
      ok: true,
      requestId,
      svgUrl,
      estimatedPrice,
    })
  } catch (error) {
    console.error('Puzzle request failed:', error)
    return NextResponse.json(
      { error: 'Não foi possível registar o pedido. Tente novamente.' },
      { status: 500 },
    )
  }
}
