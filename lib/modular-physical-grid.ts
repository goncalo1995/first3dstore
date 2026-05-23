import {
  CHARACTER_WIDTH_MM,
  EXTRA_LETTER_PACKS,
  type ExtraLetterPackSelection,
  FALLBACK_CHARACTER_WIDTH_MM,
  MAX_GLOBAL_MODULES,
  MIN_GLOBAL_MODULES,
  PHYSICAL_GRID_DIMENSION_SET as CONFIG_DIMENSION_SET,
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
export type RailAlign = 'left' | 'center' | 'right'
export type TextAlign = 'left' | 'center' | 'right'
export type PhysicalColumnKind = 'title' | 'item'
export type CheckoutLane = 'stripe_auto_pay' | 'manual_quote'

export type PhysicalColumn = {
  id: string
  kind: PhysicalColumnKind
  railModules: number
  leftText: string
  rightText: string
  railAlign: RailAlign
  textAlign: TextAlign
  colorOverride?: string
}

export type PhysicalRow = {
  id: string
  columns: PhysicalColumn[]
}

export type PhysicalWall = {
  id: string
  name: string
  type: 'text' | 'logo'
  maxWidthCm?: number
  rows: PhysicalRow[]
  logoSvgUrl?: string
  logoSvgText?: string
}

export type ExtraLetterGroup = {
  id: 'numbers' | 'vowels' | 'symbols'
  label: string
  charactersPerUnit: string
  quantity: number
  color?: MenuColorPayload
}

export type PhysicalColumnMetrics = {
  wallId?: string
  wallName?: string
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

export type PhysicalRowMetrics = {
  wallId?: string
  rowId: string
  railModules: number
  widthMm: number
  columnMetrics: PhysicalColumnMetrics[]
  overflow: boolean
}

export type PhysicalWallFootprint = {
  wallId: string
  wallName: string
  widthMm: number
  heightMm: number
  perimeterMm: number
  rowCount: number
  railModules: number
}

export type PhysicalWallMetrics = {
  wallId: string
  wallName: string
  wallType: 'text' | 'logo'
  maxWidthMm?: number
  railModules: number
  rowCount: number
  columnCount: number
  widthMm: number
  overflow: boolean
  exceedsMaxWidth: boolean
  hasLogo: boolean
  footprint: PhysicalWallFootprint
  rowMetrics: PhysicalRowMetrics[]
  columnMetrics: PhysicalColumnMetrics[]
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

export type PhysicalWallsBom = PhysicalGridBom & {
  walls: PhysicalWallMetrics[]
  wallCount: number
  textWallCount: number
  logoWallCount: number
  hasLogoWall: boolean
  checkoutLane: CheckoutLane
}

export const PHYSICAL_GRID_DIMENSION_SET: PhysicalGridDimensionSet = CONFIG_DIMENSION_SET

export const V1_PHYSICAL_DIMENSION_SET = {
  id: PHYSICAL_GRID_DIMENSION_SET,
  railLengthMm: RAIL_LENGTH_MM,
  characterWidthMm: CHARACTER_WIDTH_MM,
  fallbackCharacterWidthMm: FALLBACK_CHARACTER_WIDTH_MM,
} as const

export function clampRailModules(value: number | undefined) {
  if (!Number.isFinite(value)) return MIN_GLOBAL_MODULES
  return Math.min(MAX_GLOBAL_MODULES, Math.max(MIN_GLOBAL_MODULES, Math.trunc(Number(value))))
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

export function inferRailModulesForText(leftText: string, rightText = '') {
  return clampRailModules(Math.ceil((measureTextMm(leftText) + measureTextMm(rightText)) / RAIL_LENGTH_MM) || MIN_GLOBAL_MODULES)
}

export function getColumnAvailableMm(column: Pick<PhysicalColumn, 'railModules'>) {
  return clampRailModules(column.railModules) * RAIL_LENGTH_MM
}

export function measureColumnTextMm(column: Pick<PhysicalColumn, 'leftText' | 'rightText'>) {
  return measureTextMm(column.leftText) + measureTextMm(column.rightText)
}

export function columnOverflows(column: PhysicalColumn) {
  return measureColumnTextMm(column) > getColumnAvailableMm(column)
}

export function getColumnTileWidthPercent(character: string, column: Pick<PhysicalColumn, 'railModules'>) {
  return (getCharacterWidthMm(character) / getColumnAvailableMm(column)) * 100
}

export function getColumnMetrics(rowId: string, column: PhysicalColumn, wall?: Pick<PhysicalWall, 'id' | 'name'>): PhysicalColumnMetrics {
  const railModules = clampRailModules(column.railModules)
  const leftWidthMm = measureTextMm(column.leftText)
  const rightWidthMm = measureTextMm(column.rightText)
  const totalTextWidthMm = leftWidthMm + rightWidthMm
  const availableWidthMm = railModules * RAIL_LENGTH_MM

  return {
    wallId: wall?.id,
    wallName: wall?.name,
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

export function getRowWidthMm(row: PhysicalRow) {
  return row.columns.reduce((sum, column) => sum + getColumnAvailableMm(column), 0)
}

export function getRowMetrics(row: PhysicalRow, wall?: Pick<PhysicalWall, 'id' | 'name'>): PhysicalRowMetrics {
  const columnMetrics = row.columns.map(column => getColumnMetrics(row.id, column, wall))
  const railModules = columnMetrics.reduce((sum, metric) => sum + metric.railModules, 0)

  return {
    wallId: wall?.id,
    rowId: row.id,
    railModules,
    widthMm: railModules * RAIL_LENGTH_MM,
    columnMetrics,
    overflow: columnMetrics.some(metric => metric.overflow),
  }
}

export function getWallFootprint(wall: PhysicalWall, options: { rowHeightMm?: number } = {}): PhysicalWallFootprint {
  const rowHeightMm = Math.max(0, Number(options.rowHeightMm ?? 0))
  const rowWidths = wall.rows.map(getRowWidthMm)
  const widthMm = Math.max(0, ...rowWidths)
  const heightMm = wall.rows.length * rowHeightMm

  return {
    wallId: wall.id,
    wallName: wall.name,
    widthMm,
    heightMm,
    perimeterMm: heightMm > 0 || widthMm > 0 ? 2 * (widthMm + heightMm) : 0,
    rowCount: wall.rows.length,
    railModules: wall.rows.reduce((sum, row) => sum + row.columns.reduce((rowSum, column) => rowSum + clampRailModules(column.railModules), 0), 0),
  }
}

export function getWallMetrics(wall: PhysicalWall, options: { rowHeightMm?: number } = {}): PhysicalWallMetrics {
  const wallType = wall.type
  const rowMetrics = wall.rows.map(row => getRowMetrics(row, wall))
  const columnMetrics = rowMetrics.flatMap(row => row.columnMetrics)
  const railModules = columnMetrics.reduce((sum, metric) => sum + metric.railModules, 0)
  const widthMm = Math.max(0, ...rowMetrics.map(row => row.widthMm))
  const maxWidthMm = Number.isFinite(wall.maxWidthCm) ? Number(wall.maxWidthCm) * 10 : undefined

  return {
    wallId: wall.id,
    wallName: wall.name,
    wallType,
    maxWidthMm,
    railModules,
    rowCount: wall.rows.length,
    columnCount: columnMetrics.length,
    widthMm,
    overflow: columnMetrics.some(metric => metric.overflow),
    exceedsMaxWidth: Number.isFinite(maxWidthMm) ? widthMm > Number(maxWidthMm) : false,
    hasLogo: wallType === 'logo' || Boolean(wall.logoSvgUrl || wall.logoSvgText),
    footprint: getWallFootprint(wall, options),
    rowMetrics,
    columnMetrics,
  }
}

function colorKey(color: MenuColorPayload | undefined, fallback: string) {
  return color?.globalColorId || color?.name?.trim().toLowerCase() || fallback
}

function addCharacter(map: Record<string, number>, character: string, count = 1) {
  map[character] = (map[character] ?? 0) + count
}

function resolveOverrideColor(
  override: string | undefined,
  colorOverrides: Record<string, MenuColorPayload> | undefined,
) {
  if (!override) return undefined
  return colorOverrides?.[override] ?? { name: override, globalColorId: override }
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

function isLogoWall(wall: PhysicalWall) {
  return wall.type === 'logo' || Boolean(wall.logoSvgUrl || wall.logoSvgText)
}

type BomPricingInput = {
  extraLetterGroups?: ExtraLetterGroup[]
  extraLetterPackSelections?: ExtraLetterPackSelection[]
  baseLetterColor?: MenuColorPayload
  accentLetterColor?: MenuColorPayload
  colorOverrides?: Record<string, MenuColorPayload>
  railModuleUnitPrice?: number
  standardPackUnitPrice?: number
  avulsoUnitPrice?: number
  standardPackQuantity?: number
  avulsoCharacterQuantity?: number
}

function calculateBomFromRows(grid: PhysicalRow[], options: BomPricingInput = {}): PhysicalGridBom {
  const {
    extraLetterGroups = [],
    extraLetterPackSelections = [],
    baseLetterColor = { name: 'Base' },
    accentLetterColor,
    colorOverrides,
    railModuleUnitPrice = 0,
    standardPackUnitPrice = 0,
    avulsoUnitPrice = 0,
    standardPackQuantity,
    avulsoCharacterQuantity,
  } = options

  const characterFrequencyMap: Record<string, number> = {}
  const characterFrequencyByColor: CharacterFrequencyByColor = {}
  const columnMetrics = grid.flatMap(row => row.columns.map(column => getColumnMetrics(row.id, column)))
  const totalRailModules = columnMetrics.reduce((sum, metric) => sum + metric.railModules, 0)
  const maxRailModules = Math.max(MIN_GLOBAL_MODULES, ...columnMetrics.map(metric => metric.railModules))

  for (const row of grid) {
    for (const column of row.columns) {
      const overrideColor = resolveOverrideColor(column.colorOverride, colorOverrides)
      addTextToMaps({
        text: column.leftText,
        color: overrideColor ?? baseLetterColor,
        fallbackKey: overrideColor ? `override-${column.colorOverride}` : 'base',
        characterFrequencyMap,
        characterFrequencyByColor,
      })
      addTextToMaps({
        text: column.rightText,
        color: overrideColor ?? accentLetterColor ?? baseLetterColor,
        fallbackKey: overrideColor ? `override-${column.colorOverride}` : accentLetterColor ? 'accent' : 'base',
        characterFrequencyMap,
        characterFrequencyByColor,
      })
    }
  }

  let extraCharacters = 0
  for (const selection of extraLetterPackSelections) {
    const pack = EXTRA_LETTER_PACKS[selection.packId]
    const quantity = Math.max(0, Math.trunc(Number(selection.quantity) || 0))
    if (!pack || quantity <= 0 || !selection.color?.globalColorId) continue
    const repeated = pack.characters.repeat(quantity)
    extraCharacters += countVisibleCharacters(repeated)
    addTextToMaps({
      text: repeated,
      color: selection.color,
      fallbackKey: `extra-pack-${selection.id}`,
      characterFrequencyMap,
      characterFrequencyByColor,
    })
  }

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

export function getGridBom({
  grid,
  ...options
}: BomPricingInput & {
  grid: PhysicalRow[]
}): PhysicalGridBom {
  return calculateBomFromRows(grid, options)
}

export function getWallsBom({
  walls,
  forceManualQuote = false,
  hasCustomBrandColor = false,
  ...options
}: BomPricingInput & {
  walls: PhysicalWall[]
  forceManualQuote?: boolean
  hasCustomBrandColor?: boolean
}): PhysicalWallsBom {
  const wallMetrics = walls.map(wall => getWallMetrics(wall))
  const textRows = walls.filter(wall => !isLogoWall(wall)).flatMap(wall => wall.rows)
  const baseBom = calculateBomFromRows(textRows, options)
  const hasLogoWall = wallMetrics.some(metric => metric.hasLogo)
  const hasManualQuoteTrigger = forceManualQuote || hasCustomBrandColor || hasLogoWall

  return {
    ...baseBom,
    walls: wallMetrics,
    wallCount: walls.length,
    textWallCount: wallMetrics.filter(metric => metric.wallType === 'text' && !metric.hasLogo).length,
    logoWallCount: wallMetrics.filter(metric => metric.hasLogo).length,
    hasLogoWall,
    hasOverflow: baseBom.hasOverflow || wallMetrics.some(metric => metric.exceedsMaxWidth),
    checkoutLane: hasManualQuoteTrigger ? 'manual_quote' : 'stripe_auto_pay',
  }
}

export function flattenTextRowsFromWalls(walls: PhysicalWall[] = []) {
  return walls.filter(wall => !isLogoWall(wall)).flatMap(wall => wall.rows)
}

export function wallsToProductionMap(walls: PhysicalWall[] = []) {
  return walls.map((wall, wallIndex) => ({
    wallIndex: wallIndex + 1,
    wallId: wall.id,
    wallName: wall.name,
    wallType: wall.type,
    rows: wall.rows.map((row, rowIndex) => ({
      rowIndex: rowIndex + 1,
      rowId: row.id,
      columns: row.columns.map((column, columnIndex) => ({
        columnIndex: columnIndex + 1,
        columnId: column.id,
        railModules: clampRailModules(column.railModules),
        widthMm: getColumnAvailableMm(column),
        leftText: sanitizeMenuText(column.leftText),
        rightText: sanitizeMenuText(column.rightText),
        railAlign: column.railAlign,
        textAlign: column.textAlign,
        kind: column.kind,
        colorOverride: column.colorOverride,
      })),
    })),
  }))
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
