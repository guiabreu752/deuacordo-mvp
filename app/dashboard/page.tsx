'use client'

import Link from 'next/link'

const NAVY = '#0F172A'
const E = '#10B981'
const BORDER = '#E2E8F0'

export default function DashboardPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Header do Painel */}
      <header style={{ background: '#FFF', borderBottom: `1px solid ${BORDER}`, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="DeuAcordo.com" style={{ height: 36, width: 'auto' }} />
          <span style={{ fontWeight: 800, fontSize: 18, color: NAVY }}>
            DeuAcordo<span style={{ color: E }}>.com</span>
          </span>
        </Link>

        <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', textDecoration: 'none' }}>
          Sair →
        </Link>
      </header>

      {/* Conteúdo da Área Logada */}
      <main style={{ maxWidth: 1000, margin: '3rem auto', padding: '0 1.5rem' }}>
        <div style={{ background: '#FFF', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '2.5rem' }}>
          <span style={{ background: '#ECFDF5', color: '#065F46', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
            ÁREA RESTRITA
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: NAVY, marginTop: 12 }}>
            Bem-vindo ao Painel DeuAcordo.com
          </h1>
          <p style={{ color: '#64748B', marginTop: 8 }}>
            Sua conta foi autenticada com sucesso. Em breve, você poderá gerenciar mesas de negociação, demandas ativas e relatórios de saving diretamente por aqui.
          </p>
        </div>
      </main>

    </div>
  )
}