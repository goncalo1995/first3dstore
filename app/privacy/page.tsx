import { Metadata } from 'next'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'Política de Privacidade | GolfPrint.pt',
  description: 'Política de privacidade da GolfPrint.pt.',
}

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <section className="bg-secondary border-b border-border">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Política de Privacidade</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Última atualização: 30 de abril de 2026
            </p>
          </div>
        </section>

        <section className="container mx-auto max-w-3xl px-4 py-12">
          <div className="space-y-8 text-sm leading-7 text-muted-foreground">
            <p>
              Esta política explica como a GolfPrint.pt trata os dados pessoais enquanto testa uma pequena loja de acessórios de golfe impressos em 3D. Substitua os dados do vendedor/responsável abaixo pelos seus dados legais antes de aceitar encomendas públicas pagas.
            </p>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Dados que Recolhemos</h2>
              <p>
              Podemos recolher o seu nome, e-mail, número de telefone, dados de envio ou recolha, conteúdo da encomenda, texto personalizado, estado do pagamento e mensagens que nos enviar. Se nos contactar através do WhatsApp, Instagram ou e-mail, esses serviços podem processar os seus dados de acordo com as suas próprias políticas.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Para que Utilizamos os Dados</h2>
              <p>
              Utilizamos os dados para responder a perguntas, confirmar disponibilidade, produzir e entregar encomendas, gerir o estado dos pagamentos, prestar apoio e manter registos comerciais básicos.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Armazenamento e Serviços</h2>
              <p>
              Os dados da loja e da administração podem ser armazenados na InstantDB. As análises estatísticas podem ser fornecidas pela Vercel em produção. Não insira informações sensíveis desnecessárias em textos personalizados ou notas de encomenda.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Retenção de Dados</h2>
              <p>
              Mantemos registos de encomendas e comunicações apenas durante o tempo necessário para o processamento de encomendas, apoio ao cliente, contabilidade, obrigações legais ou gestão administrativa razoável.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Os Seus Direitos</h2>
              <p>
              Dependendo da legislação aplicável, pode ter direito a aceder, retificar, apagar, limitar ou opor-se ao tratamento dos seus dados pessoais. Contacte hello@golfprint.pt para fazer um pedido.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Contacto</h2>
              <p>
              Responsável pelos dados: projeto em fase de teste da GolfPrint.pt. Contacto: hello@golfprint.pt. Substitua esta informação pelo seu nome legal, morada e quaisquer dados de registo obrigatórios antes do lançamento.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
