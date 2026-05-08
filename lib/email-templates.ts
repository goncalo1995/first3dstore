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
