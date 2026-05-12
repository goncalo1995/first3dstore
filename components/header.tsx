'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Menu, ShoppingBag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart-context'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/loja', label: 'Loja' },
  { href: '/pedido-personalizado', label: 'Pedido Personalizado' },
  { href: '/empresas', label: 'Empresas' },
]

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
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
          EM3D
        </Link>

        {/* Navegação Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-foreground',
                pathname === link.href ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA + Carrinho */}
        <div className="hidden md:flex items-center gap-4">
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/loja">Ver Loja</Link>
          </Button>
          <button
            onClick={openCart}
            className="relative p-2 text-foreground hover:text-primary transition-colors"
            aria-label={`Abrir carrinho com ${totalItems} artigos`}
          >
            <ShoppingBag className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Menu Mobile + Carrinho */}
        <div className="md:hidden flex items-center gap-4">
          <button
            onClick={openCart}
            className="relative p-2 text-foreground hover:text-primary transition-colors"
            aria-label={`Abrir carrinho com ${totalItems} artigos`}
          >
            <ShoppingBag className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:border-primary/50 hover:text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
          >
            <Menu className={cn('absolute h-6 w-6 transition-all duration-300', mobileMenuOpen ? 'scale-75 opacity-0' : 'scale-100 opacity-100')} />
            <X className={cn('absolute h-6 w-6 transition-all duration-300', mobileMenuOpen ? 'scale-100 opacity-100' : 'scale-75 opacity-0')} />
          </button>
        </div>
      </nav>

      {/* Menu Mobile */}
      <div
        className={cn(
          'fixed inset-0 top-16 z-40 md:hidden transition-all duration-300',
          mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" onClick={() => setMobileMenuOpen(false)} />
        <div
          className={cn(
            'relative z-10 mx-3 mt-3 overflow-hidden rounded-lg border border-border bg-card shadow-2xl transition-all duration-300',
            mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0',
          )}
        >
          <div className="border-b border-border bg-secondary/50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">EM3D</p>
            <p className="mt-1 text-sm text-muted-foreground">Objetos úteis, personalizados e impressos em 3D em Portugal.</p>
          </div>

          <nav className="px-5 py-5">
            <div className="flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'group flex items-center justify-between border-b border-border/70 py-5 text-3xl font-semibold tracking-tight transition-colors last:border-b-0',
                    pathname === link.href ? 'text-primary' : 'text-foreground hover:text-primary',
                  )}
                >
                  {link.label}
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <Button asChild className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/loja">Ver Loja</Link>
              </Button>
            </div>

            {/* <div className="mt-5 rounded-lg border border-border bg-secondary p-4">
              <p className="text-sm font-medium text-foreground">Recolha em Carcavelos</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Envio gratuito para Portugal continental acima de 50€, ou taxa fixa de 9,99€ abaixo desse valor.
              </p>
            </div> */}
          </nav>
        </div>
      </div>
    </header>
  )
}
