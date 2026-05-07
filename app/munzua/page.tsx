import type { Metadata } from 'next'
import Image from 'next/image'
import { MunzuaBetaStudio } from './munzua-beta-studio'

export const metadata: Metadata = {
  title: 'Munzua Studio de Imagem',
  description: 'Studio protegido para gerar imagens realistas com IA.',
}

export default function MunzuaPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f0] px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="mx-auto flex bg-white flex-col items-center text-center">
          <div className="relative h-24 w-40 sm:h-28 sm:w-48">
            <Image
              src="/munzua-logo.JPG"
              alt="Munzua"
              fill
              priority
              className="object-contain"
              sizes="192px"
            />
          </div>
        </header>

        <section className="rounded-lg border bg-background p-4 shadow-sm sm:p-6">
          <MunzuaBetaStudio />
        </section>
      </div>
    </main>
  )
}
