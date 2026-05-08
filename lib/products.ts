export type ProductCategory = string
// TODO this file needs cleanup

export interface ProductColor {
  name: string
  hex: string
  stockQuantity?: number
  gramsAvailable?: number
}

export interface CustomizationOption {
  type: 'initials' | 'text' | 'message'
  label: string
  maxChars: number
  priceAdd: number
}

export interface ProductVariantOption {
  id: string
  name: string
  kind: 'single_color' | 'preset_pack' | 'custom_text'
  image?: string
  priceAdd?: number
  finalPrice?: number
  stockQuantity?: number
  estimatedPrintMinutes?: number // For print scheduling
  colors: {
    colorName: string
    colorHex?: string
  }[]
  customizationOptions?: CustomizationOption[]
}

export interface ProductStlFile {
  url: string
  name: string
  notes?: string
  variantId?: string
  boundingBox?: { x: number; y: number; z: number }
  estimatedPrintMinutes?: number
  source?: 'upload' | 'tripo3d'
}

export interface Product {
  id: string
  name: string
  slug: string
  category: string
  categorySlugs?: string[]
  priceFrom: number
  priceTo: number
  salePrice?: number
  benefit: string
  description: string
  image: string // can be local path or external URL
  images?: string[] // gallery images, first image is treated as primary
  colors: ProductColor[]
  customizable: boolean
  customizationOptions?: CustomizationOption[]
  multiColor?: boolean // supports selecting multiple colors
  multiColorCount?: number // how many colors can be selected
  colorSelectionMode?: 'single' | 'flexible_parts' | 'preset_options'
  multiColorPriceAdd?: number
  variants?: ProductVariantOption[]
  stlFiles?: ProductStlFile[]
  slicerNotes?: string
  featured?: boolean
  featuredRank?: number
  sortOrder?: number
  isModular?: boolean
  inStock?: boolean // non-customizable stock can dispatch faster
  acceptsCustomColor?: boolean // can request any hex color
  allowCustomColorRequest?: boolean
  materialGrams?: number
  materialRecipe?: ProductMaterialRequirement[]
  stockQuantity?: number
  stockStatus?: 'in_stock' | 'made_to_order' | 'sold_out'
  leadTimeDays?: number
  visible?: boolean
}

export interface GlobalColor extends ProductColor {
  id?: string
  gramsAvailable: number
  spoolStatus: 'available' | 'low' | 'archived'
  supplierUrl?: string
  pricePerKg?: number
  notes?: string
}

export interface ProductColorInventory {
  colorName: string
  colorHex: string
  offered: boolean
  stockQuantity: number
  gramsAvailable?: number
}

export interface ProductInventory {
  productSlug: string
  activeColorNames: string[]
  colorInventory?: ProductColorInventory[]
  stockQuantity: number
  stockStatus: 'in_stock' | 'made_to_order' | 'sold_out'
  leadTimeDays: number
  visible: boolean
  allowCustomColorRequest?: boolean
}

export interface ProductMaterialRequirement {
  label: string
  colorName?: string
  grams: number
  materialType?: 'PLA' | 'PETG' | 'ABS' | 'TPU'
}

export interface ProductionJobTemplate {
  partLabel: string
  colorSource: 'baseColor' | 'none' | 'lithophane'
  materialGrams: number
  materialType?: 'PLA' | 'PETG' | 'ABS' | 'TPU'
  requiresLithophaneProcessing?: boolean
}

export const baseColorToGlobalColorName: Record<string, string> = {
  black: 'Preto',
  wood: 'Madeira',
}

export const colorSourceToGlobalColorName: Record<string, string> = {
  baseColor: '', // dynamic based on orderRequest.baseColor
  none: 'Branco',
  lithophane: 'Branco', // lithophane panels use white/natural
}

export interface ProductCategoryRecord {
  id?: string
  slug: string
  label?: string
  description?: string
  sortOrder?: number
  visible?: boolean
}

export type CatalogProductRecord = Partial<Omit<Product, 'colors'>> & {
  slug?: string
  primaryCategory?: ProductCategoryRecord
  categories?: ProductCategoryRecord[]
  inventory?: Partial<ProductInventory>
}

