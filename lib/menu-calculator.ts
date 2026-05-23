import {
  CHARACTER_WIDTH_MM,
  CHARS_PER_MODULE_ESTIMATE,
  FALLBACK_CHARACTER_WIDTH_MM,
  LAUNCH_DISCOUNT_PERCENT,
  MAX_GLOBAL_MODULES,
  MIN_GLOBAL_MODULES,
  MODULE_LENGTH_MM,
  RAIL_LENGTH_MM,
  STANDARD_PACK_DISTRIBUTION,
} from './modular-inventory-config'

export {
  CHARACTER_WIDTH_MM,
  CHARS_PER_MODULE_ESTIMATE,
  FALLBACK_CHARACTER_WIDTH_MM,
  LAUNCH_DISCOUNT_PERCENT,
  MAX_GLOBAL_MODULES,
  MIN_GLOBAL_MODULES,
  MODULE_LENGTH_MM,
  RAIL_LENGTH_MM,
  STANDARD_PACK_DISTRIBUTION,
}

export const MODULE_LENGTH_CM = MODULE_LENGTH_MM / 10
export const STANDARD_PACK_SIZE = Object.values(STANDARD_PACK_DISTRIBUTION).reduce((sum, count) => sum + count, 0)
export const MENU_TEXT_MAX_CHARS = 5000
export const MENU_EXTRA_MAX_CHARS = 500
export const MENU_CUSTOM_ICON_MAX_CHARS = 500
export const MENU_LETTER_COLOR_REQUEST_MAX_CHARS = 300
export const MENU_MAX_LINES = 100

export const MENU_RAIL_LENGTH_CM = MODULE_LENGTH_CM
export const MENU_PACK_SIZE = STANDARD_PACK_SIZE

export type ModularLine = {
  id: string
  label: string
  detail?: string
  useAccent?: boolean
  moduleCount?: number
  categoryId?: string
}

export type MenuRowInput = Partial<ModularLine> & {
  suffix?: string
  price?: string
}

export type MenuColorPayload = {
  name: string
  hex?: string
  globalColorId?: string
  priceAdd?: number
}

export type MenuQuoteLine = {
  index: number
  id?: string
  text: string
  label: string
  detail?: string
  useAccent: boolean
  moduleCount: number
  categoryId?: string
  characterCount: number
  textWidthMm: number
  globalWidthMm: number
  widthCm: number
  widthMm: number
  railModuleQuantity: number
  widthWarning: boolean
}

export type ParsedMenuText = {
  text: string
  lines: MenuQuoteLine[]
  characterCount: number
  hasUnsupportedControlCharacters: boolean
}

export type MenuQuoteInput = {
  rows?: MenuRowInput[]
  menuText?: string
  extraLettersText?: string
  customIconRequest?: string
  globalModuleCount?: number
  standardPackQuantity?: number
  avulsoCharacterQuantity?: number
  railModuleUnitPrice?: number
  standardPackUnitPrice?: number
  avulsoUnitPrice?: number
  baseLetterColor?: MenuColorPayload
  accentLetterColor?: MenuColorPayload
}

export type CharacterFrequencyByColor = {
  [colorKey: string]: {
    color: MenuColorPayload
    characters: Record<string, number>
  }
}

export type MenuQuote = {
  menuText: string
  extraLettersText: string
  customIconRequest: string
  lines: MenuQuoteLine[]
  lineCount: number
  moduleLengthCm: typeof MODULE_LENGTH_CM
  moduleLengthMm: typeof MODULE_LENGTH_MM
  rawGlobalModuleCount: number | undefined
  globalModuleCount: number
  globalWidthCm: number
  globalWidthMm: number
  charsPerModuleEstimate: typeof CHARS_PER_MODULE_ESTIMATE
  estimatedCharsPerLine: number
  productionFont: 'em3d-standard'
  productionSize: 'standard'
  starterQuantity: number
  extensionQuantityPerLine: number
  totalExtensionQuantity: number
  totalRailModules: number
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
  launchDiscountPercent: typeof LAUNCH_DISCOUNT_PERCENT
  launchDiscountAmount: number
  totalAfterDiscount: number
  hasUnsupportedControlCharacters: boolean
}

