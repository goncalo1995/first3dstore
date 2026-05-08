import Link from 'next/link'
import Image from 'next/image'
import { getProductCategorySlugs, type Product, type ProductVariantOption } from '@/lib/products'
import { Button } from '@/components/ui/button'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images?.[0] ?? product.image
  const isSoldOut = product.stockStatus === 'sold_out'
  const variants = product.variants ?? []
  const categorySlugs = getProductCategorySlugs(product)
  const isLithophane = categorySlugs.includes('lithophane')
  const productHref = isLithophane ? `/produto/${product.slug}` : `/product/${product.slug}`
  const variantPrices = variants
    .map(variant => getVariantPrice(product, variant))
    .filter(price => Number.isFinite(price))
  const lowestPrice = variantPrices.length ? Math.min(...variantPrices) : product.salePrice ?? product.priceFrom
  const ctaHref = isLithophane && product.customizable && variants.length
    ? `/configurador?produto=${encodeURIComponent(product.slug)}`
    : productHref
  const ctaLabel = !product.customizable && !variants.length
    ? 'Brevemente'
    : isLithophane && variants.length
      ? 'Personalizar'
      : 'Ver Produto'
  const ctaDisabled = !product.customizable && !variants.length
  const finishSwatches = getUniqueVariantFinishes(product)

  return (
    <article className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-colors hover:border-primary/30">
      <Link href={productHref} className="block">
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
        <Link href={productHref}>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-balance">
            {product.name}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {product.benefit}
        </p>
        {variants.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {variants.slice(0, 4).map((variant) => (
              <span key={variant.id} className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {variant.name}
              </span>
            ))}
            {variants.length > 4 && (
              <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                +{variants.length - 4}
              </span>
            )}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex -space-x-1" aria-label={`Disponível em ${finishSwatches.length} acabamentos`}>
            {finishSwatches.slice(0, 5).map((color) => (
              <span
                key={color.name}
                className="w-4 h-4 rounded-full border border-background ring-1 ring-border"
                style={{
                  backgroundColor: color.hex,
                  backgroundImage: color.imageUrl ? `url(${color.imageUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                title={color.name}
              />
            ))}
            {finishSwatches.length > 5 && (
              <span className="w-4 h-4 rounded-full bg-secondary border border-background ring-1 ring-border flex items-center justify-center text-[8px] font-medium text-muted-foreground">
                +{finishSwatches.length - 5}
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">desde</p>
            <p className="font-semibold text-primary">€{lowestPrice}</p>
          </div>
        </div>
        {ctaDisabled ? (
          <Button disabled variant="outline" className="mt-4 w-full border-border text-muted-foreground">
            {ctaLabel}
          </Button>
        ) : (
          <Button asChild variant="outline" className="mt-4 w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        )}
      </div>
    </article>
  )
}

function getVariantPrice(product: Product, variant?: ProductVariantOption) {
  const basePrice = product.salePrice ?? product.priceFrom
  if (variant?.finalPrice !== undefined) return variant.finalPrice
  return basePrice + (variant?.priceAdd ?? 0)
}

function getUniqueVariantFinishes(product: Product) {
  const byName = new Map<string, { name: string; hex: string; imageUrl?: string }>()
  product.variants?.forEach(variant => {
    variant.colors.forEach(color => {
      if (!byName.has(color.name)) {
        byName.set(color.name, { name: color.name, hex: color.hex, imageUrl: color.imageUrl })
      }
    })
  })
  product.colors.forEach(color => {
    if (!byName.has(color.name)) byName.set(color.name, color)
  })
  return [...byName.values()]
}
