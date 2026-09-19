'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { getAllDeals, submeterProposta } from '@/app/actions/deals'

// ── Paleta ────────────────────────────────────────────────────
const NAVY   = '#0F172A'
const E      = '#10B981'
const MUTED  = '#64748B'
const BORDER = '#E2E8F0'
const SLATE  = '#F8FAFC'
const WHITE  = '#FFFFFF'
const AMBER  = '#F59E0B'
const RED    = '#EF4444'

// ── Helpers ───────────────────────────────────────────────────
const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const calcFee      = (saving: number) => saving * 0.20
const calcComissao = (saving: number) => saving * 0.20 * 0.70

function statusCfg(s: string) {
  const m: Record<string, { bg: string; color: string }> = {
    'IN_NEGOTIATION':   { bg: '#DBEAFE', color: '#1D4ED8' },
    'PENDING_APPROVAL': { bg: '#FEF9C3', color: '#854D0E' },
    'APPROVED':         { bg: '#DCFCE7', color: '#166534' },
    'REJECTED':         { bg: '#FEE2E2', color: '#991B1B' },
    'DRAFT':            { bg: SLATE,     color: MUTED },
  }
  return m[s] || { bg: SLATE, color: MUTED }
}

function labelStatus(s: string) {
  const m: Record<string, string> = {
    'IN_NEGOTIATION':   'Em Negociação',
    'PENDING_APPROVAL': 'Aguardando Aprovação',
    'APPROVED':         'Concluída',
    'REJECTED':         'Cancelada',
    'DRAFT':            'Rascunho',
  }
  return m[s] || s
}

// ── Sub-componentes ───────────────────────────────────────────
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
      borderRadius: 12, padding: '1.25rem 1.5rem', flex: 1, minWidth: 150,
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: accent ? accentColor : MUTED, letterSpacing: '0.07em', margin: '0 0 6px' }}>
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
          width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: AMBER,
          borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: 13, color: MUTED }}>Carregando cockpit...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}

