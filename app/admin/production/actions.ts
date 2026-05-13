'use server'

import { dbAdmin } from '@/lib/db-admin'
import { id } from '@instantdb/admin'

type JobStatus = 'queued' | 'printing' | 'printed' | 'assembled' | 'failed' | 'cancelled'

// ─── Types ───────────────────────────────────────────────────────────
type OrderItem = {
  productId?: string
  productName: string
  quantity: number
  colors: string[]
  selectedColor?: {
    name: string
    hex: string
    imageUrl?: string
    globalColorId?: string
    colorPriceAdd?: number
  }
  selectedColors?: {
    name: string
    hex: string
    imageUrl?: string
    globalColorId?: string
    colorPriceAdd?: number
  }[]
  selectedParts?: {
    label: string
    colorName: string
    colorHex: string
    globalColorId?: string
    colorPriceAdd?: number
    resolvedBy?: 'globalColorId' | 'name' | 'hex' | 'unresolved'
    grams: number
  }[]
  selectedVariant?: {
    id?: string
    name: string
    kind?: string
    colors: (string | {
      name: string
      hex?: string
      imageUrl?: string
      globalColorId?: string
      priceAdd?: number
    })[]
  }
  customText?: string
  unitPrice: number
}

type CatalogProduct = {
  id: string
  slug: string
  name: string
  materialRecipe?: { label: string; grams: number; materialType?: 'PLA' | 'PETG' | 'ABS' | 'TPU' }[]
  materialGrams?: number
  multiColor?: boolean
}

type GlobalColor = {
  id: string
  name: string
  hex: string
}

type BatchSlotAssignment = {
  requirementKey: string
  spoolId: string
  slotNumber: number
}

type SingleSlotAssignment = {
  slotNumber: number
  spoolId: string
  requirementKey?: string
  requirementIndex?: number
  expectedGrams?: number
  colorId?: string
  materialType?: 'PLA' | 'PETG' | 'ABS' | 'TPU'
  suggestedMaterialType?: 'PLA' | 'PETG' | 'ABS' | 'TPU'
}

type BatchOutcome = {
  jobId: string
  status: 'success' | 'failed'
  spoolConsumptions?: { spoolId: string; grams: number; slotNumber?: number }[]
  wasteConsumptions?: { spoolId: string; grams: number; slotNumber?: number }[]
  failReason?: string
}

function getRequirementKey(colorId: string | undefined, materialType: string | undefined) {
  return `${colorId || 'unassigned'}::${materialType || 'PLA'}`
}

function normalizeColorLookupName(value: string) {
  return value.trim().toLowerCase()
}

