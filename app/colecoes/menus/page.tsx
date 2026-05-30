'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, BadgeEuro, Coffee, Info, Scissors, Store } from 'lucide-react'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'

const MENU_LINE_BUILDER_DRAFT_KEY = 'em3d-menu-line-builder-v1'
const BUILDER_ROUTE = '/colecoes/modular/builder'

type MenuTemplateLine = {
  label: string
  detail: string
}

type MenuTemplate = {
  id: string
  category: string
  title: string
  description: string
  image: string
  icon: typeof Coffee
  lines: MenuTemplateLine[]
}

const templates: MenuTemplate[] = [
  {
    id: 'cafe-specialty',
    category: 'Cafe',
    title: 'Cafetaria & Padaria',
    description: 'Uma base direta para cafes de especialidade, pastelarias e menus de balcao.',
    image: '/about/products.jpg',
    icon: Coffee,
    lines: [
      { label: 'ESPRESSO', detail: '1,50' },
      { label: 'AMERICANO', detail: '2,00' },
      { label: 'CAPPUCCINO', detail: '2,80' },
      { label: 'CROISSANT', detail: '2,50' },
      { label: 'BOLO DO DIA', detail: '3,20' },
    ],
  },
  {
    id: 'barbershop-services',
    category: 'Barbershop',
    title: 'Barbearia & Servicos',
    description: 'Tabela premium para servicos recorrentes, packs e precos simples de ler.',
    image: '/about/workshop.jpg',
    icon: Scissors,
    lines: [
      { label: 'CORTE', detail: '18' },
      { label: 'BARBA', detail: '12' },
      { label: 'CORTE + BARBA', detail: '26' },
      { label: 'ACABAMENTO', detail: '8' },
      { label: 'PACK MENSAL', detail: '45' },
    ],
  },
  {
    id: 'space-info',
    category: 'Info',
    title: 'Informacao de Espaco',
    description: 'Sinaletica util para lojas, coworks, restaurantes e zonas de atendimento.',
    image: '/about/printer.jpg',
    icon: Info,
    lines: [
      { label: 'WIFI', detail: 'em3dguest' },
      { label: 'PASSWORD', detail: 'menu2026' },
      { label: 'RESTROOMS', detail: 'LEFT' },
      { label: 'PICKUP', detail: 'COUNTER' },
      { label: 'OPEN', detail: '09-19H' },
    ],
  },
]

function TemplatePreview({ lines }: { lines: MenuTemplateLine[] }) {
  return (
    <div className="space-y-2">
      {lines.slice(0, 4).map((line, index) => (
        <div key={`${line.label}-${index}`} className="relative h-11 overflow-hidden rounded-md border border-white/12 bg-[#111111]">
          <div className="absolute inset-0 grid grid-cols-3">
            <span className="border-r border-white/10" />
            <span className="border-r border-white/10" />
            <span />
          </div>
          <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 items-center justify-between gap-3 text-[0.68rem] font-black tracking-[0.12em] text-white">
            <span className="truncate">{line.label}</span>
            <span className="shrink-0 text-[#d4af37]">{line.detail}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function TemplateCard({ template }: { template: MenuTemplate }) {
  const router = useRouter()
  const Icon = template.icon

  function personalizeTemplate() {
    window.localStorage.setItem(MENU_LINE_BUILDER_DRAFT_KEY, JSON.stringify({
      version: 1,
      source: 'template',
      templateId: template.id,
      templateTitle: template.title,
      lines: template.lines,
      createdAt: new Date().toISOString(),
    }))
    router.push(`${BUILDER_ROUTE}?template=${encodeURIComponent(template.id)}`)
  }

  return (
    <article className="group overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm transition duration-200 hover:border-black/20 hover:shadow-[0_22px_60px_rgba(15,15,14,0.10)]">
      <div className="relative aspect-[5/4] overflow-hidden bg-[#111111]">
        <Image
          src={template.image}
          alt={template.title}
          fill
          className="object-cover opacity-68 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-78"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/48 to-black/8" />
        <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/16 bg-black/34 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
          <Icon className="size-4 text-[#d4af37]" />
          {template.category}
        </div>
        <div className="absolute inset-x-5 bottom-5">
          <TemplatePreview lines={template.lines} />
        </div>
      </div>
      <div className="p-5">
        <h2 className="text-2xl font-semibold tracking-tight">{template.title}</h2>
        <p className="mt-3 min-h-12 text-sm leading-6 text-stone-600">{template.description}</p>
        <Button
          type="button"
          onClick={personalizeTemplate}
          className="mt-5 h-12 w-full cursor-pointer bg-[#171717] text-white hover:bg-[#d4af37] hover:text-[#171717]"
        >
          Personalizar este modelo
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </article>
  )
}

export default function MenuTemplatesPage() {
  return (
    <main className="min-h-screen bg-[#f8f7f3] text-[#171717]">
      <Header />

      <section className="px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-[1500px]">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-[#7b5a2b]">
                <Store className="size-4" />
                Colecao modular
              </p>
              <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[0.96] tracking-tight sm:text-7xl">
                Inspire-se. Comece por um template.
              </h1>
            </div>
            <div className="max-w-2xl lg:justify-self-end">
              <p className="text-lg leading-8 text-stone-600">
                Escolha uma base, personalize nomes e detalhes, e avance para a calculadora. Cada linha mantem a logica premium do sistema: nome em cor base, preco ou detalhe em cor de destaque.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-stone-700">
                <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2">
                  <BadgeEuro className="size-4 text-[#7b5a2b]" />
                  Precos editaveis
                </span>
                <span className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2">
                  Linhas em 2 zonas
                </span>
                <span className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2">
                  Draft pronto para o builder V1
                </span>
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {templates.map(template => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:px-10 lg:pb-24">
        <div className="mx-auto max-w-7xl border-y border-black/10 py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b5a2b]">Regra V1</p>
          <p className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-tight">
            O sistema calcula o comprimento ideal. Podera organizar as linhas na sua parede da forma que preferir.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  )
}
