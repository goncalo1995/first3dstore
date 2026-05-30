import {
  countVisibleCharacters,
  getColumnMetrics,
  inferRailModulesForText,
  measureTextMm,
  PHYSICAL_GRID_DIMENSION_SET,
  type FontStyle,
  type PhysicalWall,
} from './modular-physical-grid'
import { sanitizeMenuText } from './menu-calculator'
import type { ExtraLetterPackSelection } from './modular-inventory-config'
import { EXTRA_LETTER_PACKS, RAIL_LENGTH_MM } from './modular-inventory-config'
import type { ProductColor } from './products'

export const MENU_V1_TEMPLATE_DRAFT_KEY = 'em3d-menu-line-builder-v1'
export const MENU_V1_ACTIVE_DRAFT_KEY = 'em3d-menu-line-builder-active-v1'
export const MENU_V1_SYNTHETIC_WALL_ID = 'menu-modular-v1'
export const MENU_V1_SYNTHETIC_WALL_NAME = 'Menu Modular V1'
export const MENU_V1_AUTOPAY_CHARACTER_LIMIT = 500
export const MENU_V1_LONG_LINE_RAIL_WARNING = 10

export type MenuV1Line = {
  id: string
  label: string
  detail: string
}

export type MenuV1LinePayload = {
  label: string
  detail: string
}

export type MenuV1ColorPayload = {
  name: string
  hex?: string
  globalColorId?: string
  priceAdd?: number
}

export type MenuV1Draft = {
  version: 1
  lines: MenuV1Line[]
  railColor?: ProductColor
  baseLetterColor?: ProductColor
  accentLetterColor?: ProductColor
  letterCardColor?: ProductColor
  customBrandColor?: string
  customBrandColorTarget?: 'rails' | 'letters'
  extraLetterPackSelections: ExtraLetterPackSelection[]
  customerName: string
  customerEmail: string
  customerPhone: string
  spaceType: string
  shippingMethod: 'pickup_carcavelos' | 'mainland_portugal'
  shippingAddress: string
  notes: string
}

export type MenuV1LineMetrics = {
  line: MenuV1Line
  railModules: number
  widthMm: number
  widthCm: number
  labelWidthMm: number
  detailWidthMm: number
  totalTextWidthMm: number
  characterCount: number
  isLong: boolean
}

export type MenuV1PayloadInput = {
  lines: MenuV1Line[]
  fontStyle: FontStyle
  railColor?: MenuV1ColorPayload
  baseLetterColor?: MenuV1ColorPayload
  accentLetterColor?: MenuV1ColorPayload
  letterCardColor?: MenuV1ColorPayload
  extraLetterPackSelections?: ExtraLetterPackSelection[]
  checkoutLane: 'stripe_auto_pay' | 'manual_quote'
  customBrandColor?: string
  customBrandColorTarget?: 'rails' | 'letters'
  totalRailModules: number
  standardPackQuantity: number
  avulsoCharacterQuantity: number
  characterFrequencyMap: Record<string, number>
  characterFrequencyByColor: Record<string, { color: MenuV1ColorPayload; characters: Record<string, number> }>
}

function fallbackId(index: number) {
  return `menu-line-${Date.now().toString(36)}-${index + 1}`
}

export function createMenuV1Line(index = 0, line: Partial<MenuV1LinePayload> = {}): MenuV1Line {
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : fallbackId(index)
  return {
    id,
    label: line.label ?? '',
    detail: line.detail ?? '',
  }
}

export function sanitizeV1Lines(value: unknown): MenuV1Line[] {
  if (!Array.isArray(value)) return []

  return value
    .map((line, index): MenuV1Line | null => {
      if (!line || typeof line !== 'object' || Array.isArray(line)) return null
      const record = line as Partial<MenuV1Line>
      const label = sanitizeMenuText(String(record.label ?? '')).replace(/\s+/g, ' ').trim().slice(0, 160)
      const detail = sanitizeMenuText(String(record.detail ?? '')).replace(/\s+/g, ' ').trim().slice(0, 120)
      if (!label && !detail) return null
      return {
        id: typeof record.id === 'string' && record.id.trim() ? record.id : createMenuV1Line(index).id,
        label,
        detail,
      }
    })
    .filter((line): line is MenuV1Line => Boolean(line))
}