// ── Modal Enviar Proposta ──────────────────────────────────────
function ModalProposta({ mesa, onClose, onEnviar, enviando }: {
  mesa: any
  onClose: () => void
  onEnviar: (mesaId: string, dados: { preco: number; fornecedor: string }) => Promise<void>
  enviando: boolean
}) {
  const [preco, setPreco]         = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [erroLocal, setErroLocal] = useState('')

  const target = mesa.targetValue ?? 0

  const preview = (() => {
    const p = parseFloat(preco.replace(',', '.'))
    if (!p || p >= target) return null
    const saving    = target - p
    const fee       = calcFee(saving)
    const comissao  = calcComissao(saving)
    const pct       = ((saving / target) * 100).toFixed(1)
    return { saving, fee, comissao, pct, valido: (saving / target) >= 0.03 }
  })()

  async function submit() {
    const p = parseFloat(preco.replace(',', '.'))
    if (!p || p <= 0)       { setErroLocal('Informe o preço negociado.'); return }
    if (p >= target)        { setErroLocal('O preço deve ser menor que o baseline.'); return }
    if (!fornecedor.trim()) { setErroLocal('Informe o nome do fornecedor.'); return }
    if (preview && !preview.valido) { setErroLocal('O saving mínimo para acionar o fee é 3%. Negocie um preço menor.'); return }
    setErroLocal('')
    await onEnviar(mesa.id, { preco: p, fornecedor: fornecedor.trim() })
  }

  const inputStyle = {
    width: '100%', padding: '10px 13px', background: SLATE,
    border: `1px solid ${BORDER}`, borderRadius: 8, color: NAVY,
    fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: WHITE, borderRadius: 16, width: '100%', maxWidth: 500, padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: '0 0 4px' }}>Enviar Proposta</h2>
            <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{mesa.title}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: MUTED, padding: 0 }}>✕</button>
        </div>

        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#991B1B', fontWeight: 700 }}>BASELINE DO CLIENTE</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: RED }}>{brl(target)}</span>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Preço negociado com o fornecedor (R$) *
          </label>
          <input
            value={preco} placeholder="Ex: 38500"
            onChange={e => setPreco(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Nome do fornecedor alternativo *
          </label>
          <input
            value={fornecedor} placeholder="Ex: Fornecedora Sul Embalagens Ltda"
            onChange={e => setFornecedor(e.target.value)}
            style={inputStyle}
          />
        </div>

        {preview && (
          <div style={{
            background: preview.valido ? '#FFFBEB' : '#FEF2F2',
            border: `1px solid ${preview.valido ? '#FCD34D' : '#FECACA'}`,
            borderRadius: 10, padding: '1rem', marginBottom: '1.25rem',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: preview.valido ? '#92400E' : '#991B1B', letterSpacing: '0.07em', margin: '0 0 8px' }}>
              {preview.valido ? 'SUA COMISSÃO ESTIMADA' : '⚠️ SAVING ABAIXO DO MÍNIMO (3%)'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: 'Saving',          value: `${brl(preview.saving)} (${preview.pct}%)`, color: E },
                { label: 'Fee (20%)',       value: brl(preview.fee),                           color: NAVY },
                { label: 'Sua comissão (70%)', value: brl(preview.comissao),                   color: AMBER },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 3px' }}>{label}</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {erroLocal && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem' }}>
            <p style={{ fontSize: 13, color: '#DC2626', margin: 0, fontWeight: 500 }}>⚠️ {erroLocal}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, color: MUTED, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={enviando} style={{
            flex: 2, padding: '12px',
            background: enviando ? '#FDE68A' : AMBER,
            border: 'none', borderRadius: 8,
            color: enviando ? '#92400E' : NAVY,
            fontSize: 14, fontWeight: 700, cursor: enviando ? 'wait' : 'pointer',
          }}>
            {enviando ? 'Enviando...' : '🎯 Enviar Proposta ao Cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Detalhes (visão closer) ─────────────────────────────
function ModalDetalhes({ mesa, onClose, onEnviarProposta }: {
  mesa: any
  onClose: () => void
  onEnviarProposta: (mesa: any) => void
}) {
  const sc         = statusCfg(mesa.status)
  const saving     = mesa.savingValue ?? 0
  const target     = mesa.targetValue ?? 0
  const comissao   = calcComissao(saving)
  const pctSaving  = target > 0 ? ((saving / target) * 100).toFixed(1) : '0'
  const podeEnviar = mesa.status === 'IN_NEGOTIATION'

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: WHITE, borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>

        <div style={{ padding: '1.5rem 2rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: '0.07em', margin: '0 0 4px' }}>
              #{mesa.id.slice(0, 8).toUpperCase()}
            </p>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: NAVY, margin: '0 0 8px', lineHeight: 1.3 }}>{mesa.title}</h2>
            <Badge text={labelStatus(mesa.status)} bg={sc.bg} color={sc.color} />
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: MUTED, padding: 0, flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            {[
              { label: 'BASELINE',            value: brl(target),                                            color: NAVY  },
              { label: 'SAVING GERADO',       value: saving > 0 ? `${brl(saving)} (${pctSaving}%)` : '—',     color: E },
              { label: 'SUA COMISSÃO (70%)',  value: saving > 0 ? brl(comissao) : '—',                       color: AMBER },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 4px' }}>{label}</p>
                <p style={{ fontSize: 17, fontWeight: 800, color, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          <div style={{ background: SLATE, borderRadius: 10, padding: '1rem' }}>
            {[
              { label: 'Aberta em', value: new Date(mesa.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) },
              { label: 'Empresa',   value: mesa.organization?.name || 'Cliente B2B' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                <span style={{ color: MUTED }}>{label}</span>
                <span style={{ color: NAVY, fontWeight: 600, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
              </div>
            ))}
          </div>

          {podeEnviar && (
            <button
              onClick={() => { onClose(); onEnviarProposta(mesa) }}
              style={{
                width: '100%', padding: '13px', background: AMBER,
                border: 'none', borderRadius: 8, color: NAVY,
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              🎯 {mesa.currentValue ? 'Atualizar Proposta' : 'Enviar Proposta ao Cliente'}
            </button>
          )}

          {mesa.status === 'PENDING_APPROVAL' && (
            <div style={{ background: '#FEF9C3', border: '1px solid #FCD34D', borderRadius: 8, padding: '0.9rem', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#92400E', margin: 0, fontWeight: 600 }}>
                ⏳ Proposta enviada — aguardando aprovação do cliente para liberar sua comissão.
              </p>
            </div>
          )}

          {mesa.status === 'APPROVED' && (
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '0.9rem', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#065F46', margin: 0, fontWeight: 700 }}>
                ✅ Mesa concluída! Comissão de {brl(comissao)} liberada para saque.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard Closer ──────────────────────────────────────────
export default function DashboardCloserPage() {
  const router = useRouter()
  const [user, setUser]                 = useState<User | null>(null)
  const [mesas, setMesas]               = useState<any[]>([])
  const [carregando, setCarregando]     = useState(true)
  const [erroFetch, setErroFetch]       = useState('')
  const [mesaDetalhe, setMesaDetalhe]   = useState<any | null>(null)
  const [mesaProposta, setMesaProposta] = useState<any | null>(null)
  const [enviando, setEnviando]         = useState(false)
  const [saindo, setSaindo]             = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<string>('Todas')

  const buscarMesas = useCallback(async () => {
    setErroFetch('')
    const res = await getAllDeals()
    if (res.success && res.data) {
      setMesas(res.data)
    } else {
      setErroFetch(res.error || 'Erro ao carregar mesas.')
    }
  }, [])

  useEffect(() => {
    let mounted = true
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!mounted) return
      if (!u) { router.replace('/login'); return }

      const role = u.user_metadata?.role as string | undefined
      if (role === 'empresa') {
        router.replace('/dashboard/empresa')
        return
      }

      setUser(u)
      await buscarMesas()
      if (mounted) setCarregando(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') router.replace('/login')
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [router, buscarMesas])

  async function sair() {
    setSaindo(true)
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function enviarProposta(mesaId: string, dados: { preco: number; fornecedor: string }) {
    if (!user) return
    setEnviando(true)
    try {
      const res = await submeterProposta(mesaId, dados.preco)
      if (!res.success) throw new Error(res.error)

      await buscarMesas()
      setMesaProposta(null)
    } catch (err: unknown) {
      setErroFetch(err instanceof Error ? err.message : 'Erro ao enviar proposta.')
    } finally {
      setEnviando(false)
    }
  }

  const totalComissoes   = mesas.reduce((s, m) => s + calcComissao(m.savingValue ?? 0), 0)
  const comissoesLiberadas = mesas.filter(m => m.status === 'APPROVED').reduce((s, m) => s + calcComissao(m.savingValue ?? 0), 0)
  const mesasAtivas      = mesas.filter(m => m.status === 'IN_NEGOTIATION').length
  const mesasPendentes   = mesas.filter(m => m.status === 'PENDING_APPROVAL').length
  const mesasConc        = mesas.filter(m => m.status === 'APPROVED').length
  const taxaFechamento   = mesas.length > 0 ? ((mesasConc / mesas.length) * 100).toFixed(0) : '0'

  const nomeUsuario = (user?.user_metadata?.nome_completo as string | undefined)?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Closer'

  const mesasFiltradas = filtroStatus === 'Todas'
    ? mesas
    : mesas.filter(m => m.status === filtroStatus)

  if (carregando) return <Spinner />

  return (
    <div style={{ minHeight: '100vh', background: SLATE, fontFamily: 'Inter, system-ui, sans-serif' }}>

      <header style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: '0.9rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.png" alt="DeuAcordo.com" style={{ height: 34, width: 'auto', objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 17, color: NAVY, letterSpacing: '-0.02em' }}>
            DeuAcordo<span style={{ color: E }}>.com</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: '#FFFBEB', color: '#92400E', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: '1px solid #FCD34D' }}>
            🎯 Closer
          </div>
          <div style={{ textAlign: 'right', marginLeft: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: 0 }}>{nomeUsuario}</p>
            <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{user?.email}</p>
          </div>
          <button onClick={sair} disabled={saindo} style={{
            fontSize: 13, fontWeight: 700, color: RED, background: '#FEF2F2',
            border: '1px solid #FECACA', padding: '7px 14px', borderRadius: 7,
            cursor: saindo ? 'wait' : 'pointer', marginLeft: 8,
          }}>
            {saindo ? 'Saindo...' : 'Sair →'}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 23, fontWeight: 800, color: NAVY, margin: '0 0 3px' }}>
            Cockpit do Closer
          </h1>
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
            Gerencie suas mesas, envie propostas e acompanhe suas comissões.
          </p>
        </div>

        {comissoesLiberadas > 0 && (
          <div style={{
            background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 10,
            padding: '0.9rem 1.25rem', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>💰</span>
            <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>
              <strong>{brl(comissoesLiberadas)}</strong> em comissões disponíveis para saque.
              {' '}Mesas concluídas: {mesasConc}.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <MetricCard
            label="COMISSÕES TOTAIS ESTIMADAS"
            value={brl(totalComissoes)}
            sub="70% do fee sobre savings"
            accent accentColor={AMBER}
          />
          <MetricCard label="LIBERADAS PARA SAQUE"   value={brl(comissoesLiberadas)} sub="mesas concluídas" />
          <MetricCard label="MESAS EM NEGOCIAÇÃO"    value={String(mesasAtivas)}     sub="em andamento" />
          <MetricCard label="AGUARDANDO APROVAÇÃO"   value={String(mesasPendentes)}  sub="proposta enviada" />
          <MetricCard label="TAXA DE FECHAMENTO"     value={`${taxaFechamento}%`}    sub={`${mesasConc} de ${mesas.length} mesas`} />
        </div>

        {erroFetch && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>⚠️</span>
            <p style={{ fontSize: 13, color: '#DC2626', margin: 0, fontWeight: 500 }}>{erroFetch}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'Todas', label: 'Todas' },
              { id: 'IN_NEGOTIATION', label: 'Em Negociação' },
              { id: 'PENDING_APPROVAL', label: 'Aguardando Aprovação' },
              { id: 'APPROVED', label: 'Concluída' },
              { id: 'REJECTED', label: 'Cancelada' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltroStatus(f.id)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: `1px solid ${filtroStatus === f.id ? AMBER : BORDER}`,
                  background: filtroStatus === f.id ? '#FFFBEB' : WHITE,
                  color: filtroStatus === f.id ? '#92400E' : MUTED,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {f.label} {f.id !== 'Todas' && `(${mesas.filter(m => m.status === f.id).length})`}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: 0 }}>
            {mesasFiltradas.length} mesa{mesasFiltradas.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 130px 150px 165px 130px', padding: '10px 16px', background: SLATE, borderBottom: `1px solid ${BORDER}` }}>
            {['CÓDIGO', 'PRODUTO', 'BASELINE', 'COMISSÃO EST.', 'STATUS', 'AÇÃO'].map(c => (
              <span key={c} style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.07em' }}>{c}</span>
            ))}
          </div>

          {mesasFiltradas.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🎯</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '0 0 6px' }}>
                {mesas.length === 0 ? 'Nenhuma mesa atribuída ainda' : 'Nenhuma mesa com esse filtro'}
              </p>
            </div>
          )}

          {mesasFiltradas.map((mesa, i) => {
            const sc       = statusCfg(mesa.status)
            const comissao = calcComissao(mesa.savingValue ?? 0)
            const podeEnviar = mesa.status === 'IN_NEGOTIATION'

            return (
              <div
                key={mesa.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 130px 150px 165px 130px',
                  padding: '14px 16px',
                  borderBottom: i === mesasFiltradas.length - 1 ? 'none' : `1px solid ${BORDER}`,
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
                onMouseLeave={e => (e.currentTarget.style.background = WHITE)}
                onClick={() => setMesaDetalhe(mesa)}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: AMBER, fontFamily: 'monospace' }}>
                  #{mesa.id.slice(0, 8).toUpperCase()}
                </span>

                <span style={{ fontSize: 13, color: NAVY, fontWeight: 600, paddingRight: 12, lineHeight: 1.35 }}>
                  {mesa.title}
                </span>

                <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
                  {brl(mesa.targetValue ?? 0)}
                </span>

                <span style={{ fontSize: 13, fontWeight: 800, color: comissao > 0 ? AMBER : MUTED }}>
                  {comissao > 0 ? brl(comissao) : '—'}
                </span>

                <Badge text={labelStatus(mesa.status)} bg={sc.bg} color={sc.color} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setMesaDetalhe(mesa) }}
                    style={{
                      padding: '5px 10px', background: 'transparent',
                      border: `1.5px solid ${BORDER}`, borderRadius: 6,
                      fontSize: 11, fontWeight: 700, color: NAVY, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Ver Detalhes →
                  </button>
                  {podeEnviar && (
                    <button
                      onClick={e => { e.stopPropagation(); setMesaProposta(mesa) }}
                      style={{
                        padding: '5px 10px', background: AMBER,
                        border: 'none', borderRadius: 6,
                        fontSize: 11, fontWeight: 700, color: NAVY, cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      🎯 Proposta
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {mesaDetalhe && (
        <ModalDetalhes
          mesa={mesaDetalhe}
          onClose={() => setMesaDetalhe(null)}
          onEnviarProposta={mesa => { setMesaDetalhe(null); setMesaProposta(mesa) }}
        />
      )}
      {mesaProposta && (
        <ModalProposta
          mesa={mesaProposta}
          onClose={() => setMesaProposta(null)}
          onEnviar={enviarProposta}
          enviando={enviando}
        />
      )}

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  )
}