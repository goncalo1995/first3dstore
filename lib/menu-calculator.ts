export const MENU_RAIL_LENGTH_CM = 25
export const MENU_PACK_SIZE = 300
export const MENU_TEXT_MAX_CHARS = 5000
export const MENU_EXTRA_MAX_CHARS = 500
export const MENU_MAX_LINES = 100
export const MENU_MIN_RAILS_PER_LINE = 1
export const MENU_MAX_RAILS_PER_LINE = 10

export type MenuQuoteLine = {
  index: number
  text: string
  characterCount: number
  railQuantity: number
}

export type ParsedMenuText = {
  text: string
  lines: MenuQuoteLine[]
  characterCount: number
  hasUnsupportedControlCharacters: boolean
}

export type MenuQuote = {
  menuText: string
  extraLettersText: string
  lines: MenuQuoteLine[]
  menuCharacters: number
  extraCharacters: number
  totalCharacters: number
  totalRails: number
  standardPackQuantity: number
  avulsoCharacterQuantity: number
  remainingCharacters: number
  packSize: number
  railLengthCm: number
  totalRailLengthCm: number
  characterFrequencyMap: Record<string, number>
  hasUnsupportedControlCharacters: boolean
}

export type MenuQuoteInput = {
  menuText: string
  extraLettersText?: string
  lineRailQuantities?: Record<number, number>
}

const UNSUPPORTED_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function hasUnsupportedControlCharacters(value: string) {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(value)
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

export function calculateRailQuantity(value: number | undefined) {
  return clamp(value ?? MENU_MIN_RAILS_PER_LINE, MENU_MIN_RAILS_PER_LINE, MENU_MAX_RAILS_PER_LINE)
}

export function calculatePacksAndAvulso(totalCharacters: number, packSize = MENU_PACK_SIZE) {
  const safeTotal = Math.max(0, Math.trunc(totalCharacters))
  const safePackSize = Math.max(1, Math.trunc(packSize))
  const standardPackQuantity = Math.floor(safeTotal / safePackSize)
  const avulsoCharacterQuantity = safeTotal % safePackSize

  return {
    standardPackQuantity,
    avulsoCharacterQuantity,
    remainingCharacters: avulsoCharacterQuantity === 0 ? 0 : safePackSize - avulsoCharacterQuantity,
  }
}

export function parseMenuText(menuTextInput: string, lineRailQuantities: Record<number, number> = {}): ParsedMenuText {
  const rawText = normalizeLineEndings(String(menuTextInput ?? ''))
  const text = sanitizeMenuText(rawText, { allowNewlines: true })
  const rawLines = text.split('\n')
  const lines = rawLines
    .map((line, rawIndex) => ({
      index: rawIndex + 1,
      text: line,
      characterCount: calculateCharacters(line),
      railQuantity: calculateRailQuantity(lineRailQuantities[rawIndex + 1]),
    }))
    .filter(line => line.text.trim().length > 0)
  const characterCount = lines.reduce((sum, line) => sum + line.characterCount, 0)

  return {
    text,
    lines,
    characterCount,
    hasUnsupportedControlCharacters: hasUnsupportedControlCharacters(rawText),
  }
}

export function calculateMenuQuote(input: MenuQuoteInput): MenuQuote {
  const parsedMenu = parseMenuText(input.menuText, input.lineRailQuantities ?? {})
  const rawExtraLettersText = normalizeLineEndings(String(input.extraLettersText ?? ''))
  const extraLettersText = sanitizeMenuText(rawExtraLettersText)
  const lines = parsedMenu.lines
  const menuCharacters = lines.reduce((sum, line) => sum + line.characterCount, 0)
  const extraCharacters = calculateCharacters(extraLettersText)
  const totalCharacters = menuCharacters + extraCharacters
  const totalRails = lines.reduce((sum, line) => sum + line.railQuantity, 0)
  const packQuote = calculatePacksAndAvulso(totalCharacters)
  const characterSource = `${parsedMenu.text}\n${extraLettersText}`

  return {
    menuText: parsedMenu.text,
    extraLettersText,
    lines,
    menuCharacters,
    extraCharacters,
    totalCharacters,
    totalRails,
    ...packQuote,
    packSize: MENU_PACK_SIZE,
    railLengthCm: MENU_RAIL_LENGTH_CM,
    totalRailLengthCm: totalRails * MENU_RAIL_LENGTH_CM,
    characterFrequencyMap: buildCharacterFrequencyMap(characterSource),
    hasUnsupportedControlCharacters: parsedMenu.hasUnsupportedControlCharacters || hasUnsupportedControlCharacters(rawExtraLettersText),
  }
}

export function validateMenuQuoteLimits(quote: MenuQuote) {
  const errors: string[] = []

  if (quote.menuCharacters < 1) errors.push('Indique pelo menos uma linha de menu.')
  if (quote.menuCharacters > MENU_TEXT_MAX_CHARS) errors.push(`O menu pode ter no máximo ${MENU_TEXT_MAX_CHARS} caracteres visíveis.`)
  if (quote.extraCharacters > MENU_EXTRA_MAX_CHARS) errors.push(`As letras extra podem ter no máximo ${MENU_EXTRA_MAX_CHARS} caracteres visíveis.`)
  if (quote.lines.length > MENU_MAX_LINES) errors.push(`O menu pode ter no máximo ${MENU_MAX_LINES} linhas preenchidas.`)
  if (quote.hasUnsupportedControlCharacters) errors.push('O texto contém caracteres de controlo não suportados.')

  for (const line of quote.lines) {
    if (line.railQuantity < MENU_MIN_RAILS_PER_LINE || line.railQuantity > MENU_MAX_RAILS_PER_LINE) {
      errors.push(`A linha ${line.index} deve ter entre ${MENU_MIN_RAILS_PER_LINE} e ${MENU_MAX_RAILS_PER_LINE} calhas.`)
    }
  }

  return errors
}
