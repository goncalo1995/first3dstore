export type ConnectorType = 'recto' | 'redondo' | 'chanfrado'

export type SvgPuzzleConfig = {
  version: 1
  type: 'svg-puzzle'
  product: {
    slug: 'puzzle-foto'
    name: 'Puzzle SVG Personalizado'
  }
  widthMm: number
  heightMm: number
  rows: number
  columns: number
  sunkenImage: boolean
  pieceGapMm: number
  thicknessMm: number
  imageScalePercent: number
  offsetXmm: number
  offsetYmm: number
  connectorType: ConnectorType
  colorMappings: Record<string, string>
  finalColors: string[]
  originalColors: string[]
  colorCount: number
  viewBox: string
  svgFileName: string
  svgSize: number
  estimatedPrice: number
  pieceWidthMm: number
  pieceHeightMm: number
}

export type PuzzleCutParams = {
  widthMm: number
  heightMm: number
  rows: number
  columns: number
  pieceGapMm: number
  connectorType: ConnectorType
  cutHeightMm: number
}
