'use server'

import { dbAdmin } from '@/lib/db-admin'

// ─── Valid entity names for export/import ────────────────────────────
export type ExportableEntity = 'catalogProducts' | 'globalColors' | 'orders' | 'marketingPosts'

const ENTITY_NAMES: ExportableEntity[] = ['catalogProducts', 'globalColors', 'orders', 'marketingPosts']

function isValidEntity(name: string): name is ExportableEntity {
  return (ENTITY_NAMES as string[]).includes(name)
}

// ─── Export ──────────────────────────────────────────────────────────
export async function exportData(entityName: ExportableEntity) {
  if (!isValidEntity(entityName)) {
    throw new Error(`Invalid entity: ${entityName}`)
  }

  let records: unknown[]
  switch (entityName) {
    case 'catalogProducts': {
      const r = await dbAdmin.query({ catalogProducts: {} })
      records = r.catalogProducts ?? []
      break
    }
    case 'globalColors': {
      const r = await dbAdmin.query({ globalColors: {} })
      records = r.globalColors ?? []
      break
    }
    case 'orders': {
      const r = await dbAdmin.query({ orders: {} })
      records = r.orders ?? []
      break
    }
    case 'marketingPosts': {
      const r = await dbAdmin.query({ marketingPosts: {} })
      records = r.marketingPosts ?? []
      break
    }
    default:
      records = []
  }

  return {
    entity: entityName,
    count: records.length,
    exportedAt: new Date().toISOString(),
    data: records,
  }
}

// ─── Import (Validate / Dry Run) ────────────────────────────────────
export async function validateImportData(entityName: ExportableEntity, records: Record<string, unknown>[]) {
  if (!isValidEntity(entityName)) {
    return { valid: false, errors: [`Invalid entity: ${entityName}`], count: 0 }
  }

  if (!Array.isArray(records) || records.length === 0) {
    return { valid: false, errors: ['JSON must be a non-empty array of records.'], count: 0 }
  }

  const errors: string[] = []

  // Check each record has an id (string)
  records.forEach((record, idx) => {
    if (!record.id || typeof record.id !== 'string') {
      errors.push(`Record at index ${idx} is missing a valid "id" field.`)
    }
  })

  if (errors.length > 5) {
    errors.splice(5)
    errors.push(`... and more errors. Total records: ${records.length}`)
  }

  return {
    valid: errors.length === 0,
    errors,
    count: records.length,
  }
}

// ─── Import (Write) ─────────────────────────────────────────────────
export async function importData(entityName: ExportableEntity, records: Record<string, unknown>[]) {
  if (!isValidEntity(entityName)) {
    throw new Error(`Invalid entity: ${entityName}`)
  }

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('No records to import.')
  }

  // Build transactions — use each record's `id` as the InstantDB entity ID
  const txEntity = (dbAdmin.tx as any)[entityName]
  if (!txEntity) {
    throw new Error(`Entity "${entityName}" not found in transaction builder.`)
  }

  // Batch in chunks of 100 to avoid request size limits
  const BATCH_SIZE = 100
  let imported = 0

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const transactions = batch.map(record => {
      const { id: recordId, ...fields } = record
      return txEntity[recordId as string].update(fields)
    })
    await dbAdmin.transact(transactions)
    imported += batch.length
  }

  return { imported, entity: entityName }
}
