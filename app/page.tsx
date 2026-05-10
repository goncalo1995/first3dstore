'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, BriefcaseBusiness, Heart, PawPrint, Sparkles, Ruler, Grid3X3, Palette, CreditCard, PackageCheck, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HEXA_SIZES } from '@/types/hexa'
import FaqSection from '@/components/landing/FaqSection'
import { Footer } from '@/components/footer'

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

const processSteps = [
  {
    title: '1. Escolher tamanho',
    text: 'Seleccione XS, S ou M para definir a dimensão física de cada hexágono.',
    icon: Ruler,
  },
  {
    title: '2. Dispor as peças',
    text: 'Adicione hexágonos, reordene-os na lista e veja a colmeia a organizar-se automaticamente.',
    icon: Grid3X3,
  },
  {
    title: '3. Customizar',
    text: 'Ajuste a disposição, cor de cada hexágono e veja como fica com as suas imagens.',
    icon: Palette,
  },
  {
    title: '4. Finalizar encomenda',
    text: 'Preencha os dados de contacto e efectue o pagamento seguro com Stripe (cartão de crédito ou MBWay).',
    icon: CreditCard,
  },
  {
    title: '5. Produção 3D',
    text: 'Imprimimos cada hexágono individualmente com o material e a cor escolhidos.',
    icon: PackageCheck,
  },
  {
    title: '6. Envio e montagem',
    text: 'Recebe as peças em casa, com tiras adesivas, e monta o seu mosaico único.',
    icon: Truck,
  },
]

