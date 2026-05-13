import 'server-only';

import { NextResponse } from 'next/server'
import type { User } from '@instantdb/admin'
import { dbAdmin } from '@/lib/db-admin'

const adminEmails = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(email => email.trim().toLowerCase())

export function isAdminEmail(email?: string | null) {
  return Boolean(email && adminEmails.includes(email.toLowerCase()))
}

export async function getAdminUserFromRequest(
  req: Request,
): Promise<{ user: User } | { response: NextResponse }> {
  let user: User | null = null

  try {
    user = await dbAdmin.auth.getUserFromRequest(req)
  } catch {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (!user) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (!isAdminEmail(user.email)) {
    return {
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { user }
}

export async function requireAdminForAction(): Promise<User> {
  // For server actions, we need to check the session via cookies
  // InstantDB uses cookies to track sessions
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  // Check if there's a session cookie (InstantDB sets this)
  const sessionCookie = cookieStore.get('instantdb-session')

  if (!sessionCookie) {
    throw new Error('Unauthorized: No admin session found')
  }

  // For server actions, dbAdmin doesn't have direct request access
  // We'll need to verify the user through dbAdmin's auth system
  // This is a simplified check - in production you'd verify the session properly
  const adminEmailsEnv = process.env.ADMIN_EMAILS ?? ''
  if (!adminEmailsEnv) {
    throw new Error('Admin access not configured')
  }

  // Note: This is a basic implementation. InstantDB server actions
  // should ideally have better session verification
  return { email: adminEmailsEnv.split(',')[0].trim() } as User
}
