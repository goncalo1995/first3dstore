export const MODULE_LENGTH_CM = 25
export const CHARS_PER_MODULE_ESTIMATE = 5
export const MIN_GLOBAL_MODULES = 1
export const MAX_GLOBAL_MODULES = 12
export const STANDARD_PACK_SIZE = 300
export const LAUNCH_DISCOUNT_PERCENT = 20
export const MENU_TEXT_MAX_CHARS = 5000
export const MENU_EXTRA_MAX_CHARS = 500
export const MENU_CUSTOM_ICON_MAX_CHARS = 500
export const MENU_LETTER_COLOR_REQUEST_MAX_CHARS = 300
export const MENU_MAX_LINES = 100

export const MENU_RAIL_LENGTH_CM = MODULE_LENGTH_CM
export const MENU_PACK_SIZE = STANDARD_PACK_SIZE

export type MenuRowInput = {
  label?: string
  suffix?: string
  price?: string
}

export type MenuQuoteLine = {
  index: number
  text: string
  label: string
  suffix?: string
  price: string
  characterCount: number
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
}

export type MenuQuote = {
  menuText: string
  extraLettersText: string
  customIconRequest: string
  lines: MenuQuoteLine[]
  lineCount: number
  moduleLengthCm: typeof MODULE_LENGTH_CM
  globalModuleCount: number
  globalWidthCm: number
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
  standardPackMinimum: number
  standardPackQuantity: number
  avulsoMinimum: number
  avulsoCharacterQuantity: number
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

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
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
    map[character] = (map[character] ?? 0) + 1
    return map
  }, {})
}

export function buildMenuTextFromRows(rows: MenuRowInput[] = []) {
  return rows
    .map(row => [row.label, row.suffix, row.price].map(value => String(value ?? '').trim()).filter(Boolean).join(' '))
    .filter(Boolean)
    .join('\n')
}

function splitLineParts(text: string): { label: string; suffix?: string; price: string } {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  const match = cleaned.match(/^(.*?)(\d+(?:[,.]\d{1,2})?\s*€?|desde\s+\d+(?:[,.]\d{1,2})?\s*€?|sob\s+consulta|sob\s+marcação|sob\s+marcacao|\-\d+%|\+\d+(?:[,.]\d{1,2})?\s*€?)$/i)
  if (!match) return { label: cleaned, price: '' }

  return {
    label: match[1].replace(/[-:]+$/g, '').replace(/\s+/g, ' ').trim(),
    price: match[2].replace('.', ',').replace(/\s*€$/, '€').trim(),
  }
}

export function calculateWidthWarning(characterCount: number, estimatedCharsPerLine: number) {
  return characterCount > estimatedCharsPerLine
}

export function parseMenuText(menuTextInput: string, globalModuleCount = MIN_GLOBAL_MODULES): ParsedMenuText {
  const rawText = normalizeLineEndings(String(menuTextInput ?? ''))
  const text = sanitizeMenuText(rawText, { allowNewlines: true })
  const estimatedCharsPerLine = clampInteger(globalModuleCount, MIN_GLOBAL_MODULES, MAX_GLOBAL_MODULES) * CHARS_PER_MODULE_ESTIMATE
  const lines = text
    .split('\n')
    .map((line, rawIndex) => ({ rawIndex, text: line.trim() }))
    .filter(line => line.text.length > 0)
    .map(line => {
      const parts = splitLineParts(line.text)
      const characterCount = calculateCharacters(line.text)

      return {
        index: line.rawIndex + 1,
        text: line.text,
        label: parts.label,
        suffix: parts.suffix,
        price: parts.price,
        characterCount,
        widthWarning: calculateWidthWarning(characterCount, estimatedCharsPerLine),
      }
    })
  const characterCount = lines.reduce((sum, line) => sum + line.characterCount, 0)

  return {
    text,
    lines,
    characterCount,
    hasUnsupportedControlCharacters: hasUnsupportedControlCharacters(rawText),
  }
}

export function calculateLetterPacks(totalCharacters: number, selectedStandardPacks?: number, selectedAvulsoCharacters?: number) {
  const safeTotal = Math.max(0, Math.trunc(totalCharacters))
  const standardPackMinimum = Math.floor(safeTotal / STANDARD_PACK_SIZE)
  const avulsoMinimum = safeTotal % STANDARD_PACK_SIZE
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
  }
}

