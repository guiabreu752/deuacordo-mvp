'use server'

import { prisma } from '@/lib/prisma'
import { DealStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export interface CreateDealDTO {
  title: string
  description?: string
  targetValue?: number
  currentValue?: number
  organizationId: string
  createdById: string
}

// 1. Buscar Deals por Organização
export async function getDealsByOrganization(organizationId: string) {
  try {
    const deals = await prisma.deal.findMany({
      where: { organizationId },
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: deals }
  } catch (error) {
    console.error('Erro ao buscar deals:', error)
    return { success: false, error: 'Erro ao carregar negociações.' }
  }
}

// 2. Buscar Deals disponíveis para o Closer / Consultor
export async function getAllDeals() {
  try {
    const deals = await prisma.deal.findMany({
      include: {
        organization: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: deals }
  } catch (error) {
    console.error('Erro ao buscar todas as negociações:', error)
    return { success: false, error: 'Erro ao carregar mesas ativas.' }
  }
}

// 3. Criar uma nova mesa de negociação (Deal)
export async function createDeal(data: CreateDealDTO) {
  try {
    const target = data.targetValue ?? 0
    const current = data.currentValue ?? 0
    const saving = target > current ? target - current : 0

    const newDeal = await prisma.deal.create({
      data: {
        title: data.title,
        description: data.description,
        targetValue: target,
        currentValue: current,
        savingValue: saving,
        status: DealStatus.IN_NEGOTIATION,
        organizationId: data.organizationId,
        createdById: data.createdById,
      },
    })

    revalidatePath('/dashboard/empresa')
    revalidatePath('/dashboard/closer')
    return { success: true, data: newDeal }
  } catch (error) {
    console.error('Erro ao criar deal:', error)
    return { success: false, error: 'Falha ao registrar negociação.' }
  }
}

// 4. Atualizar o Status e Valor de Proposta
export async function updateDealStatus(
  dealId: string,
  newStatus: DealStatus,
  proposedValue?: number
) {
  try {
    const currentDeal = await prisma.deal.findUnique({ where: { id: dealId } })
    if (!currentDeal) throw new Error('Deal não encontrado')

    let updateData: Record<string, unknown> = { status: newStatus }

    if (proposedValue !== undefined) {
      const target = currentDeal.targetValue ?? 0
      const saving = target > proposedValue ? target - proposedValue : 0
      updateData.currentValue = proposedValue
      updateData.savingValue = saving
    }

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: updateData,
    })

    revalidatePath('/dashboard/empresa')
    revalidatePath('/dashboard/closer')
    return { success: true, data: updated }
  } catch (error) {
    console.error('Erro ao atualizar deal:', error)
    return { success: false, error: 'Erro ao atualizar o status.' }
  }
}