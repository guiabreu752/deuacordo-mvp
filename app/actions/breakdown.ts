'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface BreakdownBlockItem {
  id: string
  name: string
  currentCost: number
  targetCost: number
}

export interface SaveCostBreakdownDTO {
  id?: string
  productName: string
  sellingPrice: number
  blocks: BreakdownBlockItem[]
  organizationId: string
}

// 1. Buscar todos os Cost Breakdowns da Organização (para a Biblioteca e Dashboard)
export async function getBreakdownsByOrganization(organizationId: string) {
  try {
    const breakdowns = await prisma.costBreakdown.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })

    const parsed = breakdowns.map(b => ({
      ...b,
      blocks: JSON.parse(b.blocksJson || '[]') as BreakdownBlockItem[],
    }))

    return { success: true, data: parsed }
  } catch (error) {
    console.error('Erro ao buscar cost breakdowns:', error)
    return { success: false, error: 'Falha ao carregar análises de custos.' }
  }
}

// 2. Criar ou Atualizar uma Análise de Breakdown com Blocos Flexíveis
export async function saveCostBreakdown(data: SaveCostBreakdownDTO) {
  try {
    if (!data.productName.trim()) {
      return { success: false, error: 'O nome do produto é obrigatório.' }
    }
    if (data.sellingPrice <= 0) {
      return { success: false, error: 'O preço de venda deve ser maior que zero.' }
    }

    const totalCurrentCost = data.blocks.reduce((acc, b) => acc + (Number(b.currentCost) || 0), 0)
    const totalTargetCost = data.blocks.reduce((acc, b) => acc + (Number(b.targetCost) || 0), 0)

    const currentProfit = data.sellingPrice - totalCurrentCost
    const currentMarkup = totalCurrentCost > 0 ? (currentProfit / totalCurrentCost) * 100 : 0

    const targetProfit = data.sellingPrice - totalTargetCost
    const targetMarkup = totalTargetCost > 0 ? (targetProfit / totalTargetCost) * 100 : 0

    const blocksJson = JSON.stringify(data.blocks)

    let breakdown

    if (data.id) {
      // Atualiza registro existente
      breakdown = await prisma.costBreakdown.update({
        where: { id: data.id },
        data: {
          productName: data.productName.trim(),
          sellingPrice: data.sellingPrice,
          totalCurrentCost,
          totalTargetCost,
          currentProfit,
          currentMarkup,
          targetProfit,
          targetMarkup,
          blocksJson,
        },
      })
    } else {
      // Cria novo registro
      breakdown = await prisma.costBreakdown.create({
        data: {
          productName: data.productName.trim(),
          sellingPrice: data.sellingPrice,
          totalCurrentCost,
          totalTargetCost,
          currentProfit,
          currentMarkup,
          targetProfit,
          targetMarkup,
          blocksJson,
          organizationId: data.organizationId,
        },
      })
    }

    revalidatePath('/dashboard/ai-breakdown')
    return {
      success: true,
      data: {
        ...breakdown,
        blocks: JSON.parse(breakdown.blocksJson) as BreakdownBlockItem[],
      },
    }
  } catch (error: unknown) {
    console.error('Erro ao salvar cost breakdown:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar breakdown de custo.',
    }
  }
}

// 3. Excluir Item da Biblioteca
export async function deleteCostBreakdown(id: string) {
  try {
    await prisma.costBreakdown.delete({ where: { id } })
    revalidatePath('/dashboard/ai-breakdown')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir cost breakdown:', error)
    return { success: false, error: 'Erro ao excluir item.' }
  }
}