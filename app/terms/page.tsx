import { Metadata } from 'next'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'Termos e Condições | EM3D',
  description: 'Termos e condições provisórios da EM3D.',
}

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <section className="border-b border-border bg-secondary">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">Termos e Condições</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">Última atualização: 10 de maio de 2026</p>
          </div>
        </section>

        <section className="container mx-auto max-w-3xl px-4 py-12">
          <div className="space-y-8 text-sm leading-7 text-muted-foreground">
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Identificação do Vendedor</h2>
              <p>
                <strong>EM3D</strong><br />
                Travessa do Girassol, Bairro da Torre, n61 3D<br />
                2775-811 Carcavelos<br />
                NIF: 518493385<br />
                geral@em3d.pt<br />
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Encomendas e Orçamentos</h2>
              <p>
                Os pedidos submetidos no site representam uma intenção de encomenda. Após a submissão, o cliente receberá uma confirmação por email com os detalhes, preço final, prazo e instruções de pagamento. Apenas após a confirmação do pagamento o pedido é considerado vinculativo.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Produtos Personalizados</h2>
              <p>
                Todos os produtos são fabricados de acordo com as especificações, fotografias ou ficheiros fornecidos pelo cliente. Pequenas variações de textura, acabamento, cor e dimensões são inerentes ao processo de impressão 3D e não constituem defeito.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Fotografias e Ficheiros</h2>
              <p>
                O cliente declara ser o titular dos direitos das imagens e ficheiros enviados, ou ter autorização para os utilizar. A EM3D reserva-se o direito de recusar ou solicitar a substituição de ficheiros que não tenham qualidade técnica suficiente para impressão ou que violem direitos de terceiros.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Prazos, Pagamento e Envio</h2>
              <p>
                Os prazos indicados são estimativas. O prazo real será comunicado na confirmação do pedido. O envio é feito através dos serviços CTT (ou transportadora parceira), e o cliente é informado do código de rastreio assim que disponível.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Direito de Arrependimento e Devoluções</h2>
              <p>
                Por se tratar de produtos personalizados, o direito de livre resolução (art.º 17.º do DL 24/2014) não se aplica após o início da produção. No entanto, em caso de defeito ou não conformidade, o cliente dispõe de 14 dias para comunicar, devendo ser fornecidas fotografias ou vídeos que evidenciem o problema. A EM3D compromete-se a reparar ou substituir o produto, ou a reembolsar o valor pago.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Contacto para questões legais</h2>
              <p>
                Para qualquer assunto relacionado com estes termos, contacte geral@em3d.pt. Os dados completos do vendedor (NIF, morada, registo) constam da primeira secção.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
