'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ProductCard } from '@/components/product-card'
import { db } from '@/lib/db'
import { applyCatalogProducts, applyInventories, getProductCategorySlugs, sortProductsForCatalog, type CatalogProductRecord, type Product, type ProductCategory } from '@/lib/products'

interface ShopContentProps {
  products: Product[]
  categoryLabels: Record<ProductCategory, string>
}

export function ShopContent({ products, categoryLabels }: ShopContentProps) {
  const inventoryQuery = db.useQuery({
    productInventory: { product: {} },
    catalogProducts: {
      primaryCategory: {},
      categories: {},
      inventory: {},
    },
    productCategories: {},
  })
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlCategory = searchParams.get('category') as ProductCategory | null
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>(urlCategory || 'all')
  const [sortBy, setSortBy] = useState<'recommended' | 'price_asc' | 'price_desc' | 'name'>('recommended')

  // Sync with URL on mount and when URL changes
  useEffect(() => {
    const category = searchParams.get('category') as ProductCategory | null
    setActiveCategory(category || 'all')
  }, [searchParams])

  const handleCategoryChange = (category: ProductCategory | 'all') => {
    setActiveCategory(category)
    if (category === 'all') {
      router.push('/shop', { scroll: false })
    } else {
      router.push(`/shop?category=${category}`, { scroll: false })
    }
  }

  const productsWithInventory = useMemo(() => {
    return applyInventories(
      applyCatalogProducts(products, inventoryQuery.data?.catalogProducts as CatalogProductRecord[] | undefined),
      inventoryQuery.data?.productInventory,
    )
  }, [products, inventoryQuery.data?.catalogProducts, inventoryQuery.data?.productInventory])

  const categories = useMemo<(ProductCategory | 'all')[]>(() => {
    const managedCategories = ((inventoryQuery.data?.productCategories ?? []) as { slug: string; sortOrder?: number; visible?: boolean }[])
      .sort((left, right) => (left.sortOrder ?? 999) - (right.sortOrder ?? 999))

    if (managedCategories.length > 0) {
      const visibleProductCategorySlugs = new Set(productsWithInventory.flatMap(product => getProductCategorySlugs(product)))

      return [
        'all',
        ...managedCategories
          .filter(category => category.visible !== false)
          .filter(category => visibleProductCategorySlugs.has(category.slug))
          .map(category => category.slug),
      ]
    }

    const visibleCategories = Array.from(new Set(productsWithInventory.flatMap(product => getProductCategorySlugs(product))))
    const preferred = [
      ...['on-course', 'practice', 'gifts', 'gift', 'gifts-accessories', 'custom', 'ready-stock'],
    ].filter((category, index, allCategories) => visibleCategories.includes(category) && allCategories.indexOf(category) === index)
    const custom = visibleCategories
      .filter(category => !preferred.includes(category))
      .sort((left, right) => left.localeCompare(right))

    return ['all', ...preferred, ...custom]
  }, [inventoryQuery.data?.productCategories, productsWithInventory])

  const resolvedCategoryLabels = useMemo(() => {
    const adminLabels = Object.fromEntries(
      ((inventoryQuery.data?.productCategories ?? []) as { slug: string; label: string }[])
        .map(category => [category.slug, category.label]),
    )

    return { ...categoryLabels, ...adminLabels }
  }, [categoryLabels, inventoryQuery.data?.productCategories])

  const filteredProducts = useMemo(() => {
    const visibleProducts = activeCategory === 'all'
      ? productsWithInventory
      : productsWithInventory.filter(product => getProductCategorySlugs(product).includes(activeCategory))

    return sortProductsForCatalog(visibleProducts, sortBy)
  }, [activeCategory, productsWithInventory, sortBy])

  useEffect(() => {
    if (activeCategory === 'all') return
    if (categories.includes(activeCategory)) return
    setActiveCategory('all')
    router.replace('/shop', { scroll: false })
  }, [activeCategory, categories, router])

  return (
    <>
      {/* Filters */}
      <section className="sticky top-16 z-30 border-b border-border bg-background/92 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="-mx-4 overflow-x-auto px-4 scrollbar-hide">
          <div className="flex w-max min-w-full gap-2 py-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === category
                    ? 'border-[#ffaa00] bg-[#121212] text-white'
                    : 'border-border bg-secondary/60 text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                }`}
              >
                {category === 'all' ? 'Todos' : resolvedCategoryLabels[category] ?? category}
              </button>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="container mx-auto px-4 py-10">
        {/* Trust Badge */}
        <div className="mb-8 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            <span>
              {inventoryQuery.isLoading ? 'A verificar catálogo atual' : 'Produção local, acabamentos e variantes atualizados'}
            </span>
          </div>
          <label className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden sm:inline">Ordenar</span>
            <select
              value={sortBy}
              onChange={event => setSortBy(event.target.value as typeof sortBy)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="recommended">Recomendados</option>
              <option value="price_asc">Preço: baixo a alto</option>
              <option value="price_desc">Preço: alto a baixo</option>
              <option value="name">Nome</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Não encontrámos produtos nesta categoria.</p>
          </div>
        )}
      </section>
    </>
  )
}