const galleryItems = [
  {
    title: 'Sala de Estar',
    alt: 'Living room setting',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Para transformar uma fotografia de família numa peça central acolhedora.',
    // detail: 'Funciona especialmente bem em aparadores, estantes e mesas laterais onde a luz ambiente já faz parte do ritual da casa.',
    className: 'md:col-span-2 md:row-span-2',
  },
  {
    title: 'Quarto de Bebé',
    alt: 'Nursery room setting',
    image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Uma luz suave para celebrar os primeiros meses, batizados ou retratos de recém-nascido.',
    // detail: 'O brilho âmbar fica discreto e íntimo, ideal para um presente emocional sem parecer demasiado decorativo.',
    className: 'md:col-span-2',
  },
  {
    title: 'Escritório',
    alt: 'Office setting',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Para ter uma memória pessoal no espaço de trabalho sem perder o aspeto profissional.',
    // detail: 'Combina bem com molduras mais sóbrias e bases escuras.',
    className: 'md:col-span-2',
  },
  {
    title: 'Quarto',
    alt: 'Bedroom setting',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Perfeito para fotografias de casal, viagens marcantes ou uma dedicatória privada.',
    // detail: 'A luz baixa cria uma presença tranquila, mais próxima de uma memória do que de um candeeiro comum.',
    className: 'md:col-span-2',
  },
  {
    title: 'Hall de Entrada',
    alt: 'Hallway setting',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Uma peça de boas-vindas para casas novas, ou recordações de família.',
    // detail: 'Boa opção para fotografias com silhuetas fortes ou arquitetura da casa.',
    className: 'md:col-span-2',
  },
  {
    title: 'Mapas Topográficos 3D',
    alt: '3D Topographic Map',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85',
    occasion: 'A próxima coleção para locais com significado: serra, praia, aldeia, trilho ou paisagem portuguesa.',
    detail: 'Brevemente. A coleção de abertura é Lithophane, focada em molduras luminosas e formatos de luz personalizados.',
    badge: 'Brevemente',
    className: 'md:col-span-4'
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
              <Button asChild className="h-12 rounded-full bg-primary px-6 text-base text-primary-foreground hover:bg-primary/90">
                <Link href="/criar/hexa">
                  Criar o meu mosaico
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="tamanhos" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Tamanhos</p>
          <h2 className="mt-3 font-serif text-4xl font-bold sm:text-5xl">Três escalas, uma colmeia perfeita.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {Object.values(HEXA_SIZES).map((size) => (
            <div key={size.label} className="relative group">
              {/* Hexagon shape using clip-path */}
              <div className="relative bg-white shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1"
                  style={{
                    clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)',
                    aspectRatio: '1 / 1.154', // ≈ 1 / (√3/2) for regular hex aspect
                  }}
              >
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <span className="text-5xl font-bold text-primary">{size.label}</span>
                  <span className="mt-2 text-2xl font-bold text-[#231f19]">{formatPrice(size.price)}</span>
                  <span className="mt-1 text-sm text-[#62574d]">{size.width} × {size.height} mm</span>
                  <p className="mt-3 text-xs text-[#62574d] max-w-[80%]">{size.note}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Só uma peça?</p>
          <h2 className="mt-3 font-serif text-4xl font-bold sm:text-5xl">Molduras individuais</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { title: 'Parede vertical', icon: '⬆️', desc: 'Para retratos, animais ou uma foto especial.' },
            { title: 'Parede horizontal', icon: '⬅️➡️', desc: 'Perfeita para paisagens ou grupos.' },
            { title: 'Secretária', icon: '🖥️', desc: 'Base incluída, ideal para escritório.' },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-[#e4d8c7] bg-white p-5 text-center shadow-sm">
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-[#62574d]">{item.desc}</p>
              <Button asChild variant="outline" size="sm" className="mt-4 border-primary text-primary hover:bg-primary/10">
                <Link href="/criar/hexa?size=S&single=true">Começar</Link>
              </Button>
            </div>
          ))}
        </div>
      </section> */}

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
              <div className="aspect-4/3 overflow-hidden">
                <img src={item.image} alt={item.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              </div>
              <div className="p-5">
                <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-secondary text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 leading-7 text-[#62574d]">{item.text}</p>
              </div>
            </motion.article>
          )
        })}
      </section>

      <section id="galeria" className="px-5 py-12 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.22em] text-primary">Get inspired</p>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white sm:text-5xl">Ideias para oferecer, decorar e guardar memórias com intenção.</h2>
            <p className="mt-4 font-sans text-lg leading-8 text-white/62">
              Cada formato ganha vida de maneira diferente consoante o espaço e a ocasião. Use estas ideias como ponto de partida para escolher a fotografia certa.
            </p>
          </div>
          <div className="grid auto-rows-[369px] gap-5 md:grid-cols-3">
            {galleryItems.map((item) => (
              <article key={item.title} className={`group relative overflow-hidden rounded-lg border border-white/10 bg-white/8 ${item.className}`}>
                <div className="absolute inset-0 overflow-hidden">
                  <img src={item.image} alt={item.alt} className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
                </div>
                <div className="absolute inset-0 bg-linear-to-t from-black/86 via-black/34 to-black/5" />
                {item.badge && (
                  <span className="absolute right-4 top-4 rounded-full border border-[#ffaa00]/35 bg-primary/16 px-3 py-1 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-[#ffd38b] backdrop-blur-md">
                    {item.badge}
                  </span>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="font-serif text-2xl font-bold text-white">{item.title}</p>
                  <p className="mt-2 max-w-xl font-sans text-sm leading-6 text-white/78">{item.occasion}</p>
                  <p className="mt-3 hidden max-w-xl font-sans text-xs leading-5 text-white/56 md:block">{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="relative border-y border-white/5 bg-white/[0.03] px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-5xl">Como Funciona</h2>
            <p className="mt-4 font-sans text-lg">Um processo simples para uma recordação eterna.</p>
          </div>
          <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {processSteps.map(({ title, text, icon: Icon }) => (
              <div key={title} className="group relative z-10 flex flex-col items-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-[#1f1f1f] transition-all duration-500 group-hover:border-[#ffaa00]/50 group-hover:shadow-[0_0_30px_rgba(255,170,0,0.15)]">
                  <Icon className="h-9 w-9 text-primary" />
                </div>
                <h3 className="font-serif text-2xl font-bold">{title}</h3>
                <p className="mt-3 max-w-[290px] font-sans text-sm leading-6">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#e2d8ca] bg-white px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Sistema modular</p>
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

      <FaqSection />
      <Footer />
    </main>
  )
}
