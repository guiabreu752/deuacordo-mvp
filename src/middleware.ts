import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protege todas as rotas de administracao
  const isAdminRoute = 
    pathname.startsWith('/pulse/admin') || 
    pathname.startsWith('/academy/admin') || 
    pathname.startsWith('/dashboard/admin')

  const isLoginPage = pathname === '/admin/login'
  const adminCookie = request.cookies.get('admin_session')

  // Se tentar acessar rota admin sem estar autenticado, manda para o login admin
  if (isAdminRoute && (!adminCookie || adminCookie.value !== 'authenticated')) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Se ja estiver logado e tentar acessar a tela de login admin, manda para o painel
  if (isLoginPage && adminCookie && adminCookie.value === 'authenticated') {
    return NextResponse.redirect(new URL('/dashboard/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/pulse/admin/:path*',
    '/academy/admin/:path*',
    '/dashboard/admin/:path*',
    '/admin/login'
  ],
}