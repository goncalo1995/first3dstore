import 'server-only'

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const MUNZUA_COOKIE = 'munzua-auth'

export async function verifyMunzuaAuth() {
  const password = process.env.MUNZUA_PASSWORD
  const cookieStore = await cookies()
  const session = cookieStore.get(MUNZUA_COOKIE)?.value

  return Boolean(password && session === password)
}

export async function requireMunzuaAuth() {
  if (await verifyMunzuaAuth()) return null

  return NextResponse.json({ error: 'Sessão Munzua inválida ou expirada' }, { status: 401 })
}
