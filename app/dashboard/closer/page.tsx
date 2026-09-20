'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { getAllDeals, submeterProposta } from '@/app/actions/deals'
import { activateCloserProfileOnDemand } from '@/app/actions/user'

// ── Paleta Executiva DeuAcordo ──────────────────────────────
const NAVY   = '#0F172A'
const E      = '#10B981'
const MUTED  = '#64748B'
const BORDER = '#E2E8F0'
const SLATE  = '#F8FAFC'
const WHITE  = '#FFFFFF'
const AMBER  = '#F59E0B'
const RED    = '#EF4444'

// ── Lista Completa de Produtos da Plataforma ────────────────
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

// ── Helpers de Formatação e Regras do Fee ────────────────────
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
      borderRadius: 12, padding: '1.25rem 1.5rem', flex: 1, minWidth: 160,
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
          width: 38, height: 38, border: `3px solid ${BORDER}`, borderTopColor: AMBER,
          borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>Carregando Cockpit do Closer...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}

// ── Modal Enviar Proposta ─────────────────────────────────────
function ModalProposta({ mesa, onClose, onEnviar, enviando }: {
  mesa: any
  onClose: () => void
  onEnviar: (mesaId: string, dados: { precoUnitario: number; fornecedor: string }) => Promise<void>
  enviando: boolean
}) {
  const [preco, setPreco]           = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [erroLocal, setErroLocal]   = useState('')

  const qty = mesa.quantity || 1
  const targetUnit = mesa.targetValue ?? 0
  const targetTotal = targetUnit * qty

  const preview = (() => {
    const pUnit = parseFloat(preco.replace(',', '.'))
    if (!pUnit || pUnit >= targetUnit) return null

    const savingTotal = (targetUnit - pUnit) * qty
    const fee = calcFee(savingTotal)
    const comissao = calcComissao(savingTotal)
    const pct = (((targetUnit - pUnit) / targetUnit) * 100).toFixed(1)

    return { savingTotal, fee, comissao, pct, valido: (savingTotal / targetTotal) >= 0.03 }
  })()

  async function submit() {
    const pUnit = parseFloat(preco.replace(',', '.'))
    if (!pUnit || pUnit <= 0) { setErroLocal('Informe o preço unitário negociado.'); return }
    if (pUnit >= targetUnit)  { setErroLocal('O preço unitário deve ser menor que o pago atualmente.'); return }
    if (preview && !preview.valido) { setErroLocal('O saving mínimo exigido para acionar a mesa é de 3%. Negocie um preço menor.'); return }
    
    setErroLocal('')
    await onEnviar(mesa.id, { precoUnitario: pUnit, fornecedor: fornecedor.trim() })
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
      <div style={{ background: WHITE, borderRadius: 16, width: '100%', maxWidth: 520, padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: '0 0 4px' }}>Enviar Proposta Comercial</h2>
            <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Item: {mesa.title} ({qty} un)</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: MUTED, padding: 0 }}>✕</button>
        </div>

        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 10, color: '#991B1B', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Baseline do Cliente ({qty} un)</span>
            <span style={{ fontSize: 12, color: '#991B1B' }}>R$ {targetUnit.toFixed(2)} / un</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: RED }}>{brl(targetTotal)}</span>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Preço UNITÁRIO negociado com o fornecedor (R$) *
          </label>
          <input
            value={preco} placeholder={`Menor que R$ ${targetUnit.toFixed(2)}`}
            onChange={e => setPreco(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Fornecedor Parceiro Alternativo
          </label>
          <input
            value={fornecedor} placeholder="Ex: Distribuidora Sul Embalagens Ltda"
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
              {preview.valido ? 'SUA COMISSÃO ESTIMADA (70%)' : '⚠️ SAVING ABAIXO DO MÍNIMO (3%)'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: 'Saving Total',       value: `${brl(preview.savingTotal)} (${preview.pct}%)`, color: E },
                { label: 'Fee Plataforma',     value: brl(preview.fee),                                color: NAVY },
                { label: 'Sua Comissão',       value: brl(preview.comissao),                           color: AMBER },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 3px' }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color, margin: 0 }}>{value}</p>
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

// ── Modal Detalhes com Perfil Anônimo Qualificado ─────────────
function ModalDetalhes({ mesa, onClose, onEnviarProposta }: {
  mesa: any
  onClose: () => void
  onEnviarProposta: (mesa: any) => void
}) {
  const sc         = statusCfg(mesa.status)
  const qty        = mesa.quantity || 1
  const saving     = mesa.savingValue ?? 0
  const targetUnit = mesa.targetValue ?? 0
  const targetTotal = targetUnit * qty
  const comissao   = calcComissao(saving)
  const pctSaving  = targetTotal > 0 ? ((saving / targetTotal) * 100).toFixed(1) : '0'
  const podeEnviar = mesa.status === 'IN_NEGOTIATION'

  const org = mesa.organization || {}

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: WHITE, borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>

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

        <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Panorama de Qualificação da Empresa (Visão Anônima para o Closer) */}
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#065F46', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                🔒 DEMANDANTE (ANÔNIMO QUALIFICADO)
              </p>
              <span style={{ fontSize: 10, background: '#D1FAE5', color: '#047857', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>
                Perfil Verificado
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: 12 }}>
              <div><span style={{ color: MUTED }}>Segmento:</span> <strong style={{ color: NAVY }}>{org.segmentoEmpresa || 'Comércio'}</strong></div>
              <div><span style={{ color: MUTED }}>Faturamento/Ano:</span> <strong style={{ color: NAVY }}>{org.faturamentoAnual || 'Confidencial'}</strong></div>
              <div><span style={{ color: MUTED }}>Compras/Ano:</span> <strong style={{ color: NAVY }}>{org.gastoComprasAno || 'Confidencial'}</strong></div>
              <div><span style={{ color: MUTED }}>Mercado:</span> <strong style={{ color: NAVY }}>{org.escopoMercado || 'Nacional'}</strong></div>
              {org.categoriasPraticadas && (
                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: MUTED }}>Categorias:</span> <strong style={{ color: NAVY }}>{org.categoriasPraticadas}</strong></div>
              )}
            </div>
          </div>

          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            {[
              { label: `BASELINE (${qty} UN)`, value: brl(targetTotal), color: NAVY },
              { label: 'SAVING GERADO', value: saving > 0 ? `${brl(saving)} (${pctSaving}%)` : '—', color: E },
              { label: 'SUA COMISSÃO (70%)', value: saving > 0 ? brl(comissao) : '—', color: AMBER },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 4px' }}>{label}</p>
                <p style={{ fontSize: 16, fontWeight: 800, color, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          <div style={{ background: SLATE, borderRadius: 10, padding: '1rem' }}>
            {[
              { label: 'Aberta em', value: new Date(mesa.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) },
              { label: 'Quantidade solicitada', value: `${qty} unidades` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                <span style={{ color: MUTED }}>{label}</span>
                <span style={{ color: NAVY, fontWeight: 600 }}>{value}</span>
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

        </div>
      </div>
    </div>
  )
}

// ── Dashboard Principal do Closer ──────────────────────────────
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
      setErroFetch(res.error || 'Erro ao carregar mesas de negociação.')
    }
  }, [])

  useEffect(() => {
    let mounted = true
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!mounted) return
      if (!u) { router.replace('/login'); return }

      await activateCloserProfileOnDemand(u.id)

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

  async function enviarProposta(mesaId: string, dados: { precoUnitario: number; fornecedor: string }) {
    if (!user) return
    setEnviando(true)
    try {
      const res = await submeterProposta(mesaId, dados.precoUnitario)
      if (!res.success) throw new Error(res.error)

      await buscarMesas()
      setMesaProposta(null)
    } catch (err: unknown) {
      setErroFetch(err instanceof Error ? err.message : 'Erro ao enviar proposta.')
    } finally {
      setEnviando(false)
    }
  }

  const totalComissoes     = mesas.reduce((s, m) => s + calcComissao(m.savingValue ?? 0), 0)
  const comissoesLiberadas = mesas.filter(m => m.status === 'APPROVED').reduce((s, m) => s + calcComissao(m.savingValue ?? 0), 0)
  const mesasAtivas        = mesas.filter(m => m.status === 'IN_NEGOTIATION').length
  const mesasPendentes     = mesas.filter(m => m.status === 'PENDING_APPROVAL').length
  const mesasConc          = mesas.filter(m => m.status === 'APPROVED').length
  const taxaFechamento     = mesas.length > 0 ? ((mesasConc / mesas.length) * 100).toFixed(0) : '0'

  const nomeUsuario = (user?.user_metadata?.nome_completo as string | undefined)?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Closer'

  const mesasFiltradas = filtroStatus === 'Todas'
    ? mesas
    : mesas.filter(m => m.status === filtroStatus)

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
            <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 8 }}>
              PRODUTOS B2B DEUACORDO
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {ECOSSISTEMA_PRODUTOS.map(p => (
                <div
                  key={p.id}
                  title={p.desc}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 11px',
                    borderRadius: 8,
                    background: p.active ? '#ECFDF5' : 'transparent',
                    border: `1px solid ${p.active ? '#A7F3D0' : 'transparent'}`,
                    color: p.active ? '#065F46' : NAVY,
                    fontSize: 13,
                    fontWeight: p.active ? 700 : 500,
                    opacity: p.active ? 1 : 0.7,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Link href="/dashboard" style={{ fontSize: 12, fontWeight: 600, color: MUTED, textDecoration: 'none' }}>
                ← Voltar para o Dashboard Hub
              </Link>
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: 0 }}>
              Cockpit do Closer
            </h1>
            <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>
              Assuma demandas, envie propostas e receba 70% de comissão sobre cada saving homologado
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ background: '#FFFBEB', color: '#92400E', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: '1px solid #FCD34D' }}>
              🎯 Cockpit do Closer
            </span>
          </div>
        </header>

        <main style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

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

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 180px 100px 130px 140px 120px', padding: '10px 16px', background: SLATE, borderBottom: `1px solid ${BORDER}` }}>
              {['CÓDIGO', 'PRODUTO', 'DEMANDANTE (ANÔNIMO)', 'QTD', 'BASELINE', 'COMISSÃO EST.', 'AÇÃO'].map(c => (
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
              const qty        = mesa.quantity || 1
              const targetUnit = mesa.targetValue ?? 0
              const comissao   = calcComissao(mesa.savingValue ?? 0)
              const podeEnviar = mesa.status === 'IN_NEGOTIATION'
              const org        = mesa.organization || {}

              return (
                <div
                  key={mesa.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr 180px 100px 130px 140px 120px',
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

                  {/* Badge de Empresa Anônima para o Closer */}
                  <div>
                    <span style={{ fontSize: 11, background: '#F1F5F9', color: NAVY, fontWeight: 700, padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
                      🏢 {org.segmentoEmpresa || 'Empresa B2B'}
                    </span>
                  </div>

                  <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>
                    {qty} un
                  </span>

                  <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
                    {brl(targetUnit * qty)}
                  </span>

                  <span style={{ fontSize: 13, fontWeight: 800, color: comissao > 0 ? AMBER : MUTED }}>
                    {comissao > 0 ? brl(comissao) : '—'}
                  </span>

                  <div style={{ display: 'flex', gap: 4 }}>
                    {podeEnviar && (
                      <button
                        onClick={e => { e.stopPropagation(); setMesaProposta(mesa) }}
                        style={{
                          padding: '6px 12px', background: AMBER,
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
      </div>

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