import { ModularBuilderClient } from './_components/modular-builder-client'
import { Footer } from '@/components/footer'

export default function ModularBuilderPage() {
  return <>
  <div className="min-h-screen flex flex-col">
    <ModularBuilderClient />
  </div>
    <Footer />
  </>
}
