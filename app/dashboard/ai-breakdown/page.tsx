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

// ── DESIGN SYSTEM B2B DEUACORDO (TOKENS EXECUTIVOS) ──
const TOKENS = {
  bgApp: '#020617',
  bgSidebar: '#0F172A',
  bgCard: '#1E293B',
  bgCardElevated: '#334155',
  primary: '#10B981', // Verde Neon / Elétrico
  primaryHover: '#059669',
  primaryLight: 'rgba(16, 185, 129, 0.1)',
  textMain: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#334155',
  borderLight: '#475569',
  danger: '#EF4444',
  dangerLight: 'rgba(239, 68, 68, 0.1)',
}

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
  { label: 'kg', code: 'kg' },
  { label: 'g', code: 'g' },
  { label: 'un', code: 'un' },
  { label: 'L', code: 'L' },
  { label: 'ml', code: 'ml' },
  { label: 'm', code: 'm' },
  { label: 'h', code: 'h' },
  { label: 'cx', code: 'cx' },
]

const brl = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(n) ? 0 : n)

const pct = (n: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(isNaN(n) ? 0 : n) + '%'

const BLOCOS_SUGERIDOS = [
  'Matéria-Prima / Insumos',
  'Mão de Obra Direta & Encargos',
  'Energia / Utilidades Industriais',
  'Frete / Logística / Armazenagem',
  'Embalagens & Rótulos',
  'Impostos Faturados (PIS/COFINS/ICMS)',
  'Serviços Terceirizados / Usinagem'
]

interface FixedCost { id: string; name: string; value: number }
interface RawMaterial { id: string; name: string; price: number; unit: string }
interface DetailedSubItem extends SubItem { scrapRate?: number; notes?: string }

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

  // 2. Banco de Insumos / Matérias-Primas
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [newRmName, setNewRmName]       = useState('')
  const [newRmPrice, setNewRmPrice]     = useState('')
  const [newRmUnit]                     = useState('kg')

  // 3. Ficha de Produto & Tributação (Edição Ativa)
  const [productName, setProductName]         = useState('')
  const [sellingPrice, setSellingPrice]       = useState('')
  const [projectedVolume, setProjectedVolume] = useState('100')
  const [markupPercent, setMarkupPercent]     = useState('')
  const [taxRateOnSales, setTaxRateOnSales]   = useState('0')

  // Estado do Form de Subitens
  const [selectedRmId, setSelectedRmId]         = useState<string>('')
  const [subName, setSubName]                     = useState('')
  const [subQty, setSubQty]                       = useState('1')
  const [subUnit, setSubUnit]                     = useState('g')
  const [subScrapRate, setSubScrapRate]           = useState('0')
  const [calculatedSubCost, setCalculatedSubCost] = useState<number>(0)

  const [editingBlockId, setEditingBlockId]     = useState<string | null>(null)
  const [editingBlockName, setEditingBlockName] = useState('')

  // Blocos de Custo
  const [blocks, setBlocks] = useState<BreakdownBlockItem[]>([
    { id: '1', name: 'Matéria-Prima / Insumos', currentCost: 0, targetCost: 0, subItems: [] },
    { id: '2', name: 'Mão de Obra Direta & Encargos', currentCost: 0, targetCost: 0, subItems: [] },
  ])

  const [customCategory, setCustomCategory] = useState('')

  const initData = useCallback(async (uid: string) => {
    try {
      setCarregando(true)
      const profile = await getUserProfileState(uid)
      let targetOrgId = profile.success && profile.company ? profile.company.id : null
      if (!targetOrgId) targetOrgId = uid
      setOrgId(targetOrgId)

      const savedFC = localStorage.getItem(`deuacordo_fc_${targetOrgId}`)
      if (savedFC) setFixedCosts(JSON.parse(savedFC))
      else setFixedCosts([{ id: '1', name: 'Sede Administrativa / Infraestrutura', value: 8500 }])

      const savedRM = localStorage.getItem(`deuacordo_rm_${targetOrgId}`)
      if (savedRM) setRawMaterials(JSON.parse(savedRM))
      else setRawMaterials([
        { id: '1', name: 'Aço Inox 304 (Chapa)', price: 28.50, unit: 'kg' },
        { id: '2', name: 'Mão de Obra Operador CNC', price: 45.00, unit: 'h' },
        { id: '3', name: 'Embalagem Reforçada', price: 3.20, unit: 'un' }
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
      if (!u) { router.replace('/login'); return }
      setUser(u)
      await initData(u.id)
    }
    checkUser()
  }, [router, initData])

  useEffect(() => {
    const rm = rawMaterials.find(m => m.id === selectedRmId)
    const qty = parseFloat(subQty) || 0
    const scrapPct = parseFloat(subScrapRate) || 0
    let baseCost = 0

    if (rm) {
      setSubName(rm.name)
      if (rm.unit === 'kg' && subUnit === 'g') baseCost = (rm.price / 1000) * qty
      else if (rm.unit === 'L' && subUnit === 'ml') baseCost = (rm.price / 1000) * qty
      else baseCost = rm.price * qty
    } else if (subName && !selectedRmId) {
      const unitPrice = parseFloat(subUnit) || 0
      baseCost = qty * unitPrice
    }

    setCalculatedSubCost(baseCost * (1 + scrapPct / 100))
  }, [selectedRmId, subQty, subUnit, subScrapRate, rawMaterials, subName])

  // CORREÇÃO DEFINTIVA: Carregamento do volume gravado da ficha técnica
  function loadBreakdownIntoForm(b: any) {
    setSelectedId(b.id)
    setProductName(b.productName || '')
    setSellingPrice(b.sellingPrice !== undefined && b.sellingPrice !== null ? String(b.sellingPrice) : '')
    
    const parsedVol = b.projectedVolume !== undefined && b.projectedVolume !== null ? String(b.projectedVolume) : '100'
    setProjectedVolume(parsedVol)
    
    setMarkupPercent(b.currentMarkup ? b.currentMarkup.toFixed(1) : '')
    if (Array.isArray(b.blocks)) setBlocks(b.blocks)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setSelectedId(null)
    setProductName('')
    setSellingPrice('')
    setProjectedVolume('100')
    setMarkupPercent('')
    setTaxRateOnSales('0')
    setBlocks([
      { id: Date.now().toString() + '1', name: 'Matéria-Prima / Insumos', currentCost: 0, targetCost: 0, subItems: [] },
      { id: Date.now().toString() + '2', name: 'Mão de Obra Direta & Encargos', currentCost: 0, targetCost: 0, subItems: [] },
    ])
  }

  const persistFC = (data: FixedCost[]) => { setFixedCosts(data); if (orgId) localStorage.setItem(`deuacordo_fc_${orgId}`, JSON.stringify(data)) }
  const persistRM = (data: RawMaterial[]) => { setRawMaterials(data); if (orgId) localStorage.setItem(`deuacordo_rm_${orgId}`, JSON.stringify(data)) }

  function handleAddFixedCost() {
    if (!newFcName.trim() || !newFcValue) return
    persistFC([...fixedCosts, { id: Date.now().toString(), name: newFcName.trim(), value: parseFloat(newFcValue) || 0 }])
    setNewFcName(''); setNewFcValue('')
  }

  function handleRemoveFixedCost(id: string) { persistFC(fixedCosts.filter(fc => fc.id !== id)) }

  function handleAddRawMaterial() {
    if (!newRmName.trim() || !newRmPrice) return
    persistRM([...rawMaterials, { id: Date.now().toString(), name: newRmName.trim(), price: parseFloat(newRmPrice) || 0, unit: newRmUnit }])
    setNewRmName(''); setNewRmPrice('')
  }

  function handleRemoveRawMaterial(id: string) { persistRM(rawMaterials.filter(rm => rm.id !== id)) }

  // 🧮 CÁLCULOS FINANCEIROS DO PRODUTO ATIVO NO FORMULÁRIO
  const totalFixedCostsGlobal = fixedCosts.reduce((acc, fc) => acc + fc.value, 0)
  const livePrice = parseFloat(sellingPrice) || 0
  const liveVol   = Math.max(parseFloat(projectedVolume) || 0, 1)
  const taxPct    = parseFloat(taxRateOnSales) || 0
  
  const taxAmountPerUnit = livePrice * (taxPct / 100)
  const liveProjRev = livePrice * liveVol

  let otherProjRev = 0
  breakdowns.forEach(b => {
    if (b.id !== selectedId) {
      const bPrice = parseFloat(b.sellingPrice) || 0
      const bVol = b.projectedVolume ? parseFloat(b.projectedVolume) : 100
      otherProjRev += (bPrice * bVol)
    }
  })

  const totalProjRev = liveProjRev + otherProjRev
  const currentProductWeight = totalProjRev > 0 ? (liveProjRev / totalProjRev) : (liveProjRev > 0 ? 1 : 0)
  const allocatedFixedCost = totalFixedCostsGlobal * (currentProductWeight || 1)
  const dilutedFixedCostPerUnit = liveVol > 0 ? allocatedFixedCost / liveVol : 0

  const variableTotalCost = blocks.reduce((acc, b) => {
    if (b.subItems && b.subItems.length > 0) {
      return acc + b.subItems.reduce((sAcc, sub) => sAcc + (sub.totalCost || 0), 0)
    }
    return acc + (b.currentCost || 0)
  }, 0)

  const curTotalCost = variableTotalCost + dilutedFixedCostPerUnit + taxAmountPerUnit

  // 📊 CONSOLIDAÇÃO FIXA DO PORTFÓLIO COMPLETO PARA O DASHBOARD INICIAL
  const portfolioTotalRev = breakdowns.reduce((acc, b) => {
    const p = parseFloat(b.sellingPrice) || 0
    const v = parseFloat(b.projectedVolume) || 100
    return acc + (p * v)
  }, 0)

  const portfolioTotalVol = breakdowns.reduce((acc, b) => acc + (parseFloat(b.projectedVolume) || 100), 0)

  // Variáveis Fixo-Consolidadas do Portfólio Geral
  const portfolioAvgPrice = breakdowns.length > 0 ? portfolioTotalRev / (portfolioTotalVol || 1) : 0
  const portfolioUnitCost = portfolioTotalVol > 0 ? (totalFixedCostsGlobal / portfolioTotalVol) : 0
  const portfolioProfit = portfolioAvgPrice - portfolioUnitCost
  const portfolioMarginPct = portfolioAvgPrice > 0 ? ((portfolioProfit / portfolioAvgPrice) * 100) : 0
  const portfolioBreakEven = portfolioAvgPrice > 0 ? Math.ceil(totalFixedCostsGlobal / portfolioAvgPrice) : 0

  // As métricas do dashboard agora exibem consistentemente o portfólio consolidado
  const displayRevenue = portfolioTotalRev
  const displayPrice = portfolioAvgPrice
  const displayVolume = portfolioTotalVol
  const displayUnitCost = portfolioUnitCost
  const displayProfit = portfolioProfit
  const displayMarginPct = portfolioMarginPct
  const displayBreakEven = portfolioBreakEven

  const handleSellingPriceChange = (val: string) => {
    setSellingPrice(val)
    const price = parseFloat(val) || 0
    if (curTotalCost > 0 && price > 0) {
      const profit = price - curTotalCost
      setMarkupPercent(((profit / curTotalCost) * 100).toFixed(1))
    }
  }

  const handleMarkupChange = (val: string) => {
    setMarkupPercent(val)
    const mk = parseFloat(val) || 0
    const baseCostBeforeTax = variableTotalCost + dilutedFixedCostPerUnit
    if (baseCostBeforeTax > 0) {
      const calculatedPrice = (baseCostBeforeTax * (1 + mk / 100)) / (1 - taxPct / 100 || 1)
      setSellingPrice(calculatedPrice.toFixed(2))
    }
  }

  function handleAddSubItem(blockId: string) {
    if (!subName.trim()) return
    const qty = parseFloat(subQty) || 1
    const scrap = parseFloat(subScrapRate) || 0
    const newSub: DetailedSubItem = {
      id: Date.now().toString(),
      name: `${subName.trim()} (${qty} ${subUnit})`,
      quantity: qty,
      unitCost: calculatedSubCost / (qty || 1),
      totalCost: calculatedSubCost,
      scrapRate: scrap
    }

    setBlocks(prev => prev.map(b => {
      if (b.id === blockId) {
        const updatedSub = [...(b.subItems || []), newSub]
        return { ...b, subItems: updatedSub, currentCost: updatedSub.reduce((sum, s) => sum + s.totalCost, 0) }
      }
      return b
    }))

    setSelectedRmId(''); setSubName(''); setSubQty('1'); setSubScrapRate('0'); setCalculatedSubCost(0)
  }

  function handleRemoveSubItem(blockId: string, subId: string) {
    setBlocks(prev => prev.map(b => {
      if (b.id === blockId) {
        const updatedSub = (b.subItems || []).filter(s => s.id !== subId)
        return { ...b, subItems: updatedSub, currentCost: updatedSub.reduce((sum, s) => sum + s.totalCost, 0) }
      }
      return b
    }))
  }

  function handleAddBlock(nameToAdd: string) {
    if (!nameToAdd.trim()) return
    setBlocks(prev => [...prev, { id: Date.now().toString(), name: nameToAdd.trim(), currentCost: 0, targetCost: 0, subItems: [] }])
    setCustomCategory('')
  }

  function handleRemoveBlock(id: string) { setBlocks(prev => prev.filter(b => b.id !== id)) }

  // CORREÇÃO CRÍTICA DO SALVAMENTO: Envia o volume dinâmico digitado para o Supabase
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const activeOrgId = orgId || user?.id
    if (!activeOrgId) return alert('Sessão expirada. Faça login novamente.')
    const price = parseFloat(sellingPrice) || 0
    if (!productName.trim() || price <= 0) return alert('Informe o nome do produto e um preço de venda válido.')

    const volToSave = parseFloat(projectedVolume) || 100

    setSalvando(true)
    const res = await saveCostBreakdown({
      id: selectedId || undefined,
      productName: productName.trim(),
      sellingPrice: price,
      projectedVolume: volToSave,
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
      alert('Breakdown e volume gravados com sucesso!')
    } else alert(res.error || 'Erro ao salvar breakdown.')
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja excluir esta análise?')) return
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

  const nomeUsuario = (user?.user_metadata?.nome_completo as string | undefined)?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Executivo'

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: TOKENS.bgApp, color: TOKENS.textMain }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${TOKENS.border}`, borderTopColor: TOKENS.primary, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: TOKENS.textMuted, fontWeight: 600, fontSize: 14 }}>Carregando Inteligência de Custos...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
        
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: ${TOKENS.bgApp}; color: ${TOKENS.textMain}; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: ${TOKENS.bgApp}; }
        ::-webkit-scrollbar-thumb { background: ${TOKENS.border}; border-radius: 4px; }

        .card { background: ${TOKENS.bgCard}; border: 1px solid ${TOKENS.border}; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); }
        .card-header { padding: 20px 24px; border-bottom: 1px solid ${TOKENS.border}; }
        .card-body { padding: 24px; }
        
        .input-b2b { background: ${TOKENS.bgApp}; border: 1px solid ${TOKENS.border}; color: ${TOKENS.textMain}; border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 500; outline: none; transition: all 0.2s; width: 100%; }
        .input-b2b:focus { border-color: ${TOKENS.primary}; box-shadow: 0 0 0 1px ${TOKENS.primary}; }
        
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; padding: 10px 16px; border: none; }
        .btn-primary { background: ${TOKENS.primary}; color: ${TOKENS.bgApp}; }
        .btn-primary:hover { background: ${TOKENS.primaryHover}; transform: translateY(-1px); }
        .btn-outline { background: transparent; border: 1px solid ${TOKENS.border}; color: ${TOKENS.textMain}; }
        .btn-outline:hover { background: ${TOKENS.bgCardElevated}; border-color: ${TOKENS.borderLight}; }
        .btn-ghost { background: transparent; color: ${TOKENS.textMuted}; padding: 6px 10px; }
        .btn-ghost:hover { background: ${TOKENS.bgCardElevated}; color: ${TOKENS.textMain}; }
        .btn-danger { background: ${TOKENS.dangerLight}; color: ${TOKENS.danger}; border: 1px solid rgba(239, 68, 68, 0.2); }

        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .kpi-card { background: ${TOKENS.bgApp}; border: 1px solid ${TOKENS.border}; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden; }
        .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: ${TOKENS.border}; }
        .kpi-card.positive::before { background: ${TOKENS.primary}; }
        .kpi-card.negative::before { background: ${TOKENS.danger}; }

        .bom-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .bom-table th { text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 700; color: ${TOKENS.textMuted}; border-bottom: 1px solid ${TOKENS.border}; text-transform: uppercase; letter-spacing: 0.05em; }
        .bom-table td { padding: 10px 12px; font-size: 13px; color: ${TOKENS.textMain}; border-bottom: 1px solid ${TOKENS.borderLight}; }
        .bom-table tr:last-child td { border-bottom: none; }
        
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        
        {/* SIDEBAR LATERAL */}
        <aside style={{ width: 280, background: TOKENS.bgSidebar, borderRight: `1px solid ${TOKENS.border}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, zIndex: 100 }}>
          <div style={{ padding: '24px', borderBottom: `1px solid ${TOKENS.border}` }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <img src="/logo.png" alt="Logo" style={{ height: 28, objectFit: 'contain' }} onError={(e) => e.currentTarget.style.display = 'none'} />
              <span style={{ fontWeight: 800, fontSize: 18, color: TOKENS.textMain, letterSpacing: '-0.02em' }}>
                DeuAcordo<span style={{ color: TOKENS.primary }}>.com</span>
              </span>
            </Link>
          </div>

          <div style={{ padding: '24px 16px', overflowY: 'auto', flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: TOKENS.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 8 }}>Finance & Supply</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ECOSSISTEMA_PRODUTOS.map(p => (
                <div key={p.id} onClick={() => p.active && router.push(p.href)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: p.id === 'ai-breakdown' ? TOKENS.primaryLight : 'transparent', color: p.id === 'ai-breakdown' ? TOKENS.primary : TOKENS.textMuted, fontSize: 13, fontWeight: p.id === 'ai-breakdown' ? 700 : 500, cursor: p.active ? 'pointer' : 'default', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 16 }}>{p.icon}</span><span>{p.name}</span></div>
                  {p.active ? p.id === 'ai-breakdown' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: TOKENS.primary }} /> : <span style={{ fontSize: 9, background: TOKENS.border, color: TOKENS.textMuted, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>SOON</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '16px 24px', borderTop: `1px solid ${TOKENS.border}`, background: 'rgba(0,0,0,0.2)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: TOKENS.textMain, margin: 0 }}>{nomeUsuario}</p>
            <p style={{ fontSize: 11, color: TOKENS.textMuted, margin: 0 }}>CFO / Supply Director</p>
          </div>
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <div style={{ marginLeft: 280, flex: 1, padding: '40px 48px' }}>
          
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ background: TOKENS.primaryLight, color: TOKENS.primary, fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost Engineering & Margin Intelligence</span>
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>DeuAcordo Breakdown</h1>
              <p style={{ fontSize: 14, color: TOKENS.textMuted, margin: '8px 0 0', maxWidth: 600 }}>Decomposição técnica de insumos, custeio de absorção e inteligência de margem em tempo real para tomada de decisão B2B.</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={resetForm} className="btn btn-outline">+ Novo Breakdown</button>
              <button type="button" onClick={handleSave} disabled={salvando} className="btn btn-primary">{salvando ? 'Processando...' : 'Salvar no Portfólio'}</button>
            </div>
          </header>

          {/* DASHBOARD DE KPIs CONSOLIDADO DO PORTFÓLIO */}
          <section className="card" style={{ marginBottom: '32px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 15, margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: TOKENS.primary }}>⚡</span> Painel de Viabilidade & Margem Real (Consolidado)
              </h2>
              <span style={{ fontSize: 12, color: TOKENS.textMuted }}>Portfólio Completo ({breakdowns.length} Produtos)</span>
            </div>
            <div className="card-body">
              <div className="kpi-grid">
                <div className="kpi-card">
                  <span style={{ fontSize: 11, fontWeight: 700, color: TOKENS.textMuted, textTransform: 'uppercase' }}>Faturamento Proj. Total</span>
                  <p className="font-mono" style={{ fontSize: 24, fontWeight: 800, color: TOKENS.textMain, margin: '8px 0 4px' }}>{brl(displayRevenue)}</p>
                  <span style={{ fontSize: 12, color: TOKENS.textMuted }}>{displayVolume.toLocaleString('pt-BR')} un/mês no portfólio</span>
                </div>
                
                <div className="kpi-card">
                  <span style={{ fontSize: 11, fontWeight: 700, color: TOKENS.textMuted, textTransform: 'uppercase' }}>Ticket Médio Geral</span>
                  <p className="font-mono" style={{ fontSize: 24, fontWeight: 800, color: TOKENS.textMain, margin: '8px 0 4px' }}>{brl(displayPrice)}</p>
                  <span style={{ fontSize: 12, color: TOKENS.textMuted }}>Preço Médio Ponderado</span>
                </div>

                <div className={`kpi-card ${displayMarginPct >= 0 ? 'positive' : 'negative'}`}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: TOKENS.textMuted, textTransform: 'uppercase' }}>Margem Médi do Portfólio</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 4px' }}>
                    <p className="font-mono" style={{ fontSize: 24, fontWeight: 800, color: displayMarginPct >= 0 ? TOKENS.primary : TOKENS.danger, margin: 0 }}>{pct(displayMarginPct)}</p>
                  </div>
                  <span style={{ fontSize: 12, color: TOKENS.textMuted }}>{brl(displayProfit)} / unidade</span>
                </div>

                <div className="kpi-card">
                  <span style={{ fontSize: 11, fontWeight: 700, color: TOKENS.textMuted, textTransform: 'uppercase' }}>Custo Médio Unitário</span>
                  <p className="font-mono" style={{ fontSize: 24, fontWeight: 800, color: TOKENS.textMain, margin: '8px 0 4px' }}>{brl(displayUnitCost)}</p>
                  <span style={{ fontSize: 12, color: TOKENS.textMuted }}>Com Absorção Fixo</span>
                </div>

                <div className="kpi-card">
                  <span style={{ fontSize: 11, fontWeight: 700, color: TOKENS.textMuted, textTransform: 'uppercase' }}>Break-Even Global</span>
                  <p className="font-mono" style={{ fontSize: 24, fontWeight: 800, color: TOKENS.textMain, margin: '8px 0 4px' }}>{displayBreakEven.toLocaleString('pt-BR')} un</p>
                  <span style={{ fontSize: 12, color: TOKENS.textMuted }}>Volume para Cobrir OPEX Fixo</span>
                </div>
              </div>
            </div>
          </section>

          {/* FORMULÁRIOS DE ENTRADA */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
            
            {/* PARÂMETROS COMERCIAIS */}
            <section className="card">
              <div className="card-header"><h2 style={{ fontSize: 15, margin: 0, fontWeight: 700 }}>1. Parâmetros Comerciais & Tributários</h2></div>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TOKENS.textMuted, marginBottom: 8 }}>Nome do Produto / SKU *</label>
                  <input type="text" className="input-b2b" placeholder="Ex: Peça Mecânica CNC 01" value={productName} onChange={e => setProductName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TOKENS.textMuted, marginBottom: 8 }}>Preço de Venda (R$)</label>
                  <input type="number" step="0.01" className="input-b2b" placeholder="0.00" value={sellingPrice} onChange={e => handleSellingPriceChange(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TOKENS.textMuted, marginBottom: 8 }}>Markup Aplicado (%)</label>
                  <input type="number" step="0.1" className="input-b2b" style={{ borderColor: TOKENS.primary, color: TOKENS.primary }} value={markupPercent} onChange={e => handleMarkupChange(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TOKENS.textMuted, marginBottom: 8 }}>Vendas/Mês Projetada (un/mês)</label>
                  <input type="number" min="1" className="input-b2b" value={projectedVolume} onChange={e => setProjectedVolume(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TOKENS.textMuted, marginBottom: 8 }}>Impostos Faturados (%)</label>
                  <input type="number" step="0.1" className="input-b2b" value={taxRateOnSales} onChange={e => setTaxRateOnSales(e.target.value)} />
                </div>
              </div>
            </section>

            {/* CUSTOS FIXOS */}
            <section className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 15, margin: 0, fontWeight: 700 }}>2. Estrutura de Custos Fixos (OPEX)</h2>
                <span style={{ fontSize: 12, background: TOKENS.bgCardElevated, padding: '4px 10px', borderRadius: 12, fontWeight: 700 }}>Total Fixo: <span style={{ color: TOKENS.primary }}>{brl(totalFixedCostsGlobal)}</span></span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" className="input-b2b" placeholder="Descrição (Ex: Aluguel Galpão)" value={newFcName} onChange={e => setNewFcName(e.target.value)} />
                  <input type="number" className="input-b2b" style={{ width: 120 }} placeholder="R$ Mensal" value={newFcValue} onChange={e => setNewFcValue(e.target.value)} />
                  <button type="button" className="btn btn-outline" onClick={handleAddFixedCost}>+ Add</button>
                </div>
                <div style={{ overflowY: 'auto', maxHeight: '180px', background: TOKENS.bgApp, borderRadius: 8, border: `1px solid ${TOKENS.border}` }}>
                  {fixedCosts.map(fc => (
                    <div key={fc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${TOKENS.border}` }}>
                      <span style={{ fontSize: 13 }}>{fc.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="font-mono" style={{ fontSize: 13, color: TOKENS.textMuted }}>{brl(fc.value)}</span>
                        <button onClick={() => handleRemoveFixedCost(fc.id)} className="btn-ghost" style={{ color: TOKENS.danger, padding: 0 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* ESTRUTURA DE CUSTOS (BOM) */}
          <section className="card" style={{ marginBottom: '32px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 15, margin: 0, fontWeight: 700 }}>3. Engenharia de Custos (Cost Breakdown & BOM)</h2>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={selectedRmId} onChange={(e) => { if (e.target.value) handleAddBlock(e.target.value); e.target.value = ''; }} className="input-b2b" style={{ width: 'auto' }}>
                  <option value="">+ Bloco Padrão</option>
                  {BLOCOS_SUGERIDOS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <input type="text" className="input-b2b" placeholder="Novo bloco..." value={customCategory} onChange={e => setCustomCategory(e.target.value)} style={{ width: 200 }} />
                <button type="button" onClick={() => handleAddBlock(customCategory)} className="btn btn-outline">Criar</button>
              </div>
            </div>

            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {blocks.map(b => (
                <div key={b.id} style={{ border: `1px solid ${TOKENS.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ background: TOKENS.bgCardElevated, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {editingBlockId === b.id ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="text" className="input-b2b" value={editingBlockName} onChange={e => setEditingBlockName(e.target.value)} style={{ padding: '4px 8px', width: 200 }} />
                        <button type="button" onClick={() => {
                          if (!editingBlockName.trim()) return
                          setBlocks(prev => prev.map(bl => bl.id === b.id ? { ...bl, name: editingBlockName.trim() } : bl))
                          setEditingBlockId(null); setEditingBlockName('')
                        }} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}>OK</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <h3 style={{ fontSize: 14, margin: 0, fontWeight: 700 }}>{b.name}</h3>
                        <button onClick={() => { setEditingBlockId(b.id); setEditingBlockName(b.name) }} className="btn-ghost" style={{ fontSize: 11, padding: 2 }}>✏️</button>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <span className="font-mono" style={{ fontSize: 14, fontWeight: 800 }}>Total: {brl(b.currentCost || 0)}</span>
                      <button onClick={() => handleRemoveBlock(b.id)} className="btn-ghost" style={{ color: TOKENS.danger }}>✕</button>
                    </div>
                  </div>

                  <div style={{ padding: '16px 20px', background: TOKENS.bgApp }}>
                    <table className="bom-table">
                      <thead>
                        <tr>
                          <th>Insumo</th>
                          <th style={{ width: '15%' }}>Qtd</th>
                          <th style={{ width: '15%' }}>Refugo (%)</th>
                          <th style={{ width: '20%', textAlign: 'right' }}>Custo Total</th>
                          <th style={{ width: '5%' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.subItems?.map(sub => (
                          <tr key={sub.id}>
                            <td>{sub.name}</td>
                            <td className="font-mono">{sub.quantity}</td>
                            <td className="font-mono">{(sub as DetailedSubItem).scrapRate || 0}%</td>
                            <td className="font-mono" style={{ textAlign: 'right', fontWeight: 600 }}>{brl(sub.totalCost)}</td>
                            <td style={{ textAlign: 'right' }}><button onClick={() => handleRemoveSubItem(b.id, sub.id)} className="btn-ghost" style={{ color: TOKENS.danger }}>✕</button></td>
                          </tr>
                        ))}
                        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <td>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <select value={selectedRmId} onChange={e => setSelectedRmId(e.target.value)} className="input-b2b" style={{ padding: '6px' }}>
                                <option value="">+ Do banco...</option>
                                {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name} ({brl(rm.price)}/{rm.unit})</option>)}
                              </select>
                              <input type="text" placeholder="Nome avulso" value={subName} onChange={e => { setSubName(e.target.value); setSelectedRmId('') }} className="input-b2b" style={{ padding: '6px' }} />
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <input type="number" step="0.001" value={subQty} onChange={e => setSubQty(e.target.value)} className="input-b2b" style={{ padding: '6px' }} />
                              <select value={subUnit} onChange={e => setSubUnit(e.target.value)} className="input-b2b" style={{ padding: '6px' }}>
                                {UNIDADES_MEDIDA.map(u => <option key={u.code} value={u.code}>{u.code}</option>)}
                              </select>
                            </div>
                          </td>
                          <td><input type="number" step="0.1" value={subScrapRate} onChange={e => setSubScrapRate(e.target.value)} className="input-b2b" style={{ padding: '6px' }} /></td>
                          <td className="font-mono" style={{ textAlign: 'right', color: TOKENS.primary, fontWeight: 700 }}>{brl(calculatedSubCost)}</td>
                          <td style={{ textAlign: 'right' }}><button onClick={() => handleAddSubItem(b.id)} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: 11 }}>Add</button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* PORTFÓLIO DE PRODUTOS */}
          <section className="card">
            <div className="card-header"><h2 style={{ fontSize: 15, margin: 0, fontWeight: 700 }}>📚 Portfólio de Produtos / Fichas Gravadas</h2></div>
            <div className="card-body">
              {breakdowns.length === 0 ? (
                <p style={{ fontSize: 13, color: TOKENS.textMuted, textAlign: 'center', margin: '40px 0' }}>Nenhum produto cadastrado no portfólio.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {breakdowns.map(b => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: selectedId === b.id ? TOKENS.bgCardElevated : TOKENS.bgApp, border: `1px solid ${selectedId === b.id ? TOKENS.primary : TOKENS.border}`, borderRadius: 12, transition: 'all 0.2s' }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>{b.productName} <span style={{ fontSize: 12, color: TOKENS.textMuted, fontWeight: 500 }}>({b.projectedVolume || 100} un/mês)</span></p>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: TOKENS.textMuted }} className="font-mono">
                          <span>Preço: <strong style={{ color: TOKENS.textMain }}>{brl(b.sellingPrice)}</strong></span>
                          <span>Fat. Base: <strong style={{ color: TOKENS.primary }}>{brl((b.sellingPrice || 0) * (b.projectedVolume || 100))}</strong></span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => loadBreakdownIntoForm(b)} className="btn btn-outline" style={{ padding: '6px 12px' }}>Abrir / Editar</button>
                        <button onClick={() => handleDelete(b.id)} className="btn-danger" style={{ padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </>
  )
}