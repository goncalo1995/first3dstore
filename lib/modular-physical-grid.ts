import {
  CHARACTER_WIDTH_MM,
  FALLBACK_CHARACTER_WIDTH_MM,
  MAX_GLOBAL_MODULES,
  MIN_GLOBAL_MODULES,
  RAIL_LENGTH_MM,
  STANDARD_PACK_DISTRIBUTION,
} from './modular-inventory-config'
import {
  calculateLetterPacks,
  calculateMenuOrderPricing,
  sanitizeMenuText,
  type CharacterFrequencyByColor,
  type MenuColorPayload,
} from './menu-calculator'

export type FontStyle = 'classic' | 'modern'
export type PhysicalGridDimensionSet = 'v1-standard-250'

export type PhysicalColumn = {
  id: string
  railModules: number
  leftText: string
  rightText: string
  colorOverride?: string
}

export type PhysicalRow = {
  id: string
  columns: PhysicalColumn[]
}

export type PhysicalCategory = {
  id: string
  title: string
  collapsed: boolean
  rows: PhysicalRow[]
}

export type ExtraLetterGroup = {
  id: 'numbers' | 'vowels' | 'symbols'
  label: string
  charactersPerUnit: string
  quantity: number
  color?: MenuColorPayload
}

export type PhysicalColumnMetrics = {
  rowId: string
  columnId: string
  railModules: number
  availableWidthMm: number
  leftWidthMm: number
  rightWidthMm: number
  totalTextWidthMm: number
  overflow: boolean
  characterCount: number
}

export type PhysicalGridBom = {
  dimensionSet: PhysicalGridDimensionSet
  railLengthMm: typeof RAIL_LENGTH_MM
  lineCount: number
  totalRailModules: number
  maxRailModules: number
  menuCharacters: number
  extraCharacters: number
  totalCharacters: number
  characterFrequencyMap: Record<string, number>
  characterFrequencyByColor: CharacterFrequencyByColor
  standardPackMinimum: number
  standardPackQuantity: number
  avulsoMinimum: number
  avulsoCharacterQuantity: number
  avulsoDeficitMap: Record<string, number>
  railModuleUnitPrice: number
  standardPackUnitPrice: number
  avulsoUnitPrice: number
  modulesSubtotal: number
  standardPacksSubtotal: number
  avulsoSubtotal: number
  subtotalBeforeDiscount: number
  launchDiscountPercent: number
  launchDiscountAmount: number
  totalAfterDiscount: number
  columnMetrics: PhysicalColumnMetrics[]
  hasOverflow: boolean
}

export const PHYSICAL_GRID_DIMENSION_SET: PhysicalGridDimensionSet = 'v1-standard-250'

export const V1_PHYSICAL_DIMENSION_SET = {
  id: PHYSICAL_GRID_DIMENSION_SET,
  railLengthMm: RAIL_LENGTH_MM,
  characterWidthMm: CHARACTER_WIDTH_MM,
} as const

export function clampRailModules(value: number | undefined) {
  if (!Number.isFinite(value)) return MIN_GLOBAL_MODULES
  return Math.min(MAX_GLOBAL_MODULES, Math.max(MIN_GLOBAL_MODULES, Math.trunc(Number(value))))
}

export function inferRailModulesForText(leftText: string, rightText = '') {
  return clampRailModules(Math.ceil((measureTextMm(leftText) + measureTextMm(rightText)) / RAIL_LENGTH_MM) || MIN_GLOBAL_MODULES)
}

export function getCharacterWidthMm(character: string) {
  return CHARACTER_WIDTH_MM[character] ?? FALLBACK_CHARACTER_WIDTH_MM
}

export function measureTextMm(text: string) {
  return Array.from(sanitizeMenuText(String(text ?? ''))).reduce((sum, character) => {
    if (character === '\n') return sum
    return sum + getCharacterWidthMm(character)
  }, 0)
}

export function countVisibleCharacters(text: string) {
  return Array.from(sanitizeMenuText(String(text ?? '')).replace(/\n/g, '')).length
}

export function getColumnAvailableMm(column: PhysicalColumn) {
  return clampRailModules(column.railModules) * RAIL_LENGTH_MM
}

export function measureColumnTextMm(column: Pick<PhysicalColumn, 'leftText' | 'rightText'>) {
  return measureTextMm(column.leftText) + measureTextMm(column.rightText)
}

export function columnOverflows(column: PhysicalColumn) {
  return measureColumnTextMm(column) > getColumnAvailableMm(column)
}

export function getColumnMetrics(rowId: string, column: PhysicalColumn): PhysicalColumnMetrics {
  const railModules = clampRailModules(column.railModules)
  const leftWidthMm = measureTextMm(column.leftText)
  const rightWidthMm = measureTextMm(column.rightText)
  const totalTextWidthMm = leftWidthMm + rightWidthMm
  const availableWidthMm = railModules * RAIL_LENGTH_MM

  return {
    rowId,
    columnId: column.id,
    railModules,
    availableWidthMm,
    leftWidthMm,
    rightWidthMm,
    totalTextWidthMm,
    overflow: totalTextWidthMm > availableWidthMm,
    characterCount: countVisibleCharacters(`${column.leftText}${column.rightText}`),
  }
}

