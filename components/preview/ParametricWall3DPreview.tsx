'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Box, Eye, Loader2 } from 'lucide-react'
import {
  Box3,
  BufferGeometry,
  Color,
  MeshStandardMaterial,
  PCFShadowMap,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useOpenScadPreview } from '@/lib/preview/use-openscad-preview'
import type { OpenScadPreviewMode, PhysicalRail, PreviewColor } from '@/lib/preview/parametric-preview-types'

type MaterialKind = 'wood' | 'matte-black' | 'white' | 'custom'
type BackgroundKey = 'studio' | 'light' | 'warm'

const BACKGROUND_PRESETS: Record<BackgroundKey, {
  label: string
  canvas: string
  swatch: string
  shadow: string
}> = {
  studio: {
    label: 'Estúdio escuro',
    canvas: '#111216',
    swatch: '#111216',
    shadow: '#050507',
  },
  light: {
    label: 'Parede clara',
    canvas: '#e9e5dc',
    swatch: '#e9e5dc',
    shadow: '#9b9487',
  },
  warm: {
    label: 'Neutro quente',
    canvas: '#c9bda8',
    swatch: '#c9bda8',
    shadow: '#756956',
  },
}

function resolveMaterialKind(color?: PreviewColor): MaterialKind {
  const name = String(color?.name ?? color?.globalColorId ?? '').toLowerCase()
  if (name.includes('madeira') || name.includes('wood')) return 'wood'
  if (name.includes('preto') || name.includes('black')) return 'matte-black'
  if (name.includes('branco') || name.includes('white')) return 'white'
  return 'custom'
}

function createMaterial(color?: PreviewColor) {
  const kind = resolveMaterialKind(color)
  if (kind === 'wood') {
    const texture = new TextureLoader().load('/vendor/materials/wood-grain.svg')
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(6, 1)
    return new MeshStandardMaterial({
      map: texture,
      color: '#b98755',
      roughness: 0.68,
      metalness: 0,
    })
  }

  if (kind === 'matte-black') {
    return new MeshStandardMaterial({
      color: '#181a1d',
      roughness: 0.92,
      metalness: 0.02,
    })
  }

  if (kind === 'white') {
    return new MeshStandardMaterial({
      color: '#f6f2e8',
      roughness: 0.72,
      metalness: 0,
    })
  }

  return new MeshStandardMaterial({
    color: new Color(color?.hex || '#2f3437'),
    roughness: 0.78,
    metalness: 0.01,
  })
}

function useStlGeometry(stl?: ArrayBuffer) {
  return useMemo(() => {
    if (!stl) return null
    const parsed = new STLLoader().parse(stl) as BufferGeometry
    parsed.computeVertexNormals()
    parsed.computeBoundingBox()
    return parsed
  }, [stl])
}

function GeometryGroup({
  railStl,
  letterStl,
  railColor,
  letterColor,
}: {
  railStl: ArrayBuffer
  letterStl: ArrayBuffer
  railColor?: PreviewColor
  letterColor?: PreviewColor
}) {
  const railGeometry = useStlGeometry(railStl)
  const letterGeometry = useStlGeometry(letterStl)
  const railMaterial = useMemo(() => createMaterial(railColor), [railColor])
  const letterMaterial = useMemo(() => createMaterial(letterColor), [letterColor])
  const groupPosition = useMemo(() => {
    const box = new Box3()
    if (railGeometry?.boundingBox) box.union(railGeometry.boundingBox)
    if (letterGeometry?.boundingBox) box.union(letterGeometry.boundingBox)
    if (box.isEmpty()) return new Vector3(0, 0, 0)
    const center = new Vector3()
    box.getCenter(center)
    return center.multiplyScalar(-1)
  }, [letterGeometry, railGeometry])

  useEffect(() => () => {
    railGeometry?.dispose()
    letterGeometry?.dispose()
    railMaterial.dispose()
    letterMaterial.dispose()
    if (railMaterial.map) railMaterial.map.dispose()
    if (letterMaterial.map) letterMaterial.map.dispose()
  }, [letterGeometry, letterMaterial, railGeometry, railMaterial])

  return (
    <group position={groupPosition} rotation={[-0.32, 0.08, 0]}>
      {railGeometry && <mesh geometry={railGeometry} material={railMaterial} castShadow receiveShadow />}
      {letterGeometry && <mesh geometry={letterGeometry} material={letterMaterial} castShadow receiveShadow />}
    </group>
  )
}

