import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'Política de Privacidade | EM3D',
  description: 'Política de privacidade da EM3D sobre recolha, utilização, conservação e direitos relativos a dados pessoais.',
}

const updatedAt = '30 de maio de 2026'

const sections = [
  {
    title: '1. Responsável pelo tratamento',
    content: (
      <>
        <p>
          A entidade responsável pelo tratamento dos dados pessoais é Cereja Investment, Lda, que utiliza EM3D como nome comercial, com o NIF 518493385 e sede em Travessa do Girassol 61, 3.º Dt.º, Bairro da Torre, 2775-811 Carcavelos.
        </p>
        <p>
          Para qualquer questão sobre privacidade ou exercício de direitos, contacte-nos através de <a href="mailto:geral@em3d.pt">geral@em3d.pt</a>.
        </p>
      </>
    ),
  },
  {
    title: '2. Dados pessoais que recolhemos',
    content: (
      <p>
        Podemos recolher nome, email, telefone, morada de entrega, empresa ou NIF quando fornecidos, dados de faturação, histórico de encomendas, preferências de produto, mensagens trocadas connosco, ficheiros, fotografias, logótipos, textos ou modelos enviados para produção, bem como dados técnicos essenciais ao funcionamento do site.
      </p>
    ),
  },
  {
    title: '3. Finalidades e fundamentos de tratamento',
    content: (
      <>
        <p>
          Tratamos dados para responder a pedidos, preparar orçamentos, processar encomendas, produzir peças personalizadas, gerir pagamentos, organizar entregas, prestar apoio ao cliente, cumprir obrigações legais e proteger a segurança do site.
        </p>
        <p>
          Os fundamentos de tratamento incluem a execução de contrato ou diligências pré-contratuais, cumprimento de obrigações legais, interesse legítimo na gestão e segurança do serviço, e consentimento quando este seja necessário, nomeadamente para comunicações opcionais.
        </p>
      </>
    ),
  },
  {
    title: '4. Ficheiros de produção e conteúdos enviados',
    content: (
      <p>
        Fotografias, logótipos, textos, ficheiros 3D ou outros materiais enviados pelo cliente são utilizados para avaliação técnica, preparação de orçamento, produção, controlo de qualidade e eventual assistência pós-venda. Não utilizamos estes conteúdos para fins promocionais sem autorização.
      </p>
    ),
  },
  {
    title: '5. Subcontratantes e serviços técnicos',
    content: (
      <p>
        Para operar o site e prestar o serviço, podemos recorrer a fornecedores como Vercel para alojamento, InstantDB para base de dados, Cloudflare R2 para armazenamento de ficheiros, Stripe para pagamentos, Resend para envio de emails transacionais e Vercel Analytics para métricas técnicas agregadas quando ativo. Estes fornecedores tratam dados apenas na medida necessária para prestar os respetivos serviços.
      </p>
    ),
  },
  {
    title: '6. Pagamentos',
    content: (
      <p>
        Os pagamentos online são processados por fornecedores especializados, como a Stripe. A EM3D não armazena dados completos de cartões bancários. Podemos conservar referências de pagamento, estado da transação, valor, data e identificadores necessários para confirmar encomendas, apoio ao cliente, contabilidade e prevenção de fraude.
      </p>
    ),
  },
  {
    title: '7. Conservação dos dados',
    content: (
      <p>
        Conservamos dados apenas pelo período necessário às finalidades indicadas. Dados de encomendas e faturação podem ser conservados durante os prazos legalmente exigidos. Comunicações de apoio são conservadas enquanto forem necessárias para acompanhamento do pedido. Ficheiros de produção podem ser mantidos para controlo de qualidade, reimpressão ou assistência, salvo pedido de eliminação quando legalmente possível.
      </p>
    ),
  },
  {
    title: '8. Segurança',
    content: (
      <p>
        Aplicamos medidas técnicas e organizativas adequadas para proteger os dados pessoais contra acesso não autorizado, perda, alteração ou divulgação indevida. Nenhum sistema é totalmente imune a risco, mas procuramos limitar o acesso aos dados às pessoas e fornecedores que necessitam deles para prestar o serviço.
      </p>
    ),
  },
  {
    title: '9. Transferências internacionais',
    content: (
      <p>
        Alguns fornecedores tecnológicos podem tratar dados fora do Espaço Económico Europeu. Quando tal aconteça, procuramos utilizar fornecedores que recorram a mecanismos reconhecidos para proteção de dados, incluindo cláusulas contratuais-tipo ou outros instrumentos previstos no RGPD.
      </p>
    ),
  },
  {
    title: '10. Direitos dos titulares dos dados',
    content: (
      <p>
        Nos termos do RGPD, pode solicitar acesso, retificação, apagamento, limitação do tratamento, portabilidade, oposição ao tratamento e retirada de consentimento quando aplicável. Para exercer estes direitos, envie um pedido para geral@em3d.pt, indicando o direito que pretende exercer e os dados necessários para o identificar.
      </p>
    ),
  },
  {
    title: '11. Reclamações junto da autoridade de controlo',
    content: (
      <p>
        Se considerar que os seus dados pessoais não foram tratados de acordo com a lei, pode apresentar reclamação junto da Comissão Nacional de Proteção de Dados (CNPD), sem prejuízo de nos contactar primeiro para tentarmos resolver a situação.
      </p>
    ),
  },
  {
    title: '12. Alterações a esta política',
    content: (
      <p>
        A EM3D pode atualizar esta Política de Privacidade para refletir alterações legais, técnicas ou operacionais. A versão em vigor será publicada nesta página com a respetiva data de atualização.
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <section className="border-b border-border bg-background">
          <div className="container mx-auto max-w-5xl px-4 py-16 md:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Privacidade</p>
            <h1 className="mt-5 max-w-3xl font-serif text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
              Política de Privacidade
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">
              Informação sobre como recolhemos, utilizamos, conservamos e protegemos dados pessoais no contexto do site, encomendas e produção personalizada EM3D.
            </p>
            <p className="mt-6 text-sm text-muted-foreground">Última atualização: {updatedAt}</p>
          </div>
        </section>

        <section className="container mx-auto max-w-4xl px-4 py-14 md:py-20">
          <div className="space-y-12">
            {sections.map(section => (
              <article key={section.title}>
                <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{section.title}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground md:text-base md:leading-8">
                  {section.content}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 rounded-lg border border-border bg-card p-6 text-sm leading-7 text-muted-foreground">
            <p className="font-semibold text-foreground">Contacto de privacidade</p>
            <p className="mt-3">
              Para exercer direitos ou colocar questões sobre tratamento de dados pessoais, contacte <a href="mailto:geral@em3d.pt">geral@em3d.pt</a>.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              <Link href="https://www.cnpd.pt/cidadaos/direitos/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                Direitos RGPD na CNPD
              </Link>
              <Link href="/terms" className="text-primary hover:text-primary/80">
                Termos e Condições
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
