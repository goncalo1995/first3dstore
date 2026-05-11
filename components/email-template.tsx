import * as React from 'react'
import type { MarketingPost } from '@/types/marketing'

interface HexaOrderConfirmationEmailProps {
  name: string
  tileCount: number
  mosaicSize: string
  colors: string[]
  total: number
  discountApplied: string | null
  siteUrl: string
}

export function HexaOrderConfirmationEmail({
  name,
  tileCount,
  mosaicSize,
  colors,
  total,
  discountApplied,
  siteUrl,
}: HexaOrderConfirmationEmailProps) {
  const priceFormatted = new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(total)

  const colorsList = colors.join(', ')

  return (
    <div style={{ fontFamily: 'Georgia, serif', color: '#2a2520', lineHeight: 1.6, backgroundColor: '#faf8f5', padding: '24px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        {/* Header with logo */}
        <div style={{ padding: '32px 24px 24px', textAlign: 'center', backgroundColor: '#f7f2ea', borderRadius: '8px 8px 0 0' }}>
          <img
            src={`${siteUrl}/logo_horizontal.png`}
            alt="Foto3D.pt"
            width={180}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>

        {/* Content */}
        <div style={{ padding: '32px 24px' }}>
          <h1 style={{ margin: '0 0 20px', fontSize: 24, color: '#2a2520', fontWeight: 600 }}>
            Obrigado pela sua encomenda!
          </h1>

          <p style={{ margin: '0 0 24px', fontSize: 16, color: '#4a4540' }}>
            Olá {name},
          </p>

          <p style={{ margin: '0 0 24px', fontSize: 16, color: '#4a4540' }}>
            Estamos entusiasmados por criar as suas peças HexaMemória personalizadas. Recebemos o seu pagamento com sucesso e já iniciamos o processo de produção.
          </p>

          {/* Order summary */}
          <div style={{ backgroundColor: '#f7f2ea', borderRadius: 8, padding: 20, marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18, color: '#2a2520', fontWeight: 600 }}>
              Resumo da sua encomenda
            </h2>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 0', color: '#6b6560', fontSize: 14 }}>Peças:</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500 }}>{tileCount} hexágonos tamanho {mosaicSize}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', color: '#6b6560', fontSize: 14 }}>Cores:</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500 }}>{colorsList}</td>
                </tr>
                {discountApplied && (
                  <tr>
                    <td style={{ padding: '8px 0', color: '#6b6560', fontSize: 14 }}>Desconto:</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500, color: '#2d6a4f' }}>{discountApplied}</td>
                  </tr>
                )}
                <tr style={{ borderTop: '1px solid #e8dfd1' }}>
                  <td style={{ padding: '12px 0 8px', color: '#2a2520', fontSize: 16, fontWeight: 600 }}>Total:</td>
                  <td style={{ padding: '12px 0 8px', textAlign: 'right', fontSize: 18, fontWeight: 600, color: '#2a2520' }}>
                    {priceFormatted}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Next steps */}
          <h2 style={{ margin: '0 0 16px', fontSize: 18, color: '#2a2520', fontWeight: 600 }}>
            O que acontece agora?
          </h2>

          <ol style={{ margin: '0 0 24px', paddingLeft: 20, color: '#4a4540' }}>
            <li style={{ marginBottom: 8 }}>Vamos preparar o ficheiro de produção com as suas fotografias</li>
            <li style={{ marginBottom: 8 }}>Iniciamos a impressão 3D das suas peças com cuidado e precisão</li>
            <li>Assim que estiverem prontas, enviamos um email com a confirmação de envio</li>
          </ol>

          <p style={{ margin: '0 0 16px', fontSize: 16, color: '#4a4540' }}>
            Se tiver alguma dúvida, responda a este email ou <a href={`${siteUrl}/contact`} style={{ color: '#b88452', textDecoration: 'none' }}>contacte-nos através do site</a>.
          </p>

          <p style={{ margin: '24px 0 0', fontSize: 16, color: '#4a4540' }}>
            Com os melhores cumprimentos,<br />
            <strong style={{ color: '#2a2520' }}>A equipa Foto3D.pt</strong>
          </p>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 24px', textAlign: 'center', backgroundColor: '#f7f2ea', borderRadius: '0 0 8px 8px' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#8b8075' }}>
            Foto3D.pt · Memórias iluminadas em 3D
          </p>
        </div>
      </div>
    </div>
  )
}

