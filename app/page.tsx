'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Facebook,
  Hand,
  Home,
  ImageIcon,
  Instagram,
  Leaf,
  Lightbulb,
  Loader2,
  Mail,
  MapPin,
  PackageCheck,
  Power,
  Send,
  Sparkles,
  Truck,
  Upload,
  X,
} from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/db'

type CatalogProduct = {
  id: string
  slug: string
  name: string
  benefit?: string
  description: string
  image?: string
  priceFrom: number
  priceTo?: number
  salePrice?: number
  variants?: {
    id: string
    name: string
    finalPrice?: number
    priceAdd?: number
  }[]
}

type B2BFormState = {
  name: string
  company: string
  email: string
  description: string
}

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
    title: 'Mapa Topográfico 3D',
    alt: '3D Topographic Map',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Para locais com significado: serra, praia, aldeia, trilho ou paisagem portuguesa.',
    detail: 'Um teaser para futuras peças topográficas em relevo, pensado para amantes de lugares especiais.',
    badge: 'Brevemente',
    className: 'md:col-span-4'
  },
]

const trustItems = [
  {
    title: 'Feito à Mão em Lisboa',
    text: 'Cada peça é cuidadosamente desenhada e montada no nosso estúdio em Lisboa.',
    icon: Hand,
  },
  {
    title: 'Materiais Ecológicos',
    text: 'Utilizamos polímeros sustentáveis e processos de fabrico de baixo impacto.',
    icon: Leaf,
  },
  {
    title: 'Tecnologia LED Premium',
    text: 'Iluminação LED duradoura que emite um brilho âmbar perfeito e acolhedor.',
    icon: Lightbulb,
  },
  {
    title: 'Envio Expresso',
    text: 'Entregas rápidas e seguras para que a sua memória chegue intacta e pronta a brilhar.',
    icon: Truck,
  },
]

