'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Palette, Ruler, Sparkles } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'

const menuFeatures = [
  { label: 'Módulos de 25cm', icon: Ruler },
  { label: 'Cores por catálogo', icon: Palette },
  { label: 'Checkout ativo', icon: BadgeCheck },
]

const studioSignals = [
  'Sistemas físicos com acabamento editorial',
  'Peças produzidas localmente em pequenas séries',
  'Coleções pensadas para elevar o ambiente',
]

function ArtFormsPreview() {
  const gridLines = Array.from({ length: 9 })

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#080807] shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_16%,rgba(190,139,71,0.2),transparent_28%),radial-gradient(circle_at_80%_68%,rgba(169,169,161,0.14),transparent_30%)]" />
      <div className="absolute inset-8 border border-[#caa56a]/20" />
      <svg viewBox="0 0 640 520" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="artFormsMetal" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#d7c19a" />
            <stop offset="46%" stopColor="#b8734f" />
            <stop offset="100%" stopColor="#c8c8bd" />
          </linearGradient>
        </defs>
        {gridLines.map((_, index) => (
          <g key={index} opacity="0.18">
            <path d={`M${80 + index * 58} 70 L${260 + index * 58} 250 L${80 + index * 58} 430`} fill="none" stroke="#c8c8bd" strokeWidth="0.5" />
            <path d={`M${-90 + index * 76} 250 L${150 + index * 76} 70 L${390 + index * 76} 250 L${150 + index * 76} 430 Z`} fill="none" stroke="#b8734f" strokeWidth="0.5" />
          </g>
        ))}
        <g fill="none" stroke="url(#artFormsMetal)" strokeLinecap="round">
          <circle cx="320" cy="260" r="146" strokeWidth="1" opacity="0.85" />
          <circle cx="250" cy="260" r="88" strokeWidth="0.8" opacity="0.7" />
          <circle cx="390" cy="260" r="88" strokeWidth="0.8" opacity="0.7" />
          <circle cx="320" cy="190" r="88" strokeWidth="0.8" opacity="0.7" />
          <circle cx="320" cy="330" r="88" strokeWidth="0.8" opacity="0.7" />
          <path d="M320 92 L466 346 L174 346 Z" strokeWidth="1" opacity="0.92" />
          <path d="M174 174 L466 174 L320 428 Z" strokeWidth="1" opacity="0.62" />
          <path d="M205 260 H435 M320 116 V404 M222 162 L418 358 M418 162 L222 358" strokeWidth="0.5" opacity="0.7" />
        </g>
        <g fill="#d7c19a">
          <circle cx="320" cy="92" r="2.5" />
          <circle cx="466" cy="346" r="2.5" />
          <circle cx="174" cy="346" r="2.5" />
          <circle cx="320" cy="260" r="2.5" />
        </g>
      </svg>
      <div className="absolute left-5 top-5 rounded-full border border-[#caa56a]/30 bg-black/42 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#d7c19a] backdrop-blur-md">
        Collection 02
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/78 to-transparent p-6 pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c8c8bd]/70">Brevemente</p>
        <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">Art Forms</h3>
        <p className="mt-3 max-w-md text-sm leading-6 text-white/62">
          Uma futura coleção de arte mural 3D com geometrias, tipografia e remixes SVG assistidos por IA.
        </p>
      </div>
    </div>
  )
}

