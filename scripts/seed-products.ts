#!/usr/bin/env node
/**
 * Seed script for foto3d.pt
 * Populates catalogProducts with lithophane frame products and globalColors
 *
 * Run with: npx tsx scripts/seed-products.ts
 * Or: node --loader ts-node/esm scripts/seed-products.ts
 */

import { id, init, InstantAPIError } from '@instantdb/admin'
import dotenv from 'dotenv'
import 'dotenv/config';
import path from 'path'
import schema from '../instant.schema.ts'

// Load env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const INSTANT_APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID
const INSTANT_APP_ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN

if (!INSTANT_APP_ID || !INSTANT_APP_ADMIN_TOKEN) {
  console.error('❌ Missing required environment variables:')
  if (!INSTANT_APP_ID) console.error('   - NEXT_PUBLIC_INSTANT_APP_ID')
  if (!INSTANT_APP_ADMIN_TOKEN) console.error('   - INSTANT_APP_ADMIN_TOKEN')
  process.exit(1)
}

// Initialize InstantDB admin client
const dbAdmin = init({
  appId: INSTANT_APP_ID,
  adminToken: INSTANT_APP_ADMIN_TOKEN,
  schema,
})

// Production job template for lithophane frames
const lithophaneFrameTemplate = [
  {
    partLabel: 'Moldura',
    colorSource: 'baseColor',
    materialGrams: 60,
    materialType: 'PLA',
  },
  {
    partLabel: 'Painel Litofânico',
    colorSource: 'lithophane',
    materialGrams: 80,
    materialType: 'PLA',
    requiresLithophaneProcessing: true,
  },
]

const defaultMolduraParts = [
  { label: 'Moldura', grams: 60, materialType: 'PLA' as const, colorSource: 'variantColor' as const },
  { label: 'Painel Litofânico', grams: 80, materialType: 'PLA' as const, colorSource: 'lithophane' as const, requiresLithophaneProcessing: true },
]

const woodTextureDataUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' fill='%2380522f'/%3E%3Cpath d='M0 26c38 16 76-17 160 3M0 72c42-20 88 23 160-2M0 118c54 22 98-18 160 6' fill='none' stroke='%23b9824b' stroke-width='9' stroke-opacity='.38'/%3E%3Cpath d='M0 45c60 8 94-11 160 4M0 96c56-12 93 12 160-1M0 139c42-8 86 9 160-3' fill='none' stroke='%23452316' stroke-width='4' stroke-opacity='.28'/%3E%3C/svg%3E"

const frameFinishes = [
  { name: 'Preto', hex: '#000000' },
  { name: 'Branco', hex: '#FFFFFF' },
  { name: 'Madeira', hex: '#8B4513', imageUrl: woodTextureDataUrl },
]

const createFrameFinishVariants = (
  finalPrice: number,
  textOverlay: { bottom: number; left: number; width: number; align: 'center'; fontSize: number },
) => [
  {
    id: 'preto',
    name: 'Preto',
    kind: 'single_color' as const,
    finalPrice,
    variantType: 'led',
    textOverlay,
    colors: [frameFinishes[0]],
  },
  {
    id: 'madeira',
    name: 'Madeira',
    kind: 'single_color' as const,
    finalPrice,
    variantType: 'led',
    textOverlay,
    colors: [frameFinishes[2]],
  },
]

const hexaFinishes = [
  { name: 'Preto', hex: '#1f1f1d' },
  { name: 'Branco', hex: '#f7f3ea' },
  { name: 'Madeira', hex: '#b88452', imageUrl: woodTextureDataUrl },
]

