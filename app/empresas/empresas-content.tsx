'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  DoorOpen,
  Loader2,
  MapPin,
  PanelTop,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  Table2,
  WandSparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type B2BIdea = {
  title: string
  object: string
  placement: string
  utility: string
  finish: string
  prototypeStep: string
}

type LeadForm = {
  customerName: string
  companyName: string
  customerEmail: string
  customerPhone: string
  businessType: string
  businessTypeOther: string
  goal: string
  approximateQuantity: string
  deadline: string
  message: string
  honeypot: string
}

const businessTypes = [
  'Restaurante / Café',
  'Loja / Retalho',
  'Hotelaria',
  'Escritório / Cowork',
  'Clínica / Bem-estar',
  'Evento / Ativação',
  'Outro',
]

const useCases = [
  { label: 'Paredes', icon: PanelTop },
  { label: 'Portas', icon: DoorOpen },
  { label: 'Balcões', icon: Store },
  { label: 'Mesas', icon: Table2 },
  { label: 'Receção', icon: MapPin },
  { label: 'Sinalética', icon: BadgeCheck },
]

const tiles = [
  {
    title: 'Orientação',
    text: 'Peças físicas para guiar clientes sem ruído visual.',
  },
  {
    title: 'Exposição',
    text: 'Suportes de produto, amostras e menus de balcão.',
  },
  {
    title: 'Identidade',
    text: 'Logótipos, lettering e detalhes com acabamento mate.',
  },
  {
    title: 'Operação',
    text: 'Etiquetas, divisores e pequenos objetos feitos à medida.',
  },
]

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function TurnstileGate({
  id,
  label,
  onToken,
}: {
  id: string
  label: string
  onToken: (token: string) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'ready' | 'verified' | 'error'>('idle')
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const canBypass = !siteKey && process.env.NODE_ENV !== 'production'

  useEffect(() => {
    if (canBypass || !siteKey || !containerRef.current) return

    let cancelled = false

    function renderWidget() {
      const turnstile = (window as any).turnstile
      if (!turnstile || !containerRef.current || widgetIdRef.current || cancelled) return
      widgetIdRef.current = turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'dark',
        callback: (token: string) => {
          setStatus('verified')
          onToken(token)
        },
        'expired-callback': () => {
          setStatus('ready')
          onToken('')
        },
        'error-callback': () => {
          setStatus('error')
          onToken('')
        },
      })
      setStatus('ready')
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile-script]')
    if (existing) {
      const interval = window.setInterval(() => {
        renderWidget()
        if (widgetIdRef.current) window.clearInterval(interval)
      }, 150)
      return () => {
        cancelled = true
        window.clearInterval(interval)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.turnstileScript = 'true'
    script.onload = renderWidget
    script.onerror = () => setStatus('error')
    document.body.appendChild(script)

    return () => {
      cancelled = true
    }
  }, [canBypass, onToken, siteKey])

  if (canBypass) {
    return (
      <div className="rounded-lg border border-border bg-secondary/40 p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            setStatus('verified')
            onToken('dev-turnstile-bypass')
          }}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          Desbloquear em desenvolvimento
        </Button>
      </div>
    )
  }

  if (!siteKey) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        Verificação indisponível. Configure NEXT_PUBLIC_TURNSTILE_SITE_KEY.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <p className="mb-3 text-xs text-muted-foreground">{label}</p>
      <div id={id} ref={containerRef} />
      {status === 'verified' && (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
          <Check className="h-3.5 w-3.5" />
          Verificação concluída
        </p>
      )}
      {status === 'error' && <p className="mt-2 text-xs text-destructive">A verificação falhou. Atualize e tente novamente.</p>}
    </div>
  )
}

function parseError(payload: any, fallback: string) {
  if (payload?.retryAfterSeconds) {
    return `${payload.error || fallback} (${Math.ceil(Number(payload.retryAfterSeconds) / 60)} min)`
  }
  return payload?.error || fallback
}

