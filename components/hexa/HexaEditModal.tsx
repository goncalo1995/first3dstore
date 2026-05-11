// components/hexa/HexaEditModal.tsx
'use client'

import { ChangeEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { type HexaTile, type HexaColor } from '@/types/hexa'

interface HexaEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tile: HexaTile | undefined
  availableColors: { name: string; hex: string }[]
  onUpdate: (patch: Partial<HexaTile>) => void
  onPhotoUpload: (file: File) => void
}

export function HexaEditModal({
  open,
  onOpenChange,
  tile,
  availableColors,
  onUpdate,
  onPhotoUpload,
}: HexaEditModalProps) {
  if (!tile) return null

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onPhotoUpload(file)
    e.target.value = ''
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar peça</DialogTitle>
          <DialogDescription id="edit-description" className="sr-only">
            Ajuste a fotografia e as cores da peça.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Fotografia">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-[#cdbb9e] bg-card px-3 py-4 text-sm font-semibold text-[#6c5f50] hover:border-primary">
              <ImagePlus className="size-4" />
              {tile.photoName || 'Carregar JPG/PNG até 5MB'}
              <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
            </label>
          </Field>

          {tile.photoPreviewUrl && (
            <>
              <Field label={`Zoom: ${Math.round(tile.photoAdjustments.zoom * 100)}%`}>
                <Slider
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={[tile.photoAdjustments.zoom]}
                  onValueChange={(val) => onUpdate({ photoAdjustments: { ...tile.photoAdjustments, zoom: val[0] ?? 1 } })}
                />
              </Field>
              <Field label={`Offset X: ${Math.round(tile.photoAdjustments.offsetX * 100)}%`}>
                <Slider
                  min={-0.2}
                  max={0.2}
                  step={0.01}
                  value={[tile.photoAdjustments.offsetX]}
                  onValueChange={(val) => onUpdate({ photoAdjustments: { ...tile.photoAdjustments, offsetX: val[0] ?? 0 } })}
                />
              </Field>
              <Field label={`Offset Y: ${Math.round(tile.photoAdjustments.offsetY * 100)}%`}>
                <Slider
                  min={-0.2}
                  max={0.2}
                  step={0.01}
                  value={[tile.photoAdjustments.offsetY]}
                  onValueChange={(val) => onUpdate({ photoAdjustments: { ...tile.photoAdjustments, offsetY: val[0] ?? 0 } })}
                />
              </Field>
            </>
          )}

          <Field label="Cor da moldura">
            <Select value={tile.color} onValueChange={(value) => onUpdate({ color: value as HexaColor })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableColors.map((color) => (
                  <SelectItem key={color.name} value={color.name}>{color.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Componente Field simples
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#766c61]">{label}</Label>
      {children}
    </div>
  )
}