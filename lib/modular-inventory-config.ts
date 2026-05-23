export const RAIL_LENGTH_MM = 250
export const MODULE_LENGTH_MM = RAIL_LENGTH_MM
export const PHYSICAL_GRID_DIMENSION_SET = 'v1-standard-250'
export const CHARS_PER_MODULE_ESTIMATE = 5
export const MIN_GLOBAL_MODULES = 1
export const MAX_GLOBAL_MODULES = 12
export const LAUNCH_DISCOUNT_PERCENT = 20
export const AUTO_PAY_RAIL_LIMIT = 30

export const NORMAL_CHARACTER_WIDTH_MM = 38
export const NARROW_CHARACTER_WIDTH_MM = 22
export const WIDE_CHARACTER_WIDTH_MM = 52
export const SPACE_CHARACTER_WIDTH_MM = 24
export const FALLBACK_CHARACTER_WIDTH_MM = 38

export const NARROW_CHARACTERS = ['i', 'I', 'l', '1', '.', ',', ':', ';', "'", '"', '`', '´', '!', '|']
export const WIDE_CHARACTERS = ['m', 'M', 'w', 'W', '@', '#', '%', '&', '€']
export const NORMAL_CHARACTERS = [
  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  ...'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
]

export const CHARACTER_WIDTH_MM: Record<string, number> = {
  ...Object.fromEntries(NORMAL_CHARACTERS.map(character => [character, NORMAL_CHARACTER_WIDTH_MM])),
  ...Object.fromEntries(NARROW_CHARACTERS.map(character => [character, NARROW_CHARACTER_WIDTH_MM])),
  ...Object.fromEntries(WIDE_CHARACTERS.map(character => [character, WIDE_CHARACTER_WIDTH_MM])),
  ' ': SPACE_CHARACTER_WIDTH_MM,
  '-': 28,
  '+': 36,
  '/': 32,
  '\\': 32,
  '(': 28,
  ')': 28,
  '[': 28,
  ']': 28,
  '?': 36,
  '*': 34,
  '$': 40,
  'º': 24,
  'ª': 24,
}

export const STANDARD_PACK_DISTRIBUTION: Record<string, number> = {
  ' ': 13,
  a: 10,
  e: 12,
  o: 10,
  s: 9,
  r: 8,
  i: 8,
  n: 8,
  t: 7,
  c: 7,
  d: 6,
  m: 5,
  u: 5,
  p: 5,
  l: 5,
  v: 3,
  g: 3,
  h: 3,
  b: 3,
  f: 2,
  q: 2,
  z: 2,
  j: 1,
  x: 1,
  k: 1,
  w: 1,
  y: 1,
  A: 6,
  E: 6,
  O: 5,
  S: 5,
  R: 4,
  I: 4,
  N: 4,
  T: 4,
  C: 4,
  D: 3,
  M: 3,
  U: 3,
  P: 3,
  L: 3,
  V: 2,
  G: 2,
  H: 2,
  B: 2,
  F: 2,
  Q: 1,
  Z: 1,
  J: 1,
  X: 1,
  K: 1,
  W: 1,
  Y: 1,
  '0': 2,
  '1': 4,
  '2': 3,
  '3': 3,
  '4': 3,
  '5': 3,
  '6': 2,
  '7': 2,
  '8': 2,
  '9': 2,
  ',': 6,
  '.': 6,
  ':': 4,
  ';': 2,
  '-': 6,
  '+': 2,
  '/': 2,
  '&': 2,
  '%': 2,
  '€': 6,
  '?': 2,
  '!': 2,
  á: 1,
  à: 1,
  ã: 2,
  é: 2,
  ê: 1,
  í: 1,
  ó: 1,
  õ: 1,
  ú: 1,
  ç: 2,
  Á: 1,
  Ã: 1,
  É: 1,
  Ç: 1,
}

export const V1_STANDARD_DIMENSION_SET = {
  id: PHYSICAL_GRID_DIMENSION_SET,
  railLengthMm: RAIL_LENGTH_MM,
  characterWidthMm: CHARACTER_WIDTH_MM,
  fallbackCharacterWidthMm: FALLBACK_CHARACTER_WIDTH_MM,
} as const
