'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { processAndPublishArticle } from '@/app/actions/pulse-curator'
import { createAffiliateProduct, getAllAffiliateProductsAdmin, toggleAffiliateProductActive, deleteAffiliateProduct } from '@/app/actions/academy'
import { logoutAdmin } from '@/app/actions/admin-auth'

export default function AdminUnifiedDashboard() {
  const [activeTab, setActiveTab] = useState<'pulse' | 'academy'>('pulse')
  const router = useRouter()

  // --- ESTADOS DO PULSE ---
  const [pulseUrl, setPulseUrl] = useState('')
  const [pulseLoading, setPulseLoading] = useState(false)
  const [pulseFeedback, setPulseFeedback] = useState<{ success: boolean; message: string } | null>(null)

  // --- ESTADOS DO ACADEMY ---
  const [academyProducts, setAcademyProducts] = useState<any[]>([])
  const [academyLoading, setAcademyLoading] = useState(false)
  const [academyForm, setAcademyForm] = useState({
    title: '',
    category: 'livros' as 'livros' | 'cursos' | 'escritorio' | 'software',
    categoryLabel: 'Livro Recomendado',
    description: '',
    priceEstimate: 'R$ 49,90',
    imageUrl: '',
    affiliateUrl: '',
    badge: ''
  })

  useEffect(() => {
    loadAcademyProducts()
  }, [])

  async function loadAcademyProducts() {
    const res = await getAllAffiliateProductsAdmin()
    if (res.success && res.data) {
      setAcademyProducts(res.data)
    }
  }

  // Ação Pulse
  async function handlePulseSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pulseUrl) return
    setPulseLoading(true)
    setPulseFeedback(null)

    const res = await processAndPublishArticle(pulseUrl)
    setPulseLoading(false)

    if (res.success) {
      setPulseFeedback({ success: true, message: '🎉 Artigo lido na íntegra, reescrito pela IA e publicado no Pulse!' })
      setPulseUrl('')
    } else {
      setPulseFeedback({ success: false, message: res.error || 'Erro ao publicar.' })
    }
  }

  // Ação Academy
  async function handleAcademySubmit(e: React.FormEvent) {
    e.preventDefault()
    setAcademyLoading(true)

    const res = await createAffiliateProduct(academyForm)
    setAcademyLoading(false)

    if (res.success) {
      alert('✅ Produto cadastrado com sucesso na vitrine da Academy!')
      setAcademyForm({
        title: '',
        category: 'livros',
        categoryLabel: 'Livro Recomendado',
        description: '',
        priceEstimate: 'R$ 49,90',
        imageUrl: '',
        affiliateUrl: '',
        badge: ''
      })
      loadAcademyProducts()
    } else {
      alert(res.error || 'Erro ao cadastrar produto.')
    }
  }

  async function handleLogout() {
    await logoutAdmin()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 sm:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Topo */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
          <div>
            <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider block">
              ⚡ DeuAcordo Painel Admin
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Gerenciador Central de Conteúdo
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-xl transition-colors"
          >
            🔒 Sair da Área Admin
          </button>
        </div>

        {/* Abas */}
        <div className="flex gap-2 mb-8 bg-slate-200 p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('pulse')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pulse'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📰 DeuAcordo Pulse (Notícias IA)
          </button>
          <button
            onClick={() => setActiveTab('academy')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'academy'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🎓 DeuAcordo Academy (Afiliados)
          </button>
        </div>

        {/* ABA PULSE */}
        {activeTab === 'pulse' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Curador Automático de Notícias</h2>
            <p className="text-xs text-slate-500 mb-6">
              Cole a URL de qualquer notícia externa (Reuters, Valor, InfoMoney) para o Gemini extrair o texto, reescrever e publicar no seu site.
            </p>

            <form onSubmit={handlePulseSubmit} className="space-y-4">
              <input
                type="url"
                required
                placeholder="https://www.infomoney.com.br/mercados/exemplo-de-noticia..."
                value={pulseUrl}
                onChange={e => setPulseUrl(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={pulseLoading}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-all disabled:opacity-50"
              >
                {pulseLoading ? '🤖 Reescrevendo com IA...' : '⚡ Processar e Publicar Artigo'}
              </button>
            </form>

            {pulseFeedback && (
              <div className={`mt-4 p-4 rounded-xl text-xs font-bold ${
                pulseFeedback.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
              }`}>
                {pulseFeedback.message}
              </div>
            )}
          </div>
        )}

        {/* ABA ACADEMY */}
        {activeTab === 'academy' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-2">Cadastrar Novo Produto de Afiliado</h2>
              <p className="text-xs text-slate-500 mb-6">
                Cadastre livros, cursos ou insumos para aparecerem na vitrine pública da Academy com seu link de comissão.
              </p>

              <form onSubmit={handleAcademySubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título do Produto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: As Armas da Persuasão"
                    value={academyForm.title}
                    onChange={e => setAcademyForm({ ...academyForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Categoria *</label>
                  <select
                    value={academyForm.category}
                    onChange={e => setAcademyForm({
                      ...academyForm,
                      category: e.target.value as any,
                      categoryLabel: e.target.value === 'livros' ? 'Livro Recomendado' : 'Curso Especializado'
                    })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="livros">Livros de Negociação</option>
                    <option value="cursos">Cursos & Certificações</option>
                    <option value="escritorio">Insumos de Escritório</option>
                    <option value="software">Softwares B2B</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descrição *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Breve resumo da recomendação..."
                    value={academyForm.description}
                    onChange={e => setAcademyForm({ ...academyForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Link de Afiliado (Amazon / Hotmart) *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://amzn.to/seu-link-afiliado"
                    value={academyForm.affiliateUrl}
                    onChange={e => setAcademyForm({ ...academyForm, affiliateUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">URL da Imagem da Capa *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://m.media-amazon.com/images/..."
                    value={academyForm.imageUrl}
                    onChange={e => setAcademyForm({ ...academyForm, imageUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={academyLoading}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all"
                  >
                    {academyLoading ? 'Salvando...' : '➕ Publicar na Academy'}
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de Produtos Já Cadastrados */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 text-sm mb-4">Produtos Ativos na Vitrine ({academyProducts.length})</h3>
              <div className="divide-y divide-slate-100">
                {academyProducts.map(p => (
                  <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{p.title}</span>
                      <span className="text-slate-400 ml-2">({p.category})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          await toggleAffiliateProductActive(p.id, p.active)
                          loadAcademyProducts()
                        }}
                        className={`px-2.5 py-1 rounded-md font-bold ${p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {p.active ? 'Ativo' : 'Inativo'}
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Deseja excluir este produto?')) {
                            await deleteAffiliateProduct(p.id)
                            loadAcademyProducts()
                          }
                        }}
                        className="text-red-500 font-bold hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}