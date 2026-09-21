'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { getDealsByUser, createDeal, aprovarSaving } from '@/app/actions/deals'
import { registerCompanyOnDemand, getCompanyData } from '@/app/actions/user'

// ── Paleta de Cores Executiva & Design System DeuAcordo ─────
const NAVY        = '#0F172A' // Dark Slate Executivo
const EMERALD     = '#10B981' // Verde Neón/Elétrico
const MUTED       = '#64748B' // Texto Secundário
const BORDER      = '#E2E8F0' // Bordas suaves
const SLATE       = '#F8FAFC' // Fundo geral
const WHITE       = '#FFFFFF'
const RED         = '#EF4444'

// ── Ecossistema Completo B2B DeuAcordo (11 Módulos) ──────────────
const ECOSSISTEMA_PRODUTOS = [
  { id: 'deal-desk',    name: 'Deal Desk',     icon: '🤝', active: true,  href: '/dashboard', desc: 'Centralizador e pipeline visual de negociações corporativas.' },
  { id: 'ai-breakdown', name: 'AI Breakdown',  icon: '🤖', active: true,  href: '/dashboard/ai-breakdown', desc: 'Desfragmentador e leitor inteligente de propostas via IA.' },
  { id: 'auction',      name: 'Auction',       icon: '⚡', active: false, href: '#', desc: 'Sala de leilão reverso e rodadas ao vivo.' },
  { id: 'benchmark',    name: 'Benchmark',     icon: '📊', active: false, href: '#', desc: 'Inteligência comparativa e preços históricos.' },
  { id: 'legal',        name: 'Legal',         icon: '⚖️', active: false, href: '#', desc: 'Conformidade jurídica e minutas automáticas.' },
  { id: 'risk',         name: 'Risk',          icon: '🛡️', active: false, href: '#', desc: 'Score de risco e homologação de fornecedores.' },
  { id: 'matrix',       name: 'Matrix',        icon: '📐', active: false, href: '#', desc: 'Matriz de decisão e escolha ponderada.' },
  { id: 'pulse',        name: 'Pulse',         icon: '📈', active: true,  href: '/pulse', desc: 'Dashboard executivo em tempo real.' },
  { id: 'route',        name: 'Route',         icon: '🔀', active: false, href: '#', desc: 'Motor de roteamento de aprovações.' },
  { id: 'club',         name: 'Club',          icon: '💎', active: false, href: '#', desc: 'Comunidade executiva e compras coletivas.' },
  { id: 'academy',      name: 'Academy',       icon: '🎓', active: true,  href: '/academy', desc: 'Plataforma LMS e capacitação.' },
]

// ── Categorias B2B Abrangentes ──────────────────────────────
const LISTA_CATEGORIAS_B2B = [
  'Aço, Ferro e Metalurgia',
  'Alimentos e Bebidas (Atacado)',
  'Automação Industrial e Robótica',
  'Automotivo e Peças de Frota',
  'Embalagens de Papelão e Ondulados',
  'Embalagens Plásticas e Flexíveis',
  'Logística, Fretes e Armazenagem',
  'Software, SaaS e Licenciamento de TI',
  'Telecomunicações e Nuvem',
  'Outras Categorias'
]

