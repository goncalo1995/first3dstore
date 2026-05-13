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
  const { getUnverifiedUserFromInstantCookie } = await import('@instantdb/react/nextjs')
  
  const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID
  if (!appId) {
    throw new Error('Instant App ID not configured')
  }

  // Get the user from the cookie
  const user = await getUnverifiedUserFromInstantCookie(appId)

  if (!user) {
    throw new Error('Unauthorized: No valid session found')
  }

  // Verify the user's email is an admin email
  if (!isAdminEmail(user.email)) {
    throw new Error('Forbidden: User is not authorized for admin access')
  }

  return user
}