function normalizeHex(value: string | undefined) {
  const trimmed = String(value ?? '').trim().toLowerCase()
  if (!trimmed) return ''
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

function displayColorName(value: string) {
  const trimmed = value.trim()
  if (!trimmed.includes(':')) return trimmed
  return trimmed.split(':').slice(1).join(':').trim() || trimmed
}

function resolveGlobalColor(
  lookups: {
    byId: Map<string, GlobalColor>
    byName: Map<string, GlobalColor>
    byHex: Map<string, GlobalColor>
  },
  color: { globalColorId?: string; name?: string; hex?: string } | string | undefined,
) {
  if (!color) return { color: undefined, resolvedBy: 'unresolved' as const }
  const rawName = typeof color === 'string' ? color : color.name
  const globalColorId = typeof color === 'string' ? undefined : color.globalColorId
  const hex = typeof color === 'string' ? undefined : color.hex
  if (globalColorId) {
    const byId = lookups.byId.get(globalColorId)
    if (byId) return { color: byId, resolvedBy: 'globalColorId' as const }
  }
  if (hex) {
    const byHex = lookups.byHex.get(normalizeHex(hex))
    if (byHex) return { color: byHex, resolvedBy: 'hex' as const }
  }
  if (!rawName) return { color: undefined, resolvedBy: 'unresolved' as const }
  const readableName = displayColorName(rawName)
  const byName = (
    lookups.byName.get(normalizeColorLookupName(rawName)) ||
    lookups.byName.get(normalizeColorLookupName(readableName))
  )
  return byName
    ? { color: byName, resolvedBy: 'name' as const }
    : { color: undefined, resolvedBy: 'unresolved' as const }
}

function getItemColorChoices(item: OrderItem): { name: string; hex?: string; globalColorId?: string }[] {
  // Prioritize customer-selected values over variant display colors
  if (item.selectedParts?.length) {
    return item.selectedParts.map(part => ({
      name: `${part.label}: ${part.colorName}`,
      hex: part.colorHex,
      globalColorId: part.globalColorId,
    }))
  }

  if (item.selectedColors?.length) {
    return item.selectedColors.map(color => ({
      name: color.name,
      hex: color.hex,
      globalColorId: color.globalColorId,
    }))
  }

  if (item.selectedColor?.name) {
    return [{
      name: item.selectedColor.name,
      hex: item.selectedColor.hex,
      globalColorId: item.selectedColor.globalColorId,
    }]
  }

  // Only fall back to variant display colors if no customer selection exists
  if (item.selectedVariant?.colors?.length) {
    return item.selectedVariant.colors.map(color => {
      if (typeof color === 'string') return { name: color }
      return { name: color.name, hex: color.hex, globalColorId: color.globalColorId }
    })
  }

  return (item.colors ?? []).map(color => ({ name: color }))
}

function getJobRequirements(job: any) {
  const requirements = Array.isArray(job.colorRequirements) && job.colorRequirements.length > 0
    ? job.colorRequirements
    : [{ colorId: job.globalColor?.id, grams: job.materialGrams || 0 }]

  return requirements.map((req: any) => ({
    colorId: req.colorId || job.globalColor?.id || 'unassigned',
    colorName: req.colorName || job.globalColor?.name || job.colorName || 'Unassigned',
    colorHex: req.colorHex || job.globalColor?.hex || job.colorHex,
    materialType: req.materialType || job.materialType || 'PLA',
    grams: Number(req.grams || 0),
    resolvedBy: req.resolvedBy,
  }))
}

// ─── Generate jobs for a single order ────────────────────────────────
export async function generateProductionJobs(orderId: string) {
  const orderResult = await dbAdmin.query({
    orders: { productionJobs: {} },
  })

  const order = (orderResult.orders as any[])?.find((o: any) => o.id === orderId)
  if (!order) throw new Error(`Order ${orderId} not found`)

  if (order.productionJobs?.length > 0) {
    return { created: 0, skipped: true, orderId }
  }

  const [catalogResult, colorsResult] = await Promise.all([
    dbAdmin.query({ catalogProducts: {} }),
    dbAdmin.query({ globalColors: {} }),
  ])

  const catalogProducts = (catalogResult.catalogProducts ?? []) as CatalogProduct[]
  const globalColors = (colorsResult.globalColors ?? []) as GlobalColor[]

  const productById = new Map(catalogProducts.map(p => [p.id, p]))
  const productByName = new Map(catalogProducts.map(p => [p.name, p]))
  const colorLookups = {
    byId: new Map(globalColors.map(c => [c.id, c])),
    byName: new Map(globalColors.map(c => [normalizeColorLookupName(c.name), c])),
    byHex: new Map(globalColors.map(c => [normalizeHex(c.hex), c])),
  }

  const now = new Date()
  const transactions: any[] = []

  const items = (order.items ?? []) as OrderItem[]

  items.forEach((item: OrderItem, itemIndex: number) => {
    let product: CatalogProduct | undefined
    if (item.productId) {
      product = productById.get(item.productId)
    }
    if (!product) {
      product = productByName.get(item.productName)
    }

    const recipe = product?.materialRecipe?.length
      ? product.materialRecipe
      : [{ label: 'Main part', grams: product?.materialGrams ?? 25 }]

    const itemColors = getItemColorChoices(item)

    const quantity = Math.max(1, Number(item.quantity || 1))

    Array.from({ length: quantity }).forEach((_, unitIndex) => {
      recipe.forEach((part, partIndex) => {
        const jobId = id()
      
      // Multi-color logic:
      // For now, if a product is multiColor and we have 1 part, we assume it uses all selected colors.
      // If it has a recipe, we usually map colors to parts, but we can also have multi-color parts.
      // To keep it robust, we'll populate colorRequirements.
      
      const isMultiColor = itemColors.length > 1 && recipe.length === 1
      const partColors = isMultiColor ? itemColors : [itemColors[partIndex] ?? itemColors[0] ?? { name: 'Unassigned' }]
      
      const materialType = part.materialType || 'PLA'

      const colorRequirements = partColors.map(color => {
        const rawName = color.name
        const readableName = displayColorName(rawName)
        const resolved = resolveGlobalColor(colorLookups, color)
        const c = resolved.color
        return {
          colorId: c?.id ?? 'unassigned',
          colorName: readableName || 'Unassigned',
          colorHex: c?.hex ?? color.hex ?? '#888888',
          grams: part.grams / partColors.length, // Split grams equally as a guess
          materialType,
          resolvedBy: resolved.resolvedBy,
        }
      })

      const requiredColorIds = colorRequirements.map(cr => cr.colorId).join(',')
      const primaryColor = resolveGlobalColor(colorLookups, partColors[0]).color
      const primaryColorName = colorRequirements[0]?.colorName ?? 'Unassigned'
      const primaryColorHex = primaryColor?.hex ?? colorRequirements[0]?.colorHex ?? '#888888'

        const jobTx = dbAdmin.tx.productionJobs[jobId]
          .update({
            orderId,
            orderItemIndex: itemIndex,
            productId: product?.id ?? item.productId,
            selectedVariantId: item.selectedVariant?.id,
            selectedVariantName: item.selectedVariant?.name,
            productName: item.productName,
            partLabel: quantity > 1 ? `${part.label} #${unitIndex + 1}` : part.label,
            colorName: primaryColorName,
            colorHex: primaryColorHex,
            materialGrams: part.grams,
            totalGrams: part.grams,
            quantity: 1,
            status: 'queued',
            isMultiColor,
            colorRequirements,
            requiredColorIds,
            materialType,
            outsourced: false,
            customText: item.customText ?? '',
            createdAt: now,
            updatedAt: now,
          })
          .link({ order: orderId })

        if (primaryColor) {
          jobTx.link({ globalColor: primaryColor.id })
        }

        transactions.push(jobTx)
      })
    })
  })

  if (transactions.length > 0) {
    const BATCH_SIZE = 50
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      await dbAdmin.transact(transactions.slice(i, i + BATCH_SIZE))
    }
  }

  return { created: transactions.length, skipped: false, orderId }
}

