'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface CreateAffiliateProductDTO {
  title: string
  category: 'livros' | 'cursos' | 'escritorio' | 'software'
  categoryLabel: string
  description: string
  priceEstimate: string
  rating?: string
  imageUrl: string
  affiliateUrl: string
  badge?: string
}

// 1. Buscar todos os produtos cadastrados (para o Admin)
export async function getAllAffiliateProductsAdmin() {
  try {
    const products = await prisma.affiliateProduct.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: products }
  } catch (error) {
    console.error('Erro ao buscar produtos da Academy:', error)
    return { success: false, error: 'Falha ao carregar produtos.' }
  }
}

// 2. Cadastrar novo produto de afiliação
export async function createAffiliateProduct(data: CreateAffiliateProductDTO) {
  try {
    const product = await prisma.affiliateProduct.create({
      data: {
        title: data.title,
        category: data.category,
        categoryLabel: data.categoryLabel,
        description: data.description,
        priceEstimate: data.priceEstimate,
        rating: data.rating || '5.0 ★',
        imageUrl: data.imageUrl,
        affiliateUrl: data.affiliateUrl,
        badge: data.badge || null,
        active: true,
      },
    })

    revalidatePath('/academy')
    revalidatePath('/dashboard/academy/admin')
    return { success: true, data: product }
  } catch (error) {
    console.error('Erro ao cadastrar produto:', error)
    return { success: false, error: 'Erro ao salvar produto no banco de dados.' }
  }
}

// 3. Alternar visibilidade (Ativar/Desativar produto)
export async function toggleAffiliateProductActive(id: string, currentStatus: boolean) {
  try {
    const updated = await prisma.affiliateProduct.update({
      where: { id },
      data: { active: !currentStatus },
    })

    revalidatePath('/academy')
    revalidatePath('/dashboard/academy/admin')
    return { success: true, data: updated }
  } catch (error) {
    console.error('Erro ao alterar status:', error)
    return { success: false, error: 'Erro ao atualizar produto.' }
  }
}

// 4. Excluir produto
export async function deleteAffiliateProduct(id: string) {
  try {
    await prisma.affiliateProduct.delete({
      where: { id },
    })

    revalidatePath('/academy')
    revalidatePath('/dashboard/academy/admin')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir produto:', error)
    return { success: false, error: 'Erro ao excluir produto.' }
  }
}