function createHexaProduct(params: {
  slug: string
  name: string
  size: 'XS' | 'S' | 'M'
  width: number
  height: number
  price: number
  grams: number
  featuredRank: number
  sortOrder: number
}) {
  return {
    slug: params.slug,
    name: params.name,
    priceFrom: params.price,
    priceTo: params.price,
    description: `Azulejo hexagonal HexaMemória ${params.size}, ${params.width} x ${params.height}mm, para mosaicos fotográficos modulares.`,
    benefit: `Mosaico hexagonal ${params.size} para fotografias impressas em casa`,
    image: '/placeholder.svg',
    featured: true,
    visible: true,
    aspectRatio: [params.width, params.height] as [number, number],
    colorSelectionMode: 'preset_options' as const,
    customizable: true,
    multiColor: false,
    multiColorCount: 1,
    category: 'custom',
    categorySlugs: ['custom', 'gift', 'hexa-memoria'],
    variants: hexaFinishes.map((finish) => ({
      id: finish.name.toLowerCase().replace(/\s+/g, '-'),
      name: finish.name,
      kind: 'single_color' as const,
      finalPrice: params.price,
      formatLabel: `${params.size} · ${params.width} x ${params.height}mm`,
      colors: [finish],
      parts: [
        {
          label: `Moldura HexaMemória ${params.size}`,
          grams: params.grams,
          materialType: 'PLA' as const,
          colorSource: 'variantColor' as const,
        },
      ],
    })),
    productionJobTemplates: [
      {
        partLabel: `Moldura HexaMemória ${params.size}`,
        colorSource: 'baseColor' as const,
        materialGrams: params.grams,
        materialType: 'PLA' as const,
      },
    ],
    materialRecipe: [
      {
        label: `Moldura HexaMemória ${params.size}`,
        grams: params.grams,
        materialType: 'PLA' as const,
        colorSource: 'variantColor' as const,
      },
    ],
    materialGrams: params.grams,
    featuredRank: params.featuredRank,
    sortOrder: params.sortOrder,
  }
}

