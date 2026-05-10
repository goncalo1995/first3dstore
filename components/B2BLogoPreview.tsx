'use client'

import { Suspense, useEffect, useState } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, useTexture } from '@react-three/drei'
import { TextureLoader } from 'three'

function LogoPlane({ logoUrl }: { logoUrl: string }) {
  const texture = useTexture(logoUrl)
  // Use the same texture as displacement map to simulate embossed effect
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[2, 2, 256, 256]} />
      <meshStandardMaterial
        map={texture}
        displacementMap={texture}
        displacementScale={0.15}
        roughness={0.4}
        metalness={0.05}
        color="#f5f5f5"
        emissive="#ffaa00"
        emissiveIntensity={0.3}
      />
    </mesh>
  )
}

export default function B2BLogoPreview({
  imageUrl,
  isGenerating = false,
}: {
  imageUrl?: string | null
  isGenerating?: boolean
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!imageUrl) {
      setPreviewUrl(null)
      return
    }
    setPreviewUrl(imageUrl)
  }, [imageUrl])

  if (isGenerating) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-border bg-secondary/20">
        <div className="text-center">
          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">A gerar pré-visualização 3D…</p>
        </div>
      </div>
    )
  }

  if (!previewUrl) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-border bg-secondary/20">
        <p className="text-sm text-muted-foreground">
          Carregue o seu logótipo para ver uma pré-visualização 3D
        </p>
      </div>
    )
  }

  return (
    <div className="h-96 w-full rounded-lg border border-border bg-black/90">
      <Canvas camera={{ position: [2, 2, 3], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 5, 3]} intensity={1} />
        <Suspense fallback={null}>
          <LogoPlane logoUrl={previewUrl} />
        </Suspense>
        <OrbitControls enableZoom enablePan autoRotate autoRotateSpeed={2} />
      </Canvas>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Arraste para rodar – visualização 3D aproximada.
      </p>
    </div>
  )
}