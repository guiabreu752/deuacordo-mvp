'use server'

import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export interface RegisterCompanyDTO {
  userId: string
  companyName: string
  cnpj?: string
  faturamentoAnual?: string
  gastoComprasAno?: string
  categoriasPraticadas?: string[]
  escopoMercado?: string
  moedasUtilizadas?: string[]
  segmentoEmpresa?: string
}

// 1. Obter o estado de cadastro unificado do usuário e empresa
export async function getUserProfileState(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: { organization: true },
        },
      },
    })

    if (!user) return { success: false, hasCompany: false, isCloser: false }

    const hasCompany = user.organizations.length > 0
    const isCloser = user.role === Role.CONSULTANT || user.role === Role.ADMIN

    return {
      success: true,
      user,
      hasCompany,
      isCloser,
      company: hasCompany ? user.organizations[0].organization : null,
      organization: hasCompany ? user.organizations[0].organization : null,
    }
  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
    return { success: false, hasCompany: false, isCloser: false }
  }
}

// 2. Onboarding On-Demand: Cadastrar Empresa Enriquecida
export async function registerCompanyOnDemand(data: RegisterCompanyDTO) {
  try {
    const slug = `org-${data.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${data.userId.slice(0, 4)}`

    // Cria a organização no Prisma com a qualificação B2B
    const org = await prisma.organization.create({
      data: {
        name: data.companyName,
        slug,
        cnpj: data.cnpj || null,
        faturamentoAnual: data.faturamentoAnual || null,
        gastoComprasAno: data.gastoComprasAno || null,
        categoriasPraticadas: data.categoriasPraticadas ? data.categoriasPraticadas.join(', ') : null,
        escopoMercado: data.escopoMercado || 'NACIONAL',
        moedasUtilizadas: data.moedasUtilizadas ? data.moedasUtilizadas.join(', ') : 'BRL',
        segmentoEmpresa: data.segmentoEmpresa || 'COMERCIO',
      },
    })

    // Garante que o usuário exista
    const user = await prisma.user.upsert({
      where: { id: data.userId },
      update: {},
      create: {
        id: data.userId,
        email: `user-${data.userId.slice(0, 8)}@deuacordo.com`,
        name: data.companyName,
        role: Role.BUYER,
      },
    })

    // Vincula Usuário à Organização
    await prisma.usersOnOrganizations.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: Role.BUYER,
      },
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/empresa')
    revalidatePath('/dashboard/closer')
    return { success: true, organization: org }
  } catch (error: unknown) {
    console.error('Erro ao registrar empresa:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Falha ao cadastrar empresa.',
    }
  }
}

// 3. Onboarding On-Demand: Ativar Perfil de Closer/Consultor
export async function activateCloserProfileOnDemand(userId: string) {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: Role.CONSULTANT },
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/closer')
    return { success: true, user: updatedUser }
  } catch (error) {
    console.error('Erro ao ativar perfil de closer:', error)
    return { success: false, error: 'Falha ao ativar perfil de closer.' }
  }
}