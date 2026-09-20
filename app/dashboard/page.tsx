'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { getDealsByUser } from '@/app/actions/deals'
import { registerCompanyOnDemand, activateCloserProfileOnDemand, getUserProfileState } from '@/app/actions/user'

// ── Paleta Executiva DeuAcordo ──────────────────────────────
const NAVY   = '#0F172A'
const E      = '#10B981'
const MUTED  = '#64748B'
const BORDER = '#E2E8F0'
const SLATE  = '#F8FAFC'
const WHITE  = '#FFFFFF'
const AMBER  = '#F59E0B'
const RED    = '#EF4444'

// ── Ecossistema Completo B2B DeuAcordo ──────────────────────
const ECOSSISTEMA_PRODUTOS = [
  { id: 'deal-desk',    name: 'Deal Desk',     icon: '🤝', active: true,  href: '/dashboard', desc: 'Centralizador e pipeline visual de negociações' },
  { id: 'ai-breakdown', name: 'AI Breakdown',  icon: '🤖', active: true,  href: '/dashboard/ai-breakdown', desc: 'Desfragmentador e breakdown de custos com IA' },
  { id: 'auction',      name: 'Auction',       icon: '⚡', active: false, href: '#', desc: 'Leilão reverso B2B e disputa de preços ao vivo' },
  { id: 'benchmark',    name: 'Benchmark',     icon: '📊', active: false, href: '#', desc: 'Inteligência comparativa de preços e fornecedores' },
  { id: 'legal',        name: 'Legal',         icon: '⚖️', active: false, href: '#', desc: 'Conformidade e minutas contratuais automáticas' },
  { id: 'risk',         name: 'Risk',          icon: '🛡️', active: false, href: '#', desc: 'Score de risco, certidões e homologação de fornecedores' },
  { id: 'matrix',       name: 'Matrix',        icon: '📐', active: false, href: '#', desc: 'Matriz de decisão ponderada e escolha técnica' },
  { id: 'pulse',        name: 'Pulse',         icon: '📈', active: true,  href: '/pulse', desc: 'Dashboard executivo e inteligência de mercado' },
  { id: 'route',        name: 'Route',         icon: '🔀', active: false, href: '#', desc: 'Roteamento e alçada de aprovações' },
  { id: 'club',         name: 'Club',          icon: '💎', active: false, href: '#', desc: 'Comunidade VIP e compras coletivas' },
  { id: 'academy',      name: 'Academy',       icon: '🎓', active: true,  href: '/academy', desc: 'Treinamento e capacitação em procurement' },
]

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function statusCfg(s: string) {
  const m: Record<string, { bg: string; color: string; label: string }> = {
    'IN_NEGOTIATION':   { bg: '#DBEAFE', color: '#1D4ED8', label: 'Em Negociação' },
    'PENDING_APPROVAL': { bg: '#FEF9C3', color: '#854D0E', label: 'Aguardando Aprovação' },
    'APPROVED':         { bg: '#DCFCE7', color: '#166534', label: 'Concluída' },
    'REJECTED':         { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelada' },
    'DRAFT':            { bg: SLATE,     color: MUTED,     label: 'Rascunho' },
  }
  return m[s] || { bg: SLATE, color: MUTED, label: s }
}

function Badge({ text, bg, color }: { text: string; bg: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', background: bg, color,
      fontSize: 11, fontWeight: 700, padding: '3px 9px',
      borderRadius: 20, whiteSpace: 'nowrap',
    }}>{text}</span>
  )
}

function MetricCard({ label, value, sub, accent = false, accentColor = E }: {
  label: string; value: string; sub?: string; accent?: boolean; accentColor?: string
}) {
  return (
    <div style={{
      background: WHITE,
      border: `1.5px solid ${accent ? accentColor : BORDER}`,
      borderRadius: 12, padding: '1.25rem 1.5rem', flex: 1, minWidth: 200,
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: accent ? accentColor : MUTED, letterSpacing: '0.07em', margin: '0 0 6px', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 800, color: accent ? accentColor : NAVY, margin: '0 0 3px', letterSpacing: '-0.02em' }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{sub}</p>}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: SLATE }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, border: `3px solid ${BORDER}`, borderTopColor: E,
          borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>Carregando Hub DeuAcordo...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}