const UNSUPPORTED_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g
const DEFAULT_STANDARD_PACK_UNIT_PRICE = 35
const DEFAULT_AVULSO_UNIT_PRICE = 0.3
const BASE_COLOR_FALLBACK: MenuColorPayload = { name: 'Base' }
const ACCENT_COLOR_FALLBACK: MenuColorPayload = { name: 'Accent' }

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function hasUnsupportedControlCharacters(value: string) {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(value)
}

function clampInteger(value: number | undefined, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.trunc(Number(value))))
}

function clampModuleCount(value: number | undefined) {
  return clampInteger(value, MIN_GLOBAL_MODULES, MAX_GLOBAL_MODULES)
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function colorKey(color: MenuColorPayload | undefined, fallback: string) {
  return color?.globalColorId || color?.name?.trim().toLowerCase() || fallback
}

function addCharacter(map: Record<string, number>, character: string, count = 1) {
  map[character] = (map[character] ?? 0) + count
}

function addCharactersToColorGroup(
  groups: CharacterFrequencyByColor,
  color: MenuColorPayload,
  fallbackKey: string,
  value: string,
) {
  const key = colorKey(color, fallbackKey)
  groups[key] ??= { color, characters: {} }
  for (const character of Array.from(sanitizeMenuText(value).replace(/\n/g, ''))) {
    addCharacter(groups[key].characters, character)
  }
}

export function sanitizeMenuText(value: string, options: { allowNewlines?: boolean } = {}) {
  const withoutUnsupported = normalizeLineEndings(String(value ?? '')).replace(UNSUPPORTED_CONTROL_CHARS, '')
  if (options.allowNewlines) return withoutUnsupported
  return withoutUnsupported.replace(/\n+/g, ' ')
}

export function calculateCharacters(value: string) {
  return Array.from(sanitizeMenuText(value).replace(/\n/g, '')).length
}

export function buildCharacterFrequencyMap(value: string) {
  return Array.from(sanitizeMenuText(value).replace(/\n/g, '')).reduce<Record<string, number>>((map, character) => {
    addCharacter(map, character)
    return map
  }, {})
}

export function calculateTextWidthMm(value: string) {
  return Array.from(sanitizeMenuText(value)).reduce((sum, character) => {
    if (character === '\n') return sum
    return sum + (CHARACTER_WIDTH_MM[character] ?? FALLBACK_CHARACTER_WIDTH_MM)
  }, 0)
}

export function buildLineText(row: Pick<MenuRowInput, 'label' | 'detail' | 'suffix' | 'price'>) {
  const label = sanitizeMenuText(String(row.label ?? '')).replace(/\s+/g, ' ').trim()
  const detail = sanitizeMenuText(String(row.detail ?? [row.suffix, row.price].filter(Boolean).join(' ') ?? '')).replace(/\s+/g, ' ').trim()
  return [label, detail].filter(Boolean).join(' ')
}

export function buildMenuTextFromRows(rows: MenuRowInput[] = []) {
  return rows
    .map(row => buildLineText(row))
    .filter(Boolean)
    .join('\n')
}

function isBlankRow(row: MenuRowInput) {
  return buildLineText(row).length === 0
}

function normalizeRow(row: MenuRowInput, index: number): ModularLine {
  const label = sanitizeMenuText(String(row.label ?? '')).replace(/\s+/g, ' ').trim()
  const detailSource = row.detail ?? [row.suffix, row.price].map(value => String(value ?? '').trim()).filter(Boolean).join(' ')
  const detail = sanitizeMenuText(String(detailSource ?? '')).replace(/\s+/g, ' ').trim()
  return {
    id: String(row.id ?? `line-${index + 1}`),
    label,
    ...(detail ? { detail } : {}),
    useAccent: Boolean(row.useAccent),
    moduleCount: Number.isFinite(Number(row.moduleCount)) ? clampModuleCount(Number(row.moduleCount)) : undefined,
    categoryId: row.categoryId,
  }
}

export function calculateWidthWarning(textWidthMm: number, globalWidthMm: number) {
  return textWidthMm > globalWidthMm
}

function quoteLineFromRow(row: ModularLine, rawIndex: number, globalWidthMm: number): MenuQuoteLine {
  const text = buildLineText(row)
  const textWidthMm = calculateTextWidthMm(text)
  const moduleCount = clampModuleCount(row.moduleCount ?? globalWidthMm / MODULE_LENGTH_MM)
  const widthMm = moduleCount * MODULE_LENGTH_MM
  return {
    index: rawIndex + 1,
    id: row.id,
    text,
    label: row.label,
    detail: row.detail,
    useAccent: Boolean(row.useAccent),
    moduleCount,
    categoryId: row.categoryId,
    characterCount: calculateCharacters(text),
    textWidthMm,
    globalWidthMm: widthMm,
    widthCm: widthMm / 10,
    widthMm,
    railModuleQuantity: moduleCount,
    widthWarning: calculateWidthWarning(textWidthMm, widthMm),
  }
}

export function parseMenuText(menuTextInput: string, globalModuleCount = MIN_GLOBAL_MODULES): ParsedMenuText {
  const rawText = normalizeLineEndings(String(menuTextInput ?? ''))
  const text = sanitizeMenuText(rawText, { allowNewlines: true })
  const globalWidthMm = clampInteger(globalModuleCount, MIN_GLOBAL_MODULES, MAX_GLOBAL_MODULES) * MODULE_LENGTH_MM
  const lines = text
    .split('\n')
    .map((line, rawIndex) => ({ rawIndex, text: sanitizeMenuText(line).replace(/\s+/g, ' ').trim() }))
    .filter(line => line.text.length > 0)
    .map(line => quoteLineFromRow({ id: `line-${line.rawIndex + 1}`, label: line.text, useAccent: false }, line.rawIndex, globalWidthMm))
  const characterCount = lines.reduce((sum, line) => sum + line.characterCount, 0)

  return {
    text: lines.map(line => line.text).join('\n'),
    lines,
    characterCount,
    hasUnsupportedControlCharacters: hasUnsupportedControlCharacters(rawText),
  }
}

function parseMenuRows(rows: MenuRowInput[] = [], globalModuleCount = MIN_GLOBAL_MODULES): ParsedMenuText {
  const globalWidthMm = clampInteger(globalModuleCount, MIN_GLOBAL_MODULES, MAX_GLOBAL_MODULES) * MODULE_LENGTH_MM
  const normalizedRows = rows.map(normalizeRow)
  const lines = normalizedRows
    .map((row, rawIndex) => ({ row, rawIndex }))
    .filter(({ row }) => !isBlankRow(row))
    .map(({ row, rawIndex }) => quoteLineFromRow(row, rawIndex, globalWidthMm))
  const text = lines.map(line => line.text).join('\n')
  const characterCount = lines.reduce((sum, line) => sum + line.characterCount, 0)
  const rawText = rows.map(row => [row.label, row.detail, row.suffix, row.price].map(value => String(value ?? '')).join(' ')).join('\n')

  return {
    text,
    lines,
    characterCount,
    hasUnsupportedControlCharacters: hasUnsupportedControlCharacters(rawText),
  }
}

export function buildCharacterFrequencyByColor({
  lines,
  extraLettersText = '',
  baseLetterColor = BASE_COLOR_FALLBACK,
  accentLetterColor = ACCENT_COLOR_FALLBACK,
}: {
  lines: MenuQuoteLine[]
  extraLettersText?: string
  baseLetterColor?: MenuColorPayload
  accentLetterColor?: MenuColorPayload
}) {
  const groups: CharacterFrequencyByColor = {}

  for (const line of lines) {
    addCharactersToColorGroup(groups, baseLetterColor, 'base', line.label)
    if (!line.detail) continue
    const detailColor = line.useAccent ? accentLetterColor : baseLetterColor
    addCharactersToColorGroup(groups, detailColor, line.useAccent ? 'accent' : 'base', ` ${line.detail}`)
  }

  if (extraLettersText) {
    addCharactersToColorGroup(groups, baseLetterColor, 'base', extraLettersText)
  }

  return groups
}

function calculateDeficitMap(characterFrequencyMap: Record<string, number>, packCount: number) {
  const deficits: Record<string, number> = {}

  for (const [character, needed] of Object.entries(characterFrequencyMap)) {
    const covered = (STANDARD_PACK_DISTRIBUTION[character] ?? 0) * packCount
    const deficit = Math.max(needed - covered, 0)
    if (deficit > 0) deficits[character] = deficit
  }

  return deficits
}

function countCharacters(map: Record<string, number>) {
  return Object.values(map).reduce((sum, count) => sum + count, 0)
}

export function calculateLetterPacks(
  characterFrequencyMapOrTotal: Record<string, number> | number,
  selectedStandardPacks?: number,
  selectedAvulsoCharacters?: number,
  standardPackUnitPrice = DEFAULT_STANDARD_PACK_UNIT_PRICE,
  avulsoUnitPrice = DEFAULT_AVULSO_UNIT_PRICE,
) {
  const characterFrequencyMap = typeof characterFrequencyMapOrTotal === 'number'
    ? { '*': Math.max(0, Math.trunc(characterFrequencyMapOrTotal)) }
    : characterFrequencyMapOrTotal
  const safeStandardPrice = Number.isFinite(standardPackUnitPrice) ? Math.max(0, Number(standardPackUnitPrice)) : DEFAULT_STANDARD_PACK_UNIT_PRICE
  const safeAvulsoPrice = Number.isFinite(avulsoUnitPrice) ? Math.max(0, Number(avulsoUnitPrice)) : DEFAULT_AVULSO_UNIT_PRICE
  const supportedNeeds = Object.entries(characterFrequencyMap)
    .filter(([character]) => (STANDARD_PACK_DISTRIBUTION[character] ?? 0) > 0)
    .map(([character, count]) => Math.ceil(count / Math.max(STANDARD_PACK_DISTRIBUTION[character] ?? 1, 1)))
  const maxUsefulPackCount = Math.max(0, ...supportedNeeds)

  let best = {
    packCount: 0,
    deficitMap: calculateDeficitMap(characterFrequencyMap, 0),
    deficitCount: countCharacters(characterFrequencyMap),
    totalLetterCost: roundMoney(countCharacters(characterFrequencyMap) * safeAvulsoPrice),
  }

  for (let packCount = 0; packCount <= maxUsefulPackCount; packCount += 1) {
    const deficitMap = calculateDeficitMap(characterFrequencyMap, packCount)
    const deficitCount = countCharacters(deficitMap)
    const totalLetterCost = roundMoney((packCount * safeStandardPrice) + (deficitCount * safeAvulsoPrice))
    const isCheaper = totalLetterCost < best.totalLetterCost
    const isSameCostSimpler = totalLetterCost === best.totalLetterCost && deficitCount < best.deficitCount

    if (isCheaper || isSameCostSimpler) {
      best = { packCount, deficitMap, deficitCount, totalLetterCost }
    }
  }

  const standardPackMinimum = best.packCount
  const avulsoMinimum = best.deficitCount
  const standardPackQuantity = Number.isFinite(Number(selectedStandardPacks))
    ? Math.trunc(Number(selectedStandardPacks))
    : standardPackMinimum
  const avulsoCharacterQuantity = Number.isFinite(Number(selectedAvulsoCharacters))
    ? Math.trunc(Number(selectedAvulsoCharacters))
    : avulsoMinimum

  return {
    standardPackMinimum,
    standardPackQuantity,
    avulsoMinimum,
    avulsoCharacterQuantity,
    avulsoDeficitMap: best.deficitMap,
  }
}

export function calculateMenuBoardModules(lineCount: number, globalModuleCountInput = MIN_GLOBAL_MODULES) {
  const rawGlobalModuleCount = Number(globalModuleCountInput)
  const globalModuleCount = clampInteger(globalModuleCountInput, MIN_GLOBAL_MODULES, MAX_GLOBAL_MODULES)
  const extensionQuantityPerLine = Math.max(globalModuleCount - 1, 0)
  const starterQuantity = lineCount
  const totalExtensionQuantity = lineCount * extensionQuantityPerLine
  const totalRailModules = lineCount * globalModuleCount

  return {
    moduleLengthCm: MODULE_LENGTH_CM as typeof MODULE_LENGTH_CM,
    moduleLengthMm: MODULE_LENGTH_MM as typeof MODULE_LENGTH_MM,
    rawGlobalModuleCount: Number.isFinite(rawGlobalModuleCount) ? rawGlobalModuleCount : undefined,
    globalModuleCount,
    globalWidthCm: globalModuleCount * MODULE_LENGTH_CM,
    globalWidthMm: globalModuleCount * MODULE_LENGTH_MM,
    charsPerModuleEstimate: CHARS_PER_MODULE_ESTIMATE as typeof CHARS_PER_MODULE_ESTIMATE,
    estimatedCharsPerLine: globalModuleCount * CHARS_PER_MODULE_ESTIMATE,
    starterQuantity,
    extensionQuantityPerLine,
    totalExtensionQuantity,
    totalRailModules,
  }
}

export function calculateMenuBoardModulesFromLines(lines: Pick<MenuQuoteLine, 'moduleCount'>[], globalModuleCountInput = MIN_GLOBAL_MODULES) {
  const rawGlobalModuleCount = Number(globalModuleCountInput)
  const maxLineModuleCount = Math.max(MIN_GLOBAL_MODULES, ...lines.map(line => clampModuleCount(line.moduleCount)))
  const globalModuleCount = lines.length ? maxLineModuleCount : clampModuleCount(globalModuleCountInput)
  const starterQuantity = lines.length
  const totalExtensionQuantity = lines.reduce((sum, line) => sum + Math.max(clampModuleCount(line.moduleCount) - 1, 0), 0)
  const totalRailModules = lines.reduce((sum, line) => sum + clampModuleCount(line.moduleCount), 0)

  return {
    moduleLengthCm: MODULE_LENGTH_CM as typeof MODULE_LENGTH_CM,
    moduleLengthMm: MODULE_LENGTH_MM as typeof MODULE_LENGTH_MM,
    rawGlobalModuleCount: Number.isFinite(rawGlobalModuleCount) ? rawGlobalModuleCount : undefined,
    globalModuleCount,
    globalWidthCm: globalModuleCount * MODULE_LENGTH_CM,
    globalWidthMm: globalModuleCount * MODULE_LENGTH_MM,
    charsPerModuleEstimate: CHARS_PER_MODULE_ESTIMATE as typeof CHARS_PER_MODULE_ESTIMATE,
    estimatedCharsPerLine: globalModuleCount * CHARS_PER_MODULE_ESTIMATE,
    starterQuantity,
    extensionQuantityPerLine: Math.max(globalModuleCount - 1, 0),
    totalExtensionQuantity,
    totalRailModules,
  }
}

export function calculateMenuOrderPricing({
  totalRailModules,
  standardPackQuantity,
  avulsoCharacterQuantity,
  railModuleUnitPrice = 0,
  standardPackUnitPrice = 0,
  avulsoUnitPrice = 0,
}: {
  totalRailModules: number
  standardPackQuantity: number
  avulsoCharacterQuantity: number
  railModuleUnitPrice?: number
  standardPackUnitPrice?: number
  avulsoUnitPrice?: number
}) {
  const modulesSubtotal = roundMoney(totalRailModules * railModuleUnitPrice)
  const standardPacksSubtotal = roundMoney(standardPackQuantity * standardPackUnitPrice)
  const avulsoSubtotal = roundMoney(avulsoCharacterQuantity * avulsoUnitPrice)
  const subtotalBeforeDiscount = roundMoney(modulesSubtotal + standardPacksSubtotal + avulsoSubtotal)
  const launchDiscountAmount = roundMoney(subtotalBeforeDiscount * (LAUNCH_DISCOUNT_PERCENT / 100))
  const totalAfterDiscount = roundMoney(subtotalBeforeDiscount - launchDiscountAmount)

  return {
    railModuleUnitPrice,
    standardPackUnitPrice,
    avulsoUnitPrice,
    modulesSubtotal,
    standardPacksSubtotal,
    avulsoSubtotal,
    subtotalBeforeDiscount,
    launchDiscountPercent: LAUNCH_DISCOUNT_PERCENT as typeof LAUNCH_DISCOUNT_PERCENT,
    launchDiscountAmount,
    totalAfterDiscount,
  }
}

export function calculateMenuQuote(input: MenuQuoteInput): MenuQuote {
  const modules = calculateMenuBoardModules(0, input.globalModuleCount)
  const parsedMenu = input.rows
    ? parseMenuRows(input.rows.filter(row => !isBlankRow(row)), modules.globalModuleCount)
    : parseMenuText(sanitizeMenuText(String(input.menuText ?? ''), { allowNewlines: true }), modules.globalModuleCount)
  const rawExtraLettersText = normalizeLineEndings(String(input.extraLettersText ?? ''))
  const rawCustomIconRequest = normalizeLineEndings(String(input.customIconRequest ?? ''))
  const extraLettersText = sanitizeMenuText(rawExtraLettersText)
  const customIconRequest = sanitizeMenuText(rawCustomIconRequest)
  const lineCount = parsedMenu.lines.length
  const boardModules = calculateMenuBoardModulesFromLines(parsedMenu.lines, input.globalModuleCount)
  const lines = parsedMenu.lines.map(line => ({
    ...line,
    globalWidthMm: line.widthMm,
    widthWarning: calculateWidthWarning(line.textWidthMm, line.widthMm),
  }))
  const menuCharacters = lines.reduce((sum, line) => sum + line.characterCount, 0)
  const extraCharacters = calculateCharacters(extraLettersText)
  const characterFrequencyByColor = buildCharacterFrequencyByColor({
    lines,
    extraLettersText,
    baseLetterColor: input.baseLetterColor ?? BASE_COLOR_FALLBACK,
    accentLetterColor: input.accentLetterColor ?? ACCENT_COLOR_FALLBACK,
  })
  const characterFrequencyMap = Object.values(characterFrequencyByColor).reduce<Record<string, number>>((map, group) => {
    for (const [character, count] of Object.entries(group.characters)) {
      addCharacter(map, character, count)
    }
    return map
  }, {})
  const totalCharacters = countCharacters(characterFrequencyMap)
  const letterPacks = calculateLetterPacks(
    characterFrequencyMap,
    input.standardPackQuantity,
    input.avulsoCharacterQuantity,
    input.standardPackUnitPrice,
    input.avulsoUnitPrice,
  )
  const pricing = calculateMenuOrderPricing({
    totalRailModules: boardModules.totalRailModules,
    standardPackQuantity: letterPacks.standardPackQuantity,
    avulsoCharacterQuantity: letterPacks.avulsoCharacterQuantity,
    railModuleUnitPrice: input.railModuleUnitPrice,
    standardPackUnitPrice: input.standardPackUnitPrice,
    avulsoUnitPrice: input.avulsoUnitPrice,
  })

  return {
    menuText: parsedMenu.text,
    extraLettersText,
    customIconRequest,
    lines,
    lineCount,
    ...boardModules,
    productionFont: 'em3d-standard',
    productionSize: 'standard',
    menuCharacters,
    extraCharacters,
    totalCharacters,
    characterFrequencyMap,
    characterFrequencyByColor,
    ...letterPacks,
    ...pricing,
    hasUnsupportedControlCharacters:
      parsedMenu.hasUnsupportedControlCharacters ||
      hasUnsupportedControlCharacters(rawExtraLettersText) ||
      hasUnsupportedControlCharacters(rawCustomIconRequest),
  }
}

export function validateMenuQuoteLimits(quote: MenuQuote) {
  const errors: string[] = []
  const rawGlobalModuleCount = quote.rawGlobalModuleCount

  if (quote.menuCharacters < 1) errors.push('Indique pelo menos uma linha.')
  if (quote.menuCharacters > MENU_TEXT_MAX_CHARS) errors.push(`O conteúdo pode ter no máximo ${MENU_TEXT_MAX_CHARS} caracteres visíveis.`)
  if (quote.extraCharacters > MENU_EXTRA_MAX_CHARS) errors.push(`As letras extra podem ter no máximo ${MENU_EXTRA_MAX_CHARS} caracteres visíveis.`)
  if (calculateCharacters(quote.customIconRequest) > MENU_CUSTOM_ICON_MAX_CHARS) errors.push(`O pedido de ícone/logótipo pode ter no máximo ${MENU_CUSTOM_ICON_MAX_CHARS} caracteres visíveis.`)
  if (quote.lines.length > MENU_MAX_LINES) errors.push(`O sistema pode ter no máximo ${MENU_MAX_LINES} linhas preenchidas.`)
  if (rawGlobalModuleCount === undefined || !Number.isInteger(rawGlobalModuleCount) || rawGlobalModuleCount < MIN_GLOBAL_MODULES || rawGlobalModuleCount > MAX_GLOBAL_MODULES) errors.push(`A largura deve ter entre ${MIN_GLOBAL_MODULES} e ${MAX_GLOBAL_MODULES} módulos.`)
  if (quote.standardPackQuantity < quote.standardPackMinimum) errors.push('A quantidade de packs standard não pode ser inferior ao mínimo calculado.')
  if (quote.avulsoCharacterQuantity < quote.avulsoMinimum) errors.push('A quantidade de letras avulso não pode ser inferior ao mínimo calculado.')
  if (quote.hasUnsupportedControlCharacters) errors.push('O texto contém caracteres de controlo não suportados.')

  return errors
}
