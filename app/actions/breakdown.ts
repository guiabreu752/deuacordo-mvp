'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface SubItem {
  id: string
  name: string
  quantity: number
  unitCost: number
  totalCost: number
}

export interface BreakdownBlockItem {
  id: string
  name: string
  currentCost: number
  targetCost: number
  subItems?: SubItem[]
}

export interface SaveCostBreakdownDTO {
  id?: string
  productName: string
  sellingPrice: number
  blocks: BreakdownBlockItem[]
  organizationId: string
}

// 1. Buscar todos os Breakdowns por Organização
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

// 2. Salvar/Atualizar Breakdown garantindo a existência da Organização
export async function saveCostBreakdown(data: SaveCostBreakdownDTO) {
  try {
    if (!data.productName.trim()) {
      return { success: false, error: 'O nome do produto é obrigatório.' }
    }

    // ── Garantir que a organização exista na tabela `organizations` ──
    const org = await prisma.organization.upsert({
      where: { id: data.organizationId },
      update: {},
      create: {
        id: data.organizationId,
        name: 'Empresa Padrão',
        slug: `org-${data.organizationId.slice(0, 8)}`,
      },
    })

    // Calcular custos
    const totalCurrentCost = data.blocks.reduce((acc, b) => {
      if (b.subItems && b.subItems.length > 0) {
        return acc + b.subItems.reduce((sAcc, sub) => sAcc + (Number(sub.totalCost) || 0), 0)
      }
      return acc + (Number(b.currentCost) || 0)
    }, 0)

    const totalTargetCost = data.blocks.reduce((acc, b) => acc + (Number(b.targetCost) || 0), 0)

    const currentProfit = data.sellingPrice - totalCurrentCost
    const currentMarkup = totalCurrentCost > 0 ? (currentProfit / totalCurrentCost) * 100 : 0

    const targetProfit = data.sellingPrice - totalTargetCost
    const targetMarkup = totalTargetCost > 0 ? (targetProfit / totalTargetCost) * 100 : 0

    const blocksJson = JSON.stringify(data.blocks)

    let breakdown

    if (data.id) {
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
          organizationId: org.id,
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
      error: error instanceof Error ? error.message : 'Erro ao salvar breakdown na biblioteca.',
    }
  }
}

// 3. Excluir item
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