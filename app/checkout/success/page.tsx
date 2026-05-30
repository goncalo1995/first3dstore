'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCart } from '@/lib/cart-context'
import { MENU_V1_ACTIVE_DRAFT_KEY, MENU_V1_TEMPLATE_DRAFT_KEY } from '@/lib/modular-menu-v1'

const CHECKOUT_SUCCESS_CLEANUP_KEYS = [
  MENU_V1_ACTIVE_DRAFT_KEY,
  MENU_V1_TEMPLATE_DRAFT_KEY,
  'em3d-modular-builder-active',
  'em3d-modular-builder-v3',
  'em3d-modular-planner-walls-v1',
  'em3d-modular-builder-toast',
]

function CheckoutSuccessContent() {
  const { clearCart } = useCart()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const requestId = searchParams.get('request_id')
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    // Only clear cart/drafts after an actual Stripe or manual quote success redirect.
    // Direct visits keep in-progress drafts intact.
    if (sessionId || requestId) {
      setVerified(true)
      clearCart()
      for (const key of CHECKOUT_SUCCESS_CLEANUP_KEYS) {
        window.localStorage.removeItem(key)
      }
    }
  }, [sessionId, requestId, clearCart])
  const isQuoteRequest = Boolean(requestId)

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <section className="max-w-xl rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h1 className="mt-5 font-serif text-4xl font-bold">{isQuoteRequest ? 'Pedido recebido' : 'Pagamento recebido'}</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          {isQuoteRequest
            ? 'Obrigado. O seu Menu Modular ficou registado para revisão. Vamos analisar linhas, materiais e cores e responder com orçamento.'
            : 'Obrigado. A sua encomenda de Menu Modular ficou registada e será preparada para produção. Enviaremos a confirmação por email.'}
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

function CheckoutSuccessSkeleton() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <section className="max-w-xl rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <Skeleton className="mx-auto size-12 rounded-full" />
        <Skeleton className="mt-5 h-10 w-64 mx-auto" />
        <Skeleton className="mt-3 h-6 w-full" />
        <Skeleton className="mt-3 h-6 w-3/4 mx-auto" />
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </section>
    </main>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessSkeleton />}>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
