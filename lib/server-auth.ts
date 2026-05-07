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
