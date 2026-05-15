import Link from 'next/link'
import { ArrowLeft, Search, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ProductNotFoundContent() {
  return (
    <main className="min-h-[68vh] bg-secondary">
      <div className="container mx-auto flex min-h-[68vh] items-center px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background shadow-sm">
            <Search className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-foreground md:text-5xl">
            Este produto não está disponível
          </h1>
          <p className="mx-auto mb-8 max-w-lg text-muted-foreground">
            O endereço que procura pode estar desatualizado, o produto pode ter sido descontinuado, ou o endereço não corresponde a nenhum produto disponível na loja.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/loja">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Ver loja
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao início
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
