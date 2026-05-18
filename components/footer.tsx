import Link from 'next/link'
import { Instagram, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-[#f7f2ea] border-t border-[#e2d8ca] pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="block text-2xl font-bold tracking-tight text-white">EM3D</Link>
            <p className="mt-3 text-sm text-[#62574d] leading-relaxed">
              Objetos úteis, personalizados e impressos em 3D em Portugal para casa, secretária, presentes e empresas.
            </p>
            <div className="flex gap-4 mt-4">
              <a href="https://instagram.com/em3d.pt" target="_blank" rel="noopener noreferrer" className="text-primary-foreground hover:text-primary-foreground/80" aria-label="Instagram — EM3D">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="mailto:geral@em3d.pt" className="text-primary-foreground hover:text-primary-foreground/80" aria-label="Email — EM3D">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-[#231f19] mb-4">Produtos</h4>
            <ul className="space-y-2">
              <li><Link href="/loja" className="text-sm text-secondary hover:text-secondary-600">Loja</Link></li>
              <li><Link href="/pedido-personalizado" className="text-sm text-secondary hover:text-secondary-600">Pedido personalizado</Link></li>
              <li><Link href="/#colecoes" className="text-sm text-secondary hover:text-secondary-600">Coleções</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-[#231f19] mb-4">Ajuda</h4>
            <ul className="space-y-2">
              <li><Link href="/empresas" className="text-sm text-secondary hover:text-secondary-600">Empresas</Link></li>
              <li><Link href="/contact" className="text-sm text-secondary hover:text-secondary-600">Contacto</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-[#231f19] mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-sm text-secondary hover:text-secondary-600">Termos e Condições</Link></li>
              <li><Link href="/privacy" className="text-sm text-secondary hover:text-secondary-600">Política de Privacidade</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#e2d8ca] mt-10 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-[#62574d]">
          {/* <p>Feito com cuidado em Lisboa, Portugal</p> */}
          <p>{new Date().getFullYear()} EM3D. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
