'use client'

import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls, useTexture } from '@react-three/drei'
import { SRGBColorSpace } from 'three'

type LightMode = 'desligada' | 'quente' | 'fria'

type LightboxPreviewProps = {
  imageUrl: string | null
  lightMode: LightMode
  planeSize: [number, number]
  frameColor?: string
}

const lightConfig: Record<LightMode, { color: string; emission: string; intensity: number; ambient: number }> = {
  desligada: { color: '#55524d', emission: '#000000', intensity: 0, ambient: 0.22 },
  quente: { color: '#fff0c8', emission: '#ffaa00', intensity: 1.05, ambient: 0.58 },
  fria: { color: '#eef7ff', emission: '#e6f2ff', intensity: 0.95, ambient: 0.62 },
}

function PhotoPlane({ imageUrl, lightMode, planeSize }: { imageUrl: string; lightMode: LightMode; planeSize: [number, number] }) {
  const texture = useTexture(imageUrl)
  const config = lightConfig[lightMode]

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.needsUpdate = true
  }, [texture])

  return (
    <mesh position={[0, 0.18, 0.081]}>
      <planeGeometry args={planeSize} />
      <meshStandardMaterial
        map={texture}
        color={config.color}
        emissive={config.emission}
        emissiveIntensity={config.intensity}
        roughness={lightMode === 'desligada' ? 0.9 : 0.34}
        metalness={0}
      />
    </mesh>
  )
}

function PlaceholderPlane({ lightMode, planeSize }: { lightMode: LightMode; planeSize: [number, number] }) {
  const config = lightConfig[lightMode]

  return (
    <mesh position={[0, 0.18, 0.081]}>
      <planeGeometry args={planeSize} />
      <meshStandardMaterial
        color={config.color}
        emissive={config.emission}
        emissiveIntensity={Math.max(0, config.intensity - 0.25)}
        roughness={0.75}
      />
    </mesh>
  )
}

function LightboxModel({ imageUrl, lightMode, planeSize, frameColor = '#171412' }: LightboxPreviewProps) {
  const [width, height] = planeSize
  const config = lightConfig[lightMode]
  const isOn = lightMode !== 'desligada'

  return (
    <group rotation={[-0.08, -0.35, 0]}>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.9, height + 0.9, 0.2]} />
        <meshStandardMaterial color={frameColor} roughness={0.58} metalness={0.02} />
      </mesh>

      <mesh position={[0, 0.18, 0.092]}>
        <boxGeometry args={[width + 0.18, height + 0.18, 0.06]} />
        <meshStandardMaterial color={isOn ? '#f5f0e8' : '#4c4a46'} roughness={0.7} />
      </mesh>

      <Suspense fallback={<PlaceholderPlane lightMode={lightMode} planeSize={planeSize} />}>
        {imageUrl ? (
          <PhotoPlane imageUrl={imageUrl} lightMode={lightMode} planeSize={planeSize} />
        ) : (
          <PlaceholderPlane lightMode={lightMode} planeSize={planeSize} />
        )}
      </Suspense>

      <mesh position={[0, -(height / 2) - 0.4, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[width + 1.35, 0.5, 0.78]} />
        <meshStandardMaterial color={frameColor} roughness={0.48} />
      </mesh>

      {isOn && (
        <pointLight position={[0, 0.25, 2.3]} intensity={4.8} color={config.emission} distance={18} />
      )}
    </group>
  )
}

export default function LightboxPreview(props: LightboxPreviewProps) {
  const config = lightConfig[props.lightMode]
  const isOn = props.lightMode !== 'desligada'
  const [isCoarsePointer, setIsCoarsePointer] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)')
    const update = () => setIsCoarsePointer(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return (
    <div
      className="h-full min-h-[360px] touch-pan-y overflow-hidden rounded-lg transition-[background,box-shadow] duration-500"
      style={{
        background: isOn
          ? `radial-gradient(circle at 50% 36%, ${config.emission}66 0%, #342820 32%, #121212 100%)`
          : 'radial-gradient(circle at 50% 36%, #3a3936 0%, #1c1b19 38%, #121212 100%)',
        boxShadow: isOn ? `0 0 80px ${config.emission}33` : '0 0 40px rgba(0,0,0,0.36)',
      }}
    >
      <Canvas camera={{ position: [0, 0.2, 18], fov: 42 }} shadows style={{ touchAction: 'pan-y' }}>
        <ambientLight intensity={config.ambient} />
        <directionalLight position={[5, 6, 8]} intensity={isOn ? 1.8 : 0.75} castShadow />
        <LightboxModel {...props} />
        <ContactShadows position={[0, -6, 0]} opacity={0.32} scale={18} blur={2.4} far={8} />
        <OrbitControls enablePan={false} enableRotate={!isCoarsePointer} enableZoom={!isCoarsePointer} minDistance={13} maxDistance={24} />
      </Canvas>
    </div>
  )
}
