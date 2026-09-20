import { NextResponse } from 'next/server'
import Parser from 'rss-parser'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '@/lib/prisma'

const parser = new Parser()

// Inicializa a API do Gemini (Gratuita) usando a chave de ambiente
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Mapeamento de termos para categorização automática B2B
const CATEGORIES_MAP: Record<string, string[]> = {
  'Aço & Metais': ['aço', 'metalurgia', 'minério', 'usinagem', 'siderurgia', 'ferro', 'inoxidável', 'metal'],
  'Energia & Câmbio': ['dólar', 'câmbio', 'energia', 'petróleo', 'combustível', 'inflação', 'selic', 'tarifa'],
  'Logística Global': ['frete', 'marítimo', 'porto', 'logística', 'contêiner', 'importação', 'exportação', 'transporte'],
  'Geopolítica': ['china', 'eua', 'guerra', 'sanções', 'tarifa', 'comércio exterior', 'brics', 'governo']
}

export async function GET() {
  try {
    // 1. Feeds RSS Públicos do Google News
    const feedUrls = [
      'https://news.google.com/rss/search?q=geopolitica+negocios+comercio+exterior&hl=pt-BR&gl=BR&ceid=BR:pt-419',
      'https://news.google.com/rss/search?q=commodities+aço+logistica+industria&hl=pt-BR&gl=BR&ceid=BR:pt-419'
    ]

    let totalImportadas = 0
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    for (const url of feedUrls) {
      const feed = await parser.parseURL(url)

      // Processa até 3 notícias por rodada para garantir rapidez e limite de quota
      for (const item of feed.items.slice(0, 3)) {
        if (!item.link || !item.title) continue

        // Evita duplicidade
        const exists = await prisma.newsArticle.findFirst({
          where: { sourceUrl: item.link }
        })

        if (exists) continue

        const fonteOriginal = item.creator || 'Google News'
        const textoBase = `${item.title}. ${item.contentSnippet || ''}`

        // 2. Prompt estruturado para a IA expandir a notícia para post de blog completo
        const promptIA = `
          Você é um jornalista sênior de negócios B2B e geopolítica para o portal "DeuAcordo Pulse".
          Com base na seguinte manchete e resumo: "${textoBase}", escreva um post de blog informativo e inédito.

          Retorne ESTRITAMENTE um objeto JSON válido (sem marcação markdown adicional) com o seguinte formato:
          {
            "titulo": "Um título atraente e profissional reescrito com palavras-chave de SEO",
            "conteudoCompleto": "Escreva de 3 a 4 parágrafos bem explicativos contextualizando o fato, o impacto econômico e o cenário geopolítico atual. Sem plágio.",
            "impactoB2B": "1 ou 2 frases explicando objetivamente como isso afeta custos, negociações ou suprimentos de empresas B2B no Brasil."
          }
        `

        let artigoIA = {
          titulo: item.title,
          conteudoCompleto: item.contentSnippet || item.title,
          impactoB2B: 'Impacto em análise pela equipe de inteligência de mercado.'
        }

        try {
          if (process.env.GEMINI_API_KEY) {
            const result = await model.generateContent(promptIA)
            const textResponse = result.response.text()
            // Limpa formatações JSON do Markdown se houver
            const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim()
            artigoIA = JSON.parse(cleanJson)
          }
        } catch (err) {
          console.warn('Falha na resposta da IA, usando conteúdo base:', err)
        }

        // Categorização
        const fullText = `${artigoIA.titulo} ${artigoIA.conteudoCompleto}`.toLowerCase()
        const matchedCategories: string[] = []

        for (const [catName, keywords] of Object.entries(CATEGORIES_MAP)) {
          if (keywords.some(kw => fullText.includes(kw))) {
            matchedCategories.push(catName)
          }
        }

        if (matchedCategories.length === 0) matchedCategories.push('Geopolítica')

        const slug = artigoIA.titulo
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')

        // 3. Salva no Supabase via Prisma
        const article = await prisma.newsArticle.create({
          data: {
            title: artigoIA.titulo,
            slug: `${slug}-${Date.now().toString().slice(-4)}`,
            summary: artigoIA.conteudoCompleto, // Texto expandido e reescrito
            impactAnalysis: artigoIA.impactoB2B,
            sourceName: fonteOriginal,
            sourceUrl: item.link,
            imageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=60',
          }
        })

        // Conecta categorias
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
      message: `Ingestão com IA concluída! ${totalImportadas} novos artigos completos gerados.`
    })
  } catch (error: any) {
    console.error('Erro na ingestão do Pulse:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}