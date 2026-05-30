'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { buildPreviewScad } from './openscad-preview-scad'
import { buildProductionScad } from './openscad-production-scad'
import type {
  OpenScadPreviewMode,
  OpenScadPreviewSuccess,
  PhysicalRail,
  PreviewColor,
} from './parametric-preview-types'

type PreviewStatus = 'idle' | 'loading' | 'ready' | 'error'
type CompileLabel = 'rails' | 'letters'

type SingleCompileResponse =
  | {
      requestId: string
      label: CompileLabel
      success: true
      buffer: ArrayBuffer
    }
  | {
      requestId: string
      label: CompileLabel
      success: false
      error: string
    }

const SINGLE_COMPILE_TIMEOUT_MS = 60_000
const TEST_SCAD = 'cube([10,10,10]);'

function createRequestId() {
  return `preview-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function useOpenScadPreview() {
  const activeWorkerRef = useRef<Worker | null>(null)
  const pendingRequestIdRef = useRef<string | null>(null)
  const [status, setStatus] = useState<PreviewStatus>('idle')
  const [result, setResult] = useState<OpenScadPreviewSuccess | null>(null)
  const [error, setError] = useState<string | null>(null)

  const terminateActiveWorker = useCallback(() => {
    activeWorkerRef.current?.terminate()
    activeWorkerRef.current = null
  }, [])

  const compileViaDedicatedWorker = useCallback((
    scad: string,
    label: CompileLabel,
    requestId: string,
  ) => {
    terminateActiveWorker()

    return new Promise<ArrayBuffer>((resolve, reject) => {
      const worker = new Worker(new URL('./openscad-single.worker.ts', import.meta.url), { type: 'module' })
      activeWorkerRef.current = worker

      let settled = false

      const clearActiveWorker = () => {
        if (activeWorkerRef.current === worker) {
          activeWorkerRef.current = null
        }
      }

      const finish = () => {
        settled = true
        worker.terminate()
        clearActiveWorker()
      }

      const timeoutId = window.setTimeout(() => {
        if (settled) return
        worker.terminate()
        clearActiveWorker()
        settled = true
        reject(new Error(`OpenSCAD compile timed out for ${label}.`))
      }, SINGLE_COMPILE_TIMEOUT_MS)

      worker.onmessage = (event: MessageEvent<SingleCompileResponse>) => {
        if (settled) return

        const response = event.data
        if (response.requestId !== requestId || response.label !== label) {
          return
        }

        window.clearTimeout(timeoutId)
        finish()

        if (response.success) {
          resolve(response.buffer)
          return
        }

        reject(new Error(response.error))
      }

      worker.onerror = (event) => {
        if (settled) return

        window.clearTimeout(timeoutId)
        finish()
        reject(new Error(event.message || `OpenSCAD worker failed for ${label}.`))
      }

      worker.postMessage({ requestId, label, scad })
    })
  }, [terminateActiveWorker])

  useEffect(() => {
    return () => {
      terminateActiveWorker()
    }
  }, [terminateActiveWorker])

  const compile = useCallback((input: {
    mode?: OpenScadPreviewMode
    rails: PhysicalRail[]
    wallWidthCm: number
    railColor?: PreviewColor
    letterColor?: PreviewColor
  }) => {
    const requestId = createRequestId()
    const mode = input.mode ?? 'preview'
    const startedAt = performance.now()

    pendingRequestIdRef.current = requestId
    setStatus('loading')
    setError(null)
    setResult(null)

    void (async () => {
      try {
        const railScad = mode === 'production'
          ? buildProductionScad({
            rails: input.rails,
            part: 'rails',
          })
          : buildPreviewScad({
            rails: input.rails,
            wallWidthCm: input.wallWidthCm,
            part: 'rails',
          })

        // Phase 2: generated rails with cube letters to isolate rail SCAD first.
        const railStl = await compileViaDedicatedWorker(railScad, 'rails', requestId)
        if (pendingRequestIdRef.current !== requestId) return

        const letterStl = await compileViaDedicatedWorker(TEST_SCAD, 'letters', requestId)
        if (pendingRequestIdRef.current !== requestId) return

        const nextResult: OpenScadPreviewSuccess = {
          requestId,
          ok: true,
          railStl,
          letterStl,
          stats: {
            railCount: input.rails.length,
            totalLengthMm: input.rails.reduce(
              (sum, rail) => sum + Math.max(0, Number(rail.lengthMm) || 0),
              0,
            ),
            compileMs: Math.round(performance.now() - startedAt),
            mode,
          },
        }

        setResult(nextResult)
        setError(null)
        setStatus('ready')
      } catch (caught) {
        if (pendingRequestIdRef.current !== requestId) return

        setResult(null)
        setError(caught instanceof Error ? caught.message : 'OpenSCAD preview failed.')
        setStatus('error')
      }
    })()
  }, [compileViaDedicatedWorker])

  return {
    status,
    result,
    error,
    compile,
  }
}
