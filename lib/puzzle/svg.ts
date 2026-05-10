const printableTags = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'text', 'line'])
const namedColors: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  gray: '#808080',
  grey: '#808080',
  brown: '#a52a2a',
}

type SvgColorResult = string | null | undefined

export type SvgAnalysis = {
  ok: boolean
  errors: string[]
  warnings: string[]
  colors: string[]
  sanitizedSvg: string
  viewBox: string
  width?: number
  height?: number
}

function parseDimension(value?: string | null) {
  if (!value) return undefined
  const match = value.trim().match(/^([0-9]*\.?[0-9]+)/)
  if (!match) return undefined
  const parsed = Number(match[1])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function getAttr(attrs: string, name: string) {
  const match = attrs.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']+)["']`, 'i'))
  return match?.[1]
}

function stripAttr(attrs: string, name: string) {
  return attrs.replace(new RegExp(`\\s${name}\\s*=\\s*["'][^"']*["']`, 'gi'), '')
}

function normalizeHex(value: string) {
  const trimmed = value.trim().toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
  }
  if (/^#[0-9a-f]{6}$/.test(trimmed)) return trimmed
  return undefined
}

export function normalizeSvgColor(value?: string | null): SvgColorResult {
  if (value === undefined) return undefined
  if (value === null) return undefined

  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'currentcolor') return '#000000'

  const lower = trimmed.toLowerCase()
  if (lower === 'none' || lower === 'transparent') return null
  if (lower.startsWith('url(')) return null

  const hex = normalizeHex(trimmed)
  if (hex) return hex

  const rgb = lower.match(/^rgba?\((\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/)
  if (rgb) {
    const [r, g, b] = rgb.slice(1, 4).map((part) => Math.max(0, Math.min(255, Number(part))))
    return `#${[r, g, b].map((part) => part.toString(16).padStart(2, '0')).join('')}`
  }

  return namedColors[lower]
}

function collectStyleColor(style: string, prop: 'fill' | 'stroke') {
  const match = style.match(new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'i'))
  return normalizeSvgColor(match?.[1])
}

function replaceStyleColor(style: string, prop: 'fill' | 'stroke', color: string) {
  const expression = new RegExp(`(${prop}\\s*:\\s*)([^;]+)`, 'i')
  if (expression.test(style)) return style.replace(expression, `$1${color}`)
  return `${style.replace(/;?\s*$/, '')}; ${prop}: ${color}`
}

function mappedColor(color: SvgColorResult, mappings?: Record<string, string>) {
  if (!color) return color
  return mappings?.[color] || color
}

function collectColorsFromTag(attrs: string, tagName: string, colorSet: Set<string>) {
  const fill = normalizeSvgColor(getAttr(attrs, 'fill'))
  const stroke = normalizeSvgColor(getAttr(attrs, 'stroke'))
  const style = getAttr(attrs, 'style') || ''
  const styleFill = collectStyleColor(style, 'fill')
  const styleStroke = collectStyleColor(style, 'stroke')

  for (const color of [fill, stroke, styleFill, styleStroke]) {
    if (color) colorSet.add(color)
  }

  if (printableTags.has(tagName) && fill === undefined && styleFill === undefined && tagName !== 'line') {
    colorSet.add('#000000')
  }
}

function mapTagColors(attrs: string, tagName: string, mappings?: Record<string, string>) {
  let nextAttrs = attrs
  const style = getAttr(nextAttrs, 'style')
  const fill = normalizeSvgColor(getAttr(nextAttrs, 'fill'))
  const stroke = normalizeSvgColor(getAttr(nextAttrs, 'stroke'))

  if (fill) {
    const nextColor = mappedColor(fill, mappings) || fill
    if (getAttr(nextAttrs, 'fill')) {
      nextAttrs = nextAttrs.replace(/\sfill\s*=\s*["'][^"']*["']/i, ` fill="${nextColor}"`)
    }
  }

  if (stroke) {
    const nextColor = mappedColor(stroke, mappings) || stroke
    if (getAttr(nextAttrs, 'stroke')) {
      nextAttrs = nextAttrs.replace(/\sstroke\s*=\s*["'][^"']*["']/i, ` stroke="${nextColor}"`)
    }
  }

  if (style) {
    let nextStyle = style
    const styleFill = collectStyleColor(style, 'fill')
    const styleStroke = collectStyleColor(style, 'stroke')
    if (styleFill) nextStyle = replaceStyleColor(nextStyle, 'fill', mappedColor(styleFill, mappings) || styleFill)
    if (styleStroke) nextStyle = replaceStyleColor(nextStyle, 'stroke', mappedColor(styleStroke, mappings) || styleStroke)
    nextAttrs = nextAttrs.replace(/\sstyle\s*=\s*["'][^"']*["']/i, ` style="${nextStyle}"`)
  }

  if (printableTags.has(tagName) && fill === undefined && !collectStyleColor(style || '', 'fill') && tagName !== 'line') {
    nextAttrs += ` fill="${mappedColor('#000000', mappings) || '#000000'}"`
  }

  return nextAttrs
}

