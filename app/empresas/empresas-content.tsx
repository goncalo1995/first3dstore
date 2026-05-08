"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  Factory,
  Hotel,
  Loader2,
  PackageCheck,
  QrCode,
  Send,
  Sparkles,
  Store,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"

type LeadForm = {
  name: string
  company: string
  email: string
  description: string
}

const scenarios = [
  {
    title: "Eventos e ativações",
    text: "Badges, placas QR, brindes por equipa, displays de balcão e objetos com nome do evento.",
    icon: BadgeCheck,
  },
  {
    title: "Retalho e pop-ups",
    text: "Pequenas séries de sinalética, suportes, expositores e peças de campanha sem moldes caros.",
    icon: Store,
  },
  {
    title: "Hotelaria e restauração",
    text: "Menus QR físicos, marcadores de mesa, peças para quartos, receção e experiências locais.",
    icon: Hotel,
  },
  {
    title: "Equipas internas",
    text: "Kits de onboarding, prémios, peças para cultura de equipa e objetos úteis com identidade.",
    icon: Users,
  },
]

const products = [
  "Logótipos 3D e placas de marca",
  "Peças QR para campanhas e balcões",
  "Brindes personalizados por nome, equipa ou evento",
  "Displays pequenos para produto ou receção",
  "Molduras e candeeiros lithophane com identidade visual",
  "Protótipos e pequenas séries para validar procura",
]