export function getProductMaterialRecipe(
  product: Pick<Product, 'materialGrams' | 'materialRecipe' | 'multiColorCount'>,
): ProductMaterialRequirement[] {
  if (product.materialRecipe?.length) return product.materialRecipe

  const totalGrams = product.materialGrams ?? 25
  const slotCount = product.multiColorCount ?? 1
  return Array.from({ length: slotCount }, (_, index) => ({
    label: slotCount === 1 ? 'Main color' : `Color ${index + 1}`,
    grams: Math.ceil(totalGrams / slotCount),
  }))
}

export function normalizeCategorySlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeCategorySlugs(values: (string | undefined | null)[]) {
  return Array.from(
    new Set(
      values
        .flatMap(value => String(value ?? '').split(/[\s,]+/))
        .map(normalizeCategorySlug)
        .filter(Boolean),
    ),
  )
}

export function getProductCategorySlugs(product: Pick<Product, 'category' | 'categorySlugs' | 'customizable' | 'inStock' | 'stockStatus'>) {
  return normalizeCategorySlugs([product.category, ...(product.categorySlugs ?? [])])
}

function getLinkedCategorySlugs(catalogProduct: CatalogProductRecord) {
  const primaryCategorySlug = catalogProduct.primaryCategory?.slug
  const linkedCategorySlugs = catalogProduct.categories
    ?.map(category => category.slug)
    ?? []

  return {
    primaryCategorySlug,
    categorySlugs: normalizeCategorySlugs([
      primaryCategorySlug,
      ...linkedCategorySlugs,
      catalogProduct.category,
      ...(catalogProduct.categorySlugs ?? []),
    ]),
  }
}

export function deriveProductDisplayColors(product: {
  variants?: ProductVariantOption[]
  inventory?: Partial<ProductInventory> | null
  fallbackColors?: ProductColor[]
}): ProductColor[] {
  const byName = new Map<string, ProductColor>()

  const inventoryColorByName = new Map<string, ProductColorInventory>()
  product.inventory?.colorInventory?.forEach(color => {
    const name = color.colorName?.trim()
    if (name) inventoryColorByName.set(name, color)
  })

  product.variants?.forEach(variant => {
    variant.colors?.forEach(color => {
      const name = color.colorName?.trim()
      if (!name || byName.has(name)) return
      const inventoryColor = inventoryColorByName.get(name)
      byName.set(name, {
        name,
        hex: color.colorHex ?? inventoryColor?.colorHex ?? '#d1d5db',
        stockQuantity: inventoryColor?.stockQuantity,
        gramsAvailable: inventoryColor?.gramsAvailable,
      })
    })
  })

  product.inventory?.colorInventory?.forEach(color => {
    const name = color.colorName?.trim()
    if (!name || byName.has(name) || !color.offered) return
    byName.set(name, {
      name,
      hex: color.colorHex,
      stockQuantity: color.stockQuantity,
      gramsAvailable: color.gramsAvailable,
    })
  })

  if (byName.size > 0) return [...byName.values()]
  return product.fallbackColors ?? []
}

// All available colors with their hex values
export const colorPalette: ProductColor[] = [
  { name: 'Branco', hex: '#ffffff' },
  { name: 'Prateado', hex: '#a0a3ac' },
  { name: 'Cinza Claro', hex: '#8caed0' },
  { name: 'Preto', hex: '#000000' },
  { name: 'Vermelho', hex: '#bc4144' },
  { name: 'Verde', hex: '#0d9f46' },
  { name: 'Azul', hex: '#144995' },
  { name: 'Amarelo', hex: '#fed607' },
  { name: 'Cinza', hex: '#777c8f' },
  { name: 'Transparente', hex: '#eff4fc' },
  { name: 'Roxo', hex: '#76449e' },
]

export const defaultGlobalColors: GlobalColor[] = colorPalette.map(color => ({
  ...color,
  gramsAvailable: 0,
  spoolStatus: 'available',
}))

