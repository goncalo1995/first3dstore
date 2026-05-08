import { Metadata } from 'next'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'Termos e Condições | Foto3D.pt',
  description: 'Termos e condições genéricos da Foto3D.pt.',
}

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <section className="border-b border-border bg-secondary">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">Termos e Condições</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">Última atualização: 8 de maio de 2026</p>
          </div>
        </section>

        <section className="container mx-auto max-w-3xl px-4 py-12">
          <div className="space-y-8 text-sm leading-7 text-muted-foreground">
            <p>
              Estes termos são um texto genérico provisório para a Foto3D.pt e devem ser revistos e substituídos por informação legal completa antes de aceitar encomendas públicas pagas.
            </p>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Encomendas e Orçamentos</h2>
              <p>
                Os pedidos submetidos no site representam uma intenção de encomenda ou pedido de orçamento. A confirmação final de preço, prazo, personalização, pagamento e produção será feita manualmente por email, WhatsApp ou outro canal acordado.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Produtos Personalizados</h2>
              <p>
                As molduras luminosas, litofanias, logótipos e peças empresariais são produzidos de acordo com ficheiros, fotografias ou instruções fornecidas pelo cliente. Pequenas variações de textura, acabamento, cor e intensidade luminosa podem ocorrer.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Fotografias e Ficheiros</h2>
              <p>
                O cliente é responsável por enviar imagens ou ficheiros que tenha direito a utilizar. A Foto3D.pt pode recusar, pedir substituição ou ajustar ficheiros que não tenham qualidade suficiente para produção.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Prazos, Pagamento e Envio</h2>
              <p>
                Prazos de produção e envio são estimativas e podem variar consoante a complexidade, disponibilidade de materiais e volume de pedidos. As condições de pagamento e envio serão confirmadas antes do início da produção.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Devoluções</h2>
              <p>
                Produtos personalizados podem estar sujeitos a regras específicas de cancelamento e devolução. Esta secção deve ser adaptada à situação legal final do vendedor antes do lançamento comercial.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Contacto</h2>
              <p>
                Para perguntas sobre estes termos, contacte geral@foto3d.pt. Dados legais completos do vendedor, NIF, morada e informação obrigatória serão adicionados numa versão final.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
