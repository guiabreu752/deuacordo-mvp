'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface Article {
  id: string
  title: string
  summary: string
  impactAnalysis?: string
  sourceName: string
  sourceUrl: string
  imageUrl?: string
  publishedAt: string
}

export default function DeuAcordoPulsePage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('todas')
  const [isPaidUser, setIsPaidUser] = useState<boolean>(false) // Simulação do plano pago

  useEffect(() => {
    // Busca notícias públicas da API
    async function fetchNews() {
      const res = await fetch('/api/pulse/articles')
      if (res.ok) {
        const data = await res.json()
        setArticles(data)
      }
    }
    fetchNews()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header Público do Pulse */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-lg">
              D
            </div>
            <span className="font-extrabold text-white text-lg">
              DeuAcordo<span className="text-emerald-400">.pulse</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPaidUser(!isPaidUser)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 py-1.5 rounded-lg border border-slate-700"
            >
              {isPaidUser ? '⚡ Modo Assinante PAGO' : '🔒 Simular Plano Pro'}
            </button>
            <Link href="/login" className="text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-lg transition-colors">
              Entrar na Plataforma
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-slate-900 text-white py-10 px-4 border-b border-slate-800">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 mb-3">
            📈 Inteligência Geopolítica & Negócios
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
            DeuAcordo Pulse
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            Acompanhe o impacto de decisões internacionais, variação de commodities e mercado industrial no seu negócio.
          </p>
        </div>
      </section>

      {/* Filtro de Categorias (Disponível na versão Paga) */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['todas', 'Aço & Metais', 'Energia & Câmbio', 'Logística Global', 'Geopolítica'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat === 'todas' ? '🌐 Todas as Notícias' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Vitrine de Notícias */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200">
              <p className="text-2xl mb-2">📰</p>
              <p className="text-slate-600 font-bold">Nenhuma notícia importada ainda.</p>
              <p className="text-xs text-slate-400 mt-1">Acione o serviço de captura para carregar as novidades.</p>
            </div>
          ) : (
            articles.map((item) => (
              <article key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
                <div>
                  <div className="h-40 bg-slate-100 relative">
                    <img src={item.imageUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800'} alt={item.title} className="w-full h-full object-cover" />
                    <span className="absolute top-3 left-3 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {item.sourceName}
                    </span>
                  </div>

                  <div className="p-5">
                    <h3 className="font-bold text-slate-900 text-base mb-2 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">
                      {item.summary}
                    </p>

                    {/* Destaque Exclusivo do Plano Pago */}
                    {isPaidUser ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-2">
                        <span className="text-[10px] font-extrabold text-emerald-800 uppercase block mb-1">
                          ⚡ Impacto para Usinagem / Aço:
                        </span>
                        <p className="text-xs text-emerald-900 font-medium">
                          {item.impactAnalysis || 'Aumento projetado nos custos de matéria-prima nos próximos 30 dias.'}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 mb-2 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">💡 Análise de Impacto B2B</span>
                        <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Plano PRO</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-100 mt-auto flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {new Date(item.publishedAt).toLocaleDateString('pt-BR')}
                  </span>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    Ler Fonte Original ↗
                  </a>
                </div>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  )
}