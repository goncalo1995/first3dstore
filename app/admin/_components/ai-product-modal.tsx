// components/AIProductModal.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Image as ImageIcon, RefreshCw, Check, CheckCircle2, Target, Type, FileText, Tag, Euro, Package, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAIActions, AIActionType } from '@/hooks/useAIActions';
import { db, id } from '@/lib/db';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface AIProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  onApplyResult?: (result: any, action: AIActionType, selectedFields: string[]) => void;
}

const GOALS = [
  { id: 'conversion', label: 'High Conversion', description: 'Persuasive copy to drive sales.', icon: Target },
  { id: 'seo', label: 'SEO Optimization', description: 'Focus on keywords and search visibility.', icon: Tag },
  { id: 'technical', label: 'Technical Detail', description: 'Focus on materials, specs, and precision.', icon: Package },
  { id: 'creative', label: 'Creative Storytelling', description: 'Focus on the "Why" and the lifestyle.', icon: Sparkles },
]

const FIELDS = [
  { id: 'name', label: 'Product Name', icon: Type },
  { id: 'description', label: 'Long Description', icon: FileText },
  { id: 'benefit', label: 'Card Benefit', icon: Sparkles },
  { id: 'category', label: 'Category', icon: Tag },
  { id: 'priceFrom', label: 'Price From', icon: Euro },
]

