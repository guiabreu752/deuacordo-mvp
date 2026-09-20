'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface AffiliateProduct {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  description: string;
  priceEstimate?: string;
  rating?: string;
  imageUrl: string;
  affiliateUrl: string;
  badge?: string;
  active?: boolean;
}

// ── Lista Fallback de Segurança ─────
const fallbackProducts: AffiliateProduct[] = [
  {
    id: '1',
    title: 'Como Chegar ao Sim (Getting to Yes)',
    category: 'livros',
    categoryLabel: 'Livros de Negociação',
    description: 'O método Harvard para negociar acordos sem ceder. Leitura obrigatória para qualquer comprador B2B.',
    priceEstimate: 'R$ 49,90',
    rating: '4.9 ★',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400',
    affiliateUrl: 'https://www.amazon.com.br/Como-chegar-sim-negociar-concess%C3%B5es/dp/8543106214?tag=deuacordo-20',
    badge: 'Mais Vendido',
    active: true,
  },
  {
    id: '2',
    title: 'Nunca Divida a Diferença (Never Split the Difference)',
    category: 'livros',
    categoryLabel: 'Livros de Negociação',
    description: 'Táticas de negociação de alto impacto escritas por Chris Voss, ex-negociador de reféns do FBI.',
    priceEstimate: 'R$ 54,00',
    rating: '5.0 ★',
    imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=400',
    badge: 'Recomendado',
    affiliateUrl: 'https://amazon.com.br?tag=deuacordo-20',
    active: true,
  }
];

export default function DeuAcordoAcademyPage() {
  const [products, setProducts] = useState<AffiliateProduct[]>(fallbackProducts);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // ── Busca Produtos Cadastrados no Banco de Dados Supabase ─────
  useEffect(() => {
    async function loadDynamicProducts() {
      try {
        const res = await fetch('/api/academy/products');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Filtra apenas produtos ativos marcados pelo Admin
            const activeOnly = data.filter((p: any) => p.active !== false);
            if (activeOnly.length > 0) {
              setProducts(activeOnly);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao conectar com o banco de dados:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDynamicProducts();
  }, []);

  // ── Filtragem Tolerante (Funciona tanto se no banco estiver 'livros' como 'Livros de Negociação') ─────
  const filteredProducts = products.filter((product) => {
    const catLower = product.category.toLowerCase();
    const selectedLower = selectedCategory.toLowerCase();

    let matchesCategory = false;

    if (selectedCategory === 'todos') {
      matchesCategory = true;
    } else if (selectedLower === 'livros') {
      matchesCategory = catLower.includes('livro');
    } else if (selectedLower === 'cursos') {
      matchesCategory = catLower.includes('curso');
    } else if (selectedLower === 'escritorio') {
      matchesCategory = catLower.includes('escritorio') || catLower.includes('suprimento');
    } else if (selectedLower === 'software') {
      matchesCategory = catLower.includes('software') || catLower.includes('licenca');
    } else {
      matchesCategory = catLower === selectedLower;
    }

    const matchesSearch =
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header Unificado da Academy */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-lg">
                  D
                </div>
                <span className="font-extrabold text-slate-900 text-lg">
                  DeuAcordo<span className="text-emerald-500">.academy</span>
                </span>
              </Link>

              {/* Menu Dropdown de Produtos Indicados */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                >
                  <span>📦 Produtos Indicados</span>
                  <span className={`text-xs transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {/* Caixa Fluente do Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50">
                    <div className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors flex items-start gap-3" onClick={() => { setSelectedCategory('todos'); setIsDropdownOpen(false); }}>
                      <span className="text-xl">📦</span>
                      <div>
                        <p className="font-bold text-sm text-slate-900">Categorias em Destaque</p>
                        <p className="text-xs text-slate-500">Insumos, licenças de software, livros e cursos B2B.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Barra de Busca */}
            <div className="flex-1 max-w-md mx-4 hidden md:block">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar livros, cursos, suprimentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Área de Membros */}
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2"
              >
                Área de Membros (Alunos) →
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 mb-4">
            ✨ Curadoria DeuAcordo Academy
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Ferramentas, Livros e Cursos para Compradores e Negociadores
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Acelere os resultados da sua empresa e refine suas técnicas de negociação B2B com nossa seleção recomendada de insumos e treinamentos.
          </p>
        </div>
      </section>

      {/* Área Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Filtros por Categoria */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 custom-scrollbar">
          {[
            { id: 'todos', label: 'Todos os Indicados', icon: '📦' },
            { id: 'livros', label: 'Livros de Negociação', icon: '📚' },
            { id: 'cursos', label: 'Cursos & Treinamentos', icon: '🎓' },
            { id: 'escritorio', label: 'Insumos de Escritório', icon: '💼' },
            { id: 'software', label: 'Licenças de Software', icon: '💻' },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Vitrine de Produtos com Links de Afiliados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group"
            >
              <div>
                {/* Imagem do Produto */}
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  <img
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.badge && (
                    <span className="absolute top-3 left-3 bg-slate-900/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-md">
                      {item.badge}
                    </span>
                  )}
                  <span className="absolute bottom-3 right-3 bg-white/95 text-slate-900 text-xs font-extrabold px-2 py-0.5 rounded-md shadow-sm">
                    {item.rating || '5.0 ★'}
                  </span>
                </div>

                {/* Conteúdo */}
                <div className="p-5">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                    {item.categoryLabel || item.category}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base leading-snug mb-2 group-hover:text-emerald-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Ação / Link de Afiliado */}
              <div className="p-5 pt-0 border-t border-slate-100 mt-auto flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Preço estimado</span>
                  <span className="text-sm font-extrabold text-slate-900">{item.priceEstimate || 'Sob Consulta'}</span>
                </div>

                <a
                  href={item.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
                >
                  <span>Ver Oferta</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-slate-700 font-bold">Nenhum produto encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Tente trocar a categoria ou buscar por outro termo.</p>
          </div>
        )}
      </main>
    </div>
  );
}