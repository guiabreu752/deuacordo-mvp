'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import {
  getBreakdownsByOrganization,
  saveCostBreakdown,
  deleteCostBreakdown,
  BreakdownBlockItem,
  SubItem,
} from '@/app/actions/breakdown'
import { getUserProfileState } from '@/app/actions/user'

// ── Paleta Executiva DeuAcordo ──────────────────────────────
const NAVY   = '#0F172A'
const E      = '#10B981'
const MUTED  = '#64748B'
const BORDER = '#E2E8F0'
const SLATE  = '#F8FAFC'
const WHITE  = '#FFFFFF'
const AMBER  = '#F59E0B'
const RED    = '#EF4444'

const ECOSSISTEMA_PRODUTOS = [
  { id: 'deal-desk',    name: 'Deal Desk',     icon: '🤝', active: true,  href: '/dashboard' },
  { id: 'ai-breakdown', name: 'AI Breakdown',  icon: '🤖', active: true,  href: '/dashboard/ai-breakdown' },
  { id: 'auction',      name: 'Auction',       icon: '⚡', active: false, href: '#' },
  { id: 'benchmark',    name: 'Benchmark',     icon: '📊', active: false, href: '#' },
  { id: 'legal',        name: 'Legal',         icon: '⚖️', active: false, href: '#' },
  { id: 'risk',         name: 'Risk',          icon: '🛡️', active: false, href: '#' },
  { id: 'matrix',       name: 'Matrix',        icon: '📐', active: false, href: '#' },
  { id: 'pulse',        name: 'Pulse',         icon: '📈', active: false, href: '#' },
  { id: 'route',        name: 'Route',         icon: '🔀', active: false, href: '#' },
  { id: 'club',         name: 'Club',          icon: '💎', active: false, href: '#' },
  { id: 'academy',      name: 'Academy',       icon: '🎓', active: false, href: '#' },
]

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const BLOCOS_SUGERIDOS = [
  'Matéria-Prima / Insumos',
  'Mão de Obra Direta',
  'Energia / Utilidades',
  'Frete / Logística',
  'Embalagem / Armazenamento',
  'Impostos e Taxas',
]

