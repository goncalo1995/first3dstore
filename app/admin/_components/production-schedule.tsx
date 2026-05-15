'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Printer as PrinterIcon, Calendar, Play, Clock, ArrowRight, CheckCircle2, 
  XCircle, AlertTriangle, HardDrive, RotateCcw
} from 'lucide-react'
import { format, isSameDay, addDays, startOfDay } from 'date-fns'
import { updateJobStatuses, validatePrinterLoad } from '@/app/admin/production/actions'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

import type { ProductionJob, Printer } from '@/types'

interface ProductionScheduleProps {
  jobs: ProductionJob[]
  printers: Printer[]
}

export function ProductionSchedule({ jobs, printers }: ProductionScheduleProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [startDialogJob, setStartDialogJob] = useState<any>(null)
  const [finishDialogJob, setFinishDialogJob] = useState<any>(null)
  const [selectedPrinterId, setSelectedPrinterId] = useState('')
  const [validationResult, setValidationResult] = useState<any>(null)
  const [validating, setValidating] = useState(false)
  
  // Finish print form state
  const [finishStatus, setFinishStatus] = useState<'success' | 'failed'>('success')
  const [actualGrams, setActualGrams] = useState<number>(0)
  const [failReason, setFailReason] = useState('')
  const [autoRequeue, setAutoRequeue] = useState(true)
  
  // Slot mapping state for Start Print dialog
  const [printerSlots, setPrinterSlots] = useState<any[]>([])
  const [slotAssignments, setSlotAssignments] = useState<Record<number, string>>({}) // requirement index -> slot id
  const [selectedReqIndex, setSelectedReqIndex] = useState<number | null>(null)
  
  // 1. Filter jobs that belong on the timeline.
  const scheduledJobs = useMemo(() => {
    const visibleScheduledStatuses = new Set(['queued', 'printing', 'printed', 'failed'])

    return jobs
      .filter((j: any) => {
        if (j.scheduledDate) return visibleScheduledStatuses.has(j.status)
        return j.status === 'printing'
      })
      .sort((a: any, b: any) => {
        return getDateTime(getTimelineDate(a)) - getDateTime(getTimelineDate(b))
      })
  }, [jobs])

  // 2. Generate next 7 days for grouping
  const days = useMemo(() => {
    const today = startOfDay(new Date())
    return Array.from({ length: 7 }, (_, i) => addDays(today, i))
  }, [])

  // Open start print dialog
  const openStartDialog = (job: any) => {
    setStartDialogJob(job)
    setSelectedPrinterId(job.printerId || '')
    setValidationResult(null)
    setPrinterSlots([])
    setSlotAssignments({})
    setSelectedReqIndex(null)
    // Auto-validate if printer already assigned
    if (job.printerId) {
      handlePrinterChange(job.printerId, job)
    }
  }

  // Auto-map requirements to slots
  const autoMapRequirements = (job: any, slots: any[]) => {
    const requirements = job.colorRequirements || [{ colorId: job.globalColor?.id, colorName: job.colorName, grams: job.materialGrams }]
    const assignments: Record<number, string> = {}
    
    const usedSlotIds = new Set<string>()
    
    requirements.forEach((req: any, idx: number) => {
      if (req.colorId === 'unassigned') return

      const eligibleSlots = slots.filter((slot: any) => {
        if (!slot.spool) return false
        if (usedSlotIds.has(slot.id)) return false
        return true
      })
      
      if (eligibleSlots.length === 0) return
      
      const colorAndMaterialMatches = eligibleSlots.filter((s: any) => 
        s.spool.materialType === job.materialType &&
        (s.spool.color?.id === req.colorId || s.color?.id === req.colorId)
      )
      const colorMatches = eligibleSlots.filter((s: any) => 
        s.spool.color?.id === req.colorId || s.color?.id === req.colorId
      )
      const materialMatches = eligibleSlots.filter((s: any) => s.spool.materialType === job.materialType)
      
      const candidates = colorAndMaterialMatches.length > 0
        ? colorAndMaterialMatches
        : colorMatches.length > 0
          ? colorMatches
          : materialMatches.length > 0
            ? materialMatches
            : eligibleSlots
      
      // Pick slot with most grams remaining
      const bestSlot = candidates.reduce((best: any, current: any) => {
        const bestGrams = best.spool?.gramsRemaining || 0
        const currentGrams = current.spool?.gramsRemaining || 0
        return currentGrams > bestGrams ? current : best
      }, candidates[0])
      
      if (bestSlot) {
        assignments[idx] = bestSlot.id
        usedSlotIds.add(bestSlot.id)
      }
    })
    
    return assignments
  }

  // Run validation and fetch slots
  const runValidation = async (jobId: string, printerId: string, job?: any) => {
    setValidating(true)
    try {
      const [validationResult, slotsResult] = await Promise.all([
        validatePrinterLoad(jobId, printerId),
        // Fetch printer slots with spool data
        fetch(`/api/printers/${printerId}/slots`).then(r => r.json()).catch(() => ({ slots: [] }))
      ])
      
      setValidationResult(validationResult)
      
      const slots = slotsResult?.slots || []
      setPrinterSlots(slots)
      
      // Auto-map requirements to slots
      const targetJob = job || startDialogJob
      if (targetJob && slots.length > 0) {
        const assignments = autoMapRequirements(targetJob, slots)
        setSlotAssignments(assignments)
      }
    } catch (err: any) {
      toast.error(err.message)
    }
    setValidating(false)
  }

  // Handle printer change in dialog
  const handlePrinterChange = async (printerId: string, job?: any) => {
    setSelectedPrinterId(printerId)
    setPrinterSlots([])
    setSlotAssignments({})
    if (printerId && (job || startDialogJob)) {
      await runValidation((job || startDialogJob).id, printerId, job || startDialogJob)
    } else {
      setValidationResult(null)
    }
  }

  // Handle slot click for manual assignment
  const handleSlotClick = (slot: any, reqIndex: number) => {
    const job = startDialogJob
    if (!job) return

    // Reject slots with no loaded spool
    if (!slot.spool) {
      toast.error('Cannot assign empty slot. Please load a spool first.')
      return
    }

    if (slot.spool?.materialType !== job.materialType) {
      toast.warning(`Material override: job suggests ${job.materialType}, slot has ${slot.spool?.materialType}.`)
    }

    // Check if slot already assigned to another requirement
    const existingAssignment = Object.entries(slotAssignments).find(([idx, slotId]) =>
      slotId === slot.id && parseInt(idx) !== reqIndex
    )
    if (existingAssignment) {
      // Swap: unassign from other, assign to this
      setSlotAssignments(prev => {
        const currentAssignment = prev[reqIndex]
        const existingReqIndex = parseInt(existingAssignment[0])
        const newAssignments: Record<number, string> = {
          ...prev,
          [reqIndex]: slot.id,
        }
        // Only set the swapped assignment if it exists, otherwise delete the old key
        if (currentAssignment !== undefined) {
          newAssignments[existingReqIndex] = currentAssignment
        } else {
          delete newAssignments[existingReqIndex]
        }
        return newAssignments
      })
    } else {
      setSlotAssignments(prev => ({ ...prev, [reqIndex]: slot.id }))
    }
    setSelectedReqIndex(null)
  }

  // Confirm start print
  const confirmStartPrint = async () => {
    if (!startDialogJob || !selectedPrinterId) return

    // Check all requirements have slot assignments
    const requiredCount = startDialogJob.colorRequirements?.length || 1
    if (Object.keys(slotAssignments).length < requiredCount) {
      toast.error('Please assign all requirements to printer slots')
      return
    }

    const requirements = startDialogJob.colorRequirements?.length > 0
      ? startDialogJob.colorRequirements
      : [{ colorId: startDialogJob.globalColor?.id, colorName: startDialogJob.colorName }]
    const colorMismatch = requirements.some((req: any, reqIndex: number) => {
      if (!req.colorId || req.colorId === 'unassigned') return false
      const slot = printerSlots.find((candidate: any) => candidate.id === slotAssignments[reqIndex])
      const slotColorId = slot?.spool?.color?.id || slot?.color?.id
      return slotColorId !== req.colorId
    })
    if (colorMismatch) {
      toast.error('Please assign each requirement to a matching color slot')
      return
    }

    setLoading(startDialogJob.id)
    try {
      // Update job with selected printer and start
      const { startPrintingJobs, scheduleProductionJob } = await import('@/app/admin/production/actions')

      // If printer changed, update it first
      if (selectedPrinterId !== startDialogJob.printerId) {
        await scheduleProductionJob(startDialogJob.id, new Date(), selectedPrinterId)
      }

      // Convert slotAssignments to spoolsUsed format - validate slots have spools
      const spoolsUsed = Object.entries(slotAssignments)
        .reduce<{
          slotNumber: number
          spoolId: string
          requirementKey: string
          requirementIndex: number
          expectedGrams: number
          colorId?: string
          materialType?: 'PLA' | 'PETG' | 'ABS' | 'TPU'
          suggestedMaterialType?: 'PLA' | 'PETG' | 'ABS' | 'TPU'
        }[]>((acc, [reqIdx, slotId]) => {
          const requirementIndex = Number(reqIdx)
          const requirement = requirements[requirementIndex] || {}
          const slot = printerSlots.find((s: any) => s.id === slotId)
          if (!slot?.spool) {
            return acc
          }
          const suggestedMaterialType = requirement.materialType || startDialogJob.materialType || 'PLA'
          const materialType = slot.spool.materialType || suggestedMaterialType
          const colorId = requirement.colorId || startDialogJob.globalColor?.id
          acc.push({
            slotNumber: slot.slotNumber || 1,
            spoolId: slot.spool.id,
            requirementKey: `${colorId || 'unassigned'}::${suggestedMaterialType}`,
            requirementIndex,
            expectedGrams: Number(requirement.grams || startDialogJob.materialGrams || 0) * (startDialogJob.quantity || 1),
            colorId,
            materialType,
            suggestedMaterialType,
          })
          return acc
        }, [])

      if (spoolsUsed.length < requiredCount) {
        toast.error('One or more assigned slots are missing spools. Cannot start print.')
        setLoading(null)
        return
      }

      await startPrintingJobs([startDialogJob.id], selectedPrinterId, spoolsUsed)
      toast.success('Print started successfully')
      setStartDialogJob(null)
    } catch (err: any) {
      toast.error(err.message)
    }
    setLoading(null)
  }

  // State for spool selection in finish dialog
  const [loadedSpools, setLoadedSpools] = useState<any[]>([])
  const [selectedSpoolConsumptions, setSelectedSpoolConsumptions] = useState<{spoolId: string, grams: number, colorName: string}[]>([])

  // Open finish dialog
  const openFinishDialog = async (job: any) => {
    setFinishDialogJob(job)
    setFinishStatus('success')
    setActualGrams(job.materialGrams || 0)
    setFailReason('')
    setAutoRequeue(true)
    
    // Fetch loaded spools for this printer
    if (job.printerId) {
      const printer = printers.find((p: any) => p.id === job.printerId)
      if (printer && (printer as any).slots) {
        const slotsWithSpools = (printer as any).slots.filter((s: any) => s.spool)
        setLoadedSpools(slotsWithSpools.map((s: any) => s.spool))
        // Default: select first spool with all grams
        if (slotsWithSpools.length > 0) {
          const targetColorId = getJobColorId(job)
          const targetColorName = (job.colorRequirements?.[0]?.colorName || job.globalColor?.name || job.colorName || '').toLowerCase()
          const matchingSlot = slotsWithSpools.find((slot: any) => {
            const spoolColorId = slot.spool?.color?.id || slot.color?.id
            const spoolColorName = (slot.spool?.color?.name || slot.color?.name || '').toLowerCase()
            return targetColorId
              ? spoolColorId === targetColorId
              : targetColorName && spoolColorName === targetColorName
          })
          const firstSpool = (matchingSlot || slotsWithSpools[0]).spool
          setSelectedSpoolConsumptions([{
            spoolId: firstSpool.id,
            grams: job.materialGrams || 0,
            colorName: firstSpool.color?.name || 'Unknown'
          }])
        }
      } else {
        setLoadedSpools([])
        setSelectedSpoolConsumptions([])
      }
    }
  }

  // Update grams for a selected spool
  const updateSpoolGrams = (spoolId: string, grams: number) => {
    const nextGrams = Number.isFinite(grams) ? Math.max(0, grams) : 0
    setSelectedSpoolConsumptions(prev => 
      prev.map(s => s.spoolId === spoolId ? { ...s, grams: nextGrams } : s)
    )
  }

  // Toggle spool selection
  const toggleSpoolSelection = (spool: any) => {
    setSelectedSpoolConsumptions(prev => {
      const exists = prev.find(s => s.spoolId === spool.id)
      if (exists) {
        return prev.filter(s => s.spoolId !== spool.id)
      }
      // Add with default grams split
      const remainingGrams = Math.max(0, (finishDialogJob?.materialGrams || 0) - prev.reduce((sum, s) => sum + s.grams, 0))
      return [...prev, {
        spoolId: spool.id,
        grams: remainingGrams > 0 ? remainingGrams : 0,
        colorName: spool.color?.name || 'Unknown'
      }]
    })
  }

  // Confirm finish print
  const confirmFinishPrint = async () => {
    if (!finishDialogJob) return

    setLoading(finishDialogJob.id)
    try {
      const { finishPrintWithLog } = await import('@/app/admin/production/actions')
      
      const result = await finishPrintWithLog({
        jobId: finishDialogJob.id,
        printerId: finishDialogJob.printerId,
        actualGrams,
        status: finishStatus,
        failReason: finishStatus === 'failed' ? failReason : undefined,
        autoRequeue: finishStatus === 'failed' ? autoRequeue : undefined,
        spoolConsumptions: finishStatus === 'success' ? selectedSpoolConsumptions : undefined,
      })

      if (finishStatus === 'success') {
        toast.success('Print marked complete! Material consumed and logged.')
      } else if (autoRequeue) {
        toast.success(`Print marked failed. Requeued ${result.remainingQty} units for retry.`)
      } else {
        toast.warning('Print marked failed. Job closed.')
      }
      
      setFinishDialogJob(null)
    } catch (err: any) {
      toast.error(err.message)
    }
    setLoading(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Production Timeline</h2>
        <p className="text-sm text-muted-foreground">Machine allocation and daily manufacturing targets.</p>
      </div>

      <div className="space-y-10">
        {days.map(day => {
          const dayJobs = scheduledJobs.filter((j: any) => isSameDay(getTimelineDate(j), day))
          if (dayJobs.length === 0 && !isSameDay(day, new Date())) return null

          return (
            <div key={day.toISOString()} className="space-y-4">
              <div className="flex items-center gap-3 sticky top-0 z-10 py-2 border-b">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-black text-lg tracking-tight uppercase">
                  {format(day, 'EEEE, MMM do')}
                </h3>
                {isSameDay(day, new Date()) && (
                  <Badge className="bg-emerald-500 text-white border-none font-bold">TODAY</Badge>
                )}
              </div>

              {dayJobs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 px-2 italic">No manufacturing targets for this date.</p>
              ) : (
                <div className="grid gap-4">
                  {[...printers, { id: '__unassigned__', name: 'Unassigned', status: 'scheduled' }].map((printer: any) => {
                    const printerJobs = printer.id === '__unassigned__'
                      ? dayJobs.filter((j: any) => !j.printerId && j.status !== 'printing')
                      : dayJobs.filter((j: any) => j.printerId === printer.id)
                    if (printerJobs.length === 0) return null

                    return (
                      <Card key={printer.id} className="overflow-hidden border-muted/50 shadow-sm">
                        <div className="bg-muted/50 p-3 px-4 flex items-center justify-between border-b">
                          <div className="flex items-center gap-3">
                            <PrinterIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-black uppercase tracking-widest">{printer.name}</span>
                          </div>
                          <Badge variant="outline" className={`text-[9px] font-black uppercase ${
                            printer.status === 'printing' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : ''
                          }`}>
                            {printer.status}
                          </Badge>
                        </div>
                        <div className="divide-y divide-border/50">
                          {printerJobs.map((job: any) => (
                            <div key={job.id} className="p-4 flex flex-wrap items-center justify-between gap-6 hover:bg-muted/10 transition-colors">
                              <div className="flex items-center gap-4 flex-1 min-w-[250px]">
                                <div className="h-5 w-5 rounded-lg border-2 shadow-sm ring-2 ring-background" style={{ backgroundColor: job.colorHex }} />
                                <div>
                                  <h4 className="text-sm font-black tracking-tight">{job.productName}</h4>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{job.partLabel}</span>
                                    <span className="text-[10px] text-muted-foreground/50">•</span>
                                    <Badge variant="secondary" className="text-[9px] h-4 font-bold px-1.5">{job.quantity}x UNITS</Badge>
                                    <Badge variant="outline" className="text-[9px] h-4 font-bold px-1.5 border-dashed">{job.materialType || 'PLA'}</Badge>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-8">
                                <div className="text-right">
                                  <p className="text-sm font-black font-mono">{job.materialGrams}g</p>
                                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Est. Material</p>
                                </div>
                                
                                <Badge variant="outline" className={`text-[9px] h-5 font-black uppercase ${
                                  job.status === 'printing' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                                  job.status === 'printed' ? 'border-sky-200 bg-sky-50 text-sky-700' :
                                  job.status === 'failed' ? 'border-red-200 bg-red-50 text-red-700' :
                                  ''
                                }`}>
                                  {job.status}
                                </Badge>

                                {job.status === 'printing' ? (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="h-9 px-4 font-bold shadow-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50" 
                                    onClick={() => openFinishDialog(job)}
                                    disabled={loading === job.id}
                                  >
                                    {loading === job.id ? <Clock className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5 mr-2" /> FINISH</>}
                                  </Button>
                                ) : job.status === 'queued' ? (
                                  <Button 
                                    size="sm" 
                                    className="h-9 px-4 font-bold shadow-sm" 
                                    onClick={() => openStartDialog(job)}
                                    disabled={loading === job.id}
                                  >
                                    {loading === job.id ? <Clock className="h-4 w-4 animate-spin" /> : <>START PRINT <ArrowRight className="h-3.5 w-3.5 ml-2" /></>}
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* START PRINT DIALOG */}
      <Dialog open={!!startDialogJob} onOpenChange={(open) => !open && setStartDialogJob(null)}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black text-lg uppercase tracking-tight flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-500" />
              Start Manufacturing
            </DialogTitle>
          </DialogHeader>
          
          {startDialogJob && (
            <div className="space-y-6 py-4">
              {/* Job Summary */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-md border shadow-sm" style={{ backgroundColor: startDialogJob.colorHex }} />
                  <div>
                    <p className="font-black text-sm">{startDialogJob.productName}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{startDialogJob.partLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <Badge variant="secondary" className="text-[10px] h-5">{startDialogJob.quantity}x UNITS</Badge>
                  <Badge variant="outline" className="text-[10px] h-5 border-dashed">{startDialogJob.materialType || 'PLA'}</Badge>
                  <span className="text-[11px] font-black font-mono text-muted-foreground">{startDialogJob.materialGrams}g est.</span>
                </div>
              </div>

              {/* Printer Selection */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Machine</Label>
                <select
                  className="h-11 w-full rounded-xl border-2 bg-background px-3 py-2 text-sm font-bold shadow-sm focus:border-primary outline-none transition-all"
                  value={selectedPrinterId}
                  onChange={(e) => handlePrinterChange(e.target.value)}
                >
                  <option value="">Choose printer...</option>
                  {printers.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status}){p.status === 'printing' ? ' - BUSY' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Slot Mapping UI - Side by Side */}
              {selectedPrinterId && validating && (
                <div className="rounded-lg border-2 p-4 bg-muted/30 border-muted">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 animate-spin" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Loading printer configuration...</span>
                  </div>
                </div>
              )}
              
              {selectedPrinterId && !validating && printerSlots.length > 0 && startDialogJob && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Material Assignment
                    </Label>
                    <span className="text-[9px] text-muted-foreground">
                      Click slot to reassign • Material overrides are allowed
                    </span>
                  </div>
                  
                  {/* Side-by-side view */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Left: Job Requirements */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Job Requires</p>
                      {(startDialogJob.colorRequirements?.length > 0 
                        ? startDialogJob.colorRequirements 
                        : [{ colorId: startDialogJob.globalColor?.id, colorName: startDialogJob.colorName, colorHex: startDialogJob.colorHex, grams: startDialogJob.materialGrams }]
                      ).map((req: any, idx: number) => {
                        const assignedSlotId = slotAssignments[idx]
                        const assignedSlot = printerSlots.find((s: any) => s.id === assignedSlotId)
                        const isSelected = selectedReqIndex === idx
                        const suggestedMaterial = req.materialType || startDialogJob.materialType || 'PLA'
                        const materialMismatch = assignedSlot?.spool && assignedSlot.spool.materialType !== suggestedMaterial
                        
                        return (
                          <div 
                            key={idx}
                            className={`rounded-lg border-2 p-3 cursor-pointer transition-all ${
                              isSelected ? 'border-primary bg-primary/5' : 'border-muted bg-muted/30 hover:border-muted-foreground/30'
                            }`}
                            onClick={() => setSelectedReqIndex(isSelected ? null : idx)}
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-6 w-6 rounded-md border shadow-sm shrink-0"
                                style={{ backgroundColor: req.colorHex || startDialogJob.colorHex || '#e5e7eb', borderColor: req.colorHex || startDialogJob.colorHex || '#e5e7eb' }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black truncate">
                                  {req.colorName || startDialogJob.colorName}
                                  {req.resolvedBy && req.resolvedBy !== 'globalColorId' && (
                                    <span
                                      className="ml-1 text-amber-500"
                                      title="Cor resolvida por nome; pode não corresponder exactamente ao material actual"
                                      role="img"
                                      aria-label="Warning: color resolved by name; may not match current material"
                                    >
                                      ⚠
                                    </span>
                                  )}
                                </p>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase">
                                  {suggestedMaterial} • {req.grams || startDialogJob.materialGrams}g
                                </p>
                              </div>
                            </div>
                            {assignedSlot && (
                              <div className="mt-2 pt-2 border-t border-dashed flex items-center gap-2">
                                <span className="text-[9px] font-bold text-emerald-600">→ Slot {assignedSlot.slotNumber}</span>
                                {assignedSlot.spool?.gramsRemaining < (req.grams || startDialogJob.materialGrams) && (
                                  <span className="text-[8px] font-bold text-red-500">⚠ Low filament</span>
                                )}
                                {materialMismatch && (
                                  <span className="text-[8px] font-bold text-amber-600">⚠ {assignedSlot.spool.materialType} override</span>
                                )}
                              </div>
                            )}
                            {!assignedSlot && (
                              <div className="mt-2 pt-2 border-t border-dashed">
                                <span className="text-[9px] font-bold text-red-500">⚠ No matching slot</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Right: Printer Slots */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Printer Slots</p>
                      {[...printerSlots].sort((a: any, b: any) => a.slotNumber - b.slotNumber).map((slot: any) => {
                        const assignedToReq = Object.entries(slotAssignments).find(([idx, slotId]) => slotId === slot.id)
                        const reqIndex = assignedToReq ? parseInt(assignedToReq[0]) : null
                        const suggestedMaterial = reqIndex !== null
                          ? (startDialogJob?.colorRequirements?.[reqIndex]?.materialType || startDialogJob?.materialType || 'PLA')
                          : (startDialogJob?.materialType || 'PLA')
                        const isMaterialMatch = slot.spool?.materialType === suggestedMaterial
                        const isColorMatch = reqIndex !== null && (
                          slot.spool?.color?.id === (startDialogJob?.colorRequirements?.[reqIndex]?.colorId || startDialogJob?.globalColor?.id) ||
                          slot.color?.id === (startDialogJob?.colorRequirements?.[reqIndex]?.colorId || startDialogJob?.globalColor?.id)
                        )
                        const jobGrams = startDialogJob?.colorRequirements?.[reqIndex!]?.grams || startDialogJob?.materialGrams || 0
                        const isLowGrams = slot.spool && slot.spool.gramsRemaining < jobGrams
                        
                        return (
                          <div 
                            key={slot.id}
                            className={`rounded-lg border-2 p-3 transition-all ${
                              assignedToReq 
                                ? 'border-primary bg-primary/5' 
                                : 'border-muted bg-muted/30 hover:border-muted-foreground/30 cursor-pointer'
                            } ${selectedReqIndex !== null ? 'ring-2 ring-primary/20' : ''}`}
                            onClick={() => {
                              if (selectedReqIndex !== null) { // && isMaterialMatch) {
                                handleSlotClick(slot, selectedReqIndex)
                              }
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-black uppercase tracking-widest">Slot {slot.slotNumber}</span>
                              {!isMaterialMatch && slot.spool && (
                                <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{slot.spool.materialType} override</span>
                              )}
                            </div>
                            
                            {slot.spool ? (
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-6 w-6 rounded-md border shadow-sm shrink-0"
                                  style={{ 
                                    backgroundColor: slot.spool.color?.hex || slot.color?.hex || '#e5e7eb', 
                                    borderColor: slot.spool.color?.hex || slot.color?.hex || '#e5e7eb' 
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-black truncate">{slot.spool.color?.name || slot.color?.name || 'Unknown'}</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-muted-foreground font-mono">{slot.spool.gramsRemaining}g</span>
                                    {isLowGrams && (
                                      <span className="text-[8px] font-bold text-red-500">⚠ Low</span>
                                    )}
                                    {assignedToReq && !isColorMatch && (
                                      <span className="text-[8px] font-bold text-amber-500">⚠ Color mismatch</span>
                                    )}
                                  </div>
                                </div>
                                {assignedToReq && (
                                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <div className="h-6 w-6 rounded-md border-2 border-dashed border-muted-foreground/30 shrink-0" />
                                <span className="text-[10px] font-bold uppercase">Empty</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Status summary */}
                  <div className={`rounded-lg border-2 p-3 ${
                    Object.keys(slotAssignments).length === (startDialogJob.colorRequirements?.length || 1) 
                      ? 'bg-emerald-50/50 border-emerald-200' 
                      : 'bg-red-50/50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      {Object.keys(slotAssignments).length === (startDialogJob.colorRequirements?.length || 1) ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-black text-emerald-700">Ready to Print</p>
                            <p className="text-[10px] text-emerald-600/80">All requirements mapped to slots.</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-black text-red-700">Incomplete Assignment</p>
                            <p className="text-[10px] text-red-600/80">
                              {Object.keys(slotAssignments).length} of {(startDialogJob.colorRequirements?.length || 1)} requirements assigned.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {selectedReqIndex !== null && (
                    <p className="text-[10px] text-center text-primary font-bold animate-pulse">
                      Click a slot on the right to assign to requirement #{selectedReqIndex + 1}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setStartDialogJob(null)}>Cancel</Button>
            <Button 
              onClick={confirmStartPrint}
              disabled={!selectedPrinterId || validating || Object.keys(slotAssignments).length < (startDialogJob?.colorRequirements?.length || 1)}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              BEGIN MANUFACTURING
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FINISH PRINT DIALOG */}
      <Dialog open={!!finishDialogJob} onOpenChange={(open) => !open && setFinishDialogJob(null)}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black text-lg uppercase tracking-tight flex items-center gap-2">
              {finishStatus === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Complete Manufacturing
            </DialogTitle>
          </DialogHeader>
          
          {finishDialogJob && (
            <div className="space-y-6 py-4">
              {/* Job Summary */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-md border shadow-sm" style={{ backgroundColor: finishDialogJob.colorHex }} />
                  <div>
                    <p className="font-black text-sm">{finishDialogJob.productName}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{finishDialogJob.partLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <Badge variant="secondary" className="text-[10px] h-5">{finishDialogJob.quantity}x UNITS</Badge>
                  <Badge variant="outline" className="text-[10px] h-5 border-dashed">{finishDialogJob.materialType || 'PLA'}</Badge>
                </div>
              </div>

              {/* Status Selection */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Print Status</Label>
                <RadioGroup 
                  value={finishStatus} 
                  onValueChange={(v) => setFinishStatus(v as 'success' | 'failed')}
                  className="grid grid-cols-2 gap-3"
                >
                  <div>
                    <RadioGroupItem value="success" id="success" className="peer sr-only" />
                    <Label 
                      htmlFor="success" 
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-50 cursor-pointer"
                    >
                      <CheckCircle2 className="h-5 w-5 mb-2 text-emerald-500" />
                      <span className="font-black text-sm">SUCCESS</span>
                      <span className="text-[9px] text-muted-foreground">All parts OK</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="failed" id="failed" className="peer sr-only" />
                    <Label 
                      htmlFor="failed" 
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50 cursor-pointer"
                    >
                      <XCircle className="h-5 w-5 mb-2 text-red-500" />
                      <span className="font-black text-sm">FAILED</span>
                      <span className="text-[9px] text-muted-foreground">Quality issues</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Spool Selection for Grams Consumption */}
              {loadedSpools.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Deduct Material From Spools
                  </Label>
                  <div className="space-y-2">
                    {loadedSpools.map((spool: any) => {
                      const isSelected = selectedSpoolConsumptions.find(s => s.spoolId === spool.id)
                      const colorHex = spool.color?.hex || '#e5e7eb'
                      return (
                        <div 
                          key={spool.id} 
                          className={`rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-muted bg-muted/30 hover:border-muted-foreground/30'
                          }`}
                          onClick={() => toggleSpoolSelection(spool)}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="h-8 w-8 rounded-md border-2 shadow-sm shrink-0"
                              style={{ backgroundColor: colorHex, borderColor: colorHex }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black truncate">{spool.color?.name || 'Unknown'}</p>
                              <p className="text-[10px] text-muted-foreground font-bold uppercase">
                                {spool.materialType || 'PLA'} • {spool.gramsRemaining}g available
                              </p>
                            </div>
                            {isSelected ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={isSelected.grams}
	                                  onChange={(e) => {
	                                    e.stopPropagation()
	                                    updateSpoolGrams(spool.id, Number(e.target.value))
	                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-8 w-20 text-sm font-bold"
                                />
                                <span className="text-xs font-bold text-muted-foreground">g</span>
                                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                              </div>
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-muted-foreground">Total Allocated:</span>
                    <span className={`font-black font-mono ${
                      selectedSpoolConsumptions.reduce((sum, s) => sum + s.grams, 0) === actualGrams 
                        ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {selectedSpoolConsumptions.reduce((sum, s) => sum + s.grams, 0)}g / {actualGrams}g
                    </span>
                  </div>
                </div>
              )}

              {/* Actual Grams Total */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Total Actual Grams Used (estimated: {finishDialogJob.materialGrams}g)
                </Label>
                <Input
	                  type="number"
	                  value={actualGrams}
	                  onChange={(e) => {
                      const nextGrams = Number(e.target.value)
                      setActualGrams(Number.isFinite(nextGrams) ? Math.max(0, nextGrams) : 0)
                    }}
	                  className="h-11 font-bold rounded-xl border-2"
	                />
              </div>

              {/* Failure Details */}
              {finishStatus === 'failed' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-red-600">Failure Reason</Label>
                    <Textarea
                      placeholder="Describe what went wrong (e.g., layer shift, bad first layer, human error...)"
                      value={failReason}
                      onChange={(e) => setFailReason(e.target.value)}
                      className="min-h-[80px] text-sm"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <input
                      type="checkbox"
                      id="auto-requeue"
                      checked={autoRequeue}
                      onChange={(e) => setAutoRequeue(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-400 text-amber-500 focus:ring-amber-500"
                    />
                    <Label htmlFor="auto-requeue" className="text-sm font-medium cursor-pointer flex-1">
                      <span className="font-bold text-amber-700">Auto-requeue remaining parts</span>
                      <p className="text-[10px] text-amber-600/80">Creates new job for unprinted units</p>
                    </Label>
                    <RotateCcw className="h-4 w-4 text-amber-500" />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setFinishDialogJob(null)}>Cancel</Button>
            <Button 
              onClick={confirmFinishPrint}
              disabled={loading === finishDialogJob?.id || (finishStatus === 'failed' && !failReason)}
              className={finishStatus === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}
            >
              {finishStatus === 'success' ? 'MARK COMPLETE' : 'MARK FAILED & REQUEUE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getDateTime(value: any) {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  return new Date(value).getTime()
}

function getTimelineDate(job: any) {
  if (job.scheduledDate) return new Date(job.scheduledDate)
  if (job.startedAt) return new Date(job.startedAt)
  return new Date()
}

function getJobColorId(job: any) {
  return job.colorRequirements?.[0]?.colorId || job.globalColor?.id
}
