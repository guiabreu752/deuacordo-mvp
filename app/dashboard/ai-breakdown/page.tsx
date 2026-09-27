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

// ── DESIGN SYSTEM B2B DEUACORDO (APPLE / STRIPE STYLE) ──
const DARK_BG     = '#0F172A' // Dark Slate Executivo
const DARK_CARD   = '#1E293B' // Card Slate
const E           = '#10B981' // Verde Neon / Elétrico
const E_LIGHT     = '#ECFDF5' // Esmeralda Soft
const E_BORDER    = '#A7F3D0' // Borda Esmeralda
const MUTED       = '#64748B' // Texto Secundário
const BORDER      = '#E2E8F0' // Borda Suave Light
const SLATE       = '#F8FAFC' // Fundo Geral Light
const WHITE       = '#FFFFFF'
const RED         = '#EF4444'

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

const UNIDADES_MEDIDA = [
  { label: 'Quilograma (kg)', code: 'kg' },
  { label: 'Grama (g)', code: 'g' },
  { label: 'Unidade (un)', code: 'un' },
  { label: 'Litro (L)', code: 'L' },
  { label: 'Mililitro (ml)', code: 'ml' },
  { label: 'Metro (m)', code: 'm' },
  { label: 'Metro Quadrado (m²)', code: 'm²' },
  { label: 'Caixa (cx)', code: 'cx' },
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

interface RawMaterial {
  id: string
  name: string
  price: number
  unit: string // 'kg', 'g', 'un', 'L', etc.
}

export default function AiBreakdownPage() {
  const router = useRouter()
  const [user, setUser]               = useState<User | null>(null)
  const [orgId, setOrgId]             = useState<string | null>(null)
  const [breakdowns, setBreakdowns]   = useState<any[]>([])
  const [carregando, setCarregando]   = useState(true)
  const [salvando, setSalvando]       = useState(false)
  const [selectedId, setSelectedId]   = useState<string | null>(null)

  // 1. Custos Fixos Globais
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([])
  const [newFcName, setNewFcName]   = useState('')
  const [newFcValue, setNewFcValue] = useState('')

  // 2. Banco / Estoque de Matérias-Primas Cadastradas
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [newRmName, setNewRmName]       = useState('')
  const [newRmPrice, setNewRmPrice]     = useState('')
  const [newRmUnit, setNewRmUnit]       = useState('kg')

  // 3. Ficha de Produto & Volume Projetado
  const [productName, setProductName]         = useState('')
  const [sellingPrice, setSellingPrice]       = useState('')
  const [projectedVolume, setProjectedVolume] = useState('1000')
  const [markupPercent, setMarkupPercent]     = useState('')

  // Inline Subitem states (Com suporte a Matéria-Prima Pré-Cadastrada)
  const [activeBlockForSub, setActiveBlockForSub] = useState<string | null>(null)
  const [selectedRmId, setSelectedRmId]         = useState<string>('')
  const [subName, setSubName]                     = useState('')
  const [subQty, setSubQty]                       = useState('1')
  const [subUnit, setSubUnit]                     = useState('g')
  const [calculatedSubCost, setCalculatedSubCost] = useState<number>(0)

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

      // Carregar Custos Fixos
      const savedFC = localStorage.getItem(`deuacordo_fc_${targetOrgId}`)
      if (savedFC) setFixedCosts(JSON.parse(savedFC))
      else setFixedCosts([{ id: '1', name: 'Aluguel & Infraestrutura', value: 1000 }])

      // Carregar Matérias-Primas Cadastradas
      const savedRM = localStorage.getItem(`deuacordo_rm_${targetOrgId}`)
      if (savedRM) setRawMaterials(JSON.parse(savedRM))
      else setRawMaterials([
        { id: '1', name: 'Hambúrguer de Carne 100%', price: 30.00, unit: 'kg' },
        { id: '2', name: 'Queijo Cheddar Fatiado', price: 45.00, unit: 'kg' },
        { id: '3', name: 'Pão Brioche com Gergelim', price: 1.50, unit: 'un' }
      ])

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

  // 🧮 EFEITO PARA CÁLCULO AUTOMÁTICO DO SUBITEM (EX: 200g de Hambúrguer a R$ 30,00/kg = R$ 6,00)
  useEffect(() => {
    const rm = rawMaterials.find(m => m.id === selectedRmId)
    const qty = parseFloat(subQty) || 0

    if (rm) {
      setSubName(rm.name)
      let cost = 0

      // Regra de Conversão de Unidades (kg -> g, L -> ml)
      if (rm.unit === 'kg' && subUnit === 'g') {
        cost = (rm.price / 1000) * qty
      } else if (rm.unit === 'L' && subUnit === 'ml') {
        cost = (rm.price / 1000) * qty
      } else {
        cost = rm.price * qty
      }
      setCalculatedSubCost(cost)
    } else if (subName && !selectedRmId) {
      const unitPrice = parseFloat(subUnit) || 0
      setCalculatedSubCost(qty * unitPrice)
    }
  }, [selectedRmId, subQty, subUnit, rawMaterials, subName])

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

  // 📦 GESTÃO DE MATÉRIAS-PRIMAS CADASTRADAS
  function handleAddRawMaterial() {
    if (!newRmName.trim() || !newRmPrice) return
    const newRm: RawMaterial = {
      id: Date.now().toString(),
      name: newRmName.trim(),
      price: parseFloat(newRmPrice) || 0,
      unit: newRmUnit
    }
    const updated = [...rawMaterials, newRm]
    setRawMaterials(updated)
    if (orgId) localStorage.setItem(`deuacordo_rm_${orgId}`, JSON.stringify(updated))
    setNewRmName('')
    setNewRmPrice('')
  }

  function handleRemoveRawMaterial(id: string) {
    const updated = rawMaterials.filter(rm => rm.id !== id)
    setRawMaterials(updated)
    if (orgId) localStorage.setItem(`deuacordo_rm_${orgId}`, JSON.stringify(updated))
  }

  // 🧮 CÁLCULO DE DILUIÇÃO PONDERADA PELO FATURAMENTO
  const totalFixedCostsGlobal = fixedCosts.reduce((acc, fc) => acc + fc.value, 0)
  
  const livePrice = parseFloat(sellingPrice) || 0
  const liveVol = parseFloat(projectedVolume) || 0
  const liveProjRev = livePrice * liveVol

  let otherProjRev = 0
  breakdowns.forEach(b => {
    if (b.id !== selectedId) {
      const bPrice = parseFloat(b.sellingPrice) || 0
      const bVol = b.projectedVolume ? parseFloat(b.projectedVolume) : 1000
      otherProjRev += (bPrice * bVol)
    }
  })

  const totalProjRev = liveProjRev + otherProjRev
  const currentProductWeight = totalProjRev > 0 ? (liveProjRev / totalProjRev) : (liveProjRev > 0 ? 1 : 0)
  
  const allocatedFixedCost = totalFixedCostsGlobal * currentProductWeight
  const dilutedFixedCostPerUnit = liveVol > 0 ? allocatedFixedCost / liveVol : 0

  // 🧮 CÁLCULOS DO BREAKDOWN
  const variableTotalCost = blocks.reduce((acc, b) => {
    if (b.subItems && b.subItems.length > 0) {
      return acc + b.subItems.reduce((sAcc, sub) => sAcc + (sub.totalCost || 0), 0)
    }
    return acc + (b.currentCost || 0)
  }, 0)

  const variableTarCost = blocks.reduce((acc, b) => acc + (b.targetCost || 0), 0)

  const curTotalCost = variableTotalCost + dilutedFixedCostPerUnit
  const tarTotalCost = variableTarCost + dilutedFixedCostPerUnit

  const handleSellingPriceChange = (val: string) => {
    setSellingPrice(val)
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

  // Subitens Inline
  function handleAddSubItem(blockId: string) {
    if (!subName.trim()) return
    const qty = parseFloat(subQty) || 1

    const newSub: SubItem = {
      id: Date.now().toString(),
      name: `${subName.trim()} (${qty} ${subUnit})`,
      quantity: qty,
      unitCost: calculatedSubCost / qty,
      totalCost: calculatedSubCost,
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

    // Reset formulário do subitem
    setSelectedRmId('')
    setSubName('')
    setSubQty('1')
    setCalculatedSubCost(0)
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: DARK_BG, color: WHITE }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid rgba(255,255,255,0.1)`, borderTopColor: E, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: MUTED, fontWeight: 600, fontSize: 14 }}>Carregando DeuAcordo AI Breakdown...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: SLATE, fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      {/* ── SIDEBAR LATERAL FIXA DSI (DARK EXECUTIVE) ────────────────── */}
      <aside style={{
        width: 270,
        background: DARK_BG,
        borderRight: `1px solid rgba(255,255,255,0.08)`,
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
          <div style={{ padding: '1.5rem 1.5rem 1.25rem', borderBottom: `1px solid rgba(255,255,255,0.08)`, flexShrink: 0 }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <img src="/logo.png" alt="DeuAcordo.com" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
              <span style={{ fontWeight: 800, fontSize: 17, color: WHITE, letterSpacing: '-0.02em' }}>
                DeuAcordo<span style={{ color: E }}>.com</span>
              </span>
            </Link>
          </div>

          <div style={{ padding: '1.25rem 1rem', overflowY: 'auto', flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 8 }}>
              MÓDULOS DEAL DESK
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1.75rem' }}>
              <Link href="/dashboard/empresa" style={{ textDecoration: 'none' }}>
                <div style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: WHITE, fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}>
                  🏢 Área da Empresa
                </div>
              </Link>
              <Link href="/dashboard/closer" style={{ textDecoration: 'none' }}>
                <div style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: WHITE, fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}>
                  🎯 Cockpit do Closer
                </div>
              </Link>
            </div>

            <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 8 }}>
              PRODUTOS B2B DEUACORDO
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ECOSSISTEMA_PRODUTOS.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 8,
                    background: p.id === 'ai-breakdown' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                    border: `1px solid ${p.id === 'ai-breakdown' ? 'rgba(16, 185, 129, 0.3)' : 'transparent'}`,
                    color: p.id === 'ai-breakdown' ? E : '#94A3B8',
                    fontSize: 12.5, fontWeight: p.id === 'ai-breakdown' ? 700 : 500, cursor: p.active ? 'pointer' : 'default',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => p.active && router.push(p.href)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>{p.icon}</span>
                    <span>{p.name}</span>
                  </div>
                  {p.active ? (
                    <span style={{ fontSize: 9, background: E, color: DARK_BG, padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>ATIVO</span>
                  ) : (
                    <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.05)', color: MUTED, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>EM BREVE</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem 1.25rem', borderTop: `1px solid rgba(255,255,255,0.08)`, background: 'rgba(0,0,0,0.2)', flexShrink: 0, height: 65, display: 'flex', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: WHITE, margin: 0 }}>{nomeUsuario}</p>
            <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>{user?.email}</p>
          </div>
        </div>
      </aside>

      {/* ── CONTEÚDO PRINCIPAL DE ALTA PERFORMANCE ────────────────── */}
      <div style={{ marginLeft: 270, flex: 1, minHeight: '100vh', padding: '2.5rem 3rem' }}>
        
        {/* CABEÇALHO DA PÁGINA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, border: '1px solid #A7F3D0' }}>
                ENGINE B2B DE PRECIFICAÇÃO E DILUIÇÃO
              </span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: DARK_BG, margin: 0, letterSpacing: '-0.03em' }}>
              DeuAcordo Breakdown — Gestão de Insumos & Custos Fixos
            </h1>
            <p style={{ fontSize: 13, color: MUTED, margin: '4px 0 0' }}>
              Cadastre suas matérias-primas e custos fixos para simular breakdowns com cálculo automático de unidades e markup real.
            </p>
          </div>

          <button
            type="button"
            onClick={resetForm}
            style={{ padding: '10px 18px', background: DARK_BG, border: 'none', borderRadius: 10, color: WHITE, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(15,23,42,0.15)', transition: 'all 0.2s' }}
          >
            + Novo Produto
          </button>
        </div>

        {/* 📦 ÁREA 1: BANCO DE MATÉRIAS-PRIMAS CADASTRADAS */}
        <div style={{ 
          background: WHITE, 
          border: `1px solid ${BORDER}`, 
          borderRadius: 16, 
          padding: '1.5rem 2rem', 
          marginBottom: '1.75rem', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: DARK_BG, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                1. Estoque de Matérias-Primas & Insumos Pré-Cadastrados
              </h3>
              <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>
                Cadastre aqui seus insumos base (Preço/Unidade) para selecioná-los via lista suspensa durante o breakdown.
              </p>
            </div>
            <span style={{ background: SLATE, color: DARK_BG, border: `1px solid ${BORDER}`, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              {rawMaterials.length} Insumos Cadastrados
            </span>
          </div>

          {/* Form para Adicionar Insumo */}
          <div style={{ background: SLATE, border: `1px solid ${BORDER}`, padding: '12px 16px', borderRadius: 12, marginBottom: '1.25rem', display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text" placeholder="Nome do Insumo (ex: Hambúrguer, Aço, Malha...)" value={newRmName} onChange={e => setNewRmName(e.target.value)}
              style={{ flex: 1.5, padding: '9px 12px', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12.5, color: DARK_BG, outline: 'none' }}
            />
            <input
              type="number" step="0.01" placeholder="Custo (R$)" value={newRmPrice} onChange={e => setNewRmPrice(e.target.value)}
              style={{ width: 110, padding: '9px 12px', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12.5, color: DARK_BG, outline: 'none' }}
            />
            <select
              value={newRmUnit} onChange={e => setNewRmUnit(e.target.value)}
              style={{ width: 150, padding: '9px 12px', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12.5, color: DARK_BG }}
            >
              {UNIDADES_MEDIDA.map(u => (
                <option key={u.code} value={u.code}>{u.label}</option>
              ))}
            </select>
            <button
              type="button" onClick={handleAddRawMaterial}
              style={{ padding: '9px 18px', background: E, color: WHITE, border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}
            >
              + Salvar Insumo
            </button>
          </div>

          {/* Lista em Grid de Insumos Cadastrados */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {rawMaterials.map(rm => (
              <div key={rm.id} style={{ background: SLATE, border: `1px solid ${BORDER}`, padding: '8px 12px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: DARK_BG }}>{rm.name}</span>
                  <span style={{ fontSize: 11, color: MUTED }}>{brl(rm.price)} / {rm.unit}</span>
                </div>
                <button type="button" onClick={() => handleRemoveRawMaterial(rm.id)} style={{ background: 'none', border: 'none', color: RED, cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* 🏢 ÁREA 2: CUSTOS FIXOS (DARK APPLE GLASS) */}
        <div style={{ 
          background: `linear-gradient(135deg, ${DARK_BG} 0%, ${DARK_CARD} 100%)`, 
          borderRadius: 16, 
          padding: '1.5rem 2rem', 
          marginBottom: '1.75rem', 
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', position: 'relative', zIndex: 1 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: WHITE, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                2. Custos Fixos Mensais da Empresa (Rateio Ponderado)
              </h3>
              <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>
                Estes custos são diluídos entre todos os seus produtos proporcionalmente ao faturamento projetado de cada um.
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', color: WHITE, padding: '6px 14px', borderRadius: 30, fontSize: 12, fontWeight: 700 }}>
              Total Mensal: <span style={{ color: E, marginLeft: 6, fontSize: 14 }}>{brl(totalFixedCostsGlobal)}</span>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 110, overflowY: 'auto', paddingRight: 6 }}>
              {fixedCosts.map(fc => (
                <div key={fc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', padding: '7px 12px', borderRadius: 8 }}>
                  <span style={{ fontSize: 12.5, color: WHITE, fontWeight: 600 }}>{fc.name}</span>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: E, fontWeight: 700 }}>{brl(fc.value)}</span>
                    <button type="button" onClick={() => handleRemoveFixedCost(fc.id)} style={{ background: 'none', border: 'none', color: RED, cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ display: 'block', fontSize: 10, fontWeight: 800, color: MUTED, marginBottom: 6, textTransform: 'uppercase' }}>+ Cadastrar Custo Fixo</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text" placeholder="Ex: Aluguel" value={newFcName} onChange={e => setNewFcName(e.target.value)}
                  style={{ flex: 1, padding: '7px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: WHITE, fontSize: 12, outline: 'none' }}
                />
                <input
                  type="number" step="0.01" placeholder="R$ 0,00" value={newFcValue} onChange={e => setNewFcValue(e.target.value)}
                  style={{ width: 100, padding: '7px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: WHITE, fontSize: 12, outline: 'none' }}
                />
                <button type="button" onClick={handleAddFixedCost} style={{ background: E, color: DARK_BG, border: 'none', padding: '0 12px', borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>+ Add</button>
              </div>
            </div>
          </div>
        </div>

        {/* ÁREA 3: FORMULÁRIO PRINCIPAL E CÁLCULOS */}
        <form onSubmit={handleSave}>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '1.5rem 2rem', marginBottom: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: DARK_BG, margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              3. Ficha de Precificação do Produto
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: DARK_BG, marginBottom: 6 }}>NOME DO PRODUTO *</label>
                <input
                  type="text" required placeholder="Ex: X-Salada Especial / Produto B2B"
                  value={productName} onChange={e => setProductName(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, color: DARK_BG, fontWeight: 600, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: DARK_BG, marginBottom: 6 }}>VENDAS/MÊS (QTD)</label>
                <input
                  type="number" required placeholder="Ex: 1000"
                  value={projectedVolume} onChange={e => setProjectedVolume(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, color: DARK_BG, fontWeight: 600, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: DARK_BG, marginBottom: 6 }}>PREÇO VENDA (R$)</label>
                <input
                  type="number" step="0.01" placeholder="0.00"
                  value={sellingPrice} onChange={e => handleSellingPriceChange(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, color: DARK_BG, fontWeight: 700, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: E, marginBottom: 6 }}>MARKUP REAL (%)</label>
                <input
                  type="number" step="0.1" placeholder="Ex: 50"
                  value={markupPercent} onChange={e => handleMarkupChange(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', background: E_LIGHT, border: `1px solid ${E_BORDER}`, borderRadius: 10, fontSize: 13, fontWeight: 800, color: '#065F46', outline: 'none' }}
                />
              </div>
            </div>
            
            <div style={{ marginTop: '1.25rem', padding: '10px 14px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11.5, color: MUTED, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>💡</span>
              <span>
                <strong>Inteligência de Rateio:</strong> Com faturamento projetado de <strong>{brl(liveProjRev)}</strong>, este produto absorve <strong>{brl(dilutedFixedCostPerUnit)}/unidade</strong> dos custos fixos mensais da empresa.
              </span>
            </div>
          </div>

          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '1.5rem 2rem', marginBottom: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: DARK_BG, margin: '0 0 1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              4. Construtor de Cost Breakdown (Custos Variáveis)
            </h3>
            
            <div style={{ background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: 14, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: DARK_BG, marginBottom: 6 }}>SELECIONAR BLOCO PADRÃO</label>
                <select
                  value={selectedPreset}
                  onChange={e => {
                    setSelectedPreset(e.target.value)
                    if (e.target.value) handleAddBlock(e.target.value)
                  }}
                  style={{ width: '100%', padding: '10px', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: DARK_BG, fontWeight: 500 }}
                >
                  <option value="">-- Escolha um bloco pronto --</option>
                  {BLOCOS_SUGERIDOS.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1.5, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: DARK_BG, marginBottom: 6 }}>OU NOME DO BLOCO PERSONALIZADO</label>
                  <input
                    type="text"
                    placeholder="Ex: Embalagens, Impostos..."
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: DARK_BG }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddBlock(customCategory)}
                  disabled={!customCategory.trim()}
                  style={{ padding: '10px 18px', background: customCategory.trim() ? DARK_BG : BORDER, color: WHITE, border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                >
                  + Adicionar
                </button>
              </div>
            </div>

            {/* VISUALIZAÇÃO DE CENÁRIOS (ATUAL VS TARGET) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem' }}>
              
              {/* CENÁRIO ATUAL */}
              <div style={{ background: SLATE, borderRadius: 14, padding: '1.5rem', border: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: DARK_BG, margin: 0 }}>📊 Cost Breakdown Atual</h4>
                  <span style={{ fontSize: 10, fontWeight: 800, background: WHITE, border: `1px solid ${BORDER}`, padding: '3px 10px', borderRadius: 20, color: MUTED }}>CENÁRIO REAL</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {blocks.map(b => (
                    <div key={b.id} style={{ background: WHITE, padding: '14px', borderRadius: 10, border: `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        {editingBlockId === b.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="text" value={editingBlockName} onChange={e => setEditingBlockName(e.target.value)}
                              style={{ padding: '4px 8px', fontSize: 12, border: `1px solid ${BORDER}`, borderRadius: 6 }}
                            />
                            <button type="button" onClick={() => saveBlockName(b.id)} style={{ background: E, color: WHITE, border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Salvar</button>
                            <button type="button" onClick={() => setEditingBlockId(null)} style={{ background: MUTED, color: WHITE, border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>✕</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: DARK_BG }}>{b.name}</span>
                            <button type="button" onClick={() => { setEditingBlockId(b.id); setEditingBlockName(b.name) }} style={{ background: 'none', border: 'none', fontSize: 11, color: MUTED, cursor: 'pointer' }}>✏️</button>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button" onClick={() => setActiveBlockForSub(activeBlockForSub === b.id ? null : b.id)}
                            style={{ background: E_LIGHT, border: `1px solid ${E_BORDER}`, color: '#065F46', fontSize: 10, fontWeight: 800, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                          >
                            + Subitem
                          </button>
                          <button type="button" onClick={() => handleRemoveBlock(b.id)} style={{ background: 'none', border: 'none', color: RED, fontSize: 12, cursor: 'pointer' }}>✕</button>
                        </div>
                      </div>

                      {/* Lista de Subitens Adicionados */}
                      {b.subItems && b.subItems.length > 0 && (
                        <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {b.subItems.map(sub => (
                            <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: SLATE, padding: '7px 12px', borderRadius: 6, fontSize: 11.5 }}>
                              <span><strong>{sub.name}</strong></span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontWeight: 800, color: DARK_BG }}>{brl(sub.totalCost)}</span>
                                <button type="button" onClick={() => handleRemoveSubItem(b.id, sub.id)} style={{ color: RED, border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* FORMULÁRIO DE SUBITEM COM SELEÇÃO DE INSUMO DA LISTA SUSPENSA */}
                      {activeBlockForSub === b.id && (
                        <div style={{ background: E_LIGHT, border: `1px solid ${E_BORDER}`, borderRadius: 8, padding: '12px', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>Selecionar Insumo Pré-Cadastrado</span>
                          
                          <select
                            value={selectedRmId}
                            onChange={e => setSelectedRmId(e.target.value)}
                            style={{ padding: '8px', fontSize: 12, border: `1px solid ${BORDER}`, borderRadius: 6, background: WHITE, color: DARK_BG, fontWeight: 600 }}
                          >
                            <option value="">-- Escolha da lista de matérias-primas --</option>
                            {rawMaterials.map(rm => (
                              <option key={rm.id} value={rm.id}>{rm.name} ({brl(rm.price)}/{rm.unit})</option>
                            ))}
                          </select>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px', gap: 8, alignItems: 'center' }}>
                            <input
                              type="text" placeholder="Ou digite o nome do insumo livre" value={subName} onChange={e => { setSubName(e.target.value); setSelectedRmId('') }}
                              style={{ padding: '7px', fontSize: 11.5, border: `1px solid ${BORDER}`, borderRadius: 6, background: WHITE }}
                            />
                            <input
                              type="number" step="0.001" placeholder="Qtd" value={subQty} onChange={e => setSubQty(e.target.value)}
                              style={{ padding: '7px', fontSize: 11.5, border: `1px solid ${BORDER}`, borderRadius: 6, background: WHITE }}
                            />
                            <select
                              value={subUnit} onChange={e => setSubUnit(e.target.value)}
                              style={{ padding: '7px', fontSize: 11.5, border: `1px solid ${BORDER}`, borderRadius: 6, background: WHITE }}
                            >
                              <option value="g">grama (g)</option>
                              <option value="kg">quilo (kg)</option>
                              <option value="un">unidade (un)</option>
                              <option value="ml">mililitro (ml)</option>
                              <option value="L">litro (L)</option>
                            </select>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#065F46' }}>
                              Custo Calculado: <strong style={{ fontSize: 13, color: DARK_BG }}>{brl(calculatedSubCost)}</strong>
                            </span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button type="button" onClick={() => setActiveBlockForSub(null)} style={{ padding: '4px 10px', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>Cancelar</button>
                              <button type="button" onClick={() => handleAddSubItem(b.id)} style={{ padding: '4px 12px', background: E, color: WHITE, border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>Adicionar no Bloco</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {(!b.subItems || b.subItems.length === 0) && (
                        <input
                          type="number" step="0.01" placeholder="0.00"
                          value={b.currentCost || ''}
                          onChange={e => handleUpdateBlockValue(b.id, 'currentCost', e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, color: DARK_BG, fontWeight: 600 }}
                        />
                      )}
                    </div>
                  ))}

                  {/* BLOCO FIXO DILUÍDO */}
                  <div style={{ background: WHITE, padding: '14px', borderRadius: 10, border: '1.5px dashed #CBD5E1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: DARK_BG }}>🏢 Custo Fixo Diluído / un</span>
                      <p style={{ fontSize: 10, color: MUTED, margin: '2px 0 0' }}>Alocado: {brl(allocatedFixedCost)}</p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: DARK_BG }}>+ {brl(dilutedFixedCostPerUnit)}</span>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, margin: 0 }}>CUSTO UNIT. TOTAL</p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: DARK_BG, margin: '3px 0 0' }}>{brl(curTotalCost)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, margin: 0 }}>LUCRO LÍQUIDO</p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: curProfit >= 0 ? E : RED, margin: '3px 0 0' }}>{brl(curProfit)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, margin: 0 }}>MARKUP REAL</p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: DARK_BG, margin: '3px 0 0' }}>{markupPercent}%</p>
                  </div>
                </div>
              </div>

              {/* CENÁRIO TARGET */}
              <div style={{ background: E_LIGHT, borderRadius: 14, padding: '1.5rem', border: `1.5px solid ${E}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: '#065F46', margin: 0 }}>🎯 Cost Breakdown Target</h4>
                  <span style={{ fontSize: 10, fontWeight: 800, background: WHITE, padding: '3px 10px', borderRadius: 20, color: '#047857' }}>ALVO DESEJADO</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {blocks.map(b => (
                    <div key={b.id} style={{ background: WHITE, padding: '14px', borderRadius: 10, border: '1px solid #A7F3D0' }}>
                      <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#065F46', marginBottom: 6 }}>TARGET {b.name.toUpperCase()}</span>
                      <input
                        type="number" step="0.01" placeholder="0.00"
                        value={b.targetCost || ''}
                        onChange={e => handleUpdateBlockValue(b.id, 'targetCost', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, color: DARK_BG, fontWeight: 600 }}
                      />
                    </div>
                  ))}

                  <div style={{ background: '#ECFDF5', padding: '14px', borderRadius: 10, border: '1.5px dashed #6EE7B7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#065F46' }}>🏢 Fixo Diluído (Inalterável)</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#065F46' }}>+ {brl(dilutedFixedCostPerUnit)}</span>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #A7F3D0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#047857', margin: 0 }}>CUSTO ALVO TOTAL</p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: E, margin: '3px 0 0' }}>{brl(tarTotalCost)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#047857', margin: 0 }}>LUCRO TARGET</p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: tarProfit >= 0 ? E : RED, margin: '3px 0 0' }}>{brl(tarProfit)}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* BANNER GAP DE SAVING */}
          <div style={{ background: E_LIGHT, border: `1.5px solid ${E_BORDER}`, borderRadius: 16, padding: '1.25rem 2rem', marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#065F46', letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0 }}>
                OPORTUNIDADE DE SAVING POTENCIAL (GAP UNITÁRIO)
              </p>
              <p style={{ fontSize: 13, color: '#047857', margin: '3px 0 0' }}>
                Economia acumulada estimada por unidade se atingir as metas configuradas nos blocos.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 26, fontWeight: 800, color: gapSaving > 0 ? E : MUTED, margin: 0 }}>
                {gapSaving > 0 ? brl(gapSaving) : 'R$ 0,00'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
            {selectedId ? (
              <button
                type="button" onClick={() => handleDelete(selectedId)}
                style={{ padding: '12px 20px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: RED, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Excluir da Biblioteca
              </button>
            ) : <div />}

            <button
              type="submit" disabled={salvando}
              style={{ padding: '14px 32px', background: E, border: 'none', borderRadius: 10, color: DARK_BG, fontSize: 14, fontWeight: 800, cursor: salvando ? 'wait' : 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
            >
              {salvando ? 'Salvando...' : 'Salvar na Biblioteca de Produtos'}
            </button>
          </div>
        </form>

        {/* ÁREA 4: OUTPUT & BIBLIOTECA DE PRODUTOS (COM BOTÃO DE EDITAR DELIBERADO) */}
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '1.75rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: DARK_BG, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                5. Biblioteca de Produtos (Portfólio Consolidado)
              </h3>
              <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                Faturamento Total Projetado da Empresa: <strong>{brl(totalProjRev)}</strong>
              </p>
            </div>
          </div>

          {breakdowns.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', background: SLATE, borderRadius: 12, border: `1.5px dashed ${BORDER}` }}>
              <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Nenhum produto salvo na biblioteca ainda.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {breakdowns.map(b => {
                const isSelected = selectedId === b.id
                const bVol = b.projectedVolume ? parseFloat(b.projectedVolume) : 1000
                const bRev = (parseFloat(b.sellingPrice) || 0) * bVol
                const bWeight = totalProjRev > 0 ? (bRev / totalProjRev) : 0
                
                return (
                  <div
                    key={b.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 18px', borderRadius: 12,
                      background: isSelected ? E_LIGHT : SLATE,
                      border: `1.5px solid ${isSelected ? E : BORDER}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: DARK_BG, margin: '0 0 4px' }}>
                        {b.productName} <span style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>({bVol} un/mês)</span>
                      </p>
                      <div style={{ display: 'flex', gap: 18, fontSize: 12, color: MUTED }}>
                        <span>Preço Venda: <strong style={{ color: DARK_BG }}>{brl(b.sellingPrice)}</strong></span>
                        <span>Faturamento Proj.: <strong style={{ color: DARK_BG }}>{brl(bRev)}</strong></span>
                        <span>Peso Rateio: <strong style={{ color: DARK_BG }}>{(bWeight * 100).toFixed(1)}%</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '5px 12px', background: WHITE, borderRadius: 20, border: `1px solid ${BORDER}`, color: DARK_BG }}>
                        {b.currentMarkup ? `${b.currentMarkup.toFixed(1)}% Markup` : '—'}
                      </span>

                      {/* BOTÃO DELIBERADO PARA EDITAR NO PAINEL SUPERIOR */}
                      <button
                        type="button"
                        onClick={() => loadBreakdownIntoForm(b)}
                        style={{ padding: '6px 14px', background: DARK_BG, color: WHITE, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        ✏️ Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(b.id)}
                        style={{ background: 'none', border: 'none', color: RED, fontSize: 14, cursor: 'pointer', padding: '4px 8px' }}
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