// Products to seed
const productsToSeed = [
  createHexaProduct({
    slug: 'hexa-xs',
    name: 'HexaMemória XS',
    size: 'XS',
    width: 120,
    height: 104,
    price: 14.99,
    grams: 42,
    featuredRank: 1,
    sortOrder: 1,
  }),
  createHexaProduct({
    slug: 'hexa-s',
    name: 'HexaMemória S',
    size: 'S',
    width: 160,
    height: 138.6,
    price: 19.99,
    grams: 72,
    featuredRank: 2,
    sortOrder: 2,
  }),
  createHexaProduct({
    slug: 'hexa-m',
    name: 'HexaMemória M',
    size: 'M',
    width: 200,
    height: 173.2,
    price: 29.99,
    grams: 112,
    featuredRank: 3,
    sortOrder: 3,
  }),
  {
    slug: 'moldura',
    name: 'Moldura Lithophane',
    priceFrom: 39,
    priceTo: 49,
    description:
      'Molduras lithophane personalizadas: escolha o formato físico, carregue a fotografia e só paga depois da revisão humana.',
    benefit: 'A sua fotografia transformada numa moldura luminosa feita em Portugal',
    image: '/products/moldura-quadrada.jpg',
    featured: false,
    visible: false,
    colorSelectionMode: 'preset_options' as const,
    customizable: true,
    multiColor: false,
    multiColorCount: 1,
    category: 'custom',
    categorySlugs: ['custom', 'gift', 'lithophane'],
    variants: [
      {
        id: 'quadrada',
        name: 'Moldura Quadrada',
        kind: 'single_color' as const,
        image: '/products/moldura-quadrada.jpg',
        finalPrice: 39,
        aspectRatio: [1, 1] as [number, number],
        formatLabel: 'Formato Quadrado · crop 1:1',
        uploadGuidance: 'Ideal para fotos de Instagram, retratos centrados e composições simétricas.',
        variantType: 'led',
        textOverlay: { bottom: 5, left: 50, width: 72, align: 'center' as const, fontSize: 14 },
        parts: defaultMolduraParts,
        colors: frameFinishes,
      },
      {
        id: 'retrato',
        name: 'Moldura Retrato',
        kind: 'single_color' as const,
        image: '/products/moldura-retrato.jpg',
        finalPrice: 44,
        aspectRatio: [4, 5] as [number, number],
        formatLabel: 'Formato Retrato · crop 4:5',
        uploadGuidance: 'Ideal para pessoas, fotografias verticais e momentos com o rosto em destaque.',
        variantType: 'led',
        textOverlay: { bottom: 5, left: 50, width: 72, align: 'center' as const, fontSize: 14 },
        parts: [
          { label: 'Moldura', grams: 70, materialType: 'PLA' as const, colorSource: 'variantColor' as const },
          { label: 'Painel Litofânico', grams: 90, materialType: 'PLA' as const, colorSource: 'lithophane' as const, requiresLithophaneProcessing: true },
        ],
        colors: frameFinishes,
      },
      {
        id: 'paisagem',
        name: 'Moldura Paisagem',
        kind: 'single_color' as const,
        image: '/products/moldura-paisagem.jpg',
        finalPrice: 49,
        aspectRatio: [16, 9] as [number, number],
        formatLabel: 'Formato Paisagem · crop 16:9',
        uploadGuidance: 'Ideal para viagens, casas, horizontes, grupos e fotografias horizontais.',
        variantType: 'led',
        textOverlay: { bottom: 6, left: 50, width: 64, align: 'center' as const, fontSize: 14 },
        parts: [
          { label: 'Moldura', grams: 75, materialType: 'PLA' as const, colorSource: 'variantColor' as const },
          { label: 'Painel Litofânico', grams: 95, materialType: 'PLA' as const, colorSource: 'lithophane' as const, requiresLithophaneProcessing: true },
        ],
        colors: frameFinishes,
      },
    ],
    productionJobTemplates: lithophaneFrameTemplate,
    materialRecipe: [
      ...defaultMolduraParts,
    ],
    materialGrams: 140,
    featuredRank: 99,
    sortOrder: 99,
  },
  {
    slug: 'candeeiros',
    name: 'Candeeiros Lithophane',
    priceFrom: 59,
    priceTo: 89,
    description:
      'Candeeiros lithophane personalizados para fotografias com luz ambiente. Coleção em preparação.',
    benefit: 'Candeeiros personalizados em breve',
    image: '/products/moldura-retrato.jpg',
    featured: false,
    visible: true,
    colorSelectionMode: 'single' as const,
    customizable: false,
    multiColor: false,
    multiColorCount: 1,
    category: 'custom',
    categorySlugs: ['custom', 'gift', 'lithophane'],
    variants: [],
    productionJobTemplates: lithophaneFrameTemplate,
    materialRecipe: [
      { label: 'Base', grams: 90, materialType: 'PLA' as const },
      { label: 'Painel Litofânico', grams: 100, materialType: 'PLA' as const },
    ],
    materialGrams: 190,
    featuredRank: 99,
    sortOrder: 2,
  },
  {
    slug: 'colecao-lithophane',
    name: 'Coleção Lithophane',
    priceFrom: 39,
    priceTo: 49,
    description:
      'Produto legado mantido para compatibilidade. A compra principal passou para Moldura Lithophane.',
    benefit: 'Molduras lithophane personalizadas com revisão antes do pagamento',
    image: '/products/moldura-quadrada.jpg',
    featured: false,
    visible: false,
    colorSelectionMode: 'preset_options' as const,
    customizable: true,
    multiColor: false,
    multiColorCount: 1,
    category: 'custom',
    categorySlugs: ['custom', 'gift', 'lithophane'],
    variants: [],
    productionJobTemplates: lithophaneFrameTemplate,
    materialRecipe: [
      { label: 'Moldura', grams: 60, materialType: 'PLA' as const },
      { label: 'Painel', grams: 80, materialType: 'PLA' as const },
    ],
    materialGrams: 140,
    featuredRank: 99,
    sortOrder: 99,
  },
  {
    slug: 'moldura-quadrada',
    name: 'Moldura Quadrada',
    priceFrom: 39,
    priceTo: 39,
    description:
      'Moldura lithophane quadrada com luz LED, perfeita para fotografias centradas, retratos simétricos e memórias em formato 1:1.',
    benefit: 'Formato quadrado para fotos centradas e memórias especiais',
    image: '/products/moldura-quadrada.jpg',
    featured: true,
    visible: true,
    aspectRatio: [1, 1] as [number, number],
    colorSelectionMode: 'preset_options' as const,
    customizable: true,
    multiColor: false,
    multiColorCount: 1,
    category: 'custom',
    categorySlugs: ['custom', 'gift', 'lithophane'],
    variants: createFrameFinishVariants(39, { bottom: 5, left: 50, width: 72, align: 'center', fontSize: 14 }),
    productionJobTemplates: lithophaneFrameTemplate,
    materialRecipe: [
      ...defaultMolduraParts,
    ],
    materialGrams: 140,
    featuredRank: 1,
    sortOrder: 1,
  },
  {
    slug: 'moldura-retrato',
    name: 'Moldura Retrato',
    priceFrom: 44,
    priceTo: 44,
    description:
      'Moldura vertical no formato 4:5. Ideal para retratos, selfies e fotografias de pessoa. A moldura perfeita para destacar quem mais ama.',
    benefit: 'Perfeita para retratos e selfies',
    image: '/products/moldura-retrato.jpg',
    featured: true,
    visible: true,
    aspectRatio: [4, 5] as [number, number],
    colorSelectionMode: 'preset_options' as const,
    customizable: true,
    multiColor: false,
    multiColorCount: 1,
    category: 'custom',
    categorySlugs: ['custom', 'gift', 'lithophane'],
    productionJobTemplates: lithophaneFrameTemplate,
    materialRecipe: [
      { label: 'Moldura', grams: 70, materialType: 'PLA' as const, colorSource: 'variantColor' as const },
      { label: 'Painel Litofânico', grams: 90, materialType: 'PLA' as const, colorSource: 'lithophane' as const, requiresLithophaneProcessing: true },
    ],
    materialGrams: 160,
    variants: createFrameFinishVariants(44, { bottom: 5, left: 50, width: 72, align: 'center', fontSize: 14 }),
    featuredRank: 2,
    sortOrder: 2,
  },
  {
    slug: 'moldura-paisagem',
    name: 'Moldura Paisagem',
    priceFrom: 49,
    priceTo: 49,
    description:
      'Moldura horizontal no formato 16:9. Excelente para paisagens, fotografias de grupo e momentos especiais em família.',
    benefit: 'Ideal para paisagens e fotos de grupo',
    image: '/products/moldura-paisagem.jpg',
    featured: true,
    visible: true,
    aspectRatio: [16, 9] as [number, number],
    colorSelectionMode: 'preset_options' as const,
    customizable: true,
    multiColor: false,
    multiColorCount: 1,
    category: 'custom',
    categorySlugs: ['custom', 'gift', 'lithophane'],
    productionJobTemplates: lithophaneFrameTemplate,
    materialRecipe: [
      { label: 'Moldura', grams: 75, materialType: 'PLA' as const, colorSource: 'variantColor' as const },
      { label: 'Painel Litofânico', grams: 95, materialType: 'PLA' as const, colorSource: 'lithophane' as const, requiresLithophaneProcessing: true },
    ],
    materialGrams: 160,
    variants: createFrameFinishVariants(49, { bottom: 6, left: 50, width: 64, align: 'center', fontSize: 14 }),
    featuredRank: 3,
    sortOrder: 3,
  },
]

