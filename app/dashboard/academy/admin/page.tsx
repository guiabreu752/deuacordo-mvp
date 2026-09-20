'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  getAllAffiliateProductsAdmin,
  createAffiliateProduct,
  toggleAffiliateProductActive,
  deleteAffiliateProduct,
  CreateAffiliateProductDTO,
} from '@/app/actions/academy'

const NAVY   = '#0F172A'
const E      = '#10B981'
const MUTED  = '#64748B'
const BORDER = '#E2E8F0'
const SLATE  = '#F8FAFC'
const WHITE  = '#FFFFFF'
const RED    = '#EF4444'

const categoryOptions = [
  { value: 'livros', label: 'Livros de Negociação' },
  { value: 'cursos', label: 'Cursos & Treinamentos' },
  { value: 'escritorio', label: 'Suprimentos de Escritório' },
  { value: 'software', label: 'Softwares & Ferramentas' },
]

export default function AcademyAdminPage() {
  const [products, setProducts]       = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [salvando, setSalvando]       = useState(false)
  const [erro, setErro]               = useState('')
  const [sucesso, setSucesso]         = useState('')
  const [modalNovo, setModalNovo]     = useState(false)

  // Form State
  const [form, setForm] = useState<CreateAffiliateProductDTO>({
    title: '',
    category: 'livros',
    categoryLabel: 'Livros de Negociação',
    description: '',
    priceEstimate: '',
    rating: '5.0 ★',
    imageUrl: '',
    affiliateUrl: '',
    badge: '',
  })

  const cargarProdutos = async () => {
    setLoading(true)
    const res = await getAllAffiliateProductsAdmin()
    if (res.success && res.data) {
      setProducts(res.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    cargarProdutos()
  }, [])

  const handleCategoryChange = (cat: 'livros' | 'cursos' | 'escritorio' | 'software') => {
    const selected = categoryOptions.find((o) => o.value === cat)
    setForm((p) => ({
      ...p,
      category: cat,
      categoryLabel: selected?.label || 'Outros',
    }))
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setSucesso('')

    if (!form.title || !form.description || !form.imageUrl || !form.affiliateUrl) {
      setErro('Preencha os campos obrigatórios (Título, Descrição, URL da Imagem e Link de Afiliado).')
      return
    }

    setSalvando(true)
    const res = await createAffiliateProduct(form)
    setSalvando(false)

    if (res.success) {
      setSucesso('Produto de afiliação cadastrado com sucesso!')
      setModalNovo(false)
      setForm({
        title: '',
        category: 'livros',
        categoryLabel: 'Livros de Negociação',
        description: '',
        priceEstimate: '',
        rating: '5.0 ★',
        imageUrl: '',
        affiliateUrl: '',
        badge: '',
      })
      cargarProdutos()
    } else {
      setErro(res.error || 'Erro ao cadastrar produto.')
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await toggleAffiliateProductActive(id, currentStatus)
    cargarProdutos()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este produto da vitrine?')) {
      await deleteAffiliateProduct(id)
      cargarProdutos()
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: SLATE, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: '0.9rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard" style={{ fontSize: 13, color: MUTED, textDecoration: 'none', fontWeight: 600 }}>
            ← Dashboard
          </Link>
          <span style={{ color: BORDER }}>|</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: NAVY }}>
            DeuAcordo<span style={{ color: E }}>.academy</span> Gerenciador
          </span>
        </div>

        <Link
          href="/academy"
          target="_blank"
          style={{ fontSize: 12, fontWeight: 700, color: E, background: '#ECFDF5', padding: '6px 12px', borderRadius: 6, textDecoration: 'none', border: '1px solid #A7F3D0' }}
        >
          Ver Vitrine Pública ↗
        </Link>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 4px' }}>Gestão de Produtos Afiliados</h1>
            <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Cadastre e gerencie livros, cursos e insumos exibidos no DeuAcordo Academy.</p>
          </div>

          <button
            onClick={() => setModalNovo(true)}
            style={{ background: E, border: 'none', borderRadius: 8, color: WHITE, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
          >
            + Cadastrar Novo Produto
          </button>
        </div>

        {sucesso && (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '10px 14px', borderRadius: 8, marginBottom: '1rem', fontSize: 13 }}>
            ✅ {sucesso}
          </div>
        )}

        {/* Tabela de Produtos */}
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 140px 110px 100px 130px', padding: '10px 16px', background: SLATE, borderBottom: `1px solid ${BORDER}` }}>
            {['CAPA', 'PRODUTO / LIVRO', 'CATEGORIA', 'PREÇO', 'STATUS', 'AÇÕES'].map((h) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.07em' }}>{h}</span>
            ))}
          </div>

          {loading && (
            <div style={{ padding: '2rem', textAlign: 'center', color: MUTED, fontSize: 13 }}>Carregando produtos cadastrados...</div>
          )}

          {!loading && products.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>📦</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: 0 }}>Nenhum produto cadastrado no banco</p>
              <p style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Cadastre o primeiro item para alimentar a vitrine pública.</p>
            </div>
          )}

          {!loading && products.map((item) => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 140px 110px 100px 130px', padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, alignItems: 'center' }}>
              <img src={item.imageUrl} alt={item.title} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, background: SLATE }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: '0 0 2px' }}>{item.title}</p>
                <p style={{ fontSize: 11, color: MUTED, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}>{item.description}</p>
              </div>
              <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>{item.categoryLabel}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{item.priceEstimate || 'N/A'}</span>
              <span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: item.active ? '#DCFCE7' : '#FEF2F2', color: item.active ? '#166534' : RED }}>
                  {item.active ? 'Ativo' : 'Inativo'}
                </span>
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => handleToggleActive(item.id, item.active)}
                  style={{ padding: '4px 8px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  {item.active ? 'Ocultar' : 'Exibir'}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  style={{ padding: '4px 8px', background: '#FEF2F2', border: '1px solid #FECACA', color: RED, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal Modal Novo Produto */}
      {modalNovo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: WHITE, borderRadius: 16, width: '100%', maxWidth: 520, padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: 0 }}>Cadastrar Produto Afiliado</h2>
              <button onClick={() => setModalNovo(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: MUTED }}>✕</button>
            </div>

            {erro && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: RED, padding: '8px 12px', borderRadius: 6, marginBottom: '1rem', fontSize: 12 }}>⚠️ {erro}</div>}

            <form onSubmit={handleSalvar}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4, textTransform: 'uppercase' }}>Título do Produto / Livro *</label>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Ex: Como Chegar ao Sim" style={{ width: '100%', padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4, textTransform: 'uppercase' }}>Categoria *</label>
                  <select value={form.category} onChange={(e) => handleCategoryChange(e.target.value as any)} style={{ width: '100%', padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13 }}>
                    {categoryOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4, textTransform: 'uppercase' }}>Preço Estimado</label>
                  <input value={form.priceEstimate} onChange={(e) => setForm((p) => ({ ...p, priceEstimate: e.target.value }))} placeholder="Ex: R$ 49,90" style={{ width: '100%', padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none' }} />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4, textTransform: 'uppercase' }}>Descrição Resumida *</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} placeholder="Resumo do livro/curso e os benefícios..." style={{ width: '100%', padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none' }} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4, textTransform: 'uppercase' }}>URL do Link de Afiliado (Amazon, Hotmart, etc) *</label>
                <input value={form.affiliateUrl} onChange={(e) => setForm((p) => ({ ...p, affiliateUrl: e.target.value }))} placeholder="https://amzn.to/..." style={{ width: '100%', padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4, textTransform: 'uppercase' }}>URL da Imagem de Capa *</label>
                  <input value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." style={{ width: '100%', padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4, textTransform: 'uppercase' }}>Selo / Badge (Opcional)</label>
                  <input value={form.badge} onChange={(e) => setForm((p) => ({ ...p, badge: e.target.value }))} placeholder="Ex: Mais Vendido" style={{ width: '100%', padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setModalNovo(false)} style={{ flex: 1, padding: '10px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} style={{ flex: 2, padding: '10px', background: salvando ? '#A7F3D0' : E, border: 'none', borderRadius: 8, color: WHITE, fontSize: 13, fontWeight: 700, cursor: salvando ? 'wait' : 'pointer' }}>
                  {salvando ? 'Salvando...' : 'Cadastrar na Vitrine →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}