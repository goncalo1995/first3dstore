'use client'

import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Cpu, Gauge, Headphones, PackageCheck, Printer, Ruler, ShieldCheck, Sparkles } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { DeskFallbackTeaser } from '@/components/desk-3d/DeskFallbackTeaser'

const HomeDeskHero3D = dynamic(
  () => import('@/components/desk-3d/HomeDeskHero3D').then((mod) => mod.HomeDeskHero3D),
  {
    ssr: false,
    loading: () => <DeskFallbackTeaser className="h-auto w-full max-w-[560px]" />,
  },
)

const variants = [
  {
    title: 'Base de Mesa',
    label: 'Tower',
    price: '29,90 EUR',
    image: 'https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?auto=format&fit=crop&w=1200&q=85',
    text: 'Uma presença vertical para setups premium, com base firme e espaço para gamertag.',
  },
  {
    title: 'Por baixo da mesa',
    label: 'Stealth',
    price: '24,90 EUR',
    image: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1200&q=85',
    text: 'Fica oculto, liberta a secretária e mantém os auscultadores sempre à mão.',
  },
  {
    title: 'Aperto com Rosca',
    label: 'Clamp',
    price: '34,90 EUR',
    image: 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?auto=format&fit=crop&w=1200&q=85',
    text: 'Fixação robusta sem furações, ideal para mesas grossas e setups em constante evolução.',
  },
]

const trustPoints = [
  { icon: ShieldCheck, title: 'Feito em Portugal', text: 'Produção local, sem séries anónimas.' },
  { icon: Gauge, title: 'Configuração rápida', text: 'Escolhe formato, cores e texto em minutos.' },
  { icon: Cpu, title: 'Estúdio 3D imersivo', text: 'Explora o setup como uma experiência visual, com fallback leve quando necessário.' },
]