export const products: Product[] = [
  // {
  //   id: '1',
  //   name: 'Golf Ball Planter',
  //   slug: 'golf-ball-planter',
  //   category: 'gift',
  //   priceFrom: 15,
  //   priceTo: 15,
  //   benefit: 'Never lose your ball marker again',
  //   description: 'A distinctive ball planter that can hold a golf ball. Personalise with your initials for a truly unique piece that stands out on any green.',
  //   image: 'https://files.golfprint.pt/products/GolfBallPlanter-1.webp',
  //   images: [
  //     'https://files.golfprint.pt/products/GolfBallPlanter-1.webp',
  //     'https://files.golfprint.pt/products/GolfBallPlanter-2.webp'
  //   ],
  //   colors: [
  //     { name: 'Branco', hex: '#ffffff' },
  //   ],
  //   customizable: false,
  //   featured: true,
  //   featuredRank: 1,
  //   materialGrams: 12,
  //   materialRecipe: [{ label: 'Base', grams: 12 }],
  //   acceptsCustomColor: false,
  //   inStock: true,
  // },
  // {
  //   "id": "golf-ball-alignment-stencil",
  //   "name": "Three-Line Golf Ball Alignment Stencil",
  //   "slug": "three-line-golf-ball-alignment-stencil",
  //   "category": "on-course",
  //   "priceFrom": 8,
  //   "priceTo": 12,
  //   "benefit": "Improve putting and tee shot accuracy",
  //   "description": "A simple yet highly effective tool for marking golf balls with consistent alignment lines. This essential accessory helps golfers improve their putting and tee shot accuracy, ensuring a straighter path to the hole.",
  //   "image": "/products/golf-ball-alignment-stencil.jpg",
  //   "images": [
  //     "/products/golf-ball-alignment-stencil.jpg",
  //     "/products/golf-ball-alignment-stencil-in-use.jpg"
  //   ],
  //   "colors": [
  //     { "name": "Verde", "hex": "#1B6B45" },
  //     { "name": "Black", "hex": "#000000" },
  //     { "name": "White", "hex": "#FFFFFF" },
  //     { "name": "Grey", "hex": "#808080" },
  //     { "name": "Blue", "hex": "#0000FF" },
  //     { "name": "Red", "hex": "#FF0000" }
  //   ],
  //   "customizable": true,
  //   "customizationOptions": [
  //     { "type": "initials", "label": "Your initials", "maxChars": 3, "priceAdd": 3 }
  //   ],
  //   "materialGrams": 5,
  //   "materialRecipe": [{ "label": "Main color", "grams": 5 }],
  //   "stockStatus": "made_to_order",
  //   "leadTimeDays": 3,
  //   "visible": true
  // },
  // {
  //   "id": "golf-ball-holder-clip",
  //   "name": "Golf Ball Holder Clip",
  //   "slug": "golf-ball-holder-clip",
  //   "category": "on-course",
  //   "priceFrom": 10,
  //   "priceTo": 15,
  //   "benefit": "Keep golf balls easily accessible",
  //   "description": "A sleek and convenient clip-on holder that keeps 2-3 golf balls easily accessible on your belt or golf bag. No more fumbling in your pockets – keep your balls ready for your next shot.",
  //   "image": "/products/golf-ball-holder-clip.jpg",
  //   "images": [
  //     "/products/golf-ball-holder-clip.jpg",
  //     "/products/golf-ball-holder-clip-on-bag.jpg"
  //   ],
  //   "colors": [
  //     { "name": "Verde", "hex": "#1B6B45" },
  //     { "name": "Black", "hex": "#000000" },
  //     { "name": "White", "hex": "#FFFFFF" },
  //     { "name": "Grey", "hex": "#808080" },
  //     { "name": "Blue", "hex": "#0000FF" },
  //     { "name": "Red", "hex": "#FF0000" }
  //   ],
  //   "customizable": false,
  //   "materialGrams": 8,
  //   "materialRecipe": [{ "label": "Main color", "grams": 8 }],
  //   "stockStatus": "in_stock",
  //   "leadTimeDays": 1,
  //   "visible": true
  // },
  // {
  //   "id": "golf-tee-hat-clip",
  //   "name": "Golf Tee Hat Clip",
  //   "slug": "golf-tee-hat-clip",
  //   "category": "on-course",
  //   "priceFrom": 7,
  //   "priceTo": 10,
  //   "benefit": "Quick access to your golf tee",
  //   "description": "A small, clever clip that attaches to the brim of your hat, securely holding a golf tee for quick and easy access. Never search for a tee again when you're on the course.",
  //   "image": "/products/golf-tee-hat-clip.jpg",
  //   "images": [
  //     "/products/golf-tee-hat-clip.jpg",
  //     "/products/golf-tee-hat-clip-on-hat.jpg"
  //   ],
  //   "colors": [
  //     { "name": "Verde", "hex": "#1B6B45" },
  //     { "name": "Black", "hex": "#000000" },
  //     { "name": "White", "hex": "#FFFFFF" },
  //     { "name": "Grey", "hex": "#808080" },
  //     { "name": "Blue", "hex": "#0000FF" },
  //     { "name": "Red", "hex": "#FF0000" }
  //   ],
  //   "customizable": false,
  //   "materialGrams": 3,
  //   "materialRecipe": [{ "label": "Main color", "grams": 3 }],
  //   "stockStatus": "in_stock",
  //   "leadTimeDays": 1,
  //   "visible": true
  // },
  // {
  //   "id": "golf-grip-training-aid",
  //   "name": "Golf Grip Training Aid",
  //   "slug": "golf-grip-training-aid",
  //   "category": "practice",
  //   "priceFrom": 15,
  //   "priceTo": 25,
  //   "benefit": "Improve your golf grip and swing consistency",
  //   "description": "A 3D printed guide that slides onto your golf club grip, helping you maintain the correct hand position throughout your swing. Ideal for beginners and for experienced players looking to refine their technique and build muscle memory.",
  //   "image": "/products/golf-grip-training-aid.jpg",
  //   "images": [
  //     "/products/golf-grip-training-aid.jpg",
  //     "/products/golf-grip-training-aid-in-use.jpg"
  //   ],
  //   "colors": [
  //     { "name": "Verde", "hex": "#1B6B45" },
  //     { "name": "Black", "hex": "#000000" },
  //     { "name": "White", "hex": "#FFFFFF" },
  //     { "name": "Grey", "hex": "#808080" },
  //     { "name": "Blue", "hex": "#0000FF" },
  //     { "name": "Red", "hex": "#FF0000" }
  //   ],
  //   "customizable": false,
  //   "materialGrams": 20,
  //   "materialRecipe": [{ "label": "Main color", "grams": 20 }],
  //   "stockStatus": "made_to_order",
  //   "leadTimeDays": 4,
  //   "visible": true
  // },
  // {
  //   "id": "indoor-golf-hole-putting-cup",
  //   "name": "Indoor Golf Hole / Putting Cup",
  //   "slug": "indoor-golf-hole-putting-cup",
  //   "category": "practice",
  //   "priceFrom": 20,
  //   "priceTo": 35,
  //   "benefit": "Practice your putting anywhere, anytime",
  //   "description": "A portable 3D printed putting cup designed for indoor practice. Perfect for honing your short game at home, in the office, or anywhere you want to improve your putting stroke. Some versions include a ball return feature.",
  //   "image": "/products/indoor-golf-hole.jpg",
  //   "images": [
  //     "/products/indoor-golf-hole.jpg",
  //     "/products/indoor-golf-hole-in-office.jpg"
  //   ],
  //   "colors": [
  //     { "name": "Verde", "hex": "#1B6B45" },
  //     { "name": "Black", "hex": "#000000" },
  //     { "name": "White", "hex": "#FFFFFF" },
  //     { "name": "Grey", "hex": "#808080" },
  //     { "name": "Blue", "hex": "#0000FF" },
  //     { "name": "Red", "hex": "#FF0000" }
  //   ],
  //   "customizable": false,
  //   "materialGrams": 50,
  //   "materialRecipe": [{ "label": "Main color", "grams": 50 }],
  //   "stockStatus": "made_to_order",
  //   "leadTimeDays": 5,
  //   "visible": true
  // },
  // {
  //   "id": "garmin-r10-stand-alignment-aid",
  //   "name": "Garmin Approach R10 Stand & Alignment Aid",
  //   "slug": "garmin-r10-stand-alignment-aid",
  //   "category": "practice",
  //   "priceFrom": 25,
  //   "priceTo": 40,
  //   "benefit": "Enhance accuracy and data capture for your Garmin R10",
  //   "description": "A specialized 3D printed stand for the popular Garmin Approach R10 launch monitor. This stand ensures precise alignment and leveling, crucial for capturing accurate swing data and optimizing your practice sessions. A must-have for tech-savvy golfers.",
  //   "image": "/products/garmin-r10-stand.jpg",
  //   "images": [
  //     "/products/garmin-r10-stand.jpg",
  //     "/products/garmin-r10-stand-in-use.jpg"
  //   ],
  //   "colors": [
  //     { "name": "Verde", "hex": "#1B6B45" },
  //     { "name": "Black", "hex": "#000000" },
  //     { "name": "White", "hex": "#FFFFFF" },
  //     { "name": "Grey", "hex": "#808080" },
  //     { "name": "Blue", "hex": "#0000FF" },
  //     { "name": "Red", "hex": "#FF0000" }
  //   ],
  //   "customizable": false,
  //   "materialGrams": 30,
  //   "materialRecipe": [{ "label": "Main color", "grams": 30 }],
  //   "stockStatus": "made_to_order",
  //   "leadTimeDays": 5,
  //   "visible": true
  // },
  // {
  //   "id": "golf-club-bag-clip-organizer",
  //   "name": "Golf Club Bag Clip / Organizer",
  //   "slug": "golf-club-bag-clip-organizer",
  //   "category": "gifts-accessories",
  //   "priceFrom": 12,
  //   "priceTo": 18,
  //   "benefit": "Keep your golf clubs organized and protected",
  //   "description": "These innovative 3D printed clips attach to the rim of your golf bag, keeping clubs separated and preventing them from clattering together. A thoughtful gift for any golfer who values organization and protecting their equipment.",
  //   "image": "/products/golf-club-bag-clip.jpg",
  //   "images": [
  //     "/products/golf-club-bag-clip.jpg",
  //     "/products/golf-club-bag-clip-on-bag.jpg"
  //   ],
  //   "colors": [
  //     { "name": "Verde", "hex": "#1B6B45" },
  //     { "name": "Black", "hex": "#000000" },
  //     { "name": "White", "hex": "#FFFFFF" },
  //     { "name": "Grey", "hex": "#808080" },
  //     { "name": "Blue", "hex": "#0000FF" },
  //     { "name": "Red", "hex": "#FF0000" }
  //   ],
  //   "customizable": false,
  //   "materialGrams": 10,
  //   "materialRecipe": [{ "label": "Main color", "grams": 10 }],
  //   "stockStatus": "in_stock",
  //   "leadTimeDays": 2,
  //   "visible": true
  // },
  // {
  //   "id": "golf-tee-height-guide",
  //   "name": "Golf Tee Height Guide",
  //   "slug": "golf-tee-height-guide",
  //   "category": "gifts-accessories",
  //   "priceFrom": 8,
  //   "priceTo": 12,
  //   "benefit": "Ensure consistent tee height for better drives",
  //   "description": "A small but essential 3D printed tool used to ensure a consistent tee height every time. This consistency is crucial for optimizing your driver performance and achieving more accurate, longer shots. A simple yet highly effective accessory.",
  //   "image": "/products/golf-tee-height-guide.jpg",
  //   "images": [
  //     "/products/golf-tee-height-guide.jpg",
  //     "/products/golf-tee-height-guide-in-use.jpg"
  //   ],
  //   "colors": [
  //     { "name": "Verde", "hex": "#1B6B45" },
  //     { "name": "Black", "hex": "#000000" },
  //     { "name": "White", "hex": "#FFFFFF" },
  //     { "name": "Grey", "hex": "#808080" },
  //     { "name": "Blue", "hex": "#0000FF" },
  //     { "name": "Red", "hex": "#FF0000" }
  //   ],
  //   "customizable": false,
  //   "materialGrams": 4,
  //   "materialRecipe": [{ "label": "Main color", "grams": 4 }],
  //   "stockStatus": "in_stock",
  //   "leadTimeDays": 2,
  //   "visible": true
  // }
]

