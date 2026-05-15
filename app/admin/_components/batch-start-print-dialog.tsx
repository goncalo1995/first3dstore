'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Layers, Play } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { startBatchPrint } from '@/app/admin/production/actions'
import type { GlobalColor, Printer, ProductionJob } from '@/types'

type RequirementGroup = {
  key: string
  colorId: string
  colorName: string
  colorHex: string
  materialType: string
  grams: number
  resolvedBy?: 'globalColorId' | 'name' | 'hex' | 'unresolved'
  jobIds: string[]
}

type SlotAssignment = {
  requirementKey: string
  slotId: string
  spoolId: string
  slotNumber: number
}

type JobRequirement = {
  colorId: string
  colorName: string
  colorHex: string
  materialType: string
  grams: number
  resolvedBy?: 'globalColorId' | 'name' | 'hex' | 'unresolved'
}

interface BatchStartPrintDialogProps {
  open: boolean
  jobs: ProductionJob[]
  printers: Printer[]
  colors: GlobalColor[]
  onClose: () => void
  onStarted: () => void
}

function requirementKey(colorId: string, materialType: string) {
  return `${colorId || 'unassigned'}::${materialType || 'PLA'}`
}

function getJobRequirements(job: any, colorById: Map<string, any>): JobRequirement[] {
  const rawRequirements = Array.isArray(job.colorRequirements) && job.colorRequirements.length > 0
    ? job.colorRequirements
    : [{ colorId: job.globalColor?.id, grams: job.materialGrams || 0 }]

  return rawRequirements.map((requirement: any) => {
    const colorId = requirement.colorId || job.globalColor?.id || 'unassigned'
    const color = colorById.get(colorId)
    const materialType = requirement.materialType || job.materialType || 'PLA'
    return {
      colorId,
      colorName: requirement.colorName || color?.name || job.colorName || 'Unassigned',
      colorHex: requirement.colorHex || color?.hex || job.colorHex || '#e5e7eb',
      materialType,
      grams: Number(requirement.grams || job.materialGrams || 0) * (job.quantity || 1),
      resolvedBy: requirement.resolvedBy,
    }
  })
}

function aggregateRequirements(jobs: any[], colors: GlobalColor[]) {
  const colorById = new Map((colors as any[]).map(color => [color.id, color]))
  const groups = new Map<string, RequirementGroup>()

  jobs.forEach(job => {
    getJobRequirements(job, colorById).forEach(requirement => {
      const key = requirementKey(requirement.colorId, requirement.materialType)
      const existing = groups.get(key)
      if (existing) {
        existing.grams += requirement.grams
        if (!existing.jobIds.includes(job.id)) existing.jobIds.push(job.id)
      } else {
        groups.set(key, {
          key,
          colorId: requirement.colorId,
          colorName: requirement.colorName,
          colorHex: requirement.colorHex,
          materialType: requirement.materialType,
          grams: requirement.grams,
          resolvedBy: requirement.resolvedBy,
          jobIds: [job.id],
        })
      }
    })
  })

  return Array.from(groups.values()).sort((a, b) => a.colorName.localeCompare(b.colorName))
}

