/// <reference lib="webworker" />

type OpenScadSingleLabel = 'rails' | 'letters'

type OpenScadSingleCompileRequest = {
  requestId: string
  label: OpenScadSingleLabel
  scad: string
}

type OpenScadSingleCompileResponse =
  | {
      requestId: string
      label: OpenScadSingleLabel
      success: true
      buffer: ArrayBuffer
    }
  | {
      requestId: string
      label: OpenScadSingleLabel
      success: false
      error: string
    }

type OpenScadInstance = {
  FS: {
    writeFile(path: string, data: string | Uint8Array): void
    readFile(path: string): Uint8Array | ArrayLike<number>
    stat(path: string): unknown
    unlink(path: string): void
  }
  callMain(args: string[]): void
}

type OpenScadFactoryOptions = {
  noInitialRun: boolean
  locateFile?: (path: string) => string
  print?: (text: string) => void
  printErr?: (text: string) => void
}

type OpenScadDefaultFactory = (
  options: OpenScadFactoryOptions,
) => Promise<OpenScadInstance>

type OpenScadWrapperFactory = (
  options: OpenScadFactoryOptions,
) => Promise<{
  getInstance(): OpenScadInstance
}>

type OpenScadModule = {
  default?: OpenScadDefaultFactory
  createOpenSCAD?: OpenScadWrapperFactory
}

const OPENSCAD_JS_URL = '/vendor/openscad-wasm/openscad.js'
const OPENSCAD_WASM_URL = '/vendor/openscad-wasm/openscad.wasm'
const INPUT_PATH = '/input.scad'
const OUTPUT_PATH = '/output.stl'
const BENIGN_STDERR_PATTERNS = [
  'localization',
  'cache',
  'facets',
  'total rendering time',
  'top level object',
  'geometries',
  'cgal',
  'polyset',
  'convex',
]

function postFailure(requestId: string, label: OpenScadSingleLabel, error: string) {
  const response: OpenScadSingleCompileResponse = {
    requestId,
    label,
    success: false,
    error,
  }
  self.postMessage(response)
}

function unlinkIfExists(instance: OpenScadInstance, path: string) {
  try {
    instance.FS.unlink(path)
  } catch {
    // Emscripten FS throws when the path is absent.
  }
}

function teardownRuntime(instance: OpenScadInstance) {
  const runtime = instance as OpenScadInstance & {
    exitRuntime?: () => void
    _exit?: (code?: number) => void
    quit_?: () => void
  }

  try {
    runtime.exitRuntime?.()
  } catch {
    // Best effort only. The parent worker termination is the real boundary.
  }

  try {
    runtime._exit?.(0)
  } catch {
    // Best effort only. The parent worker termination is the real boundary.
  }

  try {
    runtime.quit_?.()
  } catch {
    // Best effort only. The parent worker termination is the real boundary.
  }
}

function logOpenScadStderr(label: OpenScadSingleLabel, message: string) {
  const normalized = message.toLowerCase()
  const isBenign = BENIGN_STDERR_PATTERNS.some(pattern => normalized.includes(pattern))

  if (isBenign) {
    console.debug(`[OpenSCAD stderr][${label}]`, message)
    return
  }

  console.error(`[OpenSCAD stderr][${label}]`, message)
}

