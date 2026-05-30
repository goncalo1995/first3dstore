'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { 
  LayoutDashboard, Printer as PrinterIcon, Calendar, Layers, HardDrive, 
  ExternalLink, History, RefreshCw, ArrowRight, PackageCheck, Play, Download,
  CheckCircle2, AlertTriangle, XCircle, ArrowLeft,
  Palette, Wrench
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
  detachProductionJob,
  overrideProductionJobState,
} from '@/app/admin/production/actions'

import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ModularProductionBomInline } from './modular-production-bom'

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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
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

  const [activeTab, setActiveTab] = useState('production')
  const [assigningJob, setAssigningJob] = useState<any>(null)
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [selectedJobDetails, setSelectedJobDetails] = useState<ProductionJob | null>(null)
  const [queueGroupingMode, setQueueGroupingMode] = useState<'order' | 'client' | 'color' | 'bagging' | 'raw'>('order')
  const selectedOrderKey = searchParams.get('order')

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
  const jobsByClient = useMemo(() => groupJobsByClient(queuedJobs), [queuedJobs])
  const jobsByColor = useMemo(() => groupJobsByColor(queuedJobs), [queuedJobs])
  const baggingGroups = useMemo(() => getBaggingGroups(queuedJobs), [queuedJobs])
  const orderGroups = useMemo(() => groupJobsByOrder(productionJobs as any[]), [productionJobs])
  const selectedOrderGroup = selectedOrderKey ? orderGroups.find(group => group.key === selectedOrderKey) : null

  if (isLoading) return <div className="flex h-[400px] items-center justify-center font-black uppercase tracking-[0.2em] animate-pulse text-muted-foreground/30">Syncing MRP Hub...</div>
  if (error) return <div className="p-8 text-destructive font-bold">Error loading hub: {error.message}</div>

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
    const orderItem = typeof job.orderItemIndex === 'number' ? job.order?.items?.[job.orderItemIndex] : undefined
    const variant = variantId ? product?.variants?.find((item: any) => item.id === variantId) : undefined
    const matchingFiles = files.filter((file: any) => !file.variantId || file.variantId === variantId)

    return {
      product,
      variant,
      orderItem,
      files: matchingFiles,
      estimatedPrintMinutes: job.estimatedPrintMinutes
        ?? matchingFiles.find((file: any) => Number(file.estimatedPrintMinutes) > 0)?.estimatedPrintMinutes
        ?? variant?.estimatedPrintMinutes,
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

      <Tabs value={activeTab} className="space-y-8" onValueChange={setActiveTab}> 
        <TabsList className="flex overflow-x-auto w-full justify-start h-auto bg-muted/50 scrollbar-hide gap-1 sm:gap-6">
           <TabsTrigger value="dashboard" className="rounded-lg font-black text-[10px] uppercase tracking-widest h-9 px-3 sm:px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <LayoutDashboard className="h-4 w-4 sm:mr-2 text-primary" /> <span className="ml-1 hidden xl:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="production" className="rounded-lg font-black text-[10px] uppercase tracking-widest h-9 px-3 sm:px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <PrinterIcon className="h-4 w-4 sm:mr-2" /> <span className="ml-1 hidden md:inline">Production</span>
              {queuedJobs.length > 0 && (
                <span className="ml-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[8px] font-black text-primary-foreground px-1">
                  {queuedJobs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-lg font-black text-[10px] uppercase tracking-widest h-9 px-3 sm:px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Palette className="h-4 w-4 sm:mr-2" /> <span className="ml-1 hidden md:inline">Spools</span>
            </TabsTrigger>
            <TabsTrigger value="fleet" className="rounded-lg font-black text-[10px] uppercase tracking-widest h-9 px-3 sm:px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <HardDrive className="h-4 w-4 sm:mr-2" /> <span className="ml-1 hidden md:inline">Printers</span>
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
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-lg tracking-tight uppercase">{selectedOrderGroup ? 'Order Drilldown' : 'Order Workbench'}</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                  {selectedOrderGroup
                    ? `${selectedOrderGroup.label} • ${selectedOrderGroup.jobs.length} production jobs`
                    : `${orderGroups.length} active orders • ${queuedJobs.length} unscheduled jobs`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-6 font-bold uppercase tracking-widest border-dashed">{queuedJobs.length} PENDING</Badge>
              </div>
            </div>

            {selectedOrderGroup && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-[10px] font-black uppercase tracking-widest"
                onClick={() => {
                  router.replace(pathname)
                  setSelectedJobIds([])
                }}
              >
                <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                Back to orders
              </Button>
            )}

            <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur">
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

            {!selectedOrderGroup && (
              <div className="flex flex-wrap gap-2 rounded-xl border bg-background p-2">
              {[
                ['order', 'By Order'],
                ['client', 'By Client'],
                ['color', 'By Color'],
                ['bagging', 'Bagging Checklist'],
                ['raw', 'Raw Jobs'],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={queueGroupingMode === value ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-[10px] font-black uppercase tracking-widest"
                  onClick={() => setQueueGroupingMode(value as typeof queueGroupingMode)}
                >
                  {label}
                </Button>
              ))}
              </div>
            )}

            {selectedOrderGroup ? (
              <OrderDrilldown
                group={selectedOrderGroup}
                selectedJobIds={selectedJobIds}
                onToggleJob={toggleJobSelection}
                onOpenDetails={(job) => setSelectedJobDetails(job)}
                onDetach={async (job) => {
                  try {
                    await detachProductionJob(job.id)
                    toast.success('Job detached to queue')
                  } catch (err: any) {
                    toast.error(err.message)
                  }
                }}
              />
            ) : queueGroupingMode === 'order' ? (
              <OrderWorkbench
                groups={orderGroups}
                onOpenOrder={(key) => router.replace(`${pathname}?order=${encodeURIComponent(key)}`)}
              />
            ) : queuedJobs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                <PrinterIcon className="h-10 w-10 mx-auto mb-4 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-xs">Queue is empty</p>
                <p className="text-[10px] mt-1">All jobs are scheduled or in production</p>
              </div>
            ) : queueGroupingMode === 'client' ? (
              <ClientGroupedQueue
                groups={jobsByClient}
                getJobPrintInfo={getJobPrintInfo}
                onOpenDetails={(job) => setSelectedJobDetails(job)}
              />
            ) : queueGroupingMode === 'color' ? (
              <ColorGroupedQueue
                groups={jobsByColor}
                getJobPrintInfo={getJobPrintInfo}
                onOpenDetails={(job) => setSelectedJobDetails(job)}
              />
            ) : queueGroupingMode === 'bagging' ? (
              <BaggingChecklist groups={baggingGroups} />
            ) : (
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {queuedJobs.map((job: ProductionJob) => (
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
                    onOpenDetails={() => setSelectedJobDetails(job)}
                  />
                ))}
              </div>
            )}
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

      {selectedJobDetails && (
        <PrintJobDetailsDialog
          job={selectedJobDetails}
          printInfo={getJobPrintInfo(selectedJobDetails)}
          onClose={() => setSelectedJobDetails(null)}
        />
      )}
    </div>
  )
}

