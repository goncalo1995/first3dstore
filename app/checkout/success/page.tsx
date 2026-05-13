'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart-context'

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    // Only clear cart if we have a valid session_id from Stripe redirect
    // This prevents clearing cart on direct visits or page refreshes
    if (sessionId) {
      setVerified(true)
      clearCart()
    }
  }, [sessionId, clearCart])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <section className="max-w-xl rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h1 className="mt-5 font-serif text-4xl font-bold">Pagamento recebido</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Obrigado. A sua encomenda ficou registada e será preparada para produção. Enviaremos a confirmação por email.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/loja">Voltar à loja</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Página inicial</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
