'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    question: 'Como fixo os hexágonos na parede?',
    answer:
      'Cada peça tem uma cavidade na parte de trás onde encaixa uma tira adesiva 3M (incluída). Basta limpar a superfície, colar a tira e pressionar. Não precisa de ferramentas.',
  },
  {
    question: 'Posso trocar a fotografia depois?',
    answer:
      'Sim. Cada moldura tem uma abertura destacável (ou um pequeno parafuso na parte traseira). Pode substituir a foto sempre que quiser – as medidas do hexágono são standard.',
  },
  {
    question: 'Que tipo de fotografia devo usar?',
    answer:
      'Qualquer fotografia impressa em papel com o tamanho aproximado do hexágono. Nós só fornecemos a moldura; a foto é impressa por si. Recomendamos papel com boa resolução e cores vivas.',
  },
  {
    question: 'Como sei qual o tamanho do hexágono?',
    answer:
      'No configurador pode escolher entre XS (120×104mm), S (160×139mm) ou M (200×173mm). As dimensões exactas são mostradas antes da compra.',
  },
  {
    question: 'Posso comprar apenas uma peça?',
    answer:
      'Sim. Basta adicionar uma única peça no configurador e finalizar a encomenda. O sistema calculará o preço e a produção será apenas para essa moldura.',
  },
  {
    question: 'Quanto tempo demora a produção?',
    answer:
      'Após a confirmação do pagamento, o prazo é de 5 a 7 dias úteis. Enviamos código de rastreio quando o pedido for expedido.',
  },
  {
    question: 'Qual a garantia?',
    answer:
      'Oferecemos 1 ano de garantia contra defeitos de fabrico. Se alguma peça chegar danificada ou falhar, substituímos sem custos adicionais.',
  },
  {
    question: 'Descontos para grandes volumes?',
    answer:
      'Encomendas com 10 ou mais peças já recebem 10% de desconto automaticamente no configurador. Para volumes superiores a 20, contacte-nos para um orçamento personalizado.',
  },
]

export default function FaqSection() {
  return (
    <section id="faq" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
      <div className="mb-12 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Ajuda e suporte</p>
        <h2 className="mt-3 font-serif text-4xl font-bold sm:text-5xl">Perguntas Frequentes</h2>
        <p className="mx-auto mt-4 max-w-2xl text-[#62574d]">
          Tudo o que precisa de saber sobre o mosaico hexagonal.
        </p>
      </div>

      <Accordion type="single" collapsible className="max-w-3xl mx-auto">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="text-left font-semibold text-[#231f19] hover:text-primary">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-[#62574d] leading-relaxed">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-12 text-center">
        <p className="text-sm text-[#62574d]">
          Ainda tem dúvidas?{' '}
          <a href="/contact" className="font-medium text-primary hover:underline">
            Contacte-nos
          </a>
        </p>
      </div>
    </section>
  )
}