type JobGroup = {
  key: string
  label: string
  detail: string
  colorHex?: string
  jobs: any[]
}

type BaggingGroup = {
  key: string
  client: string
  orderLabel: string
  items: {
    key: string
    quantity: number
    partLabel: string
    productName: string
    colorName: string
    colorHex?: string
  }[]
}

type ProductionOrderGroup = {
  key: string
  label: string
  detail: string
  order?: any
  jobs: any[]
  counts: Record<string, number>
  totalQuantity: number
  rails: number
  letters: number
  colors: { key: string; name: string; hex?: string; materialType?: string }[]
  activePrinters: string[]
}

function getJobOrderKey(job: any) {
  return String(job.orderId || job.orderRequestId || job.id || 'unassigned')
}

function getJobOrderLabel(job: any) {
  if (job.orderId) return `Order #${String(job.orderId).slice(0, 8)}`
  if (job.orderRequestId) return `Request #${String(job.orderRequestId).slice(0, 8)}`
  return `Job #${String(job.id).slice(0, 8)}`
}

function getJobClientName(job: any) {
  return String(job.order?.customerName || job.customerName || getJobOrderLabel(job))
}

function getJobColorKey(job: any) {
  return String(job.globalColor?.id || job.colorName || job.colorHex || 'unassigned').toLowerCase()
}

