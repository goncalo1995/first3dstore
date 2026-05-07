import { NextRequest, NextResponse } from 'next/server'
import { deleteMunzuaGalleryImage, listMunzuaGalleryImages } from '@/lib/munzua-gallery'
import { requireMunzuaAuth } from '@/lib/munzua-auth'

export async function GET(req: NextRequest) {
  const authError = await requireMunzuaAuth()
  if (authError) return authError

  try {
    const folder = req.nextUrl.searchParams.get('folder') ?? ''
    const result = await listMunzuaGalleryImages(folder)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Falha ao listar galeria Munzua:', error)
    return NextResponse.json(
      { error: 'Não foi possível listar a galeria' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requireMunzuaAuth()
  if (authError) return authError

  try {
    const { key } = await req.json()

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'A chave da imagem é obrigatória' }, { status: 400 })
    }

    const result = await deleteMunzuaGalleryImage(key)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Falha ao apagar imagem Munzua:', error)
    const message = error instanceof Error ? error.message : 'Não foi possível apagar a imagem'
    return NextResponse.json(
      { error: message },
      { status: message === 'Chave de galeria inválida' ? 400 : 500 },
    )
  }
}
