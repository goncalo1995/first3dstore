'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Home, ImageIcon, Loader2, PackageCheck, Power, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
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

export default function HomePage() {
  const [lightsOn, setLightsOn] = useState(false)
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
          <nav className="flex items-center justify-between">
            <Link href="/" className="font-sans text-lg font-semibold tracking-tight">
              Foto3D.pt
            </Link>
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
                <Link href="#como-funciona">Como funciona</Link>
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

      <section id="como-funciona" className="px-5 pb-20 sm:px-8 lg:pb-28">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {[
            { title: '1. Carrega a Foto', text: 'Envia a imagem e escolhe o formato ideal.', icon: ImageIcon },
            { title: '2. Imprimimos em 3D', text: 'Validamos a foto, modelamos a peça e preparamos a impressão.', icon: PackageCheck },
            { title: '3. Recebe em Casa via CTT', text: 'A sua luz segue embalada com cuidado para oferta.', icon: Home },
          ].map(({ title, text, icon: Icon }) => (
            <article key={title} className="rounded-lg border border-white/10 bg-white/8 p-6 backdrop-blur-md">
              <Icon className="mb-5 h-8 w-8 text-[#ffaa00]" />
              <h3 className="font-serif text-2xl font-bold text-white">{title}</h3>
              <p className="mt-3 font-sans leading-7 text-white/62">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
