import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const paramsPath = resolve(process.argv[2] || resolve(scriptDir, 'example-params.json'))
const outputPath = resolve(process.argv[3] || resolve(scriptDir, 'cut-matrix.stl'))
const scadPath = resolve(scriptDir, 'cut-matrix.scad')

const params = JSON.parse(await readFile(paramsPath, 'utf8'))
const allowedConnectors = new Set(['recto', 'redondo', 'chanfrado'])

function numberParam(name, fallback) {
  const value = Number(params[name] ?? fallback)
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric parameter: ${name}`)
  }
  return value
}

const connectorType = String(params.connectorType ?? 'redondo')
if (!allowedConnectors.has(connectorType)) {
  throw new Error(`connectorType must be one of: ${[...allowedConnectors].join(', ')}`)
}

const defines = {
  rows: Math.round(numberParam('rows', 7)),
  columns: Math.round(numberParam('columns', 8)),
  widthMm: numberParam('widthMm', params.puzzleWidthMm ?? 150),
  heightMm: numberParam('heightMm', 120),
  pieceGapMm: numberParam('pieceGapMm', 0.18),
  cutHeightMm: numberParam('cutHeightMm', 2),
  connectorType,
}

const args = [
  '-o',
  outputPath,
  ...Object.entries(defines).flatMap(([key, value]) => [
    '-D',
    typeof value === 'string' ? `${key}="${value}"` : `${key}=${value}`,
  ]),
  scadPath,
]

const openscad = spawn('openscad', args, { stdio: 'inherit' })

openscad.on('exit', (code) => {
  if (code === 0) {
    console.log(`Cut matrix written to ${outputPath}`)
    return
  }

  process.exit(code ?? 1)
})
