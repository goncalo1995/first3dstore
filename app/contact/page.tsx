import { Metadata } from 'next'
import { Clock, Mail, MapPin, MessageCircle, Sparkles } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { WhatsAppButton } from '@/components/whatsapp-button'
import { WHATSAPP_NUMBER } from '@/data/constants'

export const metadata: Metadata = {
  title: 'Contactos | Foto3D.pt',
  description: 'Contacte a Foto3D.pt para dúvidas sobre molduras luminosas, qualidade de imagem, encomendas personalizadas e pedidos empresariais.',
}

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <section className="border-b border-border bg-secondary">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Foto3D.pt</p>
            <h1 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">Contactos</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Fale connosco sobre a sua fotografia, prazos de produção, personalizações ou projetos para empresas.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Como podemos ajudar?</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Se tiver dúvidas sobre a qualidade da imagem, quer preparar um presente especial ou precisa de uma proposta para a sua empresa, envie-nos uma mensagem com o máximo de contexto possível.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-lg border border-border bg-secondary p-4">
                  <MapPin className="mb-2 h-5 w-5 text-primary" />
                  <p className="font-medium text-foreground">Lisboa, Portugal</p>
                  <p className="mt-1 text-sm text-muted-foreground">Peças desenhadas, preparadas e montadas localmente.</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary p-4">
                  <Clock className="mb-2 h-5 w-5 text-primary" />
                  <p className="font-medium text-foreground">Resposta manual</p>
                  <p className="mt-1 text-sm text-muted-foreground">Analisamos cada pedido antes de avançar com produção.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Tenho uma questão sobre uma moldura Foto3D.pt.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-lg bg-primary p-4 text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <MessageCircle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Conversar no WhatsApp</p>
                  <p className="text-sm text-white/80">Ideal para dúvidas rápidas ou acompanhamento de pedidos.</p>
                </div>
              </a>
              <a
                href="mailto:geral@foto3d.pt"
                className="flex items-center gap-4 rounded-lg border border-border bg-secondary p-4 text-foreground transition-colors hover:bg-secondary/80"
              >
                <Mail className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Enviar email</p>
                  <p className="text-sm text-muted-foreground">geral@foto3d.pt</p>
                </div>
              </a>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
                <Sparkles className="mb-3 h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Pedidos para empresas</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Para brindes corporativos, logótipos iluminados ou decoração de escritório, use a secção “Para Empresas” na landing page e descreva quantidades, prazo e objetivo.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
