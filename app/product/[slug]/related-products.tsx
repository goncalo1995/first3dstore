import { products, type Product } from '@/lib/products'
import { ProductCard } from '@/components/product-card'

interface RelatedProductsProps {
  product: Product
}

export function RelatedProducts({ product }: RelatedProductsProps) {
  const relatedProducts = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4)

  if (relatedProducts.length === 0) return null

  return (
    <section className="bg-secondary border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-8">
          Produtos relacionados
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedProducts.map((relatedProduct) => (
            <ProductCard key={relatedProduct.id} product={relatedProduct} />
          ))}
        </div>
      </div>
    </section>
  )
}