async function createOpenScadInstance(
  label: OpenScadSingleLabel,
  stderrLogs: string[],
) {
  console.log(`[OpenSCAD worker] Runtime import started for ${label}`, OPENSCAD_JS_URL)

  const OpenScadModule = (await import(
    /* webpackIgnore: true */ OPENSCAD_JS_URL
  )) as OpenScadModule

  const options: OpenScadFactoryOptions = {
    noInitialRun: true,
    locateFile: (path) =>
      path.endsWith('.wasm')
        ? OPENSCAD_WASM_URL
        : `/vendor/openscad-wasm/${path}`,
    print: (text) => console.log(`[OpenSCAD stdout][${label}]`, text),
    printErr: (text) => {
      const message = String(text)
      stderrLogs.push(message)
      logOpenScadStderr(label, message)
    },
  }

  if (OpenScadModule.createOpenSCAD) {
    console.log(`[OpenSCAD worker] Using createOpenSCAD() runtime API for ${label}`)
    const wrapper = await OpenScadModule.createOpenSCAD(options)
    const instance = wrapper.getInstance()
    console.log(`[OpenSCAD worker] Runtime instantiated for ${label}`)
    return instance
  }

  if (OpenScadModule.default) {
    console.log(`[OpenSCAD worker] Using default() runtime API for ${label}`)
    const instance = await OpenScadModule.default(options)
    console.log(`[OpenSCAD worker] Runtime instantiated for ${label}`)
    return instance
  }

  throw new Error('OpenSCAD WASM runtime did not export a usable factory.')
}

async function compileOnce({ requestId, label, scad }: OpenScadSingleCompileRequest) {
  console.log(`[OpenSCAD worker] Worker booted for ${label}`)

  const stderrLogs: string[] = []
  let instance: OpenScadInstance | null = null

  try {
    instance = await createOpenScadInstance(label, stderrLogs)

    unlinkIfExists(instance, INPUT_PATH)
    unlinkIfExists(instance, OUTPUT_PATH)

    console.log(`[OpenSCAD worker] FS write started for ${label}`)
    instance.FS.writeFile(INPUT_PATH, scad)
    console.log(`[OpenSCAD worker] FS write complete for ${label}`)

    console.log(`[OpenSCAD worker] callMain started for ${label}`)
    instance.callMain([INPUT_PATH, '-o', OUTPUT_PATH])
    console.log(`[OpenSCAD worker] callMain completed for ${label}`)

    let outputExists = false
    try {
      instance.FS.stat(OUTPUT_PATH)
      outputExists = true
    } catch {
      outputExists = false
    }

    if (!outputExists) {
      throw new Error(`OpenSCAD did not generate ${OUTPUT_PATH}`)
    }

    console.log(`[OpenSCAD worker] STL read started for ${label}`)
    const stlData = instance.FS.readFile(OUTPUT_PATH)
    console.log(`[OpenSCAD worker] STL read complete for ${label}`)

    if (!stlData || stlData.length < 100) {
      throw new Error(`Generated STL too small for ${label} (${stlData?.length ?? 0} bytes)`)
    }

    const stlBytes = new Uint8Array(stlData)

    if (stlBytes[0] === 0x3c) {
      throw new Error(`Output appears to contain HTML/text instead of STL for ${label}`)
    }

    const cloned = stlBytes.slice().buffer
    console.log(`[OpenSCAD worker] STL byte length for ${label}:`, stlBytes.length)

    const response: OpenScadSingleCompileResponse = {
      requestId,
      label,
      success: true,
      buffer: cloned,
    }

    self.postMessage(response, [cloned])
  } catch (error) {
    const baseMessage = error instanceof Error ? error.message : String(error)
    const stderrMessage = stderrLogs.length
      ? `\n\nOpenSCAD stderr (${label}):\n${stderrLogs.join('\n')}`
      : ''
    const message = `OpenSCAD compile failed (${label}): ${baseMessage}${stderrMessage}`

    console.error(`[OpenSCAD worker] Compile failed for ${label}:`, error)
    postFailure(requestId, label, message)
  } finally {
    if (instance) {
      console.log(`[OpenSCAD worker] Cleanup started for ${label}`)
      unlinkIfExists(instance, INPUT_PATH)
      unlinkIfExists(instance, OUTPUT_PATH)
      teardownRuntime(instance)
      console.log(`[OpenSCAD worker] Cleanup completed for ${label}`)
    }

    self.close()
  }
}

self.onmessage = (event: MessageEvent<OpenScadSingleCompileRequest>) => {
  void compileOnce(event.data)
}
