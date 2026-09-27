'use client'

// app/dashboard/empresa/page.tsx
// DeuAcordo.com — Painel Corporativo da Empresa v3.0
// Design executivo de classe mundial: Stripe / Mercury / Ramp level
// Todas as funcionalidades, Server Actions e integrações originais preservadas integralmente.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { getDealsByUser, createDeal, aprovarSaving } from '@/app/actions/deals'
import { registerCompanyOnDemand, getCompanyData } from '@/app/actions/user'

// ─────────────────────────────────────────────────────────────
// ECOSSISTEMA
// ─────────────────────────────────────────────────────────────
const ECOSSISTEMA_PRODUTOS = [
  { id: 'deal-desk',    name: 'Deal Desk',    icon: '🤝', active: true,  href: '/dashboard',              desc: 'Centralizador e pipeline visual de negociações corporativas.' },
  { id: 'ai-breakdown', name: 'AI Breakdown', icon: '🤖', active: true,  href: '/dashboard/ai-breakdown', desc: 'Desfragmentador e leitor inteligente de propostas via IA.' },
  { id: 'auction',      name: 'Auction',      icon: '⚡', active: false, href: '#',                       desc: 'Sala de leilão reverso ao vivo.' },
  { id: 'benchmark',    name: 'Benchmark',    icon: '📊', active: false, href: '#',                       desc: 'Inteligência comparativa de preços.' },
  { id: 'legal',        name: 'Legal',        icon: '⚖️', active: false, href: '#',                       desc: 'Conformidade jurídica e minutas automáticas.' },
  { id: 'risk',         name: 'Risk',         icon: '🛡️', active: false, href: '#',                       desc: 'Score de risco e homologação de fornecedores.' },
  { id: 'matrix',       name: 'Matrix',       icon: '📐', active: false, href: '#',                       desc: 'Matriz de decisão ponderada.' },
  { id: 'pulse',        name: 'Pulse',        icon: '📈', active: true,  href: '/pulse',                  desc: 'Dashboard executivo em tempo real.' },
  { id: 'route',        name: 'Route',        icon: '🔀', active: false, href: '#',                       desc: 'Motor de roteamento de aprovações.' },
  { id: 'club',         name: 'Club',         icon: '💎', active: false, href: '#',                       desc: 'Comunidade executiva e rede VIP.' },
  { id: 'academy',      name: 'Academy',      icon: '🎓', active: true,  href: '/academy',                desc: 'Plataforma LMS de capacitação.' },
]

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
  'Outras Categorias',
]

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function statusCfg(s: string) {
  const m: Record<string, { bg: string; color: string; border: string; label: string; dot: string }> = {
    IN_NEGOTIATION:   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Em Negociação',        dot: '#3B82F6' },
    PENDING_APPROVAL: { bg: '#FEFCE8', color: '#854D0E', border: '#FEF08A', label: 'Aguardando Aprovação',  dot: '#EAB308' },
    APPROVED:         { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', label: 'Concluída',             dot: '#10B981' },
    REJECTED:         { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', label: 'Cancelada',             dot: '#EF4444' },
    DRAFT:            { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0', label: 'Rascunho',              dot: '#94A3B8' },
  }
  return m[s] || { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0', label: s, dot: '#94A3B8' }
}

// ─────────────────────────────────────────────────────────────
// MICRO-COMPONENTES
// ─────────────────────────────────────────────────────────────
function Badge({ text, bg, color, border, dot }: {
  text: string; bg: string; color: string; border?: string; dot?: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide"
      style={{ background: bg, color, border: border ? `1px solid ${border}` : 'none' }}>
      {dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />}
      {text}
    </span>
  )
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center space-y-5">
        <div className="relative w-12 h-12 mx-auto">
          <div className="absolute inset-0 rounded-full border-[3px] border-slate-800" />
          <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500 border-t-transparent animate-spin" />
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-wide">Sincronizando Painel</p>
          <p className="text-xs text-slate-500 mt-1">Carregando dados corporativos...</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// KPI CARD — Stripe/Mercury level
// ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, delta, accent = false, icon }: {
  label: string; value: string; sub?: string
  delta?: { value: string; positive: boolean }
  accent?: boolean; icon?: string
}) {
  return (
    <div className={`relative rounded-2xl p-5 transition-all duration-200 group ${
      accent
        ? 'bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 shadow-xl shadow-slate-900/30'
        : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md shadow-sm'
    }`}>
      {/* Glow decorativo no card de accent */}
      {accent && (
        <div className="absolute top-0 right-0 w-40 h-40 -mt-10 -mr-10 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
      )}

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <p className={`text-[10px] font-black uppercase tracking-widest ${
            accent ? 'text-emerald-400' : 'text-slate-400'
          }`}>{label}</p>
          {icon && <span className="text-lg opacity-70">{icon}</span>}
        </div>

        <p className={`text-[28px] font-black tracking-tight leading-none ${
          accent ? 'text-white' : 'text-slate-900'
        }`}>{value}</p>

        <div className="flex items-center gap-2 mt-2">
          {sub && <p className={`text-xs font-medium ${accent ? 'text-slate-400' : 'text-slate-500'}`}>{sub}</p>}
          {delta && (
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
              delta.positive
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-red-500/15 text-red-400'
            }`}>
              {delta.positive ? '↑' : '↓'} {delta.value}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// GRÁFICO TEMPORAL — barras dinâmicas com dados reais
// ─────────────────────────────────────────────────────────────
function GraficoTemporal({ mesas }: { mesas: any[] }) {
  const hoje = new Date()
  const meses = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d   = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
    const saving = mesas
      .filter(m => {
        const md = new Date(m.createdAt)
        return `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, '0')}` === key
      })
      .reduce((s, m) => s + (m.savingValue ?? 0), 0)
    const count = mesas.filter(m => {
      const md = new Date(m.createdAt)
      return `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, '0')}` === key
    }).length
    return { key, label, saving, count }
  }), [mesas])

  const maxSaving = Math.max(...meses.map(m => m.saving), 1)
  const totalSavingGrafico = meses.reduce((s, m) => s + m.saving, 0)

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">EVOLUÇÃO TEMPORAL</p>
          <h3 className="text-sm font-black text-slate-900">Savings Gerados — Últimos 6 Meses</h3>
          <p className="text-xs text-slate-500 mt-0.5">Volume acumulado de economia por rodadas de negociação</p>
        </div>
        {totalSavingGrafico > 0 && (
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total no Período</p>
            <p className="text-base font-black text-emerald-600">{brl(totalSavingGrafico)}</p>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-end justify-between gap-3 h-28">
          {meses.map((m, i) => {
            const pct    = (m.saving / maxSaving) * 100
            const hasData = m.saving > 0
            return (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-2 group cursor-default">
                <div className="w-full flex flex-col justify-end" style={{ height: 88 }}>
                  <div
                    className="w-full rounded-t-lg transition-all duration-500 relative"
                    style={{
                      height: `${Math.max(hasData ? pct : 4, 4)}%`,
                      background: hasData
                        ? `linear-gradient(180deg, #10B981 0%, #059669 100%)`
                        : '#F1F5F9',
                      minHeight: 4,
                    }}
                  >
                    {hasData && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none z-10">
                        {brl(m.saving)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400">{m.label}</p>
                  {m.count > 0 && (
                    <p className="text-[9px] text-emerald-500 font-bold">{m.count}m</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL NOVA MESA — design premium 2 etapas
// ─────────────────────────────────────────────────────────────
function ModalNovaMesa({ onClose, onSalvar, salvando }: {
  onClose: () => void
  onSalvar: (f: FormNovaMesa) => Promise<void>
  salvando: boolean
}) {
  const [step, setStep]       = useState<1 | 2>(1)
  const [form, setForm]       = useState<FormNovaMesa>({
    produto: '', quantidade: '1', unidade: 'un', baseline: '', preco_alvo: '', prazo: '15',
    modeloAcordo: 'SAVING_20', categoria: 'Embalagens de Papelão e Ondulados',
    requisitosCloser: '', visibilidade: 'PUBLICA',
  })
  const [erroLocal, setErroLocal] = useState('')
  const set = (k: keyof FormNovaMesa) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const preview = useMemo(() => {
    const a   = parseFloat(form.baseline.replace(',', '.')) || 0
    const b   = parseFloat(form.preco_alvo.replace(',', '.')) || 0
    const qty = parseInt(form.quantidade) || 1
    if (!a || !b || b >= a) return null
    const savingTotal = (a - b) * qty
    const pct = ((a - b) / a * 100).toFixed(1)
    return { valor: savingTotal, pct }
  }, [form.baseline, form.preco_alvo, form.quantidade])

  async function submit() {
    if (!form.produto.trim()) { setErroLocal('Informe o produto ou insumo.'); return }
    if (!form.baseline)       { setErroLocal('Informe o preço atual pago por unidade.'); return }
    setErroLocal('')
    await onSalvar(form)
  }

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all"
  const labelCls = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5"

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-[560px] w-full shadow-2xl border border-slate-100 max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header do modal */}
        <div className="px-7 pt-7 pb-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex justify-between items-start mb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Nova Demanda B2B</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">Abrir Mesa de Negociação</h2>
              <p className="text-xs text-slate-500 mt-0.5">Identidade corporativa protegida — Closers operam pela DeuAcordo</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all text-sm font-bold">
              ✕
            </button>
          </div>

          {/* Steps */}
          <div className="flex gap-1">
            {[{ n: 1, label: 'Produto & Preço' }, { n: 2, label: 'Configurações' }].map(s => (
              <button key={s.n} type="button"
                onClick={() => step === 2 && s.n === 1 && setStep(1)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                  step === s.n
                    ? 'bg-slate-900 text-white'
                    : step > s.n
                      ? 'bg-emerald-500/15 text-emerald-600 cursor-pointer hover:bg-emerald-500/25'
                      : 'bg-slate-100 text-slate-400 cursor-default'
                }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                  step === s.n ? 'bg-emerald-500 text-slate-900' : step > s.n ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-500'
                }`}>
                  {step > s.n ? '✓' : s.n}
                </span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Corpo scrollável */}
        <div className="overflow-y-auto flex-1 px-7 py-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Produto / Insumo *</label>
                <input value={form.produto} placeholder="Ex: Caixas de papelão ondulado 30x20x15cm"
                  onChange={e => set('produto')(e.target.value)} className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Categoria *</label>
                  <select value={form.categoria} onChange={e => set('categoria')(e.target.value)} className={inputCls}>
                    {LISTA_CATEGORIAS_B2B.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Modelo de Acordo *</label>
                  <select value={form.modeloAcordo} onChange={e => set('modeloAcordo')(e.target.value)} className={inputCls}>
                    <option value="SAVING_20">Success Fee — 20% do Saving</option>
                    <option value="OPERACAO_1_5">Taxa Fixa — 1.5% do Volume</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Quantidade *</label>
                  <input type="number" value={form.quantidade} placeholder="1"
                    onChange={e => set('quantidade')(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Preço Atual (R$/un) *</label>
                  <input value={form.baseline} placeholder="Ex: 3.50"
                    onChange={e => set('baseline')(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Preço Alvo (R$/un)</label>
                  <input value={form.preco_alvo} placeholder="Ex: 2.80"
                    onChange={e => set('preco_alvo')(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Prazo para Resultado</label>
                <select value={form.prazo} onChange={e => set('prazo')(e.target.value)} className={inputCls}>
                  <option value="7">7 dias — Urgente</option>
                  <option value="15">15 dias — Padrão</option>
                  <option value="30">30 dias — Sem Pressa</option>
                </select>
              </div>

              {/* Preview de economia */}
              {preview && (
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">ECONOMIA ESTIMADA PARA SUA EMPRESA</p>
                  <div className="flex items-end gap-3">
                    <p className="text-2xl font-black text-emerald-600 leading-none">{brl(preview.valor)}</p>
                    <span className="text-sm font-black text-emerald-500 mb-0.5">+{preview.pct}%</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 mt-1.5 font-medium">Ganho bruto antes do fee de performance da plataforma</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">

              {/* Requisitos do Closer */}
              <div>
                <label className={labelCls}>Requisitos & Perfil do Negociador (Closer)</label>
                <textarea value={form.requisitosCloser}
                  placeholder="Ex: Experiência prévia em negociação industrial de alto volume, conhecimento do setor e capacidade de fechamento ágil..."
                  onChange={e => set('requisitosCloser')(e.target.value)}
                  className={`${inputCls} resize-none`} rows={4}
                />
              </div>

              {/* Visibilidade */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Visibilidade da Mesa</p>
                </div>
                {[
                  { value: 'PUBLICA',  icon: '🌐', title: 'Pública',  desc: 'Disponível para qualquer Closer da rede DeuAcordo ver e disputar.' },
                  { value: 'PRIVADA',  icon: '🔒', title: 'Privada',  desc: 'Visível exclusivamente para Closers homologados no seu segmento.' },
                ].map(op => (
                  <label key={op.value} className={`flex items-start gap-3 p-4 cursor-pointer transition-colors border-b last:border-b-0 border-slate-100 ${
                    form.visibilidade === op.value ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                  }`}>
                    <input type="radio" name="visibilidade" value={op.value}
                      checked={form.visibilidade === op.value}
                      onChange={() => set('visibilidade')(op.value)}
                      className="mt-0.5 accent-emerald-500" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{op.icon} {op.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{op.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Aviso de confidencialidade */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-700">
                <span className="text-base flex-shrink-0 mt-0.5">🔐</span>
                <div>
                  <p className="text-xs font-bold text-white">Protocolo Duplo-Cego Ativo</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Toda negociação é conduzida em nome da <span className="text-emerald-400 font-semibold">DeuAcordo.com</span>. O Closer nunca terá acesso ao nome da sua empresa ou ao seu fornecedor atual.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer do modal */}
        <div className="px-7 py-5 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          {erroLocal && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold mb-4">
              <span>⚠️</span> {erroLocal}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={step === 1 ? onClose : () => setStep(1)}
              className="flex-1 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-all active:scale-[0.99]">
              {step === 1 ? 'Cancelar' : '← Voltar'}
            </button>
            {step === 1 ? (
              <button
                onClick={() => {
                  if (!form.produto.trim()) { setErroLocal('Informe o produto.'); return }
                  if (!form.baseline) { setErroLocal('Informe o preço atual.'); return }
                  setErroLocal('')
                  setStep(2)
                }}
                className="flex-[2] py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all active:scale-[0.99]">
                Próximo: Configurações →
              </button>
            ) : (
              <button onClick={submit} disabled={salvando}
                className="flex-[2] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black text-xs transition-all active:scale-[0.99] shadow-lg shadow-emerald-500/25">
                {salvando ? 'Abrindo Mesa...' : '🚀 Abrir Mesa de Negociação'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL DETALHES — aprovação e comparativo financeiro
// ─────────────────────────────────────────────────────────────
function ModalDetalhes({ mesa, onClose, onAprovar, aprovando }: {
  mesa: any; onClose: () => void
  onAprovar: (id: string) => Promise<void>
  aprovando: boolean
}) {
  const sc          = statusCfg(mesa.status)
  const qty         = mesa.quantity || 1
  const targetUnit  = mesa.targetValue ?? 0
  const targetTotal = targetUnit * qty
  const saving      = mesa.savingValue ?? 0
  const fee         = saving * 0.20
  const liquido     = saving - fee
  const pctSaving   = targetTotal > 0 ? ((saving / targetTotal) * 100).toFixed(1) : '0'

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header dark */}
        <div className="bg-slate-900 px-6 pt-6 pb-5 flex-shrink-0 rounded-t-3xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-mono text-[11px] font-extrabold text-emerald-400 tracking-widest">
                #{mesa.id.slice(0, 8).toUpperCase()}
              </span>
              <h2 className="text-base font-black text-white mt-1 leading-snug max-w-xs">{mesa.title}</h2>
              <div className="mt-3">
                <Badge text={sc.label} bg="rgba(255,255,255,0.08)" color={sc.dot === '#10B981' ? '#4ADE80' : sc.dot === '#EAB308' ? '#FCD34D' : sc.dot === '#3B82F6' ? '#93C5FD' : '#F87171'} dot={sc.dot} />
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all text-sm font-bold flex-shrink-0">
              ✕
            </button>
          </div>
        </div>

        {/* Corpo */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">

          {/* KPIs financeiros */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: `BASELINE (${qty}×)`,   value: brl(targetTotal),                                        sub: `${brl(targetUnit)}/un`, color: '#0F172A' },
              { label: 'GANHO GERADO',          value: saving > 0 ? brl(saving) : '—',                         sub: saving > 0 ? `${pctSaving}% de saving` : 'Em negociação', color: '#10B981' },
              { label: 'GANHO LÍQUIDO',         value: saving > 0 ? brl(liquido) : '—',                        sub: saving > 0 ? `Fee: ${brl(fee)}` : '—', color: '#059669' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
                <p className="text-sm font-black leading-tight" style={{ color }}>{value}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">{sub}</p>
              </div>
            ))}
          </div>

          {/* Divisão financeira transparente */}
          {saving > 0 && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-3">DIVISÃO FINANCEIRA TRANSPARENTE</p>
              <div className="space-y-2">
                {[
                  { label: 'Saving bruto gerado',   value: brl(saving),   color: '#059669', bold: false },
                  { label: '(−) Fee DeuAcordo 20%', value: `−${brl(fee)}`, color: '#64748B', bold: false },
                  { label: 'Ganho líquido da empresa', value: brl(liquido), color: '#065F46', bold: true },
                ].map(({ label, value, color, bold }) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-emerald-200 last:border-b-0">
                    <span className="text-xs text-emerald-800 font-medium">{label}</span>
                    <span className="text-xs font-extrabold" style={{ color, fontWeight: bold ? 900 : 700 }}>{value}</span>
                  </div>
                ))}
              </div>
              {fee > 0 && (
                <p className="text-[10px] text-emerald-600 mt-2.5 font-bold">
                  ROI: R$ {(liquido / fee).toFixed(1)} economizado para cada R$ 1,00 de fee pago
                </p>
              )}
            </div>
          )}

          {/* Metadados */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-200">
            {[
              { label: 'Data de Criação', value: new Date(mesa.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) },
              { label: 'Quantidade', value: `${qty} unidade(s)` },
              mesa.categoria ? { label: 'Categoria', value: mesa.categoria } : null,
            ].filter(Boolean).map(row => row && (
              <div key={row.label} className="flex justify-between items-center px-4 py-3 text-xs">
                <span className="text-slate-500 font-medium">{row.label}</span>
                <span className="font-bold text-slate-900 text-right max-w-[55%]">{row.value}</span>
              </div>
            ))}
          </div>

          {/* CTA de aprovação */}
          {mesa.status === 'PENDING_APPROVAL' && (
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white space-y-3">
              <div>
                <p className="text-sm font-black">🎉 Proposta pronta para homologação!</p>
                <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
                  Economia de <strong>{pctSaving}%</strong> conquistada.
                  Ganho líquido após fee: <strong>{brl(liquido)}</strong>
                </p>
              </div>
              <button onClick={() => onAprovar(mesa.id)} disabled={aprovando}
                className="w-full py-3 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 font-black text-xs transition-all active:scale-[0.99] shadow-lg">
                {aprovando ? 'Homologando...' : '✓ Homologar e Confirmar Saving'}
              </button>
            </div>
          )}

          {mesa.status === 'APPROVED' && (
            <div className="rounded-2xl bg-slate-900 border border-slate-700 p-4 text-center">
              <p className="text-sm font-black text-emerald-400">✅ Saving de {brl(liquido)} homologado com sucesso!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD PRINCIPAL
// ─────────────────────────────────────────────────────────────
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

  // ── Data Fetching ──────────────────────────────────────────
  const buscarDadosEmpresaEMesas = useCallback(async (userId: string) => {
    setErroFetch('')
    const [dealsRes, compRes] = await Promise.all([
      getDealsByUser(userId),
      getCompanyData(userId),
    ])
    if (dealsRes.success && dealsRes.data)  setMesas(dealsRes.data)
    else                                     setErroFetch(dealsRes.error || 'Erro ao carregar mesas.')
    if (compRes.success && compRes.organization?.name) setEmpresaNome(compRes.organization.name)
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
        const regRes = await registerCompanyOnDemand({ userId: u.id, companyName })
        if (regRes.success && regRes.organization?.id) orgId = regRes.organization.id
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
      const res   = await createDeal({
        title:          form.produto.trim(),
        quantity:       parseInt(form.quantidade) || 1,
        targetValue:    parseFloat(form.baseline.replace(',', '.')) || 0,
        currentValue:   parseFloat(form.preco_alvo.replace(',', '.')) || 0,
        organizationId: orgId,
        createdById:    user.id,
      })
      if (!res.success) throw new Error(res.error)
      await buscarDadosEmpresaEMesas(user.id)
      setModalNova(false)
    } catch (err: unknown) {
      setErroFetch(err instanceof Error ? err.message : 'Erro ao criar mesa.')
    } finally { setSalvando(false) }
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
    } finally { setAprovando(false) }
  }

  // ── Métricas ───────────────────────────────────────────────
  const totalSaving   = mesas.reduce((s, m) => s + (m.savingValue ?? 0), 0)
  const totalBaseline = mesas.reduce((s, m) => s + ((m.targetValue ?? 0) * (m.quantity || 1)), 0)
  const mesasAtivas   = mesas.filter(m => m.status === 'IN_NEGOTIATION').length
  const mesasAgAprv   = mesas.filter(m => m.status === 'PENDING_APPROVAL').length
  const mesasConc     = mesas.filter(m => m.status === 'APPROVED').length
  const taxaMedia     = totalBaseline > 0 ? (totalSaving / totalBaseline * 100) : 0
  const liquidoTotal  = totalSaving * 0.80

  if (carregando) return <Spinner />

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans antialiased selection:bg-emerald-500 selection:text-white">

      {/* ─────────────────────────────────────────────────────
          SIDEBAR
      ───────────────────────────────────────────────────── */}
      <aside className="w-[280px] bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between fixed top-0 bottom-0 left-0 z-50">
        <div className="flex flex-col h-[calc(100vh-68px)] overflow-hidden">

          {/* Logo */}
          <div className="px-5 py-5 border-b border-slate-800/80 flex-shrink-0">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center transition-all group-hover:bg-emerald-500/25">
                <span className="text-emerald-400 font-black text-base">D</span>
              </div>
              <div>
                <span className="font-black text-[17px] text-white leading-none tracking-tight">
                  DeuAcordo<span className="text-emerald-400">.com</span>
                </span>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Procurement B2B</p>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <div className="p-3 overflow-y-auto flex-1 space-y-5">
            <div>
              <p className="px-2 text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">
                SUITE B2B — 11 MÓDULOS
              </p>
              <div className="space-y-0.5">
                {ECOSSISTEMA_PRODUTOS.map(p => {
                  const isActive = p.id === 'deal-desk'
                  return (
                    <div key={p.id} title={p.desc}
                      onClick={() => p.active && router.push(p.href)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all select-none ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                          : p.active
                            ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white cursor-pointer border border-transparent'
                            : 'text-slate-600 cursor-default border border-transparent'
                      }`}>
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="text-sm flex-shrink-0 opacity-80">{p.icon}</span>
                        <span className="truncate">{p.name}</span>
                      </div>
                      {isActive ? (
                        <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.5 rounded-md tracking-wider flex-shrink-0">
                          ATIVO
                        </span>
                      ) : p.active ? (
                        <span className="text-[9px] bg-slate-700 text-slate-400 font-bold px-1.5 py-0.5 rounded-md border border-slate-600/50 flex-shrink-0">ON</span>
                      ) : (
                        <span className="text-[9px] bg-slate-900 text-slate-600 font-bold px-1.5 py-0.5 rounded-md border border-slate-800 flex-shrink-0">SOON</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="px-2 text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">SISTEMA</p>
              <Link href="/dashboard/empresa/configuracoes"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800/60 text-xs font-semibold transition-all">
                <span className="text-sm">⚙️</span>
                <span>Configurações</span>
              </Link>
            </div>
          </div>
        </div>

        {/* User footer */}
        <div className="px-4 py-3.5 border-t border-slate-800/80 bg-slate-950 flex-shrink-0 h-[68px]">
          <div className="flex items-center justify-between gap-2">
            <div className="overflow-hidden">
              <p className="text-xs font-extrabold text-white truncate">{empresaNome}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <button onClick={sair} disabled={saindo} title="Sair da plataforma"
              className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold transition-all flex-shrink-0">
              {saindo ? '...' : 'Sair'}
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────
          CONTEÚDO PRINCIPAL
      ───────────────────────────────────────────────────── */}
      <div className="ml-[280px] flex-1 min-h-screen bg-slate-50 flex flex-col">

        {/* Top nav */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/dashboard" className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                ← Hub Central
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-bold text-slate-900">Deal Desk</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{empresaNome}</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                IDENTIDADE PROTEGIDA
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Rede B2B Ativa</span>
            </div>
            <button onClick={() => setModalNova(true)}
              className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all active:scale-[0.99] shadow-lg shadow-emerald-500/20 flex items-center gap-2">
              <span className="text-base leading-none">+</span>
              Abrir Mesa
            </button>
          </div>
        </header>

        {/* Main */}
        <main className="p-8 max-w-7xl mx-auto w-full space-y-7">

          {/* Erro */}
          {erroFetch && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <span>⚠️</span><span>{erroFetch}</span>
              <button onClick={() => user && buscarDadosEmpresaEMesas(user.id)}
                className="ml-auto text-red-600 underline hover:no-underline">Tentar novamente</button>
            </div>
          )}

          {/* Alerta de mesas aguardando */}
          {mesasAgAprv > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3">
              <span className="text-xl">⏳</span>
              <div className="flex-1">
                <p className="text-sm font-black text-amber-900">
                  {mesasAgAprv} mesa{mesasAgAprv > 1 ? 's' : ''} com proposta aguardando sua aprovação
                </p>
                <p className="text-xs text-amber-700 mt-0.5">Clique em "Ver Detalhes" para revisar e homologar o saving.</p>
              </div>
              <span className="text-xs font-black text-amber-600 bg-amber-100 px-3 py-1.5 rounded-full border border-amber-300">
                AÇÃO NECESSÁRIA
              </span>
            </div>
          )}

          {/* Hero banner + KPIs */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-7 border border-slate-800 shadow-2xl">
            {/* Decoração geométrica */}
            <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 rounded-full bg-emerald-500/8 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/2 -mb-24 w-72 h-72 rounded-full bg-blue-500/6 blur-3xl pointer-events-none" />
            {/* Grid de pontos decorativos */}
            <div className="absolute inset-0 opacity-[0.015]" style={{
              backgroundImage: 'radial-gradient(circle, #10B981 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }} />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-5 items-start">
              {/* Saving principal */}
              <div className="md:col-span-1 border-r border-slate-700/50 pr-5">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">ECONOMIA TOTAL ACUMULADA</p>
                <p className="text-4xl font-black text-white tracking-tight leading-none">{brl(totalSaving)}</p>
                <p className="text-xs text-slate-400 mt-2">
                  Ganho líquido: <span className="text-emerald-400 font-bold">{brl(liquidoTotal)}</span>
                </p>
                {taxaMedia > 0 && (
                  <div className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25">
                    <span className="text-emerald-400 text-xs">↑</span>
                    <span className="text-emerald-400 text-[11px] font-bold">{taxaMedia.toFixed(1)}% saving médio</span>
                  </div>
                )}
              </div>

              {/* Outros KPIs */}
              {[
                { label: 'MESAS ATIVAS',          value: String(mesasAtivas),  sub: 'em negociação',        icon: '🤝' },
                { label: 'AGUARDANDO APROVAÇÃO',  value: String(mesasAgAprv),  sub: 'propostas prontas',    icon: '⏳' },
                { label: 'MESAS CONCLUÍDAS',       value: String(mesasConc),    sub: 'savings confirmados',  icon: '✅' },
              ].map(({ label, value, sub, icon }) => (
                <div key={label} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                  </div>
                  <p className="text-3xl font-black text-white">{value}</p>
                  <p className="text-xs text-slate-500 font-medium">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico temporal */}
          <GraficoTemporal mesas={mesas} />

          {/* Tabela de mesas */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">

            {/* Header da tabela */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Suas Mesas de Negociação</h3>
                <p className="text-xs text-slate-500 mt-0.5">{mesas.length} demanda{mesas.length !== 1 ? 's' : ''} registrada{mesas.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setModalNova(true)}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all active:scale-[0.99] flex items-center gap-2">
                <span className="text-sm leading-none">+</span>
                Nova Mesa
              </button>
            </div>

            {/* Header colunas */}
            <div className="grid grid-cols-7 gap-4 px-6 py-2.5 bg-slate-50 border-b border-slate-100">
              {['CÓDIGO', 'PRODUTO / INSUMO', 'QTD', 'BASELINE', 'GANHO LÍQUIDO', 'STATUS', 'AÇÃO'].map((col, i) => (
                <span key={col} className={`text-[10px] font-black text-slate-400 uppercase tracking-widest ${i === 6 ? 'text-right' : ''} ${i === 1 ? 'col-span-1' : ''}`}>
                  {col}
                </span>
              ))}
            </div>

            {/* Linhas */}
            <div className="divide-y divide-slate-100">
              {mesas.length === 0 ? (
                <div className="p-14 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🏢</span>
                  </div>
                  <p className="text-sm font-black text-slate-800">Nenhuma mesa ainda</p>
                  <p className="text-xs text-slate-500 mt-1 mb-5">Abra sua primeira demanda de compras para acionar os Closers.</p>
                  <button onClick={() => setModalNova(true)}
                    className="py-2.5 px-6 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
                    + Criar Primeira Mesa
                  </button>
                </div>
              ) : (
                mesas.map(mesa => {
                  const sc      = statusCfg(mesa.status)
                  const qty     = mesa.quantity || 1
                  const saving  = mesa.savingValue ?? 0
                  const liquido = saving * 0.80
                  const isPendente = mesa.status === 'PENDING_APPROVAL'

                  return (
                    <div key={mesa.id}
                      onClick={() => setMesaDetalhe(mesa)}
                      className={`grid grid-cols-7 gap-4 px-6 py-4 items-center cursor-pointer transition-colors text-xs ${
                        isPendente ? 'bg-amber-50/40 hover:bg-amber-50/80' : 'hover:bg-slate-50/80'
                      }`}>

                      {/* Código */}
                      <span className="font-mono font-extrabold text-emerald-600 tracking-wider">
                        #{mesa.id.slice(0, 8).toUpperCase()}
                      </span>

                      {/* Produto */}
                      <div>
                        <p className="font-bold text-slate-900 truncate leading-tight">
                          {mesa.title}
                          {isPendente && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[9px] font-black border border-amber-200">
                              REVISAR
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Quantidade */}
                      <span className="text-slate-500 font-semibold">{qty}×</span>

                      {/* Baseline */}
                      <span className="font-semibold text-slate-700">
                        {brl((mesa.targetValue ?? 0) * qty)}
                      </span>

                      {/* Ganho líquido */}
                      <span className={`font-extrabold ${saving > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                        {saving > 0 ? brl(liquido) : '—'}
                      </span>

                      {/* Status */}
                      <div>
                        <Badge text={sc.label} bg={sc.bg} color={sc.color} border={sc.border} dot={sc.dot} />
                      </div>

                      {/* Ação */}
                      <div className="text-right">
                        <button
                          onClick={e => { e.stopPropagation(); setMesaDetalhe(mesa) }}
                          className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 font-bold hover:border-emerald-500 hover:text-emerald-600 transition-all text-xs">
                          Detalhes →
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Footer de economia */}
          {mesas.length > 0 && totalSaving > 0 && (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 px-6 py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-lg flex-shrink-0">
                  💡
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    Ganho líquido acumulado: <span className="text-emerald-400">{brl(liquidoTotal)}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total gerado: {brl(totalSaving)} · Fee: {brl(totalSaving * 0.2)} ·{' '}
                    {totalSaving > 0 && <span>ROI: {((totalSaving * 0.8) / (totalSaving * 0.2)).toFixed(1)}× por real investido</span>}
                  </p>
                </div>
              </div>
              <button onClick={() => setModalNova(true)}
                className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all active:scale-[0.99] flex-shrink-0 shadow-lg shadow-emerald-500/20">
                + Nova Mesa →
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Modais */}
      {modalNova    && <ModalNovaMesa onClose={() => setModalNova(false)} onSalvar={criarMesa} salvando={salvando} />}
      {mesaDetalhe  && <ModalDetalhes mesa={mesaDetalhe} onClose={() => setMesaDetalhe(null)} onAprovar={handleAprovarMesa} aprovando={aprovando} />}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
        * { scroll-behavior: smooth; }
      `}</style>
    </div>
  )
}
