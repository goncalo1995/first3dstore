'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls, PerspectiveCamera, RoundedBox, Text } from '@react-three/drei'
import type { Group } from 'three'
import { MathUtils, Vector3 } from 'three'

export type CinematicSceneState = {
  section: 'hero' | 'materials' | 'variants' | 'engraving' | 'checkout'
  progress: number
  reducedMotion: boolean
}

type CinematicProductCanvasProps = {
  sceneState: CinematicSceneState
  onFallback?: () => void
}

const cameraTargets: Record<CinematicSceneState['section'], { position: [number, number, number]; lookAt: [number, number, number] }> = {
  hero: { position: [3.4, 2.2, 5.2], lookAt: [0, 0.72, 0] },
  materials: { position: [4.4, 1.75, 3.6], lookAt: [0, 0.72, 0] },
  variants: { position: [-3.7, 1.95, 4.1], lookAt: [0, 0.76, 0] },
  engraving: { position: [0.55, 2.55, 3.15], lookAt: [0, 0.55, 0] },
  checkout: { position: [2.65, 1.45, 3.15], lookAt: [0, 0.68, 0] },
}

function CameraRig({ sceneState }: { sceneState: CinematicSceneState }) {
  const lookAtRef = useRef(new Vector3(0, 0.72, 0))

  useFrame(({ camera }, delta) => {
    const target = cameraTargets[sceneState.section]
    const nextPosition = new Vector3(...target.position)
    const nextLookAt = new Vector3(...target.lookAt)
    const amount = sceneState.reducedMotion ? 1 : 1 - Math.exp(-delta * 3.4)

    camera.position.lerp(nextPosition, amount)
    lookAtRef.current.lerp(nextLookAt, amount)
    camera.lookAt(lookAtRef.current)
  })

  return null
}

function HeadsetStandSilhouette({ sceneState }: { sceneState: CinematicSceneState }) {
  const groupRef = useRef<Group>(null)
  const highlightEngraving = sceneState.section === 'engraving'
  const showClampHint = sceneState.section === 'variants' || sceneState.section === 'checkout'

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const baseRotation = sceneState.progress * Math.PI * 1.35
    const float = sceneState.reducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.2) * 0.035
    groupRef.current.rotation.y = MathUtils.lerp(groupRef.current.rotation.y, baseRotation, sceneState.reducedMotion ? 1 : 0.045)
    groupRef.current.position.y = float
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <RoundedBox args={[1.9, 0.18, 1.16]} radius={0.08} smoothness={8} position={[0, 0.09, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#0b0d10" roughness={0.58} metalness={0.12} />
      </RoundedBox>

      <RoundedBox args={[0.36, 1.72, 0.34]} radius={0.16} smoothness={12} position={[0, 0.94, -0.08]} castShadow>
        <meshStandardMaterial color="#111318" roughness={0.52} metalness={0.16} />
      </RoundedBox>

      <RoundedBox args={[1.42, 0.3, 0.36]} radius={0.16} smoothness={12} position={[0.42, 1.74, -0.08]} castShadow>
        <meshStandardMaterial color="#111318" roughness={0.52} metalness={0.16} />
      </RoundedBox>

      <RoundedBox args={[0.28, 0.52, 0.34]} radius={0.12} smoothness={10} position={[1.08, 1.46, -0.08]} castShadow>
        <meshStandardMaterial color="#111318" roughness={0.54} metalness={0.14} />
      </RoundedBox>

      <RoundedBox args={[1.02, 0.055, 0.07]} radius={0.025} smoothness={6} position={[0, 0.25, 0.59]} castShadow>
        <meshStandardMaterial color="#a3ff12" emissive="#a3ff12" emissiveIntensity={0.38} roughness={0.42} />
      </RoundedBox>

      <RoundedBox args={[0.44, 0.06, 0.08]} radius={0.03} smoothness={6} position={[0.44, 1.58, 0.12]} castShadow>
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.22} roughness={0.45} />
      </RoundedBox>

      {showClampHint && (
        <group position={[-0.96, 0.42, 0]}>
          <RoundedBox args={[0.36, 0.64, 1.08]} radius={0.09} smoothness={8} castShadow>
            <meshStandardMaterial color="#151820" roughness={0.56} metalness={0.12} />
          </RoundedBox>
          <mesh position={[-0.02, -0.44, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.075, 0.86, 24]} />
            <meshStandardMaterial color="#a3ff12" emissive="#a3ff12" emissiveIntensity={0.18} roughness={0.48} />
          </mesh>
        </group>
      )}

      {highlightEngraving && (
        <group position={[0, 0.36, 0.665]} rotation={[-0.18, 0, 0]}>
          <RoundedBox args={[1.18, 0.22, 0.045]} radius={0.04} smoothness={6} castShadow>
            <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.12} />
          </RoundedBox>
          <Text
            position={[0, 0.01, 0.028]}
            rotation={[0, 0, 0]}
            fontSize={0.105}
            letterSpacing={0}
            anchorX="center"
            anchorY="middle"
            color="#f4f7fb"
          >
            EM3D
          </Text>
        </group>
      )}
    </group>
  )
}

function CinematicScene({ sceneState }: { sceneState: CinematicSceneState }) {
  const background = useMemo(() => sceneState.section === 'checkout' ? '#040404' : '#050505', [sceneState.section])

  return (
    <>
      <PerspectiveCamera makeDefault position={[3.4, 2.2, 5.2]} fov={45} />
      <color attach="background" args={[background]} />
      <ambientLight intensity={0.42} />
      <directionalLight position={[3.8, 5.2, 3.4]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-2.8, 1.8, 3.2]} intensity={10} color="#38bdf8" />
      <pointLight position={[2.8, 1.2, -2.4]} intensity={8} color="#a3ff12" />
      <Environment preset="studio" environmentIntensity={0.7} />
      <CameraRig sceneState={sceneState} />
      <HeadsetStandSilhouette sceneState={sceneState} />
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.4, 80]} />
        <meshStandardMaterial color="#050505" roughness={0.82} metalness={0.04} />
      </mesh>
      <ContactShadows position={[0, 0.01, 0]} resolution={1024} scale={7} blur={2.2} opacity={0.46} far={6} color="#000000" />
      <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
    </>
  )
}

export function CinematicProductCanvas({ sceneState, onFallback }: CinematicProductCanvasProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      className="fixed inset-0 z-0 bg-[#050505]"
      onCreated={({ gl }) => {
        gl.setClearColor('#050505')
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault()
          onFallback?.()
        }, { once: true })
      }}
      onError={onFallback}
    >
      <CinematicScene sceneState={sceneState} />
    </Canvas>
  )
}
