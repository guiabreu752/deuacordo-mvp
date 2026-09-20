'use server'

import { cookies } from 'next/headers'

export async function loginAdmin(password: string) {
  const secretKey = process.env.ADMIN_SECRET_KEY || 'minhasenhadifere2026'

  if (password === secretKey) {
    const cookieStore = await cookies()
    cookieStore.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // Conectado por 7 dias
      path: '/',
    })
    return { success: true }
  }

  return { success: false, error: 'Senha de administrador incorreta.' }
}

export async function logoutAdmin() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  return { success: true }
}