'use server'

import { prisma } from '@/lib/prisma'
import { DealStatus, Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export interface CreateDealDTO {
  title: string
  description?: string
  quantity?: number      // Quantidade de unidades/itens
  targetValue?: number   // Valor unitário pago hoje (baseline unitário)
  currentValue?: number  // Valor unitário negociado
  organizationId: string
  createdById: string
}

// 1. Buscar Deals isolados por Usuário (Minhas Mesas)
export async function getDealsByUser(userId: string) {
  try {
    const deals = await prisma.deal.findMany({
      where: {
        createdById: userId,
      },
      include: {
        organization: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: deals }
  } catch (error) {
    console.error('Erro ao buscar mesas do usuário:', error)
    return { success: false, error: 'Erro ao carregar suas mesas de negociação.' }
  }
}

// 2. Buscar Deals por Organização (Empresa)
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

// 3. Buscar todas as mesas ativas (Cockpit do Closer)
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

// 4. Criar uma nova mesa de negociação
export async function createDeal(data: CreateDealDTO) {
  try {
    const qty = data.quantity && data.quantity > 0 ? data.quantity : 1
    const targetUnit = data.targetValue ?? 0
    const currentUnit = data.currentValue ?? 0

    const totalBaseline = targetUnit * qty
    const totalCurrent = currentUnit * qty
    const totalSaving = totalBaseline > totalCurrent ? totalBaseline - totalCurrent : 0

    const org = await prisma.organization.upsert({
      where: { id: data.organizationId },
      update: {},
      create: {
        id: data.organizationId,
        name: 'Empresa Padrão',
        slug: `org-${data.organizationId.slice(0, 8)}`,
      },
    })

    const user = await prisma.user.upsert({
      where: { id: data.createdById },
      update: {},
      create: {
        id: data.createdById,
        email: `user-${data.createdById.slice(0, 8)}@deuacordo.com`,
        name: 'Usuário Empresa',
        role: Role.BUYER,
      },
    })

    await prisma.usersOnOrganizations.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: org.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        organizationId: org.id,
        role: Role.BUYER,
      },
    })

    const newDeal = await prisma.deal.create({
      data: {
        title: data.title,
        description: data.description,
        quantity: qty,
        targetValue: targetUnit,
        currentValue: currentUnit,
        savingValue: totalSaving,
        status: DealStatus.IN_NEGOTIATION,
        organizationId: org.id,
        createdById: user.id,
      },
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/empresa')
    revalidatePath('/dashboard/closer')
    return { success: true, data: newDeal }
  } catch (error: unknown) {
    console.error('Erro ao criar deal:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Falha ao registrar negociação.',
    }
  }
}

// 5. Submeter proposta pelo Closer
export async function submeterProposta(dealId: string, proposedUnitPrice: number) {
  try {
    const currentDeal = await prisma.deal.findUnique({ where: { id: dealId } })
    if (!currentDeal) throw new Error('Mesa não encontrada.')

    const qty = currentDeal.quantity || 1
    const targetUnit = currentDeal.targetValue ?? 0

    if (proposedUnitPrice >= targetUnit) {
      return { success: false, error: 'O valor unitário negociado deve ser menor que o valor pago atualmente.' }
    }

    const totalTarget = targetUnit * qty
    const totalProposed = proposedUnitPrice * qty
    const totalSaving = totalTarget - totalProposed
    const percentualSaving = (totalSaving / totalTarget) * 100

    if (percentualSaving < 3) {
      return { success: false, error: `O saving de ${percentualSaving.toFixed(1)}% é inferior ao mínimo de 3% necessário para a mesa.` }
    }

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: {
        currentValue: proposedUnitPrice,
        savingValue: totalSaving,
        status: DealStatus.PENDING_APPROVAL,
      },
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/empresa')
    revalidatePath('/dashboard/closer')
    return { success: true, data: updated }
  } catch (error) {
    console.error('Erro ao submeter proposta:', error)
    return { success: false, error: 'Erro ao registrar proposta.' }
  }
}

// 6. Aprovar Saving
export async function aprovarSaving(dealId: string) {
  try {
    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: { status: DealStatus.APPROVED },
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/empresa')
    revalidatePath('/dashboard/closer')
    return { success: true, data: updated }
  } catch (error) {
    console.error('Erro ao aprovar saving:', error)
    return { success: false, error: 'Erro ao aprovar o saving da mesa.' }
  }
}

// 7. Rejeitar ou Cancelar Mesa
export async function rejeitarMesa(dealId: string) {
  try {
    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: { status: DealStatus.REJECTED },
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/empresa')
    revalidatePath('/dashboard/closer')
    return { success: true, data: updated }
  } catch (error) {
    console.error('Erro ao rejeitar mesa:', error)
    return { success: false, error: 'Erro ao cancelar mesa.' }
  }
}