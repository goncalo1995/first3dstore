import {
  DESK_SCHEMA_VERSION,
  getDeskItemFootprint,
  getDeskProduct,
} from './products'
import type { DeskItem, DeskRotation, DeskSetup } from './types'
import { deskDimensionLimits, validateDeskCustomConfig } from './validation'

export const DESK_GENERATOR_VERSION = 'desk-openscad-v1'

export type DeskGeneratorPayload = {
  type: 'desk-openscad-payload'
  generatorVersion: typeof DESK_GENERATOR_VERSION
  sourceSchemaVersion: 1
  desk: {
    widthMm: number
    depthMm: number
    surface: 'top'
    grid?: {
      showGrid?: boolean
      snapToGrid?: boolean
      snapSizeMm?: number
    }
  }
  items: DeskGeneratorItem[]
}

export type DeskGeneratorItem = {
  productId: string
  moduleName: string
  moduleVersion: string
  xMm: number
  yMm: number
  rotation: DeskRotation
  footprintMm: {
    width: number
    depth: number
  }
  colors: {
    base?: string
    accent?: string
  }
  customConfig: Record<string, unknown>
}

type GeneratorDeskInput = {
  type?: unknown
  schemaVersion?: unknown
  surface?: unknown
  desk?: unknown
  items?: unknown
}

type GeneratorDesk = {
  widthCm: number
  depthCm: number
  surface: 'top'
  showGrid?: boolean
  snapToGrid?: boolean
  snapSizeCm?: number
}

export class DeskGeneratorValidationError extends Error {
  errors: string[]

  constructor(errors: string[]) {
    super(errors.join(' '))
    this.name = 'DeskGeneratorValidationError'
    this.errors = errors
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRotation(value: unknown): value is DeskRotation {
  return value === 0 || value === 90 || value === 180 || value === 270
}

function toMm(valueCm: number) {
  return Math.round(valueCm * 10)
}

function getSortedRecord(value: Record<string, unknown>) {
  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = sortForStableJson(value[key])
      return acc
    }, {})
}

function sortForStableJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForStableJson)
  if (isRecord(value)) return getSortedRecord(value)
  return value
}

function getValidatedCustomConfig(productId: string, value: unknown, errors: string[]) {
  const validation = validateDeskCustomConfig(productId, value)
  errors.push(...validation.errors)
  if (!isRecord(value)) return {}
  return getSortedRecord(value)
}

function getGeneratorDesk(input: GeneratorDeskInput, errors: string[]): GeneratorDesk | null {
  if (!isRecord(input.desk)) {
    errors.push('Dimensões da secretária em falta.')
    return null
  }

  const widthCm = input.desk.widthCm
  const depthCm = input.desk.depthCm

  if (!isNumber(widthCm) || widthCm < deskDimensionLimits.width.min || widthCm > deskDimensionLimits.width.max) {
    errors.push(`A largura deve estar entre ${deskDimensionLimits.width.min}cm e ${deskDimensionLimits.width.max}cm.`)
  }

  if (!isNumber(depthCm) || depthCm < deskDimensionLimits.depth.min || depthCm > deskDimensionLimits.depth.max) {
    errors.push(`A profundidade deve estar entre ${deskDimensionLimits.depth.min}cm e ${deskDimensionLimits.depth.max}cm.`)
  }

  if (!isNumber(widthCm) || !isNumber(depthCm)) return null

  return {
    widthCm,
    depthCm,
    surface: 'top',
    showGrid: typeof input.desk.showGrid === 'boolean' ? input.desk.showGrid : undefined,
    snapToGrid: typeof input.desk.snapToGrid === 'boolean' ? input.desk.snapToGrid : undefined,
    snapSizeCm: isNumber(input.desk.snapSizeCm) ? input.desk.snapSizeCm : undefined,
  }
}

