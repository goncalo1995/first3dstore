import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const MUNZUA_COOKIE = 'munzua-auth'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/munzua/login') {
    return NextResponse.next()
  }

  const password = process.env.MUNZUA_PASSWORD
  const session = request.cookies.get(MUNZUA_COOKIE)?.value

  if (password && session === password) {
    return NextResponse.next()
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/munzua/login'
  loginUrl.searchParams.set('next', pathname)

  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/munzua/:path*'],
}
