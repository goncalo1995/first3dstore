import { DESK_SCHEMA_VERSION, getDeskProduct } from './products'
import type { DeskItem, DeskRotation, DeskSetup, ValidationResult } from './types'

const rotations = new Set<DeskRotation>([0, 90, 180, 270])
export const MAX_DESK_ITEMS = 20

export const deskDimensionLimits = {
  width: { min: 80, max: 200 },
  depth: { min: 50, max: 100 },
}

function isNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isAllowedBaseColor(item: DeskItem) {
  const product = getDeskProduct(item.productId)
  if (!product) return false
  if (!item.colorBase) return true
  return product.allowedColors.base.includes(item.colorBase as any)
}

function isAllowedAccentColor(item: DeskItem) {
  const product = getDeskProduct(item.productId)
  if (!product) return false
  if (!item.colorAccent) return true
  return product.allowedColors.accent.includes(item.colorAccent as any)
}

export function getItemFootprint(item: Pick<DeskItem, 'productId' | 'rotation'>) {
  const product = getDeskProduct(item.productId)
  if (!product) return null

  const rotated = item.rotation === 90 || item.rotation === 270
  return {
    width: rotated ? product.footprintCm.depth : product.footprintCm.width,
    depth: rotated ? product.footprintCm.width : product.footprintCm.depth,
  }
}

export function clampItemToDesk(item: DeskItem, desk: DeskSetup['desk']): DeskItem {
  const footprint = getItemFootprint(item)
  if (!footprint) return item

  return {
    ...item,
    xCm: Math.min(Math.max(0, item.xCm), Math.max(0, desk.widthCm - footprint.width)),
    yCm: Math.min(Math.max(0, item.yCm), Math.max(0, desk.depthCm - footprint.depth)),
  }
}

export function snapValue(value: number, snapSizeCm: 5 | 10) {
  return Math.round(value / snapSizeCm) * snapSizeCm
}

export function snapItemToGrid(item: DeskItem, desk: DeskSetup['desk']) {
  if (!desk.snapToGrid) return clampItemToDesk(item, desk)

  return clampItemToDesk({
    ...item,
    xCm: snapValue(item.xCm, desk.snapSizeCm),
    yCm: snapValue(item.yCm, desk.snapSizeCm),
  }, desk)
}

export function normalizeDeskSetupColors(setup: DeskSetup): { setup: DeskSetup; warnings: string[] } {
  const warnings: string[] = []

  const items = setup.items.map((item) => {
    const product = getDeskProduct(item.productId)
    if (!product) return item

    const next: DeskItem = { ...item }
    if (next.colorBase && !product.allowedColors.base.includes(next.colorBase as any)) {
      next.colorBase = product.defaultColors.base
      warnings.push(`A cor principal de ${product.name} já não estava disponível e foi reposta.`)
    }
    if (next.colorAccent && !product.allowedColors.accent.includes(next.colorAccent as any)) {
      next.colorAccent = product.defaultColors.accent
      warnings.push(`A cor de detalhe de ${product.name} já não estava disponível e foi reposta.`)
    }
    return next
  })

  return {
    setup: {
      ...setup,
      items,
    },
    warnings,
  }
}

function itemsOverlap(a: DeskItem, b: DeskItem) {
  const aFootprint = getItemFootprint(a)
  const bFootprint = getItemFootprint(b)
  if (!aFootprint || !bFootprint) return false

  return (
    a.xCm < b.xCm + bFootprint.width &&
    a.xCm + aFootprint.width > b.xCm &&
    a.yCm < b.yCm + bFootprint.depth &&
    a.yCm + aFootprint.depth > b.yCm
  )
}

