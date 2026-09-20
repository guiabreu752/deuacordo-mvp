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
  CreateCostBreakdownDTO,
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

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function AiBreakdownPage() {
  const router = useRouter()
  const [user, setUser]               = useState<User | null>(null)
  const [orgId, setOrgId]             = useState<string | null>(null)
  const [breakdowns, setBreakdowns]   = useState<any[]>([])
  const [carregando, setCarregando]   = useState(true)
  const [salvando, setSalvando]       = useState(false)
  const [selectedId, setSelectedId]   = useState<string | null>(null)

  // Form State
  const [productName, setProductName] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')

  // Cenário Atual
  const [rawMaterial, setRawMaterial] = useState('')
  const [labor, setLabor]             = useState('')
  const [energy, setEnergy]           = useState('')
  const [logistics, setLogistics]     = useState('')

  // Cenário Target
  const [targetRawMaterial, setTargetRawMaterial] = useState('')
  const [targetLabor, setTargetLabor]             = useState('')
  const [targetEnergy, setTargetEnergy]           = useState('')
  const [targetLogistics, setTargetLogistics]     = useState('')

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

    setRawMaterial(String(b.rawMaterialCost))
    setLabor(String(b.laborCost))
    setEnergy(String(b.energyCost))
    setLogistics(String(b.logisticsCost))

    setTargetRawMaterial(String(b.targetRawMaterialCost))
    setTargetLabor(String(b.targetLaborCost))
    setTargetEnergy(String(b.targetEnergyCost))
    setTargetLogistics(String(b.targetLogisticsCost))
  }

  function resetForm() {
    setSelectedId(null)
    setProductName('')
    setSellingPrice('')
    setRawMaterial('')
    setLabor('')
    setEnergy('')
    setLogistics('')
    setTargetRawMaterial('')
    setTargetLabor('')
    setTargetEnergy('')
    setTargetLogistics('')
  }

  // Cálculos em tempo real
  const pPrice       = parseFloat(sellingPrice) || 0
  const curRaw       = parseFloat(rawMaterial) || 0
  const curLabor     = parseFloat(labor) || 0
  const curEnergy    = parseFloat(energy) || 0
  const curLog       = parseFloat(logistics) || 0
  const curTotalCost = curRaw + curLabor + curEnergy + curLog
  const curProfit    = pPrice - curTotalCost
  const curMarkup    = curTotalCost > 0 ? (curProfit / curTotalCost) * 100 : 0

  const tarRaw       = parseFloat(targetRawMaterial) || 0
  const tarLabor     = parseFloat(targetLabor) || 0
  const tarEnergy    = parseFloat(targetEnergy) || 0
  const tarLog       = parseFloat(targetLogistics) || 0
  const tarTotalCost = tarRaw + tarLabor + tarEnergy + tarLog
  const tarProfit    = pPrice - tarTotalCost
  const tarMarkup    = tarTotalCost > 0 ? (tarProfit / tarTotalCost) * 100 : 0

  const gapSaving = curTotalCost - tarTotalCost

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId || !productName.trim() || pPrice <= 0) {
      alert('Informe o nome do produto e o preço de venda.')
      return
    }

    setSalvando(true)

    const dto: CreateCostBreakdownDTO = {
      productName: productName.trim(),
      sellingPrice: pPrice,
      rawMaterialCost: curRaw,
      laborCost: curLabor,
      energyCost: curEnergy,
      logisticsCost: curLog,
      targetRawMaterialCost: tarRaw,
      targetLaborCost: tarLabor,
      targetEnergyCost: tarEnergy,
      targetLogisticsCost: tarLog,
      organizationId: orgId,
    }

    const res = await saveCostBreakdown(dto)
    setSalvando(false)

    if (res.success && res.data) {
      const updated = await getBreakdownsByOrganization(orgId)
      if (updated.success && updated.data) {
        setBreakdowns(updated.data)
      }
      alert('Análise de Cost Breakdown salva com sucesso!')
    } else {
      alert(res.error || 'Erro ao salvar análise.')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja excluir esta análise?')) return
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
      
      {/* Conteúdo Principal */}
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
              DeuAcordo Breakdown — Análise Espelhada de Cost Breakdown
            </h1>
          </div>

          <button
            onClick={resetForm}
            style={{
              padding: '9px 15px', background: WHITE, border: `1px solid ${BORDER}`,
              borderRadius: 8, color: NAVY, fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}
          >
            + Nova Análise
          </button>
        </div>

        {/* Seletor de Análises Salvas */}
        {breakdowns.length > 0 && (
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: 10, alignItems: 'center', overflowX: 'auto' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: MUTED, whiteSpace: 'nowrap' }}>Análises Salvas:</span>
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
          
          {/* Dados do Produto */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: NAVY, margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. Identificação do Produto / Insumo
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
                  PREÇO DE VENDA (R$) *
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

          {/* VISUALIZAÇÃO ESPELHADA (LADO A LADO) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            
            {/* COST BREAKDOWN ATUAL */}
            <div style={{ background: WHITE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: 0 }}>📊 Cost Breakdown Atual</h3>
                <span style={{ fontSize: 11, fontWeight: 700, background: SLATE, padding: '3px 8px', borderRadius: 6, color: MUTED }}>CENÁRIO REAL</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 3 }}>
                    MATÉRIA-PRIMA / INSUMOS (R$)
                  </label>
                  <input
                    type="number" step="0.01" placeholder="0.00"
                    value={rawMaterial} onChange={e => setRawMaterial(e.target.value)}
                    style={{ width: '100%', padding: '9px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 3 }}>
                    MÃO DE OBRA DIRETA (R$)
                  </label>
                  <input
                    type="number" step="0.01" placeholder="0.00"
                    value={labor} onChange={e => setLabor(e.target.value)}
                    style={{ width: '100%', padding: '9px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 3 }}>
                    ENERGIA / UTILIDADES (R$)
                  </label>
                  <input
                    type="number" step="0.01" placeholder="0.00"
                    value={energy} onChange={e => setEnergy(e.target.value)}
                    style={{ width: '100%', padding: '9px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 3 }}>
                    FRETE / IMPOSTOS / OUTROS (R$)
                  </label>
                  <input
                    type="number" step="0.01" placeholder="0.00"
                    value={logistics} onChange={e => setLogistics(e.target.value)}
                    style={{ width: '100%', padding: '9px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Resumo Atual */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, margin: 0 }}>CUSTO TOTAL</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: '2px 0 0' }}>{brl(curTotalCost)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, margin: 0 }}>LUCRO LÍQUIDO</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: curProfit >= 0 ? E : RED, margin: '2px 0 0' }}>{brl(curProfit)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, margin: 0 }}>MARKUP (%)</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: '2px 0 0' }}>{curMarkup.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* COST BREAKDOWN TARGET (DESEJADO) */}
            <div style={{ background: WHITE, border: `1.5px solid ${E}`, borderRadius: 14, padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: E, margin: 0 }}>🎯 Cost Breakdown Target</h3>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#ECFDF5', padding: '3px 8px', borderRadius: 6, color: '#065F46' }}>ALVO DESEJADO</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 3 }}>
                    TARGET MATÉRIA-PRIMA (R$)
                  </label>
                  <input
                    type="number" step="0.01" placeholder="0.00"
                    value={targetRawMaterial} onChange={e => setTargetRawMaterial(e.target.value)}
                    style={{ width: '100%', padding: '9px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 3 }}>
                    TARGET MÃO DE OBRA (R$)
                  </label>
                  <input
                    type="number" step="0.01" placeholder="0.00"
                    value={targetLabor} onChange={e => setTargetLabor(e.target.value)}
                    style={{ width: '100%', padding: '9px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 3 }}>
                    TARGET ENERGIA (R$)
                  </label>
                  <input
                    type="number" step="0.01" placeholder="0.00"
                    value={targetEnergy} onChange={e => setTargetEnergy(e.target.value)}
                    style={{ width: '100%', padding: '9px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 3 }}>
                    TARGET FRETE / IMPOSTOS (R$)
                  </label>
                  <input
                    type="number" step="0.01" placeholder="0.00"
                    value={targetLogistics} onChange={e => setTargetLogistics(e.target.value)}
                    style={{ width: '100%', padding: '9px', background: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Resumo Target */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, margin: 0 }}>CUSTO ALVO</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: E, margin: '2px 0 0' }}>{brl(tarTotalCost)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, margin: 0 }}>LUCRO TARGET</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: tarProfit >= 0 ? E : RED, margin: '2px 0 0' }}>{brl(tarProfit)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, margin: 0 }}>MARKUP TARGET</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: E, margin: '2px 0 0' }}>{tarMarkup.toFixed(1)}%</p>
                </div>
              </div>
            </div>

          </div>

          {/* OPORTUNIDADE DE SAVING / GAP ESTIMADO */}
          <div style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#065F46', letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0 }}>
                OPORTUNIDADE DE SAVING POTENCIAL (GAP)
              </p>
              <p style={{ fontSize: 13, color: '#047857', margin: '3px 0 0' }}>
                Economia acumulada estimada se atingir as metas em cada bloco de custo.
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: gapSaving > 0 ? E : MUTED, margin: 0 }}>
                {gapSaving > 0 ? brl(gapSaving) : 'R$ 0,00'}
              </p>
              {gapSaving > 0 && (
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
                Excluir Análise
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={salvando}
              style={{ padding: '12px 28px', background: E, border: 'none', borderRadius: 8, color: WHITE, fontSize: 14, fontWeight: 800, cursor: salvando ? 'wait' : 'pointer' }}
            >
              {salvando ? 'Salvando...' : 'Salvar Breakdown de Custo'}
            </button>
          </div>

        </form>

      </div>
      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  )
}