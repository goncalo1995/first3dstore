import { NextRequest, NextResponse } from "next/server";
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output } from "ai";
import { z } from "zod";
import { trackedGenerateText } from '@/lib/ai-tracking';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const productAISchema = z.object({
  improvements: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      implementationEffort: z.enum(["low", "medium", "high"]),
      expectedImpact: z.enum(["low", "medium", "high"]),
    })
  ).length(3),
  
  imagePrompts: z.array(
    z.object({
      name: z.string(),
      prompt: z.string(),
      negativePrompt: z.string().optional(),
      parameters: z.object({
        style: z.string(),
        lighting: z.string(),
        background: z.string(),
        camera: z.string().optional(),
      }),
    })
  ).length(3),
  
  marketingContent: z.object({
    title: z.string(),
    shortDescription: z.string(),
    longDescription: z.string(),
    bulletPoints: z.array(z.string()).length(5),
    seoKeywords: z.array(z.string()).length(8),
    targetHashtags: z.array(z.string()).length(5),
  }),
});

// Models that Support Images:
// google/gemini-2.0-flash-001 (fast, good for this use case)
// google/gemini-2.0-pro-001 (more capable)
// anthropic/claude-3-opus (excellent vision)
// openai/gpt-4-vision-preview

export async function POST(req: NextRequest) {
  try {
    const { product, customInstructions, referenceImage } = await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    // Build the user prompt as a single string
    let userPrompt = `
PRODUCT INFORMATION:
Name: ${product.name}
Current Description: ${product.description || "Not provided"}
Material: ${product.material || "Standard filament"}
Category: ${product.category || "General"}
Dimensions: ${product.dimensions || "Standard size"}
Current Colors Available: ${product.colors?.join(", ") || "Standard colors"}

${customInstructions ? `SPECIAL INSTRUCTIONS: ${customInstructions}` : ""}

Generate a COMPLETE response with three sections:
1. improvements: 3 specific, actionable improvements (color variations, finish options, design tweaks, material suggestions)
2. imagePrompts: 3 DALL-E/Midjourney prompts for different product photo styles
3. marketingContent: Complete marketing copy including SEO and social media

Consider 3D printing best practices: layer lines, orientation, support requirements, surface finish, material properties.
Consider current market trends for ${product.category || "3D printed products"}.

Return ONLY valid JSON matching the schema.
`;

    const modelId = "google/gemini-2.0-flash-001";

    // Handle with or without image
    let modelInput: any;
    
    if (referenceImage) {
      // For image input, use the content array format
      modelInput = {
        model: openrouter(modelId),
        messages: [
          {
            role: "user" as const,
            content: [
              { type: "text" as const, text: userPrompt },
              { 
                type: "image" as const, 
                image: referenceImage,
                mimeType: "image/jpeg" // Adjust based on your image type
              }
            ],
          },
        ],
        output: Output.object({ schema: productAISchema }),
        temperature: 0.7,
        maxRetries: 2,
      };
    } else {
      // Text-only input (simpler format)
      modelInput = {
        model: openrouter(modelId),
        prompt: userPrompt,
        output: Output.object({ schema: productAISchema }),
        temperature: 0.7,
        maxRetries: 2,
      };
    }

    const result = await trackedGenerateText(
      () => generateText(modelInput),
      modelId,
      { feature: 'ai-product-studio', userId: 'admin' },
    );
    
    return NextResponse.json({ success: true, data: (result as any).output });
    
  } catch (error) {
    console.error("AI Product API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}