function MenuSystemPreview() {
  const rows = [
    { label: '01 - Um menu para o seu negócio', value: '123,45€' },
    { label: '02 - À sua medida', value: '999,99€' },
    { label: '03 - Soluções personalizadas', value: 'Preço sob consulta' },
  ]
  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-3xl border border-white/10 bg-[#d9d2c6] shadow-2xl">
      <Image
        src="/about/workshop.jpg"
        alt="Ambiente premium para sistema Menu3D"
        fill
        priority
        className="object-cover opacity-55"
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.82),rgba(255,255,255,0.28)_46%,rgba(22,18,13,0.38))]" />
      <div className="absolute inset-x-8 top-14 bottom-14 rounded-[1.6rem] border border-stone-950/10 bg-white/46 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-sm sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#59452b]">Menu3D</p>
          <p className="rounded-full border border-stone-900/10 bg-white/55 px-3 py-1 text-xs font-semibold text-stone-700">Sistema ativo</p>
        </div>
        <div className="mt-10 space-y-5">
          {rows.map((row, rowIndex) => (
            <div key={row.label} className="rounded-xl border border-black/8 bg-black/12 p-3">
              <div className="flex items-center justify-between gap-5 text-sm font-bold text-stone-950 sm:text-lg">
                <span className="truncate">{row.label}</span>
                {row.value && <span className="shrink-0">{row.value}</span>}
              </div>
              <div className="mt-3 flex h-4 overflow-hidden rounded-full shadow-[0_8px_18px_rgba(0,0,0,0.18)]">
                {Array.from({ length: rowIndex === 3 ? 4 : 5 }).map((_, index) => (
                  <span
                    key={index}
                    className={`flex-1 border-r border-white/12 last:border-r-0 ${index === 0 ? 'bg-[#161616]' : 'bg-[#2a2926]'}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f5f1e9] text-[#15130f]">
      <Header />

      <section className="relative overflow-hidden bg-[#0b0b09] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(186,142,76,0.22),transparent_30%),radial-gradient(circle_at_82%_8%,rgba(255,255,255,0.12),transparent_24%),linear-gradient(135deg,#0b0b09,#201b14_52%,#090908)]" />
        <div className="absolute inset-0 opacity-[0.11] [background-image:linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:62px_62px]" />

        <div className="relative mx-auto grid min-h-[calc(100vh-72px)] max-w-[1600px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(540px,1.08fr)] lg:px-10">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 border border-white/14 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/72 backdrop-blur-md">
              <Sparkles className="size-4 text-[#d7b06f]" />
              EM3D Collections
            </p>
            <h1 className="mt-7 font-serif text-5xl font-bold leading-[0.94] tracking-tight sm:text-7xl lg:text-8xl">
              Sistemas 3D premium para espaços com intenção.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
              Coleções físicas para menus, interiores, retail e arte aplicada. Desenhadas como sistemas, produzidas localmente, afinadas para parecerem inevitáveis no espaço.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 bg-[#d7b06f] px-7 text-base text-[#15100a] hover:bg-[#efc985]">
                <Link href="/colecoes/menus">
                  Explorar Menu3D
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 border-white/24 bg-white/7 px-7 text-base text-white hover:bg-white hover:text-[#111111]">
                <Link href="#colecoes">Ver coleções</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <MenuSystemPreview />
          </div>
        </div>
      </section>

      <section id="colecoes" className="px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-12 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b5a2b]">Coleções EM3D</p>
            <h2 className="mt-4 font-serif text-4xl font-bold tracking-tight sm:text-6xl">
              Produtos que funcionam como sistemas.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#6b6255]">
              Cada coleção começa com um caso de uso forte, materiais controlados e uma experiência de configuração simples.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Link href="/colecoes/menus" className="group overflow-hidden rounded-[2rem] border border-black/8 bg-[#11100d] text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
              <div className="grid min-h-[620px] lg:grid-cols-[0.9fr_1.1fr]">
                <div className="flex flex-col justify-between p-7 sm:p-9">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d7b06f]">Collection 01 · Active</p>
                    <h3 className="mt-5 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Menu3D</h3>
                    <p className="mt-5 text-base leading-7 text-white/68">
                      Um sistema modular para menus, tabelas de preços e letreiros interiores. Escolhe a largura, as cores, as letras e finaliza a encomenda.
                    </p>
                  </div>

                  <div className="mt-10 space-y-4">
                    {menuFeatures.map((feature) => {
                      const Icon = feature.icon
                      return (
                        <div key={feature.label} className="flex items-center gap-3 text-sm text-white/72">
                          <Icon className="size-4 text-[#d7b06f]" />
                          {feature.label}
                        </div>
                      )
                    })}
                    <div className="inline-flex items-center gap-2 pt-4 text-sm font-semibold text-[#d7b06f]">
                      Explorar Menu3D
                      <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>

                <div className="relative min-h-[380px] overflow-hidden bg-[#d8d1c3]">
                  <Image
                    src="/about/products.jpg"
                    alt="Sistema Menu3D em contexto de produto"
                    fill
                    className="object-cover opacity-72 transition duration-700 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(255,255,255,0.2),rgba(9,9,8,0.74))]" />
                  <div className="absolute bottom-7 left-7 right-7 rounded-2xl border border-white/12 bg-black/42 p-5 backdrop-blur-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">Live system</p>
                    <p className="mt-2 text-2xl font-semibold">Configuração premium para negócios.</p>
                  </div>
                </div>
              </div>
            </Link>

            <article className="overflow-hidden rounded-[2rem] border border-black/8 bg-[#15130f] text-white shadow-xl">
              <ArtFormsPreview />
              <div className="p-7 sm:p-9">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b8734f]">Collection 02 · Concept</p>
                    <h3 className="mt-4 font-serif text-4xl font-bold tracking-tight">Art Forms</h3>
                  </div>
                  <span className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/62">Brevemente</span>
                </div>
                <p className="mt-5 text-base leading-7 text-white/64">
                  Em desenvolvimento: arte mural 3D a partir de formas geométricas, tipografia e remixes SVG assistidos por IA. Ainda não está disponível para criar, gerar, carregar ficheiros ou comprar.
                </p>
                <Button type="button" disabled variant="outline" className="mt-7 h-12 border-white/16 bg-white/5 px-6 text-white/64">
                  Ver conceito
                </Button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-[#ebe4d7] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b5a2b]">Studio standard</p>
            <h2 className="mt-4 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Menos catálogo. Mais direção.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {studioSignals.map((signal, index) => (
              <div key={signal} className="border-t border-[#7b5a2b]/24 pt-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7b5a2b]/60">0{index + 1}</p>
                <p className="mt-4 text-lg font-semibold leading-7">{signal}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 border-y border-black/10 py-12 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7b5a2b]">Próximo passo</p>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              Começa pela coleção ativa.
            </h2>
            <p className="mt-3 max-w-2xl text-[#6b6255]">
              Menu3D já está pronto para configurar e encomendar. As próximas coleções aparecem apenas como conceito até estarem operacionalmente fechadas.
            </p>
          </div>
          <Button asChild size="lg" className="h-13 bg-[#15130f] px-7 text-white hover:bg-[#2a261f]">
            <Link href="/colecoes/menus">
              Explorar Menu3D
              <ArrowRight className="size-5" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}
