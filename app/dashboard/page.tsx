'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { getAllDeals } from '@/app/actions/deals'
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

// ── Helpers de Formatação ────────────────────────────────────
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
        <p style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>Carregando Hub Deal Desk...</p>
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

  // Estado dos Perfis do Usuário (Onboarding por demanda)
  const [hasCompany, setHasCompany]   = useState(false)
  const [isCloser, setIsCloser]       = useState(false)

  // Modais de Cadastro On-Demand
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [showCloserModal, setShowCloserModal]   = useState(false)
  const [companyName, setCompanyName]           = useState('')
  const [submittingOnboarding, setSubmittingOnboarding] = useState(false)

  // Carregar dados e perfil do banco de dados
  const initHub = useCallback(async (uid: string) => {
    setErroFetch('')
    try {
      const [dealsRes, profileRes] = await Promise.all([
        getAllDeals(),
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

  // Ações de Navegação Inteligente
  const handleAcessarEmpresa = (e: React.MouseEvent) => {
    if (!hasCompany) {
      e.preventDefault()
      setShowCompanyModal(true)
    } else {
      router.push('/dashboard/empresa')
    }
  }

  const handleAcessarCloser = (e: React.MouseEvent) => {
    if (!isCloser) {
      e.preventDefault()
      setShowCloserModal(true)
    } else {
      router.push('/dashboard/closer')
    }
  }

  // Cadastrar Empresa no Modal On-Demand
  const handleCadastrarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !companyName.trim()) return
    setSubmittingOnboarding(true)

    const res = await registerCompanyOnDemand({
      userId: user.id,
      companyName: companyName.trim(),
    })

    setSubmittingOnboarding(false)
    if (res.success) {
      setHasCompany(true)
      setShowCompanyModal(false)
      router.push('/dashboard/empresa')
    } else {
      alert(res.error || 'Erro ao cadastrar empresa.')
    }
  }

  // Ativar Perfil de Closer no Modal On-Demand
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

  // Cálculos consolidados da vitrine do Hub
  const totalSavingGeral = deals.reduce((acc, d) => acc + (d.savingValue || 0), 0)
  const totalMesasAtivas = deals.filter(d => d.status === 'IN_NEGOTIATION').length
  const totalConcluidas  = deals.filter(d => d.status === 'APPROVED').length

  const nomeUsuario = (user?.user_metadata?.nome_completo as string | undefined)?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'Usuário'

  if (carregando) return <Spinner />

  return (
    <div style={{ minHeight: '100vh', background: SLATE, fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ── Header Unificado ── */}
      <header style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: '0.9rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.png" alt="DeuAcordo.com" style={{ height: 34, width: 'auto', objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 17, color: NAVY, letterSpacing: '-0.02em' }}>
            DeuAcordo<span style={{ color: E }}>.com</span>
          </span>
          <span style={{ background: '#ECFDF5', color: '#065F46', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, border: '1px solid #A7F3D0' }}>
            Hub Deal Desk
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: 0 }}>{nomeUsuario}</p>
            <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{user?.email}</p>
          </div>
          <button onClick={sair} disabled={saindo} style={{
            fontSize: 13, fontWeight: 700, color: RED, background: '#FEF2F2',
            border: '1px solid #FECACA', padding: '7px 14px', borderRadius: 7,
            cursor: saindo ? 'wait' : 'pointer',
          }}>
            {saindo ? 'Saindo...' : 'Sair →'}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '2rem 1.5rem' }}>
        
        {/* Banner Boas-vindas */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: NAVY, margin: '0 0 4px' }}>
            Bem-vindo ao Ecossistema Deal Desk
          </h1>
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
            Gerencie suas economias B2B ou atue como um negociador parceiro no mesmo lugar.
          </p>
        </div>

        {/* Métricas Globais da Plataforma */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <MetricCard label="SAVING TOTAL PLATAFORMA" value={brl(totalSavingGeral)} sub="economia acumulada gerada" accent />
          <MetricCard label="MESAS EM NEGOCIAÇÃO" value={String(totalMesasAtivas)} sub="demandas ativas no momento" />
          <MetricCard label="NEGOCIAÇÕES CONCLUÍDAS" value={String(totalConcluidas)} sub="savings homologados" />
        </div>

        {/* ── MÓDULOS DE OPERAÇÃO: Seleção do Perfil ── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Módulos Operacionais
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            
            {/* Card 1: Área da Empresa */}
            <div style={{
              background: WHITE, border: `1.5px solid ${hasCompany ? E : BORDER}`,
              borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <span style={{ fontSize: 32 }}>🏢</span>
                  <Badge
                    text={hasCompany ? 'Cadastrado' : 'Ativação Grátis'}
                    bg={hasCompany ? '#DCFCE7' : '#FEF9C3'}
                    color={hasCompany ? '#166534' : '#854D0E'}
                  />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: '0 0 6px' }}>Área da Empresa</h3>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                  Abra demandas de compra para produtos e insumos. Nossos Closers negociam para sua empresa com 20% de Success Fee.
                </p>
              </div>

              <button
                onClick={handleAcessarEmpresa}
                style={{
                  width: '100%', padding: '12px', background: E, border: 'none',
                  borderRadius: 8, color: WHITE, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', textAlign: 'center', display: 'block', textDecoration: 'none'
                }}
              >
                {hasCompany ? 'Acessar Painel da Empresa →' : '+ Cadastrar Minha Empresa'}
              </button>
            </div>

            {/* Card 2: Cockpit do Closer */}
            <div style={{
              background: WHITE, border: `1.5px solid ${isCloser ? AMBER : BORDER}`,
              borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
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
                <h3 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: '0 0 6px' }}>Cockpit do Closer</h3>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                  Assuma mesas de negociação abertas por empresas, busque fornecedores melhores e receba 70% de comissão sobre cada saving.
                </p>
              </div>

              <button
                onClick={handleAcessarCloser}
                style={{
                  width: '100%', padding: '12px', background: AMBER, border: 'none',
                  borderRadius: 8, color: NAVY, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', textAlign: 'center', display: 'block', textDecoration: 'none'
                }}
              >
                {isCloser ? 'Acessar Cockpit do Closer →' : '🎯 Quero ser um Closer'}
              </button>
            </div>

          </div>
        </div>

        {/* ── VITRINE GERAL DE MESAS / DEMANDAS ── */}
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: NAVY, margin: 0 }}>Vitrine do Deal Desk</h3>
              <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>Mesas de negociação disponíveis e ativas na plataforma</p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{deals.length} mesas registradas</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 140px 140px 150px', padding: '10px 16px', background: SLATE, borderBottom: `1px solid ${BORDER}` }}>
            {['CÓDIGO', 'PRODUTO / DEMANDA', 'QTD', 'BASELINE TOTAL', 'SAVING EST.', 'STATUS'].map(c => (
              <span key={c} style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.07em' }}>{c}</span>
            ))}
          </div>

          {deals.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🤝</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: '0 0 6px' }}>Nenhuma mesa cadastrada ainda</p>
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
                    display: 'grid', gridTemplateColumns: '120px 1fr 100px 140px 140px 150px',
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

      {/* ── MODAL ON-DEMAND: Cadastro de Empresa ── */}
      {showCompanyModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: WHITE, borderRadius: 16, width: '100%', maxWidth: 460, padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: '0 0 6px' }}>Cadastre sua Empresa</h3>
            <p style={{ fontSize: 13, color: MUTED, margin: '0 0 1.25rem', lineHeight: 1.4 }}>
              Informe a razão social da sua organização para liberar a abertura de demandas de compras e acompanhamento de savings.
            </p>

            <form onSubmit={handleCadastrarEmpresa}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Nome da Empresa / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Minha Empresa LTDA"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  style={{ width: '100%', padding: '10px 13px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCompanyModal(false)}
                  style={{ padding: '10px 16px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingOnboarding}
                  style={{ padding: '10px 20px', background: E, border: 'none', borderRadius: 8, color: WHITE, fontSize: 13, fontWeight: 700, cursor: submittingOnboarding ? 'wait' : 'pointer' }}
                >
                  {submittingOnboarding ? 'Ativando...' : 'Cadastrar e Acessar Painel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL ON-DEMAND: Ativação do Perfil de Closer ── */}
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
                type="button"
                onClick={() => setShowCloserModal(false)}
                style={{ padding: '10px 16px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Voltar
              </button>
              <button
                onClick={handleAtivarCloser}
                disabled={submittingOnboarding}
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