interface MarketingReminderEmailProps {
  posts: MarketingPost[]
  isTest?: boolean
}

function formatPostText(post: MarketingPost) {
  return [
    post.caption,
    post.callToAction,
    post.hashtags.join(' '),
    post.firstComment ? `First comment:\n${post.firstComment}` : '',
  ].filter(Boolean).join('\n\n')
}

function getProfileCrop(post: MarketingPost, slideIndex: number) {
  return post.slideCrops?.find(crop => crop.slideIndex === slideIndex)?.profile
    ?? (slideIndex === (post.thumbnailCrop?.slideIndex ?? 0) ? post.thumbnailCrop : undefined)
}

export function MarketingReminderEmail({ posts, isTest = false }: MarketingReminderEmailProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#17231d', lineHeight: 1.5 }}>
      <h1 style={{ marginBottom: 4 }}>{isTest ? 'Test Instagram reminder' : 'Instagram posting reminder'}</h1>
      <p style={{ marginTop: 0, color: '#5f6f68' }}>
        Copy the prepared content below and post manually when ready.
      </p>

      {posts.map(post => (
        <section key={post.id} style={{ border: '1px solid #d9e2dc', borderRadius: 8, padding: 16, marginTop: 18 }}>
          <p style={{ margin: '0 0 4px', fontSize: 12, color: '#5f6f68', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString('pt-PT', { timeZone: post.timezone || 'Europe/Lisbon' }) : 'Unscheduled'}
          </p>
          <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>{post.title}</h2>

          {post.isCarousel && (
            <p style={{ margin: '0 0 12px', color: '#5f6f68' }}>
              Carousel: {post.mediaUrls.length} slide{post.mediaUrls.length === 1 ? '' : 's'}
            </p>
          )}

          {post.mediaUrls.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {post.mediaUrls.slice(0, 4).map((url, index) => {
                const crop = getProfileCrop(post, index)
                return (
                  <div
                    key={url}
                    style={{
                      width: 72,
                      height: 96,
                      overflow: 'hidden',
                      borderRadius: 6,
                      border: '1px solid #d9e2dc',
                      background: '#f4f7f5',
                    }}
                  >
                    <img
                      src={url}
                      alt=""
                      width="72"
                      height="96"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: crop ? `translate(${crop.x}%, ${crop.y}%) scale(${crop.zoom ?? 1})` : undefined,
                        transformOrigin: 'center',
                      }}
                    />
                  </div>
                )
              })}
            </div>
          )}

          <p style={{ marginBottom: 6, fontWeight: 700 }}>Caption</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f7f5', borderRadius: 6, padding: 12, fontFamily: 'Arial, sans-serif' }}>
            {post.caption}
          </pre>

          {post.callToAction && (
            <>
              <p style={{ marginBottom: 6, fontWeight: 700 }}>Call to action</p>
              <p>{post.callToAction}</p>
            </>
          )}

          {post.contentType === 'story' && post.storyHighlightCategory && (
            <>
              <p style={{ marginBottom: 6, fontWeight: 700 }}>Story highlight</p>
              <p>{post.storyHighlightCategory}</p>
            </>
          )}

          <p style={{ marginBottom: 6, fontWeight: 700 }}>Hashtags</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f7f5', borderRadius: 6, padding: 12, fontFamily: 'Arial, sans-serif' }}>
            {post.hashtags.join(' ')}
          </pre>

          {post.firstComment && (
            <>
              <p style={{ marginBottom: 6, fontWeight: 700 }}>First comment</p>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f7f5', borderRadius: 6, padding: 12, fontFamily: 'Arial, sans-serif' }}>
                {post.firstComment}
              </pre>
            </>
          )}

          <p style={{ marginBottom: 6, fontWeight: 700 }}>Copy all</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#eaf3ee', borderRadius: 6, padding: 12, fontFamily: 'Arial, sans-serif' }}>
            {formatPostText(post)}
          </pre>
        </section>
      ))}
    </div>
  )
}
