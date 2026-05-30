'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Menu, ShoppingBag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart-context'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/colecoes/menus', label: 'Menus Modulares' },
  // { href: '/loja', label: 'Loja' },
  { href: '/empresas', label: 'Empresas' },
  { href: '/contact', label: 'Contactos' },
]

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { openCart, totalItems } = useCart()
  const pathname = usePathname()

  useEffect(() => {
    if (!mobileMenuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur-xl supports-[backdrop-filter]:bg-background/82">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-3 text-foreground">
          <span className="grid size-8 place-items-center rounded-md border border-border bg-card text-sm font-black tracking-tight text-primary transition-colors group-hover:border-primary/50">
            E
          </span>
          <span className="text-lg font-semibold tracking-tight">em3D</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-foreground',
                isActivePath(pathname, link.href) ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button asChild className="h-10 rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:bg-[#ca8a04]">
            <Link href="/colecoes/menus">Criar menu</Link>
          </Button>
          <button
            onClick={openCart}
            className="relative grid size-10 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            aria-label={`Abrir carrinho com ${totalItems} artigos`}
          >
            <ShoppingBag className="size-5" />
            {totalItems > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={openCart}
            className="relative grid size-10 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            aria-label={`Abrir carrinho com ${totalItems} artigos`}
          >
            <ShoppingBag className="size-5" />
            {totalItems > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
          <button
            className="relative flex size-10 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:border-primary/50 hover:text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
          >
            <Menu className={cn('absolute h-6 w-6 transition-all duration-300', mobileMenuOpen ? 'scale-75 opacity-0' : 'scale-100 opacity-100')} />
            <X className={cn('absolute h-6 w-6 transition-all duration-300', mobileMenuOpen ? 'scale-100 opacity-100' : 'scale-75 opacity-0')} />
          </button>
        </div>
      </nav>

      <div
        className={cn(
          'fixed inset-0 top-16 z-40 transition-all duration-300 md:hidden',
          mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div className="absolute inset-0 bg-background/96 backdrop-blur-xl" onClick={() => setMobileMenuOpen(false)} />
        <div
          className={cn(
            'relative z-10 mx-3 mt-3 overflow-hidden rounded-lg border border-border bg-card shadow-2xl shadow-black/40 transition-all duration-300',
            mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0',
          )}
        >
          <div className="border-b border-border bg-secondary/55 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">em3D Studio</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Sinalética, objetos e pequenas séries impressas em 3D em Portugal.
            </p>
          </div>

          <nav className="px-5 py-5">
            <div className="flex flex-col divide-y divide-border">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'group flex items-center justify-between py-5 text-2xl font-semibold tracking-tight transition-colors',
                    isActivePath(pathname, link.href) ? 'text-primary' : 'text-foreground hover:text-primary',
                  )}
                >
                  {link.label}
                  <ArrowUpRight className="size-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
            </div>

            <div className="mt-6 grid gap-3">
              <Button asChild className="h-12 rounded-md bg-primary text-primary-foreground hover:bg-[#ca8a04]">
                <Link href="/colecoes/menus">Criar menu modular</Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Produzido localmente. Acabamento mate. Orçamento claro.
              </p>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
