'use client'

import { useState } from 'react'
import Link from 'next/link'

const NAVY = '#0F172A'
const E = '#10B981'
const MUTED = '#64748B'
const BORDER = '#E2E8F0'

// Estrutura de dados das opções do menu
const menuItems = [
  {
    label: 'Soluções',
    dropdown: [
      {
        icon: '🏢',
        title: 'Para Empresas',
        desc: 'Cadastre suas demandas de compras e reduza custos sem risco.',
        href: '/empresa',
      },
      {
        icon: '🤝',
        title: 'Para Consultores / Closers',
        desc: 'Negocie mesas ativas e receba participações sobre o saving.',
        href: '/consultor',
      },
    ],
  },
  {
    label: 'Planos',
    dropdown: [
      {
        icon: '⚡',
        title: 'Success Fee (20%)',
        desc: 'Você só paga 20% sobre a economia real comprovada.',
        href: '/#planos',
      },
      {
        icon: '🛡️',
        title: 'Garantia Risco Zero',
        desc: 'Sem economia = zero custo. Sem mensalidades.',
        href: '/#planos',
      },
    ],
  },
  {
    label: 'Produtos Indicados',
    dropdown: [
      {
        icon: '📦',
        title: 'Categorias em Destaque',
        desc: 'Insumos, licenças de software, frotas e logística B2B.',
        href: '/#produtos',
      },
    ],
  },
  {
    label: 'Comunidade',
    dropdown: [
      {
        icon: '👥',
        title: 'Rede de Negociadores',
        desc: 'Conecte-se com os melhores compradores do mercado.',
        href: '/#comunidade',
      },
    ],
  },
  {
    label: 'Sobre Nós',
    href: '/#sobre',
  },
]

export default function Navbar() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(248, 250, 252, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${BORDER}`,
      }}
      onMouseLeave={() => setActiveDropdown(null)}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img
            src="/logo.png"
            alt="DeuAcordo.com"
            style={{ height: 44, width: 'auto', objectFit: 'contain' }}
          />
          <span style={{ fontWeight: 800, fontSize: 19, color: NAVY, letterSpacing: '-0.02em' }}>
            DeuAcordo<span style={{ color: E }}>.com</span>
          </span>
        </Link>

        {/* Menu Principal */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {menuItems.map((item) => (
            <div
              key={item.label}
              style={{ position: 'relative' }}
              onMouseEnter={() => setActiveDropdown(item.dropdown ? item.label : null)}
            >
              {item.href ? (
                <Link
                  href={item.href}
                  style={{
                    padding: '8px 14px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: NAVY,
                    textDecoration: 'none',
                    borderRadius: 6,
                    display: 'block',
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '8px 14px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: activeDropdown === item.label ? E : NAVY,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {item.label}
                  <span
                    style={{
                      fontSize: 10,
                      transition: 'transform 0.2s',
                      transform: activeDropdown === item.label ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    ▼
                  </span>
                </button>
              )}

              {/* Mega Menu Dropdown sem gap de hover */}
              {item.dropdown && activeDropdown === item.label && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: 320,
                    paddingTop: 8,
                    zIndex: 200,
                  }}
                >
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: `1px solid ${BORDER}`,
                      borderRadius: 12,
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    {item.dropdown.map((sub) => (
                      <Link
                        key={sub.title}
                        href={sub.href}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          padding: '10px 12px',
                          borderRadius: 8,
                          textDecoration: 'none',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ fontSize: 20 }}>{sub.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{sub.title}</div>
                          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.4, marginTop: 2 }}>
                            {sub.desc}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              background: '#ECFDF5',
              color: '#065F46',
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 20,
              border: '1px solid #A7F3D0',
            }}
          >
            SUCCESS FEE 20%
          </span>

          <Link
            href="/login"
            style={{
              color: NAVY,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Entrar
          </Link>

          <Link
            href="/empresa"
            style={{
              background: E,
              color: '#fff',
              padding: '9px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
            }}
          >
            Economize já →
          </Link>
        </div>
      </div>
    </header>
  )
}