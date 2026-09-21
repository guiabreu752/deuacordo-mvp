'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { getDealsByUser, createDeal, aprovarSaving } from '@/app/actions/deals'
import { registerCompanyOnDemand, getCompanyData } from '@/app/actions/user'

// ── Paleta Executiva DeuAcordo ──────────────────────────────
const NAVY   = '#0F172A'
const E      = '#10B981'
const MUTED  = '#64748B'
const BORDER = '#E2E8F0'
const SLATE  = '#F8FAFC'
const WHITE  = '#FFFFFF'
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

function MetricCard({ label, value, sub, accent = false }: {
  label: string; value: string; sub?: string; accent?: boolean
}) {
  return (
    <div style={{
      background: WHITE, border: `1.5px solid ${accent ? E : BORDER}`,
      borderRadius: 12, padding: '1.25rem 1.5rem', flex: 1, minWidth: 160,
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: accent ? E : MUTED, letterSpacing: '0.07em', margin: '0 0 6px', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 800, color: accent ? E : NAVY, margin: '0 0 3px', letterSpacing: '-0.02em' }}>
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
          width: 38, height: 38, border: `3px solid ${BORDER}`, borderTopColor: E,
          borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>Carregando Painel da Empresa...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
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

  const inputStyle = {
    width: '100%', padding: '10px 13px', background: SLATE,
    border: `1px solid ${BORDER}`, borderRadius: 8, color: NAVY,
    fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = {
    display: 'block' as const, fontSize: 11, fontWeight: 700 as const,
    color: NAVY, marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: WHITE, borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: 0 }}>Abrir Nova Mesa de Negociação B2B</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: MUTED, padding: 0 }}>✕</button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Produto / Insumo *</label>
          <input
            value={form.produto} placeholder="Ex: Caixas de papelão ondulado 30x20x15cm"
            onChange={e => set('produto')(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Categoria *</label>
            <select value={form.categoria} onChange={e => set('categoria')(e.target.value)} style={inputStyle}>
              {LISTA_CATEGORIAS_B2B.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Modelo de Acordo *</label>
            <select value={form.modeloAcordo} onChange={e => set('modeloAcordo')(e.target.value)} style={inputStyle}>
              <option value="SAVING_20">Success Fee (20% sobre Saving)</option>
              <option value="OPERACAO_1_5">Taxa de Operação (1.5% sobre Valor)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Qtd *</label>
            <input
              type="number" value={form.quantidade} placeholder="1"
              onChange={e => set('quantidade')(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Preço Atual (R$) *</label>
            <input
              value={form.baseline} placeholder="Ex: 3.50"
              onChange={e => set('baseline')(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Preço Alvo (R$)</label>
            <input
              value={form.preco_alvo} placeholder="Ex: 2.80"
              onChange={e => set('preco_alvo')(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Requisitos e Perfil do Negociador (Closer)</label>
          <textarea
            value={form.requisitosCloser}
            placeholder="Ex: Experiência prévia em negociação industrial, capacidade de fechar volume rápido..."
            onChange={e => set('requisitosCloser')(e.target.value)}
            style={{ ...inputStyle, height: 70, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem', background: SLATE, padding: '10px 14px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
          <input
            type="checkbox"
            checked={form.visibilidade === 'PRIVADA'}
            onChange={e => set('visibilidade')(e.target.checked ? 'PRIVADA' : 'PUBLICA')}
            style={{ width: 16, height: 16, accentColor: E, cursor: 'pointer' }}
          />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: 0 }}>Mesa Privada</p>
            <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>Visível apenas para Closers homologados e especializados neste segmento.</p>
          </div>
        </div>

        {preview && (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '0.9rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#047857', letterSpacing: '0.07em', margin: '0 0 4px' }}>GANHO BRUTO ESTIMADO PARA SUA EMPRESA</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: E, margin: '0 0 2px' }}>{brl(preview.valor)} ({preview.pct}% de economia potencial)</p>
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
            {salvando ? 'Salvando...' : 'Abrir Mesa de Negociação →'}
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

        <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div style={{ background: SLATE, borderRadius: 10, padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { label: `BASELINE TOTAL (${qty} UN)`, value: brl(targetTotal), color: NAVY },
              { label: 'GANHO / SAVING LÍQUIDO', value: saving > 0 ? `${brl(saving)} (${pctSaving}%)` : '—', color: E },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 4px' }}>{label}</p>
                <p style={{ fontSize: 16, fontWeight: 800, color, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          <div style={{ background: SLATE, borderRadius: 10, padding: '1rem' }}>
            {[
              { label: 'Criado em', value: new Date(mesa.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) },
              { label: 'Quantidade', value: `${qty} unidades` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                <span style={{ color: MUTED }}>{label}</span>
                <span style={{ color: NAVY, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>

          {mesa.status === 'PENDING_APPROVAL' && (
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '1.25rem' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#065F46', margin: '0 0 4px' }}>
                🎉 Proposta disponível para aprovação!
              </p>
              <p style={{ fontSize: 13, color: '#047857', margin: '0 0 1rem', lineHeight: 1.5 }}>
                Ganho de <strong>{pctSaving}%</strong> ({brl(saving)}) gerado para sua operação com sucesso.
              </p>
              <button
                onClick={() => onAprovar(mesa.id)}
                disabled={aprovando}
                style={{
                  width: '100%', padding: '12px', background: aprovando ? '#A7F3D0' : E,
                  border: 'none', borderRadius: 8, color: WHITE,
                  fontSize: 14, fontWeight: 700, cursor: aprovando ? 'wait' : 'pointer',
                }}
              >
                {aprovando ? 'Aprovando...' : '✓ Aprovar saving e Homologar'}
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
  const taxaMedia     = totalBaseline > 0 ? (totalSaving / totalBaseline * 100) : 0

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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: '1.5rem' }}>
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

            <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>
              GERENCIAMENTO
            </p>

            <Link
              href="/dashboard/empresa/configuracoes"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 11px',
                borderRadius: 8,
                background: SLATE,
                border: `1px solid ${BORDER}`,
                color: NAVY,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none'
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
              <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{empresaNome}</p>
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
            <h1 style={{ fontSize: 20, fontWeight: 800, color: NAVY, margin: 0 }}>
              {empresaNome}
            </h1>
            <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>
              Painel Corporativo de Gestão de Mesas e Ganhos B2B (Identidade Preservada)
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ background: '#ECFDF5', color: '#065F46', fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 6, border: '1px solid #A7F3D0' }}>
              🏢 Conta Protegida & Verificada
            </span>
          </div>
        </header>

        <main style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

          {mesasAgAprv > 0 && (
            <div style={{
              background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 10,
              padding: '0.9rem 1.25rem', marginBottom: '1.5rem',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>⏳</span>
              <p style={{ fontSize: 13, color: '#92400E', margin: 0, fontWeight: 600 }}>
                {mesasAgAprv} mesa{mesasAgAprv > 1 ? 's' : ''} aguardando sua aprovação — clique para revisar e homologar o ganho.
              </p>
            </div>
          )}

          {/* Métricas Principais focadas em Ganhos */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <MetricCard label="GANHOS E ECONOMIA TOTAL" value={brl(totalSaving)}          sub="benefício bruto gerado para operação" accent />
            <MetricCard label="MESAS ATIVAS"            value={String(mesasAtivas)}        sub="em negociação agora" />
            <MetricCard label="AGUARDANDO APROVAÇÃO"    value={String(mesasAgAprv)}        sub="proposta disponível" />
            <MetricCard label="MESAS CONCLUÍDAS"        value={String(mesasConc)}          sub="saving confirmado" />
          </div>

          {/* Gráfico de Evolução Temporal */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: NAVY, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evolução de Ganhos e Performance Temporal</h3>
            <p style={{ fontSize: 12, color: MUTED, margin: '0 0 1.25rem' }}>Acompanhamento contínuo da expansão do saving gerado pelas mesas ativas.</p>
            <div style={{ height: 160, background: SLATE, borderRadius: 8, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '1rem', border: `1px dashed ${BORDER}` }}>
              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set'].map((mes, idx) => {
                const altura = Math.min(30 + idx * 12, 130)
                return (
                  <div key={mes} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 28, height: altura, background: E, borderRadius: '4px 4px 0 0', opacity: 0.85 }} />
                    <span style={{ fontSize: 10, color: MUTED, fontWeight: 700 }}>{mes}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {erroFetch && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>⚠️</span>
              <p style={{ fontSize: 13, color: '#DC2626', margin: 0, fontWeight: 500 }}>{erroFetch}</p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: 0 }}>
              {mesas.length} mesa{mesas.length !== 1 ? 's' : ''} registrada{mesas.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setModalNova(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: E, border: 'none', borderRadius: 8, color: WHITE, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nova Mesa de Negociação
            </button>
          </div>

          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 130px 130px 160px 120px', padding: '10px 16px', background: SLATE, borderBottom: `1px solid ${BORDER}` }}>
              {['CÓDIGO', 'PRODUTO', 'QTD', 'BASELINE', 'GANHO / SAVING', 'STATUS', 'AÇÃO'].map(c => (
                <span key={c} style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: '0.07em' }}>{c}</span>
              ))}
            </div>

            {mesas.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>🏢</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '0 0 6px' }}>Nenhuma mesa ainda</p>
                <p style={{ fontSize: 13, color: MUTED, margin: '0 0 1.5rem' }}>Abra sua primeira demanda e comece a economizar nas compras.</p>
                <button onClick={() => setModalNova(true)} style={{ padding: '10px 24px', background: E, border: 'none', borderRadius: 8, color: WHITE, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  + Abrir primeira mesa
                </button>
              </div>
            )}

            {mesas.map((mesa, i) => {
              const sc  = statusCfg(mesa.status)
              const qty = mesa.quantity || 1
              return (
                <div
                  key={mesa.id}
                  style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 130px 130px 160px 120px', padding: '14px 16px', borderBottom: i === mesas.length - 1 ? 'none' : `1px solid ${BORDER}`, alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
                  onMouseLeave={e => (e.currentTarget.style.background = WHITE)}
                  onClick={() => setMesaDetalhe(mesa)}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: E, fontFamily: 'monospace' }}>#{mesa.id.slice(0, 8).toUpperCase()}</span>
                  <span style={{ fontSize: 13, color: NAVY, fontWeight: 600, paddingRight: 12, lineHeight: 1.35 }}>{mesa.title}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{qty} un</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }
                }>{brl((mesa.targetValue ?? 0) * qty)}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: (mesa.savingValue ?? 0) > 0 ? E : MUTED }}>
                    {(mesa.savingValue ?? 0) > 0 ? brl(mesa.savingValue) : '—'}
                  </span>
                  <Badge text={labelStatus(mesa.status)} bg={sc.bg} color={sc.color} />
                  <button
                    onClick={e => { e.stopPropagation(); setMesaDetalhe(mesa) }}
                    style={{ padding: '7px 12px', background: 'transparent', border: `1.5px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontWeight: 700, color: NAVY, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = E; e.currentTarget.style.color = E }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = NAVY }}
                  >
                    Ver Detalhes →
                  </button>
                </div>
              )
            })}
          </div>

          {mesas.length > 0 && (
            <div style={{ marginTop: '1.5rem', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>💡</span>
              <p style={{ fontSize: 13, color: '#065F46', margin: 0, lineHeight: 1.55 }}>
                Sua empresa já acumula <strong>{brl(totalSaving)}</strong> em benefícios e ganhos reais gerados pela plataforma.
              </p>
            </div>
          )}
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

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  )
}