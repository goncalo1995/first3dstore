"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  GalleryVerticalEnd,
  ImageIcon,
  History,
  Loader2,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
  Layers,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { id } from "@instantdb/react";

const COST_STORAGE_KEY = "munzua-ai-image-studio-cost";
const HISTORY_STORAGE_KEY = "munzua-beta-history";
const MAX_REFERENCES = 4;
const MAX_HISTORY = 5;

type StudioTab = "generate" | "templates" | "history" | "gallery";
type TemplateKey = "kitchen" | "bedroom" | "meeting-room" | "storefront" | "free-reference";
type ImageSize = "1024x1024" | "1792x1024" | "1024x1792";
type ImageQuality = "standard" | "hd";
type CuratedModel = "dall-e-3" | "google/gemini-3.1-flash-image-preview" | "openai/gpt-image-1" | "openai/gpt-5.4-image-2";

type TemplateField = {
  key: string;
  label: string;
  placeholder: string;
  promptLabel: string;
  help?: string;
  multiline?: boolean;
};

type StudioTemplate = {
  key: TemplateKey;
  name: string;
  description: string;
  basePrompt: string;
  finalInstruction: string;
  negativePrompt: string;
  sourceImageHint: string;
  outputUse: string;
  recommendedModel: CuratedModel;
  defaultSize: ImageSize;
  defaultQuality: ImageQuality;
  fields: TemplateField[];
};

type ReferenceImage = {
  id: string;
  url: string;
  label: string;
  kind: "upload" | "url" | "generated" | "gallery";
};

type HistoryItem = {
  id: string;
  imageUrl: string;
  prompt: string;
  templateName: string;
  createdAt: string;
  cost: number;
};

type GalleryImage = {
  key: string;
  url: string;
  lastModified: string | null;
  folder?: string;
  fileName?: string;
};

const CURATED_MODELS: { value: CuratedModel; label: string; description: string }[] = [
  {
    value: "google/gemini-3.1-flash-image-preview",
    label: "Gemini Flash Image Preview",
    description: "Modelo recomendado para trabalhar a partir de renders e imagens de referência.",
  },
  {
    value: "dall-e-3",
    label: "DALL-E 3",
    description: "Boa opção para gerar imagem só a partir de texto.",
  },
  {
    value: "openai/gpt-image-1",
    label: "GPT Image 1",
    description: "Modelo de imagem OpenAI via OpenRouter.",
  },
  {
    value: "openai/gpt-5.4-image-2",
    label: "GPT 5.4 Image 2",
    description: "Modelo OpenAI para testes avançados de imagem.",
  },
];

const NEGATIVE_PROMPT =
  "distorcao de geometria, perspectiva errada, proporcoes incoerentes, texto ilegivel, marca de agua, baixa resolucao, imagem desfocada, pessoas deformadas, reflexos impossiveis, aspecto artificial, render falso, excesso de saturacao";

const SHARED_FIELDS: TemplateField[] = [
  {
    key: "spaceType",
    label: "Tipo de espaço",
    promptLabel: "Tipo de espaço",
    placeholder: "Ex.: cozinha aberta, suite principal, sala de reuniões, fachada de loja",
    help: "Opcional. Ajuda a orientar o tipo de ambiente.",
  },
  {
    key: "desiredStyle",
    label: "Estilo desejado",
    promptLabel: "Estilo desejado",
    placeholder: "Ex.: moderno, premium, minimalista, acolhedor, luxo discreto",
  },
  {
    key: "imageUse",
    label: "Uso da imagem",
    promptLabel: "Uso da imagem",
    placeholder: "Ex.: campanha, catálogo, apresentação ao cliente, redes sociais",
  },
  {
    key: "freeNotes",
    label: "Notas livres",
    promptLabel: "Notas livres",
    placeholder: "Ex.: manter a madeira clara, luz de fim de tarde, menos reflexos, mais vida no espaço",
    multiline: true,
  },
];

