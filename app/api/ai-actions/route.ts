// app/api/ai-actions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  generateProductImprovements,
  generateMarketingCopy,
  generateImageFromPrompt,
  remixImage,
  recolorImage,
} from '@/lib/ai-service';

export async function POST(req: NextRequest) {
  try {
    const { action, product, extraInstructions, targetAudience, prompt, negativePrompt, size, imageUrl, instructions, newColor, style } = await req.json();

    switch (action) {
      case 'improvements':
        const improvements = await generateProductImprovements({
          name: product.name,
          description: product.description,
          material: product.material,
          category: product.category,
          currentColors: product.colors,
          extraInstructions,
        });
        return NextResponse.json({ result: improvements });

      case 'marketing':
        const marketing = await generateMarketingCopy({
          name: product.name,
          description: product.description,
          uniqueFeatures: product.uniqueFeatures,
          targetAudience: targetAudience || product.targetAudience,
          extraInstructions,
        });
        return NextResponse.json({ result: marketing });

      case 'generateImage':
        const image = await generateImageFromPrompt({ prompt, negativePrompt, size, style });
        return NextResponse.json({ result: image });

      case 'remixImage':
        const remixed = await remixImage({
          imageUrl,
          instructions,
          productName: product?.name
        });
        return NextResponse.json({ result: remixed });

      case "recolorImage":
        const recolored = await recolorImage({
          imageUrl,
          newColor,
          preserveDetails: true,
        });
        return NextResponse.json({ success: true, result: recolored });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('AI action error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}