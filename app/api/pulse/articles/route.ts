import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const articles = await prisma.newsArticle.findMany({
      include: {
        categories: {
          include: {
            category: true
          }
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: 30
    })

    return NextResponse.json(articles)
  } catch (error: any) {
    console.error('Erro ao buscar notícias do Pulse:', error)
    return NextResponse.json({ error: 'Erro ao carregar notícias.' }, { status: 500 })
  }
}