const TEMPLATES: StudioTemplate[] = [
  {
    key: "kitchen",
    name: "Cozinha Realista",
    description: "Transforma um render de cozinha numa imagem fotorealista para apresentação, catálogo ou campanha.",
    sourceImageHint: "Carregue o render 3D, screenshot ou imagem-base da cozinha. Quanto mais clara for a referência, melhor o resultado.",
    outputUse: "Apresentações a clientes, portefólio, redes sociais e material comercial.",
    recommendedModel: "google/gemini-3.1-flash-image-preview",
    defaultSize: "1792x1024",
    defaultQuality: "standard",
    basePrompt:
      "Transforma a imagem de referência numa fotografia realista de uma cozinha, mantendo o layout, volumes, materiais principais e intenção do design.",
    finalInstruction:
      "Criar uma imagem com luz natural convincente, materiais realistas, sombras credíveis, escala correcta e acabamento profissional de arquitectura/interiores.",
    negativePrompt: NEGATIVE_PROMPT,
    fields: SHARED_FIELDS,
  },
  {
    key: "bedroom",
    name: "Quarto / Suite",
    description: "Cria uma versão realista, acolhedora e comercial de um quarto, suite ou ambiente residencial.",
    sourceImageHint: "Carregue o render do quarto ou suite. Pode ser uma vista geral, perspectiva da cama ou zona de vestir.",
    outputUse: "Portefólio, apresentação imobiliária, decoração, hotelaria e campanhas residenciais.",
    recommendedModel: "google/gemini-3.1-flash-image-preview",
    defaultSize: "1792x1024",
    defaultQuality: "standard",
    basePrompt:
      "Transforma a imagem de referência numa fotografia realista de quarto ou suite, preservando a composição e o desenho do espaço.",
    finalInstruction:
      "A imagem deve parecer habitável, elegante e natural, com têxteis realistas, iluminação suave, materiais credíveis e ambiente acolhedor.",
    negativePrompt: NEGATIVE_PROMPT,
    fields: SHARED_FIELDS,
  },
  {
    key: "meeting-room",
    name: "Sala de Reuniões / Escritório",
    description: "Gera uma imagem realista de espaço corporativo para reuniões, apresentação, trabalho ou recepção.",
    sourceImageHint: "Carregue o render do escritório, sala de reuniões, recepção ou zona de trabalho.",
    outputUse: "Propostas comerciais, apresentação institucional, websites e campanhas B2B.",
    recommendedModel: "google/gemini-3.1-flash-image-preview",
    defaultSize: "1792x1024",
    defaultQuality: "standard",
    basePrompt:
      "Transforma a imagem de referência numa fotografia realista de um espaço corporativo, mantendo o desenho, proporções e intenção do projecto.",
    finalInstruction:
      "Criar uma imagem profissional, organizada e credível, com iluminação equilibrada, mobiliário realista, materiais coerentes e ambiente pronto para uso.",
    negativePrompt: NEGATIVE_PROMPT,
    fields: SHARED_FIELDS,
  },
  {
    key: "storefront",
    name: "Montra / Fachada de Loja",
    description: "Cria variações realistas para fachada, montra, interior comercial ou activação de marca.",
    sourceImageHint: "Carregue o render da fachada, montra ou interior da loja. Inclua a marca no prompt se for importante.",
    outputUse: "Campanhas, propostas para retalho, visual merchandising, lançamento de loja e redes sociais.",
    recommendedModel: "google/gemini-3.1-flash-image-preview",
    defaultSize: "1792x1024",
    defaultQuality: "standard",
    basePrompt:
      "Transforma a imagem de referência numa fotografia realista de loja, fachada ou montra, mantendo a arquitectura e o desenho comercial.",
    finalInstruction:
      "A imagem deve parecer pronta para campanha, com marca bem integrada quando indicada, iluminação de montra realista, escala correcta e composição atractiva.",
    negativePrompt: NEGATIVE_PROMPT,
    fields: SHARED_FIELDS,
  },
  {
    key: "free-reference",
    name: "Prompt Livre com Referência",
    description: "Use uma imagem de referência e escreva livremente o resultado pretendido.",
    sourceImageHint: "Carregue qualquer render ou imagem-base. Depois ajuste directamente o prompt final.",
    outputUse: "Exploração criativa, variações rápidas e pedidos específicos fora dos modelos comuns.",
    recommendedModel: "google/gemini-3.1-flash-image-preview",
    defaultSize: "1024x1024",
    defaultQuality: "standard",
    basePrompt:
      "Usa a imagem de referência como base visual e cria uma variação realista de acordo com as instruções abaixo.",
    finalInstruction:
      "Manter coerência visual, perspectiva credível, materiais realistas e resultado adequado para apresentação comercial.",
    negativePrompt: NEGATIVE_PROMPT,
    fields: SHARED_FIELDS,
  },
];

