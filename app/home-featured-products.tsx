'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/db'
import { applyCatalogProducts, getFeaturedProducts, type CatalogProductRecord, type Product } from '@/lib/products'

interface HomeFeaturedProductsProps {
  products: Product[]
}

export function HomeFeaturedProducts({ products }: HomeFeaturedProductsProps) {
  const catalogQuery = db.useQuery({
    catalogProducts: {
      primaryCategory: {},
      categories: {},
      inventory: {},
    },
  })
  const liveProducts = applyCatalogProducts(products, catalogQuery.data?.catalogProducts as CatalogProductRecord[] | undefined)
  const featuredProducts = getFeaturedProducts(4, liveProducts)

  return (
    <section className="bg-secondary">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Em Destaque
            </h2>
            <p className="mt-2 text-muted-foreground">
              Confira os nossos produtos mais vendidos
            </p>
          </div>
          <Button asChild variant="ghost" className="text-primary hover:text-primary/80 self-start md:self-auto">
            <Link href="/loja">
              Ver todos os produtos
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
