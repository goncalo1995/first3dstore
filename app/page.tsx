'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Layers, Palette, Ruler, Sparkles } from 'lucide-react'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'

const modularHighlights = [
  { label: 'Módulos de 25cm', icon: Ruler },
  { label: 'Cores por catálogo', icon: Palette },
  { label: 'Checkout ativo', icon: BadgeCheck },
]

const studioValues = [
  'Objetos úteis com presença premium para espaços comerciais.',
  'Produção local em pequenas séries, com materiais e cores controlados.',
  'Configuração simples antes da produção, para reduzir fricção e dúvidas.',
]

function ModularStudioPreview() {
  const rows = [
    { label: 'ESPRESSO', detail: '1,20€' },
    { label: 'FLAT WHITE', detail: '3,00€' },
    { label: 'MENU ALMOÇO', detail: '9,90€' },
  ]

  return (
    <div className="relative min-h-[500px] overflow-hidden rounded-lg border border-black/10 bg-[#f3f0ea] shadow-[0_28px_70px_rgba(15,15,14,0.14)]">
      <Image
        src="/about/workshop.jpg"
        alt="Oficina EM3D com peças personalizadas em produção"
        fill
        priority
        className="object-cover opacity-32"
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,255,255,0.58)_46%,rgba(246,242,235,0.9))]" />
      <div className="absolute inset-x-6 top-6 flex items-center justify-between gap-4 border-b border-black/10 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7b5a2b]">Collection 01</p>
        <p className="rounded-full border border-black/10 bg-white/72 px-3 py-1 text-xs font-semibold text-stone-700 backdrop-blur-sm">
          Sistema ativo
        </p>
      </div>
      <div className="absolute inset-x-6 bottom-6">
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.label} className="overflow-hidden rounded-lg border border-black/10 bg-[#12110f] shadow-[0_16px_34px_rgba(15,15,14,0.22)]">
              <div className="relative flex h-16">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span
                    key={index}
                    className={`relative flex-1 border-r border-white/10 last:border-r-0 ${index === 0 ? 'bg-[#0d0d0c]' : 'bg-[#24231f]'}`}
                  >
                    {index === 0 && <span className="absolute inset-y-3 left-3 w-1 rounded-full bg-white/20" />}
                    <span className="absolute inset-x-3 bottom-3 h-1 rounded-full bg-white/10" />
                  </span>
                ))}
                <div className="absolute inset-x-5 top-1/2 flex -translate-y-1/2 items-center justify-between gap-4 text-sm font-black tracking-[0.08em] text-[#f8f4e9] sm:text-lg">
                  <span className="truncate">{row.label}</span>
                  <span className="shrink-0 text-[#d4af37]">{row.detail}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-black/10 bg-white/76 p-4 text-sm leading-6 text-stone-600 backdrop-blur-sm">
          Sistema modular para menus, tabelas de preços e letreiros interiores.
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-[#171717]">
      <Header />

      <section className="bg-white px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-[1500px] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#7b5a2b]">
              <Sparkles className="size-4" />
              Premium custom items
            </p>
            <h1 className="mt-6 max-w-5xl font-sans text-5xl font-semibold leading-[0.98] tracking-tight text-[#171717] sm:text-7xl lg:text-8xl">
              Peças 3D premium para espaços com intenção.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600 sm:text-xl">
              Criamos objetos personalizados, sistemas de sinalética e pequenas séries com acabamento limpo, produção local e uma experiência de encomenda sem ruído.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 bg-[#171717] px-7 text-base text-white hover:bg-[#2f2f2f]">
                <Link href="/colecoes/modular">
                  Explorar Collection 01
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
            </div>
          </div>

          <ModularStudioPreview />
        </div>
      </section>

      <section className="border-y border-black/10 bg-[#f7f7f5] px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b5a2b]">Studio standard</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Custom, mas controlado.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {studioValues.map((value, index) => (
              <div key={value} className="border-t border-black/12 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">0{index + 1}</p>
                <p className="mt-4 text-lg font-medium leading-7 text-stone-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-[1500px] overflow-hidden rounded-lg border border-black/10 bg-[#111111] text-white shadow-[0_28px_70px_rgba(15,15,14,0.16)] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex flex-col justify-between p-7 sm:p-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af37]">Collection 01 · ativa</p>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">Sinalética Modular</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/68">
                Um sistema físico de calhas e letras para menus, preços, espaços e marca. Configura largura, cores e conteúdo antes de encomendar.
              </p>
            </div>
            <div className="mt-10 space-y-4">
              {modularHighlights.map((highlight) => {
                const Icon = highlight.icon
                return (
                  <div key={highlight.label} className="flex items-center gap-3 text-sm text-white/72">
                    <Icon className="size-4 text-[#d4af37]" />
                    {highlight.label}
                  </div>
                )
              })}
              <Button asChild size="lg" className="mt-4 h-13 bg-white px-6 text-[#171717] hover:bg-white/88">
                <Link href="/colecoes/modular">
                  Ver Sinalética Modular
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative min-h-[420px] border-t border-white/10 lg:border-l lg:border-t-0">
            <Image
              src="/about/products.jpg"
              alt="Peças EM3D produzidas localmente"
              fill
              className="object-cover opacity-80"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(17,17,17,0.1),rgba(17,17,17,0.68))]" />
            <div className="absolute bottom-6 left-6 right-6 rounded-lg border border-white/14 bg-black/44 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-sm font-semibold text-white/80">
                <Layers className="size-4 text-[#d4af37]" />
                Primeiro sistema pronto a configurar e comprar.
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
