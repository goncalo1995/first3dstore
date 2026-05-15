import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getCatalogProductBySlugForBuild, getCatalogProductsForBuild } from '@/lib/catalog'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { WhatsAppButton } from '@/components/whatsapp-button'
import { getProductCategorySlugs, type Product } from '@/lib/products'
import { ProductDetail } from '@/app/product/[slug]/product-detail'

export async function generateStaticParams() {
  const products = await getCatalogProductsForBuild()
  return products.map((product) => ({ slug: product.slug }))
}

export const dynamicParams = true

function getDedicatedConfiguratorHref(product: Product) {
  const categorySlugs = getProductCategorySlugs(product)
  const normalizedSlug = product.slug.toLowerCase()

  if (normalizedSlug === 'headset-stand') {
    return '/criar/headset-stand'
  }

  if (
    product.isModular === true
    || categorySlugs.includes('hexa-memoria')
    || normalizedSlug.startsWith('hexa-')
  ) {
    return '/criar/hexa'
  }

  if (
    categorySlugs.includes('lithophane')
    || normalizedSlug.includes('moldura')
  ) {
    return `/configurador?produto=${encodeURIComponent(product.slug)}`
  }

  return null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getCatalogProductBySlugForBuild(slug)

  if (!product || product.visible === false) {
    return {
      title: 'Produto não encontrado | EM3D',
    }
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://em3d.pt').replace(/\/$/, '')
  const productImages = product.images?.length ? product.images : [product.image]
  const absoluteImages = productImages
    .filter(Boolean)
    .map((image) => image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`)

  return {
    title: `${product.name} | EM3D`,
    description: product.description,
    alternates: {
      canonical: `${baseUrl}/produto/${product.slug}`,
    },
    openGraph: {
      title: `${product.name} | EM3D`,
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
      title: `${product.name} | EM3D`,
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

  const dedicatedConfiguratorHref = getDedicatedConfiguratorHref(product)
  if (dedicatedConfiguratorHref) {
    redirect(dedicatedConfiguratorHref)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <ProductDetail product={product} />
      </main>
      <Footer />
      <WhatsAppButton message={`Olá! Tenho uma pergunta sobre ${product.name}`} />
    </>
  )
}
