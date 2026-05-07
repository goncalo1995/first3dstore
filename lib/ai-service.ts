// lib/ai-service.ts
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, generateObject, Output, generateImage } from 'ai';
import { z } from 'zod';
import { costFromUsage, trackedFetch, trackedGenerateObject } from './ai-tracking';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';

function openrouterHeaders(apiKey = process.env.OPENROUTER_API_KEY) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

// ------------------ Schemas ------------------
export const productImprovementSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      effort: z.enum(['low', 'medium', 'high']),
      impact: z.enum(['low', 'medium', 'high']),
    })
  ).length(3),
});

export const marketingCopySchema = z.object({
  title: z.string(),
  shortDescription: z.string(),
  longDescription: z.string(),
  bulletPoints: z.array(z.string()).length(5),
  seoKeywords: z.array(z.string()).length(8),
  hashtags: z.array(z.string()).length(5),
});

export const imageGenerationSchema = z.object({
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  style: z.string(),
});

// ------------------ Text Generation ------------------
export async function generateProductImprovements(product: {
  name: string;
  description: string;
  material?: string;
  category?: string;
  currentColors?: string[];
  extraInstructions?: string;
}, userId?: string) {
  const prompt = `You are a 3D printing product expert. Suggest 3 improvements for this product.

Product: ${product.name}
Description: ${product.description}
Material: ${product.material || 'Standard filament'}
Category: ${product.category || 'General'}
Current colors: ${product.currentColors?.join(', ') || 'Standard'}

${product.extraInstructions ? `Extra instructions: ${product.extraInstructions}` : ''}

Return JSON with array "suggestions" containing objects: title, description, effort (low/medium/high), impact (low/medium/high).`;

  const modelId = 'google/gemini-2.0-flash-001';
  const { object } = await trackedGenerateObject(
    () => generateObject({
      model: openrouter(modelId),
      schema: productImprovementSchema,
      prompt,
      temperature: 0.7,
    }),
    modelId,
    { feature: 'improvements', userId },
  );
  return object.suggestions;
}

export async function generateMarketingCopy(product: {
  name: string;
  description: string;
  uniqueFeatures?: string[];
  targetAudience?: string;
  extraInstructions?: string;
}, userId?: string) {
  const prompt = `Create SEO-optimized marketing copy for a 3D printed product.

Product name: ${product.name}
Description: ${product.description}
Unique features: ${product.uniqueFeatures?.join(', ') || 'Not specified'}
Target audience: ${product.targetAudience || 'General consumers'}

${product.extraInstructions ? `Instructions: ${product.extraInstructions}` : ''}

Return JSON with fields: title, shortDescription, longDescription, bulletPoints (5 items), seoKeywords (8 items), hashtags (5 items).`;

  const modelId = 'google/gemini-2.0-flash-001';
  const { object } = await trackedGenerateObject(
    () => generateObject({
      model: openrouter(modelId),
      schema: marketingCopySchema,
      prompt,
      temperature: 0.6,
    }),
    modelId,
    { feature: 'marketing', userId },
  );
  return object;
}

// ------------------ Image Generation (via OpenRouter) ------------------
export async function generateImageFromPrompt(params: {
  prompt: string;
  negativePrompt?: string;
  style?: "product" | "lifestyle" | "studio";
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  model?: string;
  openrouterApiKey?: string;
  trackingFeature?: string;
  usePromptDirectly?: boolean;
}, userId?: string) {
  // OpenRouter supports DALL-E 3, Stable Diffusion, Flux, etc.
  const model = params.model || 'dall-e-3'; // or 'stabilityai/stable-diffusion-3.5-large'

  const fullPrompt = params.usePromptDirectly
    ? `${params.prompt}${params.negativePrompt ? `\n\nAvoid: ${params.negativePrompt}` : ''}`
    : params.style === "product"
    ? `Professional product photo of 3D printed item: ${params.prompt}. Pure white background, studio lighting, high resolution, sharp focus. ${params.negativePrompt ? `Avoid: ${params.negativePrompt}` : ''}`
    : params.style === "lifestyle"
    ? `Lifestyle photo of 3D printed product in use: ${params.prompt}. Natural lighting, realistic setting, depth of field. ${params.negativePrompt ? `Avoid: ${params.negativePrompt}` : ''}`
    : `Studio quality 3D printed product: ${params.prompt}. Even lighting, clean background, detailed texture. ${params.negativePrompt ? `Avoid: ${params.negativePrompt}` : ''}`;

  const response = await trackedFetch(
    OPENROUTER_API,
    {
      method: 'POST',
      headers: openrouterHeaders(params.openrouterApiKey),
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: fullPrompt }],
        modalities: ['image'],
        size: params.size || '1024x1024',
        quality: params.quality || "standard",
      }),
    },
    model,
    { feature: params.trackingFeature || 'generateImage', userId },
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.error || `OpenRouter image generation failed (${response.status})`);
  }
  // The API returns image URL(s) in choices[0].message.images
  const generatedImage = data.choices?.[0]?.message?.images?.[0];
  const imageUrl = generatedImage?.url || generatedImage?.image_url?.url;
  if (!imageUrl) throw new Error('Não foi gerada nenhuma imagem. Tente outro modelo de imagem ou ajuste o prompt.');
  return { prompt: fullPrompt, url: imageUrl, cost: costFromUsage(model, data.usage ?? {}) };
}

