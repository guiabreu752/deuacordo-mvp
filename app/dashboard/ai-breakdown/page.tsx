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

const NAVY   = '#0F172A'
const E      = '#10B981'
const MUTED  = '#64748B'
const BORDER = '#E2E8F0'
const SLATE  = '#F8FAFC'
const WHITE  = '#FFFFFF'
const RED    = '#EF4444'

const ECOSSISTEMA_PRODUTOS = [
  { id: 'deal-desk',    name: 'Deal Desk',     icon: '🤝', active: true,  href: '/dashboard' },
  { id: 'ai-breakdown', name: 'AI Breakdown',  icon: '🤖', active: true,  href: '/dashboard/ai-breakdown' },
  { id: 'auction',      name: 'Auction',       icon: '⚡', active: false, href: '#' },
  { id: 'benchmark',    name: 'Benchmark',     icon: '📊', active: false, href: '#' },
  { id: 'legal',        name: 'Legal',         icon: '⚖️', active: false, href: '#' },
  { id: 'risk',         name: 'Risk',          icon: '🛡️', active: false, href: '#' },
  { id: 'matrix',       name: 'Matrix',        icon: '📐', active: false, href: '#' },
  { id: 'pulse',        name: 'Pulse',         icon: '📈', active: true,  href: '/pulse' },
  { id: 'route',        name: 'Route',         icon: '🔀', active: false, href: '#' },
  { id: 'club',         name: 'Club',          icon: '💎', active: false, href: '#' },
  { id: 'academy',      name: 'Academy',       icon: '🎓', active: true,  href: '/academy' },
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

interface FixedCost {
  id: string
  name: string
  value: number
}

export default function AiBreakdownPage() {
  const router = useRouter()
  const [user, setUser]               = useState<User | null>(null)
  const [orgId, setOrgId]             = useState<string | null>(null)
  const [breakdowns, setBreakdowns]   = useState<any[]>([])
  const [carregando, setCarregando]   = useState(true)
  const [salvando, setSalvando]       = useState(false)
  const [selectedId, setSelectedId]   = useState<string | null>(null)

  // 1. Custos Fixos Globais da Empresa
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([])
  const [newFcName, setNewFcName] = useState('')
  const [newFcValue, setNewFcValue] = useState('')

  // 2. Ficha de Produto & Volume Projetado
  const [productName, setProductName]     = useState('')
  const [sellingPrice, setSellingPrice]   = useState('')
  const [projectedVolume, setProjectedVolume] = useState('1000') // Volume padrão
  const [markupPercent, setMarkupPercent] = useState('')

  // Inline Subitem states
  const [activeBlockForSub, setActiveBlockForSub] = useState<string | null>(null)
  const [subName, setSubName]                     = useState('')
  const [subQty, setSubQty]                       = useState('1')
  const [subUnitCost, setSubUnitCost]             = useState('')

  // Inline Block Renaming
  const [editingBlockId, setEditingBlockId]     = useState<string | null>(null)
  const [editingBlockName, setEditingBlockName] = useState('')

  // Blocos Variáveis
  const [blocks, setBlocks] = useState<BreakdownBlockItem[]>([
    { id: '1', name: 'Matéria-Prima / Insumos', currentCost: 0, targetCost: 0, subItems: [] },
    { id: '2', name: 'Mão de Obra Direta', currentCost: 0, targetCost: 0, subItems: [] },
  ])

  const [customCategory, setCustomCategory] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('')

  const initData = useCallback(async (uid: string) => {
    try {
      setCarregando(true)
      const profile = await getUserProfileState(uid)
      let targetOrgId = profile.success && profile.company ? profile.company.id : null
      if (!targetOrgId) targetOrgId = uid
      setOrgId(targetOrgId)

      // Carregar Custos Fixos salvos localmente por Organização (MVP)
      const savedFC = localStorage.getItem(`deuacordo_fc_${targetOrgId}`)
      if (savedFC) setFixedCosts(JSON.parse(savedFC))
      else setFixedCosts([{ id: '1', name: 'Aluguel / Estrutura', value: 1000 }])

      const res = await getBreakdownsByOrganization(targetOrgId)
      if (res.success && res.data) {
        setBreakdowns(res.data)
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
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
    setProjectedVolume(b.projectedVolume ? String(b.projectedVolume) : '1000')
    setMarkupPercent(b.currentMarkup ? b.currentMarkup.toFixed(1) : '')
    if (Array.isArray(b.blocks)) {
      setBlocks(b.blocks)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setSelectedId(null)
    setProductName('')
    setSellingPrice('')
    setProjectedVolume('1000')
    setMarkupPercent('')
    setBlocks([
      { id: Date.now().toString() + '1', name: 'Matéria-Prima / Insumos', currentCost: 0, targetCost: 0, subItems: [] },
      { id: Date.now().toString() + '2', name: 'Mão de Obra Direta', currentCost: 0, targetCost: 0, subItems: [] },
    ])
  }

  // 🧮 GESTÃO DE CUSTOS FIXOS
  function handleAddFixedCost() {
    if (!newFcName.trim() || !newFcValue) return
    const newFc: FixedCost = {
      id: Date.now().toString(),
      name: newFcName.trim(),
      value: parseFloat(newFcValue) || 0
    }
    const updated = [...fixedCosts, newFc]
    setFixedCosts(updated)
    if (orgId) localStorage.setItem(`deuacordo_fc_${orgId}`, JSON.stringify(updated))
    setNewFcName('')
    setNewFcValue('')
  }

  function handleRemoveFixedCost(id: string) {
    const updated = fixedCosts.filter(fc => fc.id !== id)
    setFixedCosts(updated)
    if (orgId) localStorage.setItem(`deuacordo_fc_${orgId}`, JSON.stringify(updated))
  }

  // 🧮 CÁLCULO DE DILUIÇÃO PONDERADA
  const totalFixedCostsGlobal = fixedCosts.reduce((acc, fc) => acc + fc.value, 0)
  
  const livePrice = parseFloat(sellingPrice) || 0
  const liveVol = parseFloat(projectedVolume) || 0
  const liveProjRev = livePrice * liveVol

  // Calcula Faturamento Total da Biblioteca + Faturamento do Produto Atual (Live)
  let otherProjRev = 0
  breakdowns.forEach(b => {
    if (b.id !== selectedId) {
      const bPrice = parseFloat(b.sellingPrice) || 0
      const bVol = b.projectedVolume ? parseFloat(b.projectedVolume) : 1000
      otherProjRev += (bPrice * bVol)
    }
  })

  const totalProjRev = liveProjRev + otherProjRev
  // O peso do produto atual no faturamento total da empresa
  const currentProductWeight = totalProjRev > 0 ? (liveProjRev / totalProjRev) : (liveProjRev > 0 ? 1 : 0)
  
  // O valor total de custo fixo que recai sobre ESTE produto
  const allocatedFixedCost = totalFixedCostsGlobal * currentProductWeight
  // Custo fixo por unidade deste produto
  const dilutedFixedCostPerUnit = liveVol > 0 ? allocatedFixedCost / liveVol : 0

  // 🧮 CÁLCULOS DO BREAKDOWN
  const variableTotalCost = blocks.reduce((acc, b) => {
    if (b.subItems && b.subItems.length > 0) {
      return acc + b.subItems.reduce((sAcc, sub) => sAcc + (sub.totalCost || 0), 0)
    }
    return acc + (b.currentCost || 0)
  }, 0)

  const variableTarCost = blocks.reduce((acc, b) => acc + (b.targetCost || 0), 0)

  // Custo Total = Variável + Fixo Diluído
  const curTotalCost = variableTotalCost + dilutedFixedCostPerUnit
  const tarTotalCost = variableTarCost + dilutedFixedCostPerUnit

  // Sincronização Bidirecional de Preço e Markup
  const handleSellingPriceChange = (val: string) => {
    setSellingPrice(val)
    // O recalculo do Markup ocorre naturalmente no render abaixo, 
    // mas se precisarmos forçar a exibição instantânea:
    const price = parseFloat(val) || 0
    if (curTotalCost > 0 && price > 0) {
      const profit = price - curTotalCost
      const mk = (profit / curTotalCost) * 100
      setMarkupPercent(mk.toFixed(1))
    }
  }

  const handleMarkupChange = (val: string) => {
    setMarkupPercent(val)
    const mk = parseFloat(val) || 0
    if (curTotalCost > 0) {
      const calculatedPrice = curTotalCost * (1 + mk / 100)
      setSellingPrice(calculatedPrice.toFixed(2))
    }
  }

  // ── SUBITENS INLINE ──
  function handleAddSubItem(blockId: string) {
    if (!subName.trim()) return
    const qty = parseFloat(subQty) || 1
    const unitCost = parseFloat(subUnitCost) || 0
    const totalCost = qty * unitCost

    const newSub: SubItem = {
      id: Date.now().toString(),
      name: subName.trim(),
      quantity: qty,
      unitCost: unitCost,
      totalCost,
    }

    setBlocks(prev =>
      prev.map(b => {
        if (b.id === blockId) {
          const updatedSub = [...(b.subItems || []), newSub]
          const newBlockCost = updatedSub.reduce((sum, s) => sum + s.totalCost, 0)
          return { ...b, subItems: updatedSub, currentCost: newBlockCost }
        }
        return b
      })
    )

    setSubName('')
    setSubQty('1')
    setSubUnitCost('')
    setActiveBlockForSub(null)
  }

  function handleRemoveSubItem(blockId: string, subId: string) {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id === blockId) {
          const updatedSub = (b.subItems || []).filter(s => s.id !== subId)
          const newBlockCost = updatedSub.reduce((sum, s) => sum + s.totalCost, 0)
          return { ...b, subItems: updatedSub, currentCost: newBlockCost }
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

  function saveBlockName(id: string) {
    if (!editingBlockName.trim()) return
    setBlocks(prev =>
      prev.map(b => (b.id === id ? { ...b, name: editingBlockName.trim() } : b))
    )
    setEditingBlockId(null)
    setEditingBlockName('')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const activeOrgId = orgId || user?.id
    if (!activeOrgId) {
      alert('Sessão expirada. Faça login novamente.')
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
      projectedVolume: liveVol,
      blocks,
      organizationId: activeOrgId,
    } as any)

    setSalvando(false)

    if (res.success && res.data) {
      const updated = await getBreakdownsByOrganization(activeOrgId)
      if (updated.success && updated.data) {
        setBreakdowns(updated.data)
        loadBreakdownIntoForm(res.data)
      }
      alert('Breakdown salvo na biblioteca de produtos com sucesso!')
    } else {
      alert(res.error || 'Erro ao salvar breakdown.')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja excluir esta análise da sua biblioteca?')) return
    const activeOrgId = orgId || user?.id
    const res = await deleteCostBreakdown(id)
    if (res.success && activeOrgId) {
      const updated = await getBreakdownsByOrganization(activeOrgId)
      if (updated.success && updated.data) {
        setBreakdowns(updated.data)
        if (selectedId === id) resetForm()
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
      
      {/* ── SIDEBAR LATERAL FIXA ────────────────── */}
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

      {/* ── CONTEÚDO PRINCIPAL (DUAS ÁREAS) ────────────────── */}
      <div style={{ marginLeft: 270, flex: 1, minHeight: '100vh', padding: '2rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>
              DeuAcordo Breakdown — Inteligência de Custos & Diluição
            </h1>
            <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>
              Gerencie seus custos fixos corporativos e calcule margens reais ponderadas por faturamento projetado.
            </p>
          </div>

          <button
            type="button"
            onClick={resetForm}
            style={{ padding: '9px 16px', background: E, border: 'none', borderRadius: 8, color: WHITE, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            + Novo Produto
          </button>
        </div>

        {/* 🏢 ÁREA 1: GESTÃO DE CUSTOS FIXOS */}
        <div style={{ background: NAVY, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: WHITE, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. Custos Fixos Mensais da Empresa (Rateio Global)
            </h3>
            <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', color: WHITE, padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
              Total: <span style={{ color: E, marginLeft: 4 }}>{brl(totalFixedCostsGlobal)}</span>
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Lista de Custos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto', paddingRight: 8 }}>
              {fixedCosts.length === 0 && <span style={{ fontSize: 12, color: MUTED }}>Nenhum custo fixo cadastrado.</span>}
              {fixedCosts.map(fc => (
                <div key={fc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 6 }}>
                  <span style={{ fontSize: 12, color: WHITE, fontWeight: 600 }}>{fc.name}</span>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: E, fontWeight: 700 }}>{brl(fc.value)}</span>
                    <button type="button" onClick={() => handleRemoveFixedCost(fc.id)} style={{ background: 'none', border: 'none', color: RED, cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Adicionar Novo Custo Fixo */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.2)' }}>
              <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: MUTED, marginBottom: 8, textTransform: 'uppercase' }}>+ Adicionar Custo Fixo</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text" placeholder="Ex: Aluguel" value={newFcName} onChange={e => setNewFcName(e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: WHITE, fontSize: 12, outline: 'none' }}
                />
                <input
                  type="number" step="0.01" placeholder="R$ 0,00" value={newFcValue} onChange={e => setNewFcValue(e.target.value)}
                  style={{ width: 100, padding: '6px 10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: WHITE, fontSize: 12, outline: 'none' }}
                />
                <button type="button" onClick={handleAddFixedCost} style={{ background: E, color: WHITE, border: 'none', padding: '0 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Add</button>
              </div>
            </div>
          </div>
        </div>

        {/* ÁREA 2: CONSTRUTOR FLUIDO DE PRODUTOS */}
        <form onSubmit={handleSave}>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: NAVY, margin: '0 0 1rem', textTransform: 'uppercase' }}>
              2. Ficha de Precificação do Produto
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px 140px', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4 }}>NOME DO PRODUTO *</label>
                <input
                  type="text" required placeholder="Ex: Hambúrguer Artesanal"
                  value={productName} onChange={e => setProductName(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4 }}>VENDAS/MÊS (QTD)</label>
                <input
                  type="number" required placeholder="Ex: 1000"
                  value={projectedVolume} onChange={e => setProjectedVolume(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4 }}>PREÇO VENDA (R$)</label>
                <input
                  type="number" step="0.01" placeholder="0.00"
                  value={sellingPrice} onChange={e => handleSellingPriceChange(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: E, marginBottom: 4 }}>MARKUP (%)</label>
                <input
                  type="number" step="0.1" placeholder="Ex: 50"
                  value={markupPercent} onChange={e => handleMarkupChange(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#065F46', outline: 'none' }}
                />
              </div>
            </div>
            
            <div style={{ marginTop: 12, padding: '8px 12px', background: SLATE, borderRadius: 6, fontSize: 11, color: MUTED }}>
              💡 <strong>Inteligência:</strong> O sistema utiliza o <em>Faturamento Projetado</em> deste produto ({brl(liveProjRev)}) 
              para identificar que ele representa <strong>{(currentProductWeight * 100).toFixed(2)}%</strong> do seu negócio, diluindo exatamente <strong>{brl(dilutedFixedCostPerUnit)}/un</strong> dos seus custos fixos totais nesta precificação.
            </div>
          </div>

          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: NAVY, margin: '0 0 1rem', textTransform: 'uppercase' }}>
              3. Construtor de Cost Breakdown (Variáveis)
            </h3>
            <div style={{ background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4 }}>ADICIONAR BLOCO PADRÃO</label>
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
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4 }}>OU BLOCO PERSONALIZADO</label>
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

            {/* Visualização de Cenários (Atual vs Target) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              
              {/* CUSTO ATUAL COM SUBITENS INLINE */}
              <div style={{ background: SLATE, borderRadius: 12, padding: '1.25rem', border: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: NAVY, margin: 0 }}>📊 Cost Breakdown Atual</h4>
                  <span style={{ fontSize: 10, fontWeight: 700, background: WHITE, padding: '2px 8px', borderRadius: 4, color: MUTED }}>CENÁRIO REAL</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {blocks.map(b => (
                    <div key={b.id} style={{ background: WHITE, padding: '12px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        {/* Edição Inline de Nome do Grupo */}
                        {editingBlockId === b.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="text"
                              value={editingBlockName}
                              onChange={e => setEditingBlockName(e.target.value)}
                              style={{ padding: '4px 6px', fontSize: 12, border: `1px solid ${BORDER}`, borderRadius: 4 }}
                            />
                            <button type="button" onClick={() => saveBlockName(b.id)} style={{ background: E, color: WHITE, border: 'none', padding: '4px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Salvar</button>
                            <button type="button" onClick={() => setEditingBlockId(null)} style={{ background: MUTED, color: WHITE, border: 'none', padding: '4px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>✕</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{b.name}</span>
                            <button
                              type="button"
                              onClick={() => { setEditingBlockId(b.id); setEditingBlockName(b.name) }}
                              style={{ background: 'none', border: 'none', fontSize: 11, color: MUTED, cursor: 'pointer' }}
                            >
                              ✏️
                            </button>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => setActiveBlockForSub(activeBlockForSub === b.id ? null : b.id)}
                            style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}
                          >
                            + Subitem
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

                      {/* Lista de Subitens */}
                      {b.subItems && b.subItems.length > 0 && (
                        <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {b.subItems.map(sub => (
                            <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: SLATE, padding: '6px 10px', borderRadius: 6, fontSize: 11 }}>
                              <span><strong>{sub.name}</strong> ({sub.quantity} un/kg × {brl(sub.unitCost)})</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 700, color: NAVY }}>{brl(sub.totalCost)}</span>
                                <button type="button" onClick={() => handleRemoveSubItem(b.id, sub.id)} style={{ color: RED, border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Formulário Inline Expansível para Subitens */}
                      {activeBlockForSub === b.id && (
                        <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 6, padding: '8px', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>Novo Subitem / Ingrediente</span>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 75px 85px', gap: 6 }}>
                            <input
                              type="text"
                              placeholder="Nome (ex: Queijo)"
                              value={subName}
                              onChange={e => setSubName(e.target.value)}
                              style={{ padding: '6px', fontSize: 11, border: `1px solid ${BORDER}`, borderRadius: 4 }}
                            />
                            <input
                              type="number"
                              step="0.001"
                              placeholder="Qtd"
                              value={subQty}
                              onChange={e => setSubQty(e.target.value)}
                              style={{ padding: '6px', fontSize: 11, border: `1px solid ${BORDER}`, borderRadius: 4 }}
                            />
                            <input
                              type="number"
                              step="0.01"
                              placeholder="R$/un"
                              value={subUnitCost}
                              onChange={e => setSubUnitCost(e.target.value)}
                              style={{ padding: '6px', fontSize: 11, border: `1px solid ${BORDER}`, borderRadius: 4 }}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            <button type="button" onClick={() => setActiveBlockForSub(null)} style={{ padding: '3px 8px', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>Cancelar</button>
                            <button type="button" onClick={() => handleAddSubItem(b.id)} style={{ padding: '3px 10px', background: E, color: WHITE, border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Adicionar</button>
                          </div>
                        </div>
                      )}

                      {(!b.subItems || b.subItems.length === 0) && (
                        <input
                          type="number" step="0.01" placeholder="0.00"
                          value={b.currentCost || ''}
                          onChange={e => handleUpdateBlockValue(b.id, 'currentCost', e.target.value)}
                          style={{ width: '100%', padding: '8px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12 }}
                        />
                      )}
                    </div>
                  ))}

                  {/* BLOCO ESPECIAL: CUSTOS FIXOS DILUÍDOS */}
                  <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: 8, border: '1.5px dashed #CBD5E1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: NAVY }}>🏢 Custo Fixo Diluído / un</span>
                      <p style={{ fontSize: 10, color: MUTED, margin: '2px 0 0' }}>Alocado: {brl(allocatedFixedCost)} ({ (currentProductWeight * 100).toFixed(1) }% do total)</p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: NAVY }}>+ {brl(dilutedFixedCostPerUnit)}</span>
                  </div>

                </div>

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, margin: 0 }}>CUSTO UNIT. TOTAL</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: NAVY, margin: '2px 0 0' }}>{brl(curTotalCost)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, margin: 0 }}>LUCRO LÍQUIDO</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: curProfit >= 0 ? E : RED, margin: '2px 0 0' }}>{brl(curProfit)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, margin: 0 }}>MARKUP REAL</p>
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
                    <div key={b.id} style={{ background: WHITE, padding: '12px', borderRadius: 8, border: '1px solid #A7F3D0' }}>
                      <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#065F46', marginBottom: 4 }}>TARGET {b.name.toUpperCase()}</span>
                      <input
                        type="number" step="0.01" placeholder="0.00"
                        value={b.targetCost || ''}
                        onChange={e => handleUpdateBlockValue(b.id, 'targetCost', e.target.value)}
                        style={{ width: '100%', padding: '8px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                  ))}

                  {/* BLOCO ESPECIAL: CUSTOS FIXOS DILUÍDOS TARGET */}
                  <div style={{ background: '#ECFDF5', padding: '12px', borderRadius: 8, border: '1.5px dashed #6EE7B7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#065F46' }}>🏢 Fixo Diluído (Inalterável)</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#065F46' }}>+ {brl(dilutedFixedCostPerUnit)}</span>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #A7F3D0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#047857', margin: 0 }}>CUSTO ALVO TOTAL</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: E, margin: '2px 0 0' }}>{brl(tarTotalCost)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#047857', margin: 0 }}>LUCRO TARGET</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: tarProfit >= 0 ? E : RED, margin: '2px 0 0' }}>{brl(tarProfit)}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* GAP DE SAVING */}
          <div style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#065F46', letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0 }}>
                OPORTUNIDADE DE SAVING POTENCIAL (GAP UNITÁRIO)
              </p>
              <p style={{ fontSize: 13, color: '#047857', margin: '3px 0 0' }}>
                Redução direta no custo variável estimada se atingir as metas configuradas.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: gapSaving > 0 ? E : MUTED, margin: 0 }}>
                {gapSaving > 0 ? brl(gapSaving) : 'R$ 0,00'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
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
              style={{ padding: '12px 28px', background: E, border: 'none', borderRadius: 8, color: WHITE, fontSize: 14, fontWeight: 800, cursor: salvando ? 'wait' : 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
            >
              {salvando ? 'Salvando...' : 'Salvar na Biblioteca de Produtos'}
            </button>
          </div>
        </form>

        {/* ÁREA 4: OUTPUT & BIBLIOTECA DE PRODUTOS */}
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: NAVY, margin: '0 0 4px', textTransform: 'uppercase' }}>
                4. Biblioteca de Produtos (Portfólio Consolidado)
              </h3>
              <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                Faturamento Total Projetado da Empresa: <strong>{brl(totalProjRev)}</strong>
              </p>
            </div>
          </div>

          {breakdowns.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: SLATE, borderRadius: 10, border: `1.5px dashed ${BORDER}` }}>
              <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Nenhum produto salvo na biblioteca ainda.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {breakdowns.map(b => {
                const isSelected = selectedId === b.id
                const bVol = b.projectedVolume ? parseFloat(b.projectedVolume) : 1000
                const bRev = (parseFloat(b.sellingPrice) || 0) * bVol
                const bWeight = totalProjRev > 0 ? (bRev / totalProjRev) : 0
                
                return (
                  <div
                    key={b.id}
                    onClick={() => loadBreakdownIntoForm(b)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                      background: isSelected ? '#F0FDF4' : SLATE,
                      border: `1.5px solid ${isSelected ? E : BORDER}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: NAVY, margin: '0 0 2px' }}>{b.productName} <span style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>({bVol} un/mês)</span></p>
                      <div style={{ display: 'flex', gap: 15, fontSize: 12, color: MUTED }}>
                        <span>Preço: <strong style={{ color: NAVY }}>{brl(b.sellingPrice)}</strong></span>
                        <span>Faturamento: <strong style={{ color: NAVY }}>{brl(bRev)}</strong></span>
                        <span>Peso: <strong style={{ color: NAVY }}>{(bWeight * 100).toFixed(1)}%</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', background: WHITE, borderRadius: 6, border: `1px solid ${BORDER}`, color: NAVY }}>
                        {b.currentMarkup ? `${b.currentMarkup.toFixed(1)}% Markup` : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleDelete(b.id) }}
                        style={{ background: 'none', border: 'none', color: RED, fontSize: 13, cursor: 'pointer', padding: '4px 8px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}