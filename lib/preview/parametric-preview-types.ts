export type PhysicalRail = {
  id: string
  lengthMm: number
  text: string
  row: number
  col: number
  xMm?: number
}

export type PreviewColor = {
  name?: string
  hex?: string
  globalColorId?: string
}

export type OpenScadPreviewQuality = 'draft' | 'premium'
export type OpenScadPreviewMode = 'preview' | 'production'

export type ProductionRailSegment = {
  sourceRailId: string
  segmentIndex: number
  segmentCount: number
  segmentLengthMm: number
  leftMagnets: boolean
  rightMagnets: boolean
}

export type OpenScadPreviewRequest = {
  requestId: string
  mode: OpenScadPreviewMode
  rails: PhysicalRail[]
  wallWidthCm: number
  railColor?: PreviewColor
  letterColor?: PreviewColor
  quality?: OpenScadPreviewQuality
}

export type OpenScadPreviewSuccess = {
  requestId: string
  ok: true
  railStl: ArrayBuffer
  letterStl: ArrayBuffer
  stats: {
    railCount: number
    totalLengthMm: number
    compileMs: number
    mode: OpenScadPreviewMode
    productionSegments?: ProductionRailSegment[]
    productionLetterCount?: number
  }
}

export type OpenScadPreviewFailure = {
  requestId: string
  ok: false
  error: string
}

export type OpenScadPreviewResponse = OpenScadPreviewSuccess | OpenScadPreviewFailure
