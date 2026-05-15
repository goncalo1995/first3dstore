'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Cpu, Gauge, Headphones, ShieldCheck, Sparkles } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'

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
  { icon: Cpu, title: '2D rápido, 3D opcional', text: 'Preview leve no telemóvel, visualização 3D quando quiseres.' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
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
              EM3D Setup Lab
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-7 max-w-5xl text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-8xl"
            >
              Eleva o teu Setup. Suportes de Auscultadores feitos à tua medida em Portugal.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-7 max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
              Escolhe a montagem, combina estrutura e detalhe, adiciona o teu gamertag e cria uma peça que parece desenhada para a tua secretária.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 bg-primary px-7 text-base font-bold text-primary-foreground shadow-[0_0_34px_rgba(163,255,18,0.24)] hover:bg-primary/90">
                <Link href="/criar/headset-stand">
                  Configurar o meu Suporte
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 border-white/15 bg-white/6 px-7 text-base text-white hover:bg-white hover:text-[#09090b]">
                <Link href="#variantes">Ver variantes</Link>
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
              <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-[#111116]">
                <Image
                  src="https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=1200&q=88"
                  alt="Setup premium com auscultadores numa secretária escura"
                  fill
                  priority
                  className="object-cover opacity-82"
                  sizes="(max-width: 1024px) 100vw, 520px"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/88 via-black/18 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5">
                  <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    <Headphones className="size-4" />
                    Headset Stand
                  </div>
                  <p className="mt-4 text-2xl font-bold">3 formas. 2 cores. 1 peça tua.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="variantes" className="relative px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Três montagens</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Escolhe a presença certa para a tua mesa.</h2>
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
            <h2 className="mt-3 text-3xl font-black tracking-tight">Configura o teu suporte em menos de um minuto.</h2>
            <p className="mt-3 flex items-center gap-2 text-sm text-white/66">
              <Check className="size-4 text-primary" />
              Preview 2D leve, preço em tempo real e compra direta.
            </p>
          </div>
          <Button asChild size="lg" className="h-14 bg-primary px-7 text-base font-bold text-primary-foreground hover:bg-primary/90">
            <Link href="/criar/headset-stand">
              Configurar agora
              <ArrowRight className="size-5" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}
