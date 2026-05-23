'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, BadgeEuro, Building2, Check, Loader2, Palette, Sparkles, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const GENERATED_WALLS_STORAGE_KEY = 'em3d-modular-planner-walls-v1'
const BUILDER_DRAFT_STORAGE_KEY = 'em3d-modular-builder-v3'
const BUILDER_TOAST_STORAGE_KEY = 'em3d-modular-builder-toast'
const FALLBACK_TOAST = 'A IA teve uma falha de criatividade. Mas não se preocupe, pode usar os nossos templates!'

const useCases = [
  {
    title: 'Preços',
    copy: 'Menus, serviços e campanhas que mudam sem refazer a peça toda.',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1400&q=82',
    icon: BadgeEuro,
  },
  {
    title: 'Sinalética',
    copy: 'WC, horários, zonas de recolha, salas e instruções de circulação.',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1400&q=82',
    icon: Building2,
  },
  {
    title: 'Identidade de Marca',
    copy: 'Paredes de marca, logótipos e mensagens físicas para espaços comerciais.',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=82',
    icon: Upload,
  },
]

const wallColors = [
  { label: 'Noite', value: '#0d0d10' },
  { label: 'Cimento', value: '#c8c0b2' },
  { label: 'Verde seco', value: '#28352d' },
]

const railColors = [
  { label: 'Preto', value: '#111111' },
  { label: 'Areia', value: '#d7c8ae' },
  { label: 'Grafite', value: '#34343a' },
]

const letterColors = [
  { label: 'Branco', value: '#f8f5ec' },
  { label: 'Ouro', value: '#d4af37' },
  { label: 'Azul', value: '#7dd3fc' },
]

const planningHints = [
  {
    label: 'Menu',
    hint: 'Criar uma parede principal com categorias centradas, pratos à esquerda e preços à direita.',
  },
  {
    label: 'WC',
    hint: 'Adicionar sinalética WC numa parede separada, curta e centrada.',
  },
  {
    label: 'Takeaway',
    hint: 'Adicionar uma zona de takeaway com horários, recolhas e contactos curtos.',
  },
  {
    label: 'Horários',
    hint: 'Criar uma parede de horários com dias à esquerda e horas à direita.',
  },
  {
    label: 'Logo',
    hint: 'Incluir @logo para criar uma parede de Identidade de Marca com upload SVG.',
  },
]

