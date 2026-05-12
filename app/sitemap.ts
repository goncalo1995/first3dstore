// app/sitemap.ts
import { dbAdmin } from '@/lib/db-admin'
import { MetadataRoute } from 'next'
import { products } from '@/lib/products'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://em3d.pt').replace(/\/$/, '')

  const staticRoutes = [
    '/',
    '/loja',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
  ]

  const staticUrls = staticRoutes.map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '/' ? 1.0 : 0.8,
  }))

  let catalogProducts: {
    slug: string
    visible?: boolean
    updatedAt?: Date | string | number
  }[] = products

  try {
    if (process.env.INSTANT_APP_ADMIN_TOKEN) {
      const data = await dbAdmin.query({
        catalogProducts: {},
      })

      if (data.catalogProducts?.length) {
        catalogProducts = data.catalogProducts as typeof catalogProducts
      }
    }
  } catch {
    catalogProducts = products
  }

  const productUrls = catalogProducts
    .filter(product => product.slug && product.visible !== false)
    .map(product => ({
      url: `${baseUrl}/produto/${product.slug}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

  return [...staticUrls, ...productUrls]
}
