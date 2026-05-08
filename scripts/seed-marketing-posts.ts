#!/usr/bin/env node
/**
 * Seeds editable Instagram marketing drafts for Foto3D.pt.
 *
 * Run with:
 *   npx tsx scripts/seed-marketing-posts.ts
 *   npx tsx scripts/seed-marketing-posts.ts --count 9
 *   npx tsx scripts/seed-marketing-posts.ts --count 20
 */

import { id, init } from '@instantdb/admin'
import dotenv from 'dotenv'
import path from 'path'
import schema from '../instant.schema.ts'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const INSTANT_APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID
const INSTANT_APP_ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN
const MARKETING_SEED_USER_ID = process.env.MARKETING_SEED_USER_ID || 'marketing-seed'

if (!INSTANT_APP_ID || !INSTANT_APP_ADMIN_TOKEN) {
  console.error('Missing required environment variables:')
  if (!INSTANT_APP_ID) console.error('   - NEXT_PUBLIC_INSTANT_APP_ID')
  if (!INSTANT_APP_ADMIN_TOKEN) console.error('   - INSTANT_APP_ADMIN_TOKEN')
  process.exit(1)
}

const dbAdmin = init({
  appId: INSTANT_APP_ID,
  adminToken: INSTANT_APP_ADMIN_TOKEN,
  schema,
})

type MarketingSeed = {
  title: string
  contentType: 'post' | 'story' | 'reel'
  caption: string
  hashtags: string[]
  callToAction?: string
  firstComment?: string
  storyHighlightCategory?: string
  isCarousel?: boolean
}

function getCount() {
  const countIndex = process.argv.indexOf('--count')
  const rawValue = countIndex >= 0 ? process.argv[countIndex + 1] : undefined
  const value = Number(rawValue ?? 20)

  if (value === 9 || value === 20) return value

  console.error('Use --count 9 or --count 20.')
  process.exit(1)
}

const hashtagCore = ['#foto3dpt', '#litofania', '#impressao3d', '#feitoemportugal', '#presentespersonalizados']

const marketingSeeds: MarketingSeed[] = [
  {
    title: 'Antes de acender parece simples',
    contentType: 'post',
    caption: 'Uma lithophane tem esse momento bonito: apagada é discreta, acesa revela a fotografia. A surpresa faz parte da peça.',
    hashtags: [...hashtagCore, '#decoracaocommemoria'],
    callToAction: 'Escolhe o formato e envia a foto para revisão gratuita.',
    firstComment: 'Ideia de visual: peça apagada no primeiro slide, luz quente no segundo.',
    isCarousel: true,
  },
  {
    title: 'A foto certa faz toda a diferença',
    contentType: 'story',
    caption: 'Fotos nítidas, bem iluminadas e com o rosto em destaque tendem a resultar melhor. Antes de produzir, validamos a imagem contigo.',
    hashtags: ['#foto3dpt', '#dicasdefoto', '#litofania'],
    storyHighlightCategory: 'Dicas',
  },
  {
    title: 'Pagamento só depois da revisão',
    contentType: 'post',
    caption: 'Envias a fotografia, nós validamos se funciona para lithophane e só depois seguimos para confirmação e pagamento.',
    hashtags: [...hashtagCore, '#comprasegura'],
    callToAction: 'Começa pela revisão gratuita.',
  },
  {
    title: 'Moldura quadrada para memórias centradas',
    contentType: 'post',
    caption: 'O formato 1:1 é perfeito para retratos centrados, fotos de Instagram e imagens com composição simétrica.',
    hashtags: [...hashtagCore, '#moldurapersonalizada'],
    callToAction: 'Experimenta a variante quadrada da Coleção Lithophane.',
  },
  {
    title: 'Retrato 4:5 para pessoas',
    contentType: 'story',
    caption: 'A variante retrato dá espaço a rostos, casais, família e fotografias verticais.',
    hashtags: ['#foto3dpt', '#retratopersonalizado', '#presentescomsignificado'],
    storyHighlightCategory: 'Formatos',
  },
  {
    title: 'Paisagem 16:9 para viagens e casas',
    contentType: 'post',
    caption: 'Uma praia, uma casa antiga, uma serra, uma cidade. O formato paisagem transforma lugares em luz ambiente.',
    hashtags: [...hashtagCore, '#viagensememorias'],
    callToAction: 'Escolhe Paisagem no configurador.',
  },
  {
    title: 'Bastidores da impressão camada a camada',
    contentType: 'reel',
    caption: 'Cada peça nasce em camadas finas. A fotografia aparece pela espessura do material quando a luz atravessa o painel.',
    hashtags: [...hashtagCore, '#behindthescenes', '#makerportugal'],
    callToAction: 'Segue para ver a próxima peça sair da impressora.',
  },
  {
    title: 'Candeeiros personalizados estão no radar',
    contentType: 'story',
    caption: 'Molduras são a primeira coleção. Candeeiros e outros formatos de luz personalizada entram como próximos formatos comerciais.',
    hashtags: ['#foto3dpt', '#candeeiropersonalizado', '#brevemente'],
    storyHighlightCategory: 'Brevemente',
  },
  {
    title: 'Mapas 3D entram em breve',
    contentType: 'post',
    caption: 'Os mapas topográficos 3D ficam para a próxima fase. Para já, a coleção de abertura é lithophane: memórias, rostos e lugares transformados em luz.',
    hashtags: [...hashtagCore, '#mapas3d', '#brevemente'],
    callToAction: 'Guarda este post se tens um lugar especial em mente.',
  },
  {
    title: 'Peças B2B sem grandes mínimos',
    contentType: 'post',
    caption: 'Nem todas as marcas precisam de contratos com grandes fábricas. Pequenas séries, brindes e displays locais podem ser testados com mais rapidez.',
    hashtags: ['#foto3dpt', '#b2bportugal', '#impressao3d', '#brindespersonalizados'],
    callToAction: 'Pede uma proposta para a tua marca.',
  },
  {
    title: 'QR em peças físicas como teaser B2B',
    contentType: 'story',
    caption: 'Estamos a explorar peças com QR para campanhas, eventos e ativações. Para já recolhemos interesse via formulário B2B.',
    hashtags: ['#foto3dpt', '#qrcode', '#marketingb2b'],
    storyHighlightCategory: 'Empresas',
  },
  {
    title: 'Presentes que não parecem genéricos',
    contentType: 'post',
    caption: 'Uma fotografia escolhida por alguém transforma um objeto simples numa peça com intenção.',
    hashtags: [...hashtagCore, '#presentesoriginais'],
    callToAction: 'Envia a tua fotografia para revisão.',
  },
  {
    title: 'Como escolhemos a luz quente',
    contentType: 'reel',
    caption: 'A luz quente valoriza rostos e ambientes de casa. A ideia é que a peça pareça memória, não ecrã.',
    hashtags: [...hashtagCore, '#luzambiente'],
  },
  {
    title: 'Da fotografia ao recorte final',
    contentType: 'post',
    caption: 'O recorte no configurador ajuda a preparar a proporção certa para cada variante: 1:1, 4:5 ou 16:9.',
    hashtags: [...hashtagCore, '#configurador'],
    callToAction: 'Escolhe o formato antes de carregar a foto.',
  },
  {
    title: 'Produção local em Lisboa',
    contentType: 'story',
    caption: 'Revisão, impressão, montagem e embalagem acontecem localmente para manter controlo no detalhe.',
    hashtags: ['#foto3dpt', '#lisboa', '#feitoemportugal'],
    storyHighlightCategory: 'Bastidores',
  },
  {
    title: 'Para equipas e eventos',
    contentType: 'post',
    caption: 'Nomes, QR codes, pequenas séries e peças para balcões ou eventos. A impressão 3D ajuda a testar ideias sem moldes industriais.',
    hashtags: ['#foto3dpt', '#eventoscorporativos', '#impressao3d'],
    callToAction: 'Conta-nos a campanha no formulário B2B.',
  },
  {
    title: 'Quando a foto antiga ainda resulta',
    contentType: 'post',
    caption: 'Fotos antigas podem resultar bem quando estão digitalizadas com nitidez e contraste. Se não funcionar, pedimos uma alternativa antes de avançar.',
    hashtags: [...hashtagCore, '#fotografiasantigas'],
  },
  {
    title: 'O que acontece depois do pedido',
    contentType: 'story',
    caption: 'Recebemos a foto, validamos, confirmamos pagamento, produzimos e enviamos. Simples, mas com olhos humanos no passo importante.',
    hashtags: ['#foto3dpt', '#comofunciona'],
    storyHighlightCategory: 'Como funciona',
  },
  {
    title: 'Uma coleção para abrir caminho',
    contentType: 'post',
    caption: 'A Coleção Lithophane é o ponto de partida: molduras agora, outros formatos de luz personalizada logo a seguir.',
    hashtags: [...hashtagCore, '#colecaolithophane'],
    callToAction: 'Vê a coleção no site.',
  },
  {
    title: 'Peças pequenas também contam marca',
    contentType: 'post',
    caption: 'Um suporte, uma placa, um brinde ou um display podem resolver uma necessidade concreta de marca sem parecer merchandise igual a todos.',
    hashtags: ['#foto3dpt', '#brindescorporativos', '#designlocal'],
    callToAction: 'Pede ideias para a tua empresa.',
  },
]

