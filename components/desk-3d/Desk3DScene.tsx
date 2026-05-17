'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber'
import { ContactShadows, Grid, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import type { Group } from 'three'
import { DoubleSide } from 'three'
import { deskColors, getDeskItemFootprint, getDeskProduct } from '@/lib/desk/products'
import type { DeskItem, DeskSetup, DeskSurface } from '@/lib/desk/types'
import { cn } from '@/lib/utils'
import { canUseWebGL, prefersReducedMotion } from './webgl'

const SCENE_SCALE = 0.1

export type DeskViewMode = 'overview' | 'top' | 'under' | 'focus'

type Desk3DSceneProps = {
  setup: DeskSetup
  selectedItemId?: string
  viewMode: DeskViewMode
  className?: string
  onSelectItem?: (itemId: string) => void
  onMoveItem?: (itemId: string, xCm: number, yCm: number) => void
  onFallback?: () => void
}

function colorHex(color: string | undefined, fallback: string) {
  const candidate = color && color in deskColors ? color : fallback
  return deskColors[candidate as keyof typeof deskColors]?.hex ?? '#0B0D10'
}

function itemSurface(setup: DeskSetup, itemId: string): DeskSurface {
  return setup.underItems.some((item) => item.id === itemId) ? 'under' : 'top'
}

function itemPosition(setup: DeskSetup, item: DeskItem, surface: DeskSurface) {
  const footprint = getDeskItemFootprint(item) ?? { width: 8, depth: 8 }
  const deskW = setup.desk.widthCm * SCENE_SCALE
  const deskD = setup.desk.depthCm * SCENE_SCALE
  const x = (item.xCm + footprint.width / 2) * SCENE_SCALE - deskW / 2
  const z = (item.yCm + footprint.depth / 2) * SCENE_SCALE - deskD / 2
  const y = surface === 'under' ? -0.34 : 0.24
  return { x, y, z, footprint }
}

function CameraRig({ setup, viewMode, selectedItemId }: { setup: DeskSetup; viewMode: DeskViewMode; selectedItemId?: string }) {
  const group = useRef<Group>(null)
  const reduced = useMemo(() => prefersReducedMotion(), [])

  useFrame(({ clock, camera }) => {
    if (!group.current || reduced) return
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.025
    if (viewMode === 'overview') {
      camera.position.x += (8 - camera.position.x) * 0.02
      camera.position.y += (6.8 - camera.position.y) * 0.02
      camera.position.z += (9 - camera.position.z) * 0.02
    }
  })

  useEffect(() => {
    const deskW = setup.desk.widthCm * SCENE_SCALE
    const deskD = setup.desk.depthCm * SCENE_SCALE
    const camera = group.current?.parent
    if (!camera) return
    void deskW
    void deskD
    void selectedItemId
  }, [setup.desk.widthCm, setup.desk.depthCm, selectedItemId])

  return <group ref={group} />
}

function DeskTable({ setup }: { setup: DeskSetup }) {
  const width = setup.desk.widthCm * SCENE_SCALE
  const depth = setup.desk.depthCm * SCENE_SCALE

  return (
    <group>
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, 0.32, depth]} />
        <meshStandardMaterial color={setup.desk.surfaceColor === 'walnut' ? '#3a281d' : '#17171c'} roughness={0.72} metalness={0.08} />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 1.02, depth * 1.02]} />
        <meshBasicMaterial color="#A3FF12" transparent opacity={0.035} side={DoubleSide} />
      </mesh>
      {[
        [-width / 2 + 0.35, -1.75, -depth / 2 + 0.35],
        [width / 2 - 0.35, -1.75, -depth / 2 + 0.35],
        [-width / 2 + 0.35, -1.75, depth / 2 - 0.35],
        [width / 2 - 0.35, -1.75, depth / 2 - 0.35],
      ].map((position, index) => (
        <mesh key={index} position={position as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.09, 0.12, 3.1, 12]} />
          <meshStandardMaterial color="#101216" roughness={0.58} metalness={0.28} />
        </mesh>
      ))}
    </group>
  )
}

function ProductMesh({ item, setup, selected, onSelect, onMove }: {
  item: DeskItem
  setup: DeskSetup
  selected: boolean
  onSelect?: (itemId: string) => void
  onMove?: (itemId: string, xCm: number, yCm: number) => void
}) {
  const product = getDeskProduct(item.productId)
  const surface = itemSurface(setup, item.id)
  const dragRef = useRef(false)
  if (!product) return null

  const { x, y, z, footprint } = itemPosition(setup, item, surface)
  const width = Math.max(footprint.width * SCENE_SCALE, 0.28)
  const depth = Math.max(footprint.depth * SCENE_SCALE, 0.28)
  const base = colorHex(item.colorBase, product.defaultColors.base)
  const accent = colorHex(item.colorAccent, product.defaultColors.accent)
  const height = surface === 'under' ? 0.18 : product.preview.shape === 'circle' ? 0.75 : 0.32

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation()
    dragRef.current = true
    onSelect?.(item.id)
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    if (!dragRef.current || !onMove) return
    event.stopPropagation()
    const deskW = setup.desk.widthCm * SCENE_SCALE
    const deskD = setup.desk.depthCm * SCENE_SCALE
    const nextX = (event.point.x + deskW / 2) / SCENE_SCALE - footprint.width / 2
    const nextY = (event.point.z + deskD / 2) / SCENE_SCALE - footprint.depth / 2
    onMove(item.id, nextX, nextY)
  }

  function handlePointerUp(event: ThreeEvent<PointerEvent>) {
    dragRef.current = false
    event.stopPropagation()
  }

  return (
    <group
      position={[x, y, z]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <ProductBody shape={product.preview.shape} width={width} depth={depth} height={height} base={base} accent={accent} surface={surface} />
      {selected && (
        <mesh position={[0, surface === 'under' ? -0.16 : height / 2 + 0.08, 0]}>
          <boxGeometry args={[width + 0.16, 0.035, depth + 0.16]} />
          <meshBasicMaterial color="#A3FF12" transparent opacity={0.56} />
        </mesh>
      )}
    </group>
  )
}