function getJobQuantity(job: any) {
  return Math.max(1, Number(job.quantity || 1))
}

function groupJobsByOrder(jobs: any[]): ProductionOrderGroup[] {
  const groups = new Map<string, ProductionOrderGroup>()
  for (const job of jobs) {
    const key = getJobOrderKey(job)
    const existing = groups.get(key) ?? {
      key,
      label: getJobClientName(job),
      detail: getJobOrderLabel(job),
      order: job.order,
      jobs: [] as any[],
      counts: {},
      totalQuantity: 0,
      rails: 0,
      letters: 0,
      colors: [] as ProductionOrderGroup['colors'],
      activePrinters: [] as string[],
    }
    const quantity = getJobQuantity(job)
    existing.jobs.push(job)
    existing.counts[job.status] = (existing.counts[job.status] ?? 0) + quantity
    existing.totalQuantity += quantity
    if (job.partType === 'rail') existing.rails += quantity
    if (job.partType === 'letter' || job.partType === 'extra_letter') existing.letters += quantity
    const colorKey = `${job.colorName || 'Unassigned'}::${job.colorHex || ''}::${job.materialType || 'PLA'}`
    if (!existing.colors.some(color => color.key === colorKey)) {
      existing.colors.push({
        key: colorKey,
        name: String(job.colorName || 'Unassigned'),
        hex: job.colorHex,
        materialType: job.materialType || 'PLA',
      })
    }
    if (job.status === 'printing' && job.printerId && !existing.activePrinters.includes(job.printerId)) {
      existing.activePrinters.push(job.printerId)
    }
    groups.set(key, existing)
  }
  return Array.from(groups.values()).sort((left, right) => {
    const leftBlocked = (left.counts.failed ?? 0) + (left.counts.cancelled ?? 0)
    const rightBlocked = (right.counts.failed ?? 0) + (right.counts.cancelled ?? 0)
    return rightBlocked - leftBlocked || left.label.localeCompare(right.label)
  })
}

function getProgressLabel(group: ProductionOrderGroup) {
  const queued = group.counts.queued ?? 0
  const printing = group.counts.printing ?? 0
  const printed = group.counts.printed ?? 0
  const assembled = group.counts.assembled ?? 0
  const blocked = (group.counts.failed ?? 0) + (group.counts.cancelled ?? 0)
  return { queued, printing, printed, assembled, blocked }
}

function groupJobsByClient(jobs: any[]): JobGroup[] {
  const groups = new Map<string, JobGroup>()
  for (const job of jobs) {
    const key = getJobOrderKey(job)
    const existing = groups.get(key) ?? {
      key,
      label: getJobClientName(job),
      detail: getJobOrderLabel(job),
      jobs: [] as any[],
    }
    existing.jobs.push(job)
    groups.set(key, existing)
  }
  return Array.from(groups.values()).sort((left, right) => left.label.localeCompare(right.label))
}

function groupJobsByColor(jobs: any[]): JobGroup[] {
  const groups = new Map<string, JobGroup>()
  for (const job of jobs) {
    const key = getJobColorKey(job)
    const existing = groups.get(key) ?? {
      key,
      label: String(job.colorName || 'Unassigned'),
      detail: String(job.materialType || 'PLA'),
      colorHex: job.colorHex,
      jobs: [] as any[],
    }
    existing.jobs.push(job)
    groups.set(key, existing)
  }
  return Array.from(groups.values()).sort((left, right) => left.label.localeCompare(right.label))
}

function getBaggingGroups(jobs: any[]): BaggingGroup[] {
  return groupJobsByClient(jobs).map(group => {
    const items = new Map<string, BaggingGroup['items'][number]>()
    for (const job of group.jobs) {
      const partLabel = String(job.partLabel || 'Part')
      const productName = String(job.productName || 'Product')
      const colorName = String(job.colorName || 'Unassigned')
      const key = `${productName}::${partLabel}::${colorName}`
      const existing = items.get(key) ?? {
        key,
        quantity: 0,
        partLabel,
        productName,
        colorName,
        colorHex: job.colorHex,
      }
      existing.quantity += getJobQuantity(job)
      items.set(key, existing)
    }

    return {
      key: group.key,
      client: group.label,
      orderLabel: group.detail,
      items: Array.from(items.values()).sort((left, right) => (
        left.colorName.localeCompare(right.colorName) || left.partLabel.localeCompare(right.partLabel)
      )),
    }
  })
}