const TEMPLATE_BY_KEY = Object.fromEntries(TEMPLATES.map((template) => [template.key, template])) as Record<TemplateKey, StudioTemplate>;

function createDefaultFields(template: StudioTemplate) {
  return Object.fromEntries(template.fields.map((field) => [field.key, ""])) as Record<string, string>;
}

function buildTemplatePrompt(template: StudioTemplate, values: Record<string, string>) {
  const contextLines = template.fields
    .map((field) => {
      const value = values[field.key]?.trim();
      return value ? `${field.promptLabel}: ${value}.` : null;
    })
    .filter(Boolean);

  return [template.basePrompt, ...contextLines, template.finalInstruction].join("\n");
}

function formatRelativeTime(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return "agora mesmo";
  if (diffMinutes === 1) return "há 1 min";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  return diffHours === 1 ? "há 1 hora" : `há ${diffHours} horas`;
}

function roundCostUp(cost: number) {
  if (!Number.isFinite(cost) || cost <= 0) return 0;
  return Math.ceil(cost * 100) / 100;
}

function formatCost(cost: number) {
  return `$${(Number.isFinite(cost) ? cost : 0).toFixed(2)}`;
}

async function fetchMunzuaApi(input: RequestInfo | URL, init: RequestInit = {}) {
  const response = await fetch(input, {
    ...init,
    credentials: "same-origin",
  });

  if (response.status === 401 && typeof window !== "undefined") {
    window.location.href = "/munzua/login?next=/munzua";
  }

  return response;
}

