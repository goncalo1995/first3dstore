import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'Termos e Condições | EM3D',
  description: 'Termos e condições da EM3D para encomendas, produtos personalizados, pagamentos, entregas e garantias.',
}

const updatedAt = '30 de maio de 2026'

const sections = [
  {
    title: '1. Identificação do vendedor',
    content: (
      <>
        <p>
          A EM3D é o nome comercial de Cereja Investment, Lda, pessoa coletiva com o NIF 518493385, com sede em Travessa do Girassol 61, 3.º Dt.º, Bairro da Torre, 2775-811 Carcavelos.
        </p>
        <p>
          Para qualquer questão relacionada com encomendas, assistência, garantias ou estes termos, pode contactar-nos através de <a href="mailto:geral@em3d.pt">geral@em3d.pt</a>.
        </p>
      </>
    ),
  },
  {
    title: '2. Âmbito',
    content: (
      <p>
        Estes termos aplicam-se à utilização do site EM3D.pt e às encomendas de produtos impressos em 3D, incluindo sinalética modular, objetos personalizados, pequenas séries, protótipos e pedidos comerciais ou empresariais.
      </p>
    ),
  },
  {
    title: '3. Encomendas, orçamentos e confirmação',
    content: (
      <>
        <p>
          Os produtos disponíveis para compra direta podem ser pagos no checkout através dos meios disponibilizados no site. Nos pedidos personalizados ou de maior complexidade, a submissão do formulário constitui um pedido de orçamento ou revisão técnica, não uma aceitação automática da encomenda.
        </p>
        <p>
          A EM3D poderá confirmar dimensões, materiais, cores, ficheiros, prazos e preço final antes de iniciar produção. A encomenda considera-se aceite quando o pagamento for concluído ou quando existir aprovação escrita do orçamento pelo cliente, conforme aplicável.
        </p>
      </>
    ),
  },
  {
    title: '4. Pagamentos',
    content: (
      <p>
        Os pagamentos online são processados por fornecedores externos, como a Stripe, de acordo com as opções apresentadas no checkout. A EM3D não armazena dados completos de cartões bancários. Em pedidos sujeitos a orçamento manual, as instruções de pagamento serão comunicadas por email ou outro canal acordado com o cliente.
      </p>
    ),
  },
  {
    title: '5. Produção personalizada e tolerâncias de impressão 3D',
    content: (
      <>
        <p>
          Muitos produtos EM3D são fabricados por encomenda, segundo especificações, textos, cores, imagens, ficheiros, dimensões ou preferências indicadas pelo cliente. A produção só começa após pagamento, aprovação escrita ou validação técnica, consoante o fluxo aplicável.
        </p>
        <p>
          A impressão 3D é um processo de fabrico aditivo. Pequenas variações de textura, linhas de camada, brilho, cor, encaixe, dimensões e acabamento são normais e não constituem defeito quando compatíveis com a descrição do produto, o material escolhido e a finalidade prevista.
        </p>
      </>
    ),
  },
  {
    title: '6. Ficheiros, imagens, textos e direitos de terceiros',
    content: (
      <p>
        O cliente declara que tem direitos, licença ou autorização para utilizar qualquer imagem, logótipo, texto, ficheiro 3D, desenho técnico, marca ou conteúdo enviado à EM3D. A EM3D pode recusar ficheiros com qualidade insuficiente, conteúdo ilegal, ofensivo ou suscetível de violar direitos de terceiros.
      </p>
    ),
  },
  {
    title: '7. Prazos, levantamento e envio',
    content: (
      <>
        <p>
          Os prazos comunicados são estimativas e podem variar em função da complexidade da peça, disponibilidade de material, volume de produção, revisão técnica e transporte. Sempre que exista uma alteração relevante, a EM3D procurará informar o cliente com brevidade.
        </p>
        <p>
          As encomendas podem estar disponíveis para levantamento em Carcavelos ou envio para a morada indicada, quando essa opção estiver disponível. O cliente deve verificar a encomenda após receção e comunicar danos visíveis de transporte com fotografias, preferencialmente nas primeiras 48 horas.
        </p>
      </>
    ),
  },
  {
    title: '8. Exceção ao Direito de Livre Resolução',
    featured: true,
    content: (
      <>
        <p>
          Nos termos da legislação aplicável aos contratos celebrados à distância, o consumidor pode, em regra, exercer o direito de livre resolução no prazo legal. No entanto, este direito não se aplica ao fornecimento de bens confecionados segundo especificações do consumidor ou manifestamente personalizados.
        </p>
        <p>
          Assim, produtos impressos em 3D com texto, nome, logótipo, fotografia, ficheiro, cor, dimensão, composição, layout, menu, sinalética ou qualquer outra personalização pedida pelo cliente não podem ser cancelados ou devolvidos por livre resolução depois de iniciada a produção.
        </p>
        <p>
          Esta exceção não prejudica os direitos legais do consumidor em caso de defeito, falta de conformidade ou erro imputável à EM3D.
        </p>
      </>
    ),
  },
  {
    title: '9. Garantia legal e conformidade',
    content: (
      <p>
        Os consumidores beneficiam dos direitos legais aplicáveis em caso de falta de conformidade dos bens. Sempre que exista um problema, o cliente deve contactar a EM3D através de geral@em3d.pt, descrevendo a situação e enviando fotografias ou vídeos que permitam avaliar a peça. Quando se confirme uma falta de conformidade, a EM3D atuará de acordo com a lei aplicável, podendo reparar, substituir, reduzir o preço ou reembolsar, conforme o caso.
      </p>
    ),
  },
  {
    title: '10. Limitações de utilização',
    content: (
      <p>
        Salvo indicação expressa, os produtos EM3D não são certificados para uso médico, alimentar, estrutural, elétrico, de segurança crítica ou para contacto com crianças pequenas. O cliente deve utilizar cada produto apenas para a finalidade prevista e indicada na página do produto ou orçamento.
      </p>
    ),
  },
  {
    title: '11. Reclamações e resolução alternativa de litígios',
    content: (
      <>
        <p>
          Pode apresentar reclamações através do email <a href="mailto:geral@em3d.pt">geral@em3d.pt</a> ou através do Livro de Reclamações Eletrónico.
        </p>
        <p>
          Em caso de litígio de consumo, pode recorrer a uma entidade de resolução alternativa de litígios, incluindo o CNIACC - Centro Nacional de Informação e Arbitragem de Conflitos de Consumo, sem prejuízo de outras entidades competentes.
        </p>
      </>
    ),
  },
  {
    title: '12. Alterações aos termos',
    content: (
      <p>
        A EM3D pode atualizar estes termos para refletir alterações legais, operacionais ou comerciais. A versão aplicável será a publicada nesta página à data da encomenda, salvo imposição legal em contrário.
      </p>
    ),
  },
]

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <section className="border-b border-border bg-background">
          <div className="container mx-auto max-w-5xl px-4 py-16 md:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Legal</p>
            <h1 className="mt-5 max-w-3xl font-serif text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
              Termos e Condições
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">
              Condições aplicáveis à utilização do site, encomendas, produção personalizada, pagamentos, entregas e garantias dos produtos EM3D.
            </p>
            <p className="mt-6 text-sm text-muted-foreground">Última atualização: {updatedAt}</p>
          </div>
        </section>

        <section className="container mx-auto max-w-4xl px-4 py-14 md:py-20">
          <div className="space-y-12">
            {sections.map(section => (
              <article
                key={section.title}
                className={section.featured ? 'rounded-lg border border-primary/30 bg-primary/8 p-6 md:p-8' : ''}
              >
                <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{section.title}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground md:text-base md:leading-8">
                  {section.content}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 rounded-lg border border-border bg-card p-6 text-sm leading-7 text-muted-foreground">
            <p className="font-semibold text-foreground">Links úteis</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              <Link href="https://www.livroreclamacoes.pt/inicio" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                Livro de Reclamações Eletrónico
              </Link>
              <Link href="https://www.cniacc.pt/pt/cniacc" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                CNIACC
              </Link>
              <Link href="/privacy" className="text-primary hover:text-primary/80">
                Política de Privacidade
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
