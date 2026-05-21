import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Building2, Coffee, Palette, Ruler, Store } from 'lucide-react'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'

const useCases = [
  {
    title: 'Menus e preços',
    copy: 'Para cafés, bares e pastelarias que precisam de atualizar texto sem refazer a peça inteira.',
    icon: Coffee,
  },
  {
    title: 'Sinalética interior',
    copy: 'Linhas modulares para salas, zonas, horários, regras de acesso e mensagens operacionais.',
    icon: Building2,
  },
  {
    title: 'Marca no espaço',
    copy: 'Letreiros interiores com letras físicas, cores controladas e pedidos especiais em texto.',
    icon: Store,
  },
]

const facts = [
  { label: 'Módulos de 25cm', icon: Ruler },
  { label: 'Até 12 módulos / 300cm', icon: Ruler },
  { label: 'Cores globais ativas', icon: Palette },
]

const productExamples = [
  {
    title: 'Café de bairro',
    copy: 'Menu principal, especiais da semana e símbolos extra para rotação rápida.',
    image: 'https://pub-f8e78bd948414156890e0632ecc170b9.r2.dev/collections/menu/fabrizio-coco-9bi4ilWgMmU-unsplash%20(1).jpg',
  },
  {
    title: 'Loja e showroom',
    copy: 'Lista de preços, campanha curta ou painel interior de produto.',
    image: 'https://pub-f8e78bd948414156890e0632ecc170b9.r2.dev/collections/menu/sokha-michael-Pv1mDy4FWWc-unsplash%20(1).jpg',
  },
  {
    title: 'Studio de serviços',
    copy: 'Serviços, preços desde, marcações e mensagens sazonais.',
    image: 'https://pub-f8e78bd948414156890e0632ecc170b9.r2.dev/collections/menu/matthew-jungling-IY44r8Wd5XI-unsplash%20(1).jpg',
  },
]

function ProductSignal() {
  const rows = [
    { label: 'CAFÉ ESPRESSO', detail: '1,20€' },
    { label: 'SALA PRIVADA', detail: 'RESERVAS' },
    { label: 'NOVA COLEÇÃO', detail: '2026' },
  ]

  return (
    <div className="relative mx-auto w-full max-w-3xl" aria-hidden="true">
      <div className="space-y-5">
        {rows.map((row, rowIndex) => (
          <div key={row.label} className="overflow-hidden rounded-lg border border-white/12 bg-[#151515] shadow-[0_20px_44px_rgba(0,0,0,0.34)]">
            <div className="relative flex h-16">
              {Array.from({ length: 5 }).map((_, index) => (
                <span
                  key={index}
                  className={`relative flex-1 border-r border-white/10 last:border-r-0 ${index === 0 ? 'bg-[#0d0d0d]' : 'bg-[#24231f]'}`}
                >
                  {index === 0 && <span className="absolute inset-y-3 left-3 w-1 rounded-full bg-white/20" />}
                  <span className="absolute inset-x-3 bottom-3 h-1 rounded-full bg-white/10" />
                </span>
              ))}
              <div className="absolute inset-x-5 top-1/2 flex -translate-y-1/2 items-center justify-between gap-4 text-sm font-black tracking-[0.08em] text-[#f8f4e9] sm:text-lg">
                <span className="truncate">{row.label}</span>
                <span className={rowIndex === 1 ? 'shrink-0 text-[#d4af37]' : 'shrink-0 text-[#f8f4e9]'}>{row.detail}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ModularCollectionPage() {
  return (
    <main className="min-h-screen bg-white text-[#171717]">
      <Header />

      <section className="relative overflow-hidden bg-[#111111] text-white">
        <Image
          src="/about/workshop.jpg"
          alt="Oficina EM3D onde peças modulares são produzidas"
          fill
          priority
          className="object-cover opacity-38"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,17,17,0.92),rgba(17,17,17,0.68)_52%,rgba(17,17,17,0.38))]" />
        <div className="relative mx-auto grid min-h-[calc(100vh-64px)] max-w-[1500px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:px-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af37]">Collection 01</p>
            <h1 className="mt-5 text-5xl font-semibold leading-[0.98] tracking-tight sm:text-7xl lg:text-8xl">
              Sinalética Modular
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/74 sm:text-xl">
              Um sistema físico de calhas e letras para menus, preços, espaços e marca. Cada linha partilha a mesma largura, mantendo a leitura limpa e a produção previsível.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 bg-white px-7 text-base text-[#171717] hover:bg-white/88">
                <Link href="/colecoes/modular/builder">
                  Configurar o meu sistema
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
            </div>
          </div>
          <ProductSignal />
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b5a2b]">Produto</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Uma base permanente para mensagens que mudam.
            </h2>
          </div>
          <div className="grid gap-8">
            <p className="text-lg leading-8 text-stone-600">
              A Collection 01 combina calhas de 25cm e letras físicas numa peça editável. Escolhe uma largura global, define as cores e envia pedidos especiais como texto para validação antes da produção.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {facts.map((fact) => {
                const Icon = fact.icon
                return (
                  <div key={fact.label} className="border-t border-black/10 pt-4">
                    <Icon className="size-5 text-[#7b5a2b]" />
                    <p className="mt-4 text-sm font-semibold text-stone-900">{fact.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-[#f7f7f5] px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b5a2b]">Casos de uso</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Pensado para espaços reais.</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {useCases.map((useCase) => {
              const Icon = useCase.icon
              return (
                <article key={useCase.title} className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
                  <Icon className="size-5 text-[#7b5a2b]" />
                  <h3 className="mt-5 text-xl font-semibold">{useCase.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{useCase.copy}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b5a2b]">Exemplos</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              A mesma base para vários interiores.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {productExamples.map(example => (
              <article key={example.title} className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
                <div className="relative aspect-[4/3]">
                  <Image src={example.image} alt={example.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold">{example.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{example.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 border-y border-black/10 py-12 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7b5a2b]">Configuração</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Ajusta largura, conteúdo e cores antes de encomendar.
            </h2>
          </div>
          <Button asChild size="lg" className="h-13 bg-[#171717] px-7 text-white hover:bg-[#2f2f2f]">
            <Link href="/colecoes/modular/builder">
              Abrir configurador
              <ArrowRight className="size-5" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}
