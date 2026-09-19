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

// 1. Buscar Deals por Organização (Empresa)
export async function getDealsByOrganization(organizationId: string) {
  try {
    const deals = await prisma.deal.findMany({
      where: { organizationId },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: deals }
  } catch (error) {
    console.error('Erro ao buscar deals:', error)
    return { success: false, error: 'Erro ao carregar negociações.' }
  }
}

// 2. Buscar todas as mesas ativas (Cockpit do Closer)
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

// 3. Criar uma nova mesa de negociação
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

// 4. Submeter proposta pelo Closer com validação de Saving Mínimo (3%)
export async function submeterProposta(dealId: string, proposedValue: number) {
  try {
    const currentDeal = await prisma.deal.findUnique({ where: { id: dealId } })
    if (!currentDeal) throw new Error('Mesa não encontrada.')

    const target = currentDeal.targetValue ?? 0
    if (proposedValue >= target) {
      return { success: false, error: 'O valor negociado deve ser menor que o valor atual pago.' }
    }

    const saving = target - proposedValue
    const percentualSaving = (saving / target) * 100

    if (percentualSaving < 3) {
      return { success: false, error: 'O saving mínimo para acionar a mesa é de 3%.' }
    }

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: {
        currentValue: proposedValue,
        savingValue: saving,
        status: DealStatus.PENDING_APPROVAL,
      },
    })

    revalidatePath('/dashboard/empresa')
    revalidatePath('/dashboard/closer')
    return { success: true, data: updated }
  } catch (error) {
    console.error('Erro ao submeter proposta:', error)
    return { success: false, error: 'Erro ao registrar proposta.' }
  }
}

// 5. Aprovar Saving (Empresa confirma e libera Escrow)
export async function aprovarSaving(dealId: string) {
  try {
    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: { status: DealStatus.APPROVED },
    })

    revalidatePath('/dashboard/empresa')
    revalidatePath('/dashboard/closer')
    return { success: true, data: updated }
  } catch (error) {
    console.error('Erro ao aprovar saving:', error)
    return { success: false, error: 'Erro ao aprovar o saving da mesa.' }
  }
}

// 6. Rejeitar ou Cancelar Mesa
export async function rejeitarMesa(dealId: string) {
  try {
    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: { status: DealStatus.REJECTED },
    })

    revalidatePath('/dashboard/empresa')
    revalidatePath('/dashboard/closer')
    return { success: true, data: updated }
  } catch (error) {
    console.error('Erro ao rejeitar mesa:', error)
    return { success: false, error: 'Erro ao cancelar mesa.' }
  }
}