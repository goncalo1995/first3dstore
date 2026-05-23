import { sanitizeMenuText } from './menu-calculator'
import {
  EXTRA_LETTER_PACKS,
  type ExtraLetterPackSelection,
} from './modular-inventory-config'
import {
  clampRailModules,
  type ExtraLetterGroup,
  type PhysicalColumn,
  type PhysicalRow,
  type PhysicalWall,
} from './modular-physical-grid'

type BomColor = {
  name?: string
  hex?: string
  globalColorId?: string
  priceAdd?: number
}

export type ModularProductionSource = {
  fontStyle?: 'classic' | 'modern'
  productionFont?: string
  walls?: PhysicalWall[]
  physicalGrid?: PhysicalRow[]
  lines?: {
    index?: number
    text?: string
    label?: string
    detail?: string
    moduleCount?: number
    railModuleQuantity?: number
    characterCount?: number
  }[]
  extraLetterGroups?: ExtraLetterGroup[]
  extraLetterPackSelections?: ExtraLetterPackSelection[]
  railColor?: BomColor
  letterColor?: BomColor
  baseLetterColor?: BomColor
  accentLetterColor?: BomColor
  letterCardColor?: BomColor
  totals?: {
    totalRailModules?: number
    standardPackQuantity?: number
    avulsoCharacterQuantity?: number
    characterFrequencyMap?: Record<string, number>
    characterFrequencyByColor?: Record<string, { color: BomColor; characters: Record<string, number> }>
  }
  totalRailModules?: number
  standardPackQuantity?: number
  avulsoCharacterQuantity?: number
  characterFrequencyMap?: Record<string, number>
  characterFrequencyByColor?: Record<string, { color: BomColor; characters: Record<string, number> }>
}

export type ModularProductionColorGroup = {
  key: string
  colorName: string
  colorHex?: string
  characters: Record<string, number>
  totalLetters: number
}

export type ModularProductionWall = {
  index: number
  id: string
  name: string
  type: 'text' | 'logo'
  railModules: number
  rows: {
    index: number
    columns: {
      index: number
      railModules: number
      widthMm: number
      leftText: string
      rightText: string
    }[]
  }[]
  colorGroups: ModularProductionColorGroup[]
  logoSvgUrl?: string
  logoSvgText?: string
  requiresManualCad: boolean
}

export type ModularProductionBom = {
  title: string
  fontStyle: 'classic' | 'modern'
  productionFont?: string
  railColorName: string
  railColorHex?: string
  letterCardColorName?: string
  totalRailModules: number
  standardPackQuantity: number
  avulsoCharacterQuantity: number
  walls: ModularProductionWall[]
  legacyColorGroups: ModularProductionColorGroup[]
  extraLetterGroups: {
    label: string
    quantity: number
    charactersPerUnit: string
    colorName: string
    colorHex?: string
  }[]
  hasLogo: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isPhysicalWall(value: unknown): value is PhysicalWall {
  if (!isRecord(value)) return false
  return typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.type === 'text' || value.type === 'logo') &&
    Array.isArray(value.rows)
}

function asWalls(value: unknown): PhysicalWall[] {
  return Array.isArray(value) ? value.filter(isPhysicalWall) : []
}

function colorName(color: BomColor | undefined, fallback: string) {
  return String(color?.name || color?.globalColorId || fallback).trim() || fallback
}

function colorKey(color: BomColor | undefined, fallback: string) {
  return String(color?.globalColorId || color?.name || fallback).trim().toLowerCase() || fallback
}

function addCharacter(target: Record<string, number>, character: string, count = 1) {
  if (!character) return
  target[character] = (target[character] ?? 0) + count
}

function sortedCharacterEntries(map: Record<string, number>) {
  return Object.entries(map)
    .filter(([, count]) => Number(count) > 0)
    .sort(([left], [right]) => left.localeCompare(right, 'pt-PT'))
}

function addTextToColorGroup(
  groups: Map<string, ModularProductionColorGroup>,
  text: string,
  color: BomColor | undefined,
  fallbackKey: string,
  fallbackName: string,
) {
  const clean = sanitizeMenuText(text).replace(/\n/g, '')
  if (!clean) return

  const key = colorKey(color, fallbackKey)
  const group = groups.get(key) ?? {
    key,
    colorName: colorName(color, fallbackName),
    colorHex: color?.hex,
    characters: {},
    totalLetters: 0,
  }

  for (const character of Array.from(clean)) {
    addCharacter(group.characters, character)
    group.totalLetters += 1
  }

  groups.set(key, group)
}