function ProductBody({ shape, width, depth, height, base, accent, surface }: {
  shape: string
  width: number
  depth: number
  height: number
  base: string
  accent: string
  surface: DeskSurface
}) {
  const y = surface === 'under' ? -height / 2 : height / 2

  if (shape === 'circle') {
    return (
      <group>
        <mesh position={[0, y, 0]} castShadow>
          <cylinderGeometry args={[Math.min(width, depth) / 2, Math.min(width, depth) / 2, height, 32]} />
          <meshStandardMaterial color={base} roughness={0.62} metalness={0.12} />
        </mesh>
        <mesh position={[0, y + height / 2 + 0.02, 0]}>
          <torusGeometry args={[Math.min(width, depth) / 2.7, 0.025, 8, 32]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.25} />
        </mesh>
      </group>
    )
  }

  if (shape === 'tray' || shape === 'drawer') {
    return (
      <group>
        <mesh position={[0, y, 0]} castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={base} roughness={0.66} metalness={0.1} />
        </mesh>
        <mesh position={[0, y + (surface === 'under' ? -height / 2 - 0.015 : height / 2 + 0.018), 0]}>
          <boxGeometry args={[width * 0.72, 0.035, depth * 0.62]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.18} />
        </mesh>
      </group>
    )
  }

  if (shape === 'hook') {
    return (
      <group>
        <mesh position={[-width * 0.2, y, 0]} castShadow>
          <boxGeometry args={[width * 0.42, height, depth * 0.38]} />
          <meshStandardMaterial color={base} roughness={0.6} metalness={0.16} />
        </mesh>
        <mesh position={[width * 0.2, y + (surface === 'under' ? -0.05 : 0.05), 0]}>
          <torusGeometry args={[Math.min(width, depth) * 0.32, 0.045, 10, 28, Math.PI * 1.25]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.16} />
        </mesh>
      </group>
    )
  }

  if (shape === 'rail' || shape === 'clip' || shape === 'brick') {
    return (
      <group>
        <mesh position={[0, y, 0]} castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={base} roughness={0.64} metalness={0.14} />
        </mesh>
        <mesh position={[0, y - height / 2 - 0.025, 0]}>
          <boxGeometry args={[width * 0.82, 0.05, depth * 0.28]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.2} />
        </mesh>
      </group>
    )
  }

  return (
    <group>
      <mesh position={[0, y, 0]} castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={base} roughness={0.58} metalness={0.16} />
      </mesh>
      <mesh position={[-width * 0.22, y + height / 2 + 0.025, 0]}>
        <torusGeometry args={[Math.min(width, depth) * 0.22, 0.025, 8, 24]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.24} />
      </mesh>
    </group>
  )
}

function SceneContents({ setup, selectedItemId, viewMode, onSelectItem, onMoveItem }: Desk3DSceneProps) {
  const allItems = [...setup.topItems, ...setup.underItems]
  const cameraPosition = viewMode === 'under'
    ? [5.8, -3.1, 7.4]
    : viewMode === 'top'
      ? [0, 8.6, 0.1]
      : [8, 6.8, 9]

  return (
    <>
      <PerspectiveCamera makeDefault position={cameraPosition as [number, number, number]} fov={42} />
      <color attach="background" args={['#08090c']} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 8, 4]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-4, 3, -5]} intensity={18} color="#38BDF8" />
      <pointLight position={[5, 2, 4]} intensity={12} color="#A3FF12" />
      <CameraRig setup={setup} viewMode={viewMode} selectedItemId={selectedItemId} />
      <group>
        <DeskTable setup={setup} />
        {allItems.map((item) => (
          <ProductMesh
            key={item.id}
            item={item}
            setup={setup}
            selected={item.id === selectedItemId}
            onSelect={onSelectItem}
            onMove={onMoveItem}
          />
        ))}
      </group>
      <Grid position={[0, -1.95, 0]} args={[18, 18]} cellSize={0.5} cellThickness={0.4} cellColor="#233042" sectionSize={2} sectionColor="#A3FF12" fadeDistance={18} fadeStrength={1.6} />
      <ContactShadows position={[0, -2, 0]} opacity={0.38} scale={18} blur={2.8} far={5} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={18}
        maxPolarAngle={viewMode === 'under' ? Math.PI : Math.PI / 2.05}
      />
    </>
  )
}

export function Desk3DScene(props: Desk3DSceneProps) {
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    const ok = canUseWebGL()
    setSupported(ok)
    if (!ok) props.onFallback?.()
  }, [props])

  if (!supported) {
    return (
      <div className={cn('flex h-full min-h-[360px] items-center justify-center rounded-lg border border-white/10 bg-[#111116] p-6 text-center', props.className)}>
        <div>
          <p className="text-lg font-black text-white">Pré-visualização 3D indisponível</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/58">O teu dispositivo não disponibilizou WebGL. Mantemos o editor 2D para poderes continuar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative h-full min-h-[360px] overflow-hidden rounded-lg bg-[#08090c]', props.className)}>
      <Canvas shadows dpr={[1, 1.6]} onCreated={({ gl }) => gl.setClearColor('#08090c')} onError={props.onFallback}>
        <SceneContents {...props} />
      </Canvas>
      <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-white/10 bg-black/35 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/60 backdrop-blur-md">
        Preview 3D aproximado
      </div>
    </div>
  )
}
