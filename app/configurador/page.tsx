import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getCatalogProductBySlugForBuild, getCatalogProductsForBuild } from '@/lib/catalog'
import { ProductConfigurator } from './product-configurator'

export const metadata: Metadata = {
  title: 'Configurador | EM3D',
  description: 'Configure a sua peça personalizada, carregue a fotografia e peça revisão gratuita antes do pagamento.',
}

export default async function ConfiguradorPage({
  searchParams,
}: {
  searchParams: Promise<{ produto?: string }>
}) {
  const { produto } = await searchParams
  const slug = produto?.trim() || 'moldura-quadrada'

  if (!produto?.trim()) {
    redirect('/configurador?produto=moldura-quadrada')
  }

  const [product, products] = await Promise.all([
    getCatalogProductBySlugForBuild(slug),
    getCatalogProductsForBuild(),
  ])

  const lithophaneProducts = products
    .filter(item => item.visible !== false)
    .filter(item => item.categorySlugs?.includes('lithophane') || item.category === 'lithophane')
    .sort((left, right) => (left.sortOrder ?? left.featuredRank ?? 999) - (right.sortOrder ?? right.featuredRank ?? 999))
  const isConfigurableLithophane = Boolean(
    product
    && product.visible !== false
    && (product.categorySlugs?.includes('lithophane') || product.category === 'lithophane')
    && product.variants?.length,
  )

  if (!isConfigurableLithophane || !product) {
    notFound()
  }

  return <ProductConfigurator product={product} lithophaneProducts={lithophaneProducts} />
}
