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
    priceAdd: 0,
  },
  {
    name: 'Madeira',
    hex: '#8B4513',
    gramsAvailable: 1000,
    spoolStatus: 'available' as const,
    isGlobal: true,
    isActive: true,
    priceAdd: 5,
  },
  {
    name: 'Branco',
    hex: '#FFFFFF',
    gramsAvailable: 2000,
    spoolStatus: 'available' as const,
    isGlobal: true,
    isActive: true,
    priceAdd: 0,
  },
  {
    name: 'Amarelo',
    hex: '#FED607',
    gramsAvailable: 750,
    spoolStatus: 'available' as const,
    isGlobal: true,
    isActive: true,
    priceAdd: 0,
  },
  {
    name: 'Azul',
    hex: '#144995',
    gramsAvailable: 750,
    spoolStatus: 'available' as const,
    isGlobal: true,
    isActive: true,
    priceAdd: 0,
  },
]

type SeedColorMap = Map<string, { id: string; name: string; hex: string; priceAdd?: number }>
const menuProductSlugs = ['menu-rail-25cm', 'menu-letter-pack-standard', 'menu-letter-custom']

async function seedGlobalColors(): Promise<SeedColorMap> {
  console.log('\n🎨 Seeding global colors...')

  const existingColors = await dbAdmin.query({ globalColors: {} })
  const existingByName = new Map((existingColors.globalColors || []).map((c: any) => [c.name.toLowerCase(), c]))

  const transactions = []
  let created = 0
  let updated = 0

  for (const color of colorsToSeed) {
    const existing = existingByName.get(color.name.toLowerCase())
    if (existing) {
      transactions.push(
        dbAdmin.tx.globalColors[existing.id].update({
          hex: existing.hex ?? color.hex,
          gramsAvailable: existing.gramsAvailable ?? color.gramsAvailable,
          spoolStatus: existing.spoolStatus ?? color.spoolStatus,
          isGlobal: existing.isGlobal ?? true,
          isActive: existing.isActive ?? true,
          priceAdd: existing.priceAdd ?? color.priceAdd ?? 0,
          updatedAt: new Date(),
        })
      )
      console.log(`   🔁 Upserting ${color.name} (already exists)`)
      updated++
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

  const refreshedColors = await dbAdmin.query({ globalColors: {} })
  const colorMap: SeedColorMap = new Map()
  ;(refreshedColors.globalColors || []).forEach((color: any) => {
    colorMap.set(color.name.toLowerCase(), {
      id: color.id,
      name: color.name,
      hex: color.hex,
      priceAdd: color.priceAdd,
    })
  })

  console.log(`   ✅ Colors: ${created} created, ${updated} upserted`)
  return colorMap
}

function colorRef(colorMap: SeedColorMap, name: string) {
  const color = colorMap.get(name.toLowerCase())
  if (!color) throw new Error(`Global color not found: ${name}`)
  return color
}

function createInventory(slug: string, colorMap: SeedColorMap, names: string[]) {
  return {
    productSlug: slug,
    activeColorNames: names,
    colorInventory: names.map(name => {
      const color = colorRef(colorMap, name)
      return {
        globalColorId: color.id,
        colorName: color.name,
        colorHex: color.hex,
        offered: true,
        stockQuantity: 0,
        gramsAvailable: 0,
        priceAdd: color.priceAdd ?? 0,
      }
    }),
    stockQuantity: 0,
    stockStatus: 'made_to_order' as const,
    leadTimeDays: 4,
    visible: true,
    allowCustomColorRequest: true,
    updatedAt: new Date(),
  }
}

function createExampleProducts(colorMap: SeedColorMap) {
  const preto = colorRef(colorMap, 'Preto')
  const madeira = colorRef(colorMap, 'Madeira')
  const branco = colorRef(colorMap, 'Branco')
  const amarelo = colorRef(colorMap, 'Amarelo')
  const azul = colorRef(colorMap, 'Azul')

  return [
    {
      slug: 'menu-rail-25cm',
      name: 'Calha Menu Modular 25cm',
      priceFrom: 8,
      priceTo: 8,
      description: 'Calha interligavel de 25cm para sistemas de menu modular EM3D.',
      benefit: 'Base limpa e robusta para linhas de menu profissionais',
      image: '/placeholder.svg',
      featured: false,
      featuredRank: 0,
      visible: false,
      colorSelectionMode: 'single' as const,
      customizable: true,
      multiColor: false,
      multiColorCount: 1,
      category: 'empresas',
      categorySlugs: ['empresas', 'menus', 'componentes'],
      variants: [],
      materialRecipe: [{ label: 'Calha 25cm', grams: 85, materialType: 'PLA' as const, colorSource: 'partColor' as const }],
      materialGrams: 85,
      sortOrder: 10,
      inventoryColors: ['Preto', 'Branco', 'Madeira'],
    },
    {
      slug: 'menu-letter-pack-standard',
      name: 'Pack Letras Standard 300',
      priceFrom: 35,
      priceTo: 35,
      description: 'Pack standard com 300 letras, numeros e simbolos para menu modular EM3D.',
      benefit: 'Caracteres suficientes para menus compactos e sinaletica de balcão',
      image: '/placeholder.svg',
      featured: false,
      featuredRank: 0,
      visible: false,
      colorSelectionMode: 'single' as const,
      customizable: true,
      multiColor: false,
      multiColorCount: 1,
      category: 'empresas',
      categorySlugs: ['empresas', 'menus', 'componentes'],
      variants: [],
      materialRecipe: [{ label: 'Letras standard', grams: 120, materialType: 'PLA' as const, colorSource: 'partColor' as const }],
      materialGrams: 120,
      sortOrder: 11,
      inventoryColors: ['Preto', 'Branco', 'Amarelo', 'Azul'],
    },
    {
      slug: 'menu-letter-custom',
      name: 'Letras Avulso',
      priceFrom: 0.3,
      priceTo: 0.3,
      description: 'Letras, numeros e simbolos avulso para ajustar o menu sem comprar outro pack completo.',
      benefit: 'Pague apenas os caracteres extra de que precisa',
      image: '/placeholder.svg',
      featured: false,
      featuredRank: 0,
      visible: false,
      colorSelectionMode: 'single' as const,
      customizable: true,
      multiColor: false,
      multiColorCount: 1,
      category: 'empresas',
      categorySlugs: ['empresas', 'menus', 'componentes'],
      variants: [],
      materialRecipe: [{ label: 'Letras avulso', grams: 1, materialType: 'PLA' as const, colorSource: 'partColor' as const }],
      materialGrams: 1,
      sortOrder: 12,
      inventoryColors: ['Preto', 'Branco', 'Amarelo', 'Azul'],
    },
    {
      slug: 'suporte-telemovel-simples',
      name: 'Suporte de Telemóvel Simples',
      priceFrom: 10,
      priceTo: 15,
      description: 'Suporte compacto para telemóvel, ideal para secretária, chamadas e carregamento.',
      benefit: 'Mantém o telemóvel estável sem ocupar espaço',
      image: '/placeholder.svg',
      featured: false,
      featuredRank: 0,
      visible: true,
      colorSelectionMode: 'preset_options' as const,
      customizable: false,
      multiColor: false,
      multiColorCount: 1,
      category: 'casa-escritorio',
      categorySlugs: ['casa-escritorio', 'organização'],
      variants: [
        {
          id: 'preto-10',
          name: 'Preto',
          kind: 'single_color' as const,
          colorMode: 'fixed' as const,
          finalPrice: 10,
          colors: [{ name: preto.name, hex: preto.hex, globalColorId: preto.id, priceAdd: preto.priceAdd }],
        },
        {
          id: 'madeira-15',
          name: 'Madeira',
          kind: 'single_color' as const,
          colorMode: 'fixed' as const,
          finalPrice: 15,
          colors: [{ name: madeira.name, hex: madeira.hex, globalColorId: madeira.id, priceAdd: madeira.priceAdd }],
        },
      ],
      materialRecipe: [{ label: 'Suporte', grams: 45, materialType: 'PLA' as const, colorSource: 'variantColor' as const }],
      materialGrams: 45,
      sortOrder: 30,
      inventoryColors: ['Preto', 'Madeira'],
    },
    {
      slug: 'organizador-secretaria-standard',
      name: 'Organizador de Secretária Standard',
      priceFrom: 18,
      priceTo: 21,
      description: 'Organizador modular para canetas, notas e pequenos acessórios de trabalho.',
      benefit: 'Arruma a secretária com uma peça simples e resistente',
      image: '/placeholder.svg',
      featured: false,
      featuredRank: 0,
      visible: true,
      colorSelectionMode: 'preset_options' as const,
      customizable: false,
      multiColor: false,
      multiColorCount: 1,
      category: 'casa-escritorio',
      categorySlugs: ['casa-escritorio', 'organização'],
      variants: [
        {
          id: 'standard-cor-stock',
          name: 'Standard',
          kind: 'single_color' as const,
          colorMode: 'customer_choice' as const,
          finalPrice: 18,
          allowedGlobalColorIds: [preto.id, branco.id, amarelo.id, azul.id],
          colors: [],
        },
      ],
      materialRecipe: [{ label: 'Corpo', grams: 95, materialType: 'PLA' as const, colorSource: 'partColor' as const }],
      materialGrams: 95,
      sortOrder: 31,
      inventoryColors: ['Preto', 'Branco', 'Amarelo', 'Azul'],
    },
    {
      slug: 'tabuleiro-secretaria-multipartes',
      name: 'Tabuleiro de Secretária Multi-partes',
      priceFrom: 24,
      priceTo: 30,
      description: 'Tabuleiro de secretária com base e divisórias em cores escolhidas separadamente.',
      benefit: 'Organização visual com cores por zona',
      image: '/placeholder.svg',
      featured: false,
      featuredRank: 0,
      visible: true,
      colorSelectionMode: 'preset_options' as const,
      customizable: false,
      multiColor: true,
      multiColorCount: 2,
      category: 'casa-escritorio',
      categorySlugs: ['casa-escritorio', 'organização'],
      variants: [
        {
          id: 'base-divisorias',
          name: 'Base + divisórias',
          kind: 'preset_pack' as const,
          colorMode: 'multi_part' as const,
          finalPrice: 24,
          colors: [],
          parts: [
            { label: 'Base', grams: 120, materialType: 'PLA' as const, colorSource: 'customer_choice' as const, allowedGlobalColorIds: [preto.id, branco.id, madeira.id] },
            { label: 'Divisórias', grams: 55, materialType: 'PLA' as const, colorSource: 'customer_choice' as const, allowedGlobalColorIds: [preto.id, branco.id, amarelo.id, azul.id] },
          ],
        },
      ],
      materialRecipe: [
        { label: 'Base', grams: 120, materialType: 'PLA' as const, colorSource: 'partColor' as const },
        { label: 'Divisórias', grams: 55, materialType: 'PLA' as const, colorSource: 'partColor' as const },
      ],
      materialGrams: 175,
      sortOrder: 32,
      inventoryColors: ['Preto', 'Branco', 'Madeira', 'Amarelo', 'Azul'],
    },
    {
      slug: 'porta-chaves-personalizado',
      name: 'Porta-chaves Personalizado',
      priceFrom: 8,
      priceTo: 11,
      description: 'Porta-chaves leve com texto curto personalizado e cor à escolha.',
      benefit: 'Pequeno presente útil com nome ou iniciais',
      image: '/placeholder.svg',
      featured: true,
      featuredRank: 1,
      visible: true,
      colorSelectionMode: 'preset_options' as const,
      customizable: true,
      multiColor: false,
      multiColorCount: 1,
      category: 'presentes',
      categorySlugs: ['presentes', 'personalizado'],
      variants: [
        {
          id: 'texto-cor-stock',
          name: 'Texto + cor',
          kind: 'custom_text' as const,
          colorMode: 'customer_choice' as const,
          finalPrice: 8,
          allowedGlobalColorIds: [preto.id, branco.id, amarelo.id, azul.id],
          colors: [],
          customizationOptions: [{ type: 'text' as const, label: 'Texto', maxChars: 14, priceAdd: 0 }],
        },
      ],
      materialRecipe: [{ label: 'Porta-chaves', grams: 18, materialType: 'PLA' as const, colorSource: 'partColor' as const }],
      materialGrams: 18,
      sortOrder: 33,
      inventoryColors: ['Preto', 'Branco', 'Amarelo', 'Azul'],
    },
  ]
}

async function seedProducts(colorMap: SeedColorMap): Promise<void> {
  console.log('\n📦 Seeding products...')
  const exampleProductsToSeed = createExampleProducts(colorMap).filter((product) => menuProductSlugs.includes(product.slug))

  const existingProducts = await dbAdmin.query({
    catalogProducts: {
      $: {
        where: {
          slug: { $in: exampleProductsToSeed.map((p) => p.slug) },
        },
      },
    },
    productInventory: {},
  })

  const transactions = []
  let created = 0
  let updated = 0

  for (const product of exampleProductsToSeed) {
    const existingProduct = (existingProducts.catalogProducts || []).find((p: any) => p.slug === product.slug)

    const productId = existingProduct?.id || id()
    const existingInventory = (existingProducts.productInventory || []).find((inv: any) => inv.productSlug === product.slug || inv.productId === productId)
    const inventoryId = existingInventory?.id || id()
    const now = new Date()

    // Create images array from single image
    const images = [product.image]

    if (existingProduct) {
      console.log(`   🔄  Updating ${product.slug}`)
      updated++
    } else {
      console.log(`   ✨  Creating ${product.slug}`)
      created++
    }

    transactions.push(
      dbAdmin.tx.catalogProducts[productId].update({
        slug: product.slug,
        name: product.name,
        category: product.category,
        categorySlugs: product.categorySlugs,
        priceFrom: product.priceFrom,
        priceTo: product.priceTo,
        aspectRatio: (product as any).aspectRatio,
        description: product.description,
        benefit: product.benefit,
        image: product.image,
        images,
        visible: product.visible,
        featured: product.featured,
        featuredRank: (product as any).featuredRank,
        sortOrder: product.sortOrder,
        customizable: product.customizable,
        customizationOptions: [],
        multiColor: product.multiColor,
        multiColorCount: product.multiColorCount,
        colorSelectionMode: product.colorSelectionMode,
        variants: product.variants ?? [],
        productionJobTemplates: (product as any).productionJobTemplates,
        materialRecipe: product.materialRecipe,
        materialGrams: product.materialGrams,
        stlFiles: [],
        slicerNotes: '',
        updatedAt: now,
      })
    )
    transactions.push(dbAdmin.tx.productInventory[inventoryId].update(createInventory(product.slug, colorMap, product.inventoryColors)))
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
    const colorMap = await seedGlobalColors()
    await seedProducts(colorMap)

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