export function getProductBySlug(slug: string): Product | undefined {
  return products.find(p => p.slug === slug)
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter(product => getProductCategorySlugs(product).includes(category))
}

export function getFeaturedProducts(count: number = 4, productList: Product[] = products): Product[] {
  const featuredProducts = productList
    .filter(product => product.featured)
    .sort((left, right) => (left.featuredRank ?? 999) - (right.featuredRank ?? 999))

  return (featuredProducts.length ? featuredProducts : products).slice(0, count)
}

export function getEffectiveProductPrice(product: Pick<Product, 'priceFrom' | 'salePrice'>) {
  return product.salePrice ?? product.priceFrom
}

export function sortProductsForCatalog(productList: Product[], sortBy: 'recommended' | 'price_asc' | 'price_desc' | 'name' = 'recommended') {
  return [...productList].sort((left, right) => {
    if (sortBy === 'price_asc') return getEffectiveProductPrice(left) - getEffectiveProductPrice(right)
    if (sortBy === 'price_desc') return getEffectiveProductPrice(right) - getEffectiveProductPrice(left)
    if (sortBy === 'name') return left.name.localeCompare(right.name, 'pt')

    const leftOrder = left.sortOrder ?? left.featuredRank ?? 999
    const rightOrder = right.sortOrder ?? right.featuredRank ?? 999
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
    if (Boolean(left.featured) !== Boolean(right.featured)) return left.featured ? -1 : 1
    return left.name.localeCompare(right.name, 'pt')
  })
}

