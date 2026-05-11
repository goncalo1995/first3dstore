import Link from 'next/link'
import { Instagram, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-[#f7f2ea] border-t border-[#e2d8ca] pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="block text-2xl font-bold tracking-tight text-[#231f19]">Foto3D</Link>
            <p className="mt-3 text-sm text-[#62574d] leading-relaxed">
              Mosaicos hexagonais 3D para fotos personalizadas. Peças impressas em Lisboa, montagem sem ferramentas.
            </p>
            <div className="flex gap-4 mt-4">
              <a href="https://instagram.com/foto3d.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="mailto:geral@foto3d.pt" className="text-primary hover:text-primary/80">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-[#231f19] mb-4">Produtos</h4>
            <ul className="space-y-2">
              <li><Link href="/criar/hexa" className="text-sm text-[#62574d] hover:text-primary">Configurar mosaico</Link></li>
              <li><Link href="/#tamanhos" className="text-sm text-[#62574d] hover:text-primary">Tamanhos</Link></li>
              <li><Link href="/#como-funciona" className="text-sm text-[#62574d] hover:text-primary">Como funciona</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-[#231f19] mb-4">Ajuda</h4>
            <ul className="space-y-2">
              <li><Link href="/#faq" className="text-sm text-[#62574d] hover:text-primary">Perguntas frequentes</Link></li>
              <li><Link href="/contact" className="text-sm text-[#62574d] hover:text-primary">Contacto</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-[#231f19] mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-sm text-[#62574d] hover:text-primary">Termos</Link></li>
              <li><Link href="/privacy" className="text-sm text-[#62574d] hover:text-primary">Privacidade</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#e2d8ca] mt-10 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-[#62574d]">
          {/* <p>Feito com cuidado em Lisboa, Portugal</p> */}
          <p>{new Date().getFullYear()} Foto3D. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
