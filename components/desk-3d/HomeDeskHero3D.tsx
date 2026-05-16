'use client'

import { useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { DeskFallbackTeaser } from './DeskFallbackTeaser'
import { canUseWebGL, prefersReducedMotion } from './webgl'

function HeroScene() {
  const reduced = useMemo(() => prefersReducedMotion(), [])

  useFrame(({ camera, clock }) => {
    if (reduced) return
    camera.position.x = 5.6 + Math.sin(clock.elapsedTime * 0.24) * 0.42
    camera.position.z = 7.2 + Math.cos(clock.elapsedTime * 0.2) * 0.34
    camera.lookAt(0, 0, 0)
  })

  return (
    <>
      <PerspectiveCamera makeDefault position={[5.6, 4.8, 7.2]} fov={42} />
      <color attach="background" args={['#08090c']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 7, 4]} intensity={2.3} castShadow />
      <pointLight position={[-3, 2, 4]} intensity={18} color="#38BDF8" />
      <pointLight position={[4, 1.5, -2]} intensity={12} color="#A3FF12" />
      <Environment preset="city" />
      <group rotation={[0, -0.2, 0]}>
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[5.8, 0.24, 3.35]} />
          <meshStandardMaterial color="#352419" roughness={0.68} metalness={0.08} />
        </mesh>
        <mesh position={[-1.65, 0.32, -0.8]} castShadow>
          <boxGeometry args={[0.78, 0.24, 0.42]} />
          <meshStandardMaterial color="#0B0D10" roughness={0.58} />
        </mesh>
        <mesh position={[-1.82, 0.48, -0.8]}>
          <torusGeometry args={[0.14, 0.018, 8, 28]} />
          <meshStandardMaterial color="#A3FF12" emissive="#A3FF12" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0.72, 0.45, -0.76]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.65, 32]} />
          <meshStandardMaterial color="#0B0D10" roughness={0.6} />
        </mesh>
        <mesh position={[0.72, 0.8, -0.76]}>
          <torusGeometry args={[0.18, 0.018, 8, 28]} />
          <meshStandardMaterial color="#9A6A3D" />
        </mesh>
        <mesh position={[1.45, 0.29, 0.78]} castShadow>
          <boxGeometry args={[1.1, 0.22, 0.7]} />
          <meshStandardMaterial color="#0B0D10" roughness={0.62} />
        </mesh>
        <mesh position={[1.45, 0.43, 0.78]}>
          <boxGeometry args={[0.76, 0.05, 0.4]} />
          <meshStandardMaterial color="#A3FF12" emissive="#A3FF12" emissiveIntensity={0.22} />
        </mesh>
        <mesh position={[-0.3, -0.34, 0.84]} castShadow>
          <boxGeometry args={[1.7, 0.18, 0.42]} />
          <meshStandardMaterial color="#111827" roughness={0.54} metalness={0.12} />
        </mesh>
        <mesh position={[-0.3, -0.47, 0.84]}>
          <boxGeometry args={[1.35, 0.04, 0.12]} />
          <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={0.28} />
        </mesh>
        <mesh position={[2.4, -1.1, 1.25]} castShadow>
          <cylinderGeometry args={[0.06, 0.09, 2.4, 12]} />
          <meshStandardMaterial color="#111116" roughness={0.6} metalness={0.22} />
        </mesh>
        <mesh position={[-2.4, -1.1, 1.25]} castShadow>
          <cylinderGeometry args={[0.06, 0.09, 2.4, 12]} />
          <meshStandardMaterial color="#111116" roughness={0.6} metalness={0.22} />
        </mesh>
        <mesh position={[2.4, -1.1, -1.25]} castShadow>
          <cylinderGeometry args={[0.06, 0.09, 2.4, 12]} />
          <meshStandardMaterial color="#111116" roughness={0.6} metalness={0.22} />
        </mesh>
        <mesh position={[-2.4, -1.1, -1.25]} castShadow>
          <cylinderGeometry args={[0.06, 0.09, 2.4, 12]} />
          <meshStandardMaterial color="#111116" roughness={0.6} metalness={0.22} />
        </mesh>
      </group>
      <ContactShadows position={[0, -1.95, 0]} opacity={0.4} scale={8} blur={2.5} />
      <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
    </>
  )
}

export function HomeDeskHero3D() {
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    setSupported(canUseWebGL())
  }, [])

  if (!supported) return <DeskFallbackTeaser className="h-auto w-full max-w-[560px]" />

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-white/10 bg-[#08090c]">
      <Canvas shadows dpr={[1, 1.5]} onError={() => setSupported(false)}>
        <HeroScene />
      </Canvas>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-primary/24 bg-primary/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-primary backdrop-blur-md">
        Preview 3D
      </div>
    </div>
  )
}
