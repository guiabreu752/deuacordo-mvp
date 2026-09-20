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
} from '@/app/actions/breakdown'
import { getUserProfileState } from '@/app/actions/user'

// ── Paleta Executiva DeuAcordo ──────────────────────────────
const NAVY   = '#0F172A'
const E      = '#10B981'
const MUTED  = '#64748B'
const BORDER = '#E2E8F0'
const SLATE  = '#F8FAFC'
const WHITE  = '#FFFFFF'
const RED    = '#EF4444'

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Opções Sugeridas para Adicionar Blocos Rapidamente
const BLOCOS_SUGERIDOS = [
  'Matéria-Prima / Insumos',
  'Mão de Obra Direta',
  'Energia / Utilidades',
  'Frete / Logística',
  'Embalagem / Armazenamento',
  'Impostos e Taxas',
  'Manutenção e Depreciação',
  'Terceirizados e Serviços',
]

export default function AiBreakdownPage() {
  const router = useRouter()
  const [user, setUser]               = useState<User | null>(null)
  const [orgId, setOrgId]             = useState<string | null>(null)
  const [breakdowns, setBreakdowns]   = useState<any[]>([])
  const [carregando, setCarregando]   = useState(true)
  const [salvando, setSalvando]       = useState(false)
  const [selectedId, setSelectedId]   = useState<string | null>(null)

  // Estado do Produto
  const [productName, setProductName]   = useState('')
  const [sellingPrice, setSellingPrice] = useState('')

  // Blocos Dinâmicos de Custos
  const [blocks, setBlocks] = useState<BreakdownBlockItem[]>([
    { id: '1', name: 'Matéria-Prima / Insumos', currentCost: 0, targetCost: 0 },
    { id: '2', name: 'Mão de Obra Direta', currentCost: 0, targetCost: 0 },
    { id: '3', name: 'Energia / Utilidades', currentCost: 0, targetCost: 0 },
    { id: '4', name: 'Frete / Logística / Impostos', currentCost: 0, targetCost: 0 },
  ])

  // Adição de Blocos
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
    setBlocks([
      { id: Date.now().toString() + '1', name: 'Matéria-Prima / Insumos', currentCost: 0, targetCost: 0 },
      { id: Date.now().toString() + '2', name: 'Mão de Obra Direta', currentCost: 0, targetCost: 0 },
      { id: Date.now().toString() + '3', name: 'Energia / Utilidades', currentCost: 0, targetCost: 0 },
      { id: Date.now().toString() + '4', name: 'Frete / Logística / Impostos', currentCost: 0, targetCost: 0 },
    ])
  }

  // Operações de Blocos
  function handleAddBlock(nameToAdd: string) {
    if (!nameToAdd.trim()) return
    const newBlock: BreakdownBlockItem = {
      id: Date.now().toString(),
      name: nameToAdd.trim(),
      currentCost: 0,
      targetCost: 0,
    }
    setBlocks(prev => [...prev, newBlock])
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

  function handleUpdateBlockName(id: string, newName: string) {
    setBlocks(prev =>
      prev.map(b => (b.id === id ? { ...b, name: newName } : b))
    )
  }

  // Cálculos dinâmicos
  const priceNum = parseFloat(sellingPrice) || 0
  const curTotalCost = blocks.reduce((acc, b) => acc + (b.currentCost || 0), 0)
  const tarTotalCost = blocks.reduce((acc, b) => acc + (b.targetCost || 0), 0)

  const curProfit = priceNum - curTotalCost
  const curMarkup = curTotalCost > 0 ? (curProfit / curTotalCost) * 100 : 0

  const tarProfit = priceNum - tarTotalCost
  const tarMarkup = tarTotalCost > 0 ? (tarProfit / tarTotalCost) * 100 : 0

  const gapSaving = curTotalCost - tarTotalCost

  // Cálculos do Mini Dashboard
  const totalProdutos = breakdowns.length
  const totalSavingGeral = breakdowns.reduce((acc, item) => acc + Math.max(0, item.totalCurrentCost - item.totalTargetCost), 0)
  const custoMedioGeral = totalProdutos > 0 ? breakdowns.reduce((acc, item) => acc + item.totalCurrentCost, 0) / totalProdutos : 0
  const precoMedioGeral = totalProdutos > 0 ? breakdowns.reduce((acc, item) => acc + item.sellingPrice, 0) / totalProdutos : 0

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) return
    if (!productName.trim() || priceNum <= 0) {
      alert('Informe o nome do produto e um preço de venda válido.')
      return
    }

    setSalvando(true)

    const res = await saveCostBreakdown({
      id: selectedId || undefined,
      productName: productName.trim(),
      sellingPrice: priceNum,
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
      alert('Breakdown de Custo salvo na biblioteca com sucesso!')
    } else {
      alert(res.error || 'Erro ao salvar a análise.')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta análise da biblioteca?')) return
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

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: SLATE }}>
        <p style={{ color: MUTED, fontWeight: 600 }}>Carregando DeuAcordo Breakdown...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: SLATE, fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      <div style={{ flex: 1, padding: '2rem', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link href="/dashboard" style={{ color: MUTED, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>← Voltar ao Hub</Link>
              <span style={{ color: MUTED }}>/</span>
              <span style={{ color: NAVY, fontSize: 13, fontWeight: 700 }}>AI Breakdown (MVP)</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '4px 0 0' }}>
              DeuAcordo Breakdown — Construtor de Cost Breakdown
            </h1>
          </div>

          <button
            onClick={resetForm}
            style={{
              padding: '9px 16px', background: E, border: 'none',
              borderRadius: 8, color: WHITE, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16,185,129,0.25)'
            }}
          >
            + Analisar Novo Produto
          </button>
        </div>

        {/* ── MINI DASHBOARD DA EMPRESA ─────────────────── */}
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 10px' }}>
            📈 VISÃO GERAL DA CARTEIRA DE PRODUTOS DA EMPRESA
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: 11, color: MUTED, margin: 0, fontWeight: 600 }}>PRODUTOS CATALOGADOS</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '2px 0 0' }}>{totalProdutos} itens</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: MUTED, margin: 0, fontWeight: 600 }}>PREÇO MÉDIO DE VENDA</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '2px 0 0' }}>{brl(precoMedioGeral)}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: MUTED, margin: 0, fontWeight: 600 }}>CUSTO MÉDIO ATUAL</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '2px 0 0' }}>{brl(custoMedioGeral)}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: MUTED, margin: 0, fontWeight: 600 }}>SAVING POTENCIAL TOTAL (GAP)</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: totalSavingGeral > 0 ? E : MUTED, margin: '2px 0 0' }}>{brl(totalSavingGeral)}</p>
            </div>
          </div>
        </div>

        {/* ── BIBLIOTECA DE PRODUTOS DA EMPRESA ────────── */}
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📚 Sua Biblioteca de Produtos
            </span>
            <span style={{ fontSize: 11, color: MUTED }}>Clique para carregar e editar</span>
          </div>

          {breakdowns.length === 0 ? (
            <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Nenhum produto salvo na sua biblioteca ainda. Preencha a análise abaixo para salvar.</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {breakdowns.map(b => {
                const gap = Math.max(0, b.totalCurrentCost - b.totalTargetCost)
                const isSelected = selectedId === b.id
                return (
                  <button
                    key={b.id}
                    onClick={() => loadBreakdownIntoForm(b)}
                    style={{
                      padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                      background: isSelected ? NAVY : SLATE,
                      color: isSelected ? WHITE : NAVY,
                      border: `1.5px solid ${isSelected ? NAVY : BORDER}`,
                      display: 'flex', alignItems: 'center', gap: 8
                    }}
                  >
                    <span>{b.productName}</span>
                    <span style={{ fontSize: 10, opacity: 0.8 }}>({brl(b.sellingPrice)})</span>
                    {gap > 0 && (
                      <span style={{ fontSize: 10, background: isSelected ? E : '#DCFCE7', color: isSelected ? WHITE : '#166534', padding: '2px 6px', borderRadius: 10 }}>
                        -{brl(gap)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleSave}>
          
          {/* Identificação do Produto */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: NAVY, margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. Identificação do Produto
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
                  NOME DO PRODUTO / ITEM *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pneu Aro 16 / Bobina de Aço 1020"
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
                  PREÇO DE VENDA PRATICADO (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 700.00"
                  value={sellingPrice}
                  onChange={e => setSellingPrice(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* ── CONSTRUTOR DINÂMICO DE BLOCOS ───────────────────── */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: NAVY, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  2. Estrutura e Blocos de Custo
                </h3>
                <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>
                  Adicione, edite ou remova blocos conforme a composição de custos da sua operação.
                </p>
              </div>
            </div>

            {/* Painel para Adicionar Novos Blocos */}
            <div style={{ background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              
              {/* Bloco Padrão */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
                  ADICIONAR BLOCO PADRÃO
                </label>
                <select
                  value={selectedPreset}
                  onChange={e => {
                    setSelectedPreset(e.target.value)
                    if (e.target.value) handleAddBlock(e.target.value)
                  }}
                  style={{ width: '100%', padding: '9px', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12.5, outline: 'none' }}
                >
                  <option value="">-- Escolha um bloco pronto --</option>
                  {BLOCOS_SUGERIDOS.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              {/* Bloco Personalizado */}
              <div style={{ flex: 1.5, minWidth: 240, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
                    OU ESCREVA UM BLOCO PERSONALIZADO
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Royalty, Software, Licenciamento..."
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    style={{ width: '100%', padding: '9px', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddBlock(customCategory)}
                  disabled={!customCategory.trim()}
                  style={{
                    padding: '9px 15px', background: customCategory.trim() ? NAVY : BORDER,
                    color: customCategory.trim() ? WHITE : MUTED, border: 'none', borderRadius: 8,
                    fontSize: 12.5, fontWeight: 700, cursor: customCategory.trim() ? 'pointer' : 'default',
                    whiteSpace: 'nowrap'
                  }}
                >
                  + Adicionar
                </button>
              </div>
            </div>

            {/* LISTA ESPELHADA DOS BLOCOS (LADO A LADO) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              
              {/* LADO ESQUERDO: CENÁRIO ATUAL */}
              <div style={{ background: SLATE, borderRadius: 12, padding: '1.25rem', border: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: NAVY, margin: 0 }}>📊 Cost Breakdown Atual</h4>
                  <span style={{ fontSize: 10, fontWeight: 700, background: WHITE, padding: '2px 8px', borderRadius: 4, color: MUTED, border: `1px solid ${BORDER}` }}>CENÁRIO REAL</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {blocks.length === 0 ? (
                    <p style={{ fontSize: 12, color: MUTED, textAlign: 'center', padding: '1rem' }}>Nenhum bloco de custo adicionado.</p>
                  ) : (
                    blocks.map(b => (
                      <div key={b.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <input
                            type="text"
                            value={b.name}
                            onChange={e => handleUpdateBlockName(b.id, e.target.value)}
                            style={{ background: 'transparent', border: 'none', fontSize: 11, fontWeight: 700, color: NAVY, width: '80%', outline: 'none' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveBlock(b.id)}
                            style={{ background: 'none', border: 'none', color: RED, fontSize: 12, cursor: 'pointer', padding: 0 }}
                            title="Remover este bloco"
                          >
                            ✕
                          </button>
                        </div>
                        <input
                          type="number" step="0.01" placeholder="0.00"
                          value={b.currentCost || ''}
                          onChange={e => handleUpdateBlockValue(b.id, 'currentCost', e.target.value)}
                          style={{ width: '100%', padding: '9px', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>
                    ))
                  )}
                </div>

                {/* Resumo do Cenário Atual */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, margin: 0 }}>CUSTO TOTAL</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: NAVY, margin: '2px 0 0' }}>{brl(curTotalCost)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, margin: 0 }}>LUCRO LÍQUIDO</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: curProfit >= 0 ? E : RED, margin: '2px 0 0' }}>{brl(curProfit)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, margin: 0 }}>MARKUP (%)</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: NAVY, margin: '2px 0 0' }}>{curMarkup.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* LADO DIREITO: CENÁRIO TARGET (ESPELHADO) */}
              <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '1.25rem', border: `1.5px solid ${E}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: '#065F46', margin: 0 }}>🎯 Cost Breakdown Target</h4>
                  <span style={{ fontSize: 10, fontWeight: 700, background: WHITE, padding: '2px 8px', borderRadius: 4, color: '#047857', border: '1px solid #A7F3D0' }}>ALVO DESEJADO</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {blocks.length === 0 ? (
                    <p style={{ fontSize: 12, color: MUTED, textAlign: 'center', padding: '1rem' }}>Nenhum bloco de custo adicionado.</p>
                  ) : (
                    blocks.map(b => (
                      <div key={b.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#065F46' }}>TARGET {b.name.toUpperCase()}</span>
                        </div>
                        <input
                          type="number" step="0.01" placeholder="0.00"
                          value={b.targetCost || ''}
                          onChange={e => handleUpdateBlockValue(b.id, 'targetCost', e.target.value)}
                          style={{ width: '100%', padding: '9px', background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>
                    ))
                  )}
                </div>

                {/* Resumo do Cenário Target */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #A7F3D0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#047857', margin: 0 }}>CUSTO ALVO</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: E, margin: '2px 0 0' }}>{brl(tarTotalCost)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#047857', margin: 0 }}>LUCRO TARGET</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: tarProfit >= 0 ? E : RED, margin: '2px 0 0' }}>{brl(tarProfit)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#047857', margin: 0 }}>MARKUP TARGET</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: E, margin: '2px 0 0' }}>{tarMarkup.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* OPORTUNIDADE DE SAVING DA ANÁLISE */}
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
              {gapSaving > 0 && curTotalCost > 0 && (
                <p style={{ fontSize: 11, fontWeight: 700, color: '#065F46', margin: 0 }}>
                  ({((gapSaving / curTotalCost) * 100).toFixed(1)}% de redução de custos)
                </p>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
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
              style={{ padding: '12px 28px', background: E, border: 'none', borderRadius: 8, color: WHITE, fontSize: 14, fontWeight: 800, cursor: salvando ? 'wait' : 'pointer', boxShadow: '0 2px 10px rgba(16,185,129,0.3)' }}
            >
              {salvando ? 'Salvando...' : selectedId ? 'Atualizar na Biblioteca' : 'Salvar na Biblioteca de Produtos'}
            </button>
          </div>

        </form>

      </div>
      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  )
}