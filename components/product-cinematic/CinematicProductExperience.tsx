'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { ArrowLeft, ArrowRight, BadgeCheck, Box, Palette, Sparkles, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Product } from '@/lib/products'
import { canUseWebGL } from '@/components/desk-3d/webgl'
import type { CinematicSceneState } from './CinematicProductCanvas'

const LazyCinematicProductCanvas = dynamic(
  () => import('./CinematicProductCanvas').then((mod) => mod.CinematicProductCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-0 flex items-center justify-center bg-[#050505] text-sm font-bold uppercase tracking-[0.18em] text-white/40">
        A preparar cena 3D
      </div>
    ),
  },
)

export type CinematicProductExperienceProps = {
  product: Product
  fallbackHref?: string
}

const sections: Array<{
  id: CinematicSceneState['section']
  kicker: string
  title: string
  text: string
  icon: typeof Sparkles
}> = [
  {
    id: 'hero',
    kicker: 'Suporte de auscultadores',
    title: 'Uma peça para elevar o setup.',
    text: 'Uma pré-visualização cinematográfica do novo fluxo EM3D: menos escolhas, mais presença, compra mais direta.',
    icon: Sparkles,
  },
  {
    id: 'materials',
    kicker: 'Materiais',
    title: 'Acabamento mate, detalhe preciso.',
    text: 'A cena 3D começa simples e leve, com geometria procedural pensada para carregar bem em mobile.',
    icon: Palette,
  },
  {
    id: 'variants',
    kicker: 'Versões',
    title: 'De mesa ou com aperto.',
    text: 'O objetivo da próxima fase é alternar variantes sem voltar à complexidade de grelhas, colisões ou multi-objetos.',
    icon: Box,
  },
  {
    id: 'engraving',
    kicker: 'Gravação',
    title: 'Personalização pequena, impacto grande.',
    text: 'A gravação será curta, validada e fácil de produzir. O foco é transformar uma escolha simples num momento premium.',
    icon: Type,
  },
  {
    id: 'checkout',
    kicker: 'Preview seguro',
    title: 'Ainda escondido. Pronto para validar.',
    text: 'Este preview não substitui o configurador clássico. Serve para provar performance, direção visual e scroll rig.',
    icon: BadgeCheck,
  },
]

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function getSectionFromProgress(progress: number): CinematicSceneState['section'] {
  if (progress < 0.2) return 'hero'
  if (progress < 0.42) return 'materials'
  if (progress < 0.62) return 'variants'
  if (progress < 0.82) return 'engraving'
  return 'checkout'
}

function CinematicFallback({ product, fallbackHref }: Required<CinematicProductExperienceProps>) {
  return (
    <main className="min-h-screen bg-[#050505] px-5 py-6 text-white sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col justify-between">
        <nav className="flex items-center justify-between gap-4">
          <Button asChild variant="ghost" className="pointer-events-auto px-0 text-white/70 hover:bg-transparent hover:text-white">
            <Link href="/">
              <ArrowLeft className="mr-2 size-4" />
              EM3D
            </Link>
          </Button>
          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white/58">
            Preview 3D
          </span>
        </nav>

        <section className="py-20">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-primary">{product.name}</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-tight text-white sm:text-7xl">
            A experiência 3D não carregou neste dispositivo.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/64">
            Sem problema. O configurador clássico continua disponível e é o caminho seguro para personalizar este produto.
          </p>
          <Button asChild size="lg" className="mt-8 h-13 bg-primary px-7 font-black text-primary-foreground hover:bg-primary/90">
            <Link href={fallbackHref}>
              Voltar ao configurador clássico
              <ArrowRight className="ml-2 size-5" />
            </Link>
          </Button>
        </section>

        <div className="border-t border-white/10 py-5 text-sm text-white/42">
          Preview experimental. Sem pagamento nesta página.
        </div>
      </div>
    </main>
  )
}

export function CinematicProductExperience({
  product,
  fallbackHref = '/criar/headset-stand',
}: CinematicProductExperienceProps) {
  const reducedMotion = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll()
  const [webglAvailable, setWebglAvailable] = useState(true)
  const [sceneState, setSceneState] = useState<CinematicSceneState>({
    section: 'hero',
    progress: 0,
    reducedMotion,
  })

  useEffect(() => {
    setWebglAvailable(canUseWebGL())
  }, [])

  useEffect(() => {
    setSceneState((current) => ({ ...current, reducedMotion }))
  }, [reducedMotion])

  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    setSceneState({
      section: getSectionFromProgress(progress),
      progress,
      reducedMotion,
    })
  })

  const activeSection = useMemo(
    () => sections.find((section) => section.id === sceneState.section) ?? sections[0],
    [sceneState.section],
  )
  const price = product.salePrice ?? product.priceFrom

  if (!webglAvailable) {
    return <CinematicFallback product={product} fallbackHref={fallbackHref} />
  }

  return (
    <main className="relative min-h-[500vh] bg-[#050505] text-white">
      <LazyCinematicProductCanvas sceneState={sceneState} onFallback={() => setWebglAvailable(false)} />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 px-4 py-4 sm:px-6">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/28 px-3 py-2 backdrop-blur-xl">
          <Button asChild variant="ghost" className="pointer-events-auto h-10 px-2 text-white/72 hover:bg-white/10 hover:text-white">
            <Link href="/">
              <ArrowLeft className="mr-2 size-4" />
              EM3D
            </Link>
          </Button>
          <div className="hidden min-w-0 flex-1 text-center sm:block">
            <p className="truncate text-sm font-black text-white">{product.name}</p>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/42">Experiência 3D experimental</p>
          </div>
          <Button asChild className="pointer-events-auto h-10 bg-primary px-4 font-black text-primary-foreground hover:bg-primary/90">
            <Link href={fallbackHref}>Configurador clássico</Link>
          </Button>
        </nav>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 p-4 sm:p-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-lg border border-white/10 bg-black/40 p-3 shadow-[0_22px_90px_rgba(0,0,0,0.52)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{activeSection.kicker}</p>
            <p className="mt-1 truncate text-lg font-black text-white">{activeSection.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-sm font-bold text-white/72">
              Desde {formatPrice(price)}
            </span>
            <Button asChild className="pointer-events-auto h-11 shrink-0 bg-white px-4 font-black text-[#050505] hover:bg-white/90">
              <Link href={fallbackHref}>
                Voltar ao configurador clássico
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="pointer-events-none relative z-10">
        {sections.map((section, index) => (
          <section key={section.id} className="flex min-h-screen items-center px-5 py-28 sm:px-8">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.45, once: false }}
              transition={{ duration: reducedMotion ? 0 : 0.65, ease: 'easeOut' }}
              className={index % 2 === 0 ? 'ml-0 max-w-lg' : 'ml-auto max-w-lg'}
            >
              <div className="rounded-lg border border-white/10 bg-black/28 p-5 shadow-[0_22px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <section.icon className="size-6 text-primary" />
                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-primary">{section.kicker}</p>
                <h1 className="mt-3 text-4xl font-black leading-[0.96] tracking-tight text-white sm:text-6xl">
                  {section.title}
                </h1>
                <p className="mt-5 text-base leading-7 text-white/64">{section.text}</p>
                {section.id === 'checkout' && (
                  <Button asChild className="pointer-events-auto mt-6 h-12 bg-primary px-5 font-black text-primary-foreground hover:bg-primary/90">
                    <Link href={fallbackHref}>
                      Voltar ao configurador clássico
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </motion.div>
          </section>
        ))}
      </div>
    </main>
  )
}
