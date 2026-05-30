
import { Metadata } from 'next'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import EmpresasContent from './empresas-content'

export const metadata: Metadata = {
  title: 'Soluções 3D à medida para empresas | EM3D',
  description: 'Peças 3D premium para sinalética, objetos úteis e pequenas séries comerciais. Produção local em Portugal.',
}

export default function EmpresasPage() {
  return (
    <>
      <Header />
      <EmpresasContent />
      <Footer />
    </>
  )
}