export function calculateMenuBoardModules(lineCount: number, globalModuleCountInput = MIN_GLOBAL_MODULES) {
  const globalModuleCount = clampInteger(globalModuleCountInput, MIN_GLOBAL_MODULES, MAX_GLOBAL_MODULES)
  const extensionQuantityPerLine = Math.max(globalModuleCount - 1, 0)
  const starterQuantity = lineCount
  const totalExtensionQuantity = lineCount * extensionQuantityPerLine
  const totalRailModules = lineCount * globalModuleCount

  return {
    moduleLengthCm: MODULE_LENGTH_CM as typeof MODULE_LENGTH_CM,
    globalModuleCount,
    globalWidthCm: globalModuleCount * MODULE_LENGTH_CM,
    charsPerModuleEstimate: CHARS_PER_MODULE_ESTIMATE as typeof CHARS_PER_MODULE_ESTIMATE,
    estimatedCharsPerLine: globalModuleCount * CHARS_PER_MODULE_ESTIMATE,
    starterQuantity,
    extensionQuantityPerLine,
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
  const menuText = input.rows ? buildMenuTextFromRows(input.rows) : sanitizeMenuText(String(input.menuText ?? ''), { allowNewlines: true })
  const modules = calculateMenuBoardModules(0, input.globalModuleCount)
  const parsedMenu = parseMenuText(menuText, modules.globalModuleCount)
  const rawExtraLettersText = normalizeLineEndings(String(input.extraLettersText ?? ''))
  const rawCustomIconRequest = normalizeLineEndings(String(input.customIconRequest ?? ''))
  const extraLettersText = sanitizeMenuText(rawExtraLettersText)
  const customIconRequest = sanitizeMenuText(rawCustomIconRequest)
  const lineCount = parsedMenu.lines.length
  const boardModules = calculateMenuBoardModules(lineCount, input.globalModuleCount)
  const menuCharacters = parsedMenu.lines.reduce((sum, line) => sum + line.characterCount, 0)
  const extraCharacters = calculateCharacters(extraLettersText)
  const totalCharacters = menuCharacters + extraCharacters
  const letterPacks = calculateLetterPacks(totalCharacters, input.standardPackQuantity, input.avulsoCharacterQuantity)
  const pricing = calculateMenuOrderPricing({
    totalRailModules: boardModules.totalRailModules,
    standardPackQuantity: letterPacks.standardPackQuantity,
    avulsoCharacterQuantity: letterPacks.avulsoCharacterQuantity,
    railModuleUnitPrice: input.railModuleUnitPrice,
    standardPackUnitPrice: input.standardPackUnitPrice,
    avulsoUnitPrice: input.avulsoUnitPrice,
  })
  const characterSource = [parsedMenu.text, extraLettersText].filter(Boolean).join('')

  return {
    menuText: parsedMenu.text,
    extraLettersText,
    customIconRequest,
    lines: parsedMenu.lines.map(line => ({
      ...line,
      widthWarning: calculateWidthWarning(line.characterCount, boardModules.estimatedCharsPerLine),
    })),
    lineCount,
    ...boardModules,
    productionFont: 'em3d-standard',
    productionSize: 'standard',
    menuCharacters,
    extraCharacters,
    totalCharacters,
    characterFrequencyMap: buildCharacterFrequencyMap(characterSource),
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

  if (quote.menuCharacters < 1) errors.push('Indique pelo menos uma linha de menu.')
  if (quote.menuCharacters > MENU_TEXT_MAX_CHARS) errors.push(`O menu pode ter no máximo ${MENU_TEXT_MAX_CHARS} caracteres visíveis.`)
  if (quote.extraCharacters > MENU_EXTRA_MAX_CHARS) errors.push(`As letras extra podem ter no máximo ${MENU_EXTRA_MAX_CHARS} caracteres visíveis.`)
  if (calculateCharacters(quote.customIconRequest) > MENU_CUSTOM_ICON_MAX_CHARS) errors.push(`O pedido de ícone/logótipo pode ter no máximo ${MENU_CUSTOM_ICON_MAX_CHARS} caracteres visíveis.`)
  if (quote.lines.length > MENU_MAX_LINES) errors.push(`O menu pode ter no máximo ${MENU_MAX_LINES} linhas preenchidas.`)
  if (quote.globalModuleCount < MIN_GLOBAL_MODULES || quote.globalModuleCount > MAX_GLOBAL_MODULES) errors.push(`A largura deve ter entre ${MIN_GLOBAL_MODULES} e ${MAX_GLOBAL_MODULES} módulos.`)
  if (quote.standardPackQuantity < quote.standardPackMinimum) errors.push('A quantidade de packs standard não pode ser inferior ao mínimo calculado.')
  if (quote.avulsoCharacterQuantity < quote.avulsoMinimum) errors.push('A quantidade de letras avulso não pode ser inferior ao mínimo calculado.')
  if (quote.hasUnsupportedControlCharacters) errors.push('O texto contém caracteres de controlo não suportados.')

  return errors
}
