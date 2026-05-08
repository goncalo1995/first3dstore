'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Check, Copy, Printer, Share2, ShieldCheck, ShoppingBag, Sparkles, Truck, Clock, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCart } from '@/lib/cart-context'
import { db } from '@/lib/db'
import { applyCatalogProduct, applyInventory, getProductMaterialRecipe, type CatalogProductRecord, type Product, type ProductColor } from '@/lib/products'
import { WHATSAPP_NUMBER } from '@/data/constants'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'

interface ProductDetailProps {
  product: Product
}

export function ProductDetail({ product }: ProductDetailProps) {
  const { addItem } = useCart()
  const inventoryQuery = db.useQuery({
    productInventory: {
      $: {
        where: {
          productSlug: product.slug,
        },
      },
      product: {},
    },
    catalogProducts: {
      $: {
        where: {
          slug: product.slug,
        },
      },
      primaryCategory: {},
      categories: {},
      inventory: {},
    },
  })
  const displayProduct = useMemo(() => {
    const catalogProduct = inventoryQuery.data?.catalogProducts?.[0] as CatalogProductRecord | undefined
    return applyInventory(
      applyCatalogProduct(product, catalogProduct),
      inventoryQuery.data?.productInventory?.[0],
    )
  }, [product, inventoryQuery.data?.catalogProducts, inventoryQuery.data?.productInventory])
  const isMultiColor = displayProduct.multiColor && displayProduct.multiColorCount
  const colorSelectionMode = displayProduct.colorSelectionMode ?? (displayProduct.variants?.length ? 'preset_options' : isMultiColor ? 'flexible_parts' : 'single')
  const usesPresetOptions = Boolean(displayProduct.variants?.length)
  const usesFlexibleParts = isMultiColor && colorSelectionMode === 'flexible_parts'
  const colorCount = displayProduct.multiColorCount || 1
  const materialRecipe = useMemo(() => getProductMaterialRecipe(displayProduct), [displayProduct])
  const productImages = useMemo(
    () => displayProduct.images?.length ? displayProduct.images : [displayProduct.image],
    [displayProduct.image, displayProduct.images],
  )
  const isSoldOut = displayProduct.stockStatus === 'sold_out' || displayProduct.visible === false

  const [activeImage, setActiveImage] = useState(productImages[0])
  const [selectedColors, setSelectedColors] = useState<ProductColor[]>([displayProduct.colors[0]])
  const [selectedPartColors, setSelectedPartColors] = useState<Record<string, ProductColor>>({})
  const [selectedVariantId, setSelectedVariantId] = useState(displayProduct.variants?.[0]?.id ?? '')
  const [openPartKey, setOpenPartKey] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [customizations, setCustomizations] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    displayProduct.customizationOptions?.forEach((opt, index) => {
      initial[`${opt.type}-${index}`] = ''
    })
    return initial
  })
  const [customColorHex, setCustomColorHex] = useState('')
  const [showCustomColor, setShowCustomColor] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle')
  const hasCustomColorRequest = customColorHex.trim().length > 0
  const hasPersonalizedText = Object.values(customizations).some(value => value.trim().length > 0)
  const selectedVariant = useMemo(() => {
    return displayProduct.variants?.find(variant => variant.id === selectedVariantId) ?? displayProduct.variants?.[0]
  }, [displayProduct.variants, selectedVariantId])
  const getOptionColor = (colorName: string, colorHex?: string): ProductColor => {
    const inventoryColor = displayProduct.colors.find(color => color.name === colorName)
    return inventoryColor ?? { name: colorName, hex: colorHex ?? '#d1d5db' }
  }
  const selectedOptionColors = useMemo(() => {
    return selectedVariant?.colors.map(color => getOptionColor(color.name, color.hex)) ?? []
  }, [displayProduct.colors, selectedVariant])
  const selectedParts = useMemo(() => {
    if (!usesFlexibleParts) return []

    return materialRecipe.map((part, index) => {
      const key = `${part.label}-${index}`
      const defaultColor = displayProduct.colors[0]
      const color = selectedPartColors[key] ?? defaultColor

      return color
        ? {
            key,
            label: part.label || `Part ${index + 1}`,
            grams: Number(part.grams) || 0,
            color,
          }
        : null
    }).filter(Boolean) as { key: string; label: string; grams: number; color: ProductColor }[]
  }, [displayProduct.colors, materialRecipe, selectedPartColors, usesFlexibleParts])
  const selectedFastCapacity = usesPresetOptions
    ? selectedVariant?.stockQuantity ?? 0
    : !isMultiColor && selectedColors.length === colorCount
    ? Math.min(...selectedColors.map(color => color.stockQuantity ?? 0))
    : 0

  useEffect(() => {
    setActiveImage(productImages[0])
  }, [productImages])

  useEffect(() => {
    if (!displayProduct.variants?.length) return
    setSelectedVariantId(current => {
      if (displayProduct.variants?.some(variant => variant.id === current)) return current
      return displayProduct.variants?.[0]?.id ?? ''
    })
  }, [displayProduct.variants])

  useEffect(() => {
    if (!displayProduct.colors.length) return

    setSelectedColors(prev => {
      const activeNames = new Set(displayProduct.colors.map(color => color.name))
      const stillAvailable = prev.filter(color => activeNames.has(color.name))

      if (stillAvailable.length) {
        return stillAvailable.slice(0, colorCount)
      }

      return [displayProduct.colors[0]]
    })
  }, [displayProduct.colors, colorCount])

  useEffect(() => {
    if (!displayProduct.colors.length) return

    setSelectedPartColors(prev => {
      const activeNames = new Set(displayProduct.colors.map(color => color.name))
      const next: Record<string, ProductColor> = {}

      materialRecipe.forEach((part, index) => {
        const key = `${part.label}-${index}`
        const savedColor = prev[key]
        next[key] = savedColor && activeNames.has(savedColor.name)
          ? savedColor
          : displayProduct.colors[0]
      })

      return next
    })
  }, [displayProduct.colors, materialRecipe])

  const activeCustomizationOptions = useMemo(
    () => selectedVariant?.kind === 'custom_text'
      ? selectedVariant.customizationOptions ?? []
      : displayProduct.customizationOptions ?? [],
    [displayProduct.customizationOptions, selectedVariant],
  )
  const hasCustomizations = useMemo(() => {
    if (!activeCustomizationOptions.length) return false
    return activeCustomizationOptions.some((opt, index) => {
      const value = customizations[`${opt.type}-${index}`]
      return value && value.length > 0
    })
  }, [activeCustomizationOptions, customizations])

  const customizationPriceAdd = useMemo(() => {
    if (!activeCustomizationOptions.length) return 0
    return activeCustomizationOptions.reduce((sum, opt, index) => {
      const value = customizations[`${opt.type}-${index}`]
      return sum + (value && value.length > 0 ? opt.priceAdd : 0)
    }, 0)
  }, [activeCustomizationOptions, customizations])

  const basePrice = displayProduct.salePrice ?? displayProduct.priceFrom
  const hasSalePrice = typeof displayProduct.salePrice === 'number' && displayProduct.salePrice > 0 && displayProduct.salePrice < displayProduct.priceFrom
  const colorPriceAdd = usesPresetOptions
    ? selectedVariant?.finalPrice
      ? 0
      : selectedVariant?.priceAdd ?? 0
    : isMultiColor
      ? displayProduct.multiColorPriceAdd ?? 0
      : 0
  const optionBasePrice = usesPresetOptions && selectedVariant?.finalPrice
    ? selectedVariant.finalPrice
    : basePrice
  const currentPrice = optionBasePrice + customizationPriceAdd + colorPriceAdd

  // Shipping estimate based on stock and customization
  const hasFastStock = selectedFastCapacity >= quantity && !hasPersonalizedText && !hasCustomColorRequest
  const shippingDays = hasFastStock ? 2 : displayProduct.leadTimeDays ?? 4

  const handleColorToggle = (color: ProductColor) => {
    if (isMultiColor) {
      setSelectedColors(prev => {
        const exists = prev.find(c => c.name === color.name)
        if (exists) {
          return prev.filter(c => c.name !== color.name)
        }
        if (prev.length >= colorCount) {
          return [...prev.slice(1), color]
        }
        return [...prev, color]
      })
    } else {
      setSelectedColors([color])
    }
  }

  const handlePartColorChange = (partKey: string, colorName: string) => {
    const color = displayProduct.colors.find(item => item.name === colorName)
    if (!color) return
    setSelectedPartColors(prev => ({ ...prev, [partKey]: color }))
    setSelectedColors([color])
  }

  const handleCustomizationChange = (key: string, value: string, maxChars: number) => {
    const sanitized = value.toUpperCase().slice(0, maxChars)
    setCustomizations(prev => ({ ...prev, [key]: sanitized }))
  }

  const handleAddToCart = () => {
    const cartCustomizations = activeCustomizationOptions
      .map((opt, index) => {
        const value = customizations[`${opt.type}-${index}`]
        if (!value || value.length === 0) return null
        return {
          label: opt.label,
          value,
          priceAdd: opt.priceAdd,
        }
      })
      .filter(Boolean) as { label: string; value: string; priceAdd: number }[]

    // Add custom color if specified
    if (customColorHex) {
      cartCustomizations.push({
        label: 'Cor personalizada',
        value: customColorHex,
        priceAdd: 0,
      })
    }

    const selectedOptionCartColors = selectedVariant?.colors.map(color => ({
      name: color.name,
      hex: getOptionColor(color.name, color.hex).hex,
      imageUrl: color.imageUrl,
      globalColorId: color.globalColorId,
    }))
    const primaryOptionColor = selectedOptionColors[0]

    addItem({
      product: displayProduct,
      quantity,
      selectedColor: primaryOptionColor ?? selectedParts[0]?.color ?? selectedColors[0],
      selectedColors: usesFlexibleParts ? selectedParts.map(part => part.color) : usesPresetOptions ? selectedOptionColors : undefined,
      selectedParts: usesFlexibleParts
        ? selectedParts.map(part => ({
            label: part.label,
            colorName: part.color.name,
            colorHex: part.color.hex,
            grams: part.grams,
          }))
        : undefined,
      selectedVariant: usesPresetOptions && selectedVariant
        ? {
            id: selectedVariant.id,
            name: selectedVariant.name,
            kind: selectedVariant.kind,
            colors: selectedOptionCartColors ?? [],
            image: selectedVariant.image,
            priceAdd: selectedVariant.priceAdd,
            finalPrice: selectedVariant.finalPrice,
          }
        : undefined,
      customizations: cartCustomizations,
      unitPrice: currentPrice,
    })

    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

    const whatsappMessage = useMemo(() => {
    const colorText = usesPresetOptions
      ? selectedVariant
        ? `Opção: ${selectedVariant.name} (${selectedOptionColors.map(color => color.name).join(', ')})`
        : 'Opção: por selecionar'
      : isMultiColor
        ? `Peças: ${selectedParts.map(part => `${part.label}: ${part.color.name}`).join(', ')}`
        : `Cor: ${selectedColors[0]?.name}`

    const customText = activeCustomizationOptions
      .map((opt, index) => {
        const value = customizations[`${opt.type}-${index}`]
        return value ? `${opt.label}: ${value}` : null
      })
      .filter(Boolean)
      .join('\n')

    const customColorText = customColorHex ? `Cor personalizada solicitada: ${customColorHex}` : ''

    return `Olá! Gostaria de encomendar:

Produto: ${displayProduct.name}
${colorText}
${customText ? `Personalizações:\n${customText}` : 'Sem personalização'}
${customColorText}
Quantidade: ${quantity}

Total: €${(currentPrice * quantity).toFixed(2)}

Por favor, confirme a disponibilidade!`
  }, [displayProduct, selectedColors, selectedParts, selectedVariant, selectedOptionColors, customizations, customColorHex, quantity, currentPrice, isMultiColor, usesPresetOptions, activeCustomizationOptions])

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : `/product/${product.slug}`
    const shareTitle = displayProduct.name
    const shareText = `${displayProduct.name} da Foto3d.pt - ${displayProduct.benefit}`
    
    const shareData: ShareData = {
      title: shareTitle,
      text: shareText,
      url: shareUrl,
    }

    try {
      // Try to share with image if supported
      if (navigator.share && navigator.canShare && activeImage) {
        try {
          const response = await fetch(activeImage)
          const blob = await response.blob()
          const file = new File([blob], 'product-image.jpg', { type: blob.type })
          
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              ...shareData,
              files: [file],
            })
            return
          }
        } catch (imageError) {
          console.error('Error fetching image for share:', imageError)
          // Fallback to normal share without image
        }
      }

      if (navigator.share) {
        await navigator.share(shareData)
        return
      }

      await navigator.clipboard.writeText(shareUrl)
      setShareState('copied')
      setTimeout(() => setShareState('idle'), 1800)
    } catch (error) {
      console.error('Share failed:', error)
      setShareState('idle')
    }
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4">
        <Link
          href="/shop"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar à Loja
        </Link>
      </div>

      {/* Detalhe do Produto */}
      <section className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Galeria de Imagens */}
          <div className="space-y-3">
            <div className="aspect-square relative rounded-lg overflow-hidden bg-secondary">
              <Image
                src={activeImage}
                alt={displayProduct.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
                loading='eager'
              />
              <div className="absolute left-3 top-3 rounded-md bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-sm">
                Feito por encomenda em Lisboa
              </div>
            </div>
            {productImages.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {productImages.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImage(image)}
                    className={`relative aspect-square overflow-hidden rounded-md bg-secondary ring-offset-2 ring-offset-background transition ${
                      activeImage === image ? 'ring-2 ring-primary' : 'hover:opacity-80'
                    }`}
                    aria-label={`Ver imagem do produto ${index + 1}`}
                  >
                    <Image
                      src={image}
                      alt={`${displayProduct.name} vista ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="120px"
                      loading='lazy'
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informação do Produto */}
          <div className="flex flex-col">
            {/* Cabeçalho */}
            <div className="mb-4 flex items-start justify-between gap-4">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground text-balance">
                {displayProduct.name}
              </h1>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleShare}
                aria-label="Partilhar produto"
                title={shareState === 'copied' ? 'Link copiado' : 'Partilhar produto'}
                className="shrink-0"
              >
                {shareState === 'copied' ? (
                  <Copy className="h-4 w-4 text-primary" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Distintivos de Confiança */}
            <div className="flex flex-wrap gap-2 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full text-sm text-muted-foreground">
                <span className="text-base">🇵🇹</span>
                <span>Feito em Lisboa</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full text-sm text-muted-foreground">
                {isSoldOut ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Esgotado temporariamente</span>
                  </>
                ) : hasFastStock ? (
                  <>
                    <Truck className="w-4 h-4 text-primary" />
                    <span>Envio rápido</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>
                      {selectedFastCapacity > 0 && !hasPersonalizedText
                        ? `Apenas ${selectedFastCapacity} unidades de envio rápido disponíveis, expedição prevista em ${shippingDays} dias úteis`
                        : `Expedição prevista em ${shippingDays} dias úteis`}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Preço */}
            <p className="text-2xl font-bold text-primary mb-4">
              {hasSalePrice && (
                <span className="mr-2 text-base font-medium text-muted-foreground line-through">
                  €{displayProduct.priceFrom.toFixed(2)}
                </span>
              )}
              €{currentPrice.toFixed(2)}
              {customizationPriceAdd > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (inclui €{customizationPriceAdd} de personalização)
                </span>
              )}
              {colorPriceAdd > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (+€{colorPriceAdd.toFixed(2)} cores)
                </span>
              )}
            </p>

            {/* Descrição */}
            <p className="text-muted-foreground leading-relaxed mb-8">
              {displayProduct.description}
            </p>

            <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-foreground">Verificação de qualidade</p>
                <p className="text-xs text-muted-foreground">Acabado e inspecionado antes da expedição.</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <Sparkles className="mb-2 h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  {displayProduct.customizable ? 'Personalizado' : 'Pronto a enviar'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {displayProduct.customizable
                    ? 'Iniciais, mensagens e edições de cor atuais.'
                    : 'Escolha entre cores disponíveis.'}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <Truck className="mb-2 h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-foreground">Envio rastreado</p>
                <p className="text-xs text-muted-foreground">Informação antes de sair de Lisboa.</p>
              </div>
            </div>

            {/* Customization Form */}
            <div className="space-y-6">
              {/* Color Selection with Real Swatches - No names, horizontal wrap */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  {usesPresetOptions ? 'Escolha o pack de cores' : usesFlexibleParts ? 'Escolha as cores por parte' : 'Cor'}
                  {usesFlexibleParts && (
                    <span className="text-muted-foreground font-normal ml-2">
                      {selectedParts.length} configuradas
                    </span>
                  )}
                </Label>
                {usesPresetOptions ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-border bg-card p-3">
                        <p className="text-sm font-medium text-foreground">Escolha um pack de cores</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Cada opção representa uma combinação pronta. O preço, imagem e prazo atualizam automaticamente.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {displayProduct.variants?.map(variant => {
                          const selected = selectedVariant?.id === variant.id
                          const variantColors = variant.colors.map(color => getOptionColor(color.name, color.hex))
                          const variantPriceLabel = variant.finalPrice
                            ? `€${variant.finalPrice.toFixed(2)}`
                            : (variant.priceAdd ?? 0) > 0
                              ? `+€${(variant.priceAdd ?? 0).toFixed(2)}`
                              : ''

                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => {
                                setSelectedVariantId(variant.id)
                                setOpenPartKey(null)
                                if (variant.image) setActiveImage(variant.image)
                              }}
                              className={`rounded-lg border bg-background p-3 text-left transition ${
                                selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                              }`}
                              aria-pressed={selected}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-foreground">{variant.name}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {variantPriceLabel}
                                    {(variant.stockQuantity ?? 0) > 0 ? ` · ${variant.stockQuantity} pronto(s)` : ''}
                                  </p>
                                </div>
                                {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                              </div>
                              <div className="mt-3 flex -space-x-2">
                                {variantColors.slice(0, 5).map((color, index) => (
                                  <span
                                    key={`${variant.id}-${color.name}-${index}`}
                                    className="h-7 w-7 rounded-full border-1 border-background shadow-md"
                                    style={{ backgroundColor: color.hex }}
                                    title={color.name}
                                  />
                                ))}
                              </div>
                              {/* <p className="mt-3 truncate text-xs text-muted-foreground">
                                {variantColors.map(color => color.name).join(', ')}
                              </p> */}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                ) : usesFlexibleParts ? (
                  <div className="space-y-4">
                    {/* Selected colors summary - clickable tags */}
                    <div className="flex flex-wrap gap-2">
                      {selectedParts.map(part => (
                        <Popover key={part.key} open={openPartKey === part.key} onOpenChange={open => setOpenPartKey(open ? part.key : null)}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors cursor-pointer group"
                            >
                              <span
                                className="h-3.5 w-3.5 rounded-full border border-border transition-transform group-hover:scale-110"
                                style={{ backgroundColor: part.color.hex }}
                                aria-hidden="true"
                              />
                              <span className="font-medium text-foreground">{part.label}</span>
                              <span className="text-muted-foreground">·</span>
                              <span>{part.color.name}</span>
                              <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-0" align="start">
                            <Command>
                              <CommandList>
                                <CommandGroup>
                                  {displayProduct.colors.map(color => (
                                    <CommandItem
                                      key={color.name}
                                      value={color.name}
                                      onSelect={() => {
                                        handlePartColorChange(part.key, color.name)
                                        setOpenPartKey(null)
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <div className="flex items-center gap-3 w-full">
                                        <span
                                          className="h-5 w-5 rounded-full border border-border"
                                          style={{ backgroundColor: color.hex }}
                                          aria-hidden="true"
                                        />
                                        <span>{color.name}</span>
                                        {(color.stockQuantity ?? 0) > 0 && (
                                          <span className="ml-auto text-xs text-primary">em stock</span>
                                        )}
                                        {part.color.name === color.name && (
                                          <Check className="w-4 h-4 ml-auto text-primary" />
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {/* Toque em qualquer etiqueta acima para alterar a cor das parte. */}
                      {(displayProduct.multiColorPriceAdd ?? 0) > 0 ? ` Extra multi-cor: €${(displayProduct.multiColorPriceAdd ?? 0).toFixed(2)}.` : ''}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {displayProduct.colors.map((color) => {
                      const isSelected = selectedColors.some(c => c.name === color.name)
                      return (
                        <button
                          key={color.name}
                          onClick={() => handleColorToggle(color)}
                          className={`relative w-10 h-10 rounded-full transition-all ${
                            isSelected
                              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                              : 'hover:scale-105'
                          }`}
                          aria-pressed={isSelected}
                          aria-label={`Cor ${color.name}`}
                          title={color.name}
                        >
                          <span
                            className="absolute inset-0 w-full h-full rounded-full border border-border"
                            style={{ backgroundColor: color.hex }}
                            aria-hidden="true"
                          />
                          {(color.stockQuantity ?? 0) > 0 && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                          )}
                          {isSelected && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <Check className="w-5 h-5 text-white drop-shadow-md" />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Custom Color Option */}
                {(displayProduct.allowCustomColorRequest || displayProduct.acceptsCustomColor) && (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setCustomColorHex('')
                        setShowCustomColor(!showCustomColor)
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      {showCustomColor ? 'Ocultar cor personalizada' : 'Precisa de uma cor diferente?'}
                    </button>
                    {showCustomColor && (
                      <div className="mt-3 p-4 bg-secondary rounded-lg">
                        <Label className="text-sm font-medium text-foreground mb-2 block">
                          Pedir cor personalizada
                        </Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={customColorHex || '#1B6B45'}
                            onChange={(e) => setCustomColorHex(e.target.value)}
                            className="w-10 h-10 rounded border border-border cursor-pointer"
                          />
                          <Input
                            type="text"
                            placeholder="#1B6B45"
                            value={customColorHex}
                            onChange={(e) => setCustomColorHex(e.target.value)}
                            className="max-w-32 uppercase"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          As cores personalizadas são geridas pelo WhatsApp para podermos confirmar a disponibilidade antes de fazer o pedido.
                        </p>
                        {customColorHex && (
                          <Button asChild variant="outline" className="mt-3 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                            <a
                              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Olá! Podem fazer ${displayProduct.name} numa cor personalizada como ${customColorHex}?`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Perguntar no WhatsApp
                            </a>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Customization Options */}
              {activeCustomizationOptions.length > 0 && (
                <div className="space-y-4">
                  {activeCustomizationOptions.map((option, index) => {
                    const key = `${option.type}-${index}`
                    const value = customizations[key] ?? ''
                    const hasValue = value.length > 0

                    return (
                      <div key={key}>
                        <Label
                          htmlFor={key}
                          className="text-sm font-medium text-foreground mb-2 block"
                        >
                          {option.label}
                          <span className="text-muted-foreground font-normal ml-1">
                            {option.priceAdd > 0 ? `(+€${option.priceAdd})` : '(opcional)'}
                          </span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id={key}
                            type="text"
                            maxLength={option.maxChars}
                            placeholder={
                              option.type === 'initials'
                                ? 'e.g., GP'
                                : option.type === 'message'
                                  ? 'Insira a mensagem...'
                                  : 'Insira o texto...'
                            }
                            value={value}
                            onChange={(e) =>
                              handleCustomizationChange(key, e.target.value, option.maxChars)
                            }
                            className={`uppercase ${option.type === 'message' ? 'max-w-full' : 'max-w-40'}`}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {value.length}/{option.maxChars}
                          </span>
                          {hasValue && (
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Quantity */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  Quantidade
                </Label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center"
                    aria-label="Diminuir quantidade"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center"
                    aria-label="Aumentar quantidade"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">
                    €{(currentPrice * quantity).toFixed(2)}
                  </span>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleAddToCart}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg"
                    disabled={!!(addedToCart || isSoldOut || hasCustomColorRequest || (usesFlexibleParts && selectedParts.length < materialRecipe.length))}
                  >
                    <ShoppingBag className="w-6 h-6 mr-2" />
                    {isSoldOut
                      ? 'Esgotado'
                      : hasCustomColorRequest
                        ? 'Use o WhatsApp para cores personalizadas'
                        : addedToCart
                          ? 'Adicionado!'
                          : 'Adicionar ao carrinho'}
                  </Button>
                  {/* <a
                    href={isSoldOut ? undefined : whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={isSoldOut}
                    className={`w-full font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 ${
                      isSoldOut
                        ? 'pointer-events-none bg-muted text-muted-foreground'
                        : 'bg-[#25D366] hover:bg-[#20BD5A] text-white'
                    }`}
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Order via WhatsApp
                  </a> */}
                </div>
              </div>
            </div>

            {/* Material Info */}
            <div className="mt-8 p-4 bg-secondary rounded-lg">
              <div className="flex items-start gap-3">
                <Printer className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Eco-friendly PLA</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Feito em Portugal usando materiais sustentáveis à base de plantas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