const faqs = [
  {
    question: 'Que tipo de foto funciona melhor?',
    answer: 'Fotos nítidas, bem iluminadas e com o rosto ou motivo principal em destaque produzem o melhor relevo luminoso.',
  },
  {
    question: 'E se a minha imagem não tiver qualidade suficiente?',
    answer: 'Revemos manualmente cada imagem antes da produção. Se a foto não for adequada, entramos em contacto para pedir uma alternativa.',
  },
  {
    question: 'Posso enviar fotos antigas ou de telemóvel?',
    answer: 'Sim. Fotos de telemóvel costumam funcionar bem se tiverem boa luz e resolução. Fotos antigas também podem resultar quando estão bem digitalizadas.',
  },
  {
    question: 'Quanto tempo demora a produção?',
    answer: 'O prazo depende da fila de produção e do modelo escolhido. Confirmamos a estimativa antes de avançar com pagamento e fabrico.',
  },
  {
    question: 'A luz fica quente ou fria?',
    answer: 'A proposta principal usa LED de tom âmbar quente, pensado para um brilho acolhedor e confortável em casa.',
  },
  {
    question: 'Fazem peças para empresas?',
    answer: 'Sim. Criamos brindes corporativos, logótipos iluminados e decoração personalizada para escritórios mediante orçamento.',
  },
]

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function productPrice(product: CatalogProduct) {
  if (product.salePrice) return formatPrice(product.salePrice)
  if (product.priceTo && product.priceTo > product.priceFrom) {
    return `desde ${formatPrice(product.priceFrom)}`
  }
  return formatPrice(product.priceFrom)
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function B2BModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [form, setForm] = useState<B2BFormState>({ name: '', company: '', email: '', description: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!open) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!isValidEmail(form.email.trim())) {
      setError('Indique um email válido.')
      return
    }

    if (form.description.trim().length < 10) {
      setError('Descreva brevemente o que precisa para prepararmos o orçamento.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/b2b-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.name.trim(),
          companyName: form.company.trim(),
          customerEmail: form.email.trim(),
          description: form.description.trim(),
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível enviar o pedido.')
      }

      setSuccess('Pedido recebido. Vamos responder com uma proposta personalizada.')
      setForm({ name: '', company: '', email: '', description: '' })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível enviar o pedido.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <div className="w-full border border-white/10 bg-[#151515] shadow-2xl shadow-black/50 sm:mx-auto sm:max-w-xl sm:rounded-lg">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.22em] text-[#ffaa00]">Para Empresas</p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-white">Pedir Orçamento Especial</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-[#ffaa00]/60 hover:text-[#ffaa00]"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label htmlFor="b2b-name" className="font-sans text-sm font-medium text-white/78">Nome</label>
            <input
              id="b2b-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/8 px-4 font-sans text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#ffaa00]/70"
              placeholder="O seu nome"
            />
          </div>
          <div>
            <label htmlFor="b2b-company" className="font-sans text-sm font-medium text-white/78">Empresa</label>
            <input
              id="b2b-company"
              value={form.company}
              onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
              className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/8 px-4 font-sans text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#ffaa00]/70"
              placeholder="Nome da empresa"
            />
          </div>
          <div>
            <label htmlFor="b2b-email" className="font-sans text-sm font-medium text-white/78">Email</label>
            <input
              id="b2b-email"
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/8 px-4 font-sans text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#ffaa00]/70"
              placeholder="nome@empresa.pt"
            />
          </div>
          <div>
            <label htmlFor="b2b-description" className="font-sans text-sm font-medium text-white/78">Descrição do pedido</label>
            <textarea
              id="b2b-description"
              required
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="mt-2 min-h-32 w-full resize-none rounded-lg border border-white/10 bg-white/8 px-4 py-3 font-sans text-sm leading-6 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffaa00]/70"
              placeholder="Conte-nos quantidades, objetivo, prazo e ideia visual."
            />
          </div>

          {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 font-sans text-sm text-red-100">{error}</p>}
          {success && <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 font-sans text-sm text-emerald-100">{success}</p>}

          <Button type="submit" disabled={isSubmitting} className="h-12 w-full bg-[#ffaa00] font-sans text-[#121212] hover:bg-[#ffc14a]">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar pedido
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [lightsOn, setLightsOn] = useState(false)
  const [b2bModalOpen, setB2bModalOpen] = useState(false)
  const productsQuery = db.useQuery({
    catalogProducts: {
      $: {
        where: { visible: true, featured: true },
        order: { featuredRank: 'asc' },
      },
    },
  })

  const products = useMemo(
    () => ((productsQuery.data?.catalogProducts ?? []) as CatalogProduct[]).slice(0, 3),
    [productsQuery.data?.catalogProducts],
  )

  return (
    <main className="min-h-screen overflow-hidden bg-[#121212] text-white">
      <B2BModal open={b2bModalOpen} onClose={() => setB2bModalOpen(false)} />

      <section className="relative min-h-screen px-5 py-6 sm:px-8">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[70vh] max-w-5xl"
          initial={false}
          animate={{
            opacity: lightsOn ? 1 : 0.12,
            scale: lightsOn ? 1 : 0.74,
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(255,170,0,0.5), rgba(255,170,0,0.18) 28%, transparent 68%)',
            filter: 'blur(18px)',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_36%),linear-gradient(180deg,rgba(18,18,18,0)_0%,#121212_76%)]" />

        <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
          <nav className="flex items-center justify-between gap-4">
            <Link href="/" className="font-sans text-lg font-semibold tracking-tight">
              Foto3D.pt
            </Link>
            <div className="hidden items-center gap-5 font-sans text-sm text-white/66 md:flex">
              <Link href="#produtos" className="transition hover:text-[#ffaa00]">Produtos</Link>
              <Link href="#como-funciona" className="transition hover:text-[#ffaa00]">Como funciona</Link>
              <Link href="#para-empresas" className="transition hover:text-[#ffaa00]">Para Empresas</Link>
              <Link href="#perguntas-frequentes" className="transition hover:text-[#ffaa00]">FAQ</Link>
            </div>
            <Button asChild className="hidden border border-white/15 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 sm:inline-flex">
              <Link href="#produtos">Ver molduras</Link>
            </Button>
          </nav>

          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <motion.button
              type="button"
              onClick={() => setLightsOn((value) => !value)}
              className="group relative mb-10 flex h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur-md transition-colors hover:bg-white/16"
              initial={false}
              animate={{
                boxShadow: lightsOn
                  ? '0 0 28px rgba(255,170,0,0.75), 0 0 120px rgba(255,170,0,0.38)'
                  : '0 0 18px rgba(255,255,255,0.08)',
              }}
              transition={{ duration: 0.45 }}
              aria-pressed={lightsOn}
              aria-label={lightsOn ? 'Desligar luz' : 'Ligar luz'}
            >
              <span className="absolute inset-3 rounded-full border border-white/10" />
              <Power className="h-11 w-11 text-[#ffaa00] transition-transform group-hover:scale-105" />
            </motion.button>

            <motion.p
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 font-sans text-sm text-white/70 backdrop-blur-md"
              animate={{ opacity: lightsOn ? 1 : 0.45 }}
            >
              <Sparkles className="h-4 w-4 text-[#ffaa00]" />
              A magia revela-se quando a luz acende
            </motion.p>
            <motion.h1
              className="max-w-4xl font-serif text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl"
              animate={{ opacity: lightsOn ? 1 : 0.34, filter: lightsOn ? 'blur(0px)' : 'blur(1.5px)' }}
              transition={{ duration: 0.55 }}
            >
              Transforme a sua foto numa memória iluminada. Feito à mão em Portugal.
            </motion.h1>
            <motion.p
              className="mt-6 max-w-2xl font-sans text-lg leading-8 text-white/72"
              animate={{ opacity: lightsOn ? 1 : 0.28 }}
              transition={{ duration: 0.55, delay: 0.08 }}
            >
              Uma lithophane personalizada parece uma peça discreta em plástico branco até ganhar vida com a sua fotografia.
            </motion.p>
            <motion.div
              className="mt-9 flex flex-col gap-3 sm:flex-row"
              animate={{ opacity: lightsOn ? 1 : 0.45, y: lightsOn ? 0 : 8 }}
            >
              <Button asChild size="lg" className="h-14 bg-[#ffaa00] px-8 font-sans text-base text-[#121212] hover:bg-[#ffc14a]">
                <Link href="#produtos">
                  Escolher formato
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 border-white/15 bg-white/8 px-8 font-sans text-base text-white backdrop-blur-md hover:bg-white/15 hover:text-white">
                <Link href="#para-empresas">Para empresas</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="produtos" className="relative px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-sans text-sm font-semibold uppercase tracking-[0.22em] text-[#ffaa00]">Formatos em destaque</p>
              <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Escolha a moldura da sua memória.
              </h2>
            </div>
            {productsQuery.isLoading && (
              <div className="flex items-center gap-2 font-sans text-sm text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" />
                A carregar produtos
              </div>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {products.map((product, index) => (
              <motion.article
                key={product.id}
                className="group overflow-hidden rounded-lg border border-white/10 bg-white/8 shadow-2xl shadow-black/30 backdrop-blur-md"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-white/5">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover opacity-78 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle,#ffaa0040,transparent_62%)]">
                      <ImageIcon className="h-14 w-14 text-white/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
                </div>
                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <h3 className="font-serif text-2xl font-bold text-white">{product.name}</h3>
                    <span className="rounded-full border border-[#ffaa00]/30 bg-[#ffaa00]/12 px-3 py-1 font-sans text-sm font-semibold text-[#ffd38b]">
                      {productPrice(product)}
                    </span>
                  </div>
                  <p className="min-h-16 font-sans text-sm leading-6 text-white/64">
                    {product.benefit || product.description}
                  </p>
                  <Button asChild className="mt-5 h-11 w-full bg-white text-[#121212] hover:bg-[#ffaa00]">
                    <Link href={`/produto/${product.slug}`}>
                      Personalizar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </motion.article>
            ))}
          </div>

          {!productsQuery.isLoading && products.length === 0 && (
            <div className="rounded-lg border border-white/10 bg-white/8 p-8 text-center font-sans text-white/62 backdrop-blur-md">
              Ainda não há produtos em destaque. Active produtos no painel de administração.
            </div>
          )}
        </div>
      </section>

      <section id="como-funciona" className="relative border-y border-white/5 bg-white/[0.03] px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-5xl">Como Funciona</h2>
            <p className="mt-4 font-sans text-lg text-white/62">Um processo simples para uma recordação eterna.</p>
          </div>
          <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="absolute left-[15%] right-[15%] top-10 z-0 hidden h-px bg-gradient-to-r from-transparent via-[#ffaa00]/20 to-transparent md:block" />
            {[
              { title: '1. Escolher formato', text: 'Selecione a moldura que melhor se adapta à sua memória fotográfica.', icon: ImageIcon },
              { title: '2. Enviar foto', text: 'Faça o upload da sua imagem com a melhor resolução possível.', icon: Upload },
              { title: '3. Receber a encomenda', text: 'Entregamos a sua obra de arte diretamente na sua casa.', icon: Lightbulb },
            ].map(({ title, text, icon: Icon }) => (
              <div key={title} className="group relative z-10 flex flex-col items-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-[#1f1f1f] transition-all duration-500 group-hover:border-[#ffaa00]/50 group-hover:shadow-[0_0_30px_rgba(255,170,0,0.15)]">
                  <Icon className="h-9 w-9 text-[#ffaa00]" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-white">{title}</h3>
                <p className="mt-3 max-w-[250px] font-sans text-sm leading-6 text-white/62">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.22em] text-[#ffaa00]">Porquê Escolher-nos</p>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white sm:text-5xl">Excelência em cada detalhe luminoso.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {trustItems.map(({ title, text, icon: Icon }) => (
              <article key={title} className="rounded-lg border border-white/10 bg-white/8 p-6 backdrop-blur-md">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[#ffaa00]/30 bg-[#ffaa00]/10">
                  <Icon className="h-6 w-6 text-[#ffaa00]" />
                </div>
                <h3 className="font-serif text-xl font-bold text-white">{title}</h3>
                <p className="mt-3 font-sans text-sm leading-6 text-white/62">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="galeria" className="px-5 py-12 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.22em] text-[#ffaa00]">Get inspired</p>
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
                  <span className="absolute right-4 top-4 rounded-full border border-[#ffaa00]/35 bg-[#ffaa00]/16 px-3 py-1 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-[#ffd38b] backdrop-blur-md">
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

      <section id="para-empresas" className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.22em] text-[#ffaa00]">Para Empresas</p>
            <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight text-white sm:text-6xl">Destaque a sua marca em 3D.</h2>
            <p className="mt-5 max-w-xl font-sans text-lg leading-8 text-white/68">
              Criamos peças personalizadas para equipas, clientes e espaços profissionais: brindes com presença, sinalética luminosa e objetos que tornam a marca memorável.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {['Brindes Corporativos', 'Logótipos Iluminados', 'Decoração de Escritório'].map((label) => (
                <div key={label} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-4 py-3 font-sans text-sm text-white/78">
                  <Check className="h-4 w-4 shrink-0 text-[#ffaa00]" />
                  {label}
                </div>
              ))}
            </div>
            <Button onClick={() => setB2bModalOpen(true)} size="lg" className="mt-8 h-14 bg-[#ffaa00] px-8 font-sans text-base text-[#121212] hover:bg-[#ffc14a]">
              <BriefcaseBusiness className="mr-2 h-5 w-5" />
              Pedir Orçamento Especial
            </Button>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/8 shadow-2xl shadow-black/30">
            <img
              src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85"
              alt="Modern reception desk"
              className="aspect-[4/3] h-full w-full object-cover opacity-88"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121212]/82 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="font-sans text-sm uppercase tracking-[0.2em] text-[#ffaa00]">Logótipos e peças à medida</p>
              <p className="mt-2 max-w-md font-serif text-2xl font-bold text-white">Uma receção, uma sala de reunião, uma oferta: cada ponto de contacto pode brilhar.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="perguntas-frequentes" className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.22em] text-[#ffaa00]">Perguntas Frequentes</p>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white sm:text-5xl">Tudo o que precisa de saber sobre as nossas molduras.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-lg border border-white/10 bg-white/8 p-6">
                <h3 className="font-serif text-xl font-bold text-white">{faq.question}</h3>
                <p className="mt-3 font-sans text-sm leading-6 text-white/62">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#0a0a0a] px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-1">
              <Link href="/" className="font-sans text-xl font-bold tracking-tight text-white">
                Foto3D.pt
              </Link>
              <p className="mt-3 font-sans text-sm leading-6 text-white/50">
                Transformamos as suas memórias em luz. Litofanias personalizadas feitas à mão em Portugal.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-sans text-sm font-semibold text-white">Produtos</h4>
              <ul className="space-y-2 font-sans text-sm text-white/60">
                <li><Link href="/produto/moldura-quadrada" className="hover:text-[#ffaa00]">Moldura Quadrada</Link></li>
                <li><Link href="/produto/moldura-retrato" className="hover:text-[#ffaa00]">Moldura Retrato</Link></li>
                <li><Link href="/produto/moldura-paisagem" className="hover:text-[#ffaa00]">Moldura Paisagem</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-sans text-sm font-semibold text-white">Ajuda</h4>
              <ul className="space-y-2 font-sans text-sm text-white/60">
                <li><Link href="#como-funciona" className="hover:text-[#ffaa00]">Como Funciona</Link></li>
                <li><Link href="#para-empresas" className="hover:text-[#ffaa00]">Para Empresas</Link></li>
                <li><Link href="/contact" className="hover:text-[#ffaa00]">Contacto</Link></li>
                <li><Link href="#perguntas-frequentes" className="hover:text-[#ffaa00]">Perguntas Frequentes</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-sans text-sm font-semibold text-white">Contacto</h4>
              <ul className="space-y-3 font-sans text-sm text-white/60">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#ffaa00]" />
                  <a href="mailto:geral@foto3d.pt" className="hover:text-white">geral@foto3d.pt</a>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#ffaa00]" />
                  <span>Lisboa, Portugal</span>
                </li>
              </ul>
              <div className="mt-4 flex gap-3">
                <a href="#" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/60 transition-colors hover:border-[#ffaa00] hover:text-[#ffaa00]" aria-label="Instagram">
                  <Instagram className="h-4 w-4" />
                </a>
                <a href="#" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/60 transition-colors hover:border-[#ffaa00] hover:text-[#ffaa00]" aria-label="Facebook">
                  <Facebook className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
            <p className="font-sans text-xs text-white/40">
              © {new Date().getFullYear()} Foto3D.pt. Todos os direitos reservados.
            </p>
            <div className="flex gap-6 font-sans text-xs text-white/40">
              <Link href="/terms" className="hover:text-white">Termos de Uso</Link>
              <Link href="/privacy" className="hover:text-white">Privacidade</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