export async function generateAllPendingJobs() {
  const result = await dbAdmin.query({
    orders: { productionJobs: {} },
  })

  const orders = (result.orders ?? []) as any[]
  const pending = orders.filter(
    (o) =>
      ['new', 'printing'].includes(o.fulfillmentStatus) &&
      (!o.productionJobs || o.productionJobs.length === 0)
  )

  let totalCreated = 0
  const errors: string[] = []

  for (const order of pending) {
    try {
      const result = await generateProductionJobs(order.id)
      totalCreated += result.created
    } catch (err: any) {
      errors.push(`Order ${order.id.slice(0, 8)}: ${err.message}`)
    }
  }

  return { totalCreated, ordersProcessed: pending.length, errors }
}

export async function startPrintingJobs(
  jobIds: string[], 
  printerId: string,
  slotAssignments: SingleSlotAssignment[]
) {
  const now = new Date()
  const transactions: any[] = []
  const assignedSpoolIds = Array.from(new Set(slotAssignments.map(assignment => assignment.spoolId).filter(Boolean)))
  const [spoolsResult, slotsResult, jobsResult] = await Promise.all([
    assignedSpoolIds.length > 0
      ? dbAdmin.query({ spools: { $: { where: { id: { $in: assignedSpoolIds } } } } })
      : Promise.resolve({ spools: [] }),
    dbAdmin.query({
      printerSlots: {
        $: { where: { printerId } },
        spool: {},
      },
    }),
    dbAdmin.query({
      productionJobs: {
        $: { where: { id: { $in: jobIds } } },
        globalColor: {},
      },
    }),
  ])
  const spoolById = new Map((spoolsResult.spools ?? []).map((spool: any) => [spool.id, spool]))
  const existingSlots = (slotsResult.printerSlots ?? []) as any[]
  const jobs = (jobsResult.productionJobs ?? []) as any[]

  // 1. Update printer status
  transactions.push(
    dbAdmin.tx.printers[printerId].update({
      status: 'printing',
      activeJobIds: jobIds,
      updatedAt: now,
    })
  )

  // 2. Update jobs
  jobs.forEach((job: any) => {
    const requirements = getJobRequirements(job)
    const jobAssignedSpoolIds: string[] = []
    const spoolAllocations = slotAssignments.map((assignment, index) => {
      const requirement = requirements[assignment.requirementIndex ?? index] || requirements[0] || {}
      const spool = spoolById.get(assignment.spoolId) as any
      jobAssignedSpoolIds.push(assignment.spoolId)
      const suggestedMaterialType = assignment.suggestedMaterialType || requirement.materialType || job.materialType || 'PLA'

      return {
        requirementKey: assignment.requirementKey || getRequirementKey(assignment.colorId || requirement.colorId, suggestedMaterialType),
        spoolId: assignment.spoolId,
        slotNumber: assignment.slotNumber,
        expectedGrams: Number(assignment.expectedGrams ?? (requirement.grams || job.materialGrams || 0) * (job.quantity || 1)),
        colorId: assignment.colorId || requirement.colorId || job.globalColor?.id || 'unassigned',
        materialType: assignment.materialType || spool?.materialType || suggestedMaterialType,
        suggestedMaterialType,
      }
    })

    transactions.push(
      dbAdmin.tx.productionJobs[job.id].update({
        status: 'printing',
        printerId,
        assignedSpoolIds: Array.from(new Set(jobAssignedSpoolIds)),
        spoolAllocations,
        startedAt: now,
        updatedAt: now,
      })
    )
  })

  for (const assignment of slotAssignments) {
    const existing = existingSlots.find(slot => slot.slotNumber === assignment.slotNumber)
    const slotId = existing?.id ?? id()
    let tx: any = dbAdmin.tx.printerSlots[slotId].update({
      printerId,
      slotNumber: assignment.slotNumber,
    }).link({ printer: printerId })

    if (existing?.spool?.id && existing.spool.id !== assignment.spoolId) {
      tx = tx.unlink({ spool: existing.spool.id })
    }
    if (assignment.spoolId) {
      tx = tx.link({ spool: assignment.spoolId })
    }
    transactions.push(tx)
  }

  await dbAdmin.transact(transactions)
  
  // Sync order states
  const orderIds = Array.from(new Set(jobs.map((j: any) => j.orderId)))
  await syncOrderStates(orderIds)

  return { success: true }
}