export default function AiBreakdownPage() {
  const router = useRouter()
  const [user, setUser]               = useState<User | null>(null)
  const [orgId, setOrgId]             = useState<string | null>(null)
  const [breakdowns, setBreakdowns]   = useState<any[]>([])
  const [carregando, setCarregando]   = useState(true)
  const [salvando, setSalvando]       = useState(false)
  const [selectedId, setSelectedId]   = useState<string | null>(null)

  // Estado da Ficha de Produto
  const [productName, setProductName]   = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [markupPercent, setMarkupPercent] = useState('')

  // Blocos e Subitens
  const [blocks, setBlocks] = useState<BreakdownBlockItem[]>([
    {
      id: '1',
      name: 'Matéria-Prima / Insumos',
      currentCost: 0,
      targetCost: 0,
      subItems: []
    },
    { id: '2', name: 'Mão de Obra Direta', currentCost: 0, targetCost: 0, subItems: [] },
    { id: '3', name: 'Energia / Utilidades', currentCost: 0, targetCost: 0, subItems: [] },
  ])

  const [customCategory, setCustomCategory] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('')

  const initData = useCallback(async (uid: string) => {
    try {
      const profile = await getUserProfileState(uid)
      if (profile.success && profile.company) {
        setOrgId(profile.company.id)
        const res = await getBreakdownsByOrganization(profile.company.id)
        if (res.success && res.data) {
          setBreakdowns(res.data)
          if (res.data.length > 0) {
            loadBreakdownIntoForm(res.data[0])
          }
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    async function checkUser() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) {
        router.replace('/login')
        return
      }
      setUser(u)
      await initData(u.id)
    }
    checkUser()
  }, [router, initData])

  function loadBreakdownIntoForm(b: any) {
    setSelectedId(b.id)
    setProductName(b.productName)
    setSellingPrice(String(b.sellingPrice))
    setMarkupPercent(b.currentMarkup ? b.currentMarkup.toFixed(1) : '')
    if (Array.isArray(b.blocks) && b.blocks.length > 0) {
      setBlocks(b.blocks)
    } else {
      setBlocks([])
    }
  }

  function resetForm() {
    setSelectedId(null)
    setProductName('')
    setSellingPrice('')
    setMarkupPercent('')
    setBlocks([
      { id: Date.now().toString() + '1', name: 'Matéria-Prima / Insumos', currentCost: 0, targetCost: 0, subItems: [] },
      { id: Date.now().toString() + '2', name: 'Mão de Obra Direta', currentCost: 0, targetCost: 0, subItems: [] },
      { id: Date.now().toString() + '3', name: 'Energia / Utilidades', currentCost: 0, targetCost: 0, subItems: [] },
    ])
  }

  // Cálculos dinâmicos de Custos
  const curTotalCost = blocks.reduce((acc, b) => {
    if (b.subItems && b.subItems.length > 0) {
      return acc + b.subItems.reduce((sAcc, sub) => sAcc + (sub.totalCost || 0), 0)
    }
    return acc + (b.currentCost || 0)
  }, 0)

  const tarTotalCost = blocks.reduce((acc, b) => acc + (b.targetCost || 0), 0)

  // Alteração no Preço de Venda reflete no Markup
  const handleSellingPriceChange = (val: string) => {
    setSellingPrice(val)
    const price = parseFloat(val) || 0
    if (curTotalCost > 0 && price > 0) {
      const profit = price - curTotalCost
      const mk = (profit / curTotalCost) * 100
      setMarkupPercent(mk.toFixed(1))
    }
  }

  // Alteração no Markup reflete no Preço de Venda
  const handleMarkupChange = (val: string) => {
    setMarkupPercent(val)
    const mk = parseFloat(val) || 0
    if (curTotalCost > 0) {
      const calculatedPrice = curTotalCost * (1 + mk / 100)
      setSellingPrice(calculatedPrice.toFixed(2))
    }
  }

  // Adicionar e Gerenciar Subitens dentro de um Bloco
  function handleAddSubItem(blockId: string) {
    const subName = prompt('Nome do ingrediente/insumo (ex: Queijo, Carne, Pão):')
    if (!subName) return

    const qtyStr = prompt('Quantidade utilizada (ex: 0.02 para 20g se o preço for por kg, ou 1 para un):', '1')
    const unitPriceStr = prompt('Preço por unidade/kg (R$):', '0')

    const qty = parseFloat(qtyStr || '1') || 1
    const unitPrice = parseFloat(unitPriceStr || '0') || 0
    const totalCost = qty * unitPrice

    const newSub: SubItem = {
      id: Date.now().toString(),
      name: subName,
      quantity: qty,
      unitCost: unitPrice,
      totalCost,
    }

    setBlocks(prev =>
      prev.map(b => {
        if (b.id === blockId) {
          const updatedSubItems = [...(b.subItems || []), newSub]
          const newBlockCurrentCost = updatedSubItems.reduce((sum, s) => sum + s.totalCost, 0)
          return {
            ...b,
            subItems: updatedSubItems,
            currentCost: newBlockCurrentCost,
          }
        }
        return b
      })
    )
  }

  function handleRemoveSubItem(blockId: string, subId: string) {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id === blockId) {
          const updatedSubItems = (b.subItems || []).filter(s => s.id !== subId)
          const newBlockCurrentCost = updatedSubItems.reduce((sum, s) => sum + s.totalCost, 0)
          return {
            ...b,
            subItems: updatedSubItems,
            currentCost: newBlockCurrentCost,
          }
        }
        return b
      })
    )
  }

  function handleAddBlock(nameToAdd: string) {
    if (!nameToAdd.trim()) return
    setBlocks(prev => [
      ...prev,
      { id: Date.now().toString(), name: nameToAdd.trim(), currentCost: 0, targetCost: 0, subItems: [] }
    ])
    setCustomCategory('')
    setSelectedPreset('')
  }

  function handleRemoveBlock(id: string) {
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  function handleUpdateBlockValue(id: string, field: 'currentCost' | 'targetCost', value: string) {
    const numericValue = parseFloat(value) || 0
    setBlocks(prev =>
      prev.map(b => (b.id === id ? { ...b, [field]: numericValue } : b))
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) {
      alert('Organização não identificada. Recarregue a página.')
      return
    }

    const price = parseFloat(sellingPrice) || 0
    if (!productName.trim() || price <= 0) {
      alert('Informe o nome do produto e um preço de venda válido.')
      return
    }

    setSalvando(true)

    const res = await saveCostBreakdown({
      id: selectedId || undefined,
      productName: productName.trim(),
      sellingPrice: price,
      blocks,
      organizationId: orgId,
    })

    setSalvando(false)

    if (res.success && res.data) {
      const updated = await getBreakdownsByOrganization(orgId)
      if (updated.success && updated.data) {
        setBreakdowns(updated.data)
        loadBreakdownIntoForm(res.data)
      }
      alert('Breakdown salvo na biblioteca com sucesso!')
    } else {
      alert(res.error || 'Erro ao salvar breakdown.')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja excluir esta análise da sua biblioteca?')) return
    const res = await deleteCostBreakdown(id)
    if (res.success && orgId) {
      const updated = await getBreakdownsByOrganization(orgId)
      if (updated.success && updated.data) {
        setBreakdowns(updated.data)
        if (updated.data.length > 0) loadBreakdownIntoForm(updated.data[0])
        else resetForm()
      }
    }
  }

  const priceNum = parseFloat(sellingPrice) || 0
  const curProfit = priceNum - curTotalCost
  const tarProfit = priceNum - tarTotalCost
  const gapSaving = curTotalCost - tarTotalCost

  const nomeUsuario = (user?.user_metadata?.nome_completo as string | undefined)?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'Usuário'

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: SLATE }}>
        <p style={{ color: MUTED, fontWeight: 600 }}>Carregando DeuAcordo Breakdown...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: SLATE, fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ── SIDEBAR LATERAL FIXA DA PLATAFORMA ────────────────── */}
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
              <Link href="/dashboard/empresa" style={{ textDecoration: 'none' }}>
                <div style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: WHITE, border: `1px solid ${BORDER}`, color: NAVY, fontSize: 13, fontWeight: 600 }}>
                  🏢 Área da Empresa
                </div>
              </Link>
              <Link href="/dashboard/closer" style={{ textDecoration: 'none' }}>
                <div style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: WHITE, border: `1px solid ${BORDER}`, color: NAVY, fontSize: 13, fontWeight: 600 }}>
                  🎯 Cockpit do Closer
                </div>
              </Link>
            </div>

            <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>
              PRODUTOS B2B DEUACORDO
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ECOSSISTEMA_PRODUTOS.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', borderRadius: 8,
                    background: p.id === 'ai-breakdown' ? '#ECFDF5' : 'transparent',
                    border: `1px solid ${p.id === 'ai-breakdown' ? '#A7F3D0' : 'transparent'}`,
                    color: p.id === 'ai-breakdown' ? '#065F46' : NAVY,
                    fontSize: 12.5, fontWeight: p.id === 'ai-breakdown' ? 700 : 500, cursor: p.active ? 'pointer' : 'default'
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
          </div>
        </div>

        <div style={{ padding: '1rem', borderTop: `1px solid ${BORDER}`, background: SLATE, flexShrink: 0, height: 65 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: 0 }}>{nomeUsuario}</p>
          <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>{user?.email}</p>
        </div>
      </aside>

      {/* ── CONTEÚDO PRINCIPAL (DIREITA COM MARGEM) ─────────────── */}
      <div style={{ marginLeft: 270, flex: 1, minHeight: '100vh', padding: '2rem' }}>
        
        {/* Topo / Header da Página */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>
              DeuAcordo Breakdown — Ficha Térmica & Cost Breakdown
            </h1>
            <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>
              Defina os componentes do produto, calcule o markup e acompanhe os targets de custos.
            </p>
          </div>

          <button
            onClick={resetForm}
            style={{ padding: '9px 16px', background: E, border: 'none', borderRadius: 8, color: WHITE, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            + Novo Produto
          </button>
        </div>

        {/* Seletor de Produtos na Biblioteca */}
        {breakdowns.length > 0 && (
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: 10, alignItems: 'center', overflowX: 'auto' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: MUTED, whiteSpace: 'nowrap' }}>Sua Biblioteca:</span>
            {breakdowns.map(b => (
              <button
                key={b.id}
                onClick={() => loadBreakdownIntoForm(b)}
                style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: selectedId === b.id ? NAVY : SLATE,
                  color: selectedId === b.id ? WHITE : NAVY,
                  border: `1px solid ${selectedId === b.id ? NAVY : BORDER}`
                }}
              >
                {b.productName} ({brl(b.sellingPrice)})
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSave}>
          
          {/* Blocos de Entrada Básica + Markup em Tempo Real */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: NAVY, margin: '0 0 1rem', textTransform: 'uppercase' }}>
              1. Precificação do Produto
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 180px', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4 }}>NOME DO PRODUTO *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: X-Salada Especial / Pneu Aro 16"
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4 }}>PREÇO DE VENDA (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={sellingPrice}
                  onChange={e => handleSellingPriceChange(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: E, marginBottom: 4 }}>MARKUP DESEJADO (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 50"
                  value={markupPercent}
                  onChange={e => handleMarkupChange(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#065F46', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Adicionar Novos Blocos */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4 }}>SELECIONAR BLOCO PADRÃO</label>
                <select
                  value={selectedPreset}
                  onChange={e => {
                    setSelectedPreset(e.target.value)
                    if (e.target.value) handleAddBlock(e.target.value)
                  }}
                  style={{ width: '100%', padding: '9px', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12.5 }}
                >
                  <option value="">-- Escolha um bloco pronto --</option>
                  {BLOCOS_SUGERIDOS.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1.5, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4 }}>OU DIGITE UM BLOCO PERSONALIZADO</label>
                  <input
                    type="text"
                    placeholder="Ex: Embalagens, Impostos..."
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    style={{ width: '100%', padding: '9px', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12.5 }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddBlock(customCategory)}
                  disabled={!customCategory.trim()}
                  style={{ padding: '9px 15px', background: customCategory.trim() ? NAVY : BORDER, color: WHITE, border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                >
                  + Adicionar
                </button>
              </div>
            </div>

            {/* Visualização Espelhada (Atual vs Target) com suporte a Subitens */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              
              {/* CUSTO ATUAL (Com botão de Subitens) */}
              <div style={{ background: SLATE, borderRadius: 12, padding: '1.25rem', border: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: NAVY, margin: 0 }}>📊 Cost Breakdown Atual</h4>
                  <span style={{ fontSize: 10, fontWeight: 700, background: WHITE, padding: '2px 8px', borderRadius: 4, color: MUTED }}>CENÁRIO REAL</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {blocks.map(b => (
                    <div key={b.id} style={{ background: WHITE, padding: '10px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{b.name}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleAddSubItem(b.id)}
                            style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}
                          >
                            + Subitem / Ingrediente
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveBlock(b.id)}
                            style={{ background: 'none', border: 'none', color: RED, fontSize: 12, cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Lista de Subitens se existirem */}
                      {b.subItems && b.subItems.length > 0 ? (
                        <div style={{ marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {b.subItems.map(sub => (
                            <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: SLATE, padding: '4px 8px', borderRadius: 4, fontSize: 11 }}>
                              <span>{sub.name} ({sub.quantity} un/kg x {brl(sub.unitCost)})</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, color: NAVY }}>{brl(sub.totalCost)}</span>
                                <button type="button" onClick={() => handleRemoveSubItem(b.id, sub.id)} style={{ color: RED, border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="number" step="0.01" placeholder="0.00"
                          value={b.currentCost || ''}
                          onChange={e => handleUpdateBlockValue(b.id, 'currentCost', e.target.value)}
                          style={{ width: '100%', padding: '8px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12 }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, margin: 0 }}>CUSTO TOTAL</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: NAVY, margin: '2px 0 0' }}>{brl(curTotalCost)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, margin: 0 }}>LUCRO LÍQUIDO</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: curProfit >= 0 ? E : RED, margin: '2px 0 0' }}>{brl(curProfit)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, margin: 0 }}>MARKUP CALCULADO</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: NAVY, margin: '2px 0 0' }}>{markupPercent}%</p>
                  </div>
                </div>
              </div>

              {/* CENÁRIO TARGET */}
              <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '1.25rem', border: `1.5px solid ${E}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: '#065F46', margin: 0 }}>🎯 Cost Breakdown Target</h4>
                  <span style={{ fontSize: 10, fontWeight: 700, background: WHITE, padding: '2px 8px', borderRadius: 4, color: '#047857' }}>ALVO DESEJADO</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {blocks.map(b => (
                    <div key={b.id} style={{ background: WHITE, padding: '10px', borderRadius: 8, border: '1px solid #A7F3D0' }}>
                      <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#065F46', marginBottom: 4 }}>TARGET {b.name.toUpperCase()}</span>
                      <input
                        type="number" step="0.01" placeholder="0.00"
                        value={b.targetCost || ''}
                        onChange={e => handleUpdateBlockValue(b.id, 'targetCost', e.target.value)}
                        style={{ width: '100%', padding: '8px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #A7F3D0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#047857', margin: 0 }}>CUSTO ALVO</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: E, margin: '2px 0 0' }}>{brl(tarTotalCost)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#047857', margin: 0 }}>LUCRO TARGET POTENCIAL</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: tarProfit >= 0 ? E : RED, margin: '2px 0 0' }}>{brl(tarProfit)}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Resumo do GAP */}
          <div style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#065F46', letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0 }}>
                OPORTUNIDADE DE SAVING POTENCIAL DO PRODUTO (GAP)
              </p>
              <p style={{ fontSize: 13, color: '#047857', margin: '3px 0 0' }}>
                Economia acumulada estimada se atingir as metas nos blocos de custo configurados.
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: gapSaving > 0 ? E : MUTED, margin: 0 }}>
                {gapSaving > 0 ? brl(gapSaving) : 'R$ 0,00'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {selectedId ? (
              <button
                type="button"
                onClick={() => handleDelete(selectedId)}
                style={{ padding: '11px 18px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: RED, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Excluir da Biblioteca
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={salvando}
              style={{ padding: '12px 28px', background: E, border: 'none', borderRadius: 8, color: WHITE, fontSize: 14, fontWeight: 800, cursor: salvando ? 'wait' : 'pointer' }}
            >
              {salvando ? 'Salvando...' : 'Salvar na Biblioteca de Produtos'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}