interface FormNovaMesa {
  produto: string
  quantidade: string
  unidade: string
  baseline: string
  preco_alvo: string
  prazo: string
  modeloAcordo: 'SAVING_20' | 'OPERACAO_1_5'
  categoria: string
  requisitosCloser: string
  visibilidade: 'PUBLICA' | 'PRIVADA'
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function statusCfg(s: string) {
  const m: Record<string, { bg: string; color: string; border: string; label: string }> = {
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
        <p className="text-sm text-slate-400 font-bold tracking-wider uppercase">Sincronizando Painel Corporativo...</p>
      </div>
    </div>
  )
}

function ModalNovaMesa({ onClose, onSalvar, salvando }: {
  onClose: () => void
  onSalvar: (f: FormNovaMesa) => Promise<void>
  salvando: boolean
}) {
  const [form, setForm]           = useState<FormNovaMesa>({
    produto: '', quantidade: '1', unidade: 'un', baseline: '', preco_alvo: '', prazo: '15',
    modeloAcordo: 'SAVING_20', categoria: 'Embalagens de Papelão e Ondulados', requisitosCloser: '', visibilidade: 'PUBLICA'
  })
  const [erroLocal, setErroLocal] = useState('')
  const set = (k: keyof FormNovaMesa) => (v: any) => setForm(p => ({ ...p, [k]: v }))

  const preview = (() => {
    const a = parseFloat(form.baseline.replace(',', '.')) || 0
    const b = parseFloat(form.preco_alvo.replace(',', '.')) || 0
    const qty = parseInt(form.quantidade) || 1

    if (!a || !b || b >= a) return null
    const savingUnit = a - b
    const savingTotal = savingUnit * qty
    return {
      valor: savingTotal,
      pct: ((savingUnit / a) * 100).toFixed(1)
    }
  })()

  async function submit() {
    if (!form.produto.trim()) { setErroLocal('Informe o produto ou insumo.'); return }
    if (!form.baseline)       { setErroLocal('Informe o preço atual pago por unidade.'); return }
    setErroLocal('')
    await onSalvar(form)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">

        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900">Abrir Nova Mesa de Negociação</h2>
            <p className="text-xs text-slate-500 mt-0.5">Demanda B2B com identidade preservada</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
              Produto / Insumo *
            </label>
            <input
              value={form.produto} placeholder="Ex: Caixas de papelão ondulado 30x20x15cm"
              onChange={e => set('produto')(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Categoria *</label>
              <select value={form.categoria} onChange={e => set('categoria')(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white">
                {LISTA_CATEGORIAS_B2B.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Modelo de Acordo *</label>
              <select value={form.modeloAcordo} onChange={e => set('modeloAcordo')(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white">
                <option value="SAVING_20">Negociar Saving (Success Fee 20%)</option>
                <option value="OPERACAO_1_5">Fechar Acordo (1.5% do Valor Total)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Qtd *</label>
              <input
                type="number" value={form.quantidade} placeholder="1"
                onChange={e => set('quantidade')(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Preço Atual (R$) *</label>
              <input
                value={form.baseline} placeholder="Ex: 3.50"
                onChange={e => set('baseline')(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Preço Alvo (R$)</label>
              <input
                value={form.preco_alvo} placeholder="Ex: 2.80"
                onChange={e => set('preco_alvo')(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
              Requisitos & Perfil do Negociador (Closer)
            </label>
            <textarea
              value={form.requisitosCloser}
              placeholder="Ex: Experiência prévia em negociação industrial de alto volume e capacidade de fechamento ágil..."
              onChange={e => set('requisitosCloser')(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white h-20 resize-none"
            />
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={form.visibilidade === 'PRIVADA'}
              onChange={e => set('visibilidade')(e.target.checked ? 'PRIVADA' : 'PUBLICA')}
              className="w-4 h-4 accent-emerald-500 cursor-pointer rounded"
            />
            <div>
              <p className="text-xs font-bold text-slate-900">Mesa Privada</p>
              <p className="text-[10px] text-slate-500">Restrita exclusivamente a Closers homologados no seu segmento.</p>
            </div>
          </div>

          {preview && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-1">ECONOMIA LÍQUIDA ESTIMADA PARA SUA EMPRESA</p>
              <p className="text-xl font-black text-emerald-600">{brl(preview.valor)} ({preview.pct}% de ganho bruto)</p>
            </div>
          )}

          {erroLocal && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">
              ⚠️ {erroLocal}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all">
            Cancelar
          </button>
          <button onClick={submit} disabled={salvando} className="flex-[2] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all shadow-md shadow-emerald-500/20">
            {salvando ? 'Abrindo...' : 'Abrir Mesa de Negociação →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalDetalhes({ mesa, onClose, onAprovar, aprovando }: {
  mesa: any
  onClose: () => void
  onAprovar: (id: string) => Promise<void>
  aprovando: boolean
}) {
  const sc          = statusCfg(mesa.status)
  const qty         = mesa.quantity || 1
  const targetUnit  = mesa.targetValue ?? 0
  const targetTotal = targetUnit * qty
  const saving      = mesa.savingValue ?? 0
  const pctSaving   = targetTotal > 0 ? ((saving / targetTotal) * 100).toFixed(1) : '0'

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">

        <div className="flex justify-between items-start pb-4 border-b border-slate-100">
          <div>
            <span className="font-mono text-xs font-extrabold text-emerald-600">
              #{mesa.id.slice(0, 8).toUpperCase()}
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-1">{mesa.title}</h2>
            <div className="mt-2">
              <Badge text={sc.label} bg={sc.bg} color={sc.color} border={sc.border} />
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-4 border border-slate-100">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">BASELINE TOTAL ({qty} UN)</p>
              <p className="text-lg font-extrabold text-slate-900">{brl(targetTotal)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">GANHO LÍQUIDO OBTIDO</p>
              <p className="text-lg font-black text-emerald-600">{saving > 0 ? `${brl(saving)} (${pctSaving}%)` : '—'}</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Data de Criação</span>
              <span className="font-bold text-slate-900">{new Date(mesa.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">Quantidade Solicitada</span>
              <span className="font-bold text-slate-900">{qty} unidades</span>
            </div>
          </div>

          {mesa.status === 'PENDING_APPROVAL' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-black text-emerald-900">
                🎉 Proposta aceita! Ganho pronto para homologação.
              </p>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Foi conquistada uma economia de <strong>{pctSaving}%</strong> ({brl(saving)}) para o orçamento da sua empresa.
              </p>
              <button
                onClick={() => onAprovar(mesa.id)}
                disabled={aprovando}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all shadow-md shadow-emerald-500/20"
              >
                {aprovando ? 'Homologando...' : '✓ Homologar e Confirmar Saving'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DashboardEmpresaPage() {
  const router = useRouter()
  const [user, setUser]               = useState<User | null>(null)
  const [empresaNome, setEmpresaNome] = useState('Minha Empresa B2B')
  const [mesas, setMesas]             = useState<any[]>([])
  const [carregando, setCarregando]   = useState(true)
  const [erroFetch, setErroFetch]     = useState('')
  const [modalNova, setModalNova]     = useState(false)
  const [salvando, setSalvando]       = useState(false)
  const [mesaDetalhe, setMesaDetalhe] = useState<any | null>(null)
  const [aprovando, setAprovando]     = useState(false)
  const [saindo, setSaindo]           = useState(false)

  const buscarDadosEmpresaEMesas = useCallback(async (userId: string) => {
    setErroFetch('')
    const [dealsRes, compRes] = await Promise.all([
      getDealsByUser(userId),
      getCompanyData(userId)
    ])
    if (dealsRes.success && dealsRes.data) {
      setMesas(dealsRes.data)
    } else {
      setErroFetch(dealsRes.error || 'Erro ao carregar mesas de negociação.')
    }
    if (compRes.success && compRes.organization?.name) {
      setEmpresaNome(compRes.organization.name)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!mounted) return
      if (!u) { router.replace('/login'); return }

      setUser(u)
      let orgId = u.user_metadata?.organizationId

      if (!orgId) {
        const companyName = u.user_metadata?.nome_completo
          ? `Empresa de ${u.user_metadata.nome_completo}`
          : 'Minha Empresa'

        const regRes = await registerCompanyOnDemand({
          userId: u.id,
          companyName,
        })
        if (regRes.success && regRes.organization?.id) {
          orgId = regRes.organization.id
        }
      }

      await buscarDadosEmpresaEMesas(u.id)
      if (mounted) setCarregando(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') router.replace('/login')
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [router, buscarDadosEmpresaEMesas])

  async function sair() {
    setSaindo(true)
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function criarMesa(form: FormNovaMesa) {
    if (!user) return
    setSalvando(true)
    try {
      const orgId = user.user_metadata?.organizationId || 'default-org-id'
      const targetUnit = parseFloat(form.baseline.replace(',', '.')) || 0
      const currentUnit = parseFloat(form.preco_alvo.replace(',', '.')) || 0
      const qty = parseInt(form.quantidade) || 1

      const res = await createDeal({
        title: form.produto.trim(),
        quantity: qty,
        targetValue: targetUnit,
        currentValue: currentUnit,
        organizationId: orgId,
        createdById: user.id,
      })

      if (!res.success) throw new Error(res.error)

      await buscarDadosEmpresaEMesas(user.id)
      setModalNova(false)
    } catch (err: unknown) {
      setErroFetch(err instanceof Error ? err.message : 'Erro ao criar mesa.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleAprovarMesa(mesaId: string) {
    if (!user) return
    setAprovando(true)
    try {
      const res = await aprovarSaving(mesaId)
      if (!res.success) throw new Error(res.error)

      await buscarDadosEmpresaEMesas(user.id)
      setMesaDetalhe(null)
    } catch (err: unknown) {
      setErroFetch(err instanceof Error ? err.message : 'Erro ao aprovar mesa.')
    } finally {
      setAprovando(false)
    }
  }

  const totalSaving   = mesas.reduce((s, m) => s + (m.savingValue ?? 0), 0)
  const totalBaseline = mesas.reduce((s, m) => s + ((m.targetValue ?? 0) * (m.quantity || 1)), 0)
  const mesasAtivas   = mesas.filter(m => m.status === 'IN_NEGOTIATION').length
  const mesasAgAprv   = mesas.filter(m => m.status === 'PENDING_APPROVAL').length
  const mesasConc     = mesas.filter(m => m.status === 'APPROVED').length

  if (carregando) return <Spinner />

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">

      {/* ── SIDEBAR LATERAL ESQUERDA FIXA ───────────────────── */}
      <aside className="w-[280px] bg-slate-900 border-r border-slate-800 flex flex-col justify-between fixed top-0 bottom-0 left-0 z-50 shadow-2xl">
        <div className="flex flex-col h-[calc(100vh-68px)]">
          
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

          <div className="p-4 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
            <div>
              <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                PRODUTOS B2B
              </p>

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
                      <span className="text-[9px] bg-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded border border-slate-700/60">
                        EM BREVE
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

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

        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex-shrink-0 h-[68px]">
          <div className="flex items-center justify-between gap-2">
            <div className="overflow-hidden">
              <p className="text-xs font-extrabold text-white truncate">{empresaNome}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={sair}
              disabled={saindo}
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
            <div className="flex items-center gap-2 mb-1">
              <Link href="/dashboard" className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                ← Voltar ao Hub Central
              </Link>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {empresaNome}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Painel Corporativo de Gestão de Demanda B2B
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span>🛡️</span>
              <span>Nome da Empresa Protegido</span>
            </div>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="p-8 max-w-7xl mx-auto w-full space-y-8">

          {mesasAgAprv > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-3 shadow-sm">
              <span className="text-xl">⏳</span>
              <span>Você possui <strong>{mesasAgAprv} mesa(s)</strong> com propostas pendentes de homologação.</span>
            </div>
          )}

          {/* Grid de Métricas com Foco em Ganhos */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard 
              label="SAVINGS & GANHOS ACUMULADOS" 
              value={brl(totalSaving)} 
              sub="economia bruta gerada nas compras" 
              accent 
              icon="💰"
            />
            <MetricCard 
              label="MESAS ATIVAS" 
              value={String(mesasAtivas)} 
              sub="em negociação com Closers" 
              icon="🤝"
            />
            <MetricCard 
              label="AGUARDANDO HOMOLOGAÇÃO" 
              value={String(mesasAgAprv)} 
              sub="propostas prontas" 
              icon="⏳"
            />
            <MetricCard 
              label="MESAS CONCLUÍDAS" 
              value={String(mesasConc)} 
              sub="savings confirmados" 
              icon="✅"
            />
          </div>

          {/* Gráfico de Evolução Temporal */}
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                Evolução Temporal de Savings Gerados
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhamento mensal do volume acumulado de economia por rodadas de negociação
              </p>
            </div>

            <div className="h-44 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-end justify-around p-4">
              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set'].map((mes, idx) => {
                const altura = Math.min(25 + idx * 12, 120)
                return (
                  <div key={mes} className="flex flex-col items-center gap-2 group">
                    <div 
                      className="w-8 rounded-t-lg bg-emerald-500/80 group-hover:bg-emerald-500 transition-all shadow-sm"
                      style={{ height: `${altura}px` }}
                    />
                    <span className="text-[10px] font-bold text-slate-400">{mes}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {erroFetch && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{erroFetch}</span>
            </div>
          )}

          {/* Cabeçalho da Tabela e Ação */}
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
              Suas Mesas de Negociação
            </h3>
            <button
              onClick={() => setModalNova(true)}
              className="py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-[0.99] flex items-center gap-2"
            >
              <span className="text-base leading-none">+</span>
              <span>Abrir Nova Mesa</span>
            </button>
          </div>

          {/* Vitrine de Mesas */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
              <span>Código</span>
              <span className="col-span-2">Produto / Insumo</span>
              <span>Baseline</span>
              <span>Ganho Líquido</span>
              <span>Status</span>
              <span className="text-right">Ação</span>
            </div>

            <div className="divide-y divide-slate-100">
              {mesas.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="text-4xl mb-3 block">🏢</span>
                  <p className="text-sm font-bold text-slate-800">Nenhuma mesa aberta para a empresa</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Abra sua primeira demanda de compras para acionar os Closers.</p>
                  <button onClick={() => setModalNova(true)} className="py-2.5 px-5 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20">
                    + Criar Primeira Mesa
                  </button>
                </div>
              ) : (
                mesas.map((mesa) => {
                  const sc  = statusCfg(mesa.status)
                  const qty = mesa.quantity || 1
                  return (
                    <div
                      key={mesa.id}
                      onClick={() => setMesaDetalhe(mesa)}
                      className="grid grid-cols-7 gap-4 px-6 py-4 items-center hover:bg-slate-50/80 transition-colors text-xs cursor-pointer"
                    >
                      <span className="font-mono font-bold text-emerald-600">
                        #{mesa.id.slice(0, 8).toUpperCase()}
                      </span>

                      <div className="col-span-2">
                        <p className="font-bold text-slate-900 truncate">{mesa.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{qty} unidade(s)</p>
                      </div>

                      <span className="font-semibold text-slate-700">
                        {brl((mesa.targetValue ?? 0) * qty)}
                      </span>

                      <span className={`font-extrabold ${(mesa.savingValue ?? 0) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {(mesa.savingValue ?? 0) > 0 ? brl(mesa.savingValue) : '—'}
                      </span>

                      <div>
                        <Badge text={sc.label} bg={sc.bg} color={sc.color} border={sc.border} />
                      </div>

                      <div className="text-right">
                        <button
                          onClick={e => { e.stopPropagation(); setMesaDetalhe(mesa) }}
                          className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-700 font-bold hover:border-emerald-500 hover:text-emerald-600 transition-all text-xs"
                        >
                          Ver Detalhes →
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </main>
      </div>

      {modalNova && <ModalNovaMesa onClose={() => setModalNova(false)} onSalvar={criarMesa} salvando={salvando} />}
      {mesaDetalhe && (
        <ModalDetalhes
          mesa={mesaDetalhe}
          onClose={() => setMesaDetalhe(null)}
          onAprovar={handleAprovarMesa}
          aprovando={aprovando}
        />
      )}

    </div>
  )
}