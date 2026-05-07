'use client'

import { Loader2 } from 'lucide-react'
import { db } from '@/lib/db'
import { createCatalogProductFallback, type CatalogProductRecord } from '@/lib/products'
import { ProductNotFoundContent } from '@/components/product-not-found'
import { ProductDetail } from './product-detail'

export function ProductLookup({ slug }: { slug: string }) {
  const productQuery = db.useQuery({
    catalogProducts: {
      $: {
        where: {
          slug,
        },
      },
      primaryCategory: {},
      categories: {},
      inventory: {},
    },
  })

  if (productQuery.isLoading) {
    return (
      <main className="flex min-h-[68vh] items-center justify-center bg-secondary">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Verificar disponibilidade do produto
        </div>
      </main>
    )
  }

  const catalogProduct = productQuery.data?.catalogProducts?.[0] as CatalogProductRecord | undefined

  if (!catalogProduct || catalogProduct.visible === false) {
    return <ProductNotFoundContent />
  }

  return <ProductDetail product={createCatalogProductFallback(catalogProduct)} />
}
