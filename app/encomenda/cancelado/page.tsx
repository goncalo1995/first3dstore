import Link from 'next/link'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function EncomendaCanceladaPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f2ea] px-5 text-[#231f19]">
      <section className="max-w-xl rounded-lg border border-border bg-white p-8 text-center shadow-sm">
        <XCircle className="mx-auto size-12 text-[#a95536]" />
        <h1 className="mt-5 text-3xl font-bold">Pagamento cancelado</h1>
        <p className="mt-3 leading-7 text-[#62574d]">
          A encomenda não ficou paga. Pode voltar ao configurador e tentar novamente quando quiser.
        </p>
        <Button asChild className="mt-6 bg-primary text-white hover:bg-primary/90">
          <Link href="/criar/hexa">Voltar ao configurador</Link>
        </Button>
      </section>
    </main>
  )
}
