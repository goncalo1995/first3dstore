import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCatalogProductBySlugForBuild, getCatalogProductsForBuild } from '@/lib/catalog'
import { ProductExperience } from './product-experience'

export async function generateStaticParams() {
  const products = await getCatalogProductsForBuild()
  return products.map((product) => ({ slug: product.slug }))
}

export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getCatalogProductBySlugForBuild(slug)

  if (!product || product.visible === false) {
    return {
      title: 'Produto não encontrado | Foto3D.pt',
    }
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://foto3d.pt').replace(/\/$/, '')
  const productImages = product.images?.length ? product.images : [product.image]
  const absoluteImages = productImages
    .filter(Boolean)
    .map((image) => image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`)

  return {
    title: `${product.name} | Foto3D.pt`,
    description: product.description,
    alternates: {
      canonical: `${baseUrl}/produto/${product.slug}`,
    },
    openGraph: {
      title: `${product.name} | Foto3D.pt`,
      description: product.description,
      images: absoluteImages.map((url) => ({
        url,
        width: 1200,
        height: 1200,
        alt: product.name,
      })),
      type: 'website',
      url: `${baseUrl}/produto/${product.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | Foto3D.pt`,
      description: product.description,
      images: absoluteImages,
    },
  }
}

export default async function ProdutoPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getCatalogProductBySlugForBuild(slug)

  if (!product || product.visible === false) {
    notFound()
  }

  return <ProductExperience product={product} />
}
