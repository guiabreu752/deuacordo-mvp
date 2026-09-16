'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// ── Paleta ────────────────────────────────────────────────────
const NAVY   = '#0F172A'
const E      = '#10B981'
const MUTED  = '#64748B'
const BORDER = '#E2E8F0'
const SLATE  = '#F8FAFC'
const WHITE  = '#FFFFFF'
const AMBER  = '#F59E0B'
const RED    = '#EF4444'

// ── Tipos ─────────────────────────────────────────────────────
type Role = 'empresa' | 'closer'

type StatusMesa =
  | 'Em Negociação'
  | 'Aguardando Aprovação'
  | 'Concluída'
  | 'Cancelada'

// Espelha exatamente as colunas da tabela Supabase
interface Mesa {
  id: string
  criado_em: string
  user_id: string
  produto: string
  baseline: number
  saving: number
  preco_proposto: number | null
  prazo_total: number
  dias_restantes: number
  status: StatusMesa
  fornecedor_atual: string
  fornecedor_proposto: string
  criado_por_role: Role
}

interface FormNovaMesa {
  produto: string
  baseline: string
  preco_alvo: string
  prazo: string
}

// ── Helpers ───────────────────────────────────────────────────
const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const calcFee      = (saving: number) => saving * 0.20
const calcComissao = (saving: number) => saving * 0.20 * 0.70

function statusCfg(s: StatusMesa) {
  const m: Record<StatusMesa, { bg: string; color: string }> = {
    'Em Negociação':        { bg: '#DBEAFE', color: '#1D4ED8' },
    'Aguardando Aprovação': { bg: '#FEF9C3', color: '#854D0E' },
    'Concluída':            { bg: '#DCFCE7', color: '#166534' },
    'Cancelada':            { bg: '#FEE2E2', color: '#991B1B' },
  }
  return m[s]
}

function urgenciaCfg(dias: number, status: StatusMesa) {
  if (status === 'Concluída')  return { bg: '#DCFCE7', color: '#166534', label: 'Concluída' }
  if (status === 'Cancelada')  return { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelada' }
  if (dias <= 0)               return { bg: '#FEE2E2', color: '#991B1B', label: 'Vencida' }
  if (dias <= 3)               return { bg: '#FEE2E2', color: '#991B1B', label: `${dias}d rest.` }
  if (dias <= 7)               return { bg: '#FEF9C3', color: '#854D0E', label: `${dias}d rest.` }
  return                              { bg: SLATE,     color: MUTED,     label: `${dias}d rest.` }
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

function MetricCard({ label, value, sub, accent = false }: {
  label: string; value: string; sub?: string; accent?: boolean
}) {
  return (
    <div style={{
      background: WHITE,
      border: `1.5px solid ${accent ? E : BORDER}`,
      borderRadius: 12, padding: '1.25rem 1.5rem',
      flex: 1, minWidth: 150,
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: accent ? E : MUTED, letterSpacing: '0.07em', margin: '0 0 6px' }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 800, color: accent ? E : NAVY, margin: '0 0 3px', letterSpacing: '-0.02em' }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{sub}</p>}
    </div>
  )
}

function Spinner({ fullPage = false }: { fullPage?: boolean }) {
  const inner = (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 36, height: 36, border: `3px solid ${BORDER}`,
        borderTopColor: E, borderRadius: '50%',
        margin: '0 auto 12px', animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ fontSize: 13, color: MUTED }}>Carregando...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
  if (!fullPage) return inner
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: SLATE }}>
      {inner}
    </div>
  )
}

