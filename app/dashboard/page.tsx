'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Paleta ────────────────────────────────────────────────
const NAVY   = '#0F172A'
const E      = '#10B981'
const MUTED  = '#64748B'
const BORDER = '#E2E8F0'
const SLATE  = '#F8FAFC'
const WHITE  = '#FFFFFF'
const AMBER  = '#F59E0B'
const RED    = '#EF4444'

// ── Tipos ─────────────────────────────────────────────────
type Role = 'empresa' | 'closer'

type StatusMesa =
  | 'Em Negociação'
  | 'Aguardando Aprovação'
  | 'Concluída'
  | 'Cancelada'

interface EventoTimeline {
  data: string
  descricao: string
  tipo: 'info' | 'success' | 'warning'
}

interface Mesa {
  id: string
  produto: string
  baseline: number
  saving: number
  prazoTotal: number
  diasRestantes: number
  status: StatusMesa
  fornecedorAtual: string
  fornecedorProposto: string
  precoProposto: number
  timeline: EventoTimeline[]
}

interface FormNovaMesa {
  produto: string
  valorAtual: string
  precoAlvo: string
  prazo: string
}

// ── Dados de exemplo ──────────────────────────────────────
const mesasIniciais: Mesa[] = [
  {
    id: 'MESA-8042',
    produto: '5.000 Caixas de Papelão Ondulado 30x20x15cm',
    baseline: 45000,
    saving: 8200,
    prazoTotal: 15,
    diasRestantes: 4,
    status: 'Em Negociação',
    fornecedorAtual: 'Embalagens Norte Ltda',
    fornecedorProposto: 'Fornecedor alternativo em avaliação',
    precoProposto: 36800,
    timeline: [
      { data: '10/09/2026', descricao: 'Mesa aberta pelo cliente.', tipo: 'info' },
      { data: '11/09/2026', descricao: 'Closer designado e briefing recebido.', tipo: 'info' },
      { data: '12/09/2026', descricao: '3 fornecedores alternativos identificados.', tipo: 'info' },
      { data: '14/09/2026', descricao: 'Melhor proposta recebida: R$ 36.800 (saving de 18,2%).', tipo: 'success' },
    ],
  },
  {
    id: 'MESA-7891',
    produto: 'Licenças de Software ERP — Módulo Fiscal (12 meses)',
    baseline: 84000,
    saving: 14200,
    prazoTotal: 30,
    diasRestantes: 12,
    status: 'Aguardando Aprovação',
    fornecedorAtual: 'SAP Brasil',
    fornecedorProposto: 'Totvs Protheus — Proposta Negociada',
    precoProposto: 69800,
    timeline: [
      { data: '01/09/2026', descricao: 'Mesa aberta pelo cliente.', tipo: 'info' },
      { data: '03/09/2026', descricao: 'Closer iniciou mapeamento de alternativas.', tipo: 'info' },
      { data: '08/09/2026', descricao: 'Proposta enviada ao cliente para aceite.', tipo: 'warning' },
    ],
  },
  {
    id: 'MESA-7654',
    produto: 'EPIs Corporativos — Kit Completo 200 colaboradores',
    baseline: 38000,
    saving: 9400,
    prazoTotal: 15,
    diasRestantes: 0,
    status: 'Concluída',
    fornecedorAtual: 'Proteção Total Ltda',
    fornecedorProposto: 'SafeWork Equipamentos',
    precoProposto: 28600,
    timeline: [
      { data: '25/08/2026', descricao: 'Mesa aberta.', tipo: 'info' },
      { data: '27/08/2026', descricao: 'Closer encontrou 4 alternativas certificadas.', tipo: 'info' },
      { data: '30/08/2026', descricao: 'Cliente aprovou saving de R$ 9.400 (24,7%).', tipo: 'success' },
      { data: '01/09/2026', descricao: 'Escrow liberado. Comissão processada.', tipo: 'success' },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────
const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const calcFee   = (saving: number) => saving * 0.20
const calcComissao = (saving: number) => saving * 0.20 * 0.70

function statusConfig(s: StatusMesa) {
  const cfg: Record<StatusMesa, { bg: string; color: string; dot: string }> = {
    'Em Negociação':       { bg: '#DBEAFE', color: '#1D4ED8', dot: '#3B82F6' },
    'Aguardando Aprovação':{ bg: '#FEF9C3', color: '#854D0E', dot: AMBER     },
    'Concluída':           { bg: '#DCFCE7', color: '#166534', dot: E          },
    'Cancelada':           { bg: '#FEE2E2', color: '#991B1B', dot: RED        },
  }
  return cfg[s]
}

function urgenciaConfig(dias: number) {
  if (dias === 0) return { bg: '#DCFCE7', color: '#166534', label: 'Concluída' }
  if (dias <= 3)  return { bg: '#FEE2E2', color: '#991B1B', label: `${dias}d restantes` }
  if (dias <= 7)  return { bg: '#FEF9C3', color: '#854D0E', label: `${dias}d restantes` }
  return             { bg: '#F1F5F9',  color: MUTED,      label: `${dias}d restantes` }
}

// ── Sub-componentes ───────────────────────────────────────

function Badge({ text, bg, color }: { text: string; bg: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: bg, color, fontSize: 11, fontWeight: 700,
      padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  )
}

function MetricCard({ label, value, sub, accent = false }: {
  label: string; value: string; sub?: string; accent?: boolean
}) {
  return (
    <div style={{
      background: WHITE, border: `1.5px solid ${accent ? E : BORDER}`,
      borderRadius: 12, padding: '1.25rem 1.5rem',
      flex: 1, minWidth: 160,
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

// ── Modal de nova mesa ────────────────────────────────────
function ModalNovaMesa({ onClose, onSalvar }: {
  onClose: () => void
  onSalvar: (form: FormNovaMesa) => void
}) {
  const [form, setForm] = useState<FormNovaMesa>({ produto: '', valorAtual: '', precoAlvo: '', prazo: '15' })
  const set = (k: keyof FormNovaMesa) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const saving = (() => {
    const a = parseFloat(form.valorAtual.replace(',', '.'))
    const b = parseFloat(form.precoAlvo.replace(',', '.'))
    if (!a || !b || b >= a) return null
    return { valor: a - b, pct: ((a - b) / a * 100).toFixed(1) }
  })()

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: WHITE, borderRadius: 16, width: '100%', maxWidth: 500,
        padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: NAVY, margin: 0 }}>Nova Mesa de Negociação</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: MUTED, lineHeight: 1 }}>✕</button>
        </div>

        {[
          { label: 'Produto / Insumo *', id: 'prod', key: 'produto' as const, placeholder: 'Ex: 5.000 caixas de papelão ondulado' },
          { label: 'Valor atual pago (R$) *', id: 'va', key: 'valorAtual' as const, placeholder: 'Ex: 45000' },
          { label: 'Preço alvo desejado (R$)', id: 'pa', key: 'precoAlvo' as const, placeholder: 'Ex: 38000' },
        ].map(({ label, id, key, placeholder }) => (
          <div key={id} style={{ marginBottom: '1rem' }}>
            <label htmlFor={id} style={{ display: 'block', fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </label>
            <input
              id={id} value={form[key]} placeholder={placeholder}
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

        {saving && (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '0.9rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#047857', letterSpacing: '0.07em', margin: '0 0 4px' }}>PRÉVIA DO SAVING</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: E, margin: '0 0 2px' }}>{saving.pct}% de economia estimada</p>
            <p style={{ fontSize: 12, color: '#065F46', margin: 0 }}>
              Saving: {brl(saving.valor)} · Fee DeuAcordo: {brl(saving.valor * 0.2)}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: '0.5rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, color: MUTED, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button
            onClick={() => { if (!form.produto || !form.valorAtual) return; onSalvar(form) }}
            style={{ flex: 2, padding: '12px', background: E, border: 'none', borderRadius: 8, color: WHITE, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Abrir Mesa →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de detalhes da mesa ─────────────────────────────
function ModalDetalhes({ mesa, role, onClose }: {
  mesa: Mesa; role: Role; onClose: () => void
}) {
  const [mensagem, setMensagem] = useState('')
  const [proposta, setProposta] = useState('')
  const fee = calcFee(mesa.saving)
  const comissao = calcComissao(mesa.saving)
  const sc = statusConfig(mesa.status)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: WHITE, borderRadius: 16, width: '100%', maxWidth: 620,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
      }}>
        {/* Cabeçalho do modal */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: '0.07em', margin: '0 0 4px' }}>#{mesa.id}</p>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: '0 0 8px', lineHeight: 1.3 }}>{mesa.produto}</h2>
            <Badge text={mesa.status} bg={sc.bg} color={sc.color} />
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: MUTED, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Cálculo financeiro */}
          <div style={{ background: SLATE, borderRadius: 10, padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 4px' }}>BASELINE</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: 0 }}>{brl(mesa.baseline)}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 4px' }}>SAVING GERADO</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: E, margin: 0 }}>{brl(mesa.saving)}</p>
              <p style={{ fontSize: 11, color: E, margin: '2px 0 0' }}>{(mesa.saving / mesa.baseline * 100).toFixed(1)}% de economia</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 4px' }}>
                {role === 'empresa' ? 'FEE DA PLATAFORMA' : 'SUA COMISSÃO (70%)'}
              </p>
              <p style={{ fontSize: 18, fontWeight: 800, color: role === 'empresa' ? NAVY : AMBER, margin: 0 }}>
                {role === 'empresa' ? brl(fee) : brl(comissao)}
              </p>
              <p style={{ fontSize: 11, color: MUTED, margin: '2px 0 0' }}>
                {role === 'empresa' ? '20% do saving' : '70% do fee de 20%'}
              </p>
            </div>
          </div>

          {/* Fornecedor baseline vs proposto */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, letterSpacing: '0.05em', margin: '0 0 10px' }}>COMPARATIVO DE FORNECEDORES</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '0.9rem' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: RED, letterSpacing: '0.06em', margin: '0 0 4px' }}>FORNECEDOR ATUAL</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: '0 0 2px' }}>{mesa.fornecedorAtual}</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: RED, margin: 0 }}>{brl(mesa.baseline)}</p>
              </div>
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '0.9rem' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#065F46', letterSpacing: '0.06em', margin: '0 0 4px' }}>PROPOSTA NEGOCIADA</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: '0 0 2px' }}>{mesa.fornecedorProposto}</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: E, margin: 0 }}>{brl(mesa.precoProposto)}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, letterSpacing: '0.05em', margin: '0 0 12px' }}>HISTÓRICO DA NEGOCIAÇÃO</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {mesa.timeline.map((ev, i) => {
                const dotColor = ev.tipo === 'success' ? E : ev.tipo === 'warning' ? AMBER : '#94A3B8'
                return (
                  <div key={i} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, marginTop: 4, flexShrink: 0 }} />
                      {i < mesa.timeline.length - 1 && (
                        <div style={{ width: 1, flex: 1, background: BORDER, marginTop: 2, marginBottom: 2, minHeight: 20 }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: i < mesa.timeline.length - 1 ? '0.75rem' : 0 }}>
                      <p style={{ fontSize: 10, color: MUTED, margin: '0 0 2px', fontWeight: 600 }}>{ev.data}</p>
                      <p style={{ fontSize: 13, color: NAVY, margin: 0, lineHeight: 1.45 }}>{ev.descricao}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Campo de interação */}
          {mesa.status !== 'Concluída' && mesa.status !== 'Cancelada' && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, letterSpacing: '0.05em', margin: '0 0 10px' }}>
                {role === 'closer' ? 'ATUALIZAR PROPOSTA DE FORNECEDOR' : 'ENVIAR MENSAGEM PARA O CLOSER'}
              </p>

              {role === 'closer' && (
                <input
                  value={proposta}
                  onChange={e => setProposta(e.target.value)}
                  placeholder="Valor da nova proposta (R$)"
                  style={{ width: '100%', padding: '10px 13px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, color: NAVY, fontSize: 14, marginBottom: 8, boxSizing: 'border-box', outline: 'none' }}
                />
              )}
              <textarea
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                placeholder={role === 'closer' ? 'Descreva o fornecedor e condições negociadas...' : 'Tire dúvidas ou informe requisitos adicionais...'}
                rows={3}
                style={{ width: '100%', padding: '10px 13px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, color: NAVY, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
              />
              <button style={{
                marginTop: 8, padding: '10px 20px',
                background: role === 'closer' ? AMBER : E,
                border: 'none', borderRadius: 8,
                color: role === 'closer' ? NAVY : WHITE,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                {role === 'closer' ? 'Enviar Proposta' : 'Enviar Mensagem'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────
export default function DashboardPage() {
  const [role, setRole]               = useState<Role>('empresa')
  const [mesas, setMesas]             = useState<Mesa[]>(mesasIniciais)
  const [modalNova, setModalNova]     = useState(false)
  const [mesaDetalhe, setMesaDetalhe] = useState<Mesa | null>(null)

  const totalSaving    = mesas.reduce((s, m) => s + m.saving, 0)
  const totalComissoes = mesas.reduce((s, m) => s + calcComissao(m.saving), 0)
  const mesasAtivas    = mesas.filter(m => m.status === 'Em Negociação').length
  const mesasConc      = mesas.filter(m => m.status === 'Concluída').length

  function adicionarMesa(form: FormNovaMesa) {
    const novo: Mesa = {
      id: `MESA-${Math.floor(1000 + Math.random() * 9000)}`,
      produto: form.produto,
      baseline: parseFloat(form.valorAtual.replace(',', '.')),
      saving: 0,
      prazoTotal: parseInt(form.prazo),
      diasRestantes: parseInt(form.prazo),
      status: 'Em Negociação',
      fornecedorAtual: 'A definir',
      fornecedorProposto: 'Aguardando closer',
      precoProposto: 0,
      timeline: [{ data: new Date().toLocaleDateString('pt-BR'), descricao: 'Mesa aberta.', tipo: 'info' }],
    }
    setMesas(p => [novo, ...p])
    setModalNova(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: SLATE, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <header style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: '0.9rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.png" alt="DeuAcordo.com" style={{ height: 36, width: 'auto' }} />
          <span style={{ fontWeight: 800, fontSize: 18, color: NAVY }}>
            DeuAcordo<span style={{ color: E }}>.com</span>
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: 13, color: MUTED }}>usuario@empresa.com.br</span>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: RED, textDecoration: 'none' }}>
            Sair →
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ── Role Switcher ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: NAVY, margin: '0 0 4px' }}>
              Painel de Mesas
            </h1>
            <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
              Acompanhe suas negociações em tempo real.
            </p>
          </div>

          {/* Tabs de perfil */}
          <div style={{ display: 'flex', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 4, gap: 4 }}>
            {(['empresa', 'closer'] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                style={{
                  padding: '8px 20px', borderRadius: 7, border: 'none',
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

        {/* ── Métricas por perfil ── */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {role === 'empresa' ? (
            <>
              <MetricCard label="SAVING TOTAL ACUMULADO" value={brl(totalSaving)} sub="economia gerada para o cliente" accent />
              <MetricCard label="MESAS ATIVAS"    value={String(mesasAtivas)} sub="em negociação agora" />
              <MetricCard label="MESAS CONCLUÍDAS" value={String(mesasConc)}  sub="saving confirmado" />
              <MetricCard label="RETORNO SOBRE FEE" value={`${(totalSaving / (totalSaving * 0.2 || 1)).toFixed(1)}x`} sub="para cada R$ 1 pago" />
            </>
          ) : (
            <>
              <MetricCard label="COMISSÕES ESTIMADAS" value={brl(totalComissoes)} sub="70% do fee sobre savings" accent />
              <MetricCard label="MESAS ATIVAS"     value={String(mesasAtivas)} sub="disponíveis agora" />
              <MetricCard label="MESAS CONCLUÍDAS" value={String(mesasConc)}  sub="comissões liberadas" />
              <MetricCard label="TAXA MÉDIA SAVING" value={`${(totalSaving / mesas.reduce((s, m) => s + m.baseline, 0) * 100).toFixed(1)}%`} sub="média das negociações" />
            </>
          )}
        </div>

        {/* ── Header da tabela ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem',
        }}>
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: '110px 1fr 130px 130px 140px 150px 130px',
            gap: 0,
            padding: '10px 16px',
            background: SLATE,
            borderBottom: `1px solid ${BORDER}`,
          }}>
            {['CÓDIGO', 'PRODUTO', 'BASELINE', role === 'empresa' ? 'SAVING' : 'COMISSÃO', 'PRAZO', 'STATUS', 'AÇÃO'].map(col => (
              <span key={col} style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.07em' }}>{col}</span>
            ))}
          </div>

          {/* Linhas */}
          {mesas.map((mesa, i) => {
            const sc  = statusConfig(mesa.status)
            const uc  = urgenciaConfig(mesa.diasRestantes)
            const isLast = i === mesas.length - 1

            return (
              <div
                key={mesa.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr 130px 130px 140px 150px 130px',
                  gap: 0,
                  padding: '14px 16px',
                  borderBottom: isLast ? 'none' : `1px solid ${BORDER}`,
                  alignItems: 'center',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
                onMouseLeave={e => (e.currentTarget.style.background = WHITE)}
              >
                {/* Código */}
                <span style={{ fontSize: 12, fontWeight: 700, color: E, fontFamily: 'monospace' }}>#{mesa.id}</span>

                {/* Produto */}
                <span style={{ fontSize: 13, color: NAVY, fontWeight: 600, paddingRight: 12, lineHeight: 1.35 }}>{mesa.produto}</span>

                {/* Baseline */}
                <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{brl(mesa.baseline)}</span>

                {/* Saving / Comissão */}
                <span style={{ fontSize: 13, fontWeight: 800, color: role === 'empresa' ? E : AMBER }}>
                  {mesa.saving > 0
                    ? brl(role === 'empresa' ? mesa.saving : calcComissao(mesa.saving))
                    : <span style={{ color: MUTED, fontWeight: 400 }}>—</span>
                  }
                </span>

                {/* Prazo */}
                <div>
                  <p style={{ fontSize: 12, color: MUTED, margin: '0 0 3px' }}>{mesa.prazoTotal} dias</p>
                  <Badge text={uc.label} bg={uc.bg} color={uc.color} />
                </div>

                {/* Status */}
                <Badge text={mesa.status} bg={sc.bg} color={sc.color} />

                {/* Ação */}
                <button
                  onClick={() => setMesaDetalhe(mesa)}
                  style={{
                    padding: '7px 14px', background: 'transparent',
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

        {/* ── Rodapé informativo por perfil ── */}
        <div style={{ marginTop: '1.5rem', background: role === 'empresa' ? '#ECFDF5' : '#FFFBEB', border: `1px solid ${role === 'empresa' ? '#A7F3D0' : '#FCD34D'}`, borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>{role === 'empresa' ? '💡' : '💰'}</span>
          <p style={{ fontSize: 13, color: role === 'empresa' ? '#065F46' : '#92400E', margin: 0, lineHeight: 1.55 }}>
            {role === 'empresa'
              ? `Você acumulou ${brl(totalSaving)} em economias. O fee pago foi ${brl(totalSaving * 0.2)} — um retorno de ${(0.8 / 0.2).toFixed(0)}x sobre cada real investido.`
              : `Suas comissões estimadas são ${brl(totalComissoes)}. Conclua as mesas em aberto para liberar o saque. O split é sempre 70% para você, 30% para a plataforma.`
            }
          </p>
        </div>
      </main>

      {/* ── Modais ── */}
      {modalNova && <ModalNovaMesa onClose={() => setModalNova(false)} onSalvar={adicionarMesa} />}
      {mesaDetalhe && <ModalDetalhes mesa={mesaDetalhe} role={role} onClose={() => setMesaDetalhe(null)} />}

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  )
}