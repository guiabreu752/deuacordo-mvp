'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { getCompanyData, updateCompanyData } from '@/app/actions/user'

// ── Paleta Executiva DeuAcordo ──────────────────────────────
const NAVY   = '#0F172A'
const E      = '#10B981'
const MUTED  = '#64748B'
const BORDER = '#E2E8F0'
const SLATE  = '#F8FAFC'
const WHITE  = '#FFFFFF'
const RED    = '#EF4444'

const ECOSSISTEMA_PRODUTOS = [
  { id: 'deal-desk',    name: 'Deal Desk',     icon: '🤝', active: true,  href: '/dashboard', desc: 'Centralizador e pipeline visual' },
  { id: 'ai-breakdown', name: 'AI Breakdown',  icon: '🤖', active: true,  href: '/dashboard/ai-breakdown', desc: 'Desfragmentador e breakdown de custos espelhado' },
  { id: 'auction',      name: 'Auction',       icon: '⚡', active: false, href: '#', desc: 'Leilão reverso ao vivo' },
  { id: 'benchmark',    name: 'Benchmark',     icon: '📊', active: false, href: '#', desc: 'Inteligência comparativa de preços' },
  { id: 'legal',        name: 'Legal',         icon: '⚖️', active: false, href: '#', desc: 'Conformidade e minutas automáticas' },
  { id: 'risk',         name: 'Risk',          icon: '🛡️', active: false, href: '#', desc: 'Score de risco e homologação' },
  { id: 'matrix',       name: 'Matrix',        icon: '📐', active: false, href: '#', desc: 'Matriz de decisão ponderada' },
  { id: 'pulse',        name: 'Pulse',         icon: '📈', active: true,  href: '/pulse', desc: 'Dashboard executivo em tempo real' },
  { id: 'route',        name: 'Route',         icon: '🔀', active: false, href: '#', desc: 'Roteamento de aprovações' },
  { id: 'club',         name: 'Club',          icon: '💎', active: false, href: '#', desc: 'Comunidade e rede VIP' },
  { id: 'academy',      name: 'Academy',       icon: '🎓', active: true,  href: '/academy', desc: 'Plataforma LMS de capacitação' },
]

// ── Catálogo Abrangente de Categorias B2B ────────────────────
const LISTA_CATEGORIAS_B2B = [
  'Aço, Ferro e Metalurgia',
  'Alimentos e Bebidas (Atacado)',
  'Automação Industrial e Robótica',
  'Automotivo e Peças de Frota',
  'Borracha e Elastômeros',
  'Combustíveis, Lubrificantes e Energia',
  'Construção Civil e Materiais Brutos',
  'Consultoria, Auditoria e Serviços Profissionais',
  'Embalagens de Papelão e Ondulados',
  'Embalagens Plásticas e Flexíveis',
  'Equipamentos de Proteção Individual (EPI) e Segurança',
  'Ferramental e Usinagem',
  'Fardamento, Uniformes e Têxtil',
  'Hospitalar, Medicamentos e Insumos Médicos',
  'Informática, Hardware e Periféricos',
  'Ingredientes e Aditivos Alimentícios',
  'Limpeza Profissional, Higiene e Descartáveis',
  'Logística, Fretes e Armazenagem',
  'Móveis Corporativos e Infraestrutura de Escritório',
  'Papelaria, Impressão e Suprimentos de Escritório',
  'Plásticos, Resinas e Polímeros',
  'Produtos Químicos Industriais',
  'Refrigeração, Ar Condicionado e HVAC',
  'Software, SaaS e Licenciamento de TI',
  'Telecomunicações, Conectividade e Nuvem',
  'Treinamento e Desenvolvimento de Pessoas',
  'Vidros, Cerâmicas e Revestimentos',
  'Outras Categorias'
]

// ── 10 Maiores Moedas Comercializadas no Brasil + Outras ────
const LISTA_MOEDAS = [
  { code: 'BRL', label: 'BRL — Real Brasileiro' },
  { code: 'USD', label: 'USD — Dólar Americano' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — Libra Esterlina' },
  { code: 'CNY', label: 'CNY — Yuan Chinês' },
  { code: 'JPY', label: 'JPY — Iene Japonês' },
  { code: 'CAD', label: 'CAD — Dólar Canadense' },
  { code: 'AUD', label: 'AUD — Dólar Australiano' },
  { code: 'CHF', label: 'CHF — Franco Suíço' },
  { code: 'ARS', label: 'ARS — Peso Argentino' },
  { code: 'OUTRAS', label: 'Outras Moedas' }
]

function Spinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: SLATE }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 38, height: 38, border: `3px solid ${BORDER}`, borderTopColor: E,
          borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>Carregando configurações...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}