// Global colors to seed
const colorsToSeed = [
  {
    name: 'Preto',
    hex: '#000000',
    gramsAvailable: 1000,
    spoolStatus: 'available' as const,
    isGlobal: true,
    isActive: true,
  },
  {
    name: 'Madeira',
    hex: '#8B4513',
    gramsAvailable: 1000,
    spoolStatus: 'available' as const,
    isGlobal: true,
    isActive: true,
  },
  {
    name: 'Branco',
    hex: '#FFFFFF',
    gramsAvailable: 2000,
    spoolStatus: 'available' as const,
    isGlobal: true,
    isActive: true,
  },
]

async function seedGlobalColors(): Promise<void> {
  console.log('\n🎨 Seeding global colors...')

  const existingColors = await dbAdmin.query({ globalColors: {} })
  const existingNames = new Set(
    (existingColors.globalColors || []).map((c: any) => c.name)
  )

  const transactions = []
  let created = 0
  let skipped = 0

  for (const color of colorsToSeed) {
    if (existingNames.has(color.name)) {
      console.log(`   ⏭️  Skipping ${color.name} (already exists)`)
      skipped++
      continue
    }

    const colorId = id()
    transactions.push(
      dbAdmin.tx.globalColors[colorId].update({
        ...color,
        updatedAt: new Date(),
      })
    )
    console.log(`   ✨ Creating ${color.name} (${color.hex})`)
    created++
  }

  if (transactions.length > 0) {
    await dbAdmin.transact(transactions)
  }

  console.log(`   ✅ Colors: ${created} created, ${skipped} skipped`)
}

