import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCatalogProductBySlugForBuild, getCatalogProductsForBuild } from '@/lib/catalog'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { WhatsAppButton } from '@/components/whatsapp-button'
import { ProductDetail } from './product-detail'
import { ProductLookup } from './product-lookup'
import { RelatedProducts } from './related-products'

// Generate static params for all products
export async function generateStaticParams() {
  const products = await getCatalogProductsForBuild()
  return products.map((product) => ({ slug: product.slug }))
}

export const dynamicParams = true

// Generate metadata for each product
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getCatalogProductBySlugForBuild(slug)

  if (!product) {
    return {
      title: 'Produto não encontrado | EM3D',
    }
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://em3d.pt').replace(/\/$/, '')
  const productImages = product.images?.length ? product.images : [product.image]
  const absoluteImages = productImages.map(img => {
    if (img.startsWith('http')) return img
    return `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`
  })

  return {
    title: `${product.name} | EM3D`,
    description: product.description,
    openGraph: {
      title: `${product.name} | EM3D`,
      description: product.description,
      images: absoluteImages.map(url => ({
        url,
        width: 1200,
        height: 1200,
        alt: product.name,
      })),
      type: 'website',
      url: `${baseUrl}/product/${product.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | EM3D`,
      description: product.description,
      images: absoluteImages,
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getCatalogProductBySlugForBuild(slug)

  if (product?.visible === false) {
    notFound()
  }

  return (
    <>
      <Header />
      {product ? (
        <main className="min-h-screen">
            <ProductDetail product={product} />
            <RelatedProducts product={product} />
        </main>
      ) : (
        <ProductLookup slug={slug} />
      )}
      <Footer />
      <WhatsAppButton message={`Olá! Tenho uma pergunta sobre ${product?.name ?? slug}`} />
    </>
  )
}
