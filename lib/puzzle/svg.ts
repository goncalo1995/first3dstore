import DOMPurify from 'dompurify';

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
  const match = value.trim().match(/^([0-9]*\.?[0-9]+)$/)
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

function purifySvg(input: string): string {
  // DOMPurify configuration for SVG - aggressive sanitization
  const config = {
    USE_PROFILES: { svg: true, svgFilters: true },
    ALLOWED_TAGS: [
      'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line',
      'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask',
      'pattern', 'symbol', 'use', 'text', 'tspan', 'textPath',
      'title', 'desc', 'metadata', 'filter', 'feBlend', 'feColorMatrix',
      'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
      'feDisplacementMap', 'feDistantLight', 'feFlood', 'feGaussianBlur', 'feImage',
      'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight',
      'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence', 'animate',
      'animateTransform', 'animateMotion', 'set', 'switch'
    ],
    ALLOWED_ATTR: [
      'id', 'class', 'style', 'transform', 'd', 'x', 'y', 'width', 'height',
      'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'points',
      'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
      'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'fill-opacity',
      'stroke-opacity', 'fill-rule', 'clip-rule', 'viewBox', 'preserveAspectRatio',
      'xmlns', 'xmlns:xlink', 'xlink:href', 'gradientUnits', 'gradientTransform',
      'offset', 'stop-color', 'stop-opacity', 'spreadMethod', 'fx', 'fy',
      'dx', 'dy', 'stdDeviation', 'in', 'in2', 'result', 'mode', 'type',
      'values', 'tableValues', 'slope', 'intercept', 'amplitude', 'exponent',
      'k1', 'k2', 'k3', 'k4', 'order', 'kernelMatrix', 'divisor', 'bias',
      'targetX', 'targetY', 'surfaceScale', 'diffuseConstant', 'specularConstant',
      'specularExponent', 'lighting-color', 'azimuth', 'elevation', 'text-anchor',
      'font-family', 'font-size', 'font-weight', 'letter-spacing', 'word-spacing',
      'startOffset', 'method', 'spacing', 'href', 'to', 'from', 'by', 'dur',
      'begin', 'end', 'repeatCount', 'repeatDur', 'keyTimes', 'keySplines',
      'calcMode', 'additive', 'accumulate', 'path', 'rotate', 'origin',
      'textLength', 'lengthAdjust', 'mask', 'clip-path', 'filter', 'maskUnits',
      'maskContentUnits', 'clipPathUnits', 'patternUnits', 'patternTransform',
      'symbol', 'refX', 'refY', 'marker', 'markerWidth', 'markerHeight',
      'markerUnits', 'orient', 'overflow', 'display', 'visibility'
    ],
    // Explicitly forbid dangerous elements and attributes
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'embed', 'object', 'form', 'input', 'textarea', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress', 'oncontextmenu', 'ondblclick', 'onmousedown', 'onmouseup', 'onmousemove', 'onmouseenter', 'onmouseleave', 'onwheel', 'onscroll', 'onresize', 'onpageshow', 'onpagehide', 'onhashchange', 'onbeforeunload', 'ononline', 'onoffline', 'onpopstate', 'onstorage', 'onmessage', 'onerror', 'onloadstart', 'onprogress', 'onloadend', 'onabort', 'oncanplay', 'oncanplaythrough', 'ondurationchange', 'onemptied', 'onended', 'onloadeddata', 'onloadedmetadata', 'onpause', 'onplay', 'onplaying', 'onratechange', 'onseeked', 'onseeking', 'onstalled', 'onsuspend', 'ontimeupdate', 'onvolumechange', 'onwaiting', 'oncopy', 'oncut', 'onpaste', 'onbeforecopy', 'onbeforecut', 'onbeforepaste', 'onbeforeprint', 'onafterprint', 'onpropertychange', 'onreadystatechange', 'onselectionchange', 'onstart', 'onfinish', 'onbounce', 'onbegin', 'onend', 'onrepeat', 'onzoom', 'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop'],
    ALLOW_DATA_ATTR: false,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
  }

  return DOMPurify.sanitize(input, config)
}

export function sanitizeSvg(input: string, mappings?: Record<string, string>): SvgAnalysis {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate raw input BEFORE sanitization to detect attacks
  const rawSource = input
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!doctype[\s\S]*?>/gi, '')
    .trim()

  if (!/<svg[\s>]/i.test(rawSource)) errors.push('O ficheiro não parece ser um SVG válido.')
  if (/<script[\s>]/i.test(rawSource)) errors.push('Remova scripts do SVG.')
  if (/<foreignObject[\s>]/i.test(rawSource)) errors.push('Remova foreignObject do SVG.')
  if (/<image[\s>]/i.test(rawSource)) errors.push('Use vetores puros; imagens raster embebidas não são suportadas.')
  if (/\son[a-z]+\s*=/i.test(rawSource)) errors.push('Remova handlers JavaScript do SVG.')
  // Reject hrefs that are not fragment references (allow only #id)
  if (/\s(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(rawSource)) errors.push('Remova links externos ou data URLs do SVG.')
  if (/<!--[\s\S]*?-->/g.test(rawSource)) errors.push('Remova comentários do SVG.')
  // Allow internal fragment references like url(#id) but block external URLs
  if (/url\(\s*["']?(?!#)[^)]*["']?\)/i.test(rawSource) || /@import/i.test(rawSource)) errors.push('Remova referências CSS externas, gradients por URL ou imports.')

  // First pass: DOMPurify sanitization to remove dangerous content
  let source = purifySvg(input)

  // Remove XML declaration, DOCTYPE, and comments for cleaner processing
  source = source
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!doctype[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()

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
