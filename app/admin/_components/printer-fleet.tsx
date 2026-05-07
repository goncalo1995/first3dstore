'use client'

import { useState } from 'react'
import { HardDrive, Circle, Play, CheckCircle2, History, AlertTriangle, MoreHorizontal, Plus, Loader2, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { db, id } from '@/lib/db'
import { finishBatchPrint, updatePrinterSlots, updatePrinterStatus } from '@/app/admin/production/actions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown } from "lucide-react"
import type { Printer, Spool, PrintHistory, FullSpool, GlobalColor, ProductionJob } from '@/types'
import { format } from 'date-fns'

// Spool with color relationship from query
type SpoolWithColor = Spool & { color?: GlobalColor }

interface PrinterFleetProps {
  printers: Printer[]
  spools: Spool[]
  jobs: ProductionJob[]
  history: PrintHistory[]
}

export function PrinterFleet({ printers, spools, jobs, history = [] }: PrinterFleetProps) {
  const [loadingSlot, setLoadingSlot] = useState<string | null>(null) // printerId-slotNumber
  const [isAddingPrinter, setIsAddingPrinter] = useState(false)
  const [finishingPrinter, setFinishingPrinter] = useState<any>(null)
  const [newPrinter, setNewPrinter] = useState({
    name: 'BambuLab X1C',
    model: 'X1-Carbon',
    buildVolume: { x: 256, y: 256, z: 256 }
  })

  const handleUpdateStatus = async (printerId: string, status: any) => {
    try {
      await updatePrinterStatus(printerId, status)
      toast.success(`Printer status updated to ${status}`)
    } catch (err: any) { toast.error(err.message) }
  }

  const handleCreatePrinter = async () => {
    try {
      const printerId = id()
      await db.transact(
        db.tx.printers[printerId].update({
          name: newPrinter.name,
          status: 'idle',
          buildVolume: newPrinter.buildVolume,
          activeJobIds: [],
          updatedAt: new Date(),
        })
      )
      // Create default 4 slots
      const slotTxs = [1, 2, 3, 4].map(n => 
        db.tx.printerSlots[id()].update({ printerId, slotNumber: n })
          .link({ printer: printerId })
      )
      await db.transact(slotTxs)
      toast.success(`${newPrinter.name} added with 4 slots`)
      setIsAddingPrinter(false)
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Machines Column */}
      <div className="lg:col-span-3 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Hardware Inventory</h2>
            <p className="text-sm text-muted-foreground">Active printer fleet and slot configuration.</p>
          </div>
          <Button size="sm" onClick={() => setIsAddingPrinter(true)} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" />Printer
          </Button>
        </div>

        <Dialog open={isAddingPrinter} onOpenChange={setIsAddingPrinter}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-black text-lg">Add New Printer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Machine Identifier</Label>
                <Input value={newPrinter.name} onChange={e => setNewPrinter(p => ({ ...p, name: e.target.value }))} className="font-bold h-11" />
              </div>
              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Model Specification</Label>
                <Input value={newPrinter.model} onChange={e => setNewPrinter(p => ({ ...p, model: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">X (mm)</Label>
                  <Input type="number" value={newPrinter.buildVolume.x} onChange={e => setNewPrinter(p => ({ ...p, buildVolume: { ...p.buildVolume, x: Number(e.target.value) } }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Y (mm)</Label>
                  <Input type="number" value={newPrinter.buildVolume.y} onChange={e => setNewPrinter(p => ({ ...p, buildVolume: { ...p.buildVolume, y: Number(e.target.value) } }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Z (mm)</Label>
                  <Input type="number" value={newPrinter.buildVolume.z} onChange={e => setNewPrinter(p => ({ ...p, buildVolume: { ...p.buildVolume, z: Number(e.target.value) } }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddingPrinter(false)}>Cancel</Button>
              <Button onClick={handleCreatePrinter} className="font-black tracking-widest uppercase text-[10px] h-10 px-6">Confirm Machine</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid gap-6 md:grid-cols-2">
          {printers.map((printer: any) => {
            const activeJobIds = Array.isArray(printer.activeJobIds) ? printer.activeJobIds : []
            return (
            <Card key={printer.id} className="overflow-hidden border-muted/50 hover:border-primary/30 transition-all shadow-sm">
              <CardHeader className="pb-3 bg-muted/10 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-background border shadow-sm ring-4 ring-muted/20">
                      <HardDrive className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-tight">{printer.name}</CardTitle>
                      <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em]">{printer.model || 'X1-CARBON'}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleUpdateStatus(printer.id, 'idle')} className="gap-2"><Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" /> Set to Idle</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(printer.id, 'maintenance')} className="gap-2"><AlertTriangle className="h-3 w-3 fill-amber-500 text-amber-500" /> Set to Maintenance</DropdownMenuItem>
                      <Separator className="my-1" />
                      <DropdownMenuItem className="text-destructive gap-2"><Plus className="h-3 w-3 rotate-45" /> Decommission Machine</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-6">
                <div className="flex items-center justify-between">
                  <Badge variant={printer.status === 'printing' ? 'default' : printer.status === 'maintenance' ? 'destructive' : 'secondary'} className="px-4 py-1 font-black text-[10px] tracking-widest uppercase">
                    {printer.status === 'printing' && <Play className="mr-2 h-3 w-3 fill-current" />}
                    {printer.status}
                  </Badge>
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    {activeJobIds.length > 0 ? `${activeJobIds.length} jobs on plate` : 'Active Status'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">
                    <span>AMS Configuration</span>
                    <span className="text-[9px] text-muted-foreground/50">Click slot to change</span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(n => {
                      const slot = printer.slots?.find((s: any) => s.slotNumber === n)
                      const spool = slot?.spool
                      // Check both direct slot color and spool's color (for linked spools)
                      const color = slot?.color || slot?.spool?.color
                      const isLoading = loadingSlot === `${printer.id}-${n}`
                      
                      return (
                        <SpoolSlot
                          key={n}
                          slotNumber={n}
                          color={color}
                          spool={spool}
                          isLoading={isLoading}
                          allSpools={spools}
                          loadedSpoolIds={printers.flatMap((p: any) => p.slots?.map((s: any) => s.spool?.id).filter(Boolean) || [])}
                          onSelect={async (spoolId, colorId) => {
                            setLoadingSlot(`${printer.id}-${n}`)
                            try {
                              await updatePrinterSlots(printer.id, [{ slotNumber: n, spoolId, colorId }])
                              toast.success(`Slot ${n} updated`)
                            } catch (err: any) {
                              toast.error(err.message)
                            }
                            setLoadingSlot(null)
                          }}
                        />
                      )
                    })}
                  </div>
                </div>

                {printer.status === 'printing' && (
                  <div className="pt-2 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="flex items-center gap-2"><Play className="h-3 w-3 text-emerald-500 animate-pulse fill-emerald-500" /> Manufacturing Live</span>
                        <span className="text-emerald-600 font-mono">72%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-emerald-500 rounded-full w-[72%] transition-all duration-1000 shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      className="w-full h-8 text-[9px] font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 shadow-sm"
                      onClick={() => setFinishingPrinter(printer)}
                      disabled={activeJobIds.length === 0}
                    >
                      <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Finish Plate
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            )
          })}
        </div>
      </div>

      {/* Logs Column */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Print History</h2>
          <p className="text-sm text-muted-foreground">Audit trail and logs.</p>
        </div>
        <Card className="h-[calc(100vh-280px)] shadow-sm border-muted/50 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-3">
             <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
               <History className="h-3.5 w-3.5" /> Recent Events
             </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-hide">
             <div className="divide-y divide-border/50">
               {history.length === 0 ? (
                 <div className="p-12 text-center opacity-30">
                   <History className="h-10 w-10 mx-auto mb-2" />
                   <p className="text-[10px] font-black uppercase tracking-widest">No history recorded</p>
                 </div>
               ) : history.sort((a: any, b: any) => b.completedAt - a.completedAt).map((entry: any) => (
                 <div key={entry.id} className="p-4 hover:bg-muted/5 transition-colors group">
                    <div className="flex items-center justify-between mb-1.5">
                      <Badge variant="secondary" className="text-[8px] h-3.5 px-1 font-black bg-emerald-50 text-emerald-600 hover:bg-emerald-50 uppercase tracking-tighter">SUCCESS</Badge>
                      <span className="text-[9px] font-black text-muted-foreground opacity-50 uppercase">{format(new Date(entry.completedAt), 'MMM d, HH:mm')}</span>
                    </div>
                    <p className="text-[11px] font-bold leading-tight group-hover:text-primary transition-colors">{entry.job?.productName || 'Unknown Job'}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                       <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{entry.printer?.name}</span>
                    </div>
                 </div>
               ))}
               <div className="p-8 text-center">
                 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-10">End of records</p>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>

      {finishingPrinter && (
        <BatchFinishDialog
          printer={finishingPrinter}
          jobs={jobs.filter((job: any) => {
            const activeJobIds = Array.isArray(finishingPrinter.activeJobIds) ? finishingPrinter.activeJobIds : []
            return activeJobIds.includes(job.id)
          })}
          onClose={() => setFinishingPrinter(null)}
          onFinished={() => setFinishingPrinter(null)}
        />
      )}
    </div>
  )
}

function getSpoolConsumptionsFromAllocations(job: any, grams: number) {
  if (grams <= 0) return []

  const allocations = Array.isArray(job.spoolAllocations)
    ? job.spoolAllocations.filter((allocation: any) => allocation?.spoolId && Number(allocation.expectedGrams) > 0)
    : []

  if (allocations.length > 0) {
    const expectedTotal = allocations.reduce((sum: number, allocation: any) => sum + Number(allocation.expectedGrams || 0), 0)
    const scale = grams > 0 && expectedTotal > 0 ? grams / expectedTotal : 1

    return allocations.map((allocation: any) => ({
      spoolId: allocation.spoolId,
      slotNumber: allocation.slotNumber,
      grams: Number(allocation.expectedGrams || 0) * scale,
    }))
  }

  const spoolIds = Array.isArray(job.assignedSpoolIds) ? job.assignedSpoolIds.filter(Boolean) : []
  if (spoolIds.length === 0 || grams <= 0) return []
  const gramsPerSpool = grams / spoolIds.length
  return spoolIds.map((spoolId: string) => ({ spoolId, grams: gramsPerSpool }))
}

function BatchFinishDialog({ printer, jobs, onClose, onFinished }: {
  printer: any
  jobs: any[]
  onClose: () => void
  onFinished: () => void
}) {
  const [outcomes, setOutcomes] = useState<Record<string, { status: 'success' | 'failed'; wasteGrams: number }>>(() => {
    return Object.fromEntries(jobs.map(job => [job.id, { status: 'success', wasteGrams: 0 }]))
  })
  const [loading, setLoading] = useState(false)

  const updateOutcome = (jobId: string, patch: Partial<{ status: 'success' | 'failed'; wasteGrams: number }>) => {
    setOutcomes(current => ({
      ...current,
      [jobId]: { ...(current[jobId] || { status: 'success', wasteGrams: 0 }), ...patch },
    }))
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      await finishBatchPrint(printer.id, jobs.map(job => {
        const outcome = outcomes[job.id] || { status: 'success', wasteGrams: 0 }
        const successGrams = Number(job.materialGrams || job.totalGrams || 0) * (job.quantity || 1)
        const wasteGrams = Number(outcome.wasteGrams || 0)
        return {
          jobId: job.id,
          status: outcome.status,
          spoolConsumptions: outcome.status === 'success' ? getSpoolConsumptionsFromAllocations(job, successGrams) : undefined,
          wasteConsumptions: outcome.status === 'failed' ? getSpoolConsumptionsFromAllocations(job, wasteGrams) : undefined,
          failReason: outcome.status === 'failed' ? `Waste recorded: ${wasteGrams}g` : undefined,
        }
      }))
      toast.success('Build plate finished')
      onFinished()
    } catch (err: any) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Finish Build Plate
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm font-bold">{printer.name}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Grade every logical job from this simultaneous plate run
            </p>
          </div>

          <div className="space-y-3">
            {jobs.map(job => {
              const outcome = outcomes[job.id] || { status: 'success', wasteGrams: 0 }
              return (
                <div key={job.id} className="rounded-xl border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-black">{job.productName}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {job.partLabel} • {job.materialType || 'PLA'} • {job.materialGrams || job.totalGrams || 0}g
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-muted-foreground">
                        {(job.spoolAllocations || job.assignedSpoolIds || []).length > 0 ? `${(job.spoolAllocations || job.assignedSpoolIds).length} assigned spool${(job.spoolAllocations || job.assignedSpoolIds).length === 1 ? '' : 's'}` : 'No assigned spool metadata'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={outcome.status === 'success' ? 'default' : 'outline'}
                        className="h-8 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => updateOutcome(job.id, { status: 'success' })}
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Success
                      </Button>
                      <Button
                        size="sm"
                        variant={outcome.status === 'failed' ? 'destructive' : 'outline'}
                        className="h-8 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => updateOutcome(job.id, { status: 'failed' })}
                      >
                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                        Fail
                      </Button>
                    </div>
                  </div>

                  {outcome.status === 'failed' && (
                    <div className="mt-4 max-w-xs space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-red-600">Waste Grams</Label>
                      <Input
                        type="number"
                        min={0}
                        value={outcome.wasteGrams}
                        onChange={event => updateOutcome(job.id, { wasteGrams: Number(event.target.value) })}
                        className="h-9 font-bold"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleFinish} disabled={loading || jobs.length === 0}>
            {loading ? 'Finishing...' : 'Commit Plate Results'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Content-only spool selector (for embedding in other popovers)
interface SpoolSelectorContentProps {
  spools: SpoolWithColor[]
  currentValue: string
  onSelect: (spoolId: string, colorId: string) => void
  loadedSpoolIds?: string[]
}

function SpoolSelectorContent({ spools, currentValue, onSelect, loadedSpoolIds = [] }: SpoolSelectorContentProps) {
  const activeSpools = spools.filter(s => s.isActive && !s.isInbound)

  // Group spools by material type
  const spoolsByMaterial = activeSpools.reduce((acc, spool) => {
    const type = spool.materialType || 'PLA'
    if (!acc[type]) acc[type] = []
    acc[type].push(spool)
    return acc
  }, {} as Record<string, SpoolWithColor[]>)

  const materialTypes = Object.keys(spoolsByMaterial).sort()

  return (
    <Command className="rounded-xl">
      <CommandInput placeholder="Search by color, brand, or material..." className="h-10 text-xs font-bold" />
      <CommandList className="max-h-[350px]">
        <CommandEmpty className="text-[10px] font-black uppercase tracking-widest p-6 text-center text-muted-foreground">No spools found</CommandEmpty>
        {materialTypes.map(materialType => (
          <CommandGroup key={materialType} heading={`${materialType} (${spoolsByMaterial[materialType].length})`}>
            {spoolsByMaterial[materialType]
              .sort((a, b) => b.gramsRemaining - a.gramsRemaining)
              .map(spool => {
                const color = spool.color
                const colorHex = color?.hex || '#e5e7eb'
                const colorName = color?.name || 'Unknown'
                const isLow = spool.gramsRemaining < 200
                const isLoaded = loadedSpoolIds.includes(spool.id)
                return (
                  <CommandItem
                    key={spool.id}
                    value={`${colorName} ${spool.brand || ''} ${spool.materialType}`}
                    onSelect={() => onSelect(spool.id, color?.id || '')}
                    className="px-3 py-2 flex items-center gap-3 cursor-pointer"
                    disabled={isLoaded}
                  >
                    <div className="relative">
                      <div 
                        className={`h-7 w-7 rounded-md border-2 shadow-sm shrink-0 ${isLow ? 'ring-2 ring-amber-400' : ''}`} 
                        style={{ backgroundColor: colorHex, borderColor: colorHex }} 
                      />
                      {isLow && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 text-[6px] text-white font-black">
                          !
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className={`text-[11px] font-black uppercase tracking-tight truncate ${isLoaded ? 'text-muted-foreground line-through' : ''}`}>
                        {colorName}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{spool.brand || 'Generic'}</span>
                        <span className="text-[9px] text-muted-foreground/30">•</span>
                        <span className={`text-[9px] font-black font-mono ${isLow ? 'text-amber-600' : 'text-primary'}`}>
                          {spool.gramsRemaining}g
                        </span>
                      </div>
                    </div>
                    {isLoaded ? (
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Loaded</span>
                    ) : (
                      <Check
                        className={cn(
                          "h-4 w-4 text-primary",
                          currentValue === spool.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    )}
                  </CommandItem>
                )
              })}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  )
}

// Standalone SpoolSelector with its own popover (for other uses)
function SpoolSelector({ spools, currentValue, onSelect, loadedSpoolIds = [] }: SpoolSelectorContentProps) {
  const [open, setOpen] = useState(false)
  const activeSpools = spools.filter(s => s.isActive && !s.isInbound)
  const selectedSpool = activeSpools.find(s => s.id === currentValue)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-full h-full p-0 flex flex-col items-center justify-center hover:bg-transparent"
        >
          <Plus className="h-4 w-4 text-primary mb-1" />
          <span className="text-[8px] font-black uppercase tracking-tighter">Select</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 shadow-2xl border-primary/20" align="center" side="bottom">
        <SpoolSelectorContent 
          spools={spools} 
          currentValue={currentValue}
          onSelect={(spoolId, colorId) => {
            onSelect(spoolId, colorId)
            setOpen(false)
          }}
          loadedSpoolIds={loadedSpoolIds}
        />
      </PopoverContent>
    </Popover>
  )
}

// Individual slot component with instant select + save
interface SpoolSlotProps {
  slotNumber: number
  color?: GlobalColor
  spool?: SpoolWithColor
  isLoading: boolean
  allSpools: Spool[]
  loadedSpoolIds: string[]
  onSelect: (spoolId: string, colorId: string) => Promise<void>
}

function SpoolSlot({ slotNumber, color, spool, isLoading, allSpools, loadedSpoolIds, onSelect }: SpoolSlotProps) {
  const [open, setOpen] = useState(false)
  
  const handleSelect = async (spoolId: string, colorId: string) => {
    setOpen(false)
    await onSelect(spoolId, colorId)
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div 
          className={`group relative flex flex-col items-center gap-2.5 rounded-xl border p-2 text-center transition-all cursor-pointer ${
            isLoading ? 'opacity-70' : 'border-muted/50 bg-muted/5 hover:bg-muted/10 hover:border-primary/20'
          }`}
        >
          <span className="absolute -top-1.5 -left-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-lg bg-background border-2 text-[9px] font-black shadow-sm z-10">{slotNumber}</span>
          
          <div 
            className="h-10 w-10 rounded-xl border-2 shadow-inner ring-4 ring-background flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 relative"
            style={{ backgroundColor: color?.hex || '#f3f4f6' }}
          >
            {!color && <Circle className="h-4 w-4 text-muted-foreground/20" />}
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>
          
          <div className="w-full space-y-0.5">
            <p className="truncate text-[9px] font-black uppercase tracking-tight">{color?.name || 'EMPTY'}</p>
            {spool && !isLoading && (
              <p className="text-[9px] text-muted-foreground font-black font-mono">
                {spool.gramsRemaining}g {spool.materialType && `· ${spool.materialType}`}
              </p>
            )}
          </div>
        </div>
      </PopoverTrigger>
      
      <PopoverContent className="w-[300px] p-0 shadow-2xl border-primary/20" align="center" side="bottom">
        <SpoolSelectorContent 
          spools={allSpools} 
          currentValue={spool?.id || ''}
          loadedSpoolIds={loadedSpoolIds}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  )
}