const valueProps = [
  { icon: Ruler, title: 'À medida do teu espaço', text: 'Define a secretária e organiza cada peça com proporções reais.' },
  { icon: Printer, title: 'Peças impressas em 3D', text: 'Módulos leves, personalizáveis e produzidos localmente.' },
  { icon: PackageCheck, title: 'Setup completo num só pedido', text: 'Combina suportes, bandejas e organização num fluxo simples.' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
}

function DeskBuilderTeaser() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 560 420"
      className="h-auto w-full max-w-[560px]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="deskSurface" x1="82" y1="55" x2="484" y2="365" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4A3020" />
          <stop offset="0.55" stopColor="#211913" />
          <stop offset="1" stopColor="#141418" />
        </linearGradient>
        <linearGradient id="moduleDark" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#15171C" />
          <stop offset="1" stopColor="#050608" />
        </linearGradient>
        <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.64 0 0 0 0 1 0 0 0 0 0.07 0 0 0 0.65 0" />
          <feBlend in="SourceGraphic" />
        </filter>
      </defs>

      <rect x="28" y="24" width="504" height="372" rx="26" fill="#0F0F14" stroke="rgba(255,255,255,0.12)" />
      <rect x="60" y="58" width="440" height="286" rx="18" fill="url(#deskSurface)" stroke="rgba(255,255,255,0.16)" />
      <path d="M95 102H466M95 146H466M95 190H466M95 234H466M95 278H466" stroke="rgba(255,255,255,0.1)" />
      <path d="M118 82V321M174 82V321M230 82V321M286 82V321M342 82V321M398 82V321M454 82V321" stroke="rgba(255,255,255,0.08)" />

      <g filter="url(#softGlow)">
        <rect x="122" y="118" width="84" height="44" rx="10" fill="url(#moduleDark)" stroke="#A3FF12" strokeWidth="2" />
        <rect x="140" y="128" width="28" height="24" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" />
        <circle cx="154" cy="140" r="8" stroke="#A3FF12" strokeWidth="3" />
        <path d="M178 139H196" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
      </g>

      <g>
        <circle cx="356" cy="142" r="34" fill="url(#moduleDark)" stroke="rgba(255,255,255,0.2)" />
        <circle cx="356" cy="142" r="23" fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.22)" />
        <path d="M344 127V155M356 123V159M368 130V151" stroke="#9A6A3D" strokeWidth="6" strokeLinecap="round" />
      </g>

      <g>
        <rect x="248" y="220" width="116" height="70" rx="12" fill="url(#moduleDark)" stroke="rgba(255,255,255,0.2)" />
        <rect x="263" y="235" width="86" height="40" rx="8" fill="rgba(0,0,0,0.28)" stroke="rgba(255,255,255,0.16)" />
        <path d="M335 236V274" stroke="#A3FF12" strokeWidth="7" strokeLinecap="round" />
      </g>

      <g>
        <rect x="414" y="222" width="48" height="78" rx="12" fill="url(#moduleDark)" stroke="rgba(255,255,255,0.22)" />
        <path d="M431 238V282" stroke="#38BDF8" strokeWidth="8" strokeLinecap="round" />
        <path d="M437 276C454 276 454 257 443 255" stroke="#38BDF8" strokeWidth="7" strokeLinecap="round" />
      </g>

      <rect x="92" y="360" width="118" height="18" rx="9" fill="rgba(163,255,18,0.16)" stroke="rgba(163,255,18,0.34)" />
      <rect x="224" y="360" width="86" height="18" rx="9" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)" />
      <rect x="324" y="360" width="144" height="18" rx="9" fill="rgba(56,189,248,0.14)" stroke="rgba(56,189,248,0.28)" />
    </svg>
  )
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#09090b] text-white">
      <Header />

      <section className="relative min-h-[calc(100svh-4rem)] px-5 py-14 sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(163,255,18,0.18),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.14),transparent_30%),linear-gradient(180deg,#09090b_0%,#0d0d12_52%,#09090b_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] opacity-35" />

        <div className="relative z-10 mx-auto grid min-h-[calc(100svh-11rem)] max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_520px]">
          <motion.div initial="hidden" animate="visible" transition={{ staggerChildren: 0.12 }} className="pt-8">
            <motion.p
              variants={fadeUp}
              className="inline-flex w-fit items-center gap-2 border border-white/12 bg-white/7 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white/78 backdrop-blur-xl"
            >
              <Sparkles className="size-4 text-primary" />
              EM3D Desk Studio
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-7 max-w-5xl text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-8xl"
            >
              Constrói a tua secretária ideal.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-7 max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
              Organiza a tua secretária por cima e por baixo com peças modulares impressas em 3D, feitas para o teu setup.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 bg-primary px-7 text-base font-bold text-primary-foreground shadow-[0_0_34px_rgba(163,255,18,0.24)] hover:bg-primary/90">
                <Link href="/criar/desk" aria-label="Criar o meu setup de secretária">
                  Criar o meu setup
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 border-white/15 bg-white/6 px-7 text-base text-white hover:bg-white hover:text-[#09090b]">
                <Link href="#variantes" aria-label="Ver produtos disponíveis">Ver produtos</Link>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="relative mx-auto w-full max-w-[520px]"
          >
            <div className="absolute -inset-10 bg-[radial-gradient(circle,rgba(163,255,18,0.18),transparent_58%)] blur-2xl" />
            <div className="relative overflow-hidden rounded-lg border border-white/12 bg-white/8 p-4 shadow-2xl backdrop-blur-xl">
              <div className="rounded-md border border-white/10 bg-[#111116] p-3 sm:p-5">
                  <HomeDeskHero3D />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-white/58">
                <div className="rounded-md border border-white/10 bg-black/22 p-3">
                  <p className="font-black text-white">120 x 70</p>
                  <p className="mt-1">cm reais</p>
                </div>
                <div className="rounded-md border border-primary/24 bg-primary/10 p-3">
                  <p className="font-black text-primary">4 módulos</p>
                  <p className="mt-1 text-white/58">à escolha</p>
                </div>
                <div className="rounded-md border border-white/10 bg-black/22 p-3">
                  <p className="font-black text-white">Preview</p>
                  <p className="mt-1">3D imersivo</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.08, delayChildren: 0.2 }}
          className="relative z-10 mx-auto mt-12 grid max-w-7xl gap-3 md:grid-cols-3"
        >
          {valueProps.map((item) => {
            const Icon = item.icon
            return (
              <motion.div key={item.title} variants={fadeUp} className="rounded-lg border border-white/10 bg-white/7 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-md border border-primary/24 bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <h2 className="text-lg font-black text-white">{item.title}</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/62">{item.text}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      <section id="variantes" className="relative px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Produtos disponíveis</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Começa por módulos simples e evolui o teu setup.</h2>
            <p className="mt-4 text-base leading-7 text-white/62">
              O suporte de auscultadores continua disponível como uma das peças do ecossistema EM3D para secretária.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {variants.map((item, index) => (
              <motion.article
                key={item.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ delay: index * 0.08, duration: 0.45 }}
                className="group overflow-hidden rounded-lg border border-white/10 bg-white/7"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                  <Image
                    src={item.image}
                    alt={`${item.title} ${item.label}`}
                    fill
                    className="object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/78 via-black/18 to-transparent" />
                  <span className="absolute left-4 top-4 border border-white/14 bg-black/35 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/80 backdrop-blur-md">
                    {item.label}
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">desde {item.price}</p>
                  <h3 className="mt-3 text-2xl font-bold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/62">{item.text}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {trustPoints.map((point) => {
            const Icon = point.icon
            return (
              <div key={point.title} className="rounded-lg border border-white/10 bg-white/6 p-6">
                <Icon className="size-8 text-primary" />
                <h3 className="mt-6 text-xl font-bold">{point.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/62">{point.text}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-lg border border-primary/18 bg-primary/10 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Pronto para começar</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Desenha o setup antes de pedir orçamento.</h2>
            <p className="mt-3 flex items-center gap-2 text-sm text-white/66">
              <Check className="size-4 text-primary" />
              Preview 3D imersivo, módulos personalizáveis e pedido revisto pela equipa EM3D.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-14 bg-primary px-7 text-base font-bold text-primary-foreground hover:bg-primary/90">
              <Link href="/criar/desk" aria-label="Criar o meu setup de secretária">
                Criar o meu setup
                <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 border-white/15 bg-white/6 px-7 text-base font-bold text-white hover:bg-white hover:text-[#09090b]">
              <Link href="/criar/headset-stand" aria-label="Configurar suporte de auscultadores">
                Configurar suporte
                <ArrowRight className="size-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
