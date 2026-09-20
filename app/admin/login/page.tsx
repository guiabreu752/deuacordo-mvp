'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginAdmin } from '@/app/actions/admin-auth'

function LoginForm() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard/admin'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await loginAdmin(password)
    setLoading(false)

    if (res.success) {
      router.push(redirect)
      router.refresh()
    } else {
      setError(res.error || 'Erro ao fazer login.')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
          Senha Master / Chave Admin *
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••••••"
          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold text-center">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition-colors text-sm disabled:opacity-50"
      >
        {loading ? 'Validando Acesso...' : 'Entrar no Painel Geral →'}
      </button>
    </form>
  )
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <span className="text-2xl">🔐</span>
          <h1 className="text-xl font-bold text-white mt-2">Área Restrita do Administrador</h1>
          <p className="text-xs text-slate-400 mt-1">Digite sua chave master para gerenciar o Pulse e o Academy</p>
        </div>

        <Suspense fallback={<div className="text-center text-xs text-slate-400">Carregando formulário...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}