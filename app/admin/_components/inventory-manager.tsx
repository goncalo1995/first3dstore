'use client'

import { useState, useMemo } from 'react'
import { Plus, Database, AlertCircle, CheckCircle2, Package, Clock, History, X, Pencil, HardDrive } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { db, id } from '@/lib/db'
import { consumeMaterial } from '@/app/admin/production/actions'

import type { Spool, ProductionJob, CatalogProduct, GlobalColor, Printer } from '@/types'

interface InventoryManagerProps {
  spools: Spool[]
  jobs: ProductionJob[]
  products: CatalogProduct[]
  colors: GlobalColor[]
  printers?: Printer[]
}

export function InventoryManager({ spools, jobs, products, colors, printers = [] }: InventoryManagerProps) {
  const [isAddingSpool, setIsAddingSpool] = useState(false)
  const [editingSpoolId, setEditingSpoolId] = useState<string | null>(null)
  const [newSpool, setNewSpool] = useState({
    colorId: '',
    gramsRemaining: 1000,
    materialType: 'PLA' as const,
    brand: '',
    purchasePrice: 0,
    vendorUrl: '',
    isInbound: false,
    notes: '',
  })

  // ─── Inventory Logic ─────────────────────────────────────────────
  const statsByColor = useMemo(() => {
    const data: Record<string, {
      available: number
      inbound: number
      required: number
      spools: any[]
      materialSummary: Record<string, { count: number, weight: number }>
    }> = {}

    // Initialize
    colors.forEach((c: any) => {
      data[c.id] = { available: 0, inbound: 0, required: 0, spools: [], materialSummary: {} }
    })

    // Group spools
    spools.forEach((s: any) => {
      if (!s.isActive) return
      const colorId = s.colorId
      if (!data[colorId]) data[colorId] = { available: 0, inbound: 0, required: 0, spools: [], materialSummary: {} }
      
      if (s.isInbound) data[colorId].inbound += s.gramsRemaining
      else data[colorId].available += s.gramsRemaining
      
      data[colorId].spools.push(s)

      // Aggregate material summary
      const mType = s.materialType || 'PLA'
      if (!data[colorId].materialSummary[mType]) {
        data[colorId].materialSummary[mType] = { count: 0, weight: 0 }
      }
      data[colorId].materialSummary[mType].count++
      data[colorId].materialSummary[mType].weight += s.gramsRemaining
    })

    // Sum required
    jobs.forEach((j: any) => {
      if (['queued', 'printing'].includes(j.status)) {
        if (j.colorRequirements) {
          j.colorRequirements.forEach((req: any) => {
            if (data[req.colorId]) data[req.colorId].required += req.grams * (j.quantity || 1)
          })
        } else if (j.globalColor?.id && data[j.globalColor.id]) {
          data[j.globalColor.id].required += j.materialGrams * (j.quantity || 1)
        }
      }
    })

    return data
  }, [colors, spools, jobs])

  const [expandedColor, setExpandedColor] = useState<string | null>(null)

  const handleAddSpool = async () => {
    if (!newSpool.colorId) return toast.error('Select a color')
    if (!newSpool.materialType) return toast.error('Select a material')
    if (newSpool.gramsRemaining <= 0) return toast.error('Enter the initial grams')
    try {
      const spoolId = editingSpoolId || id()
      await db.transact(
        db.tx.spools[spoolId].update({
          ...newSpool,
          isActive: true,
          isInbound: editingSpoolId ? newSpool.isInbound : false,
          updatedAt: new Date()
        }).link({ color: newSpool.colorId })
      )
      setIsAddingSpool(false)
      setEditingSpoolId(null)
      setNewSpool({
        colorId: '',
        gramsRemaining: 1000,
        materialType: 'PLA',
        brand: '',
        purchasePrice: 0,
        vendorUrl: '',
        isInbound: false,
        notes: '',
      })
      toast.success(editingSpoolId ? 'Spool updated' : 'Inventory received')
    } catch (err: any) { toast.error(err.message) }
  }

  const deleteSpool = async (spoolId: string) => {
    if (!confirm('Are you sure you want to delete this physical spool?')) return
    try {
      await db.transact(db.tx.spools[spoolId].update({ isActive: false, updatedAt: new Date() }))
      toast.success('Spool removed from inventory')
    } catch (err: any) { toast.error(err.message) }
  }

  const adjustGrams = async (spoolId: string, current: number, delta: number) => {
    try {
      await db.transact(
        db.tx.spools[spoolId].update({
          gramsRemaining: Math.max(0, current + delta),
          updatedAt: new Date()
        })
      )
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Spools Inventory</h2>
          <p className="text-sm text-muted-foreground">Physical filament spools available for manufacturing.</p>
        </div>
        <Button size="sm" onClick={() => setIsAddingSpool(true)} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" />Receive Inventory
        </Button>
      </div>

      {(isAddingSpool || editingSpoolId) && (
        <Card className="border-primary/20 bg-primary/5 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              {editingSpoolId ? 'Update Physical Spool' : 'Receive Inventory'}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4 items-end">
             <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-tight">Global Color</Label>
              <select 
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newSpool.colorId}
                onChange={e => setNewSpool(s => ({ ...s, colorId: e.target.value }))}
              >
                <option value="">Select color...</option>
                {colors.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-tight">Brand / Series</Label>
              <Input placeholder="e.g. PolyLite" value={newSpool.brand} onChange={e => setNewSpool(s => ({ ...s, brand: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-tight">Material</Label>
              <select 
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newSpool.materialType}
                onChange={e => setNewSpool(s => ({ ...s, materialType: e.target.value as any }))}
              >
                <option value="PLA">PLA</option>
                <option value="PETG">PETG</option>
                <option value="ABS">ABS</option>
                <option value="TPU">TPU</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-tight">Initial Grams</Label>
              <Input 
                type="number" 
                min={1}
                value={newSpool.gramsRemaining} 
                onChange={e => setNewSpool(s => ({ ...s, gramsRemaining: Number(e.target.value) }))}
              />
            </div>
             <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-tight">Cost (€)</Label>
              <Input type="number" value={newSpool.purchasePrice} onChange={e => setNewSpool(s => ({ ...s, purchasePrice: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-tight">Purchase Link</Label>
              <Input placeholder="URL for reordering" value={newSpool.vendorUrl} onChange={e => setNewSpool(s => ({ ...s, vendorUrl: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddSpool} className="flex-1">
                {editingSpoolId ? 'Save Spool' : 'Receive Spool'}
              </Button>
              <Button variant="ghost" onClick={() => { 
                setIsAddingSpool(false)
                setEditingSpoolId(null)
                setNewSpool({
                  colorId: '',
                  gramsRemaining: 1000,
                  materialType: 'PLA',
                  brand: '',
                  purchasePrice: 0,
                  vendorUrl: '',
                  isInbound: false,
                  notes: '',
                })
              }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-4">
        {colors.map((color: any) => {
          const stats = statsByColor[color.id] || { available: 0, required: 0, inbound: 0, spools: [], materialSummary: {} }
          const isExpanded = expandedColor === color.id
          const netStock = stats.available - stats.required
          const isCritical = netStock < 0 && Math.abs(netStock) > stats.inbound

          return (
            <Card key={color.id} className={`overflow-hidden transition-all hover:shadow-sm ${isCritical ? 'border-red-200' : ''}`}>
              <div 
                className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer"
                onClick={() => setExpandedColor(isExpanded ? null : color.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                  <div className="h-10 w-10 rounded-xl border-2 shadow-inner ring-2 ring-background" style={{ backgroundColor: color.hex }} />
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-tight">{color.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {Object.entries(stats.materialSummary).map(([type, data]: any) => (
                        <Badge key={type} variant="secondary" className="text-[9px] h-5 px-1.5 font-bold">
                          {data.count}x {type} ({Math.round(data.weight / 100) / 10}kg)
                        </Badge>
                      ))}
                      {stats.spools.length === 0 && <span className="text-[10px] text-muted-foreground italic">No physical spools</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className={`text-sm font-black font-mono ${isCritical ? 'text-red-600' : 'text-foreground'}`}>
                      {Math.round(netStock)}g
                    </p>
                    <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Net Stock</p>
                  </div>
                  <div className="flex flex-col items-center">
                     {isExpanded ? <X className="h-4 w-4 text-muted-foreground" /> : <Package className="h-4 w-4 text-primary" />}
                  </div>
                </div>
              </div>

              {isExpanded && stats.spools.length > 0 && (
                <div className="border-t bg-muted/20 p-4 space-y-3">
                   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {stats.spools.map((spool: any) => (
                      <div key={spool.id} className="bg-background rounded-lg border p-3 shadow-sm group hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                              {spool.brand || 'GENERIC'} • {spool.materialType}
                            </p>
                            <p className="text-lg font-black font-mono mt-1">{spool.gramsRemaining}g</p>
                            {/* Show which printer slot has this spool loaded */}
                            {(() => {
                              const loadedInSlot = (printers as any[]).flatMap(p => 
                                ((p as any).slots || []).map((s: any) => ({ ...s, printerName: p.name, printerId: p.id }))
                              ).find((s: any) => s.spool?.id === spool.id)
                              if (loadedInSlot) {
                                return (
                                  <p className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                                    <HardDrive className="h-3 w-3" />
                                    Loaded in {loadedInSlot.printerName} (Slot {loadedInSlot.slotNumber})
                                  </p>
                                )
                              }
                              return null
                            })()}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit spool" onClick={(e) => {
                               e.stopPropagation();
                               setEditingSpoolId(spool.id);
                               setNewSpool({
                                 colorId: color.id,
                                 gramsRemaining: spool.gramsRemaining ?? 1000,
                                 materialType: spool.materialType || 'PLA',
                                 brand: spool.brand || '',
                                 purchasePrice: spool.purchasePrice ?? 0,
                                 vendorUrl: spool.vendorUrl || '',
                                 isInbound: spool.isInbound || false,
                                 notes: spool.notes || '',
                               });
                             }}>
                               <Pencil className="h-3.5 w-3.5" />
                             </Button>
                             <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => {
                               e.stopPropagation();
                               deleteSpool(spool.id);
                             }}>
                               <X className="h-3.5 w-3.5" />
                             </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] font-bold" onClick={(e) => {
                            e.stopPropagation();
                            adjustGrams(spool.id, spool.gramsRemaining, -100);
                          }}>-100g</Button>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] font-bold" onClick={(e) => {
                            e.stopPropagation();
                            adjustGrams(spool.id, spool.gramsRemaining, 100);
                          }}>+100g</Button>
                          {spool.vendorUrl && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-blue-600 font-bold ml-auto" asChild>
                              <a href={spool.vendorUrl} target="_blank" rel="noreferrer">Order</a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
