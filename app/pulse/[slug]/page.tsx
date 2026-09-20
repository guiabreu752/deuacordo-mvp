import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

interface PulseArticlePageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function PulseArticlePage({ params }: PulseArticlePageProps) {
  // Aguarda a resolução das rotas dinâmicas (exigido no Next.js recente)
  const { slug } = await params

  // Busca o artigo e suas categorias no banco Prisma
  const article = await prisma.newsArticle.findUnique({
    where: { slug },
    include: {
      categories: {
        include: { category: true }
      }
    }
  })

  // Se a notícia não for encontrada, retorna 404 de forma limpa sem quebrar o servidor
  if (!article) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header Unificado do Pulse */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/pulse" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-lg">
              D
            </div>
            <span className="font-extrabold text-white text-lg">
              DeuAcordo<span className="text-emerald-400">.pulse</span>
            </span>
          </Link>

          <Link href="/pulse" className="text-xs text-slate-400 hover:text-white transition-colors">
            ← Voltar para o Feed
          </Link>
        </div>
      </header>

      {/* Artigo no seu site */}
      <main className="max-w-4xl mx-auto px-4 py-10">
        <article className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm">
          {/* Categorias */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {article.categories && article.categories.length > 0 ? (
              article.categories.map((c) => (
                <span key={c.categoryId} className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-md">
                  {c.category.name}
                </span>
              ))
            ) : (
              <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-1 rounded-md">
                Geopolítica & Mercado
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center gap-4 text-xs text-slate-400 mb-8 pb-4 border-b border-slate-100">
            <span>Fonte: {article.sourceName}</span>
            <span>•</span>
            <span>{new Date(article.publishedAt).toLocaleDateString('pt-BR')}</span>
          </div>

          {article.imageUrl && (
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-80 object-cover rounded-xl mb-8"
            />
          )}

          {/* Espaço para Banner de Monetização / Ads */}
          <div className="my-6 p-4 bg-slate-100 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
            📢 Espaço de Publicidade B2B / Google AdSense / Banner DeuAcordo
          </div>

          {/* Resumo/Conteúdo do Artigo */}
          <div className="prose max-w-none text-slate-700 leading-relaxed mb-8 text-sm sm:text-base">
            <p>{article.summary}</p>
          </div>

          {/* Análise Exclusiva de Impacto B2B */}
          {article.impactAnalysis && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-8">
              <span className="text-xs font-extrabold text-emerald-800 uppercase block mb-1">
                ⚡ Análise de Impacto de Mercado B2B:
              </span>
              <p className="text-sm text-emerald-900 font-medium">
                {article.impactAnalysis}
              </p>
            </div>
          )}

          {/* Link discreto para a matéria original no final */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Notícia agregada do portal {article.sourceName}</span>
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-emerald-600 hover:text-emerald-700"
            >
              Ver matéria original na fonte ↗
            </a>
          </div>
        </article>
      </main>
    </div>
  )
}