function colorKey(color: MenuColorPayload | undefined, fallback: string) {
  return color?.globalColorId || color?.name?.trim().toLowerCase() || fallback
}

function addCharacter(map: Record<string, number>, character: string, count = 1) {
  map[character] = (map[character] ?? 0) + count
}

function addTextToMaps({
  text,
  color,
  fallbackKey,
  characterFrequencyMap,
  characterFrequencyByColor,
}: {
  text: string
  color: MenuColorPayload
  fallbackKey: string
  characterFrequencyMap: Record<string, number>
  characterFrequencyByColor: CharacterFrequencyByColor
}) {
  const key = colorKey(color, fallbackKey)
  characterFrequencyByColor[key] ??= { color, characters: {} }

  for (const character of Array.from(sanitizeMenuText(text).replace(/\n/g, ''))) {
    addCharacter(characterFrequencyMap, character)
    addCharacter(characterFrequencyByColor[key].characters, character)
  }
}

function countCharacters(map: Record<string, number>) {
  return Object.values(map).reduce((sum, count) => sum + count, 0)
}

export function getGridBom({
  grid,
  extraLetterGroups = [],
  baseLetterColor = { name: 'Base' },
  accentLetterColor,
  railModuleUnitPrice = 0,
  standardPackUnitPrice = 0,
  avulsoUnitPrice = 0,
  standardPackQuantity,
  avulsoCharacterQuantity,
}: {
  grid: PhysicalRow[]
  extraLetterGroups?: ExtraLetterGroup[]
  baseLetterColor?: MenuColorPayload
  accentLetterColor?: MenuColorPayload
  railModuleUnitPrice?: number
  standardPackUnitPrice?: number
  avulsoUnitPrice?: number
  standardPackQuantity?: number
  avulsoCharacterQuantity?: number
}): PhysicalGridBom {
  const characterFrequencyMap: Record<string, number> = {}
  const characterFrequencyByColor: CharacterFrequencyByColor = {}
  const columnMetrics = grid.flatMap(row => row.columns.map(column => getColumnMetrics(row.id, column)))
  const totalRailModules = columnMetrics.reduce((sum, metric) => sum + metric.railModules, 0)
  const maxRailModules = Math.max(MIN_GLOBAL_MODULES, ...columnMetrics.map(metric => metric.railModules))

  for (const row of grid) {
    for (const column of row.columns) {
      addTextToMaps({
        text: column.leftText,
        color: baseLetterColor,
        fallbackKey: 'base',
        characterFrequencyMap,
        characterFrequencyByColor,
      })
      addTextToMaps({
        text: column.rightText,
        color: accentLetterColor ?? baseLetterColor,
        fallbackKey: accentLetterColor ? 'accent' : 'base',
        characterFrequencyMap,
        characterFrequencyByColor,
      })
    }
  }

  let extraCharacters = 0
  for (const group of extraLetterGroups) {
    if (group.quantity <= 0) continue
    const repeated = group.charactersPerUnit.repeat(group.quantity)
    extraCharacters += countVisibleCharacters(repeated)
    addTextToMaps({
      text: repeated,
      color: group.color ?? baseLetterColor,
      fallbackKey: `extra-${group.id}`,
      characterFrequencyMap,
      characterFrequencyByColor,
    })
  }

  const menuCharacters = columnMetrics.reduce((sum, metric) => sum + metric.characterCount, 0)
  const totalCharacters = countCharacters(characterFrequencyMap)
  const letterPacks = calculateLetterPacks(
    characterFrequencyMap,
    standardPackQuantity,
    avulsoCharacterQuantity,
    standardPackUnitPrice,
    avulsoUnitPrice,
  )
  const pricing = calculateMenuOrderPricing({
    totalRailModules,
    standardPackQuantity: letterPacks.standardPackQuantity,
    avulsoCharacterQuantity: letterPacks.avulsoCharacterQuantity,
    railModuleUnitPrice,
    standardPackUnitPrice,
    avulsoUnitPrice,
  })

  return {
    dimensionSet: PHYSICAL_GRID_DIMENSION_SET,
    railLengthMm: RAIL_LENGTH_MM,
    lineCount: grid.length,
    totalRailModules,
    maxRailModules,
    menuCharacters,
    extraCharacters,
    totalCharacters,
    characterFrequencyMap,
    characterFrequencyByColor,
    ...letterPacks,
    ...pricing,
    columnMetrics,
    hasOverflow: columnMetrics.some(metric => metric.overflow),
  }
}

export function physicalGridToMenuRows(grid: PhysicalRow[]) {
  return grid.flatMap((row, rowIndex) => row.columns.map((column, columnIndex) => ({
    id: `${row.id}-${column.id}`,
    label: column.leftText,
    detail: column.rightText,
    useAccent: Boolean(column.rightText),
    moduleCount: clampRailModules(column.railModules),
    categoryId: row.id,
    index: rowIndex + columnIndex + 1,
  })))
}

export function extraLetterGroupsToText(groups: ExtraLetterGroup[] = []) {
  return groups
    .filter(group => group.quantity > 0)
    .map(group => group.charactersPerUnit.repeat(group.quantity))
    .join('')
}

export function getStandardPackSize() {
  return Object.values(STANDARD_PACK_DISTRIBUTION).reduce((sum, count) => sum + count, 0)
}
