import { NextRequest, NextResponse } from 'next/server'
import { generateImageFromPrompt } from '@/lib/ai-service'

export async function POST(req: NextRequest) {
  try {
    const { prompt, negativePrompt, size, quality, model } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'O prompt é obrigatório' }, { status: 400 })
    }

    const image = await generateImageFromPrompt({
      prompt,
      negativePrompt,
      size,
      quality,
      model,
      style: 'studio',
      trackingFeature: 'foto3d.generateImage',
      usePromptDirectly: true,
    })

    return NextResponse.json({
      imageUrl: image.url,
      prompt: image.prompt,
      cost: image.cost.toFixed(6),
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível gerar a imagem' },
      { status: 500 },
    )
  }
}
