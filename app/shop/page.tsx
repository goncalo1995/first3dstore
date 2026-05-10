import { Metadata } from 'next'
import { Suspense } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { WhatsAppButton } from '@/components/whatsapp-button'
import { getCatalogProductsForBuild } from '@/lib/catalog'
import { categoryLabels } from '@/lib/products'
import { ShopContent } from './shop-content'

export const metadata: Metadata = {
  title: 'Loja | foto3d.pt',
  description: 'Loja de produtos personalizados, impressos em 3D. Produção Local em Lisboa',
}

export default async function ShopPage() {
  const products = await getCatalogProductsForBuild()

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <section className="border-b border-border bg-[#121212] text-white">
          <div className="container mx-auto px-4 py-10 md:py-14">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.24em] text-primary">Impressão 3D local</p>
            <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight md:text-5xl">
              Loja foto3d
            </h1>
            <p className="mt-4 max-w-2xl font-sans text-base leading-7 text-white/68">
              Presentes personalizados, lithophanes e pequenas séries produzidas em Portugal, com revisão humana antes da produção.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 font-sans text-xs text-white/58">
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5">Lithophanes</span>
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5">Brindes</span>
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5">Peças por encomenda</span>
            </div>
          </div>
        </section>

        <Suspense fallback={<ShopSkeleton />}>
          <ShopContent products={products} categoryLabels={categoryLabels} />
        </Suspense>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}

function ShopSkeleton() {
  return (
    <>
      <section className="border-b border-border sticky top-16 bg-background z-30">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-24 bg-secondary rounded-full animate-pulse" />
            ))}
          </div>
        </div>
      </section>
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-card rounded-lg overflow-hidden border border-border">
              <div className="aspect-square bg-secondary animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-secondary rounded animate-pulse" />
                <div className="h-4 bg-secondary rounded w-1/2 animate-pulse" />
                <div className="h-10 bg-secondary rounded animate-pulse mt-4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