export function getAllProducts(): Product[] {
  return products
}

export function createCatalogProductFallback(catalogProduct: CatalogProductRecord): Product {
  const slug = catalogProduct.slug ?? 'new-product'
  const linkedCategories = getLinkedCategorySlugs(catalogProduct)
  const fallbackName = slug
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    || 'New Product'
  const name = catalogProduct.name ?? fallbackName
  const image = catalogProduct.image ?? '/products/ball-marker.jpg'

  return {
    id: catalogProduct.id ?? slug,
    name,
    slug,
    category: linkedCategories.primaryCategorySlug ?? catalogProduct.category ?? linkedCategories.categorySlugs[0] ?? '',
    categorySlugs: linkedCategories.categorySlugs,
    priceFrom: catalogProduct.priceFrom ?? 0,
    priceTo: catalogProduct.priceTo ?? catalogProduct.priceFrom ?? 0,
    salePrice: catalogProduct.salePrice,
    benefit: catalogProduct.benefit ?? 'Made in small batches for golfers',
    description: catalogProduct.description ?? 'A GolfPrint product configured from the workshop catalog.',
    image,
    images: catalogProduct.images?.length ? catalogProduct.images : [image],
    colors: deriveProductDisplayColors({
      variants: catalogProduct.variants ?? [],
      inventory: catalogProduct.inventory,
      fallbackColors: colorPalette,
    }),
    customizable: catalogProduct.customizable ?? false,
    customizationOptions: catalogProduct.customizationOptions ?? [],
    multiColor: catalogProduct.multiColor ?? false,
    multiColorCount: catalogProduct.multiColorCount ?? 1,
    colorSelectionMode: catalogProduct.colorSelectionMode ?? (catalogProduct.variants?.length ? 'preset_options' : catalogProduct.multiColor ? 'flexible_parts' : 'single'),
    multiColorPriceAdd: catalogProduct.multiColorPriceAdd ?? 0,
    variants: catalogProduct.variants ?? [],
    stlFiles: catalogProduct.stlFiles ?? [],
    slicerNotes: catalogProduct.slicerNotes ?? '',
    featured: catalogProduct.featured ?? false,
    featuredRank: catalogProduct.featuredRank ?? 99,
    sortOrder: catalogProduct.sortOrder ?? 99,
    isModular: catalogProduct.isModular ?? false,
    acceptsCustomColor: catalogProduct.acceptsCustomColor ?? false,
    allowCustomColorRequest: catalogProduct.allowCustomColorRequest ?? false,
    materialGrams: catalogProduct.materialGrams ?? 25,
    materialRecipe: catalogProduct.materialRecipe ?? [{ label: 'Main color', grams: catalogProduct.materialGrams ?? 25 }],
    stockStatus: catalogProduct.stockStatus ?? 'made_to_order',
    leadTimeDays: catalogProduct.leadTimeDays ?? 4,
    visible: catalogProduct.visible ?? true,
  }
}

