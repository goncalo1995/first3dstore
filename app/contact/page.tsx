import { Metadata } from 'next'
import { Instagram, Mail, MessageCircle, Check, MapPin, Clock } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { WhatsAppButton } from '@/components/whatsapp-button'
import { WHATSAPP_NUMBER } from '@/data/constants'

export const metadata: Metadata = {
  title: 'Contactos | GolfPrint.pt',
  description: 'Entre em contacto com a GolfPrint. Dúvidas sobre encomendas, designs personalizados ou parcerias B2B.',
}

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Header */}
        <section className="bg-secondary border-b border-border">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Contacte-nos
            </h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Dúvidas sobre encomendas, designs personalizados ou parcerias? Estamos aqui para ajudar.
            </p>
          </div>
        </section>

        {/* Contact Options */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-foreground mb-6">
              Contactos
            </h2>
            <div className="space-y-4">
              {/* WhatsApp */}
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Tenho uma questão sobre a GolfPrint.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
              >
                <MessageCircle className="w-6 h-6 fill-current" />
                <div>
                  <p className="font-semibold">Conversar no WhatsApp</p>
                  <p className="text-sm text-white/80">Costumamos responder em menos de uma hora</p>
                </div>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com/golfprint.pt"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-colors border border-border"
              >
                <Instagram className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Mensagem no Instagram</p>
                  <p className="text-sm text-muted-foreground">@golfprint.pt</p>
                </div>
              </a>

              {/* Email */}
              <a
                href="mailto:hello@golfprint.pt"
                className="flex items-center gap-4 p-4 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-colors border border-border"
              >
                <Mail className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Envie-nos um e-mail</p>
                  <p className="text-sm text-muted-foreground">hello@golfprint.pt</p>
                </div>
              </a>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              <div className="p-4 bg-secondary rounded-lg border border-border">
                <MapPin className="w-5 h-5 text-primary mb-2" />
                <p className="font-medium text-foreground">Feito em Lisboa</p>
                <p className="text-sm text-muted-foreground">Todos os produtos são impressos na nossa oficina em Portugal</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg border border-border">
                <Clock className="w-5 h-5 text-primary mb-2" />
                <p className="font-medium text-foreground">Prazos de expedição</p>
                <p className="text-sm text-muted-foreground">Artigos em stock podem sair mais depressa; encomendas personalizadas são confirmadas antes do pagamento</p>
              </div>
            </div>

            {/* B2B Section */}
            <div id="b2b" className="mt-12 p-6 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-semibold text-lg text-foreground mb-3">
                Diretor de loja ou de um clube?
              </h3>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Oferecemos serviços de impressão para clubes de golfe e lojas oficiais. 
                Merchandise personalizada com risco zero de stock.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  <span>O vosso logótipo nos nossos produtos</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Sem encomendas mínimas</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Preços por grosso disponíveis</span>
                </li>
              </ul>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Estou interessado numa parceria B2B para o meu clube/loja de golfe.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Discutir parceria
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
