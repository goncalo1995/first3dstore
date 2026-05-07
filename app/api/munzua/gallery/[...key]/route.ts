import { NextRequest, NextResponse } from 'next/server'
import { requireMunzuaAuth } from '@/lib/munzua-auth'
import { assertMunzuaGalleryKey, getMunzuaGallerySignedUrl } from '@/lib/munzua-gallery'

type GalleryImageRouteProps = {
  params: Promise<{ key: string[] }>
}

export async function GET(_req: NextRequest, { params }: GalleryImageRouteProps) {
  const authError = await requireMunzuaAuth()
  if (authError) return authError

  const { key: keyParts } = await params
  const key = keyParts.map(decodeURIComponent).join('/')

  try {
    assertMunzuaGalleryKey(key)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chave de galeria inválida' },
      { status: 400 },
    )
  }

  try {
    const signedUrl = await getMunzuaGallerySignedUrl(key)
    return NextResponse.redirect(signedUrl)
  } catch (error) {
    console.error('Falha ao assinar URL da galeria Munzua:', error)
    return NextResponse.json(
      { error: 'Não foi possível abrir a imagem da galeria' },
      { status: 500 },
    )
  }
}