export function validateDeskSetup(setup: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!setup || typeof setup !== 'object') {
    return { valid: false, errors: ['O setup guardado não é válido.'], warnings }
  }

  const candidate = setup as DeskSetup

  if (candidate.type !== 'desk-setup') errors.push('Tipo de setup inválido.')
  if (candidate.schemaVersion !== DESK_SCHEMA_VERSION) errors.push('Versão do setup incompatível.')
  if (candidate.surface !== 'top') errors.push('Superfície do setup inválida.')
  if (!['view', 'edit', 'focus'].includes(candidate.mode)) errors.push('Modo do setup inválido.')

  if (!candidate.desk || typeof candidate.desk !== 'object') {
    errors.push('Dimensões da secretária em falta.')
  } else {
    if (!isNumber(candidate.desk.widthCm) || candidate.desk.widthCm < deskDimensionLimits.width.min || candidate.desk.widthCm > deskDimensionLimits.width.max) {
      errors.push(`A largura deve estar entre ${deskDimensionLimits.width.min}cm e ${deskDimensionLimits.width.max}cm.`)
    }
    if (!isNumber(candidate.desk.depthCm) || candidate.desk.depthCm < deskDimensionLimits.depth.min || candidate.desk.depthCm > deskDimensionLimits.depth.max) {
      errors.push(`A profundidade deve estar entre ${deskDimensionLimits.depth.min}cm e ${deskDimensionLimits.depth.max}cm.`)
    }
    if (!['string'].includes(typeof candidate.desk.surfaceColor)) errors.push('Cor da superfície inválida.')
    if (typeof candidate.desk.showGrid !== 'boolean') errors.push('Definição de grelha inválida.')
    if (typeof candidate.desk.snapToGrid !== 'boolean') errors.push('Definição de snap inválida.')
    if (candidate.desk.snapSizeCm !== 5 && candidate.desk.snapSizeCm !== 10) errors.push('Tamanho da grelha inválido.')
  }

  if (!Array.isArray(candidate.items)) {
    errors.push('Lista de produtos inválida.')
  } else if (candidate.desk) {
    if (candidate.items.length > MAX_DESK_ITEMS) {
      errors.push(`O setup permite no máximo ${MAX_DESK_ITEMS} produtos.`)
    }

    const counts = new Map<string, number>()

    candidate.items.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Produto ${index + 1} inválido.`)
        return
      }

      const product = getDeskProduct(item.productId)
      if (!product) {
        errors.push(`Produto desconhecido: ${item.productId || index + 1}.`)
        return
      }

      counts.set(item.productId, (counts.get(item.productId) ?? 0) + 1)

      if (!product.validation.allowedSurfaces.includes(candidate.surface)) {
        errors.push(`${product.name} não pode ser colocado nesta superfície.`)
      }

      if (!rotations.has(item.rotation)) {
        errors.push(`${product.name} tem uma rotação inválida.`)
      }

      if (!isAllowedBaseColor(item)) {
        errors.push(`${product.name} tem uma cor principal inválida.`)
      }

      if (!isAllowedAccentColor(item)) {
        errors.push(`${product.name} tem uma cor de detalhe inválida.`)
      }

      if (!isNumber(item.xCm) || !isNumber(item.yCm)) {
        errors.push(`${product.name} tem coordenadas inválidas.`)
        return
      }

      const footprint = getItemFootprint(item)
      if (!footprint) return

      if (
        item.xCm < 0 ||
        item.yCm < 0 ||
        item.xCm + footprint.width > candidate.desk.widthCm ||
        item.yCm + footprint.depth > candidate.desk.depthCm
      ) {
        errors.push(`${product.name} está fora da secretária.`)
      }
    })

    counts.forEach((quantity, productId) => {
      const product = getDeskProduct(productId)
      if (product?.validation.maxQuantity && quantity > product.validation.maxQuantity) {
        errors.push(`${product.name} permite no máximo ${product.validation.maxQuantity} unidades.`)
      }
    })

    for (let i = 0; i < candidate.items.length; i += 1) {
      for (let j = i + 1; j < candidate.items.length; j += 1) {
        if (itemsOverlap(candidate.items[i], candidate.items[j])) {
          warnings.push('Alguns produtos parecem estar sobrepostos.')
          i = candidate.items.length
          break
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}
