'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { processAndPublishArticle } from '@/app/actions/pulse-curator'

export default function PulseAdminCuratorPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null)

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault()
    if (!url) return

    setLoading(true)
    setFeedback(null)

    const res = await processAndPublishArticle(url)

    setLoading(false)

    if (res.success) {
      setFeedback({
        success: true,
        message: '🎉 Notícia lida na íntegra, reescrita pela IA e publicada no DeuAcordo Pulse!'
      })
      setUrl('')
    } else {
      setFeedback({
        success: false,
        message: res.error || 'Erro ao publicar notícia.'
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 sm:p-10 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1">
              ⚡ DeuAcordo.pulse Admin
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Curador Rápido de Notícias B2B
            </h1>
          </div>
          <Link
            href="/pulse"
            target="_blank"
            className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl transition-colors"
          >
            Ver Portal Pulse ↗
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
          <form onSubmit={handlePublish}>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Cole o link de qualquer notícia externa (Reuters, Valor, InfoMoney, etc.):
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                required
                placeholder="https://www.infomoney.com.br/mercados/exemplo-de-noticia..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-50 text-sm whitespace-nowrap"
              >
                {loading ? '🤖 Extraindo e Reescrevendo...' : '⚡ Publicar Artigo Completo'}
              </button>
            </div>
          </form>

          {feedback && (
            <div className={`mt-4 p-4 rounded-xl text-xs font-bold ${
              feedback.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {feedback.message}
            </div>
          )}
        </div>

        <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200 text-xs text-slate-600 leading-relaxed">
          <p className="font-bold text-slate-900 mb-1">💡 Como funciona este módulo de Curadoria:</p>
          <p>O robô acessa o link digitado, lê todo o corpo do texto da matéria original, envia para a API do Gemini e gera um post de blog exclusivo com 3 a 4 parágrafos inéditos e análise de impacto B2B para o Plano PRO.</p>
        </div>
      </div>
    </div>
  )
}