export async function startBatchPrint({
  jobIds,
  printerId,
  slotAssignments,
}: {
  jobIds: string[]
  printerId: string
  slotAssignments: BatchSlotAssignment[]
}) {
  if (jobIds.length === 0) throw new Error('Select at least one job')
  if (!printerId) throw new Error('Select a printer')

  const [jobsResult, printerResult] = await Promise.all([
    dbAdmin.query({
      productionJobs: {
        $: { where: { id: { $in: jobIds } } },
        globalColor: {},
      }
    }),
    dbAdmin.query({
      printers: {
        $: { where: { id: printerId } }
      }
    }),
  ])

  const jobs = (jobsResult.productionJobs ?? []) as any[]
  const printer = printerResult.printers?.[0] as any
  if (!printer) throw new Error('Printer not found')
  if (jobs.length !== jobIds.length) throw new Error('Some selected jobs no longer exist')
  if (jobs.some((job: any) => job.status !== 'queued' || job.outsourced)) {
    throw new Error('Only queued internal jobs can be started')
  }
  if (Array.isArray(printer.activeJobIds) && printer.activeJobIds.length > 0) {
    throw new Error('This printer already has an active plate')
  }

  const assignmentByKey = new Map(slotAssignments.map(assignment => [assignment.requirementKey, assignment]))
  const assignedSpoolIds = Array.from(new Set(slotAssignments.map(assignment => assignment.spoolId).filter(Boolean)))
  const spoolById = new Map<string, any>()
  if (assignedSpoolIds.length > 0) {
    const spoolsResult = await dbAdmin.query({
      spools: {
        $: { where: { id: { $in: assignedSpoolIds } } },
      }
    })
    ;(spoolsResult.spools ?? []).forEach((spool: any) => spoolById.set(spool.id, spool))
  }

  const now = new Date()
  const transactions: any[] = []

  for (const job of jobs) {
    const jobAssignedSpoolIds: string[] = []
    const spoolAllocations: {
      requirementKey: string
      spoolId: string
      slotNumber: number
      expectedGrams: number
      colorId: string
      materialType: 'PLA' | 'PETG' | 'ABS' | 'TPU'
      suggestedMaterialType: 'PLA' | 'PETG' | 'ABS' | 'TPU'
    }[] = []

    for (const requirement of getJobRequirements(job)) {
      if (requirement.colorId === 'unassigned' || requirement.resolvedBy === 'unresolved') {
        throw new Error(`Cor por resolver em ${job.productName}: ${requirement.colorName}. Corrige a cor da encomenda/job antes de imprimir.`)
      }
      const requirementKey = getRequirementKey(requirement.colorId, requirement.materialType)
      const assignment = assignmentByKey.get(requirementKey)
      if (!assignment?.spoolId) {
        throw new Error(`Missing spool assignment for ${job.productName}: ${requirement.colorName}`)
      }
      const spool = spoolById.get(assignment.spoolId)
      if (!spool) throw new Error('Assigned spool not found')
      if (spool.colorId !== requirement.colorId) {
        throw new Error(`Color mismatch for ${job.productName}: requires ${requirement.colorName} (${requirement.colorId})`)
      }
      jobAssignedSpoolIds.push(assignment.spoolId)
      spoolAllocations.push({
        requirementKey,
        spoolId: assignment.spoolId,
        slotNumber: assignment.slotNumber,
        expectedGrams: Number(requirement.grams || 0) * (job.quantity || 1),
        colorId: requirement.colorId,
        materialType: spool.materialType || requirement.materialType,
        suggestedMaterialType: requirement.materialType,
      })
    }

    const uniqueJobSpoolIds = Array.from(new Set(jobAssignedSpoolIds))
    if (uniqueJobSpoolIds.length === 0) {
      throw new Error(`No spool assignment found for ${job.productName}`)
    }

    transactions.push(
      dbAdmin.tx.productionJobs[job.id].update({
        status: 'printing',
        printerId,
        assignedSpoolIds: uniqueJobSpoolIds,
        spoolAllocations,
        startedAt: now,
        updatedAt: now,
      })
    )
  }

  transactions.push(
    dbAdmin.tx.printers[printerId].update({
      status: 'printing',
      activeJobIds: jobIds,
      updatedAt: now,
    })
  )

  await dbAdmin.transact(transactions)
  await syncOrderStates(Array.from(new Set(jobs.map((job: any) => job.orderId))))

  return { success: true, started: jobIds.length }
}

export async function fulfillJobFromStock(jobId: string) {
  const result = await dbAdmin.query({
    productionJobs: {
      $: { where: { id: jobId } },
    }
  })
  const job = result.productionJobs?.[0] as any
  if (!job) throw new Error('Job not found')
  if (job.status !== 'queued') throw new Error('Only queued jobs can be fulfilled from stock')

  const now = new Date()
  await dbAdmin.transact(
    dbAdmin.tx.productionJobs[jobId].update({
      status: 'printed',
      completedAt: now,
      updatedAt: now,
    })
  )

  await syncOrderStates([job.orderId])
  return { success: true }
}

