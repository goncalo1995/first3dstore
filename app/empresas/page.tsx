
import { Metadata } from 'next'
import EmpresasContent from './empresas-content'

export const metadata: Metadata = {
  title: 'Impressão 3D Para Empresas | Foto3D.pt',
  description: 'Peças 3D personalizadas para marcas, eventos, retalho e pequenas séries. Produção local em Lisboa.',
}

export default function EmpresasPage() {

  return (
    <div>
      <EmpresasContent />
    </div>
  )
}
