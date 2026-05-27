import type { PhysicalRail } from './parametric-preview-types'

const FALLBACK_CHARACTER_WIDTH_MM = 38
const CHARACTER_WIDTH_MM: Record<string, number> = {
  ...Object.fromEntries('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('').map(character => [character, FALLBACK_CHARACTER_WIDTH_MM])),
  ...Object.fromEntries(['i', 'I', 'l', '1', '.', ',', ':', ';', "'", '"', '`', '´', '!', '|'].map(character => [character, 22])),
  ...Object.fromEntries(['m', 'M', 'w', 'W', '@', '#', '%', '&', '€'].map(character => [character, 52])),
  ' ': 24,
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

function escapeScadString(value: string) {
  return JSON.stringify(String(value ?? '')).replace(/\u2028|\u2029/g, '')
}

function cleanNumber(value: number, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Number(value)))
}

function characterWidth(character: string) {
  return CHARACTER_WIDTH_MM[character] ?? FALLBACK_CHARACTER_WIDTH_MM
}

function buildCharacterBlocks(text: string, railLengthMm: number) {
  const characters = Array.from(String(text ?? '').replace(/\s+/g, ' ').trim()).slice(0, 80)
  if (!characters.length) return ''

  const totalTextWidth = characters.reduce((sum, character) => sum + characterWidth(character), 0)
  const scale = Math.min(1, Math.max(0.35, (railLengthMm - 24) / Math.max(totalTextWidth, 1)))
  const blockHeight = 24
  const blockDepth = 1.8
  const gap = 2
  const blockWidths = characters.map(character => Math.max(4, characterWidth(character) * scale * 0.72))
  const totalBlockWidth = blockWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, characters.length - 1) * gap
  let cursor = Math.max(8, (railLengthMm - totalBlockWidth) / 2)

  return characters.map((character, index) => {
    const width = character === ' ' ? Math.max(5, blockWidths[index] * 0.42) : blockWidths[index]
    const height = character === ' ' ? 3 : blockHeight
    const y = 15.2
    const z = character === ' ' ? 17 : 6
    const x = cursor
    cursor += width + gap

    if (character === ' ') {
      return `translate([${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}]) cube([${width.toFixed(3)}, ${blockDepth}, ${height}], center=false);`
    }

    return `translate([${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}]) cube([${width.toFixed(3)}, ${blockDepth}, ${height}], center=false);`
  }).join('\n')
}

export function buildPreviewScad({
  rails,
  wallWidthCm,
  part = 'assembly',
}: {
  rails: PhysicalRail[]
  wallWidthCm: number
  part?: 'rails' | 'letters' | 'assembly'
}) {
  const safeWallWidthMm = cleanNumber(wallWidthCm, 120, 25, 600) * 10
  const safeRails = rails
    .map((rail, index) => ({
      id: String(rail.id || `rail-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, '-'),
      lengthMm: cleanNumber(Number(rail.lengthMm), 120, 40, safeWallWidthMm),
      text: String(rail.text ?? '').slice(0, 160),
      row: Math.max(1, Math.trunc(Number(rail.row) || 1)),
      col: Math.max(1, Math.trunc(Number(rail.col) || 1)),
      xMm: Number.isFinite(Number(rail.xMm)) ? Math.max(0, Number(rail.xMm)) : undefined,
    }))
    .sort((left, right) => left.row - right.row || left.col - right.col)

  const rowGap = 58
  const colGap = 18
  const rowCursor = new Map<number, number>()
  const placedRails = safeRails.map((rail) => {
    const currentX = rowCursor.get(rail.row) ?? 0
    rowCursor.set(rail.row, currentX + rail.lengthMm + colGap)
    return {
      ...rail,
      xMm: rail.xMm ?? currentX,
    }
  })

  const railBodies = placedRails.map((rail) => {
    const y = -(rail.row - 1) * rowGap
    return `
      translate([${rail.xMm.toFixed(3)}, ${y.toFixed(3)}, 0]) rail_profile(${rail.lengthMm.toFixed(3)});
    `
  }).join('\n')

  const letterBodies = placedRails.map((rail) => {
    const y = -(rail.row - 1) * rowGap
    return `
      translate([${rail.xMm.toFixed(3)}, ${y.toFixed(3)}, 0]) union() {
        ${buildCharacterBlocks(rail.text, rail.lengthMm)}
      }
    `
  }).join('\n')

  return `
    // EM3D browser preview SCAD. Units are millimeters.
    $fn = 12;

    module rail_profile(length) {
      rail_height = 45;
      rail_thickness = 6.5;
      shelf_width = 8;
      shelf_height = 4;
      lip_width = 2;
      lip_height = 5.5;

      union() {
        cube([length, rail_thickness, rail_height]);
        cube([length, rail_thickness + shelf_width + lip_width, shelf_height]);
        translate([0, rail_thickness + shelf_width, shelf_height])
          cube([length, lip_width, lip_height]);
      }
    }

    union() {
      ${part === 'rails' || part === 'assembly' ? railBodies : ''}
      ${part === 'letters' || part === 'assembly' ? letterBodies : ''}
    }
  `
}
