import { Metadata } from 'next'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'Política de Privacidade | Foto3D.pt',
  description: 'Política de privacidade genérica da Foto3D.pt.',
}

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <section className="border-b border-border bg-secondary">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">Política de Privacidade</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">Última atualização: 8 de maio de 2026</p>
          </div>
        </section>

        <section className="container mx-auto max-w-3xl px-4 py-12">
          <div className="space-y-8 text-sm leading-7 text-muted-foreground">
            <p>
              Esta política é um texto genérico provisório para a Foto3D.pt. Deve ser revista e completada antes de aceitar encomendas públicas pagas.
            </p>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Dados Recolhidos</h2>
              <p>
                Podemos recolher nome, email, telefone, empresa, morada de entrega, descrição do pedido, fotografias, ficheiros enviados, preferências de produto, histórico de comunicações e estado da encomenda.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Finalidade</h2>
              <p>
                Usamos estes dados para responder a pedidos, validar fotografias, preparar orçamentos, produzir peças personalizadas, gerir pagamentos, entregar encomendas e prestar apoio ao cliente.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Armazenamento e Serviços</h2>
              <p>
                A aplicação pode usar serviços como InstantDB, armazenamento de ficheiros, email transacional, alojamento web e ferramentas de análise técnica. Fotografias e ficheiros enviados são tratados apenas para preparar e gerir o pedido.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Retenção</h2>
              <p>
                Mantemos dados durante o período necessário para responder ao pedido, cumprir obrigações administrativas e resolver questões relacionadas com encomendas. Ficheiros podem ser apagados mediante pedido quando já não forem necessários.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Direitos</h2>
              <p>
                Pode pedir acesso, correção ou eliminação dos seus dados através de geral@foto3d.pt. A resposta dependerá das obrigações legais aplicáveis e da necessidade de manter registos administrativos mínimos.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Contacto</h2>
              <p>
                Responsável pelos dados: Foto3D.pt, dados legais completos a preencher. Contacto provisório: geral@foto3d.pt.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
