export function getReviewReceivedEmail(name: string) {
  return `Olá ${name},

Recebemos a sua foto para revisão.

O nosso criador vai verificar se a imagem tem qualidade suficiente para ficar bonita na sua luz Foto3D.pt. Em breve enviamos uma resposta com os próximos passos.

Obrigado por confiar em nós,
Foto3D.pt`
}

export function getPhotoApprovedEmail(name: string, paymentLink: string) {
  return `Olá ${name},

Foto aprovada! A sua imagem funciona bem para criar uma memória iluminada.

Pode pagar a sua encomenda aqui:
${paymentLink}

Depois de confirmarmos o pagamento, avançamos para a produção.

Obrigado,
Foto3D.pt`
}

export function getPuzzleApprovedEmail(params: {
  name: string
  paymentLink: string
  price: number
  previewUrl?: string
}) {
  const price = new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(params.price)

  return `Olá ${params.name},

O seu puzzle personalizado foi revisto e está pronto para avançar.

Resumo:
- Preço final: ${price}
- Pré-visualização: ${params.previewUrl || 'disponível no pedido'}

Para confirmar a produção, use este link de pagamento:
${params.paymentLink}

Depois de confirmarmos o pagamento, preparamos o ficheiro de produção e avançamos para impressão.

Obrigado,
Foto3D.pt`
}

export function getPaymentReceivedEmail(name: string) {
  return `Olá ${name},

Pagamento confirmado. A sua luz está em produção.

Vamos preparar a peça com cuidado e avisamos assim que estiver pronta para envio.

Obrigado,
Foto3D.pt`
}

export function getShippingUpdateEmail(name: string, trackingNumber: string) {
  return `Olá ${name},

A sua luz foi enviada via CTT!

Número de seguimento:
${trackingNumber}

Esperamos que esta memória iluminada chegue com muita emoção.

Obrigado,
Foto3D.pt`
}

export function getHexaOrderConfirmationEmail(params: {
  name: string
  email: string
  tileCount: number
  mosaicSize: string
  colors: string[]
  total: number
  discountApplied: string | null
}) {
  const priceFormatted = new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(params.total)

  const colorsList = params.colors.join(', ')
  const discountText = params.discountApplied ? ` (desconto de ${params.discountApplied} aplicado)` : ''

  return `Olá ${params.name},

Obrigado pela sua encomenda na Foto3D.pt! Estamos entusiasmados por criar as suas peças HexaMemória personalizadas.

Resumo da sua encomenda:
- Peças: ${params.tileCount} hexágonos tamanho ${params.mosaicSize}
- Cores: ${colorsList}
- Total: ${priceFormatted}${discountText}

O que acontece agora?
1. Vamos preparar o ficheiro de produção com as suas fotografias
2. Iniciamos a impressão 3D das suas peças com cuidado e precisão
3. Assim que estiverem prontas, enviamos para ${params.email}

Se tiver alguma dúvida, responda a este email ou contacte-nos através do site.

Com os melhores cumprimentos,
A equipa Foto3D.pt`
}

export function getHexaOrderAdminNotificationEmail(params: {
  customerName: string
  customerEmail: string
  customerPhone: string
  customerSpaceType: string
  tileCount: number
  mosaicSize: string
  colors: string[]
  total: number
  discountApplied: string | null
  orderRequestId: string
}) {
  const priceFormatted = new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(params.total)

  const colorsList = params.colors.join(', ')
  const discountText = params.discountApplied ? ` (desconto ${params.discountApplied})` : ' (sem desconto)'

  return `Nova venda HexaMemória!

Dados do cliente:
- Nome: ${params.customerName}
- Email: ${params.customerEmail}
- Telefone: ${params.customerPhone || 'N/A'}
- Tipo de espaço: ${params.customerSpaceType}

Detalhes da encomenda:
- ID: ${params.orderRequestId}
- Peças: ${params.tileCount} hexágonos tamanho ${params.mosaicSize}
- Cores: ${colorsList}
- Total: ${priceFormatted}${discountText}

A encomenda foi paga via Stripe e está pronta para produção.

Foto3D.pt`
}
