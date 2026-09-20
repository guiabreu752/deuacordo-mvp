'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import * as cheerio from 'cheerio'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const CATEGORIES_MAP: Record<string, string[]> = {
  'Aço & Metais': ['aço', 'metalurgia', 'minério', 'usinagem', 'siderurgia', 'ferro', 'inoxidável', 'metal'],
  'Energia & Câmbio': ['dólar', 'câmbio', 'energia', 'petróleo', 'combustível', 'inflação', 'selic', 'tarifa'],
  'Logística Global': ['frete', 'marítimo', 'porto', 'logística', 'contêiner', 'importação', 'exportação', 'transporte'],
  'Geopolítica': ['china', 'eua', 'guerra', 'sanções', 'tarifa', 'comércio exterior', 'brics', 'governo']
}

export async function processAndPublishArticle(targetUrl: string) {
  try {
    if (!targetUrl.startsWith('http')) {
      return { success: false, error: 'Por favor, insira uma URL válida (começando com http ou https).' }
    }

    // 1. Raspa a página original para extrair o texto completo da notícia
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    })

    if (!response.ok) {
      return { success: false, error: 'Não foi possível acessar a notícia original.' }
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove elementos indesejados do HTML lido
    $('script, style, nav, footer, header, iframe, ads').remove()

    // Pega o título original e junta todos os parágrafos de texto da matéria
    const rawTitle = $('title').text() || $('h1').first().text() || 'Notícia de Mercado B2B'
    const rawParagraphs: string[] = []

    $('p').each((_, el) => {
      const text = $(el).text().trim()
      if (text.length > 50) { // Filtra apenas parágrafos reais da matéria
        rawParagraphs.push(text)
      }
    })

    const fullArticleContent = rawParagraphs.slice(0, 10).join('\n\n')

    if (!fullArticleContent || fullArticleContent.length < 100) {
      return { success: false, error: 'Não foi possível extrair o texto completo deste site. Tente outro link.' }
    }

    // Extrai o nome do site/portal (Domínio)
    const domain = new URL(targetUrl).hostname.replace('www.', '')

    // 2. Envia o texto COMPLETO para o Gemini reescrever
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const promptIA = `
      Você é um jornalista sênior de negócios B2B e geopolítica do portal "DeuAcordo Pulse".
      Leia a matéria completa abaixo extraída do portal ${domain}:

      TEXTO ORIGINAL:
      ${fullArticleContent}

      Escreva um artigo de blog completamente inédito em português com base nos fatos acima.

      Retorne ESTRITAMENTE um objeto JSON válido (sem marcação markdown, sem \`\`\`json) com o seguinte formato:
      {
        "titulo": "Título forte e profissional reescrito para SEO e atração de executivos B2B",
        "conteudoCompleto": "Escreva de 3 a 4 parágrafos bem explicativos, ricos em detalhes e fluido detalhando os fatos e o impacto econômico.",
        "impactoB2B": "1 ou 2 frases objetivas explicando como isso afeta custos, insumos e negociações B2B no Brasil."
      }
    `

    const result = await model.generateContent(promptIA)
    const textResponse = result.response.text()
    const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim()
    const artigoIA = JSON.parse(cleanJson)

    // 3. Mapeia categorias
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

    // 4. Salva no Supabase via Prisma
    const article = await prisma.newsArticle.create({
      data: {
        title: artigoIA.titulo,
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        summary: artigoIA.conteudoCompleto, // Texto longo reescrito com múltiplos parágrafos
        impactAnalysis: artigoIA.impactoB2B,
        sourceName: domain,
        sourceUrl: targetUrl,
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

    revalidatePath('/pulse')
    revalidatePath('/dashboard/pulse/admin')

    return { success: true, data: article }
  } catch (error: any) {
    console.error('Erro na curadoria com IA:', error)
    return { success: false, error: 'Falha ao processar o link com a IA.' }
  }
}