export function sanitizeSvg(input: string, mappings?: Record<string, string>): SvgAnalysis {
  const errors: string[] = []
  const warnings: string[] = []
  const source = input
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!doctype[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()

  if (!/<svg[\s>]/i.test(source)) errors.push('O ficheiro não parece ser um SVG válido.')
  if (/<script[\s>]/i.test(source)) errors.push('Remova scripts do SVG.')
  if (/<foreignObject[\s>]/i.test(source)) errors.push('Remova foreignObject do SVG.')
  if (/<image[\s>]/i.test(source)) errors.push('Use vetores puros; imagens raster embebidas não são suportadas.')
  if (/\son[a-z]+\s*=/i.test(source)) errors.push('Remova handlers JavaScript do SVG.')
  if (/\s(?:href|xlink:href)\s*=\s*["'](?:https?:|data:)/i.test(source)) errors.push('Remova links externos ou data URLs do SVG.')
  if (/url\(/i.test(source) || /@import/i.test(source)) errors.push('Remova referências CSS externas, gradients por URL ou imports.')

  const rootMatch = source.match(/<svg\b([^>]*)>/i)
  if (!rootMatch) {
    return { ok: false, errors, warnings, colors: [], sanitizedSvg: source, viewBox: '' }
  }

  const rootAttrs = rootMatch[1] || ''
  const originalViewBox = getAttr(rootAttrs, 'viewBox')
  const width = parseDimension(getAttr(rootAttrs, 'width'))
  const height = parseDimension(getAttr(rootAttrs, 'height'))
  const viewBox = originalViewBox || (width && height ? `0 0 ${width} ${height}` : '')

  if (!originalViewBox && width && height) {
    warnings.push('O SVG não tinha viewBox; foi inferido a partir de width/height.')
  }

  if (!viewBox) {
    errors.push('O SVG precisa de viewBox, ou width/height numéricos para inferir o frame.')
  }

  const colorSet = new Set<string>()
  source.replace(/<([a-zA-Z][\w:-]*)(\s[^<>]*?)?(\/?)>/g, (_match, tagName: string, attrs = '') => {
    const normalizedName = tagName.toLowerCase()
    if (normalizedName !== 'svg') collectColorsFromTag(attrs, normalizedName, colorSet)
    return _match
  })

  if (colorSet.size > 4) {
    errors.push(`O SVG tem ${colorSet.size} cores. Reduza ou combine para no máximo 4 cores.`)
  }

  let sanitized = source.replace(/<([a-zA-Z][\w:-]*)(\s[^<>]*?)?(\/?)>/g, (match, tagName: string, attrs = '', close = '') => {
    const normalizedName = tagName.toLowerCase()
    if (normalizedName === 'svg') return match
    const nextAttrs = mapTagColors(attrs, normalizedName, mappings)
    return `<${tagName}${nextAttrs}${close}>`
  })

  let nextRootAttrs = rootAttrs
  nextRootAttrs = stripAttr(nextRootAttrs, 'width')
  nextRootAttrs = stripAttr(nextRootAttrs, 'height')
  nextRootAttrs = stripAttr(nextRootAttrs, 'viewBox')
  nextRootAttrs = stripAttr(nextRootAttrs, 'xmlns')
  sanitized = sanitized.replace(/<svg\b[^>]*>/i, `<svg${nextRootAttrs} xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%">`)

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    colors: [...colorSet].sort(),
    sanitizedSvg: sanitized,
    viewBox,
    width,
    height,
  }
}