export default function DashboardHubPage() {
  const router = useRouter()
  const [user, setUser]               = useState<User | null>(null)
  const [deals, setDeals]             = useState<any[]>([])
  const [carregando, setCarregando]   = useState(true)
  const [erroFetch, setErroFetch]     = useState('')
  const [saindo, setSaindo]           = useState(false)

  const [hasCompany, setHasCompany]   = useState(false)
  const [orgData, setOrgData]         = useState<any>(null)
  const [isCloser, setIsCloser]       = useState(false)

  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [showCloserModal, setShowCloserModal]   = useState(false)
  const [submittingOnboarding, setSubmittingOnboarding] = useState(false)

  const [formCompany, setFormCompany] = useState({
    companyName: '',
    cnpj: '',
    faturamentoAnual: 'R$ 4.8Mi a R$ 50Mi (Média)',
    gastoComprasAno: 'R$ 500k a R$ 2Mi/ano',
    segmentoEmpresa: 'COMERCIO',
    escopoMercado: 'NACIONAL',
    categoriasPraticadas: 'Embalagens, Insumos, Matéria Prima',
    moedasUtilizadas: 'BRL',
  })

  const initHub = useCallback(async (uid: string) => {
    setErroFetch('')
    try {
      const [dealsRes, profileRes] = await Promise.all([
        getDealsByUser(uid),
        getUserProfileState(uid)
      ])

      if (dealsRes.success && dealsRes.data) {
        setDeals(dealsRes.data)
      } else {
        setErroFetch(dealsRes.error || 'Erro ao sincronizar mesas de negociação.')
      }

      if (profileRes.success) {
        setHasCompany(profileRes.hasCompany)
        setIsCloser(profileRes.isCloser)
        if (profileRes.organization || profileRes.company) {
          setOrgData(profileRes.organization || profileRes.company)
        }
      }
    } catch (err: unknown) {
      setErroFetch(err instanceof Error ? err.message : 'Falha ao carregar dados do Hub.')
    }
  }, [])

  useEffect(() => {
    let mounted = true
    async function checkUser() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!mounted) return

      if (!u) {
        router.replace('/login')
        return
      }

      setUser(u)
      await initHub(u.id)
      if (mounted) setCarregando(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') router.replace('/login')
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [router, initHub])

  async function sair() {
    setSaindo(true)
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const handleAcessarEmpresa = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (!hasCompany) {
      setShowCompanyModal(true)
    } else {
      router.push('/dashboard/empresa')
    }
  }

  const handleAcessarCloser = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (!isCloser) {
      setShowCloserModal(true)
    } else {
      router.push('/dashboard/closer')
    }
  }

  const handleCadastrarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !formCompany.companyName.trim()) return
    setSubmittingOnboarding(true)

    const res = await registerCompanyOnDemand({
      userId: user.id,
      companyName: formCompany.companyName.trim(),
      cnpj: formCompany.cnpj.trim(),
      faturamentoAnual: formCompany.faturamentoAnual,
      gastoComprasAno: formCompany.gastoComprasAno,
      segmentoEmpresa: formCompany.segmentoEmpresa,
      escopoMercado: formCompany.escopoMercado,
      categoriasPraticadas: formCompany.categoriasPraticadas.split(',').map(c => c.trim()),
      moedasUtilizadas: formCompany.moedasUtilizadas.split(',').map(m => m.trim()),
    })

    setSubmittingOnboarding(false)
    if (res.success) {
      setHasCompany(true)
      setOrgData(res.organization)
      setShowCompanyModal(false)
      router.push('/dashboard/empresa')
    } else {
      alert(res.error || 'Erro ao cadastrar empresa.')
    }
  }

  const handleAtivarCloser = async () => {
    if (!user) return
    setSubmittingOnboarding(true)

    const res = await activateCloserProfileOnDemand(user.id)

    setSubmittingOnboarding(false)
    if (res.success) {
      setIsCloser(true)
      setShowCloserModal(false)
      router.push('/dashboard/closer')
    } else {
      alert(res.error || 'Erro ao ativar perfil de Closer.')
    }
  }

  const totalSavingGeral = deals.reduce((acc, d) => acc + (d.savingValue || 0), 0)
  const totalMesasAtivas = deals.filter(d => d.status === 'IN_NEGOTIATION').length
  const totalConcluidas  = deals.filter(d => d.status === 'APPROVED').length

  const nomeUsuario = (user?.user_metadata?.nome_completo as string | undefined)?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'Usuário'

  const inputStyle = {
    width: '100%', padding: '9px 12px', background: SLATE, border: `1px solid ${BORDER}`,
    borderRadius: 8, fontSize: 13, outline: 'none', color: NAVY, boxSizing: 'border-box' as const
  }

  const labelStyle = {
    display: 'block' as const, fontSize: 10, fontWeight: 700 as const, color: NAVY,
    marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.05em'
  }

  if (carregando) return <Spinner />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: SLATE, fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ── SIDEBAR LATERAL ESQUERDA ───────────────────────────── */}
      <aside style={{
        width: 270,
        background: WHITE,
        borderRight: `1px solid ${BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 100
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
            
            <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>
              MÓDULOS DEAL DESK
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '1.5rem' }}>
              
              <button
                onClick={handleAcessarEmpresa}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: WHITE,
                  border: `1px solid ${BORDER}`,
                  color: NAVY,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15 }}>🏢</span>
                  <span>Área da Empresa</span>
                </div>
                {hasCompany && <span style={{ fontSize: 10, color: E }}>●</span>}
              </button>

              <button
                onClick={handleAcessarCloser}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: WHITE,
                  border: `1px solid ${BORDER}`,
                  color: NAVY,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15 }}>🎯</span>
                  <span>Cockpit do Closer</span>
                </div>
                {isCloser && <span style={{ fontSize: 10, color: AMBER }}>●</span>}
              </button>

            </div>

            <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>
              PRODUTOS B2B DEUACORDO
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '1.5rem' }}>
              {ECOSSISTEMA_PRODUTOS.map(p => (
                <div
                  key={p.id}
                  title={p.desc}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: p.active ? '#ECFDF5' : 'transparent',
                    border: `1px solid ${p.active ? '#A7F3D0' : 'transparent'}`,
                    color: p.active ? '#065F46' : NAVY,
                    fontSize: 12.5,
                    fontWeight: p.active ? 700 : 500,
                    opacity: p.active ? 1 : 0.75,
                    cursor: p.active ? 'pointer' : 'default'
                  }}
                  onClick={() => p.active && router.push(p.href)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>{p.icon}</span>
                    <span>{p.name}</span>
                  </div>
                  {p.active ? (
                    <span style={{ fontSize: 9, background: E, color: WHITE, padding: '2px 5px', borderRadius: 4, fontWeight: 800 }}>ATIVO</span>
                  ) : (
                    <span style={{ fontSize: 9, background: SLATE, border: `1px solid ${BORDER}`, color: MUTED, padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>EM BREVE</span>
                  )}
                </div>
              ))}
            </div>

            {/* ── GERENCIAMENTO NA SIDEBAR ────────────────── */}
            <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>
              GERENCIAMENTO
            </p>

            <Link
              href="/dashboard/empresa/configuracoes"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                background: SLATE,
                border: `1px solid ${BORDER}`,
                color: NAVY,
                fontSize: 12.5,
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <span style={{ fontSize: 15 }}>⚙️</span>
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
              onClick={sair}
              disabled={saindo}
              title="Sair"
              style={{
                background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: RED,
                padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: saindo ? 'wait' : 'pointer', flexShrink: 0
              }}
            >
              {saindo ? '...' : 'Sair'}
            </button>
          </div>
        </div>
      </aside>

      {/* ── CONTEÚDO PRINCIPAL (DIREITA) ────────────────────────── */}
      <div style={{ marginLeft: 270, flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        <header style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: 0 }}>
              Hub General Deal Desk
            </h1>
            <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>
              Gestão unificada de cotações B2B, savings e negociadores
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ background: '#ECFDF5', color: '#065F46', fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 6, border: '1px solid #A7F3D0' }}>
              Ecossistema B2B
            </span>
          </div>
        </header>

        <main style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          
          {erroFetch && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', color: RED, fontSize: 13, fontWeight: 600 }}>
              ⚠️ {erroFetch}
            </div>
          )}

          {/* Métricas Principais */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <MetricCard label="SAVING TOTAL PLATAFORMA" value={brl(totalSavingGeral)} sub="economia acumulada gerada" accent />
            <MetricCard label="MESAS EM NEGOCIAÇÃO" value={String(totalMesasAtivas)} sub="demandas ativas no momento" />
            <MetricCard label="NEGOCIAÇÕES CONCLUÍDAS" value={String(totalConcluidas)} sub="savings homologados" />
          </div>

          {/* Módulos Operacionais On-Demand */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: NAVY, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Módulos de Operação
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              
              {/* Card 1: Empresa */}
              <div style={{
                background: WHITE, border: `1.5px solid ${hasCompany ? E : BORDER}`,
                borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: 12, background: hasCompany ? '#ECFDF5' : SLATE,
                        border: `1.5px solid ${hasCompany ? '#A7F3D0' : BORDER}`, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 24, fontWeight: 800, color: E
                      }}>
                        🏢
                      </div>
                      <div>
                        <h4 style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: 0 }}>
                          {hasCompany && orgData ? orgData.name : 'Minha Empresa'}
                        </h4>
                        <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
                          {hasCompany ? 'Perfil B2B Verificado' : 'Ainda não cadastrado'}
                        </p>
                      </div>
                    </div>

                    <Badge
                      text={hasCompany ? 'Cadastrado' : 'Ativação Grátis'}
                      bg={hasCompany ? '#DCFCE7' : '#FEF9C3'}
                      color={hasCompany ? '#166534' : '#854D0E'}
                    />
                  </div>

                  <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                    Abra demandas de compra para produtos e insumos. Nossos Closers negociam para sua empresa com 20% de Success Fee.
                  </p>
                </div>

                <button
                  onClick={handleAcessarEmpresa}
                  style={{
                    width: '100%', padding: '12px', background: E, border: 'none',
                    borderRadius: 8, color: WHITE, fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', textAlign: 'center'
                  }}
                >
                  {hasCompany ? 'Acessar Painel da Empresa →' : '+ Cadastrar Empresa'}
                </button>
              </div>

              {/* Card 2: Closer */}
              <div style={{
                background: WHITE, border: `1.5px solid ${isCloser ? AMBER : BORDER}`,
                borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <span style={{ fontSize: 32 }}>🎯</span>
                    <Badge
                      text={isCloser ? 'Perfil Ativo' : 'Comissão de 70%'}
                      bg={isCloser ? '#FFFBEB' : '#ECFDF5'}
                      color={isCloser ? '#92400E' : '#065F46'}
                    />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: '0 0 6px' }}>Cockpit do Closer</h3>
                  <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                    Assuma mesas de negociação abertas por empresas, busque fornecedores melhores e receba 70% de comissão sobre cada saving.
                  </p>
                </div>

                <button
                  onClick={handleAcessarCloser}
                  style={{
                    width: '100%', padding: '12px', background: AMBER, border: 'none',
                    borderRadius: 8, color: NAVY, fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', textAlign: 'center'
                  }}
                >
                  {isCloser ? 'Acessar Cockpit do Closer →' : '🎯 Quero ser um Closer'}
                </button>
              </div>

            </div>
          </div>

          {/* Vitrine da Suíte de Soluções B2B (Pré-venda & Ecossistema) */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: NAVY, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Suíte Integrada de Compras B2B
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {ECOSSISTEMA_PRODUTOS.filter(p => p.id !== 'deal-desk').map(prod => (
                <div
                  key={prod.id}
                  style={{
                    background: WHITE,
                    border: `1px solid ${prod.active ? '#A7F3D0' : BORDER}`,
                    borderRadius: 12,
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: 24 }}>{prod.icon}</span>
                      {prod.active ? (
                        <span style={{ fontSize: 10, background: '#ECFDF5', color: '#065F46', padding: '3px 8px', borderRadius: 12, fontWeight: 800, border: '1px solid #A7F3D0' }}>
                          ATIVO NA SUA CONTA
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, background: SLATE, color: MUTED, padding: '3px 8px', borderRadius: 12, fontWeight: 700, border: `1px solid ${BORDER}` }}>
                          PREMIUM / EM BREVE
                        </span>
                      )}
                    </div>
                    <h4 style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: '0 0 4px' }}>{prod.name}</h4>
                    <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.4 }}>{prod.desc}</p>
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: `1px solid ${SLATE}` }}>
                    {prod.active ? (
                      <Link
                        href={prod.href}
                        style={{ display: 'block', textAlign: 'center', padding: '8px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 6, color: '#065F46', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                      >
                        Acessar Módulo →
                      </Link>
                    ) : (
                      <button
                        disabled
                        style={{ width: '100%', padding: '8px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 6, color: MUTED, fontSize: 12, fontWeight: 600, cursor: 'not-allowed' }}
                      >
                        Solicitar Demonstração
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vitrine Geral das Mesas do Usuário */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: 0 }}>Vitrine do Deal Desk (Suas Mesas)</h3>
                <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>Mesas de negociação criadas por você na plataforma</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{deals.length} mesas</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px 140px 140px 150px', padding: '10px 16px', background: SLATE, borderBottom: `1px solid ${BORDER}` }}>
              {['CÓDIGO', 'PRODUTO / DEMANDA', 'QTD', 'BASELINE TOTAL', 'SAVING EST.', 'STATUS'].map(c => (
                <span key={c} style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.07em' }}>{c}</span>
              ))}
            </div>

            {deals.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>🤝</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: '0 0 6px' }}>Você ainda não cadastrou nenhuma mesa</p>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Cadastre sua empresa e abra a primeira demanda de compras.</p>
              </div>
            ) : (
              deals.map((deal, i) => {
                const sc = statusCfg(deal.status)
                const qty = deal.quantity || 1
                const baselineTotal = (deal.targetValue || 0) * qty

                return (
                  <div
                    key={deal.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '120px 1fr 90px 140px 140px 150px',
                      padding: '14px 16px', borderBottom: i === deals.length - 1 ? 'none' : `1px solid ${BORDER}`,
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: E, fontFamily: 'monospace' }}>
                      #{deal.id.slice(0, 8).toUpperCase()}
                    </span>

                    <span style={{ fontSize: 13, color: NAVY, fontWeight: 600, paddingRight: 12 }}>
                      {deal.title}
                    </span>

                    <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>
                      {qty} un
                    </span>

                    <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
                      {brl(baselineTotal)}
                    </span>

                    <span style={{ fontSize: 13, fontWeight: 800, color: (deal.savingValue || 0) > 0 ? E : MUTED }}>
                      {(deal.savingValue || 0) > 0 ? brl(deal.savingValue) : '—'}
                    </span>

                    <Badge text={sc.label} bg={sc.bg} color={sc.color} />
                  </div>
                )
              })
            )}
          </div>

        </main>
      </div>

      {/* ── MODAL DE CADASTRO DE EMPRESA ─────────────────── */}
      {showCompanyModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: WHITE, borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: '0 0 4px' }}>Cadastrar Empresa & Perfil de Compras</h3>
            <p style={{ fontSize: 12, color: MUTED, margin: '0 0 1.25rem', lineHeight: 1.4 }}>
              As informações abaixo ajudam nossos Closers a negociarem condições com os fornecedores mais adequados. O nome da empresa fica restrito e seguro.
            </p>

            <form onSubmit={handleCadastrarEmpresa}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Nome da Empresa / Razão Social *</label>
                <input
                  type="text" required placeholder="Ex: Distribuidora de Bebidas Brasil LTDA"
                  value={formCompany.companyName} onChange={e => setFormCompany({ ...formCompany, companyName: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>CNPJ *</label>
                  <input
                    type="text" required placeholder="00.000.000/0001-00"
                    value={formCompany.cnpj} onChange={e => setFormCompany({ ...formCompany, cnpj: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Segmento *</label>
                  <select
                    value={formCompany.segmentoEmpresa} onChange={e => setFormCompany({ ...formCompany, segmentoEmpresa: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="INDUSTRIA">Indústria</option>
                    <option value="COMERCIO">Comércio</option>
                    <option value="DISTRIBUIDORA">Distribuidora</option>
                    <option value="SERVICOS">Prestadora de Serviços</option>
                    <option value="PESSOA_FISICA">Produtor / PF</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Faturamento Anual *</label>
                  <select
                    value={formCompany.faturamentoAnual} onChange={e => setFormCompany({ ...formCompany, faturamentoAnual: e.target.value })}
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
                    value={formCompany.gastoComprasAno} onChange={e => setFormCompany({ ...formCompany, gastoComprasAno: e.target.value })}
                    style={inputStyle}
                  >
                    <option>Até R$ 100k/ano</option>
                    <option>R$ 100k a R$ 500k/ano</option>
                    <option>R$ 500k a R$ 2Mi/ano</option>
                    <option>Acima de R$ 2Mi/ano</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Categorias Principais de Compras *</label>
                <input
                  type="text" required placeholder="Ex: Embalagens, Papelão, Aço, Insumos hospitalares"
                  value={formCompany.categoriasPraticadas} onChange={e => setFormCompany({ ...formCompany, categoriasPraticadas: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Escopo de Mercado</label>
                  <select
                    value={formCompany.escopoMercado} onChange={e => setFormCompany({ ...formCompany, escopoMercado: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="NACIONAL">Compre apenas no Brasil (Nacional)</option>
                    <option value="IMPORTADO">Compra Importados</option>
                    <option value="AMBOS">Nacional & Importado</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Moedas Utilizadas</label>
                  <input
                    type="text" placeholder="Ex: BRL, USD, EUR"
                    value={formCompany.moedasUtilizadas} onChange={e => setFormCompany({ ...formCompany, moedasUtilizadas: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button" onClick={() => setShowCompanyModal(false)}
                  style={{ padding: '10px 16px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={submittingOnboarding}
                  style={{ padding: '10px 20px', background: E, border: 'none', borderRadius: 8, color: WHITE, fontSize: 13, fontWeight: 700, cursor: submittingOnboarding ? 'wait' : 'pointer' }}
                >
                  {submittingOnboarding ? 'Cadastrando...' : 'Salvar & Acessar Painel →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DE ATIVAÇÃO DE CLOSER ─────────────────── */}
      {showCloserModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: WHITE, borderRadius: 16, width: '100%', maxWidth: 480, padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: '0 0 6px' }}>Ativar Perfil de Closer / Negociador</h3>
            <p style={{ fontSize: 13, color: MUTED, margin: '0 0 1rem', lineHeight: 1.4 }}>
              Ao ativar este perfil, você entra para a rede de negociadores da DeuAcordo.com com direito a <strong>70% de comissão</strong> sobre os fees de savings gerados.
            </p>

            <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', margin: '0 0 4px' }}>✓ MODELO SUCCESS FEE</p>
              <p style={{ fontSize: 12, color: '#78350F', margin: 0 }}>
                Sem cobrança mensal ou custo para ingressar. Ganhe proporcionalmente ao resultado entregue ao cliente.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button" onClick={() => setShowCloserModal(false)}
                style={{ padding: '10px 16px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Voltar
              </button>
              <button
                onClick={handleAtivarCloser} disabled={submittingOnboarding}
                style={{ padding: '10px 20px', background: AMBER, border: 'none', borderRadius: 8, color: NAVY, fontSize: 13, fontWeight: 700, cursor: submittingOnboarding ? 'wait' : 'pointer' }}
              >
                {submittingOnboarding ? 'Ativando...' : 'Confirmar e Ser Closer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  )
}
