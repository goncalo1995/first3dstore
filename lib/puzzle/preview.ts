import type { ConnectorType } from './types'

export function buildPuzzleGridPath(params: {
  width: number
  height: number
  rows: number
  columns: number
  connectorType: ConnectorType
}) {
  const { width, height, rows, columns, connectorType } = params

  // Validate inputs to prevent division by zero or NaN/Infinity
  if (!Number.isFinite(rows) || rows <= 0 || !Number.isFinite(columns) || columns <= 0) {
    throw new Error('buildPuzzleGridPath: rows and columns must be positive finite integers')
  }
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new Error('buildPuzzleGridPath: width and height must be positive finite numbers')
  }

  const cellW = width / columns
  const cellH = height / rows
  const tabRadius = Math.min(cellW, cellH) * 0.16
  const commands: string[] = []

  for (let col = 1; col < columns; col += 1) {
    const x = col * cellW
    for (let row = 0; row < rows; row += 1) {
      const top = row * cellH
      const bottom = (row + 1) * cellH
      const mid = top + cellH / 2
      // For chanfrado vertical cuts, use only row parity to match OpenSCAD
      const direction = connectorType === 'chanfrado' ? (row % 2 === 0 ? 1 : -1) : ((row + col) % 2 === 0 ? 1 : -1)

      if (connectorType === 'redondo') {
        commands.push(`M ${x} ${top} L ${x} ${mid - tabRadius} C ${x + direction * tabRadius} ${mid - tabRadius}, ${x + direction * tabRadius} ${mid + tabRadius}, ${x} ${mid + tabRadius} L ${x} ${bottom}`)
      } else if (connectorType === 'chanfrado') {
        commands.push(`M ${x} ${top} L ${x} ${mid - tabRadius} L ${x + direction * tabRadius} ${mid} L ${x} ${mid + tabRadius} L ${x} ${bottom}`)
      } else {
        commands.push(`M ${x} ${top} L ${x} ${bottom}`)
      }
    }
  }

  for (let row = 1; row < rows; row += 1) {
    const y = row * cellH
    for (let col = 0; col < columns; col += 1) {
      const left = col * cellW
      const right = (col + 1) * cellW
      const mid = left + cellW / 2
      // For chanfrado horizontal cuts, use only col parity to match OpenSCAD
      const direction = connectorType === 'chanfrado' ? (col % 2 === 0 ? 1 : -1) : ((row + col) % 2 === 0 ? 1 : -1)

      if (connectorType === 'redondo') {
        commands.push(`M ${left} ${y} L ${mid - tabRadius} ${y} C ${mid - tabRadius} ${y + direction * tabRadius}, ${mid + tabRadius} ${y + direction * tabRadius}, ${mid + tabRadius} ${y} L ${right} ${y}`)
      } else if (connectorType === 'chanfrado') {
        commands.push(`M ${left} ${y} L ${mid - tabRadius} ${y} L ${mid} ${y + direction * tabRadius} L ${mid + tabRadius} ${y} L ${right} ${y}`)
      } else {
        commands.push(`M ${left} ${y} L ${right} ${y}`)
      }
    }
  }

  return commands.join(' ')
}
