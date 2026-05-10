'use client'

import NextImage from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Gift, ImageIcon, Layers3, Lamp, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Product } from '@/lib/products'

const trustItems = [
  {
    title: 'Arte em 3D',
    text: 'Impresso camada a camada em Portugal.',
    icon: Layers3,
  },
  {
    title: 'Magia Oculta',
    text: 'Parece uma escultura branca até acender a luz.',
    icon: Sparkles,
  },
  {
    title: 'Presente Perfeito',
    text: 'Pronto a oferecer, montado à mão.',
    icon: Gift,
  },
]

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function getHeroHeadline(product: Product) {
  const normalized = product.slug.toLowerCase()
  if (normalized.includes('retrato')) return 'A luz perfeita para rostos que nunca quer esquecer.'
  if (normalized.includes('paisagem')) return 'Transforme uma viagem, uma casa ou um horizonte numa luz.'
  if (normalized.includes('quadrada')) return 'A magia de reviver o seu melhor momento.'
  return product.benefit || 'A magia de reviver o seu melhor momento.'
}

export function ProductExperience({ product }: { product: Product }) {
  const productImages = product.images?.length ? product.images : [product.image]
  const heroImages = productImages.filter(Boolean).slice(0, 3)
  const configuratorHref = `/configurador?produto=${encodeURIComponent(product.slug)}`

  return (
    <main className="min-h-screen bg-[#121212] text-white">
      <section className="relative min-h-screen overflow-hidden px-5 py-6 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[72vh] max-w-6xl blur-2xl"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(255,170,0,0.45), rgba(255,170,0,0.12) 35%, transparent 72%)',
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,18,18,0)_0%,#121212_88%)]" />

        <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
          <nav className="flex items-center justify-between">
            <Button asChild variant="ghost" className="px-0 font-sans text-white/70 hover:bg-transparent hover:text-white">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Foto3D.pt
              </Link>
            </Button>
            <Button asChild className="hidden border border-white/15 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 sm:inline-flex">
              <Link href={configuratorHref}>Personalizar</Link>
            </Button>
          </nav>

          <div className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1fr)]">
            <div>
              <p className="font-sans text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                {product.name}
              </p>
              <h1 className="mt-5 max-w-4xl font-serif text-5xl font-bold leading-[0.98] tracking-tight text-white sm:text-7xl lg:text-8xl">
                {getHeroHeadline(product)}
              </h1>
              <p className="mt-7 max-w-2xl font-sans text-lg leading-8 text-white/70">
                {product.description || 'Uma fotografia especial transformada numa luz feita à mão em Portugal.'}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-14 bg-primary px-8 font-sans text-base text-[#121212] hover:bg-[#ffc14a]">
                  <Link href={configuratorHref}>
                    Personalizar
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <div className="flex items-center rounded-full border border-white/10 bg-white/8 px-5 py-3 font-sans text-sm text-white/72 backdrop-blur-md">
                  Total desde <span className="ml-2 font-semibold text-white">{formatPrice(product.salePrice ?? product.priceFrom)}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_0.72fr]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-white/10 bg-white/8 shadow-2xl shadow-black/40 backdrop-blur-md">
                {heroImages[0] ? (
                  <NextImage
                    src={heroImages[0]}
                    alt={product.name}
                    fill
                    className="object-cover opacity-90"
                    sizes="(max-width: 1024px) 100vw, 44vw"
                    priority
                    unoptimized={heroImages[0].startsWith('http')}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[radial-gradient(circle,#ffaa0040,transparent_62%)]">
                    <ImageIcon className="h-16 w-16 text-white/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/10 bg-black/35 p-4 font-sans text-sm text-white/76 backdrop-blur-md">
                  Feito à mão em Portugal, revisto por uma pessoa antes da produção.
                </div>
              </div>

              <div className="hidden gap-4 sm:grid">
                {[heroImages[1], heroImages[2]].map((image, index) => (
                  <div key={index} className="relative overflow-hidden rounded-lg border border-white/10 bg-white/8 backdrop-blur-md">
                    {image ? (
                      <NextImage
                        src={image}
                        alt={`${product.name} ${index + 2}`}
                        fill
                        className="object-cover opacity-82"
                        sizes="22vw"
                        unoptimized={image.startsWith('http')}
                      />
                    ) : (
                      <div className="flex h-full min-h-44 items-center justify-center bg-[radial-gradient(circle,#ffffff1f,transparent_62%)]">
                        <Lamp className="h-10 w-10 text-primary/70" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.24em] text-primary">Como funciona</p>
            <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-6xl">Escolhe, envia a foto e nós validamos antes do pagamento.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {trustItems.map((item) => (
              <Card key={item.title} className="rounded-lg border-white/10 bg-white/8 text-white shadow-2xl shadow-black/20 backdrop-blur-md">
                <CardContent className="p-6">
                  <item.icon className="h-8 w-8 text-primary" />
                  <h2 className="mt-5 font-serif text-2xl font-bold">{item.title}</h2>
                  <p className="mt-3 font-sans text-sm leading-6 text-white/62">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button asChild size="lg" className="mt-10 h-14 bg-primary px-8 font-sans text-base text-[#121212] hover:bg-[#ffc14a]">
            <Link href={configuratorHref}>
              Personalizar
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
