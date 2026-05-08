#!/usr/bin/env node
/**
 * Seed script for foto3d.pt
 * Populates catalogProducts with lithophane frame products and globalColors
 *
 * Run with: npx tsx scripts/seed-products.ts
 * Or: node --loader ts-node/esm scripts/seed-products.ts
 */

import { id, init } from '@instantdb/admin'
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

// Products to seed
const productsToSeed = [
  {
    slug: 'colecao-lithophane',
    name: 'Coleção Lithophane',
    priceFrom: 39,
    priceTo: 49,
    description:
      'A coleção de abertura da Foto3D.pt: fotografias transformadas em peças luminosas impressas em 3D. Escolha o formato da moldura, envie a fotografia e só paga depois da revisão humana.',
    benefit: 'Molduras lithophane personalizadas com revisão antes do pagamento',
    image: '/products/moldura-quadrada.jpg',
    featured: true,
    visible: true,
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
        colors: [{ colorName: 'Preto', colorHex: '#000000' }],
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
        colors: [{ colorName: 'Preto', colorHex: '#000000' }],
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
        colors: [{ colorName: 'Preto', colorHex: '#000000' }],
      },
    ],
    productionJobTemplates: lithophaneFrameTemplate,
    materialRecipe: [
      { label: 'Moldura', grams: 60, materialType: 'PLA' as const },
      { label: 'Painel', grams: 80, materialType: 'PLA' as const },
    ],
    materialGrams: 140,
    featuredRank: 1,
    sortOrder: 1,
  },
  {
    slug: 'moldura-quadrada',
    name: 'Moldura Quadrada',
    priceFrom: 39,
    priceTo: 39,
    description:
      'Produto legado mantido para compatibilidade. A compra principal passou para a Coleção Lithophane.',
    benefit: 'Formato clássico para as suas memórias digitais',
    image: '/products/moldura-quadrada.jpg',
    featured: false,
    visible: false,
    colorSelectionMode: 'single' as const,
    customizable: true,
    multiColor: false,
    multiColorCount: 1,
    category: 'custom',
    categorySlugs: ['custom', 'gift'],
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
    slug: 'moldura-retrato',
    name: 'Moldura Retrato',
    priceFrom: 44,
    priceTo: 44,
    description:
      'Moldura vertical no formato 4:5. Ideal para retratos, selfies e fotografias de pessoa. A moldura perfeita para destacar quem mais ama.',
    benefit: 'Perfeita para retratos e selfies',
    image: '/products/moldura-retrato.jpg',
    featured: false,
    visible: false,
    colorSelectionMode: 'single' as const,
    customizable: true,
    multiColor: false,
    multiColorCount: 1,
    category: 'custom',
    categorySlugs: ['custom', 'gift'],
    productionJobTemplates: lithophaneFrameTemplate,
    materialRecipe: [
      { label: 'Moldura', grams: 70, materialType: 'PLA' as const },
      { label: 'Painel', grams: 90, materialType: 'PLA' as const },
    ],
    materialGrams: 160,
    variants: [],
    featuredRank: 99,
    sortOrder: 99,
  },
  {
    slug: 'moldura-paisagem',
    name: 'Moldura Paisagem',
    priceFrom: 44,
    priceTo: 44,
    description:
      'Moldura horizontal no formato 16:9. Excelente para paisagens, fotografias de grupo e momentos especiais em família.',
    benefit: 'Ideal para paisagens e fotos de grupo',
    image: '/products/moldura-paisagem.jpg',
    featured: false,
    visible: false,
    colorSelectionMode: 'single' as const,
    customizable: true,
    multiColor: false,
    multiColorCount: 1,
    category: 'custom',
    categorySlugs: ['custom', 'gift'],
    productionJobTemplates: lithophaneFrameTemplate,
    materialRecipe: [
      { label: 'Moldura', grams: 70, materialType: 'PLA' as const },
      { label: 'Painel', grams: 90, materialType: 'PLA' as const },
    ],
    materialGrams: 160,
    variants: [],
    featuredRank: 99,
    sortOrder: 99,
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

  const existingSlugs = new Set(
    (existingProducts.catalogProducts || []).map((p: any) => p.slug)
  )

  const transactions = []
  let created = 0
  let skipped = 0
  const forceUpdate = process.argv.includes('--force')

  for (const product of productsToSeed) {
    const existingProduct = (existingProducts.catalogProducts || []).find((p: any) => p.slug === product.slug)

    if (existingProduct && !forceUpdate) {
      console.log(`   ⏭️  Skipping ${product.slug}: already exists (use --force to update)`)
      skipped++
      continue
    }

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
    if (existingProduct && forceUpdate) {
      console.log(`   🔁 Force updating ${product.slug}: ${product.name} (€${product.priceFrom})`)
    } else {
      console.log(`   ✨ Creating ${product.slug}: ${product.name} (€${product.priceFrom})`)
      created++
    }
  }

  if (transactions.length > 0) {
    await dbAdmin.transact(transactions)
  }

  console.log(`   ✅ Products: ${created} created, ${skipped} skipped`)
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
    console.error('\n❌ Seed failed:', error)
    process.exit(1)
  }
}

main()