export async function finishBatchPrint(printerId: string, outcomes: BatchOutcome[]) {
  if (!printerId) throw new Error('Printer is required')
  if (outcomes.length === 0) throw new Error('No plate outcomes provided')

  const jobIds = outcomes.map(outcome => outcome.jobId)
  const [jobsResult, printerResult] = await Promise.all([
    dbAdmin.query({
      productionJobs: {
        $: { where: { id: { $in: jobIds } } },
      }
    }),
    dbAdmin.query({
      printers: {
        $: { where: { id: printerId } }
      }
    }),
  ])

  const jobs = (jobsResult.productionJobs ?? []) as any[]
  const printer = printerResult.printers?.[0] as any
  if (!printer) throw new Error('Printer not found')

  const activeJobIds = Array.isArray(printer.activeJobIds) ? printer.activeJobIds : []
  const activeSet = new Set(activeJobIds)
  if (jobIds.some(jobId => !activeSet.has(jobId))) {
    throw new Error('All outcomes must belong to the active plate')
  }

  const jobById = new Map(jobs.map((job: any) => [job.id, job]))
  const now = new Date()
  const spoolDeductions = new Map<string, number>()
  const spoolUsageByJob = new Map<string, { slotNumber: number; spoolId: string; gramsUsed: number }[]>()

  for (const outcome of outcomes) {
    const entries = outcome.status === 'success'
      ? outcome.spoolConsumptions || []
      : outcome.wasteConsumptions || []

    const usage = entries
      .filter(entry => entry.spoolId && Number(entry.grams) > 0)
      .map(entry => ({
        slotNumber: entry.slotNumber || 1,
        spoolId: entry.spoolId,
        gramsUsed: Number(entry.grams),
      }))

    spoolUsageByJob.set(outcome.jobId, usage)
    for (const entry of usage) {
      spoolDeductions.set(entry.spoolId, (spoolDeductions.get(entry.spoolId) || 0) + entry.gramsUsed)
    }
  }

  const spoolIds = Array.from(spoolDeductions.keys())
  const spoolById = new Map<string, any>()
  if (spoolIds.length > 0) {
    const spoolsResult = await dbAdmin.query({
      spools: {
        $: { where: { id: { $in: spoolIds } } }
      }
    })
    ;(spoolsResult.spools ?? []).forEach((spool: any) => spoolById.set(spool.id, spool))
  }

  const transactions: any[] = []

  for (const outcome of outcomes) {
    const job = jobById.get(outcome.jobId) as any
    if (!job) throw new Error('Job not found during finish')
    const usage = spoolUsageByJob.get(outcome.jobId) || []

    if (outcome.status === 'success') {
      transactions.push(
        dbAdmin.tx.productionJobs[outcome.jobId].update({
          status: 'printed',
          completedAt: now,
          updatedAt: now,
        })
      )
    } else {
      transactions.push(
        dbAdmin.tx.productionJobs[outcome.jobId].update({
          status: 'queued',
          printerId: null,
          scheduledDate: null,
          startedAt: null,
          completedAt: null,
          assignedSpoolIds: [],
          notes: outcome.failReason ? `Failed on plate: ${outcome.failReason}` : 'Failed on plate',
          updatedAt: now,
        })
      )
    }

    const historyId = id()
    transactions.push(
      dbAdmin.tx.printHistory[historyId].update({
        printerId,
        jobId: outcome.jobId,
        startedAt: job.startedAt || now,
        completedAt: now,
        spoolsUsed: usage,
      })
      .link({ printer: printerId })
      .link({ job: outcome.jobId })
    )
  }

  for (const [spoolId, totalGrams] of spoolDeductions) {
    const spool = spoolById.get(spoolId)
    if (!spool) throw new Error(`Spool ${spoolId} not found`)
    transactions.push(
      dbAdmin.tx.spools[spoolId].update({
        gramsRemaining: Math.max(0, (spool.gramsRemaining || 0) - totalGrams),
        updatedAt: now,
      })
    )
  }

  const processedSet = new Set(jobIds)
  const remainingActiveJobIds = activeJobIds.filter((jobId: string) => !processedSet.has(jobId))
  transactions.push(
    dbAdmin.tx.printers[printerId].update({
      activeJobIds: remainingActiveJobIds,
      status: remainingActiveJobIds.length > 0 ? 'printing' : 'idle',
      updatedAt: now,
    })
  )

  await dbAdmin.transact(transactions)
  await syncOrderStates(Array.from(new Set(jobs.map((job: any) => job.orderId))))

  return { success: true, processed: outcomes.length }
}

export async function finishPrintingJobs(jobIds: string[], printerId: string, spoolsUsed?: { spoolId: string, gramsUsed: number }[]) {
  const now = new Date()
  const transactions: any[] = []

  // 1. Mark jobs as printed
  jobIds.forEach(jobId => {
    transactions.push(
      dbAdmin.tx.productionJobs[jobId].update({
        status: 'printed',
        completedAt: now,
        updatedAt: now,
      })
    )

    // 2. Record to history
    const historyId = id()
    transactions.push(
      dbAdmin.tx.printHistory[historyId].update({
        printerId,
        jobId,
        startedAt: new Date(now.getTime() - (60 * 60 * 1000)), // Default to 1h ago if unknown
        completedAt: now,
        spoolsUsed: spoolsUsed || [],
      })
      .link({ printer: printerId })
      .link({ job: jobId })
    )
  })

  // 3. Free up printer
  transactions.push(
    dbAdmin.tx.printers[printerId].update({
      status: 'idle',
      activeJobIds: [],
      updatedAt: now,
    })
  )

  await dbAdmin.transact(transactions)

  // Sync order states
  const jobsResult = await dbAdmin.query({
    productionJobs: { $: { where: { id: { $in: jobIds } } } }
  })
  const orderIds = Array.from(new Set(jobsResult.productionJobs.map((j: any) => j.orderId)))
    .filter(id => typeof id === 'string' && !id.startsWith('request-')) // Skip placeholder order IDs from order requests
  if (orderIds.length > 0) await syncOrderStates(orderIds)

  return { success: true }
}

export async function updatePrinterStatus(printerId: string, status: 'idle' | 'printing' | 'maintenance') {
  await dbAdmin.transact(
    dbAdmin.tx.printers[printerId].update({
      status,
      ...(status === 'idle' ? { activeJobIds: [] } : {}),
      updatedAt: new Date(),
    })
  )
}

