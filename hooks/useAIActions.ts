"use client";

// hooks/useAIActions.ts
import { useState } from 'react';

export type AIActionType = 'improvements' | 'marketing' | 'generateImage' | 'remixImage';

interface UseAIActionsProps {
  product: {
    id: string;
    name: string;
    description: string;
    material?: string;
    category?: string;
    colors?: string[];
    imageUrl?: string;
  };
}

export function useAIActions({ product }: UseAIActionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<AIActionType>('improvements');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const callApi = async (action: AIActionType, payload: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, product, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
      return data.result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateImprovements = async (extraInstructions?: string) => {
    return callApi('improvements', { extraInstructions });
  };

  const generateMarketing = async (extraInstructions?: string, targetAudience?: string) => {
    return callApi('marketing', { extraInstructions, targetAudience });
  };

  const generateNewImage = async (prompt: string, negativePrompt?: string, size?: string) => {
    return callApi('generateImage', { prompt, negativePrompt, size });
  };

  const remixExistingImage = async (imageUrl: string, instructions: string) => {
    return callApi('remixImage', { imageUrl, instructions });
  };

  return {
    isModalOpen,
    setIsModalOpen,
    activeAction,
    setActiveAction,
    loading,
    result,
    error,
    generateImprovements,
    generateMarketing,
    generateNewImage,
    remixExistingImage,
  };
}