export function AIProductModal({ open, onOpenChange, product, onApplyResult }: AIProductModalProps) {
  const [extraInstructions, setExtraInstructions] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [imageUrlOrFile, setImageUrlOrFile] = useState('');
  const [remixInstructions, setRemixInstructions] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [goal, setGoal] = useState('conversion');
  const [selectedFields, setSelectedFields] = useState<string[]>(['name', 'description', 'benefit']);
  const [isUploading, setIsUploading] = useState(false);

  const {
    activeAction,
    setActiveAction,
    loading,
    result,
    error,
    generateImprovements,
    generateMarketing,
    generateNewImage,
    remixExistingImage,
  } = useAIActions({ product });

  const handleGenerate = async () => {
    let res;
    const combinedInstructions = `Goal: ${goal}. ${extraInstructions}`;
    switch (activeAction) {
      case 'improvements':
        res = await generateImprovements(combinedInstructions);
        break;
      case 'marketing':
        res = await generateMarketing(combinedInstructions, targetAudience);
        break;
      case 'generateImage':
        res = await generateNewImage(imagePrompt, negativePrompt, imageSize);
        break;
      case 'remixImage':
        const imageSource = uploadedImage || imageUrlOrFile;
        if (!imageSource) return;
        res = await remixExistingImage(imageSource, remixInstructions);
        break;
    }
  };

  const handleApply = (data: any, action: AIActionType) => {
    if (onApplyResult) onApplyResult(data, action, selectedFields);
    onOpenChange(false);
  };

  const uploadAndUse = async (url: string) => {
    setIsUploading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], `ai-product-${product.slug || id()}.png`, { type: 'image/png' });
      const storagePath = `products/${product.slug || id()}/${id()}.png`;
      
      await db.storage.uploadFile(storagePath, file);
      const downloadUrl = await db.storage.getDownloadUrl(storagePath);
      
      if (onApplyResult) onApplyResult(downloadUrl, 'generateImage', ['image']);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to upload AI image:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Product Studio – {product.name}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeAction} onValueChange={(v) => setActiveAction(v as AIActionType)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="improvements">💡 Improvements</TabsTrigger>
            <TabsTrigger value="marketing">📝 Marketing</TabsTrigger>
            <TabsTrigger value="generateImage">🖼️ Generate Image</TabsTrigger>
            <TabsTrigger value="remixImage">🎨 Remix Image</TabsTrigger>
          </TabsList>

          {/* Improvements Tab */}
          <TabsContent value="improvements" className="space-y-6 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Goal</Label>
                  <div className="grid gap-2">
                    {GOALS.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setGoal(g.id)}
                        className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                          goal === g.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-secondary/50'
                        }`}
                      >
                        <g.icon className={`mt-0.5 h-4 w-4 ${goal === g.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="text-sm font-semibold">{g.label}</p>
                          <p className="text-xs text-muted-foreground">{g.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Fields to Update</Label>
                  <div className="grid gap-2 rounded-lg border border-border bg-secondary/20 p-3">
                    {FIELDS.map((f) => (
                      <div key={f.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`field-${f.id}`}
                          checked={selectedFields.includes(f.id)}
                          onCheckedChange={(checked) => {
                            setSelectedFields(prev => 
                              checked 
                                ? [...prev, f.id] 
                                : prev.filter(id => id !== f.id)
                            )
                          }}
                        />
                        <Label htmlFor={`field-${f.id}`} className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                          <f.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {f.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Context / Instructions</Label>
                  <Textarea
                    placeholder="e.g. Focus on the durability for golf use, mention 3D printing precision..."
                    value={extraInstructions}
                    onChange={(e) => setExtraInstructions(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={loading} className="w-full h-12 shadow-sm">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Suggestions...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Optimized Suggestions
                </>
              )}
            </Button>

            {result && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Proposed Improvements</h3>
                  <Button size="sm" onClick={() => handleApply(result, 'improvements')}>
                    Apply Selected Fields
                  </Button>
                </div>
                <div className="grid gap-3">
                  {result.map((item: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-border bg-background p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-foreground">{item.title}</h4>
                          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <Badge variant={item.impact === 'High' ? 'default' : 'secondary'}>{item.impact} Impact</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Marketing Tab */}
          <TabsContent value="marketing" className="space-y-6 pt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Input
                    placeholder="e.g. Amateur golfers, tournament organizers"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Writing Goal</Label>
                  <div className="grid gap-2">
                    {GOALS.slice(0, 2).map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setGoal(g.id)}
                        className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                          goal === g.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-secondary/50'
                        }`}
                      >
                        <g.icon className={`mt-0.5 h-4 w-4 ${goal === g.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="text-sm font-semibold">{g.label}</p>
                          <p className="text-xs text-muted-foreground">{g.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Fields to Generate</Label>
                  <div className="grid gap-2 rounded-lg border border-border bg-secondary/20 p-3">
                    {FIELDS.slice(0, 3).map((f) => (
                      <div key={f.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`m-field-${f.id}`}
                          checked={selectedFields.includes(f.id)}
                          onCheckedChange={(checked) => {
                            setSelectedFields(prev => 
                              checked 
                                ? [...prev, f.id] 
                                : prev.filter(id => id !== f.id)
                            )
                          }}
                        />
                        <Label htmlFor={`m-field-${f.id}`} className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                          <f.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {f.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tone / Keywords</Label>
                  <Textarea
                    placeholder="e.g. Enthusiastic, professional, mention 'handmade in Portugal'..."
                    value={extraInstructions}
                    onChange={(e) => setExtraInstructions(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={loading} className="w-full h-12 shadow-sm">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Writing Marketing Copy...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Marketing Content
                </>
              )}
            </Button>

            {result && (
              <div className="mt-6 space-y-4 rounded-xl border border-border bg-secondary/10 p-6">
                <div className="flex items-center justify-between border-b border-border/50 pb-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Generated Content
                  </h3>
                  <Button size="sm" onClick={() => handleApply(result, 'marketing')}>
                    Apply Result
                  </Button>
                </div>
                <div className="space-y-4 pt-2">
                  {result.title && (
                    <div>
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Title</Label>
                      <p className="text-sm font-semibold">{result.title}</p>
                    </div>
                  )}
                  {result.shortDescription && (
                    <div>
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Short Description</Label>
                      <p className="text-sm italic">{result.shortDescription}</p>
                    </div>
                  )}
                  {result.longDescription && (
                    <div>
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Long Description</Label>
                      <p className="text-sm leading-relaxed text-muted-foreground">{result.longDescription}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Generate Image Tab */}
          <TabsContent value="generateImage" className="space-y-4">
            <Textarea
              placeholder="Describe the image you want (e.g., 'white PLA dragon with green eyes, studio lighting, pure white background')"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              rows={3}
            />
            <Input
              placeholder="Negative prompt (things to avoid)"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
            />
            <select value={imageSize} onChange={(e) => setImageSize(e.target.value)} className="w-full border rounded p-2">
              <option value="1024x1024">Square (1024x1024)</option>
              <option value="1792x1024">Landscape (1792x1024)</option>
              <option value="1024x1792">Portrait (1024x1792)</option>
            </select>
            <Button onClick={handleGenerate} disabled={loading || !imagePrompt} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Image...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Generate Image
                </>
              )}
            </Button>
            {result?.url && (
              <div className="mt-6 space-y-4">
                <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-border shadow-xl">
                  <img src={result.url} alt="Generated" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                <Button 
                  onClick={() => uploadAndUse(result.url)} 
                  disabled={isUploading} 
                  className="w-full h-11 bg-primary hover:bg-primary/90"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving to Database...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Upload and use this image
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Remix Image Tab */}
          <TabsContent value="remixImage" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload image or provide URL</label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
              <Input
                placeholder="Or paste image URL"
                value={imageUrlOrFile}
                onChange={(e) => setImageUrlOrFile(e.target.value)}
              />
            </div>
            {uploadedImage && (
              <div className="relative">
                <img src={uploadedImage} alt="To remix" className="max-h-32 rounded border" />
                <button className="absolute top-0 right-0 bg-black/50 text-white rounded p-1" onClick={() => setUploadedImage(null)}>✕</button>
              </div>
            )}
            <Textarea
              placeholder="Instructions for remix (e.g., 'change color to white with green letters, add wood texture background')"
              value={remixInstructions}
              onChange={(e) => setRemixInstructions(e.target.value)}
              rows={2}
            />
            <Button onClick={handleGenerate} disabled={loading || (!uploadedImage && !imageUrlOrFile) || !remixInstructions} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Remixing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Remix Image
                </>
              )}
            </Button>
            {result?.imageUrl && (
              <div className="mt-6 space-y-4">
                <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-border shadow-xl">
                  <img src={result.imageUrl} alt="Remixed" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-black/60 p-3 text-[10px] text-white backdrop-blur-md">
                    <p className="font-bold uppercase tracking-widest mb-1 opacity-70">AI Remix Prompt</p>
                    <p className="line-clamp-2 italic">{result.newPrompt}</p>
                  </div>
                </div>
                <Button 
                  onClick={() => uploadAndUse(result.imageUrl)} 
                  disabled={isUploading} 
                  className="w-full h-11"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving to Database...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Upload and use remixed image
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && <div className="text-destructive text-sm mt-4">Error: {error}</div>}
      </DialogContent>
    </Dialog>
  );
}