export async function updatePrinterSlots(printerId: string, slots: { slotNumber: number; spoolId?: string; colorId?: string }[]) {
  // Fetch existing slots for this printer to update them
  const result = await dbAdmin.query({
    printerSlots: {
      $: { where: { printerId } },
      spool: {},
      color: {},
    }
  })
  
  const existingSlots = result.printerSlots as any[]
  const transactions: any[] = []

  for (const slotData of slots) {
    const existing = existingSlots.find(s => s.slotNumber === slotData.slotNumber)
    const slotId = existing?.id ?? id()
    
    let tx: any = dbAdmin.tx.printerSlots[slotId].update({
      printerId,
      slotNumber: slotData.slotNumber,
    })
    
    // Always link to printer
    tx = tx.link({ printer: printerId })
    
    // Unlink old spool if different
    if (existing?.spool?.id && existing.spool.id !== slotData.spoolId) {
      tx = tx.unlink({ spool: existing.spool.id })
    }
    
    // Unlink old color if different  
    if (existing?.color?.id && existing.color.id !== slotData.colorId) {
      tx = tx.unlink({ color: existing.color.id })
    }
    
    // Link new spool if provided
    if (slotData.spoolId) {
      tx = tx.link({ spool: slotData.spoolId })
    }
    
    // Link new color if provided (or use spool's color as fallback)
    if (slotData.colorId) {
      tx = tx.link({ color: slotData.colorId })
    }
    
    transactions.push(tx)
  }

  await dbAdmin.transact(transactions)
}

export async function consumeMaterial(spoolId: string, grams: number) {
  // Fetch current spool
  const result = await dbAdmin.query({
    spools: {
      $: { where: { id: spoolId } }
    }
  })
  const spool = result.spools?.[0] as any
  if (!spool) throw new Error('Spool not found')

  const newGrams = Math.max(0, spool.gramsRemaining - grams)
  await dbAdmin.transact(
    dbAdmin.tx.spools[spoolId].update({
      gramsRemaining: newGrams,
      updatedAt: new Date()
    })
  )
}

export async function updateJobStatuses(
  jobIds: string[],
  status: JobStatus,
) {
  if (jobIds.length === 0) return { updated: 0 }

  const now = new Date()
  const transactions = jobIds.map((jobId) =>
    dbAdmin.tx.productionJobs[jobId].update({ status, updatedAt: now })
  )

  const BATCH_SIZE = 50
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    await dbAdmin.transact(transactions.slice(i, i + BATCH_SIZE))
  }

  // Sync order states
  const jobsResult = await dbAdmin.query({
    productionJobs: {
      $: { where: { id: { $in: jobIds } } }
    }
  })
  const orderIds = Array.from(new Set(jobsResult.productionJobs.map((j: any) => j.orderId)))
    .filter(id => typeof id === 'string' && !id.startsWith('request-')) // Skip placeholder order IDs from order requests
  if (orderIds.length > 0) await syncOrderStates(orderIds)

  return { updated: jobIds.length }
}

export async function syncOrderStates(orderIds: string[]) {
  for (const orderId of orderIds) {
    const result = await dbAdmin.query({
      orders: {
        $: { where: { id: orderId } },
        productionJobs: {}
      }
    })
    const order = result.orders?.[0] as any
    if (!order) continue

    const jobs = (order.productionJobs ?? []) as any[]
    if (jobs.length === 0) continue

    const isSupersededFailedAttempt = (job: any) => {
      if (!['failed', 'cancelled'].includes(job.status)) return false
      return jobs.some(candidate =>
        candidate.id !== job.id &&
        candidate.orderItemIndex === job.orderItemIndex &&
        candidate.productId === job.productId &&
        candidate.selectedVariantId === job.selectedVariantId &&
        candidate.partLabel === job.partLabel &&
        ['queued', 'printing', 'printed', 'assembled'].includes(candidate.status) &&
        new Date(candidate.createdAt ?? 0).getTime() >= new Date(job.updatedAt ?? job.createdAt ?? 0).getTime()
      )
    }
    const activeJobs = jobs.filter(job => !isSupersededFailedAttempt(job) && job.status !== 'cancelled')
    if (activeJobs.length === 0) continue

    // 1. Calculate overall fulfillment status
    // 'new' | 'printing' | 'ready' | 'ready_for_pickup' | 'shipped' | 'completed' | 'cancelled'
    let nextStatus = order.fulfillmentStatus
    
    const allAssembled = activeJobs.every(j => j.status === 'assembled')
    const somePrinting = activeJobs.some(j => j.status === 'printing')
    const somePrinted = activeJobs.some(j => j.status === 'printed')
    
    if (allAssembled) {
      if (['new', 'printing', 'ready', 'ready_for_pickup'].includes(order.fulfillmentStatus)) {
        nextStatus = order.shippingMethod === 'pickup_carcavelos' ? 'ready_for_pickup' : 'ready'
      }
    } else if (somePrinting || somePrinted) {
      if (order.fulfillmentStatus === 'new') {
        nextStatus = 'printing'
      }
    }

    // 2. Update items status
    const newItems = (order.items ?? []).map((item: any, idx: number) => {
      const itemJobs = activeJobs.filter(j => j.orderItemIndex === idx)
      if (itemJobs.length === 0) return item

      const allItemAssembled = itemJobs.every(j => j.status === 'assembled')
      const allItemPrinted = itemJobs.every(j => ['printed', 'assembled'].includes(j.status))
      const someItemPrinting = itemJobs.some(j => j.status === 'printing')

      let itemStatus = item.itemStatus
      if (allItemAssembled) {
        itemStatus = 'done'
      } else if (allItemPrinted) {
        itemStatus = 'printed'
      } else if (someItemPrinting) {
        itemStatus = 'printing'
      } else {
        itemStatus = 'scheduled'
      }
      
      return { ...item, itemStatus }
    })

    // 3. Update order
    await dbAdmin.transact(
      dbAdmin.tx.orders[orderId].update({
        fulfillmentStatus: nextStatus,
        items: newItems,
        updatedAt: new Date()
      })
    )
  }
  // return { updated: jobIds.length }
}

