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
    slug: 'moldura-quadrada',
    name: 'Moldura Quadrada',
    priceFrom: 39,
    priceTo: 39,
    description:
      'Moldura quadrada elegante para fotografias 1:1. Perfeita para Instagram e retratos quadrados. Transforme as suas melhores fotos numa peça única iluminada.',
    benefit: 'Formato clássico para as suas memórias digitais',
    image: '/products/moldura-quadrada.jpg',
    featured: true,
    visible: true,
    colorSelectionMode: 'single' as const,
    customizable: true,
    multiColor: false,
    multiColorCount: 1,
    category: 'custom',
    categorySlugs: ['custom', 'gift'],
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
    featuredRank: 2,
    sortOrder: 2,
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
    featured: true,
    visible: true,
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

  const existingSlugs = new Set(
    (existingProducts.catalogProducts || []).map((p: any) => p.slug)
  )

  const transactions = []
  let created = 0
  let skipped = 0

  for (const product of productsToSeed) {
    if (existingSlugs.has(product.slug)) {
      console.log(`   ⏭️  Skipping ${product.slug} (already exists)`)
      skipped++
      continue
    }

    const productId = id()
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
        variants: [],
        productionJobTemplates: product.productionJobTemplates,
        materialRecipe: product.materialRecipe,
        materialGrams: product.materialGrams,
        stlFiles: [],
        slicerNotes: '',
        updatedAt: now,
      })
    )
    console.log(`   ✨ Creating ${product.slug}: ${product.name} (€${product.priceFrom})`)
    created++
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