export function applyInventory(product: Product, inventory?: Partial<ProductInventory> | null): Product {
  if (!inventory) return product

  const colorInventory = inventory.colorInventory ?? []
  const totalStock = colorInventory.length
    ? colorInventory.reduce((sum, color) => sum + (color.offered ? color.stockQuantity : 0), 0)
    : inventory.stockQuantity ?? 0
  const hasOfferedColor = colorInventory.length ? colorInventory.some(color => color.offered) : true
  const derivedStatus = totalStock > 0
    ? 'in_stock'
    : hasOfferedColor
      ? 'made_to_order'
      : 'sold_out'

  return {
    ...product,
    colors: deriveProductDisplayColors({
      variants: product.variants,
      inventory,
      fallbackColors: product.colors,
    }),
    inStock: derivedStatus === 'in_stock',
    stockQuantity: totalStock || inventory.stockQuantity,
    stockStatus: inventory.stockStatus ?? derivedStatus,
    leadTimeDays: inventory.leadTimeDays,
    visible: inventory.visible,
    allowCustomColorRequest: inventory.allowCustomColorRequest ?? product.allowCustomColorRequest,
  }
}

export function applyCatalogProduct(product: Product, catalogProduct?: CatalogProductRecord | null): Product {
  if (!catalogProduct) return product
  const linkedCategories = getLinkedCategorySlugs(catalogProduct)

  const mergedProduct = {
    ...product,
    ...catalogProduct,
    id: product.id,
    slug: catalogProduct.slug ?? product.slug,
    category: linkedCategories.primaryCategorySlug ?? catalogProduct.category ?? product.category,
    images: catalogProduct.images?.length ? catalogProduct.images : product.images,
    categorySlugs: linkedCategories.categorySlugs.length
      ? linkedCategories.categorySlugs
      : normalizeCategorySlugs([catalogProduct.category ?? product.category, ...(catalogProduct.categorySlugs ?? product.categorySlugs ?? [])]),
    customizationOptions: catalogProduct.customizationOptions ?? product.customizationOptions,
    colorSelectionMode: catalogProduct.colorSelectionMode ?? product.colorSelectionMode,
    multiColorPriceAdd: catalogProduct.multiColorPriceAdd ?? product.multiColorPriceAdd,
    variants: catalogProduct.variants ?? product.variants,
    stlFiles: catalogProduct.stlFiles ?? product.stlFiles,
    slicerNotes: catalogProduct.slicerNotes ?? product.slicerNotes,
    materialRecipe: catalogProduct.materialRecipe?.length ? catalogProduct.materialRecipe : product.materialRecipe,
    materialGrams: catalogProduct.materialGrams ?? product.materialGrams,
    featured: catalogProduct.featured ?? product.featured,
    featuredRank: catalogProduct.featuredRank ?? product.featuredRank,
    sortOrder: catalogProduct.sortOrder ?? product.sortOrder,
    isModular: catalogProduct.isModular ?? product.isModular,
  }
  mergedProduct.colors = deriveProductDisplayColors({
    variants: mergedProduct.variants,
    inventory: catalogProduct.inventory,
    fallbackColors: product.colors,
  })

  return catalogProduct.inventory ? applyInventory(mergedProduct, catalogProduct.inventory) : mergedProduct
}

