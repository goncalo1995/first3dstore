'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, BriefcaseBusiness, Heart, PawPrint, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HEXA_SIZES } from '@/types/hexa'

const heroImage = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1800&q=86'

const useCases = [
  {
    title: 'Família',
    text: 'Transforme férias, aniversários e pequenos momentos numa colmeia viva.',
    image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1000&q=86',
    icon: Heart,
  },
  {
    title: 'Pets',
    text: 'Retratos com personalidade para a parede que já é deles, sejamos honestos.',
    image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1000&q=86',
    icon: PawPrint,
  },
  {
    title: 'Escritórios e Lojas',
    text: 'Crie uma parede de equipa, clientes, campanhas ou memórias do espaço.',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=86',
    icon: BriefcaseBusiness,
  },
]

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f2ea] text-[#231f19]">
      <section className="relative min-h-[92vh] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-[#f7f2ea]" />

        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-between px-5 py-6 sm:px-8 lg:px-10">
          <nav className="flex items-center justify-between text-white">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em]">HexaMemória</p>
            </div>
            <Button asChild className="rounded-full bg-white text-[#231f19] hover:bg-[#f4eadc]">
              <Link href="/criar/hexa">
                Criar mosaico
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </nav>

          <div className="max-w-4xl pb-12 pt-24 text-white">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/16 px-4 py-2 text-sm backdrop-blur"
            >
              <Sparkles className="size-4" />
              Azulejos hexagonais 3D para fotos que crescem consigo
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="font-serif text-5xl font-bold leading-[0.96] sm:text-7xl lg:text-8xl"
            >
              A sua vida, peça a peça. Construa o seu mosaico hexagonal.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-6 max-w-2xl text-lg leading-8 text-white/90 sm:text-xl"
            >
              Escolha um tamanho, carregue as suas fotografias e veja a colmeia organizar-se automaticamente. Nós fabricamos cada peça para criar uma parede pessoal, modular e fácil de expandir.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="mt-8">
              <Button asChild className="h-12 rounded-full bg-[#d7a84f] px-6 text-base text-[#231f19] hover:bg-[#e8bd64]">
                <Link href="/criar/hexa">
                  Criar o meu mosaico
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9b6b42]">Tamanhos</p>
          <h2 className="mt-3 font-serif text-4xl font-bold sm:text-5xl">Três escalas, uma colmeia perfeita.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Object.values(HEXA_SIZES).map((size) => (
            <article key={size.label} className="rounded-lg border border-[#e4d8c7] bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex size-14 items-center justify-center bg-[#231f19] text-lg font-bold text-white [clip-path:polygon(50%_0%,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]">
                  {size.label}
                </div>
                <p className="text-2xl font-bold">{formatPrice(size.price)}</p>
              </div>
              <h3 className="text-xl font-semibold">{size.width} x {size.height}mm</h3>
              <p className="mt-2 leading-7 text-[#62574d]">{size.note}. Ideal para mosaicos com uma presença {size.label === 'XS' ? 'leve e colecionável' : size.label === 'S' ? 'equilibrada' : 'marcante'}.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-16 sm:px-8 md:grid-cols-3 lg:px-10">
        {useCases.map((item) => {
          const Icon = item.icon
          return (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              className="group overflow-hidden rounded-lg bg-white shadow-sm"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img src={item.image} alt={item.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              </div>
              <div className="p-5">
                <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-[#f0e1d0] text-[#8b5a32]">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 leading-7 text-[#62574d]">{item.text}</p>
              </div>
            </motion.article>
          )
        })}
      </section>

      <section className="border-y border-[#e2d8ca] bg-white px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9b6b42]">Sistema modular</p>
            <h2 className="mt-3 font-serif text-4xl font-bold sm:text-5xl">Sem obras. Sem molduras genéricas. Só uma composição sua.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {['Cole à parede', 'Troque fotografias', 'Expanda quando quiser'].map((text) => (
              <div key={text} className="rounded-lg border border-[#e7ded2] bg-[#fbf8f2] p-5">
                <p className="text-lg font-semibold">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
