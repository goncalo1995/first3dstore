'use client'

import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { db } from '@/lib/db'
import { AIImageStudio } from '@/app/admin/_components/ai-image-studio'
import {
  applyCatalogProduct,
  createCatalogProductFallback,
  sortProductsForCatalog,
  products,
} from '@/lib/products'
import type { CatalogRecord } from '@/app/admin/types'

export default function AdminAIStudioPage() {
  const dataQuery = db.useQuery({
    catalogProducts: {
      primaryCategory: {},
      categories: {},
      inventory: {},
    },
  })

  const adminProducts = useMemo(() => {
    const bySlug = new Map(products.map(product => [product.slug, product]))

    ;(dataQuery.data?.catalogProducts ?? []).forEach(record => {
      const catalogProduct = record as unknown as CatalogRecord
      if (!catalogProduct.slug) return
      const baseProduct = bySlug.get(catalogProduct.slug)
      bySlug.set(
        catalogProduct.slug,
        baseProduct
          ? applyCatalogProduct(baseProduct, catalogProduct)
          : createCatalogProductFallback(catalogProduct),
      )
    })

    return sortProductsForCatalog([...bySlug.values()])
  }, [dataQuery.data?.catalogProducts])

  if (dataQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return <AIImageStudio products={adminProducts} />
}
