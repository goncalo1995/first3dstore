import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Building2, Check, Gift, Home, MessageSquareText, PackageCheck, PenLine, Sparkles, Store, Wand2 } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'

const bestsellers = [
  {
    title: 'Placa Casa Nova',
    text: 'Uma peça simples para marcar uma porta, uma entrada ou uma memória de mudança.',
    href: '/produto/moldura-quadrada',
    image: '/about/products.jpg',
    price: 'desde 39 EUR',
  },
  {
    title: 'Candeeiro com Nome',
    text: 'Luz ambiente personalizada para quartos, presentes e pequenos momentos especiais.',
    href: '/produto/candeeiros',
    image: '/hero.png',
    price: 'desde 59 EUR',
  },
  {
    title: 'Retrato em Luz',
    text: 'Uma fotografia transformada numa peça luminosa, revista antes de produzir.',
    href: '/produto/moldura-retrato',
    image: '/about/workshop.jpg',
    price: 'desde 44 EUR',
  },
]

const categories = [
  {
    title: 'Casa & Organização',
    text: 'Peças úteis, discretas e feitas à medida para resolver pequenos problemas do dia a dia.',
    icon: Home,
  },
  {
    title: 'Secretária',
    text: 'Acessórios funcionais para trabalhar melhor, arrumar melhor e personalizar o espaço.',
    icon: Store,
  },
  {
    title: 'Empresas',
    text: 'Brindes, protótipos e pequenas séries com acabamento cuidado e produção local.',
    icon: Building2,
  },
]

const galleryItems = [
  {
    title: 'Sala de Estar',
    alt: 'Living room setting',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Para transformar uma fotografia de família numa peça central acolhedora.',
    // detail: 'Funciona especialmente bem em aparadores, estantes e mesas laterais onde a luz ambiente já faz parte do ritual da casa.',
    className: 'md:col-span-2 md:row-span-2',
  },
  {
    title: 'Quarto de Bebé',
    alt: 'Nursery room setting',
    image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Uma luz suave para celebrar os primeiros meses, batizados ou retratos de recém-nascido.',
    // detail: 'O brilho âmbar fica discreto e íntimo, ideal para um presente emocional sem parecer demasiado decorativo.',
    className: 'md:col-span-2',
  },
  {
    title: 'Escritório',
    alt: 'Office setting',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Para ter uma memória pessoal no espaço de trabalho sem perder o aspeto profissional.',
    // detail: 'Combina bem com molduras mais sóbrias e bases escuras.',
    className: 'md:col-span-2',
  },
  {
    title: 'Quarto',
    alt: 'Bedroom setting',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Perfeito para fotografias de casal, viagens marcantes ou uma dedicatória privada.',
    // detail: 'A luz baixa cria uma presença tranquila, mais próxima de uma memória do que de um candeeiro comum.',
    className: 'md:col-span-2',
  },
  {
    title: 'Hall de Entrada',
    alt: 'Hallway setting',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85',
    occasion: 'Uma peça de boas-vindas para casas novas, ou recordações de família.',
    // detail: 'Boa opção para fotografias com silhuetas fortes ou arquitetura da casa.',
    className: 'md:col-span-2',
  },
  {
    title: 'Mapas Topográficos 3D',
    alt: '3D Topographic Map',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85',
    occasion: 'A próxima coleção para locais com significado: serra, praia, aldeia, trilho ou paisagem portuguesa.',
    detail: 'Brevemente. A coleção de abertura é Lithophane, focada em molduras luminosas e formatos de luz personalizados.',
    badge: 'Brevemente',
    className: 'md:col-span-4'
  },
]

