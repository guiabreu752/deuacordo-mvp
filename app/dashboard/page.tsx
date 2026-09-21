'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { getDealsByUser } from '@/app/actions/deals'
import { registerCompanyOnDemand, activateCloserProfileOnDemand, getUserProfileState } from '@/app/actions/user'

// ── Paleta de Cores Executiva & Design System DeuAcordo ─────
const NAVY        = '#0F172A' // Dark Slate Executivo
const EMERALD     = '#10B981' // Verde Neón/Elétrico
const EMERALD_DARK= '#047857' // Verde Escuro para gradientes
const MUTED       = '#64748B' // Texto Secundário
const BORDER      = '#E2E8F0' // Bordas suaves
const BORDER_DARK = '#1E293B' // Bordas para elementos escuros
const SLATE       = '#F8FAFC' // Fundo geral
const WHITE       = '#FFFFFF'
const AMBER       = '#F59E0B' // Destaque Closer
const RED         = '#EF4444'

// ── Ecossistema Completo B2B DeuAcordo (11 Módulos) ──────────────
const ECOSSISTEMA_PRODUTOS = [
  { id: 'deal-desk',    name: 'Deal Desk',     icon: '🤝', active: true,  href: '/dashboard', desc: 'Centralizador e pipeline visual de negociações corporativas em formato Kanban.' },
  { id: 'ai-breakdown', name: 'AI Breakdown',  icon: '🤖', active: true,  href: '/dashboard/ai-breakdown', desc: 'Desfragmentador e leitor inteligente de propostas, RFPs e minutas via IA.' },
  { id: 'auction',      name: 'Auction',       icon: '⚡', active: false, href: '#', desc: 'Sala de leilão reverso e rodadas de negociação em tempo real.' },
  { id: 'benchmark',    name: 'Benchmark',     icon: '📊', active: false, href: '#', desc: 'Banco de dados e inteligência comparativa de preços de mercado.' },
  { id: 'legal',        name: 'Legal',         icon: '⚖️', active: false, href: '#', desc: 'Gestão de conformidade jurídica e gerador de minutas contratuais.' },
  { id: 'risk',         name: 'Risk',          icon: '🛡️', active: false, href: '#', desc: 'Score de risco e homologação contínua de fornecedores.' },
  { id: 'matrix',       name: 'Matrix',        icon: '📐', active: false, href: '#', desc: 'Matriz de decisão ponderada para escolha de parceiros.' },
  { id: 'pulse',        name: 'Pulse',         icon: '📈', active: true,  href: '/pulse', desc: 'Dashboard executivo de métricas em tempo real e auditoria.' },
  { id: 'route',        name: 'Route',         icon: '🔀', active: false, href: '#', desc: 'Motor flexível de roteamento de aprovações e alçadas de alocação.' },
  { id: 'club',         name: 'Club',          icon: '💎', active: false, href: '#', desc: 'Comunidade executiva e rede corporativa fechada.' },
  { id: 'academy',      name: 'Academy',       icon: '🎓', active: true,  href: '/academy', desc: 'Plataforma LMS de capacitação e treinamentos.' },
]

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function statusCfg(s: string) {
  const m: Record<string, { bg: string; color: string; label: string; border: string }> = {
    'IN_NEGOTIATION':   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Em Negociação' },
    'PENDING_APPROVAL': { bg: '#FEFCE8', color: '#854D0E', border: '#FEF08A', label: 'Aguardando Aprovação' },
    'APPROVED':         { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', label: 'Concluída' },
    'REJECTED':         { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', label: 'Cancelada' },
    'DRAFT':            { bg: SLATE,     color: MUTED,     border: BORDER,    label: 'Rascunho' },
  }
  return m[s] || { bg: SLATE, color: MUTED, border: BORDER, label: s }
}

function Badge({ text, bg, color, border }: { text: string; bg: string; color: string; border?: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide" style={{
      background: bg, color, border: border ? `1px solid ${border}` : 'none'
    }}>
      {text}
    </span>
  )
}

