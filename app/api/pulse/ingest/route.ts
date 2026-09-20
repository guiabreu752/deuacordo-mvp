import { NextResponse } from 'next/server'
import Parser from 'rss-parser'
import { prisma } from '@/lib/prisma'

const parser = new Parser()

// Mapeamento de termos para categorização automática B2B
const CATEGORIES_MAP: Record<string, string[]> = {
  'Aço & Metais': ['aço', 'metalurgia', 'minério', 'usinagem', 'siderurgia', 'ferro', 'inoxidável', 'metal'],
  'Energia & Câmbio': ['dólar', 'câmbio', 'energia', 'petróleo', 'combustível', 'inflação', 'selic', 'tarifa'],
  'Logística Global': ['frete', 'marítimo', 'porto', 'logística', 'contêiner', 'importação', 'exportação', 'transporte'],
  'Geopolítica': ['china', 'eua', 'guerra', 'sanções', 'tarifa', 'comércio exterior', 'brics', 'governo']
}

// Rota acionada pelo Vercel Cron, serviço externo de Cron ou via clique no navegador
export async function GET() {
  try {
    // Feeds RSS Públicos do Google News focados em temas industriais e de negócios
    const feedUrls = [
      'https://news.google.com/rss/search?q=commodities+aço+logistica+comercio&hl=pt-BR&gl=BR&ceid=BR:pt-419',
      'https://news.google.com/rss/search?q=geopolitica+negocios+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419'
    ]

    let totalImportadas = 0

    for (const url of feedUrls) {
      const feed = await parser.parseURL(url)

      // Analisa os 6 itens mais recentes de cada feed
      for (const item of feed.items.slice(0, 6)) {
        if (!item.link || !item.title) continue

        // 1. Evita duplicidade verificando se a URL original já existe no banco
        const exists = await prisma.newsArticle.findFirst({
          where: { sourceUrl: item.link }
        })

        if (exists) continue

        // 2. Identifica categorias aplicáveis com base nas palavras-chave do título e resumo
        const fullText = `${item.title} ${item.contentSnippet || ''}`.toLowerCase()
        const matchedCategories: string[] = []

        for (const [catName, keywords] of Object.entries(CATEGORIES_MAP)) {
          if (keywords.some(kw => fullText.includes(kw))) {
            matchedCategories.push(catName)
          }
        }

        // Categoria padrão caso nenhuma palavra-chave seja encontrada
        if (matchedCategories.length === 0) {
          matchedCategories.push('Geopolítica')
        }

        // Gera o Slug amigável para a URL do artigo
        const slug = item.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')

        // 3. Cadastra o Artigo no banco
        const article = await prisma.newsArticle.create({
          data: {
            title: item.title,
            slug: `${slug}-${Date.now().toString().slice(-4)}`,
            summary: item.contentSnippet || item.title,
            impactAnalysis: `Impacto potencial mapeado na cadeia de suprimentos e custos operacionais de insumos B2B.`,
            sourceName: item.creator || 'Google News',
            sourceUrl: item.link,
            imageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=60',
          }
        })

        // 4. Cria/Conecta as categorias na tabela pivô
        for (const catName of matchedCategories) {
          const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-')

          const category = await prisma.newsCategory.upsert({
            where: { name: catName },
            update: {},
            create: { name: catName, slug: catSlug }
          })

          await prisma.newsArticleOnCategories.create({
            data: {
              articleId: article.id,
              categoryId: category.id
            }
          })
        }

        totalImportadas++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Ingestão concluída com sucesso! ${totalImportadas} novas notícias foram importadas.`
    })
  } catch (error: any) {
    console.error('Erro na ingestão do Pulse:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}