import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const products = await prisma.affiliateProduct.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(products)
  } catch (error: any) {
    console.error('Erro ao buscar produtos da Academy:', error)
    return NextResponse.json([], { status: 500 })
  }
}