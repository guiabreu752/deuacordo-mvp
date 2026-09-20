import { NextResponse } from 'next/server'
import Parser from 'rss-parser'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '@/lib/prisma'

const parser = new Parser()
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const CATEGORIES_MAP: Record<string, string[]> = {
  'Aço & Metais': ['aço', 'metalurgia', 'minério', 'usinagem', 'siderurgia', 'ferro', 'inoxidável', 'metal'],
  'Energia & Câmbio': ['dólar', 'câmbio', 'energia', 'petróleo', 'combustível', 'inflação', 'selic', 'tarifa'],
  'Logística Global': ['frete', 'marítimo', 'porto', 'logística', 'contêiner', 'importação', 'exportação', 'transporte'],
  'Geopolítica': ['china', 'eua', 'guerra', 'sanções', 'tarifa', 'comércio exterior', 'brics', 'governo']
}

export async function GET() {
  try {
    const feedUrls = [
      'https://news.google.com/rss/search?q=geopolitica+negocios+comercio+exterior&hl=pt-BR&gl=BR&ceid=BR:pt-419',
      'https://news.google.com/rss/search?q=commodities+aço+logistica+industria&hl=pt-BR&gl=BR&ceid=BR:pt-419'
    ]

    let totalImportadas = 0
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    for (const url of feedUrls) {
      const feed = await parser.parseURL(url)

      for (const item of feed.items.slice(0, 3)) {
        if (!item.link || !item.title) continue

        const exists = await prisma.newsArticle.findFirst({
          where: { sourceUrl: item.link }
        })

        if (exists) continue

        const fonteOriginal = item.creator || 'Google News'
        const textoBase = `${item.title}.${item.contentSnippet || ''}`

        const promptIA = `
          Você é um jornalista sênior de negócios B2B e geopolítica do portal "DeuAcordo Pulse".
          Com base nesta manchete e fatos: "${textoBase}", escreva um post de blog informativo, inédito e completo em português.

          Retorne ESTRITAMENTE um objeto JSON válido (sem marcação markdown, sem \`\`\`json) com o seguinte formato exato:
          {
            "titulo": "Título atraente e profissional reescrito para SEO",
            "conteudoCompleto": "Escreva um texto longo de 3 a 4 parágrafos explicativos detalhando o fato, o impacto econômico e o contexto geopolítico.",
            "impactoB2B": "Explicar em 2 frases objetivas como isso afeta custos, insumos e negociações B2B no Brasil."
          }
        `

        let artigoIA = {
          titulo: item.title,
          conteudoCompleto: `${item.title}. O cenário atual exige atenção estratégica dos gestores B2B para mitigar riscos na cadeia de suprimentos e ajustar margens operacionais. Acompanhe os desdobramentos de mercado diretamente na plataforma DeuAcordo.`,
          impactoB2B: 'Impacto em análise pela equipe de inteligência de mercado B2B.'
        }

        try {
          if (process.env.GEMINI_API_KEY) {
            const result = await model.generateContent(promptIA)
            const textResponse = result.response.text()
            const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim()
            const parsed = JSON.parse(cleanJson)
            if (parsed.titulo && parsed.conteudoCompleto) {
              artigoIA = parsed
            }
          }
        } catch (err) {
          console.warn('IA indisponível ou falha no Parse JSON, aplicando texto expansivo padrão:', err)
        }

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

        const article = await prisma.newsArticle.create({
          data: {
            title: artigoIA.titulo,
            slug: `${slug}-${Date.now().toString().slice(-4)}`,
            summary: artigoIA.conteudoCompleto, // Texto longo gravado no banco
            impactAnalysis: artigoIA.impactoB2B,
            sourceName: fonteOriginal,
            sourceUrl: item.link,
            imageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=60',
          }
        })

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