import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function EncomendaSucessoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f2ea] px-5 text-[#231f19]">
      <section className="max-w-xl rounded-lg border border-border bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-12 text-[#1b6b45]" />
        <h1 className="mt-5 text-3xl font-bold">Pagamento recebido</h1>
        <p className="mt-3 leading-7 text-[#62574d]">
          Obrigado. A sua encomenda HexaMemória ficou registada e será preparada para produção. Enviaremos novidades por email.
        </p>
        <Button asChild className="mt-6 bg-primary text-white hover:bg-primary/90">
          <Link href="/">Voltar à página inicial</Link>
        </Button>
      </section>
    </main>
  )
}
