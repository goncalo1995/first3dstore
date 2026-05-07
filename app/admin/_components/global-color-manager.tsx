'use client'

import { useState } from 'react'
import { Plus, Paintbrush, AlertTriangle, CheckCircle2, XCircle, Search, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { db, id } from '@/lib/db'
import { archiveGlobalColor } from '@/app/admin/production/actions'
import type { GlobalColorRecord } from '@/app/admin/types'

interface GlobalColorManagerProps {
  colors: GlobalColorRecord[]
  products: any[]
}

export function GlobalColorManager({ colors, products }: GlobalColorManagerProps) {
  const [search, setSearch] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingColor, setEditingColor] = useState<GlobalColorRecord | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const [form, setForm] = useState({
    name: '',
    hex: '#000000',
  })

  const filteredColors = colors?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async () => {
    if (!form.name || !form.hex) return toast.error('Name and Hex are required')
    setIsSaving(true)
    try {
      const colorId = editingColor?.id ?? id()
      await db.transact(
        db.tx.globalColors[colorId].update({
          ...form,
          isActive: true,
          spoolStatus: editingColor?.spoolStatus ?? 'available',
          gramsAvailable: editingColor?.gramsAvailable ?? 0,
          updatedAt: new Date(),
        })
      )
      toast.success(editingColor ? 'Color updated' : 'Color created')
      setIsAdding(false)
      setEditingColor(null)
      setForm({ name: '', hex: '#000000' })
    } catch (err: any) {
      toast.error(err.message)
    }
    setIsSaving(false)
  }

  const handleArchive = async (color: GlobalColorRecord) => {
    const confirmMsg = `Are you sure you want to archive ${color.name}? 
    It will be hidden from new product configurations but existing jobs will remain usable.`
    
    if (!confirm(confirmMsg)) return

    try {
      const result = await archiveGlobalColor(color.id)
      if (result.warned) {
        toast.warning(`${color.name} archived, but note: there are still ${result.activeSpoolCount} active physical spools of this color.`)
      } else {
        toast.success(`${color.name} archived`)
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const getProductDependencies = (colorName: string) => {
    return products.filter(p => {
      const usesInRecipe = p.materialRecipe?.some((r: any) => r.label.toLowerCase().includes(colorName.toLowerCase()))
      const usesInVariants = p.variants?.some((v: any) => v.colors?.some((vc: any) => vc.colorName === colorName))
      return usesInRecipe || usesInVariants
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Global Color Catalog</h2>
          <p className="text-sm text-muted-foreground">Define and manage the master list of colors offered across the shop.</p>
        </div>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Color
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search colors..." 
            className="pl-10" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!filteredColors ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            No colors found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredColors.map(color => {
            const dependencies = getProductDependencies(color.name)
            const isActive = color.isActive !== false
            
            return (
              <Card key={color.id} className={!isActive ? 'opacity-60 bg-muted/20' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-10 w-10 rounded-lg border shadow-inner" 
                        style={{ backgroundColor: color.hex }} 
                      />
                      <div>
                        <h4 className="font-bold">{color.name}</h4>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">{color.hex}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingColor(color)
                          setForm({ name: color.name, hex: color.hex })
                          setIsAdding(true)
                        }}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className={isActive ? 'text-destructive' : 'text-emerald-600'}
                          onClick={() => isActive ? handleArchive(color) : handleSave()} // Simplistic toggle
                        >
                          {isActive ? <Trash2 className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          {isActive ? 'Archive' : 'Restore'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant={isActive ? 'secondary' : 'outline'} className="text-[10px]">
                      {isActive ? <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-500" /> : <XCircle className="mr-1 h-3 w-3 text-muted-foreground" />}
                      {isActive ? 'Active' : 'Archived'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {dependencies.length} Products
                    </Badge>
                  </div>

                  {dependencies.length > 0 && (
                    <div className="mt-3 border-t pt-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Used In</p>
                      <div className="flex flex-wrap gap-1">
                        {dependencies.slice(0, 3).map((p: any) => (
                          <span key={p.id} className="text-[9px] bg-muted px-1.5 py-0.5 rounded truncate max-w-[80px]">
                            {p.name}
                          </span>
                        ))}
                        {dependencies.length > 3 && (
                          <span className="text-[9px] text-muted-foreground">+{dependencies.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      
      <Dialog open={isAdding} onOpenChange={(o) => {
        setIsAdding(o)
        if (!o) {
          setEditingColor(null)
          setForm({ name: '', hex: '#000000' })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingColor ? 'Edit Color' : 'Add New Color'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Color Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Electric Blue" 
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hex">Hex Code</Label>
              <div className="flex gap-3">
                <Input 
                  id="hex" 
                  type="color" 
                  className="h-10 w-20 p-1"
                  value={form.hex}
                  onChange={e => setForm(f => ({ ...f, hex: e.target.value }))}
                />
                <Input 
                  placeholder="#000000" 
                  value={form.hex}
                  onChange={e => setForm(f => ({ ...f, hex: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : (editingColor ? 'Update Color' : 'Create Color')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