export async function toggleOutsourced(jobIds: string[], outsourced: boolean) {
  if (jobIds.length === 0) return { updated: 0 }

  const now = new Date()
  const transactions = jobIds.map((jobId) =>
    dbAdmin.tx.productionJobs[jobId].update({ outsourced, updatedAt: now })
  )

  const BATCH_SIZE = 50
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    await dbAdmin.transact(transactions.slice(i, i + BATCH_SIZE))
  }

  return { updated: jobIds.length }
}

// ─── MRP Orchestration Actions ───────────────────────────────────────

async function updateJobForManualFix(jobId: string, status: Extract<JobStatus, 'queued' | 'cancelled'>) {
  const result = await dbAdmin.query({
    productionJobs: {
      $: { where: { id: jobId } },
    },
  })
  const job = result.productionJobs?.[0] as any
  if (!job) throw new Error('Production job not found')

  await dbAdmin.transact(
    dbAdmin.tx.productionJobs[jobId].update({
      status,
      printerId: null,
      scheduledDate: null,
      startedAt: null,
      completedAt: null,
      assignedSpoolIds: [],
      spoolAllocations: [],
      updatedAt: new Date(),
    })
  )

  // Sync parent order state after job status change
  await syncOrderStates([job.orderId])

  return { success: true }
}

export async function requeueJob(jobId: string) {
  return updateJobForManualFix(jobId, 'queued')
}

export async function cancelJob(jobId: string) {
  return updateJobForManualFix(jobId, 'cancelled')
}

export async function scheduleProductionJob(jobId: string, scheduledDate: Date, printerId?: string) {
  await dbAdmin.transact(
    dbAdmin.tx.productionJobs[jobId].update({
      printerId: printerId || null,
      scheduledDate,
      updatedAt: new Date()
    })
  )
  return { success: true }
}

export async function updateJobOutsourced(jobId: string, outsourced: boolean) {
  await dbAdmin.transact(
    dbAdmin.tx.productionJobs[jobId].update({
      outsourced,
      updatedAt: new Date()
    })
  )
  return { success: true }
}

export async function updateJobPriority(jobId: string, direction: 'up' | 'down') {
  const result = await dbAdmin.query({
    productionJobs: {
      $: { where: { status: 'queued', outsourced: false }, order: { priority: 'asc' } }
    }
  })
  
  const jobs = result.productionJobs as any[]
  const currentIndex = jobs.findIndex(j => j.id === jobId)
  if (currentIndex === -1) return { success: false }

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (targetIndex < 0 || targetIndex >= jobs.length) return { success: false }

  const currentJob = jobs[currentIndex]
  const targetJob = jobs[targetIndex]

  // Swap priorities
  const currentPriority = currentJob.priority ?? currentIndex
  const targetPriority = targetJob.priority ?? targetIndex

  await dbAdmin.transact([
    dbAdmin.tx.productionJobs[currentJob.id].update({ priority: targetPriority }),
    dbAdmin.tx.productionJobs[targetJob.id].update({ priority: currentPriority }),
  ])

  return { success: true }
}

export async function archiveGlobalColor(colorId: string) {
  // Check for active spools
  const result = await dbAdmin.query({
    spools: { $: { where: { isActive: true, colorId } } }
  })
  
  const activeSpools = result.spools ?? []
  const hasActiveSpools = activeSpools.length > 0

  await dbAdmin.transact(
    dbAdmin.tx.globalColors[colorId].update({
      isActive: false,
      updatedAt: new Date()
    })
  )

  return { success: true, warned: hasActiveSpools, activeSpoolCount: activeSpools.length }
}

interface FinishPrintParams {
  jobId: string
  printerId: string
  actualGrams: number
  status: 'success' | 'failed'
  failReason?: string
  autoRequeue?: boolean
  spoolConsumptions?: { spoolId: string; grams: number; colorName: string }[]
}

