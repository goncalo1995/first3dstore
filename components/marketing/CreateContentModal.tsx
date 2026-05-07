// components/CreateContentModal.tsx
"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles } from 'lucide-react';
import { CatalogRecord } from '@/app/admin/types';

export function CreateContentModal({ open, onClose, products }: { open: boolean, onClose: () => void, products: CatalogRecord[] }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    type: 'post',
    platform: 'instagram',
    title: '',
    caption: '',
    hashtags: '',
    cta: '',
    mediaUrls: [] as string[],
    scheduledFor: '',
  });

  const handleAIGenerate = async () => {
    if (!form.productId) return;

    setLoading(true);
    try {
      const product = products.find(p => p.slug === form.productId);
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          data: {
            product,
            type: form.type,
            platform: form.platform,
          },
        }),
      });
      const generated = await res.json();
      setForm(prev => ({
        ...prev,
        caption: generated.caption,
        hashtags: generated.hashtags.join(' '),
        cta: generated.cta || '',
        title: generated.title || `${product?.name} - ${form.type}`,
      }));
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Save to database
    await fetch('/api/marketing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        data: {
          ...form,
          hashtags: form.hashtags.split(' ').filter(t => t.startsWith('#')),
        },
      }),
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Social Content</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Product</Label>
              <Select value={form.productId} onValueChange={(v) => setForm({...form, productId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Content Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({...form, type: v as any})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post">Post</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="reel">Reel</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Platform</Label>
            <Select value={form.platform} onValueChange={(v) => setForm({...form, platform: v as any})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="pinterest">Pinterest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Title (internal)</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({...form, title: e.target.value})}
              placeholder="e.g., Dragon Launch - Instagram"
            />
          </div>

          <Button
            onClick={handleAIGenerate}
            disabled={!form.productId || loading}
            variant="outline"
            className="w-full"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate with AI
          </Button>

          <div>
            <Label>Caption</Label>
            <Textarea
              value={form.caption}
              onChange={(e) => setForm({...form, caption: e.target.value})}
              rows={4}
              placeholder="Write your caption here..."
            />
          </div>

          <div>
            <Label>Hashtags (space separated)</Label>
            <Input
              value={form.hashtags}
              onChange={(e) => setForm({...form, hashtags: e.target.value})}
              placeholder="#3dprinting #dragon"
            />
          </div>

          <div>
            <Label>Call to Action (optional)</Label>
            <Input
              value={form.cta}
              onChange={(e) => setForm({...form, cta: e.target.value})}
              placeholder="Link in bio / Shop now / Comment below"
            />
          </div>

          <div>
            <Label>Media URLs (one per line)</Label>
            <Textarea
              value={form.mediaUrls.join('\n')}
              onChange={(e) => setForm({...form, mediaUrls: e.target.value.split('\n').filter(u => u)})}
              rows={2}
              placeholder="https://example.com/image1.jpg"
            />
          </div>

          <div>
            <Label>Schedule for (optional)</Label>
            <Input
              type="datetime-local"
              value={form.scheduledFor}
              onChange={(e) => setForm({...form, scheduledFor: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save as Draft</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