export function ParametricWall3DPreview({
  rails,
  wallWidthCm,
  railColor,
  letterColor,
}: {
  rails: PhysicalRail[]
  wallWidthCm: number
  railColor?: PreviewColor
  letterColor?: PreviewColor
}) {
  const { status, result, error, compile } = useOpenScadPreview()
  const [open, setOpen] = useState(false)
  const [snapshot, setSnapshot] = useState<{ rails: PhysicalRail[]; wallWidthCm: number } | null>(null)
  const [mode, setMode] = useState<OpenScadPreviewMode>('preview')
  const [backgroundKey, setBackgroundKey] = useState<BackgroundKey>('studio')
  const selectedBackground = BACKGROUND_PRESETS[backgroundKey]

  const canPreview = rails.length > 0

  function runCompile(nextMode: OpenScadPreviewMode, nextSnapshot = snapshot) {
    if (!nextSnapshot) return
    setMode(nextMode)
    compile({
      mode: nextMode,
      rails: nextSnapshot.rails,
      wallWidthCm: nextSnapshot.wallWidthCm,
      railColor,
      letterColor,
    })
  }

  function openModal() {
    const nextSnapshot = {
      rails: rails.map(rail => ({ ...rail })),
      wallWidthCm,
    }
    setSnapshot(nextSnapshot)
    setOpen(true)
    runCompile('preview', nextSnapshot)
  }

  function closeModal(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setMode('preview')
      setSnapshot(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={closeModal}>
      <Button
        type="button"
        onClick={openModal}
        disabled={!canPreview}
        className="h-12 rounded-full bg-[#d4af37] px-5 text-stone-950 hover:bg-[#f1cf62] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Eye className="size-4" />
        Ver Parede em 3D
      </Button>

      <DialogContent className="flex h-[min(92dvh,860px)] max-w-[min(1180px,calc(100vw-1rem))] flex-col gap-0 overflow-hidden border-white/10 bg-[#0f1013] p-0 text-white shadow-2xl sm:rounded-lg">
        <DialogHeader className="border-b border-white/10 px-5 py-4 pr-14">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">
                {mode === 'production' ? 'Dev · build plate' : 'OpenSCAD WASM'}
              </p>
              <DialogTitle className="mt-1 text-xl font-bold text-white">
                {mode === 'production' ? 'Ficheiros de produção' : 'Parede paramétrica real'}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-white/55">
                {mode === 'production'
                  ? 'Segmentos e letras separados como numa mesa de impressão.'
                  : 'Simulação física gerada no browser a partir da geometria paramétrica.'}
              </DialogDescription>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <Button
                type="button"
                variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                onClick={() => runCompile(mode === 'production' ? 'preview' : 'production')}
                disabled={!snapshot || status === 'loading'}
              >
                <Box className="size-4" />
                {mode === 'production' ? 'Voltar à Preview' : 'Dev: Ver Ficheiros de Produção'}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="relative min-h-0 flex-1">
          {status === 'loading' && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0f1013]/88 text-white">
              <div className="text-center">
                <Loader2 className="mx-auto mb-4 size-10 animate-spin text-[#d4af37]" />
                <p className="font-semibold">A gerar simulação física...</p>
                <p className="mt-1 text-sm text-white/50">OpenSCAD está a correr num Web Worker.</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0f1013] px-6 text-center text-white">
              <div>
                <p className="text-lg font-bold">Não foi possível gerar a pré-visualização.</p>
                <p className="mt-2 max-w-xl text-sm text-white/60">{error}</p>
                <Button type="button" className="mt-5" onClick={() => runCompile(mode)}>
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}

          {mode === 'production' && result?.stats.productionSegments && (
            <div className="absolute left-4 top-4 z-[1] rounded-lg border border-white/10 bg-black/55 px-4 py-3 text-xs text-white/75 backdrop-blur">
              <p className="font-bold text-white">{result.stats.productionSegments.length} segmentos · {result.stats.productionLetterCount ?? 0} letras</p>
              <p className="mt-1">Máx. 250mm · margem segura 10mm</p>
            </div>
          )}

          <div className="absolute bottom-4 right-4 z-[1] flex gap-2 rounded-full border border-white/15 bg-black/35 p-1.5 shadow-xl backdrop-blur">
            {(Object.keys(BACKGROUND_PRESETS) as BackgroundKey[]).map(key => {
              const preset = BACKGROUND_PRESETS[key]
              const selected = key === backgroundKey

              return (
                <button
                  key={key}
                  type="button"
                  aria-label={preset.label}
                  title={preset.label}
                  onClick={() => setBackgroundKey(key)}
                  className={`size-8 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
                    selected ? 'border-[#d4af37] ring-2 ring-[#d4af37]/35' : 'border-white/25 hover:border-white/60'
                  }`}
                  style={{ background: preset.swatch }}
                />
              )
            })}
          </div>

          <Canvas camera={{ position: [0, 120, mode === 'production' ? 720 : 520], fov: 38 }} shadows={{ type: PCFShadowMap }} style={{ touchAction: 'none' }}>
            <color attach="background" args={[selectedBackground.canvas]} />
            <ambientLight intensity={0.52} />
            <directionalLight position={[220, 320, 260]} intensity={2.2} castShadow />
            <directionalLight position={[-180, 150, 220]} intensity={0.72} />
            <Suspense fallback={null}>
              {result?.railStl && result?.letterStl && (
                <GeometryGroup
                  railStl={result.railStl}
                  letterStl={result.letterStl}
                  railColor={railColor}
                  letterColor={letterColor}
                />
              )}
            </Suspense>
            <ContactShadows position={[0, -72, 0]} opacity={0.34} scale={620} blur={2.8} far={150} color={selectedBackground.shadow} />
            <OrbitControls
              enablePan={false}
              enableZoom
              enableRotate
              enableDamping
              dampingFactor={0.08}
              minAzimuthAngle={-Math.PI / 2}
              maxAzimuthAngle={Math.PI / 2}
              minPolarAngle={Math.PI * 0.28}
              maxPolarAngle={Math.PI * 0.62}
              minDistance={260}
              maxDistance={780}
            />
          </Canvas>
        </div>
      </DialogContent>
    </Dialog>
  )
}
