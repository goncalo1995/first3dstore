'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Layers3, Ruler, Sparkles } from 'lucide-react'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'

const benefits = [
  {
    title: 'A medida',
    copy: 'Diga-nos o texto, nos calculamos os suportes e caracteres exatos. Sem sobras de letras que nunca vai usar.',
    icon: Ruler,
  },
  {
    title: 'Modular',
    copy: 'Calhas expansíveis de 25cm. Mude precos, categorias ou mensagens sem refazer o menu inteiro.',
    icon: Layers3,
  },
  {
    title: 'Instalacao limpa',
    copy: 'Fixacao com fita dupla face 3D industrial. Sem furos, sem po e sem obras no espaco.',
    icon: BadgeCheck,
  },
]

const showcaseRows = [
  { label: 'ESPRESSO', detail: '1,50' },
  { label: 'CAPPUCCINO', detail: '2,80' },
  { label: 'PAO DE QUEIJO', detail: '3,20' },
]

const gallery = [
  {
    title: 'Cafetarias',
    copy: 'Menus compactos, precos legiveis e atualizacoes rapidas.',
    image: '/about/products.jpg',
  },
  {
    title: 'Espacos comerciais',
    copy: 'Sinaletica interior com acabamento fisico e presenca premium.',
    image: '/about/workshop.jpg',
  },
  {
    title: 'Producao local',
    copy: 'Segmentos pensados para impressao 3D, controlo de cor e embalagem simples.',
    image: '/about/printer.jpg',
  },
]

function MenuRailPreview() {
  return (
    <div className="w-full max-w-2xl space-y-3">
      {showcaseRows.map((row, rowIndex) => (
        <div key={row.label} className="relative h-14 overflow-hidden rounded-md border border-white/15 bg-[#111111] shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${rowIndex === 0 ? 3 : 4},minmax(0,1fr))` }}>
            {Array.from({ length: rowIndex === 0 ? 3 : 4 }).map((_, index) => (
              <span key={index} className="border-r border-white/10 last:border-r-0" />
            ))}
          </div>
          <div className="absolute inset-x-5 top-1/2 flex -translate-y-1/2 items-center justify-between gap-4 text-sm font-black tracking-[0.12em] text-white sm:text-base">
            <span className="truncate">{row.label}</span>
            <span className="shrink-0 text-[#d4af37]">{row.detail}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f8f7f3] text-[#171717]">
      <Header />

      <section className="relative min-h-[82svh] overflow-hidden px-5 py-16 sm:px-8 lg:px-10">
        <Image
          src="/about/workshop.jpg"
          alt="Produto EM3D em ambiente de oficina e preparacao para espacos comerciais"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,7,0.86),rgba(8,8,7,0.58)_48%,rgba(8,8,7,0.18)),linear-gradient(180deg,rgba(8,8,7,0.12),rgba(8,8,7,0.74))]" />
        <div className="relative mx-auto flex min-h-[calc(82svh-8rem)] max-w-[1500px] flex-col justify-end gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl pb-4 text-white">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af37]">
              <Sparkles className="size-4" />
              Menus modulares em3d
            </p>
            <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.96] tracking-tight sm:text-7xl lg:text-8xl">
              Menus de Parede Modernos
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/78 sm:text-xl">
              O sistema de sinaletica 3D a medida do seu negocio. Pague apenas os caracteres que precisa, com instalacao invisivel e design premium.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 bg-white px-7 text-base text-[#111111] hover:bg-[#d4af37]">
                <Link href="/colecoes/menus">
                  Crie o Seu Menu
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 border-white/30 bg-white/8 px-7 text-base text-white hover:bg-white/16">
                <Link href="/colecoes/modular/builder">Abrir calculadora</Link>
              </Button>
            </div>
          </div>
          <div className="w-full max-w-xl pb-4">
            <MenuRailPreview />
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b5a2b]">Como funciona</p>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Compra exata. Instalacao simples. Presenca fisica.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <article key={benefit.title} className="border-t border-black/12 pt-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-md bg-[#171717] text-white">
                      <Icon className="size-4" />
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">0{index + 1}</p>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{benefit.copy}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b5a2b]">Montra</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
                Feito para cafes, barbearias, showrooms e espacos que mudam.
              </h2>
            </div>
            <Button asChild size="lg" className="h-13 bg-[#171717] px-6 text-white hover:bg-[#2f2f2f]">
              <Link href="/colecoes/menus">
                Comecar por um template
                <ArrowRight className="size-5" />
              </Link>
            </Button>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {gallery.map((item) => (
              <article key={item.title} className="group overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/38 to-transparent" />
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{item.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:px-10 lg:pb-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 border-y border-black/10 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-[#7b5a2b]">
              <BadgeCheck className="size-4" />
              V1 texto
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
              A calculadora diz-lhe o que vai receber. A parede fica livre para organizar como quiser.
            </h2>
          </div>
          <Button asChild size="lg" className="h-13 bg-[#171717] px-6 text-white hover:bg-[#2f2f2f]">
            <Link href="/colecoes/modular/builder">Abrir calculadora</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}