export function applyCatalogProducts(
  productList: Product[],
  catalogProducts?: CatalogProductRecord[] | null,
): Product[] {
  if (!catalogProducts?.length) return productList

  const catalogBySlug = new Map(catalogProducts.map(product => [product.slug, product]))
  const mergedBySlug = new Map(productList.map(product => [
    product.slug,
    applyCatalogProduct(product, catalogBySlug.get(product.slug)),
  ]))

  catalogProducts.forEach(catalogProduct => {
    if (!catalogProduct.slug || mergedBySlug.has(catalogProduct.slug)) return
    mergedBySlug.set(catalogProduct.slug, createCatalogProductFallback(catalogProduct))
  })

  return [...mergedBySlug.values()]
    .filter(product => product.visible !== false)
}

export function applyInventories(
  productList: Product[],
  inventories?: Partial<ProductInventory>[] | null,
): Product[] {
  if (!inventories?.length) return productList

  const inventoryBySlug = new Map(inventories.map(inventory => [inventory.productSlug, inventory]))

  return productList
    .map(product => applyInventory(product, inventoryBySlug.get(product.slug)))
    .filter(product => product.visible !== false)
}

export function getAllProductSlugs(): string[] {
  return products.map(p => p.slug)
}

export const categoryLabels: Record<string, string> = {
  'on-course': 'No Campo',
  'gift': 'Presentes',
  'gifts-accessories': 'Presentes e Acessórios',
  'practice': 'Treino',
  'custom': 'Personalizáveis',
  'ready-stock': 'Em stock',
}

export const categoryDescriptions: Record<string, string> = {
  'on-course': 'Marcadores, clips e acessórios para levar para a volta',
  'gift': 'Peças pequenas e úteis para oferecer a golfistas',
  'gifts-accessories': 'Acessórios úteis para usar ou oferecer',
  'practice': 'Acessórios de treino para melhorar o jogo',
  'custom': 'Produtos que aceitam iniciais, mensagens ou detalhes personalizados',
  'ready-stock': 'Peças já impressas que podem sair mais depressa',
}