export function BatchStartPrintDialog({
  open,
  jobs,
  printers,
  colors,
  onClose,
  onStarted,
}: BatchStartPrintDialogProps) {
  const defaultPrinter = useMemo(() => {
    const idlePrinter = (printers as any[]).find(printer => printer.status === 'idle')
    return idlePrinter || printers[0]
  }, [printers])

  const [printerId, setPrinterId] = useState<string>('')
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const selectedPrinter = (printers as any[]).find(printer => printer.id === printerId)
  const slots = useMemo(() => {
    return ((selectedPrinter?.slots || []) as any[])
      .filter(slot => slot.spool)
      .sort((a, b) => a.slotNumber - b.slotNumber)
  }, [selectedPrinter])

  const requirementGroups = useMemo(() => aggregateRequirements(jobs as any[], colors), [jobs, colors])

  useEffect(() => {
    if (open) {
      setPrinterId(defaultPrinter?.id || '')
    }
  }, [defaultPrinter?.id, open])

  useEffect(() => {
    const next: Record<string, string> = {}
    const usedSlots = new Set<string>()

    requirementGroups.forEach(requirement => {
      if (requirement.colorId === 'unassigned') return

      const availableSlots = slots.filter(slot => {
        return slot.spool && !usedSlots.has(slot.id)
      })
      if (availableSlots.length === 0) return

      const colorAndMaterialMatches = availableSlots.filter(slot => {
        return slot.spool?.materialType === requirement.materialType &&
          (slot.spool?.color?.id === requirement.colorId || slot.color?.id === requirement.colorId)
      })
      const colorMatches = availableSlots.filter(slot => {
        return slot.spool?.color?.id === requirement.colorId || slot.color?.id === requirement.colorId
      })
      const materialMatches = availableSlots.filter(slot => {
        return slot.spool?.materialType === requirement.materialType
      })
      const candidates = colorAndMaterialMatches.length > 0
        ? colorAndMaterialMatches
        : colorMatches.length > 0
          ? colorMatches
          : materialMatches.length > 0
            ? materialMatches
            : availableSlots
      const best = candidates.reduce((winner, current) => {
        return (current.spool?.gramsRemaining || 0) > (winner.spool?.gramsRemaining || 0) ? current : winner
      }, candidates[0])

      if (best) {
        next[requirement.key] = best.id
        usedSlots.add(best.id)
      }
    })

    setAssignments(next)
  }, [printerId, requirementGroups, slots])

  const assignmentPayload: SlotAssignment[] = requirementGroups.map(requirement => {
    const slot = slots.find(candidate => candidate.id === assignments[requirement.key])
    return {
      requirementKey: requirement.key,
      slotId: slot?.id || '',
      spoolId: slot?.spool?.id || '',
      slotNumber: slot?.slotNumber || 0,
    }
  })

  const missingAssignments = requirementGroups.filter(requirement => {
    const slot = slots.find(candidate => candidate.id === assignments[requirement.key])
    return !slot?.spool
  })

  const colorMismatches = requirementGroups.filter(requirement => {
    const slot = slots.find(candidate => candidate.id === assignments[requirement.key])
    const assignedColorId = slot?.spool?.color?.id || slot?.color?.id
    return slot?.spool && requirement.colorId !== 'unassigned' && assignedColorId !== requirement.colorId
  })

  const handleStart = async () => {
    if (!printerId) return toast.error('Select a printer')
    if (missingAssignments.length > 0) return toast.error('Map every requirement to a loaded slot')
    if (colorMismatches.length > 0) return toast.error('Map each requirement to a matching color')

    // Check for duplicate slot assignments
    const slotIdCounts = new Map<string, number>()
    assignmentPayload.forEach(assignment => {
      if (assignment.slotId) {
        slotIdCounts.set(assignment.slotId, (slotIdCounts.get(assignment.slotId) || 0) + 1)
      }
    })
    const duplicateSlot = Array.from(slotIdCounts.entries()).find(([_, count]) => count > 1)
    if (duplicateSlot) {
      return toast.error('Cannot assign the same slot to multiple requirements')
    }

    // Check for insufficient material in assigned spools
    for (const requirement of requirementGroups) {
      const assignment = assignmentPayload.find(a => a.requirementKey === requirement.key)
      if (assignment) {
        const slot = slots.find(s => s.id === assignment.slotId)
        const remainingGrams = slot?.spool?.gramsRemaining || 0
        if (remainingGrams < requirement.grams) {
          return toast.error(`Insufficient material: ${requirement.colorName} requires ${Math.round(requirement.grams)}g but spool only has ${Math.round(remainingGrams)}g`)
        }
      }
    }

    setLoading(true)
    try {
      await startBatchPrint({
        jobIds: jobs.map(job => job.id),
        printerId,
        slotAssignments: assignmentPayload.map(assignment => ({
          requirementKey: assignment.requirementKey,
          spoolId: assignment.spoolId,
          slotNumber: assignment.slotNumber,
        })),
      })
      toast.success(`Started ${jobs.length} jobs on one build plate`)
      onStarted()
    } catch (err: any) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] sm:max-w-xl md:max-w-2xl lg:max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
            <Play className="h-5 w-5 text-emerald-500" />
            Start Batch Print
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold">{jobs.length} jobs selected for one physical build plate</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">All selected jobs will print simultaneously</p>
            </div>
            <div className="w-full max-w-xs space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Printer</Label>
              <select
                value={printerId}
                onChange={event => setPrinterId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold"
              >
                {!defaultPrinter && <option value="">No printers available</option>}
                {(printers as any[]).map(printer => {
                  const activeJobIds = Array.isArray(printer.activeJobIds) ? printer.activeJobIds : []
                  return (
                    <option key={printer.id} value={printer.id}>
                      {printer.name} ({activeJobIds.length > 0 ? `${activeJobIds.length} active` : printer.status})
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest">Aggregated Requirements</h3>
                <Badge variant="secondary" className="text-[9px] font-black">{requirementGroups.length} GROUPS</Badge>
              </div>
              <div className="space-y-2">
                {requirementGroups.map(requirement => {
                  const slot = slots.find(candidate => candidate.id === assignments[requirement.key])
                  const materialMatch = slot?.spool?.materialType === requirement.materialType
                  const assignedColorId = slot?.spool?.color?.id || slot?.color?.id
                  const colorMatch = slot?.spool && (requirement.colorId === 'unassigned' || assignedColorId === requirement.colorId)
                  return (
                    <div key={requirement.key} className="rounded-lg border bg-background p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-md border shadow-sm" style={{ backgroundColor: requirement.colorHex }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">
                            {requirement.colorName}
                            {requirement.resolvedBy && requirement.resolvedBy !== 'globalColorId' && (
                              <span
                                className="ml-1 text-amber-500"
                                title="Cor resolvida por nome; pode não corresponder exactamente ao material actual"
                                role="img"
                                aria-label="Warning: color resolved by name may not match actual material"
                              >
                                ⚠
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {requirement.materialType} • {Math.round(requirement.grams)}g • {requirement.jobIds.length} job{requirement.jobIds.length === 1 ? '' : 's'}
                          </p>
                        </div>
                        {slot?.spool && colorMatch ? (
                          materialMatch ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      {slot?.spool && !materialMatch && colorMatch && (
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                          Material override: suggested {requirement.materialType}, selected {slot.spool.materialType}
                        </p>
                      )}
                      {slot?.spool && !colorMatch && (
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-red-600">
                          Color mismatch: select {requirement.colorName}
                        </p>
                      )}
                      <div className="mt-3">
                        <select
                          value={assignments[requirement.key] || ''}
                          onChange={event => setAssignments(prev => ({ ...prev, [requirement.key]: event.target.value }))}
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-bold"
                        >
                          <option value="">Assign slot...</option>
                          {slots.map(slot => {
                            const materialMatch = slot.spool?.materialType === requirement.materialType
                            const colorName = slot.spool?.color?.name || slot.color?.name || 'Unknown'
                            return (
                              <option key={slot.id} value={slot.id}>
                                Slot {slot.slotNumber}: {colorName} • {slot.spool?.materialType} • {slot.spool?.gramsRemaining}g{materialMatch ? '' : ' (material mismatch)'}
                              </option>
                            )
                          })}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest">Loaded Printer Slots</h3>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4].map(slotNumber => {
                  const slot = (selectedPrinter?.slots || []).find((candidate: any) => candidate.slotNumber === slotNumber)
                  const spool = slot?.spool
                  const color = spool?.color || slot?.color
                  const assignedRequirement = requirementGroups.find(requirement => assignments[requirement.key] === slot?.id)
                  const materialOverride = assignedRequirement && spool?.materialType !== assignedRequirement.materialType
                  return (
                    <div key={slotNumber} className="rounded-lg border bg-background p-3">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Slot {slotNumber}</p>
                      {spool ? (
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-md border shadow-sm" style={{ backgroundColor: color?.hex || '#e5e7eb' }} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">{color?.name || 'Unknown'}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {spool.materialType} • {spool.gramsRemaining}g
                            </p>
                            {materialOverride && (
                              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-amber-600">
                                Override for {assignedRequirement.materialType}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-muted-foreground">Empty</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleStart} disabled={loading || !printerId || missingAssignments.length > 0 || colorMismatches.length > 0}>
            {loading ? 'Starting...' : 'Start Build Plate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