export default function EmpresasContent() {
  const [aiToken, setAiToken] = useState('')
  const [leadToken, setLeadToken] = useState('')
  const [aiForm, setAiForm] = useState({
    businessType: 'Restaurante / Café',
    space: 'parede junto ao balcão',
    goal: 'melhorar sinalética e menus',
    constraints: '',
  })
  const [ideas, setIdeas] = useState<B2BIdea[]>([])
  const [aiError, setAiError] = useState('')
  const [aiFallback, setAiFallback] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [form, setForm] = useState<LeadForm>({
    customerName: '',
    companyName: '',
    customerEmail: '',
    customerPhone: '',
    businessType: 'Restaurante / Café',
    businessTypeOther: '',
    goal: '',
    approximateQuantity: '',
    deadline: '',
    message: '',
    honeypot: '',
  })
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function generateIdeas(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAiError('')
    setAiFallback(false)

    if (!aiToken) {
      setAiError('Complete a verificação humana para desbloquear ideias geradas por AI.')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/b2b-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...aiForm, turnstileToken: aiToken }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(parseError(payload, 'Não foi possível gerar ideias.'))
      setIdeas(payload.ideas || [])
      setAiFallback(Boolean(payload.fallback))
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Não foi possível gerar ideias.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    setSubmitSuccess('')

    if (!isValidEmail(form.customerEmail.trim())) {
      setSubmitError('Indique um email válido.')
      return
    }
    if (!leadToken) {
      setSubmitError('Complete a verificação humana antes de enviar o pedido.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/b2b-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          turnstileToken: leadToken,
          approximateQuantity: form.approximateQuantity ? Number(form.approximateQuantity) : undefined,
          aiIdeas: ideas,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(parseError(payload, 'Não foi possível enviar o pedido.'))
      setSubmitSuccess(payload.message || 'Pedido recebido. Enviaremos confirmação por email.')
      setForm({
        customerName: '',
        companyName: '',
        customerEmail: '',
        customerPhone: '',
        businessType: 'Restaurante / Café',
        businessTypeOther: '',
        goal: '',
        approximateQuantity: '',
        deadline: '',
        message: '',
        honeypot: '',
      })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível enviar o pedido.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="relative border-b border-border px-5 py-20 sm:px-8 lg:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[520px] max-w-6xl opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(234,179,8,0.28), rgba(31,77,58,0.18) 34%, transparent 70%)' }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1.05fr)_420px] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Produção local. Acabamento premium.
            </p>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
              Soluções 3D à medida para espaços comerciais
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Peças físicas úteis para paredes, portas, balcões, mesas e sinalética. Menos ruído. Mais presença no espaço.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-7">
                <a href="#pedido">
                  Pedir proposta
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7">
                <a href="#ai">Gerar ideias</a>
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/30">
            <div className="grid grid-cols-2 gap-3">
              {useCases.map((item) => (
                <div key={item.label} className="rounded-md border border-border bg-secondary/50 p-4">
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-medium">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((tile) => (
              <article key={tile.title} className="rounded-lg border border-border bg-card p-5">
                <h2 className="font-serif text-2xl font-semibold">{tile.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{tile.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="ai" className="border-y border-border bg-secondary/30 px-5 py-14 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Ideias por AI</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Três conceitos práticos antes da proposta.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              A AI só fica ativa depois de uma verificação rápida. As sugestões são ponto de partida; a proposta final é sempre revista pela EM3D.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <TurnstileGate
              id="turnstile-b2b-ideas"
              label="Verificação rápida para desbloquear ideias geradas por AI."
              onToken={setAiToken}
            />

            <form onSubmit={generateIdeas} className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ai-business-type">Tipo de negócio</Label>
                  <select
                    id="ai-business-type"
                    value={aiForm.businessType}
                    onChange={(event) => setAiForm((current) => ({ ...current, businessType: event.target.value }))}
                    className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {businessTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="ai-space">Espaço</Label>
                  <Input
                    id="ai-space"
                    value={aiForm.space}
                    maxLength={500}
                    onChange={(event) => setAiForm((current) => ({ ...current, space: event.target.value }))}
                    placeholder="Ex: receção, parede, mesa"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="ai-goal">Objetivo</Label>
                <Input
                  id="ai-goal"
                  value={aiForm.goal}
                  maxLength={500}
                  onChange={(event) => setAiForm((current) => ({ ...current, goal: event.target.value }))}
                  placeholder="Ex: melhorar orientação, expor produto"
                />
              </div>
              <div>
                <Label htmlFor="ai-constraints">Restrições</Label>
                <Textarea
                  id="ai-constraints"
                  value={aiForm.constraints}
                  maxLength={500}
                  onChange={(event) => setAiForm((current) => ({ ...current, constraints: event.target.value }))}
                  placeholder="Medidas, cores, prazo ou materiais preferidos."
                  className="min-h-24"
                />
              </div>
              {aiError && <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{aiError}</p>}
              <Button type="submit" disabled={isGenerating || !aiToken} className="w-full sm:w-fit">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                Gerar 3 ideias
              </Button>
            </form>

            {ideas.length > 0 && (
              <div className="mt-6 space-y-3">
                {aiFallback && <p className="text-xs text-muted-foreground">A AI não respondeu com segurança; mostrámos sugestões base da EM3D.</p>}
                {ideas.map((idea, index) => (
                  <article key={`${idea.title}-${index}`} className="rounded-lg border border-border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Ideia {index + 1}</p>
                    <h3 className="mt-2 font-serif text-2xl font-semibold">{idea.title}</h3>
                    <dl className="mt-3 grid gap-2 text-sm text-muted-foreground">
                      <div><dt className="inline font-medium text-foreground">Objeto: </dt><dd className="inline">{idea.object}</dd></div>
                      <div><dt className="inline font-medium text-foreground">Local: </dt><dd className="inline">{idea.placement}</dd></div>
                      <div><dt className="inline font-medium text-foreground">Utilidade: </dt><dd className="inline">{idea.utility}</dd></div>
                      <div><dt className="inline font-medium text-foreground">Acabamento: </dt><dd className="inline">{idea.finish}</dd></div>
                      <div><dt className="inline font-medium text-foreground">Protótipo: </dt><dd className="inline">{idea.prototypeStep}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="pedido" className="px-5 py-14 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Pedido B2B</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Conte-nos o espaço.</h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Respondemos no prazo de 1 dia útil. Se usou a AI, as ideias geradas seguem automaticamente com o pedido.
            </p>
          </div>

          <form onSubmit={submitLead} className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/25">
            <div className="hidden">
              <Label htmlFor="company-website">Website</Label>
              <Input
                id="company-website"
                tabIndex={-1}
                autoComplete="off"
                value={form.honeypot}
                onChange={(event) => setForm((current) => ({ ...current, honeypot: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="lead-name">Nome</Label>
                <Input id="lead-name" value={form.customerName} maxLength={120} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} placeholder="O seu nome" />
              </div>
              <div>
                <Label htmlFor="lead-company">Empresa</Label>
                <Input id="lead-company" value={form.companyName} maxLength={120} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} placeholder="Nome da empresa" />
              </div>
              <div>
                <Label htmlFor="lead-email">Email</Label>
                <Input id="lead-email" type="email" required value={form.customerEmail} maxLength={180} onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))} placeholder="nome@empresa.pt" />
              </div>
              <div>
                <Label htmlFor="lead-phone">Telefone</Label>
                <Input id="lead-phone" value={form.customerPhone} maxLength={32} onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))} placeholder="+351 ..." />
              </div>
              <div>
                <Label htmlFor="lead-business-type">Tipo de negócio</Label>
                <select
                  id="lead-business-type"
                  value={form.businessType}
                  onChange={(event) => setForm((current) => ({ ...current, businessType: event.target.value }))}
                  className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {businessTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              {form.businessType === 'Outro' && (
                <div>
                  <Label htmlFor="lead-business-other">Qual?</Label>
                  <Input id="lead-business-other" value={form.businessTypeOther} maxLength={120} onChange={(event) => setForm((current) => ({ ...current, businessTypeOther: event.target.value }))} placeholder="Tipo de negócio" />
                </div>
              )}
              <div>
                <Label htmlFor="lead-quantity">Quantidade aproximada</Label>
                <Input id="lead-quantity" type="number" min={1} max={1000} value={form.approximateQuantity} onChange={(event) => setForm((current) => ({ ...current, approximateQuantity: event.target.value }))} placeholder="Ex: 20" />
              </div>
              <div>
                <Label htmlFor="lead-deadline">Prazo ideal</Label>
                <Input id="lead-deadline" type="date" value={form.deadline} onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))} />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="lead-goal">Objetivo</Label>
              <Input id="lead-goal" required value={form.goal} maxLength={500} onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))} placeholder="Ex: melhorar orientação, destacar menus, organizar receção" />
            </div>
            <div className="mt-4">
              <Label htmlFor="lead-message">Detalhes</Label>
              <Textarea id="lead-message" required value={form.message} maxLength={500} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder="Medidas, zonas, cores, quantidades ou contexto do espaço." className="min-h-32" />
              <p className="mt-2 text-xs text-muted-foreground">{form.message.length}/500 caracteres</p>
            </div>

            {ideas.length > 0 && (
              <div className="mt-4 rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary">
                {ideas.length} ideia(s) AI serão anexadas ao pedido.
              </div>
            )}

            <div className="mt-4">
              <TurnstileGate
                id="turnstile-b2b-lead"
                label="Verificação rápida antes de enviar o pedido."
                onToken={setLeadToken}
              />
            </div>

            {submitError && <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{submitError}</p>}
            {submitSuccess && <p className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary">{submitSuccess}</p>}

            <Button type="submit" disabled={isSubmitting || !leadToken} className="mt-5 h-12 w-full">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar pedido
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
