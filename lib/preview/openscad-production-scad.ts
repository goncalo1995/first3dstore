import type { PhysicalRail, ProductionRailSegment } from './parametric-preview-types'

export const PRINTER_MAX_DIMENSION = 250
const BUILD_PLATE_WIDTH_MM = 360
const MARGIN_MM = 10
const RAIL_PART_DEPTH_MM = 56
const LETTER_PART_WIDTH_MM = 16
const LETTER_PART_HEIGHT_MM = 20
const LETTER_PART_GAP_MM = 4

type PlacedPart = {
  x: number
  y: number
  width: number
  height: number
}

function escapeScadString(value: string) {
  return JSON.stringify(String(value ?? '')).replace(/\u2028|\u2029/g, '')
}

function cleanLengthMm(value: number) {
  if (!Number.isFinite(value)) return PRINTER_MAX_DIMENSION
  return Math.max(1, Number(value))
}

export function splitRailLengthMm(lengthMm: number) {
  const safeLength = cleanLengthMm(lengthMm)
  const splitCount = Math.max(1, Math.ceil(safeLength / PRINTER_MAX_DIMENSION))
  const segmentLength = safeLength / splitCount

  return Array.from({ length: splitCount }, (_, index) => ({
    segmentIndex: index + 1,
    segmentCount: splitCount,
    segmentLengthMm: segmentLength,
    leftMagnets: index > 0,
    rightMagnets: index < splitCount - 1,
  }))
}

function nextPlacement(parts: PlacedPart[], width: number, height: number): PlacedPart {
  const last = parts.at(-1)
  if (!last) {
    const part = { x: MARGIN_MM, y: MARGIN_MM, width, height }
    parts.push(part)
    return part
  }

  const nextX = last.x + last.width + MARGIN_MM
  const sameRowY = last.y
  const rowHeight = Math.max(...parts.filter(part => part.y === sameRowY).map(part => part.height))

  if (nextX + width + MARGIN_MM <= BUILD_PLATE_WIDTH_MM) {
    const part = { x: nextX, y: sameRowY, width, height }
    parts.push(part)
    return part
  }

  const nextY = sameRowY + rowHeight + MARGIN_MM
  const part = { x: MARGIN_MM, y: nextY, width, height }
  parts.push(part)
  return part
}

function visibleLetters(text: string) {
  return Array.from(String(text ?? '').replace(/\s+/g, '')).slice(0, 240)
}

export function getProductionSegments(rails: PhysicalRail[]): ProductionRailSegment[] {
  return rails.flatMap(rail => splitRailLengthMm(rail.lengthMm).map(segment => ({
    sourceRailId: rail.id,
    ...segment,
  })))
}

export function buildProductionScad({
  rails,
  part = 'assembly',
}: {
  rails: PhysicalRail[]
  part?: 'rails' | 'letters' | 'assembly'
}) {
  const placements: PlacedPart[] = []
  const railBodies: string[] = []
  const letterBodies: string[] = []

  for (const rail of rails) {
    for (const segment of splitRailLengthMm(rail.lengthMm)) {
      const placement = nextPlacement(placements, segment.segmentLengthMm, RAIL_PART_DEPTH_MM)
      railBodies.push(`
        translate([${placement.x.toFixed(3)}, ${placement.y.toFixed(3)}, 0])
          production_rail_segment(${segment.segmentLengthMm.toFixed(3)}, ${segment.leftMagnets ? 'true' : 'false'}, ${segment.rightMagnets ? 'true' : 'false'});
      `)
    }
  }

  for (const rail of rails) {
    for (const letter of visibleLetters(rail.text)) {
      const placement = nextPlacement(placements, LETTER_PART_WIDTH_MM, LETTER_PART_HEIGHT_MM)
      letterBodies.push(`
        translate([${placement.x.toFixed(3)}, ${placement.y.toFixed(3)}, 0])
          production_letter(${escapeScadString(letter)});
      `)
    }
  }

  return `
    // EM3D production build-plate preview. Units are millimeters.
    PRINTER_MAX_DIMENSION = ${PRINTER_MAX_DIMENSION};
    $fn = 18;

    module magnet_marker(x, y) {
      translate([x, y, 3.2]) cylinder(h=1.2, d=5.2);
    }

    module production_rail_segment(length, left_magnets, right_magnets) {
      difference() {
        union() {
          cube([length, 45, 6.5]);
          translate([0, 45, 0]) cube([length, 8, 4]);
          translate([0, 53, 0]) cube([length, 2, 5.5]);
        }
        if (left_magnets) {
          magnet_marker(7, 12);
          magnet_marker(7, 34);
        }
        if (right_magnets) {
          magnet_marker(length - 7, 12);
          magnet_marker(length - 7, 34);
        }
      }
    }

    module production_letter(label) {
      union() {
        cube([${LETTER_PART_WIDTH_MM}, ${LETTER_PART_HEIGHT_MM}, 2.4]);
        translate([${LETTER_PART_WIDTH_MM / 2}, ${LETTER_PART_HEIGHT_MM / 2}, 2.4])
          linear_extrude(height=1.2)
            text(label, size=10, halign="center", valign="center", font="Liberation Sans:style=Bold");
      }
    }

    union() {
      ${part === 'rails' || part === 'assembly' ? railBodies.join('\n') : ''}
      ${part === 'letters' || part === 'assembly' ? letterBodies.join('\n') : ''}
    }
  `
}
