'use client'

import { FormEvent, useState } from 'react'
import { Loader2, Pencil, Plus, Save, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db, id } from '@/lib/db'
import { defaultGlobalColors, type GlobalColor } from '@/lib/products'
import type { ColorRecord } from '../types'

export function mergeColors(records?: ColorRecord[]) {
  const byName = new Map(defaultGlobalColors.map(color => [color.name, color]))
  records?.forEach(color => byName.set(color.name, color))
  return [...byName.values()]
}

export function ColorManager({ colors }: { colors: ColorRecord[] }) {
  const [name, setName] = useState('')
  const [hex, setHex] = useState('#1B6B45')
  const [gramsAvailable, setGramsAvailable] = useState('1000')
  const [editingColor, setEditingColor] = useState<ColorRecord | null>(null)
  const [colorDraft, setColorDraft] = useState({
    name: '',
    hex: '#1B6B45',
    gramsAvailable: '0',
    spoolStatus: 'available' as GlobalColor['spoolStatus'],
    supplierUrl: '',
    pricePerKg: '',
    notes: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const seedDefaults = async () => {
    setIsSaving(true)
    await db.transact(
      defaultGlobalColors.map(color =>
        db.tx.globalColors[id()].update({
          name: color.name,
          hex: color.hex,
          gramsAvailable: color.gramsAvailable,
          spoolStatus: color.spoolStatus,
          supplierUrl: color.supplierUrl ?? '',
          pricePerKg: color.pricePerKg ?? 0,
          notes: color.notes ?? '',
          updatedAt: new Date(),
        }),
      ),
    )
    setIsSaving(false)
  }

  const addColor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    await db.transact(
      db.tx.globalColors[id()].update({
        name,
        hex,
        gramsAvailable: Number(gramsAvailable) || 0,
        spoolStatus: 'available',
        supplierUrl: '',
        pricePerKg: 0,
        notes: '',
        updatedAt: new Date(),
      }),
    )
    setName('')
    setHex('#1B6B45')
    setGramsAvailable('1000')
    setIsSaving(false)
  }

  const openColorEditor = (color: ColorRecord) => {
    setEditingColor(color)
    setColorDraft({
      name: color.name,
      hex: color.hex,
      gramsAvailable: String(color.gramsAvailable),
      spoolStatus: color.spoolStatus,
      supplierUrl: color.supplierUrl ?? '',
      pricePerKg: color.pricePerKg ? String(color.pricePerKg) : '',
      notes: color.notes ?? '',
    })
  }

  const saveColor = async () => {
    if (!editingColor) return
    setIsSaving(true)
    await db.transact(
      db.tx.globalColors[editingColor.id].update({
        name: colorDraft.name,
        hex: colorDraft.hex,
        gramsAvailable: Number(colorDraft.gramsAvailable) || 0,
        spoolStatus: colorDraft.spoolStatus,
        supplierUrl: colorDraft.supplierUrl,
        pricePerKg: colorDraft.pricePerKg ? Number(colorDraft.pricePerKg) || 0 : 0,
        notes: colorDraft.notes,
        updatedAt: new Date(),
      }),
    )
    setIsSaving(false)
    setEditingColor(null)
  }

  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Spool Colors</h2>
          <p className="text-sm text-muted-foreground">Global colors you can assign to individual products.</p>
        </div>
        {colors.length === 0 && (
          <Button type="button" variant="outline" onClick={seedDefaults} disabled={isSaving}>
            Seed default colors
          </Button>
        )}
      </div>

      <form onSubmit={addColor} className="mb-4 grid gap-3 md:grid-cols-[1fr_140px_140px_auto]">
        <Input value={name} onChange={event => setName(event.target.value)} placeholder="Color name" required />
        <Input type="color" value={hex} onChange={event => setHex(event.target.value)} aria-label="Color hex" />
        <Input
          type="number"
          min="0"
          value={gramsAvailable}
          onChange={event => setGramsAvailable(event.target.value)}
          placeholder="Grams"
          aria-label="Available grams"
        />
        <Button type="submit" disabled={isSaving}>
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </form>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {colors.map(color => (
          <div key={color.name} className="flex items-center gap-3 rounded-lg border border-border bg-secondary p-3">
            <span className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: color.hex }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{color.name}</p>
              <p className="text-xs text-muted-foreground">{color.hex} · {color.gramsAvailable}g</p>
            </div>
            {'id' in color && (
              <Button type="button" variant="outline" size="sm" onClick={() => openColorEditor(color)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        ))}
      </div>

      {editingColor && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="w-full rounded-t-lg border border-border bg-background p-4 shadow-xl sm:mx-auto sm:max-w-lg sm:rounded-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Edit spool color</h3>
                <p className="text-sm text-muted-foreground">Changes are saved only when you confirm.</p>
              </div>
              <button type="button" onClick={() => setEditingColor(null)} className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close color editor">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3">
              <div>
                <Label htmlFor="color-name">Name</Label>
                <Input id="color-name" value={colorDraft.name} onChange={event => setColorDraft(current => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="grid grid-cols-[90px_1fr] gap-3">
                <div>
                  <Label htmlFor="color-hex">Hex</Label>
                  <Input id="color-hex" type="color" value={colorDraft.hex} onChange={event => setColorDraft(current => ({ ...current, hex: event.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="color-grams">Available grams</Label>
                  <Input id="color-grams" type="number" min="0" value={colorDraft.gramsAvailable} onChange={event => setColorDraft(current => ({ ...current, gramsAvailable: event.target.value }))} />
                </div>
              </div>
              <div>
                <Label htmlFor="color-status">Status</Label>
                <select id="color-status" value={colorDraft.spoolStatus} onChange={event => setColorDraft(current => ({ ...current, spoolStatus: event.target.value as GlobalColor['spoolStatus'] }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="available">Available</option>
                  <option value="low">Low</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <Label htmlFor="color-url">Supplier URL</Label>
                <Input id="color-url" value={colorDraft.supplierUrl} onChange={event => setColorDraft(current => ({ ...current, supplierUrl: event.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label htmlFor="color-price">Price per kg</Label>
                <Input id="color-price" type="number" min="0" step="0.01" value={colorDraft.pricePerKg} onChange={event => setColorDraft(current => ({ ...current, pricePerKg: event.target.value }))} />
              </div>
              <div>
                <Label htmlFor="color-notes">Notes</Label>
                <Input id="color-notes" value={colorDraft.notes} onChange={event => setColorDraft(current => ({ ...current, notes: event.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingColor(null)}>Cancel</Button>
              <Button type="button" onClick={saveColor} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save color
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
