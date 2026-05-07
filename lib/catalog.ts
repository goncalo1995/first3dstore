import { dbAdmin } from './db-admin'
import { applyCatalogProduct, createCatalogProductFallback, products, type Product } from './products'

export async function getCatalogProductsForBuild(): Promise<Product[]> {
  try {
    const data = await dbAdmin.query({
      catalogProducts: {
        primaryCategory: {},
        categories: {},
        inventory: {},
      },
    })

    if (!data.catalogProducts?.length) return products

    // Merge static products with database catalog products
    const dbProducts = data.catalogProducts.map(record => 
      createCatalogProductFallback(record as any)
    )

    // Combine and deduplicate by slug (prefer DB)
    const bySlug = new Map<string, Product>()
    products.forEach(p => bySlug.set(p.slug, p))
    dbProducts.forEach(p => bySlug.set(p.slug, p))

    return Array.from(bySlug.values()).filter(p => p.visible !== false)
  } catch (error) {
    console.error('Error fetching products for build:', error)
    return products.filter(p => p.visible !== false)
  }
}

export async function getCatalogProductBySlugForBuild(slug: string): Promise<Product | undefined> {
  try {
    const data = await dbAdmin.query({
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

    const dbProduct = data.catalogProducts?.[0]
    const staticProduct = products.find(p => p.slug === slug)

    if (dbProduct) {
      return createCatalogProductFallback(dbProduct as any)
    }

    return staticProduct
  } catch (error) {
    console.error(`Error fetching product ${slug} for build:`, error)
    return products.find(p => p.slug === slug)
  }
}

export function getFallbackCatalogProducts() {
  return products
}
