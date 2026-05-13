'use client'

import { useState } from 'react'
import { 
  LayoutDashboard, Printer as PrinterIcon, Calendar, Layers, HardDrive, 
  ExternalLink, History, RefreshCw, ArrowRight, PackageCheck, Play, Download,
  CheckCircle2, AlertTriangle, XCircle,
  Palette
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { db } from '@/lib/db'
import { toast } from 'sonner'

// Tab Components
import { ProductionDashboard } from './production-dashboard'
import { ProductionSchedule } from './production-schedule'
import { InventoryManager } from './inventory-manager'
import { PrinterFleet } from './printer-fleet'
import { OutsourcedManager } from './outsourced-manager'
import { BatchStartPrintDialog } from './batch-start-print-dialog'

import { 
  updateJobPriority, 
  scheduleProductionJob, 
  generateProductionJobs,
  generateAllPendingJobs,
  updateJobOutsourced,
  fulfillJobFromStock,
} from '@/app/admin/production/actions'

import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'

import type { 
  ProductionJob, 
  Printer, 
  Spool, 
  GlobalColor, 
  PrintFarm, 
  CatalogProduct, 
  PrintHistory 
} from '@/types'

export function ProductionHub() {
  const { isLoading, data, error } = db.useQuery({
    productionJobs: {
      order: {},
      globalColor: {},
    },
    printers: {
      slots: {
        color: {},
        spool: {
          color: {},
        }
      }
    },
    spools: {
      color: {},
      slots: {},
    },
    globalColors: {},
    printFarms: {},
    catalogProducts: {},
    printHistory: {
      printer: {},
      job: {},
    }
  })

  const [activeTab, setActiveTab] = useState('dashboard')
  const [assigningJob, setAssigningJob] = useState<any>(null)
  const [schedulingDate, setSchedulingDate] = useState<Date>(new Date())
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)

  if (isLoading) return <div className="flex h-[400px] items-center justify-center font-black uppercase tracking-[0.2em] animate-pulse text-muted-foreground/30">Syncing MRP Hub...</div>
  if (error) return <div className="p-8 text-destructive font-bold">Error loading hub: {error.message}</div>

  const { 
    productionJobs = [] as ProductionJob[], 
    printers = [] as Printer[], 
    spools = [] as Spool[], 
    globalColors = [] as GlobalColor[], 
    printFarms = [] as PrintFarm[],
    catalogProducts = [] as CatalogProduct[],
    printHistory = [] as PrintHistory[]
  } = (data || {}) as any

  const queuedJobs = productionJobs
    .filter((j: any) => j.status === 'queued' && !j.outsourced && !j.scheduledDate)
    .sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99))

  const selectedJobs = queuedJobs.filter((job: any) => selectedJobIds.includes(job.id))
  const allQueuedSelected = queuedJobs.length > 0 && selectedJobs.length === queuedJobs.length

  const getJobProduct = (job: any) => {
    return catalogProducts.find((product: any) => product.id === job.productId)
      ?? catalogProducts.find((product: any) => product.name === job.productName)
  }

  const getJobVariantId = (job: any, product: any) => {
    if (job.selectedVariantId) return job.selectedVariantId
    const orderItem = job.order?.items?.[job.orderItemIndex]
    const variantName = job.selectedVariantName ?? orderItem?.selectedVariant?.name
    if (!variantName) return orderItem?.selectedVariant?.id

    return product?.variants?.find((variant: any) => variant.name === variantName)?.id
      ?? orderItem?.selectedVariant?.id
  }

  const getJobPrintInfo = (job: any) => {
    const product = getJobProduct(job)
    const variantId = getJobVariantId(job, product)
    const files = Array.isArray(product?.stlFiles) ? product.stlFiles : []

    return {
      product,
      files: files.filter((file: any) => !file.variantId || file.variantId === variantId),
    }
  }

  const handleReorder = async (id: string, dir: 'up' | 'down') => {
    try {
      await updateJobPriority(id, dir)
      toast.success('Priority updated')
    } catch (err: any) { toast.error(err.message) }
  }

  const toggleOutsourced = async (id: string, outsourced: boolean) => {
    try {
      await updateJobOutsourced(id, outsourced)
      toast.success(outsourced ? 'Job routed to outsourced' : 'Job moved to internal queue')
    } catch (err: any) { toast.error(err.message) }
  }

  const toggleJobSelection = (jobId: string, selected: boolean) => {
    setSelectedJobIds(current => {
      if (selected) return Array.from(new Set([...current, jobId]))
      return current.filter(id => id !== jobId)
    })
  }

  const toggleAllQueued = (selected: boolean) => {
    setSelectedJobIds(selected ? queuedJobs.map((job: any) => job.id) : [])
  }

  const handleFulfillFromStock = async () => {
    if (selectedJobs.length !== 1) {
      toast.error('Select exactly one queued job to fulfill from stock')
      return
    }
    try {
      await fulfillJobFromStock(selectedJobs[0].id)
      toast.success('Job fulfilled from stock')
      setSelectedJobIds([])
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Production Hub</h1>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">Manufacturing Resource Planning</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="text-right">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Printers</p>
             <p className="text-xl font-black">{printers.filter((p: any) => p.status === 'printing').length}<span className="text-muted-foreground/30 ml-1">/ {printers.length}</span></p>
          </div>
          <Separator orientation="vertical" className="h-10 mx-2" />
          <Button variant="default" className="h-12 px-6 font-black tracking-widest uppercase italic group shadow-lg" onClick={async () => {
            try {
              const result = await generateAllPendingJobs()
              if (result.totalCreated > 0) {
                setTimeout(() => toast.success(`Created ${result.totalCreated} jobs from ${result.ordersProcessed} orders`), 0)
              } else {
                setTimeout(() => toast.info('No new orders to synchronize'), 0)
              }
            } catch (err: any) { setTimeout(() => toast.error(err.message), 0) }
          }}>
            <RefreshCw className="mr-3 h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
            Synchronize
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-8" onValueChange={setActiveTab}> 
        <TabsList className="flex overflow-x-auto w-full justify-start h-auto bg-muted/50 scrollbar-hide gap-1 sm:gap-6">
           <TabsTrigger value="dashboard" className="rounded-lg font-black text-[10px] uppercase tracking-widest h-9 px-3 sm:px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <LayoutDashboard className="h-4 w-4 sm:mr-2 text-primary" /> <span className="ml-1 hidden xl:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="production" className="rounded-lg font-black text-[10px] uppercase tracking-widest h-9 px-3 sm:px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <PrinterIcon className="h-4 w-4 sm:mr-2" /> <span className="ml-1 hidden sm:inline">Production</span>
              {queuedJobs.length > 0 && (
                <span className="ml-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[8px] font-black text-primary-foreground px-1">
                  {queuedJobs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-lg font-black text-[10px] uppercase tracking-widest h-9 px-3 sm:px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Palette className="h-4 w-4 sm:mr-2" /> <span className="ml-1 hidden sm:inline">Spools</span>
            </TabsTrigger>
            <TabsTrigger value="fleet" className="rounded-lg font-black text-[10px] uppercase tracking-widest h-9 px-3 sm:px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <HardDrive className="h-4 w-4 sm:mr-2" /> <span className="ml-1 hidden sm:inline">Printers</span>
            </TabsTrigger>
            <TabsTrigger value="outsourced" className="rounded-lg font-black text-[10px] uppercase tracking-widest h-9 px-3 sm:px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <ExternalLink className="h-4 w-4 sm:mr-2" /> <span className="ml-1 sr-only">Outsourced</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="dashboard">
          <ProductionDashboard 
            jobs={productionJobs} 
            orders={catalogProducts} 
            printers={printers} 
            allColors={globalColors} 
            spools={spools} 
          />
        </TabsContent>

        <TabsContent value="production" className="space-y-6">
          {/* QUEUE SECTION - Unscheduled jobs */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-lg tracking-tight uppercase">Print Queue</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                  {queuedJobs.length} unscheduled • Select multiple and assign to printer
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-6 font-bold uppercase tracking-widest border-dashed">{queuedJobs.length} PENDING</Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={allQueuedSelected}
                  onCheckedChange={(checked) => toggleAllQueued(checked === true)}
                  aria-label="Select all queued jobs"
                  className='h-6 w-6'
                />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">{selectedJobs.length} selected</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">One build plate can contain multiple selected jobs</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="h-9 text-[10px] font-black uppercase tracking-widest"
                  disabled={selectedJobs.length === 0}
                  onClick={() => setBatchDialogOpen(true)}
                >
                  <Play className="mr-2 h-3.5 w-3.5" />
                  Start Print
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-[10px] font-black uppercase tracking-widest"
                  disabled={selectedJobs.length !== 1}
                  onClick={handleFulfillFromStock}
                >
                  <PackageCheck className="mr-2 h-3.5 w-3.5" />
                  Fulfill from Stock
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {queuedJobs.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                  <PrinterIcon className="h-10 w-10 mx-auto mb-4 opacity-20" />
                  <p className="font-bold uppercase tracking-widest text-xs">Queue is empty</p>
                  <p className="text-[10px] mt-1">All jobs are scheduled or in production</p>
                </div>
              ) : queuedJobs.map((job: ProductionJob) => (
                <JobCard 
                  key={job.id} 
                  job={job} 
                  printInfo={getJobPrintInfo(job)}
                  selected={selectedJobIds.includes(job.id)}
                  onSelectedChange={(selected) => toggleJobSelection(job.id, selected)}
                  onReorder={handleReorder}
                  onAction={() => setAssigningJob(job)}
                  actionLabel="Schedule"
                  onOutsource={() => toggleOutsourced(job.id, true)}
                />
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          {/* SCHEDULE SECTION - Timeline */}
          <ProductionSchedule jobs={productionJobs} printers={printers} />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryManager 
            spools={spools} 
            colors={globalColors} 
            jobs={productionJobs}
            products={catalogProducts}
            printers={printers}
          />
        </TabsContent>

        <TabsContent value="fleet">
          <PrinterFleet printers={printers} spools={spools} jobs={productionJobs} history={printHistory} />
        </TabsContent>

        <TabsContent value="outsourced">
          <OutsourcedManager farms={printFarms} jobs={productionJobs} colors={globalColors} />
        </TabsContent>
        
      </Tabs>

      {assigningJob && (
        <AssignJobDialog 
	          job={assigningJob} 
	          printers={printers} 
	          spools={spools}
	          onClose={() => setAssigningJob(null)}
            onConfirm={async (printerId: string, date: string) => {
              try {
                const [year, month, day] = date.split('-').map(Number)
                if (!year || !month || !day) throw new Error('Select a valid date')
                await scheduleProductionJob(assigningJob.id, new Date(year, month - 1, day), printerId || undefined)
                setAssigningJob(null)
                toast.success('Job scheduled')
              } catch (err: any) { toast.error(err.message) }
          }}
        />
      )}

      <BatchStartPrintDialog
        open={batchDialogOpen}
        jobs={selectedJobs}
        printers={printers}
        colors={globalColors}
        onClose={() => setBatchDialogOpen(false)}
        onStarted={() => {
          setBatchDialogOpen(false)
          setSelectedJobIds([])
        }}
      />
    </div>
  )
}

function getScheduleRequirements(job: any) {
  const rawRequirements = Array.isArray(job.colorRequirements) && job.colorRequirements.length > 0
    ? job.colorRequirements
    : [{ colorId: job.globalColor?.id, colorName: job.colorName, colorHex: job.colorHex, grams: job.materialGrams, materialType: job.materialType }]

  return rawRequirements.map((requirement: any) => ({
    colorId: requirement.colorId || job.globalColor?.id || 'unassigned',
    colorName: requirement.colorName || job.globalColor?.name || job.colorName || 'Unassigned',
    colorHex: requirement.colorHex || job.globalColor?.hex || job.colorHex || '#e5e7eb',
    materialType: requirement.materialType || job.materialType || 'PLA',
    grams: Number(requirement.grams || job.materialGrams || 0),
  }))
}

function getColorAvailability(requirement: any, spools: any[], printerSlots: any[] = []) {
  const matchingSpools = spools.filter((spool: any) => {
    const colorId = spool.color?.id || spool.colorId
    return spool.isActive === true
      && spool.isInbound !== true
      && colorId === requirement.colorId
      && spool.materialType === requirement.materialType
  })
  const loadedSpoolIds = new Set(
    printerSlots
      .map((slot: any) => slot.spool?.id || slot.spoolId)
      .filter(Boolean)
  )
  const loadedGrams = matchingSpools
    .filter((spool: any) => loadedSpoolIds.has(spool.id))
    .reduce((sum: number, spool: any) => sum + Number(spool.gramsRemaining || 0), 0)
  const totalGrams = matchingSpools.reduce((sum: number, spool: any) => sum + Number(spool.gramsRemaining || 0), 0)

  if (printerSlots.length > 0 && loadedGrams >= requirement.grams) {
    return {
      tone: 'enough',
      icon: CheckCircle2,
      label: 'Loaded on printer',
      className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      loadedGrams,
      totalGrams,
    }
  }

  if (printerSlots.length > 0 && loadedGrams > 0) {
    return {
      tone: 'low',
      icon: AlertTriangle,
      label: `Loaded low: ${Math.round(loadedGrams)}g`,
      className: 'text-amber-700 bg-amber-50 border-amber-200',
      loadedGrams,
      totalGrams,
    }
  }

  if (totalGrams >= requirement.grams) {
    return {
      tone: 'inventory',
      icon: CheckCircle2,
      label: 'Available in inventory',
      className: 'text-sky-700 bg-sky-50 border-sky-200',
      loadedGrams,
      totalGrams,
    }
  }

  if (totalGrams > 0) {
    return {
      tone: 'low',
      icon: AlertTriangle,
      label: `Low stock: ${Math.round(totalGrams)}g`,
      className: 'text-amber-700 bg-amber-50 border-amber-200',
      loadedGrams,
      totalGrams,
    }
  }

  return {
    tone: 'missing',
    icon: XCircle,
    label: 'No spool found',
    className: 'text-muted-foreground bg-muted/40 border-border',
    loadedGrams,
    totalGrams,
  }
}

function AssignJobDialog({ job, printers, spools, onClose, onConfirm }: any) {
  const defaultPrinterId = printers.find((printer: any) => printer.status === 'idle')?.id || printers[0]?.id || ''
  const [printerId, setPrinterId] = useState(defaultPrinterId)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const requirements = getScheduleRequirements(job)
  const selectedPrinterSlots = printers.find((printer: any) => printer.id === printerId)?.slots || []

	  return (
	    <Dialog open onOpenChange={(open) => !open && onClose()}>
	      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto p-0">
	        <Card className="border-0 shadow-none">
	          <CardContent className="p-6 space-y-6">
	            <div className="space-y-1">
	              <DialogTitle className="font-black text-lg tracking-tight uppercase">Schedule Production</DialogTitle>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Schedule Job: "{job.productName}"</p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Printer</label>
              <select 
                className="h-11 w-full rounded-xl border-2 bg-background px-3 py-2 text-sm font-bold shadow-sm focus:border-primary outline-none transition-all"
                value={printerId}
                onChange={e => setPrinterId(e.target.value)}
              >
                <option value="">No printer yet</option>
                {printers.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Date</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 font-bold rounded-xl border-2" />
            </div>

            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Required colors</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">Ensure printer has these colors loaded by the scheduled date.</p>
              </div>
              <div className="space-y-2">
	                {requirements.map((requirement: any, index: number) => {
	                  const availability = getColorAvailability(requirement, spools, selectedPrinterSlots)
	                  const StatusIcon = availability.icon

                  return (
                    <div key={`${requirement.colorId}-${requirement.materialType}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-5 w-5 rounded-md border-2 shadow-sm ring-2 ring-background" style={{ backgroundColor: requirement.colorHex }} />
                        <div className="min-w-0">
                          <p className="text-sm font-black truncate">{requirement.colorName}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{requirement.materialType} - {Math.round(requirement.grams)}g</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`gap-1.5 text-[9px] font-black uppercase tracking-widest ${availability.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {availability.label}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <DialogClose asChild>
              <Button variant="ghost" className="flex-1 font-black text-[10px] uppercase tracking-widest h-11" onClick={onClose}>Cancel</Button>
            </DialogClose>
            <Button 
              className="flex-1 font-black text-[10px] uppercase tracking-widest h-11 shadow-lg" 
              onClick={() => onConfirm(printerId, date)} 
              disabled={!date}
            >
              Schedule
            </Button>
          </div>
        </CardContent>
      </Card>
      </DialogContent>
    </Dialog>
  )
}

function JobCard({ 
  job, 
  printInfo,
  selected,
  onSelectedChange,
  onReorder,
  onAction,
  actionLabel,
  onOutsource,
  compact 
}: { 
  job: any, 
  printInfo?: { product?: any, files: any[] },
  selected?: boolean,
  onSelectedChange?: (selected: boolean) => void,
  onReorder?: (id: string, dir: 'up' | 'down') => void,
  onAction?: () => void,
  actionLabel?: string,
  onOutsource?: () => void,
  compact?: boolean
}) {
  return (
    <Card className={`relative overflow-hidden group hover:border-primary/50 transition-all shadow-sm ${selected ? 'border-primary ring-2 ring-primary/15' : ''} ${job.status === 'printing' ? 'border-emerald-200' : ''}`}>
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-start justify-between gap-3">
          {onSelectedChange && (
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectedChange(checked === true)}
              aria-label={`Select ${job.productName}`}
              className="mt-0.5 h-6 w-6 border-2"
            />
          )}
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 leading-none">
              {job.order?.customerName || `ORD #${job.orderId.slice(0, 4)}`}
            </p>
            <h4 className="font-black leading-tight text-sm tracking-tight truncate">{job.productName}</h4>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{job.partLabel}</span>
              <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-black border-dashed opacity-70">
                {job.materialType || 'PLA'}
              </Badge>
            </div>
          </div>
          
          {onReorder && (
            <div className="flex flex-col gap-0.5 -mt-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/10 hover:text-primary" onClick={() => onReorder(job.id, 'up')}><ArrowRight className="h-3.5 w-3.5 -rotate-90" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/10 hover:text-primary" onClick={() => onReorder(job.id, 'down')}><ArrowRight className="h-3.5 w-3.5 rotate-90" /></Button>
            </div>
          )}
        </div>

        {!compact && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-dashed">
              <div className="flex items-center gap-2.5">
                <div className="h-4 w-4 rounded-md border-2 shadow-sm ring-2 ring-background" style={{ backgroundColor: job.colorHex }} />
                <span className="text-[11px] font-black uppercase tracking-tight">{job.colorName}</span>
              </div>
              <div className="text-[11px] font-black font-mono bg-background px-2 py-0.5 rounded-md border shadow-xs">
                {job.materialGrams}g
              </div>
            </div>

            {(printInfo?.product?.slicerNotes || (printInfo?.files?.length ?? 0) > 0) && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                {printInfo?.product?.slicerNotes && (
                  <p className="mb-2 text-[10px] font-semibold leading-relaxed text-foreground">
                    {printInfo.product.slicerNotes}
                  </p>
                )}
                {printInfo?.files?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {printInfo.files.map((file: any, index: number) => (
                      <Button key={`${file.url}-${index}`} asChild variant="outline" size="sm" className="h-7 px-2 text-[9px] font-black uppercase tracking-widest">
                        <a href={file.url} target="_blank" rel="noreferrer" title={file.notes || file.name}>
                          <Download className="mr-1.5 h-3 w-3" />
                          {file.name || `STL ${index + 1}`}
                        </a>
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
             <Badge variant="secondary" className="text-[9px] h-5 font-black uppercase tracking-widest bg-muted text-muted-foreground border-none">
              {job.status}
            </Badge>
            {job.priority && (
              <Badge variant="secondary" className="text-[9px] h-5 font-black bg-violet-50 text-violet-700 hover:bg-violet-50 border-none">
                #{job.priority}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {onOutsource && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50" title="Outsource Job" onClick={onOutsource}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
            {onAction && (
              <Button size="sm" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest gap-2 shadow-sm" onClick={onAction}>
                {actionLabel} <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
