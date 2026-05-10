export function roundToHalfEuro(value: number) {
  return Math.round(value * 2) / 2
}

export function estimatePuzzlePrice(params: {
  widthMm: number
  heightMm: number
  rows: number
  columns: number
  colorCount: number
}) {
  const areaCm2 = (params.widthMm * params.heightMm) / 100
  const pieceCount = params.rows * params.columns
  const extraColors = Math.max(0, params.colorCount - 1)

  return roundToHalfEuro(12 + areaCm2 * 0.06 + pieceCount * 0.08 + extraColors * 4)
}