export default function ConfiguracoesEmpresaPage() {
  const router = useRouter()
  const [user, setUser]             = useState<User | null>(null)
  const [orgId, setOrgId]           = useState<string>('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando]     = useState(false)
  const [mensagemSucesso, setMensagemSucesso] = useState('')
  const [erro, setErro]             = useState('')
  const [saindo, setSaindo]         = useState(false)

  // Estados de busca e seleção de categorias
  const [buscaCategoria, setBuscaCategoria] = useState('')
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([])

  // Estado de moedas selecionadas
  const [moedasSelecionadas, setMoedasSelecionadas] = useState<string[]>(['BRL'])

  const [form, setForm] = useState({
    companyName: '',
    cnpj: '',
    segmentoEmpresa: 'COMERCIO',
    faturamentoAnual: 'R$ 4.8Mi a R$ 50Mi (Média)',
    gastoComprasAno: 'R$ 500k a R$ 2Mi/ano',
    escopoMercado: 'NACIONAL',
  })

  const carregarDados = useCallback(async (uid: string) => {
    setErro('')
    const res = await getCompanyData(uid)
    if (res.success && res.organization) {
      const org = res.organization
      setOrgId(org.id)
      setForm({
        companyName: org.name || '',
        cnpj: org.cnpj || '',
        segmentoEmpresa: org.segmentoEmpresa || 'COMERCIO',
        faturamentoAnual: org.faturamentoAnual || 'R$ 4.8Mi a R$ 50Mi (Média)',
        gastoComprasAno: org.gastoComprasAno || 'R$ 500k a R$ 2Mi/ano',
        escopoMercado: org.escopoMercado || 'NACIONAL',
      })

      if (org.categoriasPraticadas) {
        const cats = Array.isArray(org.categoriasPraticadas)
          ? org.categoriasPraticadas
          : String(org.categoriasPraticadas).split(',').map(c => c.trim()).filter(Boolean)
        setCategoriasSelecionadas(cats)
      }

      if (org.moedasUtilizadas) {
        const mds = Array.isArray(org.moedasUtilizadas)
          ? org.moedasUtilizadas
          : String(org.moedasUtilizadas).split(',').map(m => m.trim()).filter(Boolean)
        setMoedasSelecionadas(mds.length > 0 ? mds : ['BRL'])
      }
    } else {
      setErro(res.error || 'Não foi possível carregar os dados da empresa.')
    }
  }, [])

  useEffect(() => {
    let mounted = true
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!mounted) return
      if (!u) { router.replace('/login'); return }

      setUser(u)
      await carregarDados(u.id)
      if (mounted) setCarregando(false)
    }
    init()
  }, [router, carregarDados])

  async function sair() {
    setSaindo(true)
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const toggleCategoria = (cat: string) => {
    setCategoriasSelecionadas(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const toggleMoeda = (code: string) => {
    setMoedasSelecionadas(prev =>
      prev.includes(code) ? prev.filter(m => m !== code) : [...prev, code]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) return
    setSalvando(true)
    setMensagemSucesso('')
    setErro('')

    const res = await updateCompanyData({
      organizationId: orgId,
      companyName: form.companyName.trim(),
      cnpj: form.cnpj.trim(), // Agora opcional
      faturamentoAnual: form.faturamentoAnual,
      gastoComprasAno: form.gastoComprasAno,
      segmentoEmpresa: form.segmentoEmpresa,
      escopoMercado: form.escopoMercado,
      categoriasPraticadas: categoriasSelecionadas,
      moedasUtilizadas: moedasSelecionadas,
    })

    setSalvando(false)
    if (res.success) {
      setMensagemSucesso('Cadastro da empresa atualizado com sucesso!')
      setTimeout(() => setMensagemSucesso(''), 4000)
    } else {
      setErro(res.error || 'Erro ao atualizar cadastro.')
    }
  }

  const categoriasFiltradas = LISTA_CATEGORIAS_B2B.filter(cat =>
    cat.toLowerCase().includes(buscaCategoria.toLowerCase())
  )

  const nomeUsuario = (user?.user_metadata?.nome_completo as string | undefined)?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Empresa'

  const inputStyle = {
    width: '100%', padding: '10px 13px', background: SLATE, border: `1px solid ${BORDER}`,
    borderRadius: 8, fontSize: 13, outline: 'none', color: NAVY, boxSizing: 'border-box' as const
  }

  const labelStyle = {
    display: 'block' as const, fontSize: 11, fontWeight: 700 as const, color: NAVY,
    marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.05em'
  }

  if (carregando) return <Spinner />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: SLATE, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── SIDEBAR LATERAL ESQUERDA ───────────────────────────── */}
      <aside style={{
        width: 270, background: WHITE, borderRight: `1px solid ${BORDER}`,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 65px)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <img src="/logo.png" alt="DeuAcordo.com" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
              <span style={{ fontWeight: 800, fontSize: 17, color: NAVY, letterSpacing: '-0.02em' }}>
                DeuAcordo<span style={{ color: E }}>.com</span>
              </span>
            </Link>
          </div>

          <div style={{ padding: '1.25rem 1rem', overflowY: 'auto', flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 8 }}>
              PRODUTOS B2B DEUACORDO
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: '1.5rem' }}>
              {ECOSSISTEMA_PRODUTOS.map(p => (
                <div
                  key={p.id}
                  title={p.desc}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 11px', borderRadius: 8, background: p.active ? '#ECFDF5' : 'transparent',
                    border: `1px solid ${p.active ? '#A7F3D0' : 'transparent'}`, color: p.active ? '#065F46' : NAVY,
                    fontSize: 13, fontWeight: p.active ? 700 : 500, opacity: p.active ? 1 : 0.7,
                    cursor: p.active ? 'pointer' : 'default'
                  }}
                  onClick={() => p.active && router.push(p.href)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{p.icon}</span>
                    <span>{p.name}</span>
                  </div>
                  {p.active ? (
                    <span style={{ fontSize: 9, background: E, color: WHITE, padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>ATIVO</span>
                  ) : (
                    <span style={{ fontSize: 9, background: SLATE, border: `1px solid ${BORDER}`, color: MUTED, padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>EM BREVE</span>
                  )}
                </div>
              ))}
            </div>

            <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>
              GERENCIAMENTO
            </p>

            <Link
              href="/dashboard/empresa/configuracoes"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px',
                borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0',
                color: '#065F46', fontSize: 13, fontWeight: 700, textDecoration: 'none'
              }}
            >
              <span style={{ fontSize: 16 }}>⚙️</span>
              <span>Configurações</span>
            </Link>
          </div>
        </div>

        <div style={{ padding: '1rem', borderTop: `1px solid ${BORDER}`, background: SLATE, flexShrink: 0, height: 65, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ overflow: 'hidden', paddingRight: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nomeUsuario}</p>
              <p style={{ fontSize: 10, color: MUTED, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
            </div>
            <button
              onClick={sair} disabled={saindo} title="Sair"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: RED, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: saindo ? 'wait' : 'pointer', flexShrink: 0 }}
            >
              {saindo ? '...' : 'Sair'}
            </button>
          </div>
        </div>
      </aside>

      {/* ── CONTEÚDO PRINCIPAL (FORMULÁRIO DE CADASTRO) ────────────────── */}
      <div style={{ marginLeft: 270, flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        <header style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Link href="/dashboard/empresa" style={{ fontSize: 12, fontWeight: 600, color: MUTED, textDecoration: 'none' }}>
                ← Voltar para o Painel da Empresa
              </Link>
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: 0 }}>
              Editar Cadastro da Empresa
            </h1>
            <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>
              Atualize as informações operacionais e o perfil de compras da sua organização
            </p>
          </div>
        </header>

        <main style={{ padding: '2rem', maxWidth: 840, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

          {mensagemSucesso && (
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', color: '#065F46', fontSize: 13, fontWeight: 700 }}>
              ✅ {mensagemSucesso}
            </div>
          )}

          {erro && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', color: RED, fontSize: 13, fontWeight: 600 }}>
              ⚠️ {erro}
            </div>
          )}

          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Nome da Empresa / Razão Social *</label>
                <input
                  type="text" required
                  value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>CNPJ (Opcional)</label>
                  <input
                    type="text" placeholder="00.000.000/0001-00 (Opcional para PF)"
                    value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Segmento *</label>
                  <select
                    value={form.segmentoEmpresa} onChange={e => setForm({ ...form, segmentoEmpresa: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="INDUSTRIA">Indústria</option>
                    <option value="COMERCIO">Comércio</option>
                    <option value="DISTRIBUIDORA">Distribuidora</option>
                    <option value="SERVICOS">Prestadora de Serviços</option>
                    <option value="PESSOA_FISICA">Pessoa Física / Produtor Rural</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Faturamento Anual *</label>
                  <select
                    value={form.faturamentoAnual} onChange={e => setForm({ ...form, faturamentoAnual: e.target.value })}
                    style={inputStyle}
                  >
                    <option>Até R$ 360k (Micro)</option>
                    <option>R$ 360k a R$ 4.8Mi (Pequena)</option>
                    <option>R$ 4.8Mi a R$ 50Mi (Média)</option>
                    <option>Acima de R$ 50Mi (Grande)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Compras/Ano Estimado *</label>
                  <select
                    value={form.gastoComprasAno} onChange={e => setForm({ ...form, gastoComprasAno: e.target.value })}
                    style={inputStyle}
                  >
                    <option>Até R$ 100k/ano</option>
                    <option>R$ 100k a R$ 500k/ano</option>
                    <option>R$ 500k a R$ 2Mi/ano</option>
                    <option>Acima de R$ 2Mi/ano</option>
                  </select>
                </div>
              </div>

              {/* ── SELETOR COMPLETO DE CATEGORIAS COM BUSCA ────────────────── */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Categorias Principais de Compras (Selecione uma ou mais) *</label>
                
                <input
                  type="text"
                  placeholder="🔎 Digite para pesquisar seu ramo de atuação (ex: Embalagens, Aço, TI)..."
                  value={buscaCategoria}
                  onChange={e => setBuscaCategoria(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 10 }}
                />

                <div style={{
                  maxHeight: 180, overflowY: 'auto', border: `1px solid ${BORDER}`,
                  borderRadius: 8, background: SLATE, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6
                }}>
                  {categoriasFiltradas.length === 0 ? (
                    <p style={{ fontSize: 12, color: MUTED, margin: '6px 0' }}>Nenhuma categoria encontrada com esse termo.</p>
                  ) : (
                    categoriasFiltradas.map(cat => {
                      const checked = categoriasSelecionadas.includes(cat)
                      return (
                        <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: NAVY, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCategoria(cat)}
                            style={{ accentColor: E, cursor: 'pointer' }}
                          />
                          <span>{cat}</span>
                        </label>
                      )
                    })
                  )}
                </div>

                {categoriasSelecionadas.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {categoriasSelecionadas.map(cat => (
                      <span key={cat} style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {cat}
                        <button type="button" onClick={() => toggleCategoria(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065F46', padding: 0, fontSize: 12 }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '2rem' }}>
                <div>
                  <label style={labelStyle}>Escopo de Mercado</label>
                  <select
                    value={form.escopoMercado} onChange={e => setForm({ ...form, escopoMercado: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="NACIONAL">Compre apenas no Brasil (Nacional)</option>
                    <option value="IMPORTADO">Compra Importados</option>
                    <option value="AMBOS">Nacional & Importado</option>
                  </select>
                </div>

                {/* ── MÚLTIPLAS MOEDAS COM CHECKBOXES ────────────────────────── */}
                <div>
                  <label style={labelStyle}>Moedas Utilizadas (Multipla Seleção)</label>
                  <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, background: SLATE, padding: '8px 12px', maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {LISTA_MOEDAS.map(m => {
                      const checked = moedasSelecionadas.includes(m.code)
                      return (
                        <label key={m.code} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: NAVY, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMoeda(m.code)}
                            style={{ accentColor: E, cursor: 'pointer' }}
                          />
                          <span>{m.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: `1px solid ${BORDER}`, paddingTop: '1.25rem' }}>
                <Link
                  href="/dashboard/empresa"
                  style={{ padding: '11px 20px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, color: MUTED, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                >
                  Cancelar
                </Link>
                <button
                  type="submit" disabled={salvando}
                  style={{ padding: '11px 24px', background: E, border: 'none', borderRadius: 8, color: WHITE, fontSize: 13, fontWeight: 700, cursor: salvando ? 'wait' : 'pointer' }}
                >
                  {salvando ? 'Salvando...' : 'Salvar Alterações →'}
                </button>
              </div>
            </form>

          </div>
        </main>
      </div>

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  )
}