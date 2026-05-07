import * as React from 'react'
import type { MarketingPost } from '@/types/marketing'

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
