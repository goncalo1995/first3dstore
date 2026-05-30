import Link from 'next/link'
import { Instagram, Mail } from 'lucide-react'

const footerGroups = [
  {
    title: 'Estúdio',
    links: [
      { href: '/', label: 'Home' },
      { href: '/colecoes/menus', label: 'Menus Modulares' },
      { href: '/empresas', label: 'Empresas' },
    ],
  },
  {
    title: 'Produtos',
    links: [
      { href: '/loja', label: 'Loja' },
      { href: '/pedido-personalizado', label: 'Pedido personalizado' },
      { href: '/#colecoes', label: 'Coleções' },
    ],
  },
  {
    title: 'Suporte',
    links: [
      { href: '/contact', label: 'Contactos' },
      { href: 'mailto:geral@em3d.pt', label: 'Email' },
      { href: 'https://www.livroreclamacoes.pt/inicio', label: 'Livro de Reclamações', external: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Termos e Condições' },
      { href: '/privacy', label: 'Política de Privacidade' },
      { href: 'https://www.cniacc.pt/pt/cniacc', label: 'CNIACC', external: true },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 text-foreground">
              <span className="grid size-9 place-items-center rounded-md border border-border bg-card text-sm font-black tracking-tight text-primary">
                E
              </span>
              <span className="text-2xl font-semibold tracking-tight">EM3D</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">
              Estúdio premium de impressão 3D em Portugal para sinalética modular, objetos personalizados e pequenas séries com acabamento físico cuidado.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="https://instagram.com/em3d.pt"
                target="_blank"
                rel="noopener noreferrer"
                className="grid size-10 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                aria-label="Instagram — EM3D"
              >
                <Instagram className="size-5" />
              </a>
              <a
                href="mailto:geral@em3d.pt"
                className="grid size-10 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                aria-label="Email — EM3D"
              >
                <Mail className="size-5" />
              </a>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerGroups.map(group => (
              <div key={group.title}>
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-foreground">{group.title}</h4>
                <ul className="space-y-3">
                  {group.links.map(link => (
                    <li key={`${group.title}-${link.href}`}>
                      <Link
                        href={link.href}
                        target={link.external ? '_blank' : undefined}
                        rel={link.external ? 'noopener noreferrer' : undefined}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>{new Date().getFullYear()} EM3D. Todos os direitos reservados.</p>
          <p>EM3D é o nome comercial de Cereja Investment, Lda · NIF 518493385</p>
        </div>
      </div>
    </footer>
  )
}
