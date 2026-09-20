'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface CreateCostBreakdownDTO {
  productName: string
  sellingPrice: number

  // Cenário Atual
  rawMaterialCost: number
  laborCost: number
  energyCost: number
  logisticsCost: number

  // Cenário Target
  targetRawMaterialCost: number
  targetLaborCost: number
  targetEnergyCost: number
  targetLogisticsCost: number
  targetSellingPrice?: number

  organizationId: string
}

// 1. Buscar análises de Breakdown por Organização
export async function getBreakdownsByOrganization(organizationId: string) {
  try {
    const breakdowns = await prisma.costBreakdown.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: breakdowns }
  } catch (error) {
    console.error('Erro ao buscar cost breakdowns:', error)
    return { success: false, error: 'Falha ao carregar análises de custos.' }
  }
}

// 2. Criar ou Atualizar uma Análise de Breakdown
export async function saveCostBreakdown(data: CreateCostBreakdownDTO) {
  try {
    // Cálculos do Cenário Atual
    const totalCurrentCost =
      data.rawMaterialCost + data.laborCost + data.energyCost + data.logisticsCost
    const currentProfit = data.sellingPrice - totalCurrentCost
    const currentMarkup = totalCurrentCost > 0 ? (currentProfit / totalCurrentCost) * 100 : 0

    // Cálculos do Cenário Target
    const targetPrice = data.targetSellingPrice || data.sellingPrice
    const totalTargetCost =
      data.targetRawMaterialCost +
      data.targetLaborCost +
      data.targetEnergyCost +
      data.targetLogisticsCost
    const targetProfit = targetPrice - totalTargetCost
    const targetMarkup = totalTargetCost > 0 ? (targetProfit / totalTargetCost) * 100 : 0

    const breakdown = await prisma.costBreakdown.create({
      data: {
        productName: data.productName,
        sellingPrice: data.sellingPrice,

        rawMaterialCost: data.rawMaterialCost,
        laborCost: data.laborCost,
        energyCost: data.energyCost,
        logisticsCost: data.logisticsCost,
        currentProfit,
        currentMarkup,

        targetRawMaterialCost: data.targetRawMaterialCost,
        targetLaborCost: data.targetLaborCost,
        targetEnergyCost: data.targetEnergyCost,
        targetLogisticsCost: data.targetLogisticsCost,
        targetSellingPrice: targetPrice,
        targetProfit,
        targetMarkup,

        organizationId: data.organizationId,
      },
    })

    revalidatePath('/dashboard/ai-breakdown')
    return { success: true, data: breakdown }
  } catch (error: unknown) {
    console.error('Erro ao salvar cost breakdown:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar breakdown de custo.',
    }
  }
}

// 3. Excluir uma Análise
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