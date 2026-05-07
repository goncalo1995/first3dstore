import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, Package, Printer, ShieldCheck, Sparkles, Star, Truck, Palette } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { WhatsAppButton } from '@/components/whatsapp-button'
import { Button } from '@/components/ui/button'
import { categoryLabels, categoryDescriptions, products, type ProductCategory } from '@/lib/products'
import { HomeFeaturedProducts } from './home-featured-products'

const categories: { key: ProductCategory; image: string }[] = [
  { key: 'on-course', image: '/products/ball-marker.jpg' },
  { key: 'gift', image: '/products/gift-box.jpg' },
  { key: 'practice', image: '/products/putting-gate.jpg' },
]

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative h-[88vh] overflow-hidden bg-foreground">
          <Image
            src="/hero.png"
            alt="Acessórios de golfe personalizados GolfPrint"
            fill
            className="object-cover object-right"
            sizes="100vw"
            preload
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/95 via-foreground/72 to-foreground/22" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

          <div className="container relative mx-auto flex min-h-[88vh] items-center px-4 pb-20 pt-16">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-background/12 px-4 py-2 text-sm font-medium text-background ring-1 ring-background/20 backdrop-blur">
                <Sparkles className="h-4 w-4 text-primary" />
                Acessórios de golfe personalizados
              </div>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-background/78 md:text-xl">
                Marcadores de bola, ferramentas para reparar pitches, acessórios de treino e conjuntos de oferta personalizados, impressos em 3D e feitos para golfistas que apreciam os detalhes.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-14 bg-primary px-8 text-base text-primary-foreground hover:bg-primary/90">
                  <Link href="/shop">
                    Explorar Loja
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 border-background/35 bg-background/10 px-8 text-base text-background backdrop-blur hover:bg-background/20">
                  <Link href="/shop?category=gift">
                    Ver Presentes
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Barra de Confiança */}
        <section className="bg-background">
          <div className="container mx-auto px-6 py-12">
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground md:grid-cols-4 md:gap-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-8 w-8 text-primary" />
                <span>Produção em Lisboa</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <span>Materiais ecológicos</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-10 w-10 text-primary" />
                <span>Envio para Portugal continental</span>
              </div>
              <div className="flex items-center gap-2">
                <Palette className="h-10 w-10 text-primary" />
                <span>Mais de 10 cores disponíveis</span>
              </div>
            </div>
          </div>
        </section>

        {/* Comprar por Categoria */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Comprar por categoria
            </h2>
            <p className="mt-2 text-muted-foreground">
              Encontre a peça perfeita para si ou para oferecer
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map(({ key, image }) => (
              <Link
                key={key}
                href={`/shop?category=${key}`}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden"
              >
                <Image
                  src={image}
                  alt={categoryLabels[key]}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {categoryLabels[key]}
                  </h3>
                  <p className="text-sm text-white/80 mb-3">
                    {categoryDescriptions[key]}
                  </p>
                  <span className="inline-flex items-center text-sm font-medium text-white group-hover:underline">
                    Explorar {categoryLabels[key]}
                    <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <HomeFeaturedProducts products={products} />

        {/* Acompanhar Encomenda */}
        <section className="bg-secondary">
          <div className="container mx-auto px-4 py-12">
            <div className="grid items-center gap-6 rounded-xl border border-border bg-background p-6 md:grid-cols-[1fr_auto] md:p-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Já fez uma encomenda?
                </h2>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Consulte o estado geral, pagamento e o progresso de cada artigo com o ID da encomenda e o email ou telemóvel usado no pedido.
                </p>
              </div>
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/track-order">
                  Acompanhar encomenda
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Como Funciona */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Como funciona
            </h2>
            <p className="mt-2 text-muted-foreground">
              Produtos em stock quando disponíveis, feitos por encomenda quando quer personalização
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-primary rounded-full flex items-center justify-center mb-6">
                <Package className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">
                1. Escolha a sua peça
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Escolha um produto e uma cor disponível. Adicione texto personalizado apenas quando o produto o permitir.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-primary rounded-full flex items-center justify-center mb-6">
                <Printer className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">
                2. Preparamos ou imprimimos
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Artigos em stock podem sair mais depressa; texto personalizado ou cores esgotadas são impressos em Lisboa.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-primary rounded-full flex items-center justify-center mb-6">
                <Truck className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">
                3. Recolha ou entrega
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Recolha em Carcavelos ou escolha envio para Portugal continental, gratuito acima de 50€.
              </p>
            </div>
          </div>
        </section>

        {/* Feed do Instagram */}
        <section className="bg-secondary">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Siga o processo de fabrico
              </h2>
              <p className="mt-2 text-muted-foreground">
                Bastidores e golfistas satisfeitos em @golfprint.pt
              </p>
            </div>
            {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <a
                  key={i}
                  href="https://instagram.com/golfprint.pt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square bg-background rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity border border-border"
                >
                  <span className="text-muted-foreground text-sm">@golfprint.pt</span>
                </a>
              ))}
            </div> */}
            <div className="text-center mt-8">
              <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                <a href="https://instagram.com/golfprint.pt" target="_blank" rel="noopener noreferrer">
                  Siga-nos no Instagram
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Banner B2B */}
        <section className="bg-primary">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-xl md:text-2xl font-bold text-primary-foreground">
                  Parceiro de loja profissional?
                </h2>
                <p className="mt-2 text-primary-foreground/80">
                  Ofereça merch personalizada sem risco de stock. Impressão sob demanda para o seu clube.
                </p>
              </div>
              <Button asChild variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link href="/contact#b2b">
                  Parceria connosco
                  <ArrowRight className="ml-2 w-4 h-4" />
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
