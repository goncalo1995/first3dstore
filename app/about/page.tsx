import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MapPin, Leaf, Clock, Mail } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { WhatsAppButton } from '@/components/whatsapp-button'
import { Button } from '@/components/ui/button'

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-secondary">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-3xl">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight text-balance">
                Comecei a imprimir presentes para amigos. Eles não pararam de pedir mais.
              </h1>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="aspect-[4/3] relative rounded-lg overflow-hidden bg-secondary">
                <Image
                  src="/about/workshop.jpg"
                  alt="Oficina da GolfPrint em Lisboa"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                O criador por trás das impressões
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Tudo começou com um presente de aniversário para um amigo que adora golfe. Tinha acabado de comprar a minha 
                  primeira impressora 3D e pensei: &quot;Por que não fazer algo que ele use mesmo no campo?&quot;
                </p>
                <p>
                  Aquele marcador de bola despoletou algo. Em pouco tempo, todo o grupo dele queria um 
                  com as suas iniciais. Depois os parceiros. Depois o diretor do clube perguntou se eu podia fazer peças 
                  personalizadas para a loja do clube.
                </p>
                <p>
                  Agora, a partir de uma pequena oficina em Lisboa, projeto e imprimo acessórios de golfe que as pessoas
                  querem mesmo exibir. Cada peça é feita com cuidado, com produtos em stock e opções
                  personalizáveis dependendo do artigo.
                </p>
                <p>
                  Sem armazéns. Sem produção em massa. Apenas design cuidado e o zumbido satisfatório das 
                  impressoras a fazer o que sabem de melhor.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="bg-secondary border-y border-border">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12">
              Aquilo em que acreditamos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto bg-primary rounded-full flex items-center justify-center mb-6">
                  <MapPin className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-3">
                  Feito em Lisboa
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Cada peça é projetada e impressa na nossa oficina em Lisboa. 
                  Utilizamos materiais de origem local sempre que possível.
                </p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 mx-auto bg-primary rounded-full flex items-center justify-center mb-6">
                  <Leaf className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-3">
                  Produção com pouco desperdício
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Imprimimos o que é preciso, quando é preciso, o que significa que não há stock em excesso. Os nossos filamentos 
                  são de origem vegetal e biodegradáveis.
                </p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 mx-auto bg-primary rounded-full flex items-center justify-center mb-6">
                  <Clock className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-3">
                  Rapidez na produção
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Artigos em stock saem depressa, enquanto os personalizados e feitos por encomenda recebem uma estimativa realista de produção antes de confirmar.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Workshop Image */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="aspect-square relative rounded-lg overflow-hidden bg-secondary">
              <Image
                src="/about/printer.jpg"
                alt="Impressora 3D a funcionar"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="aspect-square relative rounded-lg overflow-hidden bg-secondary">
              <Image
                src="/about/products.jpg"
                alt="Acessórios de golfe acabados"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary">
          <div className="container mx-auto px-4 py-12 md:py-16 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
              Pronto para ver o que podemos fazer por si?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Explore a nossa coleção ou entre em contacto para encomendas personalizadas e parcerias.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                <Link href="/shop">
                  Comprar agora
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                <Link href="/contact">
                  Contacte-nos
                  <Mail className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
