import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/lib/products'
import { Button } from '@/components/ui/button'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images?.[0] ?? product.image
  const isSoldOut = product.stockStatus === 'sold_out'
  const hasSalePrice = typeof product.salePrice === 'number' && product.salePrice > 0 && product.salePrice < product.priceFrom
  const displayPrice = hasSalePrice ? `${product.salePrice}` : product.priceFrom === product.priceTo ? `${product.priceFrom}` : `${product.priceFrom}–${product.priceTo}`
  const ctaLabel = isSoldOut
    ? 'Ver Detalhes'
    : product.customizable
      ? 'Personalizar & Encomendar'
      : 'Escolher Cor'

  return (
    <article className="group bg-card rounded-lg overflow-hidden border border-border hover:border-primary/30 transition-colors">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="aspect-square relative overflow-hidden bg-secondary">
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
          {(product.inStock || product.stockStatus) && (
            <span className={`absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded ${
              isSoldOut ? 'bg-foreground text-background' : 'bg-primary text-primary-foreground'
            }`}>
              {isSoldOut ? 'Esgotado' : product.stockStatus === 'made_to_order' ? 'Feito por Encomenda' : 'Em Stock'}
            </span>
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-balance">
            {product.name}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {product.benefit}
        </p>
        <div className="flex items-center justify-between mt-1">
          {/* Amostras de cor */}
          <div className="flex -space-x-1" aria-label={`Disponível em ${product.colors.length} cores`}>
            {product.colors.slice(0, 4).map((color) => (
              <span
                key={color.name}
                className="w-4 h-4 rounded-full border border-background ring-1 ring-border"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
            {product.colors.length > 4 && (
              <span className="w-4 h-4 rounded-full bg-secondary border border-background ring-1 ring-border flex items-center justify-center text-[8px] font-medium text-muted-foreground">
                +{product.colors.length - 4}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            {hasSalePrice && (
              <span className="text-sm text-muted-foreground line-through">
                €{product.priceFrom}
              </span>
            )}
            <p className="text-primary font-semibold">
              €{displayPrice}
            </p>
          </div>
        </div>
        <Button 
          asChild 
          variant="outline" 
          className="w-full mt-4 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Link href={`/product/${product.slug}`}>
            {ctaLabel}
          </Link>
        </Button>
      </div>
    </article>
  )
}
