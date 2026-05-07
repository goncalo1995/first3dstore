import { Metadata } from 'next'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'Termos e Condições | GolfPrint.pt',
  description: 'Termos e condições para encomendar na GolfPrint.pt.',
}

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <section className="bg-secondary border-b border-border">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Termos e Condições</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Última atualização: 30 de abril de 2026
            </p>
          </div>
        </section>

        <section className="container mx-auto max-w-3xl px-4 py-12">
          <div className="space-y-8 text-sm leading-7 text-muted-foreground">
            <p>
              A GolfPrint.pt é um pequeno projeto em fase de teste de acessórios de golfe impressos em 3D, fabricados em Portugal. Antes de aceitar encomendas pagas à escala, a identidade do vendedor, dados fiscais, informações do Livro de Reclamações e quaisquer dados de registo comercial obrigatórios devem ser preenchidos aqui.
            </p>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Encomendas</h2>
              <p>
              As encomendas são atualmente confirmadas manualmente, normalmente através do WhatsApp ou e-mail. O envio de um carrinho de compras é um pedido de encomenda, não uma aceitação automática. Confirmaremos a disponibilidade, os detalhes finais de entrega e as instruções de pagamento antes da produção ou expedição.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Produtos</h2>
              <p>
              Os produtos são impressos em 3D em pequenas séries. Podem ocorrer pequenas variações de textura, cor, acabamento e dimensões. As fotografias dos produtos são ilustrativas e as cores podem variar consoante o ecrã e o lote de filamento.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Artigos Personalizados</h2>
              <p>
              Os artigos personalizados são feitos de acordo com as especificações do cliente. Verifique cuidadosamente as iniciais, texto, cores e quantidade antes de confirmar. Uma vez iniciada a produção, podem não ser possíveis alterações.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Disponibilidade e Expedição</h2>
              <p>
              Os prazos de expedição indicados nas páginas dos produtos são estimativas. Artigos em stock podem ser expedidos mais rapidamente, enquanto pedidos personalizados, feitos sob encomenda, de grande volume ou com cores personalizadas podem demorar mais tempo. Se o prazo for importante, contacte-nos antes de encomendar.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Recolha e Envio</h2>
              <p>
              A recolha em Carcavelos pode estar disponível mediante acordo. O envio para Portugal continental é atualmente gratuito acima de 50€, ou 9,99€ abaixo de 50€. As opções de envio, preços e disponibilidade são confirmados antes do pagamento.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Devoluções</h2>
              <p>
              Para produtos não personalizados, podem aplicar-se os direitos de devolução do consumidor ao abrigo das regras portuguesas e da UE para vendas à distância. Os produtos personalizados feitos sob medida podem ser excluídos dos direitos de cancelamento, exceto se estiverem defeituosos ou não corresponderem à descrição. Esta secção deve ser revista para a sua configuração legal exata antes do lançamento.
              </p>
            </div>

            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Contacto</h2>
              <p>
              Para perguntas sobre uma encomenda, contacte hello@golfprint.pt ou envie mensagem no Instagram/WhatsApp. Substitua esta secção pelo nome legal do vendedor, NIF, morada comercial e dados do Livro de Reclamações antes de aceitar encomendas públicas pagas.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
