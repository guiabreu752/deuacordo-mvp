import { NextResponse } from 'next/server'
import Parser from 'rss-parser'
import { prisma } from '@/lib/prisma'

const parser = new Parser()

// Rota acionada pelo Vercel Cron ou manualmente no Admin
export async function GET() {
  try {
    // Exemplo de Feed de Commodities / Economia
    const feed = await parser.parseURL('https://news.google.com/rss/search?q=commodities+aço+comércio+exterior&hl=pt-BR&gl=BR&ceid=BR:pt-419')

    for (const item of feed.items.slice(0, 5)) { // Pega as 5 notícias mais recentes
      if (!item.link || !item.title) continue

      // Verifica se a notícia já foi importada
      const exists = await prisma.newsArticle.findFirst({
        where: { sourceUrl: item.link }
      })

      if (exists) continue

      // Criação rápida do artigo no banco de dados
      await prisma.newsArticle.create({
        data: {
          title: item.title,
          slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          summary: item.contentSnippet || item.title,
          impactAnalysis: `Impacto potencial detectado na cadeia de suprimentos de insumos e cotação de insumos metálicos.`,
          sourceName: item.creator || 'Google News',
          sourceUrl: item.link,
          imageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=60',
        }
      })
    }

    return NextResponse.json({ success: true, message: 'Ingestão concluída com sucesso!' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}