export async function remixImage(params: {
  imageUrl: string;        // URL or base64 data URL
  instructions: string;    // "make it white with green letters"
  productName?: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  model?: string;
  openrouterApiKey?: string;
  trackingFeature?: string;
}, userId?: string) {
  const { imageUrl, instructions, productName } = params;
  const model = params.model || "google/gemini-3.1-flash-image-preview";

  // Step 1: Use vision model to understand the image and generate a new prompt
  const prompt = `You are a realistic architectural and marketing image specialist. Look at this reference image (${productName || 'render or space'}).
              
The user wants to adjust the image attached with the following instructions: ${instructions}.`

  const visionResponse = await trackedFetch(
    OPENROUTER_API,
    {
      method: "POST",
      headers: openrouterHeaders(params.openrouterApiKey),
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                }
              },
            ],
          },
        ],
        temperature: 0.7,
        modalities: ["image"],
        size: params.size || "1024x1024",
        quality: params.quality || "standard",
      }),
    },
    model,
    { feature: params.trackingFeature || 'remixImage', userId },
  );

  if (!visionResponse.ok) {
    const errorData = await visionResponse.json();
    console.log(errorData);
    throw new Error(errorData.error?.message || errorData.error || `OpenRouter remix failed (${visionResponse.status})`);
  }

  const imageData = await visionResponse.json();
  console.log("generated new images", imageData.choices[0]?.message?.images?.length);
  const generatedImage = imageData.choices[0]?.message?.images?.[0];
  const base64UrlImage = generatedImage?.image_url?.url || generatedImage?.url;

  if (!base64UrlImage) {
    throw new Error("Não foi gerada nenhuma imagem. Tente outro modelo de imagem ou ajuste o prompt.");
  }

  return {
    generatedPrompt: prompt,
    imageUrl: base64UrlImage,
    cost: costFromUsage(model, imageData.usage ?? {}),
  };
}

// Alternative: For color-only changes (faster, cheaper)
export async function recolorImage(params: {
  imageUrl: string;
  newColor: string;
  preserveDetails?: boolean;
}, userId?: string) {
  const { imageUrl, newColor, preserveDetails = true } = params;
  const visionModel = "google/gemini-2.0-flash-001";
  const imageModel = "dall-e-3";

  const response = await trackedFetch(
    OPENROUTER_API,
    {
      method: "POST",
      headers: openrouterHeaders(),
      body: JSON.stringify({
        model: visionModel,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Change the color of the 3D printed product in this image to ${newColor}.
${preserveDetails ? 'Keep all other details, texture, and lighting the same.' : ''}
Return a detailed DALL-E 3 prompt that would recolor this product.`,
              },
              {
                type: "image_url",
                image_url: imageUrl,
              },
            ],
          },
        ],
        temperature: 0.5,
      }),
    },
    visionModel,
    { feature: 'recolorImage:vision', userId },
  );

  const data = await response.json();
  const prompt = data.choices[0].message.content;

  // Generate the recolored image
  const imageGenResponse = await trackedFetch(
    OPENROUTER_API,
    {
      method: "POST",
      headers: openrouterHeaders(),
      body: JSON.stringify({
        model: imageModel,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image"],
      }),
    },
    imageModel,
    { feature: 'recolorImage:generate', userId },
  );

  const imageData = await imageGenResponse.json();
  return {
    prompt,
    imageUrl: imageData.choices[0]?.message?.images?.[0]?.url,
  };
}

// Simple text-to-image generation
export async function generateProductImage(params: {
  prompt: string;
  negativePrompt?: string;
  style?: "product" | "lifestyle" | "studio";
  size?: "1024x1024" | "1792x1024" | "1024x1792";
}, userId?: string) {
  const model = "dall-e-3";
  const fullPrompt = params.style === "product"
    ? `Professional product photo of 3D printed item: ${params.prompt}. Pure white background, studio lighting, high resolution, sharp focus. ${params.negativePrompt ? `Avoid: ${params.negativePrompt}` : ''}`
    : params.style === "lifestyle"
    ? `Lifestyle photo of 3D printed product in use: ${params.prompt}. Natural lighting, realistic setting, depth of field. ${params.negativePrompt ? `Avoid: ${params.negativePrompt}` : ''}`
    : `Studio quality 3D printed product: ${params.prompt}. Even lighting, clean background, detailed texture. ${params.negativePrompt ? `Avoid: ${params.negativePrompt}` : ''}`;

  const response = await trackedFetch(
    OPENROUTER_API,
    {
      method: "POST",
      headers: openrouterHeaders(),
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: fullPrompt }],
        modalities: ["image"],
        size: params.size || "1024x1024",
        quality: "standard",
      }),
    },
    model,
    { feature: 'generateProductImage', userId },
  );

  const data = await response.json();
  return {
    prompt: fullPrompt,
    url: data.choices[0]?.message?.images?.[0]?.url,
  };
}