// ── Modal Nova Mesa ───────────────────────────────────────────
function ModalNovaMesa({
  onClose, onSalvar, salvando,
}: {
  onClose: () => void
  onSalvar: (f: FormNovaMesa) => Promise<void>
  salvando: boolean
}) {
  const [form, setForm] = useState<FormNovaMesa>({ produto: '', baseline: '', preco_alvo: '', prazo: '15' })
  const [erroLocal, setErroLocal] = useState('')
  const set = (k: keyof FormNovaMesa) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const previewSaving = (() => {
    const a = parseFloat(form.baseline.replace(',', '.'))
    const b = parseFloat(form.preco_alvo.replace(',', '.'))
    if (!a || !b || b >= a) return null
    return { valor: a - b, pct: ((a - b) / a * 100).toFixed(1) }
  })()

  async function submit() {
    if (!form.produto.trim()) { setErroLocal('Informe o produto.'); return }
    if (!form.baseline)       { setErroLocal('Informe o valor atual.'); return }
    setErroLocal('')
    await onSalvar(form)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: WHITE, borderRadius: 16, width: '100%', maxWidth: 480, padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: NAVY, margin: 0 }}>Nova Mesa de Negociação</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: MUTED, lineHeight: 1, padding: 0 }}>✕</button>
        </div>

        {[
          { label: 'Produto / Insumo *', key: 'produto' as const,   placeholder: 'Ex: 5.000 caixas de papelão ondulado' },
          { label: 'Valor atual pago (R$) *', key: 'baseline' as const, placeholder: 'Ex: 45000' },
          { label: 'Preço alvo desejado (R$)', key: 'preco_alvo' as const, placeholder: 'Ex: 38000 (opcional)' },
        ].map(({ label, key, placeholder }) => (
          <div key={key} style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </label>
            <input
              value={form[key]} placeholder={placeholder}
              onChange={e => set(key)(e.target.value)}
              style={{ width: '100%', padding: '10px 13px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, color: NAVY, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = E; e.target.style.boxShadow = `0 0 0 3px ${E}25` }}
              onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }}
            />
          </div>
        ))}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Prazo para resultado
          </label>
          <select value={form.prazo} onChange={e => set('prazo')(e.target.value)}
            style={{ width: '100%', padding: '10px 13px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, color: NAVY, fontSize: 14 }}>
            <option value="7">7 dias — urgente</option>
            <option value="15">15 dias — padrão</option>
            <option value="30">30 dias — sem pressa</option>
          </select>
        </div>

        {previewSaving && (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '0.9rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#047857', letterSpacing: '0.07em', margin: '0 0 4px' }}>PRÉVIA DO SAVING</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: E, margin: '0 0 2px' }}>{previewSaving.pct}% de economia estimada</p>
            <p style={{ fontSize: 12, color: '#065F46', margin: 0 }}>
              Saving: {brl(previewSaving.valor)} · Fee DeuAcordo: {brl(previewSaving.valor * 0.2)}
            </p>
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
          <button onClick={submit} disabled={salvando} style={{ flex: 2, padding: '12px', background: salvando ? '#A7F3D0' : E, border: 'none', borderRadius: 8, color: WHITE, fontSize: 14, fontWeight: 700, cursor: salvando ? 'wait' : 'pointer' }}>
            {salvando ? 'Salvando...' : 'Abrir Mesa →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Detalhes da Mesa ────────────────────────────────────
function ModalDetalhes({ mesa, role, onClose }: { mesa: Mesa; role: Role; onClose: () => void }) {
  const fee      = calcFee(mesa.saving)
  const comissao = calcComissao(mesa.saving)
  const sc       = statusCfg(mesa.status)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: WHITE, borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: '0.07em', margin: '0 0 4px' }}>
              #{mesa.id.slice(0, 8).toUpperCase()}
            </p>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: NAVY, margin: '0 0 8px', lineHeight: 1.35 }}>{mesa.produto}</h2>
            <Badge text={mesa.status} bg={sc.bg} color={sc.color} />
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: MUTED, lineHeight: 1, padding: 0, flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Cálculo financeiro */}
          <div style={{ background: SLATE, borderRadius: 10, padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            {[
              { label: 'BASELINE',                                     value: brl(mesa.baseline),  color: NAVY },
              { label: 'SAVING GERADO',                                value: brl(mesa.saving),    color: E    },
              {
                label: role === 'empresa' ? 'FEE (20%)' : 'SUA COMISSÃO',
                value: role === 'empresa' ? brl(fee) : brl(comissao),
                color: role === 'empresa' ? NAVY : AMBER,
              },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 4px' }}>{label}</p>
                <p style={{ fontSize: 18, fontWeight: 800, color, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Fornecedores */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, letterSpacing: '0.05em', margin: '0 0 10px' }}>COMPARATIVO</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '0.9rem' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: RED, letterSpacing: '0.06em', margin: '0 0 4px' }}>FORNECEDOR ATUAL</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: '0 0 2px' }}>{mesa.fornecedor_atual}</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: RED, margin: 0 }}>{brl(mesa.baseline)}</p>
              </div>
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '0.9rem' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#065F46', letterSpacing: '0.06em', margin: '0 0 4px' }}>PROPOSTA NEGOCIADA</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: '0 0 2px' }}>{mesa.fornecedor_proposto}</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: E, margin: 0 }}>
                  {mesa.preco_proposto ? brl(mesa.preco_proposto) : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Dados adicionais */}
          <div style={{ background: SLATE, borderRadius: 10, padding: '1rem' }}>
            {[
              { label: 'Criado em', value: new Date(mesa.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) },
              { label: 'Prazo total',      value: `${mesa.prazo_total} dias` },
              { label: 'Dias restantes',   value: mesa.dias_restantes > 0 ? `${mesa.dias_restantes} dias` : 'Vencida' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                <span style={{ color: MUTED }}>{label}</span>
                <span style={{ color: NAVY, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard Principal ───────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser]               = useState<User | null>(null)
  const [mesas, setMesas]             = useState<Mesa[]>([])
  const [carregando, setCarregando]   = useState(true)
  const [erroFetch, setErroFetch]     = useState('')
  const [role, setRole]               = useState<Role>('empresa')
  const [modalNova, setModalNova]     = useState(false)
  const [salvando, setSalvando]       = useState(false)
  const [mesaDetalhe, setMesaDetalhe] = useState<Mesa | null>(null)
  const [saindo, setSaindo]           = useState(false)

  // ── Busca mesas do usuário logado ──────────────────────────
  const buscarMesas = useCallback(async (uid: string) => {
    setErroFetch('')
    try {
      const { data, error } = await supabase
        .from('mesas')
        .select('*')
        .eq('user_id', uid)
        .order('criado_em', { ascending: false })

      if (error) throw error
      setMesas((data as Mesa[]) ?? [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar mesas.'
      setErroFetch(msg)
    }
  }, [])

  // ── Proteção de rota + carga inicial ──────────────────────
  useEffect(() => {
    let mounted = true

    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!mounted) return

      if (!u) {
        router.replace('/login')
        return
      }
      setUser(u)
      await buscarMesas(u.id)
      if (mounted) setCarregando(false)
    }

    init()

    // Listener para mudanças de sessão (logout em outra aba, expiração, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login')
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, buscarMesas])

  // ── Sign Out ───────────────────────────────────────────────
  async function sair() {
    setSaindo(true)
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // ── Criar nova mesa no Supabase ───────────────────────────
  async function criarMesa(form: FormNovaMesa) {
    if (!user) return
    setSalvando(true)
    try {
      const baseline = parseFloat(form.baseline.replace(',', '.')) || 0
      const prazo    = parseInt(form.prazo) || 15

      const { error } = await supabase.from('mesas').insert({
        user_id:            user.id,
        produto:            form.produto.trim(),
        baseline,
        saving:             0,
        preco_proposto:     null,
        prazo_total:        prazo,
        dias_restantes:     prazo,
        status:             'Em Negociação',
        fornecedor_atual:   'A definir',
        fornecedor_proposto:'Aguardando Closer',
        criado_por_role:    role,
      })

      if (error) throw error

      // Recarrega a lista do banco (fonte única de verdade)
      await buscarMesas(user.id)
      setModalNova(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar mesa.'
      setErroFetch(msg)
    } finally {
      setSalvando(false)
    }
  }

  // ── Métricas calculadas ────────────────────────────────────
  const totalSaving    = mesas.reduce((s, m) => s + (m.saving ?? 0), 0)
  const totalBaseline  = mesas.reduce((s, m) => s + (m.baseline ?? 0), 0)
  const totalComissoes = mesas.reduce((s, m) => s + calcComissao(m.saving ?? 0), 0)
  const mesasAtivas    = mesas.filter(m => m.status === 'Em Negociação').length
  const mesasConc      = mesas.filter(m => m.status === 'Concluída').length
  const taxaMedia      = totalBaseline > 0 ? (totalSaving / totalBaseline * 100) : 0

  // Nome de exibição do usuário
  const nomeUsuario =
    (user?.user_metadata?.nome_completo as string | undefined)?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'Usuário'

  // ── Tela de carregamento ───────────────────────────────────
  if (carregando) return <Spinner fullPage />

  return (
    <div style={{ minHeight: '100vh', background: SLATE, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <header style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: '0.9rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.png" alt="DeuAcordo.com" style={{ height: 34, width: 'auto', objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 17, color: NAVY, letterSpacing: '-0.02em' }}>
            DeuAcordo<span style={{ color: E }}>.com</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: 0 }}>{nomeUsuario}</p>
            <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{user?.email}</p>
          </div>
          <button
            onClick={sair}
            disabled={saindo}
            style={{ fontSize: 13, fontWeight: 700, color: RED, background: '#FEF2F2', border: '1px solid #FECACA', padding: '7px 14px', borderRadius: 7, cursor: saindo ? 'wait' : 'pointer' }}
          >
            {saindo ? 'Saindo...' : 'Sair →'}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ── Título + Role Switcher ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800, color: NAVY, margin: '0 0 3px' }}>
              Painel de Mesas
            </h1>
            <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
              Bem-vindo, {nomeUsuario}. Suas negociações em tempo real.
            </p>
          </div>

          <div style={{ display: 'flex', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 4, gap: 4 }}>
            {(['empresa', 'closer'] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                style={{
                  padding: '8px 18px', borderRadius: 7, border: 'none',
                  background: role === r ? E : 'transparent',
                  color: role === r ? WHITE : MUTED,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {r === 'empresa' ? '🏢 Visão Empresa' : '🎯 Visão Closer'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Métricas ── */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {role === 'empresa' ? (
            <>
              <MetricCard label="SAVING TOTAL ACUMULADO"  value={brl(totalSaving)}  sub="economia gerada" accent />
              <MetricCard label="MESAS ATIVAS"            value={String(mesasAtivas)} sub="em negociação"  />
              <MetricCard label="MESAS CONCLUÍDAS"        value={String(mesasConc)}   sub="saving confirmado" />
              <MetricCard label="TAXA MÉDIA DE SAVING"    value={`${taxaMedia.toFixed(1)}%`} sub="das negociações" />
            </>
          ) : (
            <>
              <MetricCard label="COMISSÕES ESTIMADAS"  value={brl(totalComissoes)}  sub="70% do fee sobre savings" accent />
              <MetricCard label="MESAS ATIVAS"         value={String(mesasAtivas)}  sub="disponíveis" />
              <MetricCard label="MESAS CONCLUÍDAS"     value={String(mesasConc)}    sub="comissões liberadas" />
              <MetricCard label="TAXA MÉDIA DE SAVING" value={`${taxaMedia.toFixed(1)}%`} sub="média das negociações" />
            </>
          )}
        </div>

        {/* ── Erro de fetch ── */}
        {erroFetch && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>⚠️</span>
            <p style={{ fontSize: 13, color: '#DC2626', margin: 0, fontWeight: 500 }}>{erroFetch}</p>
            <button
              onClick={() => user && buscarMesas(user.id)}
              style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#DC2626', background: 'none', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* ── Barra da tabela ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: 0 }}>
            {mesas.length} mesa{mesas.length !== 1 ? 's' : ''} encontrada{mesas.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={() => setModalNova(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: E, border: 'none', borderRadius: 8,
              color: WHITE, padding: '10px 20px',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nova Mesa de Negociação
          </button>
        </div>

        {/* ── Tabela ── */}
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>

          {/* Cabeçalho */}
          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 130px 130px 120px 160px 130px', gap: 0, padding: '10px 16px', background: SLATE, borderBottom: `1px solid ${BORDER}` }}>
            {['CÓDIGO', 'PRODUTO', 'BASELINE', role === 'empresa' ? 'SAVING' : 'COMISSÃO', 'PRAZO', 'STATUS', 'AÇÃO'].map(c => (
              <span key={c} style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.07em' }}>{c}</span>
            ))}
          </div>

          {/* Estado vazio */}
          {mesas.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🤝</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '0 0 6px' }}>Nenhuma mesa ainda</p>
              <p style={{ fontSize: 13, color: MUTED, margin: '0 0 1.5rem' }}>Crie sua primeira mesa de negociação e comece a economizar.</p>
              <button
                onClick={() => setModalNova(true)}
                style={{ padding: '10px 24px', background: E, border: 'none', borderRadius: 8, color: WHITE, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                + Abrir primeira mesa
              </button>
            </div>
          )}

          {/* Linhas */}
          {mesas.map((mesa, i) => {
            const sc = statusCfg(mesa.status)
            const uc = urgenciaCfg(mesa.dias_restantes, mesa.status)
            const valorDestaque = role === 'empresa' ? mesa.saving : calcComissao(mesa.saving)

            return (
              <div
                key={mesa.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '130px 1fr 130px 130px 120px 160px 130px',
                  gap: 0,
                  padding: '14px 16px',
                  borderBottom: i === mesas.length - 1 ? 'none' : `1px solid ${BORDER}`,
                  alignItems: 'center',
                  transition: 'background 0.1s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
                onMouseLeave={e => (e.currentTarget.style.background = WHITE)}
                onClick={() => setMesaDetalhe(mesa)}
              >
                {/* Código */}
                <span style={{ fontSize: 11, fontWeight: 700, color: E, fontFamily: 'monospace' }}>
                  #{mesa.id.slice(0, 8).toUpperCase()}
                </span>

                {/* Produto */}
                <span style={{ fontSize: 13, color: NAVY, fontWeight: 600, paddingRight: 12, lineHeight: 1.35 }}>
                  {mesa.produto}
                </span>

                {/* Baseline */}
                <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{brl(mesa.baseline)}</span>

                {/* Saving / Comissão */}
                <span style={{ fontSize: 13, fontWeight: 800, color: valorDestaque > 0 ? (role === 'empresa' ? E : AMBER) : MUTED }}>
                  {valorDestaque > 0 ? brl(valorDestaque) : '—'}
                </span>

                {/* Prazo */}
                <div>
                  <p style={{ fontSize: 12, color: MUTED, margin: '0 0 3px' }}>{mesa.prazo_total}d total</p>
                  <Badge text={uc.label} bg={uc.bg} color={uc.color} />
                </div>

                {/* Status */}
                <Badge text={mesa.status} bg={sc.bg} color={sc.color} />

                {/* Ação */}
                <button
                  onClick={e => { e.stopPropagation(); setMesaDetalhe(mesa) }}
                  style={{
                    padding: '7px 12px', background: 'transparent',
                    border: `1.5px solid ${BORDER}`, borderRadius: 7,
                    fontSize: 12, fontWeight: 700, color: NAVY,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = E; e.currentTarget.style.color = E }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = NAVY }}
                >
                  Ver Detalhes →
                </button>
              </div>
            )
          })}
        </div>

        {/* ── Rodapé informativo ── */}
        {mesas.length > 0 && (
          <div style={{
            marginTop: '1.5rem',
            background: role === 'empresa' ? '#ECFDF5' : '#FFFBEB',
            border: `1px solid ${role === 'empresa' ? '#A7F3D0' : '#FCD34D'}`,
            borderRadius: 10, padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>{role === 'empresa' ? '💡' : '💰'}</span>
            <p style={{ fontSize: 13, color: role === 'empresa' ? '#065F46' : '#92400E', margin: 0, lineHeight: 1.55 }}>
              {role === 'empresa'
                ? `Você acumulou ${brl(totalSaving)} em economias. Fee total pago: ${brl(totalSaving * 0.2)} — retorno de ${totalSaving > 0 ? ((totalSaving * 0.8) / (totalSaving * 0.2)).toFixed(1) : '—'}x sobre cada real investido.`
                : `Suas comissões estimadas são ${brl(totalComissoes)}. O split é sempre 70% para você, 30% para a plataforma.`
              }
            </p>
          </div>
        )}
      </main>

      {/* ── Modais ── */}
      {modalNova && (
        <ModalNovaMesa
          onClose={() => setModalNova(false)}
          onSalvar={criarMesa}
          salvando={salvando}
        />
      )}
      {mesaDetalhe && (
        <ModalDetalhes
          mesa={mesaDetalhe}
          role={role}
          onClose={() => setMesaDetalhe(null)}
        />
      )}

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  )
}
