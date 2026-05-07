import { NextRequest, NextResponse } from 'next/server'
import { uploadMunzuaGalleryImage } from '@/lib/munzua-gallery'
import { requireMunzuaAuth } from '@/lib/munzua-auth'

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/)
  if (!match) throw new Error('Data URL inválida')

  const contentType = match[1] || 'image/png'
  const isBase64 = Boolean(match[2])
  const payload = match[3] || ''
  const bytes = isBase64
    ? Uint8Array.from(Buffer.from(payload, 'base64'))
    : new TextEncoder().encode(decodeURIComponent(payload))

  return { bytes, contentType }
}

async function imageToBytes(imageUrl: string) {
  if (imageUrl.startsWith('data:')) {
    return parseDataUrl(imageUrl)
  }

  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Não foi possível obter a imagem: ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || 'image/png'
  const arrayBuffer = await response.arrayBuffer()

  return {
    bytes: new Uint8Array(arrayBuffer),
    contentType,
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireMunzuaAuth()
  if (authError) return authError

  try {
    const { imageUrl, folder } = await req.json()

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'A imagem é obrigatória' }, { status: 400 })
    }

    const image = await imageToBytes(imageUrl)
    const savedImage = await uploadMunzuaGalleryImage({ ...image, folder })

    return NextResponse.json(savedImage)
  } catch (error) {
    console.error('Falha ao guardar imagem Munzua:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível guardar a imagem' },
      { status: 500 },
    )
  }
}