function groupsFromMap(
  source: Record<string, { color: BomColor; characters: Record<string, number> }> | undefined,
): ModularProductionColorGroup[] {
  return Object.entries(source ?? {})
    .map(([key, group]) => ({
      key,
      colorName: colorName(group.color, 'Letras'),
      colorHex: group.color?.hex,
      characters: group.characters ?? {},
      totalLetters: Object.values(group.characters ?? {}).reduce((sum, count) => sum + Number(count || 0), 0),
    }))
    .filter(group => group.totalLetters > 0)
    .sort((left, right) => left.colorName.localeCompare(right.colorName, 'pt-PT'))
}

function countColumnRails(column: Pick<PhysicalColumn, 'railModules'>) {
  return clampRailModules(Number(column.railModules))
}

function buildWallBom(
  wall: PhysicalWall,
  index: number,
  source: ModularProductionSource,
): ModularProductionWall {
  const groups = new Map<string, ModularProductionColorGroup>()
  const baseColor = source.baseLetterColor ?? source.letterColor
  const accentColor = source.accentLetterColor ?? baseColor

  for (const row of wall.rows ?? []) {
    for (const column of row.columns ?? []) {
      const overrideColor = column.colorOverride
        ? { name: column.colorOverride, globalColorId: column.colorOverride }
        : undefined
      const leftColor = overrideColor ?? baseColor
      const rightColor = overrideColor ?? accentColor
      addTextToColorGroup(groups, column.leftText, leftColor, `wall-${wall.id}-base`, 'Letras')
      addTextToColorGroup(groups, column.rightText, rightColor, `wall-${wall.id}-accent`, 'Letras destaque')
    }
  }

  const rows = (wall.rows ?? []).map((row, rowIndex) => ({
    index: rowIndex + 1,
    columns: (row.columns ?? []).map((column, columnIndex) => {
      const railModules = countColumnRails(column)
      return {
        index: columnIndex + 1,
        railModules,
        widthMm: railModules * 250,
        leftText: sanitizeMenuText(column.leftText),
        rightText: sanitizeMenuText(column.rightText),
      }
    }),
  }))

  const railModules = rows.reduce(
    (sum, row) => sum + row.columns.reduce((rowSum, column) => rowSum + column.railModules, 0),
    0,
  )

  const isLogo = wall.type === 'logo' || Boolean(wall.logoSvgUrl || wall.logoSvgText)

  return {
    index,
    id: wall.id,
    name: wall.name || `Parede ${index}`,
    type: isLogo ? 'logo' : 'text',
    railModules,
    rows,
    colorGroups: Array.from(groups.values()).sort((left, right) => left.colorName.localeCompare(right.colorName, 'pt-PT')),
    logoSvgUrl: wall.logoSvgUrl,
    logoSvgText: wall.logoSvgText,
    requiresManualCad: isLogo && Boolean(wall.logoSvgUrl || wall.logoSvgText),
  }
}

function getSourceFromOrder(order: any): ModularProductionSource | null {
  const items = Array.isArray(order?.items) ? order.items : []
  return items
    .map((item: any) => item?.menuSystem)
    .find((menuSystem: any) => menuSystem && (
      asWalls(menuSystem.walls).length > 0 ||
      Array.isArray(menuSystem.physicalGrid) ||
      Array.isArray(menuSystem.lines)
    )) ?? null
}

function getSourceFromOrderRequest(request: any): ModularProductionSource | null {
  const config = request?.canvasConfig
  if (!config || config.type !== 'modular-list') return null
  if (asWalls(config.walls).length === 0 && !Array.isArray(config.physicalGrid)) return null
  return config as ModularProductionSource
}

export function getModularProductionSource(record: any): ModularProductionSource | null {
  return getSourceFromOrder(record) ?? getSourceFromOrderRequest(record)
}

