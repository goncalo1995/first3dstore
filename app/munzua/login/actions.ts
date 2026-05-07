'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const MUNZUA_COOKIE = 'munzua-auth'

export async function loginToMunzua(formData: FormData) {
  const configuredPassword = process.env.MUNZUA_PASSWORD
  const submittedPassword = String(formData.get('password') ?? '')
  const nextPath = String(formData.get('next') ?? '/munzua')

  if (!configuredPassword) {
    redirect('/munzua/login?error=missing-password')
  }

  if (submittedPassword !== configuredPassword) {
    redirect(`/munzua/login?error=invalid&next=${encodeURIComponent(nextPath)}`)
  }

  const cookieStore = await cookies()
  cookieStore.set(MUNZUA_COOKIE, configuredPassword, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })

  redirect(nextPath.startsWith('/munzua') ? nextPath : '/munzua')
}
