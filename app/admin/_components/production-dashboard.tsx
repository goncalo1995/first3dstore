'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Printer, Clock, AlertTriangle, PackageCheck, Zap, CheckCircle2 } from 'lucide-react'
import type { GlobalColor, ProductionJob, CatalogProduct, Spool, Printer as PrinterType } from '@/types'

interface ProductionDashboardProps {
  jobs: ProductionJob[]
  orders: CatalogProduct[]
  printers: PrinterType[]
  allColors: GlobalColor[]
  spools: Spool[]
}

export function ProductionDashboard({ jobs, orders, printers, allColors, spools }: ProductionDashboardProps) {
  // 1. Print Queue Summary (Next 5 by priority)
  const nextJobs = useMemo(() => {
    return jobs
      .filter((j: any) => j.status === 'queued' && !j.outsourced)
      .sort((a: any, b: any) => (a.priority ?? 999) - (b.priority ?? 999))
      .slice(0, 5)
  }, [jobs])

  // 2. Material Forecast (Shortages summary)
  const shortages = useMemo(() => {
    const requirements: Record<string, { color: string, hex: string, needed: number, have: number }> = {}

    // if (!allColors) return []
    
    // Initialize with allColors
    allColors?.forEach((c: any) => {
      requirements[c.id] = { color: c.name, hex: c.hex, needed: 0, have: 0 }
    })

    // Sum physical spools
    spools?.forEach((s: any) => {
      if (s.isActive && !s.isInbound && requirements[s.colorId]) {
        requirements[s.colorId].have += s.gramsRemaining
      }
    })

    // Sum needed grams from queued/printing jobs
    jobs?.forEach((j: any) => {
      if (['queued', 'printing'].includes(j.status)) {
        if (j.colorRequirements) {
          j.colorRequirements.forEach((cr: any) => {
            if (requirements[cr.colorId]) requirements[cr.colorId].needed += cr.grams * (j.quantity ?? 1)
          })
        } else if (j.globalColor?.id && requirements[j.globalColor.id]) {
          requirements[j.globalColor.id].needed += j.materialGrams * (j.quantity ?? 1)
        }
      }
    })

    return Object.values(requirements).filter(r => r.needed > r.have)
  }, [allColors, spools, jobs])

  // 3. Printer Stats
  const stats = useMemo(() => {
    const total = printers.length
    const idle = printers.filter((p: any) => p.status === 'idle').length
    const printing = printers.filter((p: any) => p.status === 'printing').length
    const maintenance = printers.filter((p: any) => p.status === 'maintenance').length
    return { total, idle, printing, maintenance }
  }, [printers])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Printer className="h-4 w-4 text-emerald-500" /> Machine Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-black">{stats.printing}</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">Active Printers</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-muted-foreground">{stats.idle}</p>
                <p className="text-[9px] uppercase font-bold text-muted-foreground">Idle</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-500" /> Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-black">{jobs.filter((j: any) => j.status === 'queued').length}</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">Jobs in Queue</p>
              </div>
              <Badge variant="secondary" className="bg-violet-50 text-violet-700 hover:bg-violet-50 border-none h-6">
                {jobs.filter((j: any) => j.status === 'printing').length} Live
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Shortages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-black">{shortages.length}</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">Materials Needed</p>
              </div>
              {shortages.length > 0 && (
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                   <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-sky-500" /> Assembly
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-black">{jobs.filter((j: any) => j.status === 'printed').length}</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">Parts Ready</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-sky-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Print Queue Summary */}
        <Card className="lg:col-span-2 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="h-4 w-4" /> Next in Queue (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {nextJobs.length === 0 ? (
                <p className="p-12 text-sm text-muted-foreground text-center italic">Queue is clear.</p>
              ) : nextJobs.map((job: any) => (
                <div key={job.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-4 w-4 rounded-full border shadow-sm ring-2 ring-background" style={{ backgroundColor: job.colorHex }} />
                    <div>
                      <p className="text-sm font-bold">{job.productName}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                        {job.partLabel} • {job.materialType || 'PLA'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold">{job.materialGrams}g</p>
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Material</p>
                    </div>
                    <Badge variant="secondary" className="h-6 font-bold bg-muted/50">
                      #{job.priority ?? '-'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Material Shortages */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Shortages
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {shortages.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-medium">Inventory is healthy.</p>
                </div>
              ) : shortages.map((s: any) => (
                <div key={s.color} className="p-4 flex items-center justify-between group hover:bg-amber-50/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: s.hex }} />
                    <div>
                      <p className="text-sm font-bold">{s.color}</p>
                      <p className="text-[10px] text-muted-foreground">Available: {s.have}g / Need: {s.needed}g</p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-100 h-6 font-bold">
                    -{s.needed - s.have}g
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Printer Status Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        {printers.map((printer: any) => (
          <Card key={printer.id} className="overflow-hidden border-muted/50 hover:border-primary/50 transition-all cursor-default">
            <div className={`h-1 w-full ${
              printer.status === 'printing' ? 'bg-emerald-500 animate-pulse' : 
              printer.status === 'maintenance' ? 'bg-amber-500' : 'bg-muted'
            }`} />
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-tight truncate">{printer.name}</span>
                <div className={`h-2 w-2 rounded-full ${
                  printer.status === 'printing' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                  printer.status === 'maintenance' ? 'bg-amber-500' : 'bg-muted-foreground/30'
                }`} />
              </div>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{printer.status}</p>
              {printer.status === 'printing' && (
                <div className="mt-2 flex items-center gap-1">
                   <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500 w-2/3" />
                   </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