async function seedProducts(): Promise<void> {
  console.log('\n📦 Seeding products...')

  const existingProducts = await dbAdmin.query({
    catalogProducts: {
      $: {
        where: {
          slug: { $in: productsToSeed.map((p) => p.slug) },
        },
      },
    },
  })

  const transactions = []
  let created = 0
  let updated = 0

  for (const product of productsToSeed) {
    const existingProduct = (existingProducts.catalogProducts || []).find((p: any) => p.slug === product.slug)

    const productId = existingProduct?.id ?? id()
    const now = new Date()

    // Create images array from single image
    const images = [product.image]

    transactions.push(
      dbAdmin.tx.catalogProducts[productId].update({
        slug: product.slug,
        name: product.name,
        category: product.category,
        categorySlugs: product.categorySlugs,
        priceFrom: product.priceFrom,
        priceTo: product.priceTo,
        aspectRatio: product.aspectRatio,
        description: product.description,
        benefit: product.benefit,
        image: product.image,
        images,
        visible: product.visible,
        featured: product.featured,
        featuredRank: product.featuredRank,
        sortOrder: product.sortOrder,
        customizable: product.customizable,
        customizationOptions: [],
        multiColor: product.multiColor,
        multiColorCount: product.multiColorCount,
        colorSelectionMode: product.colorSelectionMode,
        variants: product.variants ?? [],
        productionJobTemplates: product.productionJobTemplates,
        materialRecipe: product.materialRecipe,
        materialGrams: product.materialGrams,
        stlFiles: [],
        slicerNotes: '',
        updatedAt: now,
      })
    )
    if (existingProduct) {
      console.log(`   🔁 Updating ${product.slug}: ${product.name} (€${product.priceFrom})`)
      updated++
    } else {
      console.log(`   ✨ Creating ${product.slug}: ${product.name} (€${product.priceFrom})`)
      created++
    }
  }

  if (transactions.length > 0) {
    await dbAdmin.transact(transactions)
  }

  console.log(`   ✅ Products: ${created} created, ${updated} updated`)
}

async function main(): Promise<void> {
  console.log('🚀 foto3d.pt Seed Script')
  console.log('========================')
  console.log(`App ID: ${INSTANT_APP_ID!.slice(0, 8)}...`)

  try {
    await seedGlobalColors()
    await seedProducts()

    console.log('\n✅ Seed completed successfully!')
    console.log('\nNext steps:')
    console.log('   1. Add product images to /public/products/')
    console.log('   2. Visit /admin to manage products')
    console.log('   3. Test order flow on the landing page')
  } catch (error) {
    if (error instanceof InstantAPIError) {
      console.error('\n❌ Seed failed:', error.message, error.hint)
    } else {
      console.error('\n❌ Seed failed:', error)
    }
    process.exit(1)
  }
}

main()
