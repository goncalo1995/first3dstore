import { NextRequest, NextResponse } from 'next/server'
import { remixImage } from '@/lib/ai-service'
import { verifyMunzuaAuth } from '@/lib/munzua-auth'
import { getMunzuaGallerySignedUrl, MUNZUA_GALLERY_PREFIX } from '@/lib/munzua-gallery'

async function normalizeSourceImage(imageUrl: string, req: NextRequest) {
  if (!imageUrl.startsWith('/api/munzua/gallery/')) return imageUrl

  if (!(await verifyMunzuaAuth())) {
    throw new Error('Sem autorização para usar esta imagem da galeria')
  }

  const absoluteUrl = new URL(imageUrl, req.url)
  const key = absoluteUrl.pathname
    .replace('/api/munzua/gallery/', '')
    .split('/')
    .map(decodeURIComponent)
    .join('/')

  if (!key.startsWith(MUNZUA_GALLERY_PREFIX)) {
    throw new Error('Chave de galeria inválida')
  }

  return getMunzuaGallerySignedUrl(key)
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrls, imageUrl, instructions, negativePrompt, size, quality, model } = await req.json()
    const sourceImages = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [imageUrl].filter(Boolean)
    const firstImage = sourceImages[0] ? await normalizeSourceImage(sourceImages[0], req) : null

    if (!firstImage) {
      return NextResponse.json({ error: 'É necessária pelo menos uma imagem de referência' }, { status: 400 })
    }

    if (!instructions || typeof instructions !== 'string') {
      return NextResponse.json({ error: 'As instruções são obrigatórias' }, { status: 400 })
    }

    const munzuaOpenRouterApiKey = process.env.MUNZUA_OPENROUTER_API_KEY

    if (!munzuaOpenRouterApiKey) {
      return NextResponse.json(
        { error: 'A chave OpenRouter do Munzua não está configurada' },
        { status: 500 },
      )
    }

    const extraContext =
      sourceImages.length > 1
        ? `\n\nUsa a primeira imagem como referência visual principal. Foram adicionadas mais ${sourceImages.length - 1} imagem(ns) como contexto, mas este fluxo usa apenas uma imagem de referência.`
        : ''

    const result = await remixImage({
      imageUrl: firstImage,
      instructions: `${instructions}${negativePrompt ? `\n\nAvoid: ${negativePrompt}` : ''}${extraContext}`,
      size,
      quality,
      model,
      openrouterApiKey: munzuaOpenRouterApiKey,
      trackingFeature: 'munzua.remixImage',
    })

    return NextResponse.json({ imageUrl: result.imageUrl, cost: result.cost.toFixed(6), result })
  } catch (error) {
    console.error('Erro ao remisturar imagem:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível remisturar a imagem' },
      { status: 500 },
    )
  }
}