function getValidatedGeneratorItems(input: GeneratorDeskInput, desk: GeneratorDesk | null, errors: string[]) {
  if (!Array.isArray(input.items)) {
    errors.push('Lista de produtos inválida.')
    return []
  }

  return input.items.flatMap((rawItem, index): DeskGeneratorItem[] => {
    if (!isRecord(rawItem)) {
      errors.push(`Produto ${index + 1} inválido.`)
      return []
    }

    const productId = typeof rawItem.productId === 'string' ? rawItem.productId : ''
    const product = getDeskProduct(productId)
    if (!product) {
      errors.push(`Produto desconhecido: ${productId || index + 1}.`)
      return []
    }

    const rotation = rawItem.rotation
    if (!isRotation(rotation)) {
      errors.push(`${product.name} tem uma rotação inválida.`)
      return []
    }

    if (!product.validation.allowedSurfaces.includes('top')) {
      errors.push(`${product.name} não pode ser colocado nesta superfície.`)
    }

    if (!isNumber(rawItem.xCm) || !isNumber(rawItem.yCm)) {
      errors.push(`${product.name} tem coordenadas inválidas.`)
      return []
    }

    const item: DeskItem = {
      id: typeof rawItem.id === 'string' ? rawItem.id : `${productId}-${index + 1}`,
      productId,
      xCm: rawItem.xCm,
      yCm: rawItem.yCm,
      rotation,
      colorBase: typeof rawItem.colorBase === 'string' ? rawItem.colorBase : undefined,
      colorAccent: typeof rawItem.colorAccent === 'string' ? rawItem.colorAccent : undefined,
      customConfig: isRecord(rawItem.customConfig) ? rawItem.customConfig : rawItem.customConfig as Record<string, unknown> | undefined,
    }

    if (item.colorBase && !product.allowedColors.base.includes(item.colorBase as any)) {
      errors.push(`${product.name} tem uma cor principal inválida.`)
    }

    if (item.colorAccent && !product.allowedColors.accent.includes(item.colorAccent as any)) {
      errors.push(`${product.name} tem uma cor de detalhe inválida.`)
    }

    const customConfig = getValidatedCustomConfig(productId, rawItem.customConfig, errors)
    const footprint = getDeskItemFootprint(item)
    if (!footprint) {
      errors.push(`${product.name} não tem pegada de produção válida.`)
      return []
    }

    if (desk && (
      item.xCm < 0 ||
      item.yCm < 0 ||
      item.xCm + footprint.width > desk.widthCm ||
      item.yCm + footprint.depth > desk.depthCm
    )) {
      errors.push(`${product.name} está fora da secretária.`)
    }

    return [{
      productId,
      moduleName: product.generator.moduleName,
      moduleVersion: product.generator.version,
      xMm: toMm(item.xCm),
      yMm: toMm(item.yCm),
      rotation,
      footprintMm: {
        width: toMm(footprint.width),
        depth: toMm(footprint.depth),
      },
      colors: {
        base: item.colorBase,
        accent: item.colorAccent,
      },
      customConfig,
    }]
  })
}

export function buildDeskGeneratorPayload(input: unknown): DeskGeneratorPayload {
  const errors: string[] = []

  if (!isRecord(input)) {
    throw new DeskGeneratorValidationError(['Configuração de secretária inválida.'])
  }

  const candidate = input as GeneratorDeskInput | DeskSetup
  if (candidate.type !== 'desk-setup') errors.push('Tipo de setup inválido.')
  if (candidate.schemaVersion !== DESK_SCHEMA_VERSION) errors.push('Versão do setup incompatível.')
  if (candidate.surface !== 'top') errors.push('Superfície do setup inválida.')

  const desk = getGeneratorDesk(candidate, errors)
  const items = getValidatedGeneratorItems(candidate, desk, errors)

  if (errors.length > 0 || !desk) {
    throw new DeskGeneratorValidationError(errors)
  }

  const grid = [
    desk.showGrid === undefined ? null : ['showGrid', desk.showGrid],
    desk.snapToGrid === undefined ? null : ['snapToGrid', desk.snapToGrid],
    desk.snapSizeCm === undefined ? null : ['snapSizeMm', toMm(desk.snapSizeCm)],
  ].filter(Boolean) as Array<[string, boolean | number]>

  return {
    type: 'desk-openscad-payload',
    generatorVersion: DESK_GENERATOR_VERSION,
    sourceSchemaVersion: DESK_SCHEMA_VERSION,
    desk: {
      widthMm: toMm(desk.widthCm),
      depthMm: toMm(desk.depthCm),
      surface: desk.surface,
      ...(grid.length ? { grid: Object.fromEntries(grid) } : {}),
    },
    items,
  }
}

function escapeOpenScadString(value: string) {
  return value.replace(/[\u0000-\u001f"\\]/g, (character) => {
    switch (character) {
      case '"':
        return '\\"'
      case '\\':
        return '\\\\'
      case '\n':
        return '\\n'
      case '\r':
        return '\\r'
      case '\t':
        return '\\t'
      default:
        return `\\x${character.charCodeAt(0).toString(16).padStart(2, '0')}`
    }
  })
}

function scadString(value: string) {
  return `"${escapeOpenScadString(value)}"`
}

export function formatDeskGeneratorCall(payload: DeskGeneratorPayload) {
  const itemLines = payload.items.map((item) => {
    const customConfig = JSON.stringify(sortForStableJson(item.customConfig))
    return [
      '    [',
      [
        scadString(item.moduleName),
        scadString(item.moduleVersion),
        item.xMm,
        item.yMm,
        item.rotation,
        item.footprintMm.width,
        item.footprintMm.depth,
        scadString(item.colors.base ?? ''),
        scadString(item.colors.accent ?? ''),
        scadString(customConfig),
      ].join(', '),
      ']',
    ].join('')
  })

  return [
    'generate_desk_setup(',
    `  desk_w = ${payload.desk.widthMm},`,
    `  desk_d = ${payload.desk.depthMm},`,
    `  surface = ${scadString(payload.desk.surface)},`,
    '  items = [',
    itemLines.join(',\n'),
    '  ]',
    ');',
  ].join('\n')
}
