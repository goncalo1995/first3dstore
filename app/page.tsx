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

      <section className="border-y border-border bg-[#111111] px-5 py-16 text-white sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Mensagem por IA</p>
            <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Uma dedicatória pronta a acompanhar o presente.</h2>
            <p className="mt-5 max-w-xl leading-8 text-white/66">
              A EM3D pode ajudar a transformar uma intenção simples numa mensagem bonita para acompanhar uma peça personalizada.
            </p>
          </div>

          <div className="rounded-lg border border-white/12 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-white/10 bg-black/22 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">Ocasião</p>
                <p className="mt-2 font-medium">Casa nova</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/22 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">Tom</p>
                <p className="mt-2 font-medium">Caloroso e simples</p>
              </div>
            </div>
            <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-5">
              <div className="mb-4 flex items-center gap-2 text-primary">
                <Wand2 className="size-5" />
                <span className="text-sm font-semibold">Mensagem sugerida</span>
              </div>
              <p className="font-serif text-2xl leading-9">
                Que esta casa guarde conversas boas, luz nos dias compridos e pequenos detalhes que façam tudo parecer vosso.
              </p>
            </div>
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