function TemplateFields({
  template,
  values,
  onChange,
}: {
  template: StudioTemplate;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {template.fields.map((field) => (
        <div key={field.key} className={field.multiline ? "space-y-2 sm:col-span-2" : "space-y-2"}>
          <div className="space-y-1">
            <Label htmlFor={field.key}>
              {field.label} <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
          </div>
          {field.multiline ? (
            <Textarea
              id={field.key}
              value={values[field.key] ?? ""}
              onChange={(event) => onChange(field.key, event.target.value)}
              placeholder={field.placeholder}
              rows={3}
            />
          ) : (
            <Input
              id={field.key}
              value={values[field.key] ?? ""}
              onChange={(event) => onChange(field.key, event.target.value)}
              placeholder={field.placeholder}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function MunzuaBetaStudio() {
  const [activeTab, setActiveTab] = useState<StudioTab>("generate");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<TemplateKey>("kitchen");
  const selectedTemplate = TEMPLATE_BY_KEY[selectedTemplateKey];
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => createDefaultFields(selectedTemplate));
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [finalPromptDraft, setFinalPromptDraft] = useState(() => buildTemplatePrompt(selectedTemplate, createDefaultFields(selectedTemplate)));
  const [promptManuallyEdited, setPromptManuallyEdited] = useState(false);
  const [imageSize, setImageSize] = useState<ImageSize>(selectedTemplate.defaultSize);
  const [imageQuality, setImageQuality] = useState<ImageQuality>(selectedTemplate.defaultQuality);
  const [selectedModel, setSelectedModel] = useState<CuratedModel>(selectedTemplate.recommendedModel);
  const [advancedModelEnabled, setAdvancedModelEnabled] = useState(false);
  const [advancedModel, setAdvancedModel] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryFolders, setGalleryFolders] = useState<string[]>([]);
  const [galleryFolder, setGalleryFolder] = useState("__all__");
  const [gallerySaveFolder, setGallerySaveFolder] = useState("");
  const [deletingGalleryKey, setDeletingGalleryKey] = useState<string | null>(null);
  const [sessionCost, setSessionCost] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoPrompt = useMemo(() => buildTemplatePrompt(selectedTemplate, fieldValues), [fieldValues, selectedTemplate]);
  const promptIsEdited = finalPromptDraft.trim() !== autoPrompt.trim();
  const modelForRequest = advancedModelEnabled && advancedModel.trim() ? advancedModel.trim() : selectedModel;

  useEffect(() => {
    const storedCost = window.localStorage.getItem(COST_STORAGE_KEY);
    if (storedCost) {
      const parsedCost = Number(storedCost);
      if (Number.isFinite(parsedCost)) setSessionCost(parsedCost);
    }

    const storedHistory = window.sessionStorage.getItem(HISTORY_STORAGE_KEY);
    if (storedHistory) {
      try {
        const parsedHistory = JSON.parse(storedHistory) as HistoryItem[];
        if (Array.isArray(parsedHistory)) setHistory(parsedHistory.slice(0, MAX_HISTORY));
      } catch {
        window.sessionStorage.removeItem(HISTORY_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === "gallery") {
      fetchGallery();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "gallery") {
      fetchGallery();
    }
  }, [galleryFolder]);

  useEffect(() => {
    if (!promptManuallyEdited) {
      setFinalPromptDraft(autoPrompt);
    }
  }, [autoPrompt, promptManuallyEdited]);

  const selectTemplate = (templateKey: TemplateKey) => {
    const template = TEMPLATE_BY_KEY[templateKey];
    const defaultFields = createDefaultFields(template);
    setSelectedTemplateKey(templateKey);
    setFieldValues(defaultFields);
    setImageSize(template.defaultSize);
    setImageQuality(template.defaultQuality);
    setSelectedModel(template.recommendedModel);
    setAdvancedModelEnabled(false);
    setAdvancedModel("");
    setPromptManuallyEdited(false);
    setFinalPromptDraft(buildTemplatePrompt(template, defaultFields));
    setActiveTab("generate");
  };

  const updateField = (key: string, value: string) => {
    setFieldValues((currentValues) => ({ ...currentValues, [key]: value }));
  };

  const resetPromptToTemplate = () => {
    setPromptManuallyEdited(false);
    setFinalPromptDraft(autoPrompt);
  };

  const addCost = (cost: number) => {
    const roundedCost = roundCostUp(cost);
    setSessionCost((currentCost) => {
      const nextCost = Number((currentCost + roundedCost).toFixed(2));
      window.localStorage.setItem(COST_STORAGE_KEY, String(nextCost));
      return nextCost;
    });
    return roundedCost;
  };

  const resetCost = () => {
    window.localStorage.removeItem(COST_STORAGE_KEY);
    setSessionCost(0);
  };

  const setHistoryItems = (items: HistoryItem[]) => {
    const nextItems = items.slice(0, MAX_HISTORY);
    setHistory(nextItems);
    window.sessionStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextItems));
  };

  const addHistoryItem = (imageUrl: string, prompt: string, cost: number) => {
    const item: HistoryItem = {
      id: id(),
      imageUrl,
      prompt,
      templateName: selectedTemplate.name,
      createdAt: new Date().toISOString(),
      cost,
    };
    setHistoryItems([item, ...history]);
  };

  const deleteHistoryItem = (id: string) => {
    setHistoryItems(history.filter((item) => item.id !== id));
  };

  const clearHistory = () => {
    setHistoryItems([]);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const availableSlots = MAX_REFERENCES - references.length;
    const filesToRead = files.slice(0, availableSlots);

    filesToRead.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setError("Uma das imagens tem mais de 10MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setReferences((currentReferences) => {
          if (currentReferences.length >= MAX_REFERENCES) return currentReferences;
          return [
            ...currentReferences,
            {
              id: id(),
              url: reader.result as string,
              label: file.name,
              kind: "upload",
            },
          ];
        });
      };
      reader.onerror = () => setError("Não foi possível ler uma das imagens.");
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addReferenceUrl = () => {
    const trimmedUrl = referenceUrl.trim();
    if (!trimmedUrl || references.length >= MAX_REFERENCES) return;

    setReferences((currentReferences) => [
      ...currentReferences,
      {
        id: id(),
        url: trimmedUrl,
        label: "URL de referência",
        kind: "url",
      },
    ]);
    setReferenceUrl("");
  };

  const removeReference = (id: string) => {
    setReferences((currentReferences) => currentReferences.filter((reference) => reference.id !== id));
  };

  const useImageAsReference = (imageUrl: string, kind: ReferenceImage["kind"] = "generated") => {
    setReferences([
      {
        id: id(),
        url: imageUrl,
        label: kind === "gallery" ? "Imagem da galeria" : "Imagem gerada",
        kind,
      },
    ]);
    setActiveTab("generate");
  };

  const generateImage = async () => {
    const promptToSend = finalPromptDraft.trim();

    if (!promptToSend) {
      setError("Escreva ou ajuste o prompt antes de gerar.");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const endpoint = references.length > 0 ? "/api/ai/remix-image" : "/api/ai/generate-image";
      const body =
        references.length > 0
          ? {
              imageUrls: references.map((reference) => reference.url),
              instructions: promptToSend,
              negativePrompt: selectedTemplate.negativePrompt,
              size: imageSize,
              quality: imageQuality,
              model: modelForRequest,
            }
          : {
              prompt: promptToSend,
              negativePrompt: selectedTemplate.negativePrompt,
              size: imageSize,
              quality: imageQuality,
              model: modelForRequest,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível gerar a imagem.");

      const imageUrl = result.imageUrl || result.result?.imageUrl;
      if (!imageUrl) throw new Error("A resposta não trouxe uma imagem.");

      const realCost = Number.parseFloat(result.cost ?? result.result?.cost ?? "0");
      const roundedCost = addCost(Number.isFinite(realCost) ? realCost : 0);

      setGeneratedImage(imageUrl);
      setGeneratedPrompt(promptToSend);
      addHistoryItem(imageUrl, promptToSend, roundedCost);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo correu mal.");
    } finally {
      setLoading(false);
    }
  };

  const saveToGallery = async (imageUrl: string) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetchMunzuaApi("/api/munzua/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, folder: gallerySaveFolder }),
      });

      const savedImage = await response.json();
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Sessão expirada. Entre novamente para aceder à galeria."
            : savedImage.error || "Não foi possível guardar a imagem.",
        );
      }

      setGallery((currentGallery) => [savedImage, ...currentGallery]);
      setGalleryFolders((currentFolders) => {
        if (!savedImage.folder || currentFolders.includes(savedImage.folder)) return currentFolders;
        return [...currentFolders, savedImage.folder].sort();
      });
      setGalleryFolder(savedImage.folder || "__all__");
      setActiveTab("gallery");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível guardar a imagem.");
    } finally {
      setSaving(false);
    }
  };

  const fetchGallery = async () => {
    setGalleryLoading(true);
    setGalleryError(null);

    try {
      const folderQuery = galleryFolder !== "__all__" ? `?folder=${encodeURIComponent(galleryFolder)}` : "";
      const response = await fetchMunzuaApi(`/api/munzua/gallery${folderQuery}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Sessão expirada. Entre novamente para aceder à galeria."
            : result.error || "Não foi possível carregar a galeria.",
        );
      }
      setGallery(result.images ?? []);
      setGalleryFolders(result.folders ?? []);
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : "Não foi possível carregar a galeria.");
    } finally {
      setGalleryLoading(false);
    }
  };

  const deleteGalleryImage = async (key: string) => {
    if (!window.confirm("Apagar esta imagem da galeria partilhada?")) return;

    setDeletingGalleryKey(key);
    setGalleryError(null);

    try {
      const response = await fetchMunzuaApi("/api/munzua/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Sessão expirada. Entre novamente para aceder à galeria."
            : result.error || "Não foi possível apagar a imagem.",
        );
      }
      setGallery((currentGallery) => currentGallery.filter((item) => item.key !== key));
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : "Não foi possível apagar a imagem.");
    } finally {
      setDeletingGalleryKey(null);
    }
  };

  const downloadImage = (imageUrl: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `munzua-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Munzua Studio Beta</h2>
          <p className="text-sm text-muted-foreground">
            Imagens realistas a partir de renders 3D para interiores, arquitectura, lojas e campanhas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            Custo local: {formatCost(sessionCost)}
          </Badge>
          {sessionCost > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={resetCost}>
              Repor custo local
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as StudioTab)}>
        <TabsList className="grid w-full grid-cols-4 h-14">
          <TabsTrigger value="generate"><Sparkles className="h-4 w-4" /><span className="ml-2 hidden md:inline">Gerar</span></TabsTrigger>
          <TabsTrigger value="templates"><Layers className="h-4 w-4" /><span className="ml-2 hidden md:inline">Modelos</span></TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4" /><span className="ml-2 hidden md:inline">Histórico</span></TabsTrigger>
          <TabsTrigger value="gallery"><GalleryVerticalEnd className="h-4 w-4" /><span className="ml-2 hidden md:inline">Galeria</span></TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
            <div className="space-y-5">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Badge variant="outline">Modelo seleccionado</Badge>
                      <div>
                        <CardTitle>{selectedTemplate.name}</CardTitle>
                        <CardDescription>{selectedTemplate.description}</CardDescription>
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("templates")}>
                      Trocar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="font-medium">Melhor referência</p>
                      <p className="mt-1 text-muted-foreground">{selectedTemplate.sourceImageHint}</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="font-medium">Uso indicado</p>
                      <p className="mt-1 text-muted-foreground">{selectedTemplate.outputUse}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Contexto opcional</CardTitle>
                  <CardDescription>Preencha só o que fizer sentido. O resto fica livre no prompt final.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TemplateFields template={selectedTemplate} values={fieldValues} onChange={updateField} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">Imagens de referência</CardTitle>
                      <CardDescription>Opcional. Se adicionar imagens, o sistema usa-as como referência; se não adicionar, gera só pelo prompt.</CardDescription>
                    </div>
                    <Badge variant="outline">{references.length}/{MAX_REFERENCES}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={references.length >= MAX_REFERENCES}
                        className="sm:w-40"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Carregar
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="flex flex-1 gap-2">
                        <Input
                          value={referenceUrl}
                          onChange={(event) => setReferenceUrl(event.target.value)}
                          placeholder="https://exemplo.com/render.png"
                          disabled={references.length >= MAX_REFERENCES}
                        />
                        <Button type="button" variant="secondary" onClick={addReferenceUrl} disabled={references.length >= MAX_REFERENCES}>
                          Adicionar
                        </Button>
                      </div>
                    </div>

                    {references.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {references.map((reference) => (
                          <div key={reference.id} className="relative overflow-hidden rounded-md border bg-background">
                            <img src={reference.url} alt={reference.label} className="aspect-square w-full object-cover" />
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="absolute right-1 top-1 h-7 w-7"
                              onClick={() => removeReference(reference.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        Opcional. Se adicionar imagens, o sistema usa-as como referência; se não adicionar, gera só pelo prompt.
                      </div>
                    )}
                  </CardContent>
                </Card>

              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    <CardTitle className="text-lg">Definições</CardTitle>
                  </div>
                  <CardDescription>Os modelos já trazem valores recomendados, mas pode ajustar.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tamanho</Label>
                      <Select value={imageSize} onValueChange={(value) => setImageSize(value as ImageSize)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1024x1024">Quadrado (1024x1024)</SelectItem>
                          <SelectItem value="1792x1024">Horizontal (1792x1024)</SelectItem>
                          <SelectItem value="1024x1792">Vertical (1024x1792)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Qualidade</Label>
                      <Select value={imageQuality} onValueChange={(value) => setImageQuality(value as ImageQuality)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Normal</SelectItem>
                          <SelectItem value="hd">HD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Select value={selectedModel} onValueChange={(value) => setSelectedModel(value as CuratedModel)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURATED_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {CURATED_MODELS.find((model) => model.value === selectedModel)?.description}
                    </p>
                  </div>

                  <div className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label htmlFor="advanced-model">Modelo avançado</Label>
                        <p className="mt-1 text-xs text-muted-foreground">Use apenas se souber o código OpenRouter do modelo de imagem.</p>
                      </div>
                      <Switch id="advanced-model" checked={advancedModelEnabled} onCheckedChange={setAdvancedModelEnabled} />
                    </div>
                    {advancedModelEnabled && (
                      <Input
                        className="mt-3"
                        value={advancedModel}
                        onChange={(event) => setAdvancedModel(event.target.value)}
                        placeholder="fornecedor/modelo"
                      />
                    )}
                  </div> */}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5" />
                        Prompt final
                      </CardTitle>
                      <CardDescription>Este é o texto enviado para gerar a imagem. Pode editar livremente.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {promptIsEdited && <Badge variant="secondary">Texto editado</Badge>}
                      <Button type="button" variant="outline" size="sm" onClick={resetPromptToTemplate}>
                        Repor texto
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={finalPromptDraft}
                    onChange={(event) => {
                      setFinalPromptDraft(event.target.value);
                      setPromptManuallyEdited(true);
                    }}
                    placeholder="Descreva a imagem que pretende gerar..."
                    rows={12}
                    className="min-h-[260px] text-sm leading-6"
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      A enviar com <span className="font-medium text-foreground">{modelForRequest}</span>
                    </p>
                    <Button type="button" size="lg" onClick={generateImage} disabled={loading} className="sm:min-w-56">
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          A gerar...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          {references.length > 0 ? "Gerar com imagens" : "Gerar só com prompt"}
                        </>
                      )}
                    </Button>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle>Resultado</CardTitle>
                  <CardDescription>A última imagem gerada aparece aqui.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {generatedImage ? (
                    <>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <img src={generatedImage} alt="Imagem gerada" className="max-h-[560px] w-full rounded-md object-contain" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gallery-save-folder">Pasta da galeria</Label>
                        <Input
                          id="gallery-save-folder"
                          value={gallerySaveFolder}
                          onChange={(event) => setGallerySaveFolder(event.target.value)}
                          placeholder="ex.: cozinhas/cliente-a"
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Button variant="outline" onClick={() => downloadImage(generatedImage)}>
                          <Download className="mr-2 h-4 w-4" />
                          Transferir
                        </Button>
                        <Button variant="outline" onClick={() => useImageAsReference(generatedImage)}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Ajustar
                        </Button>
                        <Button onClick={() => saveToGallery(generatedImage)} disabled={saving}>
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Guardar
                        </Button>
                      </div>
                      {generatedPrompt && (
                        <div className="border-t pt-3 text-xs text-muted-foreground">
                          <p className="mb-1 font-medium text-foreground">Prompt enviado</p>
                          <p className="line-clamp-4">{generatedPrompt}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border-2 border-dashed text-center text-muted-foreground">
                      <ImageIcon className="mb-3 h-12 w-12 opacity-50" />
                      <p>A imagem gerada aparece aqui</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid gap-4 md:grid-cols-2">
            {TEMPLATES.map((template) => (
              <Card key={template.key} className={selectedTemplateKey === template.key ? "border-primary" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle>{template.name}</CardTitle>
                    <Badge variant={selectedTemplateKey === template.key ? "default" : "outline"}>
                      {template.defaultSize}
                    </Badge>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 text-sm">
                    <div>
                      <p className="font-medium">Melhor referência</p>
                      <p className="mt-1 text-muted-foreground">{template.sourceImageHint}</p>
                    </div>
                    <div>
                      <p className="font-medium">Uso indicado</p>
                      <p className="mt-1 text-muted-foreground">{template.outputUse}</p>
                    </div>
                    <div>
                      <p className="font-medium">Modelo padrão</p>
                      <p className="mt-1 text-muted-foreground">{template.recommendedModel}</p>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => selectTemplate(template.key)}>
                    Usar modelo
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Histórico local</h3>
              <p className="text-sm text-muted-foreground">
                O histórico fica apenas neste navegador. Guarde na galeria ou transfira para manter a imagem.
              </p>
            </div>
            {history.length > 0 && (
              <Button variant="outline" onClick={clearHistory}>
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar histórico
              </Button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border-2 border-dashed text-center text-muted-foreground">
              <ImageIcon className="mb-3 h-10 w-10 opacity-50" />
              <p>Ainda não há imagens no histórico</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {history.map((item) => (
                <Card key={item.id}>
                  <CardContent className="space-y-3 p-3">
                    <img src={item.imageUrl} alt={item.templateName} className="aspect-square w-full rounded-md object-cover" />
                    <div>
                      <p className="font-medium">{item.templateName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(item.createdAt)} · {formatCost(item.cost)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => useImageAsReference(item.imageUrl)}>
                        Ajustar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => downloadImage(item.imageUrl)}>
                        Transferir
                      </Button>
                      <Button size="sm" onClick={() => saveToGallery(item.imageUrl)} disabled={saving}>
                        Guardar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteHistoryItem(item.id)}>
                        Apagar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="gallery" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Galeria partilhada</h3>
              <p className="text-sm text-muted-foreground">As imagens guardadas ficam disponíveis para todos os utilizadores beta.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={fetchGallery} disabled={galleryLoading}>
                {galleryLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar
              </Button>
            </div>
          </div>

          {galleryError && (
            <Alert variant="destructive">
              <AlertDescription>{galleryError}</AlertDescription>
            </Alert>
          )}

          {galleryLoading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : gallery.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border-2 border-dashed text-center text-muted-foreground">
              <ImageIcon className="mb-3 h-10 w-10 opacity-50" />
              <p>Ainda não há imagens guardadas na galeria</p>
            </div>
          ) : (
            <div className="columns-1 gap-4 md:columns-2 xl:columns-3 2xl:columns-4">
              {gallery.map((item) => (
                <Card key={item.key} className="mb-4 break-inside-avoid overflow-hidden">
                  <CardContent className="space-y-3 p-3">
                    <img src={item.url} alt="Imagem da galeria" className="h-auto w-full rounded-md object-contain" />
                    <div className="space-y-1">
                      {item.folder && <Badge variant="secondary">{item.folder}</Badge>}
                      <p className="truncate text-xs text-muted-foreground">{item.fileName ?? item.key.split('/').pop() ?? item.key}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => useImageAsReference(item.url, "gallery")}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Ajustar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => downloadImage(item.url)}>
                        <Download className="mr-2 h-4 w-4" />
                        Transferir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteGalleryImage(item.key)}
                        disabled={deletingGalleryKey === item.key}
                        className="col-span-2"
                      >
                        {deletingGalleryKey === item.key ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Apagar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
