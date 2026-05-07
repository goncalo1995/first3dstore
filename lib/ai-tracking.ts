// lib/ai-tracking.ts
// Wraps OpenRouter calls to track token usage, costs, and errors.

import { id } from '@instantdb/admin';
import { dbAdmin } from './db-admin';

// ─── Model Rate Table (USD per 1M tokens) ───────────────────────────
// Update these values when OpenRouter pricing changes.
// Format: [inputRate, outputRate] per 1 million tokens
export const MODEL_RATES: Record<string, [input: number, output: number]> = {
  // Google Gemini
  'google/gemini-2.0-flash-001':       [0.10, 0.40],
  'google/gemini-2.0-pro-001':         [1.25, 10.00],
  'google/gemini-3.1-flash-image-preview': [0.15, 0.60],
  // OpenAI
  'dall-e-3':                          [40.00, 40.00], // flat image pricing approximation
  'openai/gpt-4-vision-preview':       [10.00, 30.00],
  // Anthropic
  'anthropic/claude-3-opus':           [15.00, 75.00],
};

const DEFAULT_RATE: [number, number] = [1.00, 3.00]; // fallback

export function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const [inputRate, outputRate] = MODEL_RATES[model] ?? DEFAULT_RATE;
  return (promptTokens * inputRate + completionTokens * outputRate) / 1_000_000;
}

// ─── Log to InstantDB ───────────────────────────────────────────────
interface TrackingMeta {
  feature: string;     // e.g. "improvements", "marketing", "remixImage"
  userId?: string;     // admin email — passed from the API route
}

async function logUsage(params: {
  meta: TrackingMeta;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  providerCost?: number;
  requestId: string;
  success: boolean;
  errorMessage?: string;
}) {
  try {
    await dbAdmin.transact(
      dbAdmin.tx.aiUsageLogs[id()].update({
        feature: params.meta.feature,
        model: params.model,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens: params.totalTokens,
        estimatedCost:
          typeof params.providerCost === 'number' && Number.isFinite(params.providerCost)
            ? params.providerCost
            : estimateCost(params.model, params.promptTokens, params.completionTokens),
        requestId: params.requestId,
        success: params.success,
        errorMessage: params.errorMessage ?? '',
        createdAt: new Date(),
        userId: params.meta.userId ?? 'system',
      }),
    );
  } catch (err) {
    // Never let tracking failures break the main flow
    console.error('[ai-tracking] Failed to log usage:', err);
  }
}

// ─── Tracked Fetch (for raw OpenRouter fetch calls) ─────────────────
export async function trackedFetch(
  url: string,
  options: RequestInit,
  model: string,
  meta: TrackingMeta,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (err: any) {
    await logUsage({
      meta,
      model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      requestId: '',
      success: false,
      errorMessage: err.message ?? 'Fetch failed',
    });
    throw err;
  }

  // Clone so we can read the body without consuming the original
  const clone = response.clone();
  const requestId = response.headers.get('x-request-id') ?? '';

  try {
    const body = await clone.json();
    const usage = body.usage ?? {};
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? (promptTokens + completionTokens);
    const providerCost = parseProviderCost(usage);

    await logUsage({
      meta,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      providerCost,
      requestId,
      success: response.ok,
      errorMessage: response.ok ? undefined : (body.error?.message ?? `HTTP ${response.status}`),
    });
  } catch {
    // If we can't parse the response for tracking, still return it
    await logUsage({
      meta,
      model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      requestId,
      success: response.ok,
      errorMessage: 'Could not parse response for tracking',
    });
  }

  return response;
}

export function parseProviderCost(usage: any): number | undefined {
  const rawCost =
    usage?.cost ??
    usage?.total_cost ??
    usage?.estimated_cost ??
    usage?.cost_details?.total_cost

  if (typeof rawCost === 'number' && Number.isFinite(rawCost)) return rawCost
  if (typeof rawCost === 'string') {
    const parsed = Number(rawCost)
    if (Number.isFinite(parsed)) return parsed
  }

  return undefined
}

export function costFromUsage(model: string, usage: any): number {
  const providerCost = parseProviderCost(usage)
  if (typeof providerCost === 'number' && Number.isFinite(providerCost)) return providerCost

  const promptTokens = usage?.prompt_tokens ?? usage?.promptTokens ?? 0
  const completionTokens = usage?.completion_tokens ?? usage?.completionTokens ?? 0
  return estimateCost(model, promptTokens, completionTokens)
}

// ─── Tracked generateObject (for Vercel AI SDK calls) ───────────────
export async function trackedGenerateObject<T>(
  generateFn: () => Promise<{ object: T; usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }>,
  model: string,
  meta: TrackingMeta,
): Promise<{ object: T }> {
  try {
    const result = await generateFn();
    const usage = result.usage ?? {};
    const promptTokens = usage.promptTokens ?? 0;
    const completionTokens = usage.completionTokens ?? 0;
    const totalTokens = usage.totalTokens ?? (promptTokens + completionTokens);

    await logUsage({
      meta,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      requestId: '',
      success: true,
    });

    return result;
  } catch (err: any) {
    await logUsage({
      meta,
      model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      requestId: '',
      success: false,
      errorMessage: err.message ?? 'generateObject failed',
    });
    throw err;
  }
}

// ─── Tracked generateText (for Vercel AI SDK generateText calls) ────
export async function trackedGenerateText<T>(
  generateFn: () => Promise<T & { usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }>,
  model: string,
  meta: TrackingMeta,
): Promise<T> {
  try {
    const result = await generateFn();
    const usage = (result as any).usage ?? {};
    const promptTokens = usage.promptTokens ?? 0;
    const completionTokens = usage.completionTokens ?? 0;
    const totalTokens = usage.totalTokens ?? (promptTokens + completionTokens);

    await logUsage({
      meta,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      requestId: '',
      success: true,
    });

    return result;
  } catch (err: any) {
    await logUsage({
      meta,
      model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      requestId: '',
      success: false,
      errorMessage: err.message ?? 'generateText failed',
    });
    throw err;
  }
}