function GroupedJobSection({
  group,
  getJobPrintInfo,
  onOpenDetails,
}: {
  group: JobGroup
  getJobPrintInfo: (job: any) => any
  onOpenDetails: (job: any) => void
}) {
  const totalQuantity = group.jobs.reduce((sum, job) => sum + getJobQuantity(job), 0)

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 p-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-black uppercase tracking-tight">
            {group.colorHex && <span className="h-4 w-4 rounded-md border shadow-sm" style={{ backgroundColor: group.colorHex }} />}
            {group.label}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group.detail}</p>
        </div>
        <Badge variant="outline" className="h-6 font-black uppercase tracking-widest">
          {totalQuantity} part{totalQuantity === 1 ? '' : 's'}
        </Badge>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {group.jobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            printInfo={getJobPrintInfo(job)}
            compact
            onOpenDetails={() => onOpenDetails(job)}
          />
        ))}
      </div>
    </div>
  )
}

function OrderWorkbench({
  groups,
  onOpenOrder,
}: {
  groups: ProductionOrderGroup[]
  onOpenOrder: (key: string) => void
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 p-12 text-center text-muted-foreground">
        <PackageCheck className="mx-auto mb-3 h-10 w-10 opacity-25" />
        <p className="text-xs font-black uppercase tracking-widest">No production orders yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map(group => {
        const progress = getProgressLabel(group)
        return (
          <button
            key={group.key}
            type="button"
            onClick={() => onOpenOrder(group.key)}
            className="w-full cursor-pointer rounded-xl border bg-background p-4 text-left shadow-sm transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-tight text-foreground">{group.label}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group.detail}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{group.totalQuantity} parts</Badge>
                {group.rails > 0 && <Badge variant="secondary">{group.rails} rails</Badge>}
                {group.letters > 0 && <Badge variant="secondary">{group.letters} letters</Badge>}
                {progress.blocked > 0 && <Badge variant="destructive">{progress.blocked} blocked</Badge>}
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_260px]">
              <div className="grid grid-cols-5 overflow-hidden rounded-lg border bg-muted/20 text-center text-[10px] font-black uppercase tracking-widest">
                {[
                  ['Queued', progress.queued],
                  ['Printing', progress.printing],
                  ['Printed', progress.printed],
                  ['Assembled', progress.assembled],
                  ['Blocked', progress.blocked],
                ].map(([label, value]) => (
                  <div key={label} className="border-r px-2 py-2 last:border-r-0">
                    <p className="text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {group.colors.slice(0, 6).map(color => (
                  <span key={color.key} className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span className="h-3 w-3 rounded-sm border" style={{ backgroundColor: color.hex || '#d1d5db' }} />
                    <span className="truncate">{color.name}</span>
                  </span>
                ))}
                {group.colors.length > 6 && <span className="text-[10px] font-bold text-muted-foreground">+{group.colors.length - 6}</span>}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function OrderDrilldown({
  group,
  selectedJobIds,
  onToggleJob,
  onOpenDetails,
  onDetach,
}: {
  group: ProductionOrderGroup
  selectedJobIds: string[]
  onToggleJob: (jobId: string, selected: boolean) => void
  onOpenDetails: (job: any) => void
  onDetach: (job: any) => void
}) {
  const grouped = groupOrderParts(group.jobs)
  const queuedSelectable = group.jobs.filter(job => job.status === 'queued' && !job.outsourced)

  return (
    <div className="space-y-5">
      {group.order && <ModularProductionBomInline record={group.order} />}

      <div className="rounded-xl border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 p-4">
          <div>
            <p className="text-sm font-black uppercase tracking-tight">{group.label}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {queuedSelectable.length} queued selectable jobs
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[10px] font-black uppercase tracking-widest"
            onClick={() => queuedSelectable.forEach(job => onToggleJob(job.id, true))}
          >
            Select queued
          </Button>
        </div>

        <div className="divide-y">
          {grouped.map(section => (
            <div key={section.key} className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{section.label}</p>
                <Badge variant="outline">{section.totalQuantity}x</Badge>
              </div>
              <div className="space-y-2">
                {section.rows.map(row => (
                  <div key={row.key} className="rounded-lg border bg-muted/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="flex min-w-0 items-center gap-3">
                        <Checkbox
                          checked={row.jobs.every((job: any) => selectedJobIds.includes(job.id))}
                          disabled={row.jobs.some((job: any) => job.status !== 'queued' || job.outsourced)}
                          onCheckedChange={(checked) => row.jobs.forEach((job: any) => onToggleJob(job.id, checked === true))}
                          aria-label={`Select ${row.label}`}
                        />
                        <span className="h-4 w-4 rounded-sm border" style={{ backgroundColor: row.colorHex || '#d1d5db' }} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black">{row.label}</span>
                          <span className="block truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {row.colorName} · {row.materialType} · {row.statusSummary}
                          </span>
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{row.quantity}x</Badge>
                        <Button type="button" variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest" onClick={() => onOpenDetails(row.jobs[0])}>
                          Details
                        </Button>
                        {row.jobs.some((job: any) => job.status === 'printing' || job.printerId) && (
                          <Button type="button" variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest" onClick={() => row.jobs.forEach(onDetach)}>
                            Detach
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function groupOrderParts(jobs: any[]) {
  const sectionLabels: Record<string, string> = {
    rail: 'Rails',
    letter: 'Letters',
    extra_letter: 'Extra letters',
    assembly: 'Assembly',
    catalog_part: 'Catalog parts',
    unknown: 'Other parts',
  }
  const sections = new Map<string, { key: string; label: string; totalQuantity: number; rows: any[] }>()
  const rowMaps = new Map<string, Map<string, any>>()

  for (const job of jobs) {
    const sectionKey = job.partType || 'unknown'
    const section = sections.get(sectionKey) ?? {
      key: sectionKey,
      label: sectionLabels[sectionKey] || sectionKey,
      totalQuantity: 0,
      rows: [],
    }
    const rowKey = `${job.partLabel}::${job.colorName}::${job.colorHex}::${job.materialType}::${job.status}`
    const rows = rowMaps.get(sectionKey) ?? new Map<string, any>()
    const existing = rows.get(rowKey) ?? {
      key: rowKey,
      label: job.partLabel || 'Part',
      colorName: job.colorName || 'Unassigned',
      colorHex: job.colorHex,
      materialType: job.materialType || 'PLA',
      quantity: 0,
      jobs: [],
      statusSummary: job.status,
    }
    existing.quantity += getJobQuantity(job)
    existing.jobs.push(job)
    rows.set(rowKey, existing)
    rowMaps.set(sectionKey, rows)
    section.totalQuantity += getJobQuantity(job)
    sections.set(sectionKey, section)
  }

  for (const section of sections.values()) {
    section.rows = Array.from(rowMaps.get(section.key)?.values() ?? [])
      .sort((left, right) => left.colorName.localeCompare(right.colorName) || left.label.localeCompare(right.label))
  }

  return Array.from(sections.values()).sort((left, right) => {
    const order = ['rail', 'letter', 'extra_letter', 'catalog_part', 'assembly', 'unknown']
    return order.indexOf(left.key) - order.indexOf(right.key)
  })
}

function ClientGroupedQueue({
  groups,
  getJobPrintInfo,
  onOpenDetails,
}: {
  groups: JobGroup[]
  getJobPrintInfo: (job: any) => any
  onOpenDetails: (job: any) => void
}) {
  return (
    <div className="space-y-4">
      {groups.map(group => (
        <GroupedJobSection
          key={group.key}
          group={group}
          getJobPrintInfo={getJobPrintInfo}
          onOpenDetails={onOpenDetails}
        />
      ))}
    </div>
  )
}

function ColorGroupedQueue({
  groups,
  getJobPrintInfo,
  onOpenDetails,
}: {
  groups: JobGroup[]
  getJobPrintInfo: (job: any) => any
  onOpenDetails: (job: any) => void
}) {
  return (
    <div className="space-y-4">
      {groups.map(group => (
        <GroupedJobSection
          key={group.key}
          group={group}
          getJobPrintInfo={getJobPrintInfo}
          onOpenDetails={onOpenDetails}
        />
      ))}
    </div>
  )
}

function BaggingChecklist({ groups }: { groups: BaggingGroup[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {groups.map(group => (
        <div key={group.key} className="overflow-hidden rounded-xl border bg-background">
          <div className="border-b bg-muted/30 p-4">
            <p className="text-sm font-black uppercase tracking-tight">Client: {group.client}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group.orderLabel}</p>
          </div>
          <div className="divide-y">
            {group.items.map(item => (
              <label key={item.key} className="flex cursor-pointer items-center justify-between gap-3 p-3 hover:bg-muted/30">
                <span className="flex min-w-0 items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-border" aria-label={`Packed ${item.partLabel}`} />
                  <span className="h-4 w-4 rounded-md border shadow-sm" style={{ backgroundColor: item.colorHex || '#d1d5db' }} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">
                      {item.quantity}x {item.partLabel} {item.colorName}
                    </span>
                    <span className="block truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {item.productName}
                    </span>
                  </span>
                </span>
                <PackageCheck className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </label>
            ))}
          </div>
        </div>
      ))}
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
    resolvedBy: requirement.resolvedBy,
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
	              <DialogDescription className="sr-only">Detalhes e ações para este registo.</DialogDescription>
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

function PrintJobDetailsDialog({ job, printInfo, onClose }: { job: any; printInfo: any; onClose: () => void }) {
  const requirements = getScheduleRequirements(job)
  const orderItem = printInfo?.orderItem
  const estimatedPrintMinutes = printInfo?.estimatedPrintMinutes
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [overrideLoading, setOverrideLoading] = useState(false)
  const detailRows = [
    ['Order', job.orderId ? `#${String(job.orderId).slice(0, 8)}` : 'No order'],
    ['Customer', job.order?.customerName ?? 'Unknown'],
    ['Product', job.productName],
    ['Variant', job.selectedVariantName ?? orderItem?.selectedVariant?.name ?? printInfo?.variant?.name ?? 'Default'],
    ['Part', job.partLabel],
    ['Status', job.status],
    ['Priority', job.priority ? `#${job.priority}` : 'Normal'],
    ['Material', job.materialType ?? 'PLA'],
    ['Grams', `${Math.round(Number(job.materialGrams ?? job.totalGrams ?? 0))}g`],
    ['Estimated print', estimatedPrintMinutes ? `${estimatedPrintMinutes} min` : 'Not set'],
  ]
  const runOverride = async (action: () => Promise<any>, message: string) => {
    setOverrideLoading(true)
    try {
      await action()
      toast.success(message)
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    }
    setOverrideLoading(false)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] sm:max-w-3xl overflow-y-auto p-0">
        <div className="border-b p-5">
          <DialogTitle className="font-black text-xl uppercase tracking-tight">Print Job Details</DialogTitle>
          <DialogDescription className="sr-only">Detalhes e ações para este registo.</DialogDescription>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {job.productName} · {job.partLabel}
          </p>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Job summary</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {detailRows.map(([label, value]) => (
                  <div key={label} className="rounded-lg border bg-background p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Color requirements</p>
              <div className="space-y-2">
                {requirements.map((requirement: any, index: number) => (
                  <div key={`${requirement.colorId}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="h-6 w-6 rounded-md border shadow-sm" style={{ backgroundColor: requirement.colorHex }} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {requirement.colorName}
                          {requirement.resolvedBy && requirement.resolvedBy !== 'globalColorId' && (
                            <span className="ml-1 text-amber-500" title="Cor resolvida por nome; pode não corresponder exactamente ao material actual">⚠</span>
                          )}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{requirement.materialType} · {Math.round(requirement.grams)}g</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase">{requirement.colorId}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {(job.customText || orderItem?.customText || job.notes || job.order?.notes || printInfo?.product?.slicerNotes) && (
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Instructions</p>
                <div className="space-y-3 text-sm">
                  {job.customText && <InstructionBlock label="Job custom text" value={job.customText} />}
                  {orderItem?.customText && orderItem.customText !== job.customText && <InstructionBlock label="Order item custom text" value={orderItem.customText} />}
                  {job.notes && <InstructionBlock label="Job notes" value={job.notes} />}
                  {job.order?.notes && <InstructionBlock label="Order notes" value={job.order.notes} />}
                  {printInfo?.product?.slicerNotes && <InstructionBlock label="Slicer notes" value={printInfo.product.slicerNotes} />}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            {job.imageUrl ? (
              <div className="overflow-hidden rounded-xl border bg-background">
                <img src={job.imageUrl} alt={`${job.productName} preview`} className="aspect-square w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed bg-muted/20 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                No preview image
              </div>
            )}

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Files</p>
              {printInfo?.files?.length ? (
                <div className="space-y-2">
                  {printInfo.files.map((file: any, index: number) => (
                    <Button key={`${file.url}-${index}`} asChild variant="outline" className="h-auto w-full justify-start px-3 py-2 text-left">
                      <a href={file.url} target="_blank" rel="noreferrer">
                        <Download className="mr-2 h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-black uppercase tracking-widest">{file.name || `STL ${index + 1}`}</span>
                          {(file.notes || file.estimatedPrintMinutes) && (
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {[file.estimatedPrintMinutes ? `${file.estimatedPrintMinutes} min` : null, file.notes].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </span>
                      </a>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No STL/3MF file matched this job or variant.</p>
              )}
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => setAdvancedOpen(open => !open)}
              >
                <span>
                  <span className="block text-[10px] font-black uppercase tracking-widest text-amber-600">Advanced controls</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Use only to recover stuck or manually handled parts.</span>
                </span>
                <Wrench className="h-4 w-4 text-amber-600" />
              </button>
              {advancedOpen && (
                <div className="mt-4 grid gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={overrideLoading} onClick={() => runOverride(() => detachProductionJob(job.id), 'Job returned to queue')}>
                    Detach to queue
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={overrideLoading} onClick={() => runOverride(() => overrideProductionJobState(job.id, 'printed', { note: 'Manual override to printed' }), 'Job marked printed')}>
                    Mark printed
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={overrideLoading} onClick={() => runOverride(() => overrideProductionJobState(job.id, 'assembled', { note: 'Manual override to assembled' }), 'Job marked assembled')}>
                    Mark assembled
                  </Button>
                  <Button type="button" variant="destructive" size="sm" disabled={overrideLoading} onClick={() => runOverride(() => overrideProductionJobState(job.id, 'cancelled', { detach: true, note: 'Manual override to cancelled' }), 'Job cancelled')}>
                    Cancel job
                  </Button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function InstructionBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value}</p>
    </div>
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
  onOpenDetails,
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
  onOpenDetails?: () => void,
  compact?: boolean
}) {
  return (
    <Card
      className={`relative overflow-hidden group hover:border-primary/50 transition-all shadow-sm ${onOpenDetails ? 'cursor-pointer' : ''} ${selected ? 'border-primary ring-2 ring-primary/15' : ''} ${job.status === 'printing' ? 'border-emerald-200' : ''}`}
      onClick={onOpenDetails}
    >
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-start justify-between gap-3">
          {onSelectedChange && (
            <div onClick={(event) => event.stopPropagation()}>
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelectedChange(checked === true)}
                aria-label={`Select ${job.productName}`}
                className="mt-0.5 h-6 w-6 border-2"
              />
            </div>
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
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/10 hover:text-primary" onClick={(event) => { event.stopPropagation(); onReorder(job.id, 'up') }}><ArrowRight className="h-3.5 w-3.5 -rotate-90" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/10 hover:text-primary" onClick={(event) => { event.stopPropagation(); onReorder(job.id, 'down') }}><ArrowRight className="h-3.5 w-3.5 rotate-90" /></Button>
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
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50" title="Outsource Job" onClick={(event) => { event.stopPropagation(); onOutsource() }}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
            {onAction && (
              <Button size="sm" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest gap-2 shadow-sm" onClick={(event) => { event.stopPropagation(); onAction() }}>
                {actionLabel} <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
