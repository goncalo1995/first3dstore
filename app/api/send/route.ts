import { NextRequest } from 'next/server'
import { render } from '@react-email/render'
import { MarketingReminderEmail } from '@/components/email-template'
import { dbAdmin } from '@/lib/db-admin'
import { parseEmailList, sendSmtpEmail } from '@/lib/smtp-email'
import type { MarketingPost } from '@/types/marketing'

function getRecipients() {
  const configured = process.env.MARKETING_REMINDER_TO || process.env.ADMIN_EMAILS || ''
  return parseEmailList(configured)
}

async function getMarketingPosts() {
  const data = await dbAdmin.query({
    marketingPosts: {},
  })

  return (data.marketingPosts ?? []) as unknown as MarketingPost[]
}

function isDue(post: MarketingPost, now: Date) {
  if (post.status !== 'scheduled' || post.reminderSent || !post.scheduledAt) return false
  const scheduledAt = new Date(post.scheduledAt)
  const offsetMs = Math.max(0, post.reminderOffsetHours ?? 1) * 60 * 60 * 1000
  return scheduledAt.getTime() - offsetMs <= now.getTime()
}

async function sendReminderEmail(posts: MarketingPost[], isTest: boolean) {
  const recipients = getRecipients()
  if (!recipients.length) {
    return Response.json({ error: 'No reminder recipient configured.' }, { status: 500 })
  }

  const subject = isTest
    ? `Test Instagram reminder: ${posts[0]?.title ?? 'Marketing post'}`
    : `Instagram reminder: ${posts.length} post${posts.length === 1 ? '' : 's'} due`
  const html = await render(MarketingReminderEmail({ posts, isTest }))
  const text = posts.map((post) => [
    post.title,
    post.scheduledAt ? new Date(post.scheduledAt).toLocaleString('pt-PT', { timeZone: post.timezone || 'Europe/Lisbon' }) : 'Unscheduled',
    post.caption,
    post.callToAction,
    post.hashtags.join(' '),
  ].filter(Boolean).join('\n\n')).join('\n\n---\n\n')

  const result = await sendSmtpEmail({
    to: recipients,
    subject,
    html,
    text,
    meta: {
      flow: 'marketing_reminder',
      isTest,
      count: posts.length,
    },
  })

  if (!result.ok) {
    return Response.json({ error: result.error, skipped: result.skipped ?? false }, { status: 500 })
  }

  return Response.json({ data: { messageId: result.messageId }, count: posts.length })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { action?: string; postId?: string }
    const action = body.action ?? 'marketing-digest'

    if (action === 'marketing-test') {
      if (!body.postId) return Response.json({ error: 'postId is required.' }, { status: 400 })
      const posts = await getMarketingPosts()
      const post = posts.find(item => item.id === body.postId)
      if (!post) return Response.json({ error: 'Post not found.' }, { status: 404 })
      return sendReminderEmail([post], true)
    }

    if (action === 'marketing-digest') {
      const now = new Date()
      const duePosts = (await getMarketingPosts()).filter(post => isDue(post, now))
      if (!duePosts.length) return Response.json({ count: 0, message: 'No reminders due.' })

      const response = await sendReminderEmail(duePosts, false)
      if (!response.ok) return response

      await dbAdmin.transact(
        duePosts.map(post => dbAdmin.tx.marketingPosts[post.id].update({
          reminderSent: true,
          reminderSentAt: now,
          updatedAt: now,
        })),
      )

      return response
    }

    return Response.json({ error: 'Invalid action.' }, { status: 400 })
  } catch (error) {
    console.error('Send API error:', error)
    return Response.json({ error: 'Could not send reminder email.' }, { status: 500 })
  }
}
