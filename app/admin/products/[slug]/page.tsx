import { Metadata } from 'next'
import { ProductEditor } from './product-editor'

export const metadata: Metadata = {
  title: 'Edit Product | Foto3D.pt',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <ProductEditor slug={slug} />
}
