import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Building2, Home, Lightbulb, Mail, PackageCheck, PenLine, Upload } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Pedido Personalizado | EM3D',
  description: 'Descreva a sua ideia para uma peça personalizada impressa em 3D em Portugal.',
}

const requestTypes = [
  { title: 'Casa', text: 'Organização, decoração útil, placas, suportes e peças à medida.', icon: Home },
  { title: 'Presente', text: 'Uma peça personalizada com nome, data, mensagem ou fotografia.', icon: PackageCheck },
  { title: 'Empresa', text: 'Brindes, protótipos, sinalética e pequenas séries para marcas.', icon: Building2 },
]

export default function PedidoPersonalizadoPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      <section className="bg-[#111111] px-5 py-16 text-white sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Pedido personalizado</p>
            <h1 className="mt-4 font-serif text-5xl font-bold leading-[0.98] tracking-tight sm:text-7xl">
              Conta-nos a ideia. Nós tratamos da forma.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
              Envia uma descrição simples do que precisas. Respondemos com materiais, preço estimado, prazo e próximos passos.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 bg-primary px-7 text-base text-primary-foreground hover:bg-primary/90">
                <a href="mailto:geral@em3d.pt?subject=Pedido%20personalizado%20EM3D">
                  Enviar por email
                  <ArrowRight className="size-5" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 border-white/25 bg-white/8 px-7 text-base text-white hover:bg-white hover:text-[#111111]">
                <Link href="/loja">Ver loja</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-white/12 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Brief recomendado</p>
            <h2 className="mt-3 font-serif text-3xl font-bold">O essencial para começarmos bem.</h2>
            <div className="mt-6 grid gap-3">
              {['O que queres criar', 'Onde vai ser usado', 'Medidas aproximadas', 'Quantidade desejada', 'Fotografias ou esboços, se existirem'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-md border border-white/10 bg-black/22 p-4 text-sm text-white/72">
                  <Upload className="size-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Tipos de pedido</p>
            <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-5xl">O ponto de partida pode ser simples.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {requestTypes.map((type) => {
              const Icon = type.icon
              return (
                <div key={type.title} className="rounded-lg border border-border bg-secondary p-6">
                  <Icon className="size-8 text-primary" />
                  <h3 className="mt-6 text-xl font-semibold">{type.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{type.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-secondary px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-background p-6">
            <Lightbulb className="size-7 text-primary" />
            <h3 className="mt-5 text-lg font-semibold">Ideia</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Descreve o problema, o uso e a dimensão aproximada.</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-6">
            <PenLine className="size-7 text-primary" />
            <h3 className="mt-5 text-lg font-semibold">Proposta</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Respondemos com materiais, preço e prazo estimado.</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-6">
            <Mail className="size-7 text-primary" />
            <h3 className="mt-5 text-lg font-semibold">Contacto</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Até ao formulário completo, usamos email para rever cada pedido.</p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