export function buildModularProductionBom(recordOrSource: any): ModularProductionBom | null {
  const source = isRecord(recordOrSource) && (
    Array.isArray((recordOrSource as any).walls) ||
    Array.isArray((recordOrSource as any).physicalGrid) ||
    Array.isArray((recordOrSource as any).lines)
  )
    ? recordOrSource as ModularProductionSource
    : getModularProductionSource(recordOrSource)

  if (!source) return null

  const walls = asWalls(source.walls)
  const wallBoms = walls.map((wall, index) => buildWallBom(wall, index + 1, source))
  const totalRailsFromWalls = wallBoms.reduce((sum, wall) => sum + wall.railModules, 0)
  const sourceTotals = source.totals ?? {}
  const legacyColorGroups = walls.length > 0 ? [] : groupsFromMap(source.characterFrequencyByColor ?? sourceTotals.characterFrequencyByColor)

  if (wallBoms.length === 0 && legacyColorGroups.length === 0 && !Array.isArray(source.lines)) {
    return null
  }

  return {
    title: 'Sistema Modular',
    fontStyle: source.fontStyle === 'modern' ? 'modern' : 'classic',
    productionFont: source.productionFont,
    railColorName: colorName(source.railColor, 'Calhas'),
    railColorHex: source.railColor?.hex,
    letterCardColorName: source.letterCardColor ? colorName(source.letterCardColor, 'Fundo das letras') : undefined,
    totalRailModules: Number(source.totalRailModules ?? sourceTotals.totalRailModules ?? totalRailsFromWalls ?? 0),
    standardPackQuantity: Number(source.standardPackQuantity ?? sourceTotals.standardPackQuantity ?? 0),
    avulsoCharacterQuantity: Number(source.avulsoCharacterQuantity ?? sourceTotals.avulsoCharacterQuantity ?? 0),
    walls: wallBoms,
    legacyColorGroups,
    extraLetterGroups: (source.extraLetterGroups ?? [])
      .filter(group => Number(group.quantity) > 0)
      .map(group => ({
        label: group.label,
        quantity: Number(group.quantity),
        charactersPerUnit: group.charactersPerUnit,
        colorName: colorName(group.color, 'Letras extra'),
        colorHex: group.color?.hex,
      })),
    ...(source.extraLetterPackSelections
      ? {
          extraLetterGroups: source.extraLetterPackSelections
            .filter(selection => Number(selection.quantity) > 0 && EXTRA_LETTER_PACKS[selection.packId])
            .map(selection => {
              const pack = EXTRA_LETTER_PACKS[selection.packId]
              return {
                label: pack.label,
                quantity: Number(selection.quantity),
                charactersPerUnit: pack.characters,
                colorName: colorName(selection.color, 'Letras extra'),
                colorHex: selection.color?.hex,
              }
            }),
        }
      : {}),
    hasLogo: wallBoms.some(wall => wall.requiresManualCad),
  }
}

export function formatCharacterCounts(map: Record<string, number>) {
  const entries = sortedCharacterEntries(map).map(([character, count]) => {
    const label = character === ' ' ? 'Espaco' : character
    return `${label}(${count})`
  })
  return entries.length ? entries.join(', ') : '-'
}

export function formatModularProductionBomText(recordOrSource: any) {
  const bom = buildModularProductionBom(recordOrSource)
  if (!bom) return ''

  const wallText = bom.walls.length
    ? bom.walls.map(wall => {
        const colorText = wall.colorGroups.map(group => (
          `  - Imprimir em ${group.colorName}: Letras ${formatCharacterCounts(group.characters)}`
        )).join('\n') || '  - Sem letras nesta parede.'
        const logoText = wall.requiresManualCad
          ? '\n  - Logotipo Personalizado - Modelacao CAD Manual Necessaria'
          : ''
        return `PAREDE ${wall.index}: ${wall.name}
  - Calhas de 25cm: ${wall.railModules}
${colorText}${logoText}`
      }).join('\n\n')
    : bom.legacyColorGroups.map(group => (
        `- Imprimir em ${group.colorName}: Letras ${formatCharacterCounts(group.characters)}`
      )).join('\n')

  const extras = bom.extraLetterGroups.length
    ? `\n\nLETRAS EXTRA\n${bom.extraLetterGroups.map(group => `- ${group.label}: ${group.quantity}x "${group.charactersPerUnit}" em ${group.colorName}`).join('\n')}`
    : ''

  return `BOM DE PRODUCAO MODULAR
Fonte STL: ${bom.fontStyle}
Cor das calhas: ${bom.railColorName}
Fundo das letras: ${bom.letterCardColorName || '-'}
Calhas totais de 25cm: ${bom.totalRailModules}
Packs Standard: ${bom.standardPackQuantity}
Letras avulso: ${bom.avulsoCharacterQuantity}

${wallText || '-'}${extras}`
}
