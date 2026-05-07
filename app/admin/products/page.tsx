'use client'

import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { db } from '@/lib/db'
import {
  applyCatalogProduct,
  createCatalogProductFallback,
  sortProductsForCatalog,
  products,
} from '@/lib/products'
import { ProductsOverview } from './products-overview'
import type { CatalogRecord, CategoryRecord, InventoryRecord } from '@/app/admin/types'

export default function AdminProductsPage() {
  const dataQuery = db.useQuery({
    productCategories: {
      products: {},
      primaryProducts: {},
    },
    productInventory: { product: {} },
    catalogProducts: {
      primaryCategory: {},
      categories: {},
      inventory: {},
    },
    marketingPosts: {},
    globalColors: {},
  })

  const categories = useMemo(
    () => (dataQuery.data?.productCategories ?? []) as CategoryRecord[],
    [dataQuery.data?.productCategories],
  )

  const inventoryBySlug = useMemo(() => {
    return new Map(
      (dataQuery.data?.productInventory ?? []).map(record => [
        record.productSlug,
        record as unknown as InventoryRecord,
      ]),
    )
  }, [dataQuery.data?.productInventory])

  const adminProducts = useMemo(() => {
    const bySlug = new Map(products.map(product => [product.slug, product]))

    ;(dataQuery.data?.catalogProducts ?? []).forEach(record => {
      const catalogProduct = record
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

  const catalogBySlug = useMemo(() => {
    return new Map(
      (dataQuery.data?.catalogProducts ?? []).map(record => [
        record.slug,
        record as unknown as CatalogRecord,
      ]),
    )
  }, [dataQuery.data?.catalogProducts])

  const marketingPostCountBySlug = useMemo(() => {
    const counts = new Map<string, number>()
    const catalogSlugById = new Map(
      (dataQuery.data?.catalogProducts ?? []).map(record => [
        record.id,
        (record as { slug?: string }).slug,
      ]),
    )

    ;(dataQuery.data?.marketingPosts ?? []).forEach(record => {
      const productIds = (record as { productIds?: string[] }).productIds ?? []
      productIds.forEach(productId => {
        const slug = catalogSlugById.get(productId)
        if (!slug) return
        counts.set(slug, (counts.get(slug) ?? 0) + 1)
      })
    })
    return counts
  }, [dataQuery.data?.catalogProducts, dataQuery.data?.marketingPosts])

  if (dataQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <ProductsOverview 
      products={adminProducts} 
      inventoryBySlug={inventoryBySlug} 
      categories={categories} 
      catalogBySlug={catalogBySlug}
      marketingPostCountBySlug={marketingPostCountBySlug}
      allColors={dataQuery.data?.globalColors ?? []}
    />
  )
}
