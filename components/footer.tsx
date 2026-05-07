import Link from 'next/link'
import Image from 'next/image'
import { Instagram, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-secondary border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Marca */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/logo_horizontal.png"
                alt="GolfPrint.pt Logótipo"
                width={150}
                height={30}
              />
            </Link>
            <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
              Acessórios de golfe impressos em 3D em pequenas séries, feitos com cuidado em Lisboa.
              Artigos em stock e personalização opcional para golfistas que apreciam os detalhes.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a
                href="https://instagram.com/golfprint.pt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="mailto:hello@golfprint.pt"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links Rápidos */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Loja</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/shop?category=on-course" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  No Campo
                </Link>
              </li>
              <li>
                <Link href="/shop?category=gift" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Presentes
                </Link>
              </li>
              <li>
                <Link href="/shop?category=practice" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Treino
                </Link>
              </li>
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Empresa</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  A Nossa História
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contactos
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Acompanhar Encomenda
                </Link>
              </li>
              <li>
                <Link href="/contact#b2b" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Parcerias B2B
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Termos e Condições
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </div>
          
        </div>

        {/* Barra Inferior */}
        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Feito com cuidado em Lisboa, Portugal
          </p>
          <p className="text-sm text-muted-foreground">
            {new Date().getFullYear()} GolfPrint.pt. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
