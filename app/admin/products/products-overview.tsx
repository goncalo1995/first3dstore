import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, FolderIcon, Loader2, PaletteIcon, Plus, ShoppingBasket, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { db, id } from '@/lib/db'
import { getProductCategorySlugs, products, products as staticProducts, type Product } from '@/lib/products'
import { AIProductModal } from '@/app/admin/_components/ai-product-modal'
import { CategoryManager } from '@/app/admin/_components/category-manager'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { CatalogRecord, CategoryRecord, InventoryRecord, GlobalColorRecord } from '@/app/admin/types'
import { Badge } from '@/components/ui/badge'
import { GlobalColorManager } from '../_components/global-color-manager'

interface ProductsOverviewProps {
  products: Product[]
  inventoryBySlug: Map<string, InventoryRecord>
  categories: CategoryRecord[]
  catalogBySlug: Map<string, CatalogRecord>
  marketingPostCountBySlug: Map<string, number>
  allColors: GlobalColorRecord[]
}

export function ProductsOverview({
  products: productList,
  inventoryBySlug,
  categories,
  catalogBySlug,
  marketingPostCountBySlug,
  allColors,
}: ProductsOverviewProps) {
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)

  const deleteOrArchiveProduct = async (product: Product) => {
    const catalogProduct = catalogBySlug.get(product.slug)
    const inventory = inventoryBySlug.get(product.slug)
    const marketingCount = marketingPostCountBySlug.get(product.slug) ?? 0
    const isStaticProduct = staticProducts.some(item => item.slug === product.slug)
    const shouldDelete = Boolean(catalogProduct && !isStaticProduct)
    const confirmed = window.confirm(
      `${shouldDelete ? 'Delete' : 'Hide'} ${product.name}?${
        marketingCount ? `\n\n${marketingCount} marketing post(s) link to this product and will be kept.` : ''
      }\n\nThis cannot be undone from this screen.`,
    )
    if (!confirmed) return

    setDeletingSlug(product.slug)
    try {
      if (catalogProduct && shouldDelete) {
        await db.transact([
          db.tx.catalogProducts[catalogProduct.id].delete(),
          ...(inventory?.id ? [db.tx.productInventory[inventory.id].delete()] : []),
        ])
        return
      }

      const catalogId = catalogProduct?.id ?? id()
      const inventoryId = inventory?.id ?? id()
      const now = new Date()

      await db.transact([
        db.tx.catalogProducts[catalogId].update({
          slug: product.slug,
          name: product.name,
          category: product.category,
          categorySlugs: getProductCategorySlugs(product),
          priceFrom: product.priceFrom,
          priceTo: product.priceTo,
          salePrice: product.salePrice,
          benefit: product.benefit,
          description: product.description,
          image: product.image,
          images: product.images ?? [product.image],
          customizable: product.customizable,
          customizationOptions: product.customizationOptions ?? [],
          multiColor: Boolean(product.multiColor),
          multiColorCount: product.multiColorCount ?? 1,
          colorSelectionMode: product.colorSelectionMode,
          multiColorPriceAdd: product.multiColorPriceAdd ?? 0,
          variants: product.variants ?? [],
          featured: false,
          featuredRank: product.featuredRank ?? 99,
          sortOrder: product.sortOrder ?? product.featuredRank ?? 99,
          materialGrams: product.materialGrams ?? 25,
          materialRecipe: product.materialRecipe ?? [{ label: 'Main color', grams: product.materialGrams ?? 25 }],
          visible: false,
          updatedAt: now,
        }),
        db.tx.productInventory[inventoryId].update({
          productSlug: product.slug,
          activeColorNames: inventory?.activeColorNames ?? [],
          colorInventory: inventory?.colorInventory?.map(color => ({
            ...color,
            globalColorId: color.globalColorId,
            gramsAvailable: color.gramsAvailable ?? 0,
          })) ?? [],
          stockQuantity: 0,
          stockStatus: 'sold_out',
          leadTimeDays: inventory?.leadTimeDays ?? product.leadTimeDays ?? 4,
          visible: false,
          allowCustomColorRequest: inventory?.allowCustomColorRequest ?? product.allowCustomColorRequest ?? false,
          updatedAt: now,
        }).link({ product: catalogId }),
      ])
    } finally {
      setDeletingSlug(null)
    }
  }

  return (
    <Tabs defaultValue="catalog" className="space-y-4">
      <div className="flex items-center justify-between border-b border-border px-4 pb-0 lg:px-0">
        <TabsList className="flex w-full h-auto p-1 bg-muted/50 overflow-x-auto justify-start scrollbar-hide">
          <TabsTrigger value="catalog" className="gap-2 px-4 h-9">
            <ShoppingBasket className="h-4 w-4" />
            <span className='hidden sm:inline'>Catalog</span> <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">{productList.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 px-4 h-9">
            <FolderIcon className="h-4 w-4" />
            <span className='hidden sm:inline'>Categories</span><Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">{categories?.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="colors" className="gap-2 px-4 h-9">
            <PaletteIcon className="h-4 w-4" />
            <span className='hidden sm:inline'>Colors</span> <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">{allColors.length}</Badge>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="catalog" className="space-y-4 border-0 p-0 outline-none">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Catalog</h2>
            <p className="text-sm text-muted-foreground">Manage product details, pricing, and visibility.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setAiModalOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4 text-primary" />
              With AI
            </Button>
            <Button asChild>
              <Link href="/admin/products/new-product">
                <Plus className="mr-2 h-4 w-4" />
                New
              </Link>
            </Button>
          </div>
        </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {productList.map(product => {
          const inventory = inventoryBySlug.get(product.slug)
          const image = product.images?.[0] ?? product.image
          const visible = inventory?.visible ?? product.visible !== false
          const stock = inventory?.stockQuantity ?? product.stockQuantity ?? 0

          return (
            <article key={product.slug} className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
              <div className="relative aspect-[4/3] bg-secondary group">
                <Image 
                  src={image} 
                  alt={product.name} 
                  fill
                  className="object-cover transition-opacity" 
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute left-3 top-3 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm">
                  {visible ? 'Visible' : 'Hidden'}
                </div>
                {product.featured && (
                  <div className="absolute right-3 top-3 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-sm">
                    Featured #{product.featuredRank ?? 99}
                  </div>
                )}
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{product.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">/{product.slug}</p>
                </div>
                <div className="-mx-1 overflow-x-auto px-1">
                  <div className="flex w-max gap-2">
                    {getProductCategorySlugs(product).map(slug => (
                      <span key={slug} className="whitespace-nowrap rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                        {slug}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-md bg-secondary p-2">
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="font-medium text-foreground">
                      {product.salePrice ? `€${product.salePrice}` : `€${product.priceFrom}`}
                    </p>
                  </div>
                  <div className="rounded-md bg-secondary p-2">
                    <p className="text-xs text-muted-foreground">Stock</p>
                    <p className="font-medium text-foreground">{stock}</p>
                  </div>
                  <div className="rounded-md bg-secondary p-2">
                    <p className="text-xs text-muted-foreground">Order</p>
                    <p className="font-medium text-foreground">{product.sortOrder ?? 99}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link href={`/admin/products/${product.slug}`}>Edit</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/product/${product.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${product.name} in new tab`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => deleteOrArchiveProduct(product)}
                    disabled={deletingSlug === product.slug}
                    title={catalogBySlug.has(product.slug) && !staticProducts.some(item => item.slug === product.slug) ? 'Delete product' : 'Hide product'}
                  >
                    {deletingSlug === product.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
      </TabsContent>

      <TabsContent value="categories" className="border-0 p-0 outline-none">
        <CategoryManager categories={categories} />
      </TabsContent>

      <TabsContent value="colors" className="border-0 p-0 outline-none">
        <GlobalColorManager colors={allColors} products={productList} />
      </TabsContent>

      <AIProductModal 
        open={aiModalOpen} 
        onOpenChange={setAiModalOpen}
        product={productList[0]}
      />
    </Tabs>
  )
}
