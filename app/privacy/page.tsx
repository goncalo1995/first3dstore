import { Metadata } from 'next'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'Política de Privacidade | EM3D',
  description: 'Política de privacidade provisória da EM3D.',
}

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <section className="border-b border-border bg-secondary">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">Política de Privacidade</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">Última atualização: 10 de maio de 2026</p>
          </div>
        </section>

        <section className="container mx-auto max-w-3xl px-4 py-12">
          <div className="space-y-8 text-sm leading-7 text-muted-foreground">
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Responsável pelo Tratamento</h2>
              <p>
                <strong>EM3D</strong><br />
                Travessa do Girassol, Bairro da Torre, n61 3D<br />
                2775-811 Carcavelos<br />
                NIF: 518493385<br />
                geral@em3d.pt
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Que dados recolhemos</h2>
              <p>
                Nome, email, telefone, morada de entrega, empresa (opcional), fotografias ou ficheiros enviados, detalhes da encomenda, histórico de comunicações e estado do pedido.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Finalidade do tratamento</h2>
              <p>
                Os dados são utilizados exclusivamente para: processar o pedido, validar a qualidade das imagens, produzir as peças personalizadas, gerir o pagamento, enviar a encomenda e prestar apoio ao cliente. Não utilizamos os dados para marketing automatizado sem consentimento explícito.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Subcontratantes (serviços terceiros)</h2>
              <p>
                Recorremos a serviços de alojamento (Vercel), base de dados (InstantDB), armazenamento de ficheiros (Cloudflare R2), processamento de pagamentos (Stripe) e envio de emails transaccionais. Estes serviços podem aceder aos dados estritamente necessários para as respectivas funções, estando sujeitos a contratos de confidencialidade.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Conservação dos dados</h2>
              <p>
                Os dados são conservados pelo tempo necessário à gestão do pedido, cumprimento de obrigações legais (ex: fiscal) e eventual resolução de litígios. Os ficheiros de impressão podem ser conservados para futuras reimpressões, mediante consentimento do cliente.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Direitos do Titular</h2>
              <p>
                Pode solicitar o acesso, rectificação, eliminação ou portabilidade dos seus dados, bem como limitar ou opor-se ao tratamento, através do email geral@em3d.pt. Responderemos no prazo máximo de 30 dias. O cliente tem ainda direito a apresentar reclamação à CNPD (Comissão Nacional de Protecção de Dados).
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Alterações a esta política</h2>
              <p>
                Qualquer alteração será publicada nesta página com a data de revisão. Recomenda-se a consulta periódica.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
