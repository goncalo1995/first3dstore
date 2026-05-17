import { getDeskItemCustomOptionSummaries, getDeskItemFootprint, getDeskProduct } from './products'
import { calculateDeskSetupPricing, getDeskItemPrice } from './pricing'
import type { DeskItem, DeskPricing, DeskSetup, ValidationResult } from './types'
import { getAllDeskSetupItems, validateDeskSetup } from './validation'

export type DeskQuoteContact = {
  customerName: string
  customerEmail: string
  customerPhone?: string
  shippingAddress?: string
  notes?: string
}

export type DeskQuoteValidation = {
  setup: DeskSetup
  pricing: DeskPricing
  validation: ValidationResult
}

export const deskQuoteFieldLimits = {
  customerName: 120,
  customerEmail: 180,
  customerPhone: 40,
  shippingAddress: 500,
  notes: 1000,
}

export function trimLimit(value: unknown, maxLength: number) {
  return String(value ?? '').trim()
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function sanitizeDeskQuoteContact(value: unknown): DeskQuoteContact {
  const body = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return {
    customerName: trimLimit(body.customerName, deskQuoteFieldLimits.customerName),
    customerEmail: trimLimit(body.customerEmail, deskQuoteFieldLimits.customerEmail).toLowerCase(),
    customerPhone: trimLimit(body.customerPhone, deskQuoteFieldLimits.customerPhone) || undefined,
    shippingAddress: trimLimit(body.shippingAddress, deskQuoteFieldLimits.shippingAddress) || undefined,
    notes: trimLimit(body.notes, deskQuoteFieldLimits.notes) || undefined,
  }
}

export function validateDeskQuoteContactLengths(contact: DeskQuoteContact) {
  const fieldErrors: Record<string, string> = {}

  if (contact.customerName.length > deskQuoteFieldLimits.customerName) {
    fieldErrors.customerName = `O nome deve ter no máximo ${deskQuoteFieldLimits.customerName} caracteres.`
  }
  if (contact.customerEmail.length > deskQuoteFieldLimits.customerEmail) {
    fieldErrors.customerEmail = `O email deve ter no máximo ${deskQuoteFieldLimits.customerEmail} caracteres.`
  }
  if ((contact.customerPhone ?? '').length > deskQuoteFieldLimits.customerPhone) {
    fieldErrors.customerPhone = `O telemóvel deve ter no máximo ${deskQuoteFieldLimits.customerPhone} caracteres.`
  }
  if ((contact.shippingAddress ?? '').length > deskQuoteFieldLimits.shippingAddress) {
    fieldErrors.shippingAddress = `A morada deve ter no máximo ${deskQuoteFieldLimits.shippingAddress} caracteres.`
  }
  if ((contact.notes ?? '').length > deskQuoteFieldLimits.notes) {
    fieldErrors.notes = `As notas devem ter no máximo ${deskQuoteFieldLimits.notes} caracteres.`
  }

  return fieldErrors
}

export function validateDeskQuoteSetup(value: unknown): DeskQuoteValidation {
  const validation = validateDeskSetup(value)
  const setup = value as DeskSetup
  const errors = [...validation.errors]
  const items = getAllDeskSetupItems(setup as any)

  if (items.length === 0) {
    errors.push('Adicione pelo menos um produto ao setup.')
  }

  const pricing = validation.valid ? calculateDeskSetupPricing(setup) : { itemsPrice: 0, setupDiscount: 0, totalPrice: 0 }

  return {
    setup,
    pricing,
    validation: {
      ...validation,
      valid: errors.length === 0,
      errors,
    },
  }
}

export function buildDeskCanvasConfig(params: {
  setup: DeskSetup
  pricing: DeskPricing
  warnings: string[]
  submittedAt: string
}) {
  const { setup, pricing, warnings, submittedAt } = params
  return {
    type: 'desk-setup' as const,
    schemaVersion: setup.schemaVersion,
    surface: setup.surface,
    desk: setup.desk,
    topItems: setup.topItems,
    underItems: setup.underItems,
    pricing,
    warnings,
    submittedAt,
  }
}

function itemSummary(item: DeskItem) {
  const product = getDeskProduct(item.productId)
  const label = product?.name ?? item.productId
  const base = item.colorBase ? `base ${item.colorBase}` : `base ${product?.defaultColors.base ?? 'n/d'}`
  const accent = item.colorAccent ? `detalhe ${item.colorAccent}` : `detalhe ${product?.defaultColors.accent ?? 'n/d'}`
  const footprint = getDeskItemFootprint(item)
  const footprintLabel = footprint ? `, pegada ${footprint.width} x ${footprint.depth}cm` : ''
  const options = getDeskItemCustomOptionSummaries(item)
  const optionLabel = options.length
    ? `, opções: ${options.map((option) => `${option.label}: ${option.valueLabel}${option.priceAdd ? ` (+${option.priceAdd.toFixed(2)}€)` : ''}`).join('; ')}`
    : ''
  return `- ${label}: x ${item.xCm.toFixed(1)}cm, y ${item.yCm.toFixed(1)}cm, rotação ${item.rotation}°, ${base}, ${accent}${footprintLabel}${optionLabel}, preço ${getDeskItemPrice(item).toFixed(2)}€`
}

export function buildDeskRequestNotes(params: {
  setup: DeskSetup
  contact: DeskQuoteContact
  pricing: DeskPricing
  warnings: string[]
}) {
  const { setup, contact, pricing, warnings } = params
  return [
    'Fluxo: Desk Builder',
    `Secretária: ${setup.desk.widthCm}cm x ${setup.desk.depthCm}cm`,
    'Superfícies: superior e inferior',
    `Produtos em cima: ${setup.topItems.length}`,
    ...setup.topItems.map(itemSummary),
    `Produtos por baixo: ${setup.underItems.length}`,
    ...setup.underItems.map(itemSummary),
    warnings.length ? `Avisos: ${warnings.join(' | ')}` : 'Avisos: sem avisos',
    contact.shippingAddress ? `Morada: ${contact.shippingAddress}` : 'Morada: não indicada',
    contact.notes ? `Notas do cliente: ${contact.notes}` : 'Notas do cliente: sem notas',
    `Total estimado: ${pricing.totalPrice.toFixed(2)}€`,
  ].join('\n')
}
