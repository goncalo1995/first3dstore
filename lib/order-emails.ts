import { Resend } from 'resend'
import { formatModularProductionBomText } from './modular-production-bom'

const resend = new Resend(process.env.RESEND_API_KEY)

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function getSender() {
  return process.env.RESEND_FROM_EMAIL || 'EM3D <onboarding@resend.dev>'
}

function getAdminEmail() {
  const configured = process.env.ADMIN_EMAILS || ''
  const emails = configured.split(',').map(email => email.trim()).filter(Boolean)
  return emails[0] || null
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function getShippingLabel(method: string) {
  return method === 'mainland_portugal' ? 'Envio nacional' : 'Levantamento em Carcavelos'
}

function getMenuOrderSummary(order: any) {
  const menuItems = (order.items ?? []).filter((item: any) => item.menuSystem)
  const menuItem = menuItems.find((item: any) => (item.menuSystem?.lines ?? []).length > 0) ?? menuItems[0]
  const menuSystem = menuItem?.menuSystem
  if (!menuSystem) return ''
  const wallSummary = Array.isArray(menuSystem.walls) && menuSystem.walls.length > 0
    ? formatModularProductionBomText(menuSystem)
    : ''

  if (wallSummary) {
    return `\n\nSistema Modular — Collection 01

${wallSummary}

PREÇO
Caracteres do menu: ${menuSystem.menuCharacters ?? 0}
Caracteres extra: ${menuSystem.extraCharacters ?? 0}
Total de caracteres: ${menuSystem.totalCharacters ?? 0}
Subtotal antes desconto: ${formatPrice(Number(menuSystem.subtotalBeforeDiscount ?? 0))}
Desconto campanha: -${menuSystem.launchDiscountPercent ?? 20}% (${formatPrice(Number(menuSystem.launchDiscountAmount ?? 0))})
Total Sinalética Modular após desconto: ${formatPrice(Number(menuSystem.totalAfterDiscount ?? 0))}`
  }

  const lineBreakdown = (menuSystem.lines ?? [])
    .map((line: any) => `- Linha ${line.index}: ${line.characterCount} caracteres${line.widthWarning ? ' | aviso: pode ficar apertada' : ''} | ${line.text}`)
    .join('\n')
  const frequencySummary = Object.entries(menuSystem.characterFrequencyMap ?? {})
    .sort(([a], [b]) => a.localeCompare(b, 'pt-PT'))
    .map(([character, count]) => `${character === ' ' ? 'Espaço' : character}: ${count}`)
    .join(', ')
  const deficitSummary = Object.entries(menuSystem.avulsoDeficitMap ?? {})
    .sort(([a], [b]) => a.localeCompare(b, 'pt-PT'))
    .map(([character, count]) => `${character === ' ' ? 'Espaço' : character}: ${count}`)
    .join(', ')
  const colorFrequencySummary = Object.values(menuSystem.characterFrequencyByColor ?? {})
    .map((group: any) => {
      const characters = Object.entries(group.characters ?? {})
        .sort(([a], [b]) => a.localeCompare(b, 'pt-PT'))
        .map(([character, count]) => `${character === ' ' ? 'Espaço' : character}(${count})`)
        .join(', ')
      return `LETRAS — ${group.color?.name || 'Cor'}: ${characters || '-'}`
    })
    .join('\n')

  return `\n\nSistema Modular — Collection 01

RESUMO DO SISTEMA
Menu original:
${menuSystem.menuText || '-'}

Linhas: ${menuSystem.lineCount ?? '-'}
Largura do sistema: ${menuSystem.globalModuleCount ?? '-'} módulos / ${menuSystem.globalWidthCm ?? '-'}cm (${menuSystem.globalWidthMm ?? '-'}mm)
Fonte produção: ${menuSystem.productionFont || 'em3d-standard'}
Tamanho produção: ${menuSystem.productionSize || 'standard'}
Avisos e linhas:
${lineBreakdown || '-'}

MÓDULOS
Módulos totais de 25cm: ${menuSystem.totalRailModules ?? '-'}
Starter/base: ${menuSystem.starterQuantity ?? '-'}
Extensões por linha: ${menuSystem.extensionQuantityPerLine ?? '-'}
Extensões totais: ${menuSystem.totalExtensionQuantity ?? '-'}

LETRAS POR COR
Cor das calhas: ${menuSystem.railColor?.name || '-'}
Cor das letras: ${menuSystem.baseLetterColor?.name || menuSystem.letterColor?.name || '-'}
Cor de destaque: ${menuSystem.accentLetterColor?.name || menuSystem.baseLetterColor?.name || menuSystem.letterColor?.name || '-'}
Fundo das Letras: ${menuSystem.letterCardColor?.name || '-'}
Pack Standard: ${menuSystem.standardPackQuantity ?? 0}
Letras avulso: ${menuSystem.avulsoCharacterQuantity ?? 0}
Défice avulso: ${deficitSummary || '-'}
Mapa geral: ${frequencySummary || '-'}
${colorFrequencySummary || '-'}

PEDIDOS ESPECIAIS
Letras/símbolos extra: ${menuSystem.extraLettersText || '-'}
Pedido de cor especial: ${menuSystem.letterColorRequest?.enabled ? menuSystem.letterColorRequest.description || '-' : '-'}
Pedido de símbolo/logótipo: ${menuSystem.customIconRequest || '-'}

PREÇO
Caracteres do menu: ${menuSystem.menuCharacters ?? 0}
Caracteres extra: ${menuSystem.extraCharacters ?? 0}
Total de caracteres: ${menuSystem.totalCharacters ?? 0}
Subtotal antes desconto: ${formatPrice(Number(menuSystem.subtotalBeforeDiscount ?? 0))}
Desconto campanha: -${menuSystem.launchDiscountPercent ?? 20}% (${formatPrice(Number(menuSystem.launchDiscountAmount ?? 0))})
Total Sinalética Modular após desconto: ${formatPrice(Number(menuSystem.totalAfterDiscount ?? 0))}`
}

async function sendLoggedEmail(params: {
  orderId: string
  kind: 'customer' | 'admin'
  to: string
  subject: string
  text: string
}) {
  const { data, error } = await resend.emails.send({
    from: getSender(),
    to: params.to,
    subject: params.subject,
    text: params.text,
  })

  if (error) {
    console.error('Order email failed:', {
      orderId: params.orderId,
      kind: params.kind,
      to: params.to,
      error,
    })
    return { ok: false as const, error }
  }

  console.info('Order email sent:', {
    orderId: params.orderId,
    kind: params.kind,
    to: params.to,
    resendId: data?.id,
  })
  return { ok: true as const, data }
}

export async function sendStandardOrderEmails(order: any, orderId: string) {
  try {
    const menuSummary = getMenuOrderSummary(order)
    const itemLines = (order.items ?? [])
      .map((item: any) => {
        const details = [
          item.selectedVariant?.name ? `Opção: ${item.selectedVariant.name}` : null,
          item.colors?.length ? `Cores: ${item.colors.join(', ')}` : null,
          item.customText ? `Personalização: ${item.customText}` : null,
        ].filter(Boolean).join(' | ')

        return `- ${item.productName} x${item.quantity} — ${formatPrice(Number(item.unitPrice) * Number(item.quantity))}
${details ? `  ${details}` : ''}`
      })
      .join('\n')

    await sendLoggedEmail({
      orderId,
      kind: 'customer',
      to: order.customerEmail,
      subject: 'Encomenda confirmada - EM3D',
      text: `Olá ${order.customerName},

Recebemos o pagamento da sua encomenda EM3D.

ID da encomenda: ${orderId}

Artigos:
${itemLines}

Subtotal: ${formatPrice(order.subtotal)}
Entrega: ${formatPrice(order.shippingCost)} (${getShippingLabel(order.shippingMethod)})
Total: ${formatPrice(order.total)}
${menuSummary}

Vamos preparar a encomenda e enviaremos novidades por email.

A equipa EM3D`,
    })

    const adminEmail = getAdminEmail()
    if (adminEmail) {
      await sendLoggedEmail({
        orderId,
        kind: 'admin',
        to: adminEmail,
        subject: `Nova encomenda EM3D - ${order.customerName}`,
        text: `Nova encomenda paga.

ID: ${orderId}
Cliente: ${order.customerName}
Email: ${order.customerEmail}
Telefone: ${order.customerPhone || '-'}
Entrega: ${getShippingLabel(order.shippingMethod)}
Total: ${formatPrice(order.total)}

Artigos:
${itemLines}${menuSummary}`,
      })
    }
  } catch (error) {
    console.error('Failed to send standard order emails:', {
      orderId,
      siteUrl: siteUrl(),
      error,
    })
  }
}