function MetricCard({ label, value, sub, accent = false, icon }: {
  label: string; value: string; sub?: string; accent?: boolean; icon?: string
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-xl ${
      accent 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700 shadow-lg' 
        : 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
    }`}>
      {/* Forma Geométrica de Fundo em Água Viva / Polígono */}
      <div className={`absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-20 ${
        accent ? 'bg-emerald-400' : 'bg-slate-300'
      }`} />
      
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-extrabold uppercase tracking-widest ${accent ? 'text-emerald-400' : 'text-slate-500'}`}>
          {label}
        </p>
        {icon && <span className="text-xl opacity-80">{icon}</span>}
      </div>

      <p className={`text-3xl font-black tracking-tight ${accent ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </p>

      {sub && (
        <p className={`text-xs mt-2 font-medium ${accent ? 'text-slate-400' : 'text-slate-500'}`}>
          {sub}
        </p>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="relative w-14 h-14 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-slate-400 font-bold tracking-wider uppercase">Sincronizando Ecossistema DeuAcordo...</p>
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

  if (carregando) return <Spinner />

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
      
      {/* ── SIDEBAR LATERAL ESQUERDA FIXA ───────────────────── */}
      <aside className="w-[280px] bg-slate-900 border-r border-slate-800 flex flex-col justify-between fixed top-0 bottom-0 left-0 z-50 shadow-2xl">
        <div className="flex flex-col h-[calc(100vh-68px)]">
          
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-slate-800/80 flex-shrink-0">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-lg shadow-inner group-hover:scale-105 transition-transform">
                D
              </div>
              <span className="font-black text-xl text-white tracking-tight">
                DeuAcordo<span className="text-emerald-400">.com</span>
              </span>
            </Link>
          </div>

          {/* Menu com Rolagem Suave */}
          <div className="p-4 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
            
            {/* Módulos Deal Desk Operacionais */}
            <div>
              <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                OPERACIONAL DEAL DESK
              </p>
              <div className="space-y-1">
                <button
                  onClick={handleAcessarEmpresa}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-200 text-xs font-semibold transition-all hover:border-slate-600"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">🏢</span>
                    <span>Área da Empresa</span>
                  </div>
                  {hasCompany && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                </button>

                <button
                  onClick={handleAcessarCloser}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-200 text-xs font-semibold transition-all hover:border-slate-600"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">🎯</span>
                    <span>Cockpit do Closer</span>
                  </div>
                  {isCloser && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                </button>
              </div>
            </div>

            {/* Suíte dos 11 Produtos B2B */}
            <div>
              <div className="flex items-center justify-between px-3 mb-2">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  SUÍTE B2B (11 MÓDULOS)
                </p>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                  v2.0
                </span>
              </div>

              <div className="space-y-1">
                {ECOSSISTEMA_PRODUTOS.map(p => (
                  <div
                    key={p.id}
                    title={p.desc}
                    onClick={() => p.active && router.push(p.href)}
                    className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      p.active 
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/20' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 cursor-default border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-sm flex-shrink-0">{p.icon}</span>
                      <span className="truncate">{p.name}</span>
                    </div>
                    {p.active ? (
                      <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.5 rounded tracking-wider">
                        ATIVO
                      </span>
                    ) : (
                      <span className="text-[9px] bg-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded border border-slate-700/60 group-hover:border-slate-600">
                        EM BREVE
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Gerenciamento */}
            <div>
              <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                SISTEMA
              </p>
              <Link
                href="/dashboard/empresa/configuracoes"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 text-xs font-semibold transition-all"
              >
                <span className="text-sm">⚙️</span>
                <span>Configurações</span>
              </Link>
            </div>

          </div>
        </div>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex-shrink-0 h-[68px]">
          <div className="flex items-center justify-between gap-2">
            <div className="overflow-hidden">
              <p className="text-xs font-extrabold text-white truncate">{nomeUsuario}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={sair}
              disabled={saindo}
              title="Sair da Plataforma"
              className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold transition-all flex-shrink-0"
            >
              {saindo ? '...' : 'Sair'}
            </button>
          </div>
        </div>
      </aside>

      {/* ── CONTEÚDO PRINCIPAL (DIREITA) ────────────────────────── */}
      <div className="ml-[280px] flex-1 min-h-screen flex flex-col">

        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Hub General Deal Desk
              </h1>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-full border border-slate-200">
                Visão Global
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Gestão unificada de cotações B2B, savings e negociadores
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Rede B2B Ativa</span>
            </div>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="p-8 max-w-7xl mx-auto w-full space-y-8">
          
          {erroFetch && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2 shadow-sm">
              <span>⚠️</span>
              <span>{erroFetch}</span>
            </div>
          )}

          {/* Banner Hero Geométrico Executivo */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white border border-slate-800 shadow-2xl">
            {/* Elementos Geométricos Decorativos em Neón */}
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-3xl space-y-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ⚡ Ecossistema B2B Procure-to-Pay
              </span>
              <h2 className="text-3xl font-black tracking-tight text-white leading-tight">
                Potencie suas compras corporativas com inteligência e risco zero.
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Opere com nosso modelo exclusivo de <strong className="text-emerald-400">Success Fee (20%)</strong> ou contrate diretamente nossos Closers homologados para obter garantias de savings reais.
              </p>
            </div>
          </div>

          {/* Grid de Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard 
              label="SAVING TOTAL PLATAFORMA" 
              value={brl(totalSavingGeral)} 
              sub="economia acumulada homologada" 
              accent 
              icon="💰"
            />
            <MetricCard 
              label="MESAS EM NEGOCIAÇÃO" 
              value={String(totalMesasAtivas)} 
              sub="demandas abertas ativas" 
              icon="🤝"
            />
            <MetricCard 
              label="NEGOCIAÇÕES CONCLUÍDAS" 
              value={String(totalConcluidas)} 
              sub="acordos finalizados com sucesso" 
              icon="✅"
            />
          </div>

          {/* Módulos Operacionais On-Demand */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                Módulos de Operação Direta
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1: Empresa */}
              <div className="group relative rounded-2xl bg-white p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl">
                        🏢
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900">
                          {hasCompany && orgData ? orgData.name : 'Área da Empresa'}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {hasCompany ? 'Perfil B2B Verificado' : 'Ainda não cadastrado'}
                        </p>
                      </div>
                    </div>

                    <Badge
                      text={hasCompany ? 'Ativo' : 'Grátis'}
                      bg={hasCompany ? '#ECFDF5' : '#FEFCE8'}
                      color={hasCompany ? '#065F46' : '#854D0E'}
                      border={hasCompany ? '#A7F3D0' : '#FEF08A'}
                    />
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    Abra demandas de compra para insumos, matérias-primas e serviços. Nossos Closers negociam com os melhores fornecedores do mercado.
                  </p>
                </div>

                <button
                  onClick={handleAcessarEmpresa}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-[0.99]"
                >
                  {hasCompany ? 'Acessar Painel da Empresa →' : '+ Cadastrar Minha Empresa'}
                </button>
              </div>

              {/* Card 2: Closer */}
              <div className="group relative rounded-2xl bg-white p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl">
                        🎯
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900">
                          Cockpit do Closer
                        </h4>
                        <p className="text-xs text-slate-500">
                          Rede de Negociadores VIP
                        </p>
                      </div>
                    </div>

                    <Badge
                      text={isCloser ? 'Perfil Ativo' : '70% Comissão'}
                      bg={isCloser ? '#FEFCE8' : '#ECFDF5'}
                      color={isCloser ? '#854D0E' : '#065F46'}
                      border={isCloser ? '#FEF08A' : '#A7F3D0'}
                    />
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    Assuma mesas de negociação abertas, traga propostas mais baratas e receba 70% da comissão gerada sobre cada saving.
                  </p>
                </div>

                <button
                  onClick={handleAcessarCloser}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs transition-all shadow-md shadow-amber-500/20 active:scale-[0.99]"
                >
                  {isCloser ? 'Acessar Cockpit do Closer →' : '🎯 Quero Ser um Closer'}
                </button>
              </div>

            </div>
          </div>

          {/* Vitrine da Suíte de Produtos B2B (Módulos Integrados) */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
              Suíte Integrada de Módulos B2B
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ECOSSISTEMA_PRODUTOS.filter(p => p.id !== 'deal-desk').map(prod => (
                <div
                  key={prod.id}
                  className={`rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                    prod.active 
                      ? 'bg-white border-emerald-200 shadow-sm hover:shadow-md' 
                      : 'bg-slate-50/60 border-slate-200 opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-2xl">{prod.icon}</span>
                      {prod.active ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          DISPONÍVEL
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-600 border border-slate-300">
                          EM BREVE
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 mb-1">{prod.name}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{prod.desc}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {prod.active ? (
                      <Link
                        href={prod.href}
                        className="block text-center py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all"
                      >
                        Acessar Módulo →
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="w-full py-2 px-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold cursor-not-allowed"
                      >
                        Solicitar Acesso
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela de Vitrine Geral das Mesas do Usuário */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Vitrine do Deal Desk</h3>
                <p className="text-xs text-slate-500">Acompanhamento centralizado de todas as suas mesas ativas</p>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                {deals.length} mesas encontradas
              </span>
            </div>

            {/* Header da Tabela */}
            <div className="grid grid-cols-6 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
              <span>Código</span>
              <span className="col-span-2">Produto / Demanda</span>
              <span>Baseline Total</span>
              <span>Saving Estimado</span>
              <span className="text-right">Status</span>
            </div>

            {/* Linhas da Tabela */}
            <div className="divide-y divide-slate-100">
              {deals.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="text-4xl mb-3 block">🤝</span>
                  <p className="text-sm font-bold text-slate-800">Nenhuma mesa registrada até o momento</p>
                  <p className="text-xs text-slate-500 mt-1">Cadastre sua empresa e abra a primeira demanda B2B.</p>
                </div>
              ) : (
                deals.map((deal) => {
                  const sc = statusCfg(deal.status)
                  const qty = deal.quantity || 1
                  const baselineTotal = (deal.targetValue || 0) * qty

                  return (
                    <div key={deal.id} className="grid grid-cols-6 gap-4 px-6 py-4 items-center hover:bg-slate-50/80 transition-colors text-xs">
                      <span className="font-mono font-bold text-emerald-600">
                        #{deal.id.slice(0, 8).toUpperCase()}
                      </span>

                      <div className="col-span-2">
                        <p className="font-bold text-slate-900 truncate">{deal.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{qty} unidade(s)</p>
                      </div>

                      <span className="font-semibold text-slate-700">
                        {brl(baselineTotal)}
                      </span>

                      <span className={`font-extrabold ${(deal.savingValue || 0) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {(deal.savingValue || 0) > 0 ? brl(deal.savingValue) : '—'}
                      </span>

                      <div className="text-right">
                        <Badge text={sc.label} bg={sc.bg} color={sc.color} border={sc.border} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </main>
      </div>

      {/* ── MODAL DE CADASTRO DE EMPRESA ─────────────────── */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-900">Cadastrar Empresa & Perfil de Compras</h3>
              <p className="text-xs text-slate-500 mt-1">
                Informações para personalização do atendimento dos Closers. A razão social permanece protegida.
              </p>
            </div>

            <form onSubmit={handleCadastrarEmpresa} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  Nome da Empresa / Razão Social *
                </label>
                <input
                  type="text" required placeholder="Ex: Distribuidora de Bebidas Brasil LTDA"
                  value={formCompany.companyName} onChange={e => setFormCompany({ ...formCompany, companyName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">CNPJ *</label>
                  <input
                    type="text" required placeholder="00.000.000/0001-00"
                    value={formCompany.cnpj} onChange={e => setFormCompany({ ...formCompany, cnpj: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Segmento *</label>
                  <select
                    value={formCompany.segmentoEmpresa} onChange={e => setFormCompany({ ...formCompany, segmentoEmpresa: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    <option value="INDUSTRIA">Indústria</option>
                    <option value="COMERCIO">Comércio</option>
                    <option value="DISTRIBUIDORA">Distribuidora</option>
                    <option value="SERVICOS">Prestadora de Serviços</option>
                    <option value="PESSOA_FISICA">Produtor / PF</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Faturamento Anual *</label>
                  <select
                    value={formCompany.faturamentoAnual} onChange={e => setFormCompany({ ...formCompany, faturamentoAnual: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    <option>Até R$ 360k (Micro)</option>
                    <option>R$ 360k a R$ 4.8Mi (Pequena)</option>
                    <option>R$ 4.8Mi a R$ 50Mi (Média)</option>
                    <option>Acima de R$ 50Mi (Grande)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Compras/Ano Estimado *</label>
                  <select
                    value={formCompany.gastoComprasAno} onChange={e => setFormCompany({ ...formCompany, gastoComprasAno: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    <option>Até R$ 100k/ano</option>
                    <option>R$ 100k a R$ 500k/ano</option>
                    <option>R$ 500k a R$ 2Mi/ano</option>
                    <option>Acima de R$ 2Mi/ano</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Categorias Principais *</label>
                <input
                  type="text" required placeholder="Ex: Embalagens, Papelão, Aço, Insumos hospitalares"
                  value={formCompany.categoriasPraticadas} onChange={e => setFormCompany({ ...formCompany, categoriasPraticadas: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button" onClick={() => setShowCompanyModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={submittingOnboarding}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all shadow-md shadow-emerald-500/20"
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
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-900">Ativar Perfil de Closer</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Entre para a rede de negociadores qualificados da DeuAcordo.com com direito a <strong>70% de comissão</strong> sobre os fees de savings.
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 space-y-1">
              <p className="text-xs font-extrabold text-amber-900">✓ MODELO SUCCESS FEE</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Sem mensalidades ou taxa de adesão. Ganhe proporcionalmente às economias reais entregues.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button" onClick={() => setShowCloserModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all"
              >
                Voltar
              </button>
              <button
                onClick={handleAtivarCloser} disabled={submittingOnboarding}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20"
              >
                {submittingOnboarding ? 'Ativando...' : 'Confirmar & Ativar Perfil'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