export function getV1LineRailModules(line: Pick<MenuV1Line, 'label' | 'detail'>) {
  return inferRailModulesForText(line.label, line.detail)
}

export function getV1LineMetrics(line: MenuV1Line): MenuV1LineMetrics {
  const railModules = getV1LineRailModules(line)
  const widthMm = railModules * RAIL_LENGTH_MM
  const labelWidthMm = measureTextMm(line.label)
  const detailWidthMm = measureTextMm(line.detail)
  const syntheticColumn = {
    id: line.id,
    kind: 'item' as const,
    railModules,
    leftText: line.label,
    rightText: line.detail,
    railAlign: 'left' as const,
    textAlign: 'left' as const,
  }
  const columnMetrics = getColumnMetrics(line.id, syntheticColumn)

  return {
    line,
    railModules,
    widthMm,
    widthCm: widthMm / 10,
    labelWidthMm,
    detailWidthMm,
    totalTextWidthMm: columnMetrics.totalTextWidthMm,
    characterCount: columnMetrics.characterCount,
    isLong: railModules > MENU_V1_LONG_LINE_RAIL_WARNING,
  }
}

export function buildSyntheticMenuWall(lines: MenuV1Line[]): PhysicalWall {
  const validLines = sanitizeV1Lines(lines)

  return {
    id: MENU_V1_SYNTHETIC_WALL_ID,
    name: MENU_V1_SYNTHETIC_WALL_NAME,
    type: 'text',
    rows: validLines.map((line, index) => ({
      id: `menu-v1-row-${index + 1}-${line.id}`,
      layoutRole: 'list',
      columns: [
        {
          id: `menu-v1-col-${index + 1}-${line.id}`,
          kind: 'item',
          railModules: getV1LineRailModules(line),
          leftText: line.label,
          rightText: line.detail,
          railAlign: 'left',
          textAlign: 'left',
        },
      ],
    })),
  }
}

export function countExtraPackCharacters(selections: ExtraLetterPackSelection[] = []) {
  return selections.reduce((sum, selection) => {
    const pack = EXTRA_LETTER_PACKS[selection.packId]
    const quantity = Math.max(0, Math.trunc(Number(selection.quantity) || 0))
    if (!pack || quantity <= 0) return sum
    return sum + countVisibleCharacters(pack.characters.repeat(quantity))
  }, 0)
}

export function buildV1MenuSystemPayload(input: MenuV1PayloadInput) {
  const validLines = sanitizeV1Lines(input.lines)
  return {
    dimensionSet: PHYSICAL_GRID_DIMENSION_SET,
    fontStyle: input.fontStyle,
    walls: [buildSyntheticMenuWall(validLines)],
    v1Lines: validLines.map(({ label, detail }) => ({ label, detail })),
    extraLetterPackSelections: input.extraLetterPackSelections ?? [],
    totalRailModules: input.totalRailModules,
    standardPackQuantity: input.standardPackQuantity,
    avulsoCharacterQuantity: input.avulsoCharacterQuantity,
    characterFrequencyMap: input.characterFrequencyMap,
    characterFrequencyByColor: input.characterFrequencyByColor,
    checkoutLane: input.checkoutLane,
    customBrandColor: input.customBrandColor,
    customBrandColorTarget: input.customBrandColor ? input.customBrandColorTarget : undefined,
    railColor: input.railColor,
    letterColor: input.baseLetterColor,
    baseLetterColor: input.baseLetterColor,
    accentLetterColor: input.accentLetterColor,
    letterCardColor: input.letterCardColor,
  }
}