function PlannerMockup({
  wallColor,
  railColor,
  letterColor,
}: {
  wallColor: string
  railColor: string
  letterColor: string
}) {
  const rails = [
    { left: 'CAFÉ', right: 'ESPECIAL', modules: 3 },
    { left: 'ESPRESSO', right: '1,20€', modules: 4 },
    { left: 'TAKEAWAY', right: '09-19H', modules: 4 },
  ]

  return (
    <div className="relative min-h-[440px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(212,175,55,0.18),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(125,211,252,0.12),transparent_30%)]" />
      <div className="relative flex h-full min-h-[400px] items-center justify-center rounded-[1.5rem] border border-white/10 p-8 transition-colors duration-300" style={{ backgroundColor: wallColor }}>
        <div className="w-full max-w-xl space-y-5">
          {rails.map((rail, index) => (
            <motion.div
              key={rail.left}
              layout
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="relative mx-auto h-16 overflow-hidden rounded-md border border-white/12 shadow-[0_18px_42px_rgba(0,0,0,0.35)]"
              style={{ width: `${rail.modules * 22}%`, backgroundColor: railColor }}
            >
              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${rail.modules},minmax(0,1fr))` }}>
                {Array.from({ length: rail.modules }).map((_, moduleIndex) => (
                  <span key={moduleIndex} className="border-r border-white/10 last:border-r-0" />
                ))}
              </div>
              <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 items-center justify-between gap-3 text-sm font-black tracking-[0.14em] sm:text-base" style={{ color: letterColor }}>
                <span>{rail.left}</span>
                <span>{rail.right}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ColorToggleGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: typeof wallColors
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${value === option.value ? 'border-[#d4af37] bg-[#d4af37]/12 text-white' : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:border-white/25'}`}
          >
            <span className="size-4 rounded-full border border-white/20" style={{ backgroundColor: option.value }} />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function OnboardingForm() {
  const router = useRouter()
  const [spacesDescription, setSpacesDescription] = useState('Tenho um café com uma parede principal de menu, uma parede pequena junto ao WC e uma zona de takeaway perto da entrada.')
  const [contentDescription, setContentDescription] = useState('ENTRADAS\nSOPA DO DIA 3,50€\nTÁBUA MINI 8,00€\n\nPRATOS\nBACALHAU DA CASA 14,50€\nBIFE GRELHADO 16,00€\n\nHORÁRIOS\nSEG-SEX 09-19H\nSÁBADO 10-16H\n\n@logo')
  const [mainWallMaxWidthCm, setMainWallMaxWidthCm] = useState('')
  const [selectedHints, setSelectedHints] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const canSubmit = (spacesDescription.trim().length > 4 || contentDescription.trim().length > 4) && !loading
  const selectedPlanningHints = planningHints
    .filter(hint => selectedHints.includes(hint.label))
    .map(hint => hint.hint)

  function toggleHint(label: string) {
    setSelectedHints(current => current.includes(label) ? current.filter(item => item !== label) : [...current, label])
  }

  async function submitPlanner() {
    if (!canSubmit) return
    setLoading(true)
    try {
      const response = await fetch('/api/ai-menu-formatter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spacesDescription,
          contentDescription,
          mainWallMaxWidthCm: mainWallMaxWidthCm ? Number(mainWallMaxWidthCm) : undefined,
          hints: selectedPlanningHints,
        }),
      })
      const data = await response.json().catch(() => null)
      const walls = Array.isArray(data?.walls) ? data.walls : []

      window.localStorage.setItem(GENERATED_WALLS_STORAGE_KEY, JSON.stringify({
        version: 1,
        source: data?.source ?? 'unknown',
        fallback: Boolean(data?.fallback),
        spacesDescription,
        contentDescription,
        hints: selectedPlanningHints,
        mainWallMaxWidthCm: mainWallMaxWidthCm ? Number(mainWallMaxWidthCm) : undefined,
        walls,
        createdAt: new Date().toISOString(),
      }))

      if (!response.ok || data?.fallback) {
        window.localStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY)
        window.localStorage.setItem(BUILDER_TOAST_STORAGE_KEY, data?.message ?? FALLBACK_TOAST)
        router.push('/colecoes/modular/builder?fallback=true')
        return
      }

      window.localStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY)
      router.push('/colecoes/modular/builder')
    } catch {
      window.localStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY)
      window.localStorage.setItem(BUILDER_TOAST_STORAGE_KEY, FALLBACK_TOAST)
      router.push('/colecoes/modular/builder?fallback=true')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="make-it-real" className="relative px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d4af37]">Make it Real</p>
          <h2 className="mt-4 max-w-xl font-serif text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Descreva o espaço. Nós desenhamos a primeira planta.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-zinc-400">
            Escreva como se estivesse a falar connosco: paredes, zonas, menus, horários, WC, preços e marca. A IA transforma isso numa proposta física com calhas de 250mm.
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-7">
          <Label htmlFor="planner-spaces" className="text-sm font-semibold text-white">
            Descreva os espaços disponíveis
          </Label>
          <textarea
            id="planner-spaces"
            value={spacesDescription}
            onChange={event => setSpacesDescription(event.target.value)}
            className="mt-3 min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#d4af37]/70 focus:ring-4 focus:ring-[#d4af37]/10"
            placeholder="Ex.: parede principal de 2m para menu, parede pequena para WC, zona de takeaway junto à entrada..."
          />

          <Label htmlFor="planner-content" className="mt-5 block text-sm font-semibold text-white">
            Conteúdo que quer colocar
          </Label>
          <textarea
            id="planner-content"
            value={contentDescription}
            onChange={event => setContentDescription(event.target.value)}
            className="mt-3 min-h-56 w-full resize-y rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#d4af37]/70 focus:ring-4 focus:ring-[#d4af37]/10"
            placeholder="Ex.: ENTRADAS, SOPA DO DIA 3,50€, PRATOS, BACALHAU 14,50€, WC, HORÁRIOS, @logo..."
          />

          <div className="mt-5 grid gap-5 sm:grid-cols-[0.7fr_1.3fr]">
            <div>
              <Label htmlFor="main-wall-width" className="text-sm font-semibold text-white">
                Largura máxima da parede principal (cm)
              </Label>
              <Input
                id="main-wall-width"
                type="number"
                min={25}
                max={300}
                value={mainWallMaxWidthCm}
                onChange={event => setMainWallMaxWidthCm(event.target.value)}
                className="mt-3 border-white/10 bg-black/30 text-white"
                placeholder="Ex.: 150"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Atalhos de planeamento</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {planningHints.map(hint => {
                  const selected = selectedHints.includes(hint.label)
                  return (
                    <button
                      key={hint.label}
                      type="button"
                      onClick={() => toggleHint(hint.label)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${selected ? 'border-[#d4af37] bg-[#d4af37]/15 text-white' : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:border-white/25'}`}
                    >
                      {selected && <Check className="mr-1 inline size-3.5" />}
                      {hint.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-zinc-500">
              Se mencionar logo, logótipo, marca ou @logo, criamos uma parede dedicada para identidade visual.
            </p>
            <Button
              type="button"
              onClick={submitPlanner}
              disabled={!canSubmit}
              className="h-13 min-w-44 rounded-full bg-white px-6 text-[#09090b] hover:bg-[#d4af37]"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Make it Real
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function ModularCollectionPage() {
  const [wallColor, setWallColor] = useState(wallColors[0].value)
  const [railColor, setRailColor] = useState(railColors[0].value)
  const [letterColor, setLetterColor] = useState(letterColors[0].value)
  const mockupColors = useMemo(() => ({ wallColor, railColor, letterColor }), [letterColor, railColor, wallColor])

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <Header />

      <section className="relative overflow-hidden px-5 pb-20 pt-16 sm:px-8 lg:px-10 lg:pb-28 lg:pt-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(212,175,55,0.18),transparent_32%),radial-gradient(circle_at_78%_6%,rgba(56,189,248,0.12),transparent_30%),linear-gradient(180deg,#09090b_0%,#101014_58%,#09090b_100%)]" />
        <div className="relative mx-auto grid max-w-[1500px] gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d4af37]">EM3D Modular</p>
            <h1 className="mt-6 max-w-5xl font-serif text-6xl font-bold leading-[0.9] tracking-tight sm:text-8xl lg:text-9xl">
              Space Planner para sinalética física.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300 sm:text-xl">
              Planeie menus, preços, sinalética e identidade de marca em paredes reais. A nossa IA transforma intenção em calhas de 250mm, letras físicas e uma proposta pronta para produção.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 rounded-full bg-white px-7 text-[#09090b] hover:bg-[#d4af37]">
                <a href="#make-it-real">
                  Simular no meu espaço
                  <ArrowRight className="size-5" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 rounded-full border-white/15 bg-white/[0.04] px-7 text-white hover:bg-white/10">
                <Link href="/colecoes/modular/builder">Abrir builder</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65, delay: 0.1 }}>
            <PlannerMockup {...mockupColors} />
          </motion.div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d4af37]">Aplicações</p>
            <h2 className="mt-4 font-serif text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Uma linguagem física para todo o espaço.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon
              return (
                <motion.article
                  key={useCase.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ delay: index * 0.08 }}
                  className="group relative min-h-[430px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04]"
                >
                  <Image src={useCase.image} alt={useCase.title} fill className="object-cover opacity-58 transition duration-500 group-hover:scale-105 group-hover:opacity-72" sizes="(max-width: 768px) 100vw, 33vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/58 to-black/8" />
                  <div className="relative flex h-full min-h-[430px] flex-col justify-end p-6">
                    <div className="mb-5 flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/35 backdrop-blur-xl">
                      <Icon className="size-5 text-[#d4af37]" />
                    </div>
                    <h3 className="font-serif text-3xl font-bold">{useCase.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-300">{useCase.copy}</p>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d4af37]">Simular no meu espaço</p>
            <h2 className="mt-4 font-serif text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Veja a peça mudar antes de pedir.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-zinc-400">
              Teste combinações de parede, calha e letras. No builder, estas escolhas passam a materiais reais, stock e regras de produção.
            </p>
            <div className="mt-8 grid gap-5">
              <ColorToggleGroup label="Parede" options={wallColors} value={wallColor} onChange={setWallColor} />
              <ColorToggleGroup label="Calha" options={railColors} value={railColor} onChange={setRailColor} />
              <ColorToggleGroup label="Letras" options={letterColors} value={letterColor} onChange={setLetterColor} />
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-[1.5rem] border border-white/10 p-8 transition-colors duration-300" style={{ backgroundColor: wallColor }}>
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.10),transparent_36%,rgba(255,255,255,0.05))]" />
            <div className="relative flex min-h-[300px] items-center justify-center">
              <div className="w-full max-w-lg space-y-4">
                {['PREÇOS', 'CAPPUCCINO 2,40€', 'BOLO DO DIA 3,20€'].map((line, index) => (
                  <div
                    key={line}
                    className="mx-auto flex h-14 items-center justify-center rounded-md border border-white/12 px-6 text-sm font-black tracking-[0.16em] shadow-[0_16px_36px_rgba(0,0,0,0.32)]"
                    style={{ width: `${index === 0 ? 44 : 78}%`, backgroundColor: railColor, color: letterColor }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <OnboardingForm />

      <section className="px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 border-y border-white/10 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d4af37]">Produção local</p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-5xl">
              Do plano à parede, sem configuradores impossíveis.
            </h2>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Palette className="size-5 text-[#d4af37]" />
            Cores, texto e calhas validados antes da encomenda.
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
