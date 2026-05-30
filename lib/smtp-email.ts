import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'

type EmailRecipient = string | string[]

export type SmtpEmailResult =
  | { ok: true; skipped?: false; messageId?: string; response?: string }
  | { ok: false; skipped?: boolean; error: string }

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null

export function parseEmailList(value: string | undefined | null) {
  return (value || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
}

export function getAdminEmails() {
  return parseEmailList(process.env.ADMIN_EMAILS)
}

export function getMailFrom() {
  return process.env.SMTP_FROM || (process.env.SMTP_USER ? `em3D <${process.env.SMTP_USER}>` : 'em3D <geral@em3d.pt>')
}

export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function getSmtpPort() {
  const port = Number(process.env.SMTP_PORT || 465)
  return Number.isFinite(port) ? port : 465
}

function getTransporter() {
  if (transporter) return transporter
  const port = getSmtpPort()
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
  return transporter
}

function summarizeError(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return 'Unknown SMTP error'
  }
}

function normalizeRecipients(to: EmailRecipient) {
  return Array.isArray(to) ? to.filter(Boolean) : to
}

export function plainTextToHtml(text: string) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<div style="font-family:Inter,Arial,sans-serif;color:#18181b;line-height:1.6;font-size:15px"><pre style="white-space:pre-wrap;font-family:Inter,Arial,sans-serif;margin:0">${escaped}</pre></div>`
}

export async function sendSmtpEmail({
  to,
  subject,
  text,
  html,
  meta,
}: {
  to: EmailRecipient
  subject: string
  text?: string
  html?: string
  meta?: Record<string, unknown>
}): Promise<SmtpEmailResult> {
  const recipients = normalizeRecipients(to)
  if ((Array.isArray(recipients) && recipients.length === 0) || !recipients) {
    console.warn('SMTP email skipped because no recipient was provided.', meta)
    return { ok: false, skipped: true, error: 'missing_recipient' }
  }

  if (!isSmtpConfigured()) {
    console.warn('SMTP email skipped because SMTP is not configured.', {
      ...meta,
      hasHost: Boolean(process.env.SMTP_HOST),
      hasUser: Boolean(process.env.SMTP_USER),
      hasPass: Boolean(process.env.SMTP_PASS),
    })
    return { ok: false, skipped: true, error: 'smtp_not_configured' }
  }

  try {
    const info = await getTransporter().sendMail({
      from: getMailFrom(),
      to: recipients,
      subject,
      text,
      html: html || (text ? plainTextToHtml(text) : undefined),
    })

    console.info('SMTP email sent.', {
      ...meta,
      to: recipients,
      subject,
      messageId: info.messageId,
      response: info.response,
    })
    return { ok: true, messageId: info.messageId, response: info.response }
  } catch (error) {
    const message = summarizeError(error)
    console.error('SMTP email failed.', {
      ...meta,
      to: recipients,
      subject,
      error: message,
    })
    return { ok: false, error: message }
  }
}