const processSteps = [
  { title: 'Diz-nos o que queres', icon: PenLine },
  { title: 'Recebes proposta', icon: MessageSquareText },
  { title: 'Aprovas detalhes', icon: Check },
  { title: 'Produzimos', icon: PackageCheck },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      <section className="relative min-h-[88vh] overflow-hidden bg-[#101010] text-white">
        <Image
          src="/hero.png"
          alt="Objeto personalizado impresso em 3D"
          fill
          priority
          className="object-cover opacity-58"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.78),rgba(0,0,0,0.42),rgba(0,0,0,0.18))]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end px-5 pb-20 pt-28 sm:px-8 lg:px-10">
          <p className="mb-5 inline-flex w-fit items-center gap-2 border border-white/18 bg-white/10 px-4 py-2 text-sm font-medium text-white/82 backdrop-blur-md">
            <Sparkles className="size-4 text-primary" />
            Impressão 3D útil, personalizada e feita em Portugal
          </p>
          <h1 className="max-w-5xl font-serif text-5xl font-bold leading-[0.98] tracking-tight sm:text-7xl lg:text-8xl">
            Objetos úteis, feitos à tua medida.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/76 sm:text-xl">
            Da ideia ao objeto final: peças para casa, secretária, presentes e empresas, com design cuidado e produção local.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-14 bg-primary px-7 text-base text-primary-foreground hover:bg-primary/90">
              <Link href="/pedido-personalizado">
                Criar Produto Personalizado
                <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 border-white/25 bg-white/8 px-7 text-base text-white hover:bg-white hover:text-[#111111]">
              <Link href="#colecoes">Explorar Coleções</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="colecoes" className="px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Mais pedidos</p>
              <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Bestsellers com espaço para personalizar.</h2>
            </div>
            <Button asChild variant="ghost" className="w-fit text-primary hover:text-primary/80">
              <Link href="/loja">
                Ver loja
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {bestsellers.map((product) => (
              <Link key={product.title} href={product.href} className="group block overflow-hidden rounded-lg border border-border bg-card">
                <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{product.price}</p>
                  <h3 className="mt-3 text-xl font-semibold">{product.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{product.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="galeria" className="px-5 py-12 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.22em] text-primary">Get inspired</p>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white sm:text-5xl">Ideias para oferecer, decorar e guardar memórias com intenção.</h2>
            <p className="mt-4 font-sans text-lg leading-8 text-white/62">
              Cada formato ganha vida de maneira diferente consoante o espaço e a ocasião. Use estas ideias como ponto de partida para escolher a fotografia certa.
            </p>
          </div>
          <div className="grid auto-rows-[369px] gap-5 md:grid-cols-3">
            {galleryItems.map((item) => (
              <article key={item.title} className={`group relative overflow-hidden rounded-lg border border-white/10 bg-white/8 ${item.className}`}>
                <div className="absolute inset-0 overflow-hidden">
                  <Image src={item.image} alt={item.alt} fill className="object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100" sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
                <div className="absolute inset-0 bg-linear-to-t from-black/86 via-black/34 to-black/5" />
                {item.badge && (
                  <span className="absolute right-4 top-4 rounded-full border border-[#ffaa00]/35 bg-primary/16 px-3 py-1 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-[#ffd38b] backdrop-blur-md">
                    {item.badge}
                  </span>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="font-serif text-2xl font-bold text-white">{item.title}</p>
                  <p className="mt-2 max-w-xl font-sans text-sm leading-6 text-white/78">{item.occasion}</p>
                  {item.detail && <p className="mt-3 hidden max-w-xl font-sans text-xs leading-5 text-white/56 md:block">{item.detail}</p>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Categorias</p>
            <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Começa pelo uso, nós tratamos da forma.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <Link key={category.title} href="/loja" className="group rounded-lg border border-border bg-secondary p-6 transition hover:border-primary/45 hover:bg-card">
                  <Icon className="size-8 text-primary" />
                  <h3 className="mt-6 text-xl font-semibold">{category.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{category.text}</p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-secondary px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Processo</p>
            <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Quatro passos, sem complicar.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {processSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="rounded-lg border border-border bg-background p-6">
                  <div className="flex items-center justify-between">
                    <Icon className="size-7 text-primary" />
                    <span className="font-serif text-3xl font-bold text-foreground/18">{index + 1}</span>
                  </div>
                  <h3 className="mt-8 text-lg font-semibold">{step.title}</h3>
                </div>
              )
            })}
          </div>
          <div className="mt-10">
            <Button asChild size="lg" className="h-14 bg-primary px-7 text-base text-primary-foreground hover:bg-primary/90">
              <Link href="/pedido-personalizado">
                Fazer pedido personalizado
                <ArrowRight className="size-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 border-y border-border py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-3xl font-bold tracking-tight">Tens uma ideia específica?</h2>
            <p className="mt-2 text-muted-foreground">Descreve o que precisas e respondemos com uma proposta clara.</p>
          </div>
          <Button asChild size="lg" variant="outline" className="h-12 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            <Link href="/pedido-personalizado">
              Enviar pedido
              <Gift className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}