export async function finishPrintWithLog(params: FinishPrintParams) {
  const { jobId, printerId, actualGrams, status, failReason, autoRequeue, spoolConsumptions } = params
  const now = new Date()
  
  // Fetch job details
  const jobResult = await dbAdmin.query({
    productionJobs: {
      $: { where: { id: jobId } },
      globalColor: {}
    }
  })
  const job = jobResult.productionJobs?.[0] as any
  if (!job) throw new Error('Job not found')

  const transactions: any[] = []

  if (status === 'success') {
    // 1. Mark job as printed
    transactions.push(
      dbAdmin.tx.productionJobs[jobId].update({
        status: 'printed',
        completedAt: now,
        updatedAt: now,
      })
    )

    // 2. Consume material from selected spools
    const spoolsUsed: { slotNumber: number; spoolId: string; gramsUsed: number }[] = []
    if (spoolConsumptions && spoolConsumptions.length > 0) {
      for (const consumption of spoolConsumptions) {
        // Fetch current spool
        const spoolResult = await dbAdmin.query({
          spools: { $: { where: { id: consumption.spoolId } } }
        })
        const spool = spoolResult.spools?.[0] as any
        if (spool) {
          const newGrams = Math.max(0, spool.gramsRemaining - consumption.grams)
          transactions.push(
            dbAdmin.tx.spools[consumption.spoolId].update({
              gramsRemaining: newGrams,
              updatedAt: now
            })
          )
          spoolsUsed.push({
            slotNumber: 1, // Could track actual slot if needed
            spoolId: consumption.spoolId,
            gramsUsed: consumption.grams
          })
        }
      }
    }

    // 3. Record to history with actual grams
    const historyId = id()
    transactions.push(
      dbAdmin.tx.printHistory[historyId].update({
        printerId,
        jobId,
        startedAt: job.startedAt || new Date(now.getTime() - (60 * 60 * 1000)),
        completedAt: now,
        spoolsUsed: spoolsUsed.length > 0 ? spoolsUsed : [{ slotNumber: 1, spoolId: 'unknown', gramsUsed: actualGrams }],
      })
      .link({ printer: printerId })
      .link({ job: jobId })
    )
  } else {
    // Job failed
    transactions.push(
      dbAdmin.tx.productionJobs[jobId].update({
        status: 'failed',
        completedAt: now,
        updatedAt: now,
        notes: failReason ? `Failed: ${failReason}` : 'Failed',
      })
    )

    // Auto-requeue remaining quantity if enabled
    if (autoRequeue && job.quantity > 0) {
      const remainingQty = job.quantity - (job.quantityDone || 0)
      if (remainingQty > 0) {
        const newJobId = id()
        const jobTx = dbAdmin.tx.productionJobs[newJobId].update({
          orderId: job.orderId,
          orderItemIndex: job.orderItemIndex,
          productName: job.productName,
          partLabel: job.partLabel,
          colorName: job.colorName,
          colorHex: job.colorHex,
          materialGrams: job.materialGrams,
          materialType: job.materialType,
          quantity: remainingQty,
          status: 'queued',
          isMultiColor: job.isMultiColor,
          outsourced: false,
          colorRequirements: job.colorRequirements,
          requiredColorIds: job.requiredColorIds,
          totalGrams: job.totalGrams,
          estimatedPrintMinutes: job.estimatedPrintMinutes,
          imageUrl: job.imageUrl,
          selectedVariantId: job.selectedVariantId,
          selectedVariantName: job.selectedVariantName,
          productId: job.productId,
          productSlug: job.productSlug,
          customText: job.customText,
          notes: `Requeue from failed job ${jobId.slice(0, 8)}: ${failReason || 'No reason given'}`,
          createdAt: now,
          updatedAt: now,
        })
        .link({ order: job.orderId })

        // Link to global color if exists
        if (job.globalColor?.id) {
          jobTx.link({ globalColor: job.globalColor.id })
        }
        transactions.push(jobTx)
      }
    }
  }

  // 3. Free up printer
  transactions.push(
    dbAdmin.tx.printers[printerId].update({
      status: 'idle',
      activeJobIds: [],
      updatedAt: now,
    })
  )

  await dbAdmin.transact(transactions)

  // Sync order states
  await syncOrderStates([job.orderId])

  return { 
    success: true, 
    status,
    remainingQty: status === 'failed' && autoRequeue ? job.quantity - (job.quantityDone || 0) : 0
  }
}

export async function validatePrinterLoad(jobId: string, printerId: string) {
  const [jobResult, slotsResult] = await Promise.all([
    dbAdmin.query({ productionJobs: { $: { where: { id: jobId } } } }),
    dbAdmin.query({ 
      printerSlots: { 
        $: { where: { printerId } },
        spool: {}
      } 
    })
  ])

  const job = jobResult.productionJobs?.[0] as any
  const slots = slotsResult.printerSlots as any[] || []
  
  if (!job) return { valid: false, error: 'Job not found' }

  const requiredColorIds = (job.colorRequirements?.map((r: any) => r.colorId) || [job.globalColor?.id])
    .filter((colorId: string | undefined) => colorId && colorId !== 'unassigned')
  const requiredMaterialType = job.materialType || 'PLA'

  // Get colors from linked spools (schema uses links, not colorId field)
  const loadedColorIds = slots.map((s: any) => s.spool?.color?.id || s.color?.id).filter(Boolean)
  const loadedMaterials = slots.map((s: any) => s.spool?.materialType).filter(Boolean)

  const missingColors = requiredColorIds.filter((id: string) => !loadedColorIds.includes(id))
  const materialMismatch = !loadedMaterials.includes(requiredMaterialType)
  
  let missingNames = []
  const validMissingColors = missingColors.filter(Boolean)
  if (validMissingColors.length > 0) {
    const colorsResult = await dbAdmin.query({
      globalColors: { $: { where: { id: { $in: validMissingColors } } } }
    })
    missingNames = colorsResult.globalColors.map((c: any) => c.name)
  }

  const valid = missingColors.length === 0 && !materialMismatch

  return {
    valid,
    missingColorIds: missingColors,
    missingNames,
    materialMismatch,
    requiredMaterialType
  }
}