const proofPoints = [
  "Sem mínimos industriais",
  "Produção local em Lisboa",
  "Personalização por unidade",
  "Iteração rápida antes de escalar",
]

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function EmpresasContent() {
  const [form, setForm] = useState<LeadForm>({ name: "", company: "", email: "", description: "" })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (!isValidEmail(form.email.trim())) {
      setError("Indique um email válido.")
      return
    }

    if (form.description.trim().length < 10) {
      setError("Descreva brevemente a ideia, quantidade ou objetivo da campanha.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/b2b-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.name.trim(),
          companyName: form.company.trim(),
          customerEmail: form.email.trim(),
          description: form.description.trim(),
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível enviar o pedido.")
      }

      setSuccess("Pedido recebido. Vamos responder com ideias e próximos passos.")
      setForm({ name: "", company: "", email: "", description: "" })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível enviar o pedido.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#121212] text-white">
      <section className="relative px-5 py-6 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[72vh] max-w-6xl blur-2xl"
          style={{
            background: "radial-gradient(circle at 50% 0%, rgba(255,170,0,0.42), rgba(255,170,0,0.12) 35%, transparent 72%)",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,18,18,0)_0%,#121212_86%)]" />

        <div className="relative mx-auto max-w-7xl">
          <nav className="flex items-center justify-between gap-4">
            <Link href="/" className="font-sans text-lg font-semibold tracking-tight">
              Foto3D.pt
            </Link>
            <div className="hidden items-center gap-5 font-sans text-sm text-white/66 md:flex">
              <a href="#cenarios" className="transition hover:text-[#ffaa00]">Cenários</a>
              <a href="#qr" className="transition hover:text-[#ffaa00]">QR teaser</a>
              <a href="#produtos-b2b" className="transition hover:text-[#ffaa00]">Produtos MVP</a>
              <a href="#contacto" className="transition hover:text-[#ffaa00]">Contacto</a>
            </div>
          </nav>

          <div className="grid min-h-[calc(100vh-3rem)] items-center gap-10 py-16 lg:grid-cols-[minmax(0,1fr)_440px]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#ffaa00]/25 bg-[#ffaa00]/10 px-4 py-2 font-sans text-sm font-semibold text-[#ffd38b]">
                <Sparkles className="h-4 w-4" />
                Impressão 3D personalizada para empresas
              </p>
              <h1 className="mt-6 max-w-4xl font-serif text-5xl font-bold leading-[0.98] tracking-tight text-white sm:text-7xl lg:text-8xl">
                Hiper-personalização sem contratos com grandes fábricas.
              </h1>
              <p className="mt-7 max-w-2xl font-sans text-lg leading-8 text-white/70">
                Criamos pequenas séries, brindes, displays, sinalética e peças com QR para marcas que querem testar ideias físicas com rapidez, presença e controlo local.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-14 bg-[#ffaa00] px-8 font-sans text-base text-[#121212] hover:bg-[#ffc14a]">
                  <a href="#contacto">
                    Pedir proposta
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 border-white/15 bg-white/8 px-8 font-sans text-base text-white backdrop-blur-md hover:bg-white/15 hover:text-white">
                  <Link href="/produto/moldura">Ver coleção base</Link>
                </Button>
              </div>
              <div className="mt-9 grid gap-3 sm:grid-cols-2">
                {proofPoints.map((point) => (
                  <div key={point} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/8 px-4 py-3 font-sans text-sm text-white/76 backdrop-blur-md">
                    <Check className="h-4 w-4 shrink-0 text-[#ffaa00]" />
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/8 p-5 shadow-2xl shadow-black/35 backdrop-blur-md">
              <div className="grid gap-4">
                {[
                  { label: "Campanha com QR", value: "teaser", icon: QrCode },
                  { label: "Peças por colaborador", value: "1 a 200", icon: Users },
                  { label: "Sem molde industrial", value: "produção local", icon: Factory },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-white/10 bg-[#121212]/70 p-5">
                    <item.icon className="h-7 w-7 text-[#ffaa00]" />
                    <p className="mt-4 font-sans text-sm text-white/50">{item.label}</p>
                    <p className="mt-1 font-serif text-3xl font-bold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="cenarios" className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.22em] text-[#ffaa00]">Onde faz diferença</p>
            <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-6xl">Objetos físicos que tornam uma campanha mais memorável.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {scenarios.map((scenario) => (
              <article key={scenario.title} className="rounded-lg border border-white/10 bg-white/8 p-6 backdrop-blur-md">
                <scenario.icon className="h-8 w-8 text-[#ffaa00]" />
                <h3 className="mt-5 font-serif text-2xl font-bold">{scenario.title}</h3>
                <p className="mt-3 font-sans text-sm leading-6 text-white/62">{scenario.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="qr" className="border-y border-white/5 bg-white/[0.03] px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.22em] text-[#ffaa00]">QR tracking teaser</p>
            <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-6xl">Peças que podem levar a campanha para o digital.</h2>
            <p className="mt-5 font-sans text-lg leading-8 text-white/68">
              Estamos a explorar peças físicas com QR para campanhas, eventos e ativações. Nesta fase é um teaser: recolhemos interesse e casos de uso pelo formulário, sem dashboard ou tracking real implementado ainda.
            </p>
            <Button asChild size="lg" className="mt-8 h-14 bg-[#ffaa00] px-8 font-sans text-base text-[#121212] hover:bg-[#ffc14a]">
              <a href="#contacto">
                Tenho interesse em QR
                <QrCode className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {["Scans por campanha", "Locais e datas", "Versões de peça"].map((metric) => (
              <div key={metric} className="rounded-lg border border-[#ffaa00]/20 bg-[#ffaa00]/10 p-5">
                <QrCode className="h-7 w-7 text-[#ffaa00]" />
                <p className="mt-5 font-serif text-2xl font-bold">{metric}</p>
                <p className="mt-2 font-sans text-sm leading-6 text-white/58">Conceito para validar procura B2B antes de desenvolver tracking.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="produtos-b2b" className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.22em] text-[#ffaa00]">Produtos para o MVP</p>
            <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-6xl">Começar pequeno, personalizar muito.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product} className="flex min-h-28 items-start gap-4 rounded-lg border border-white/10 bg-white/8 p-5">
                <PackageCheck className="mt-1 h-6 w-6 shrink-0 text-[#ffaa00]" />
                <p className="font-sans text-base leading-7 text-white/76">{product}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.22em] text-[#ffaa00]">Contacto B2B</p>
            <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-6xl">Conte-nos o cenário, nós propomos as peças.</h2>
            <p className="mt-5 font-sans text-lg leading-8 text-white/68">
              Indique objetivo, quantidade aproximada, prazo e se quer explorar QR, personalização por pessoa ou uma pequena série para testar no mercado.
            </p>
            <div className="mt-8 rounded-lg border border-white/10 bg-white/8 p-5">
              <Building2 className="h-8 w-8 text-[#ffaa00]" />
              <p className="mt-4 font-sans text-sm leading-6 text-white/62">
                Produzimos localmente e adaptamos a proposta ao nível de detalhe, prazo e acabamento que a marca precisa.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-lg border border-white/10 bg-white/8 p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="b2b-name" className="font-sans text-sm font-medium text-white/78">Nome</label>
                <input
                  id="b2b-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/8 px-4 font-sans text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#ffaa00]/70"
                  placeholder="O seu nome"
                />
              </div>
              <div>
                <label htmlFor="b2b-company" className="font-sans text-sm font-medium text-white/78">Empresa</label>
                <input
                  id="b2b-company"
                  value={form.company}
                  onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                  className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/8 px-4 font-sans text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#ffaa00]/70"
                  placeholder="Nome da empresa"
                />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="b2b-email" className="font-sans text-sm font-medium text-white/78">Email</label>
              <input
                id="b2b-email"
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/8 px-4 font-sans text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#ffaa00]/70"
                placeholder="nome@empresa.pt"
              />
            </div>
            <div className="mt-4">
              <label htmlFor="b2b-description" className="font-sans text-sm font-medium text-white/78">Descrição</label>
              <textarea
                id="b2b-description"
                required
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="mt-2 min-h-36 w-full resize-none rounded-lg border border-white/10 bg-white/8 px-4 py-3 font-sans text-sm leading-6 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffaa00]/70"
                placeholder="Ex: 80 peças para evento, cada uma com nome e QR; prazo de 3 semanas."
              />
            </div>

            {error && <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 font-sans text-sm text-red-100">{error}</p>}
            {success && <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 font-sans text-sm text-emerald-100">{success}</p>}

            <Button type="submit" disabled={isSubmitting} className="mt-5 h-12 w-full bg-[#ffaa00] font-sans text-[#121212] hover:bg-[#ffc14a]">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar pedido
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