async function main() {
  const count = getCount()
  const now = new Date()

  console.log('Seeding marketing drafts')
  console.log(`Count: ${count}`)

  const [existingPosts, catalog] = await Promise.all([
    dbAdmin.query({ marketingPosts: {} }),
    dbAdmin.query({
      catalogProducts: {
        $: {
          where: { slug: 'moldura' },
        },
      },
    }),
  ])

  const existingTitles = new Set(
    (existingPosts.marketingPosts ?? []).map((post: any) => String(post.title ?? '').trim().toLowerCase()),
  )
  const lithophaneProductId = catalog.catalogProducts?.[0]?.id
  const selectedSeeds = marketingSeeds.slice(0, count)
  const transactions = []
  let created = 0
  let skipped = 0

  for (const seed of selectedSeeds) {
    const titleKey = seed.title.trim().toLowerCase()
    if (existingTitles.has(titleKey)) {
      console.log(`Skipping duplicate title: ${seed.title}`)
      skipped++
      continue
    }

    transactions.push(
      dbAdmin.tx.marketingPosts[id()].update({
        platform: 'instagram',
        contentType: seed.contentType,
        status: 'draft',
        userId: MARKETING_SEED_USER_ID,
        title: seed.title,
        caption: seed.caption,
        hashtags: seed.hashtags,
        callToAction: seed.callToAction,
        firstComment: seed.contentType === 'story' ? undefined : seed.firstComment,
        storyHighlightCategory: seed.contentType === 'story' ? seed.storyHighlightCategory : undefined,
        mediaUrls: [],
        productIds: lithophaneProductId ? [lithophaneProductId] : [],
        isCarousel: seed.contentType === 'post' && Boolean(seed.isCarousel),
        timezone: 'Europe/Lisbon',
        reminderOffsetHours: 1,
        reminderSent: false,
        createdAt: now,
        updatedAt: now,
      }),
    )
    existingTitles.add(titleKey)
    created++
  }

  if (transactions.length) {
    await dbAdmin.transact(transactions)
  }

  console.log(`Done: ${created} created, ${skipped} skipped.`)
}

main().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
