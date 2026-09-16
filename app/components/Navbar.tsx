// ============================================================
// ARQUIVO 1: components/Navbar.tsx
// Correção dos 2 bugs do dropdown
// ============================================================
'use client'

import { useState } from 'react'
import Link from 'next/link'

const NAVY  = '#0F172A'
const E     = '#10B981'
const MUTED = '#64748B'
const BORDER = '#E2E8F0'

const menuItems = [
  {
    label: 'Soluções',
    dropdown: [
      { icon: '🏢', title: 'Para Empresas',            desc: 'Cadastre suas demandas e reduza custos sem risco.',              href: '/empresa'    },
      { icon: '🤝', title: 'Para Consultores / Closers', desc: 'Negocie mesas ativas e receba participações sobre o saving.',   href: '/consultor'  },
    ],
  },
  {
    label: 'Planos',
    dropdown: [
      { icon: '⚡', title: 'Success Fee (20%)',   desc: 'Você só paga 20% sobre a economia real comprovada.',  href: '/#planos' },
      { icon: '🛡️', title: 'Garantia Risco Zero', desc: 'Sem economia = zero custo. Sem mensalidades.',        href: '/#planos' },
    ],
  },
  {
    label: 'Produtos Indicados',
    dropdown: [
      { icon: '📦', title: 'Categorias em Destaque', desc: 'Insumos, licenças de software, frotas e logística B2B.', href: '/#produtos' },
    ],
  },
  {
    label: 'Comunidade',
    dropdown: [
      { icon: '👥', title: 'Rede de Negociadores', desc: 'Conecte-se com os melhores compradores do mercado.', href: '/#comunidade' },
    ],
  },
  { label: 'Sobre Nós', href: '/#sobre' },
]

export default function Navbar() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  return (
    <header
      style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(248,250,252,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <div style={{
        maxWidth: 1180, margin: '0 auto',
        padding: '0.85rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.png" alt="DeuAcordo.com" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 19, color: NAVY, letterSpacing: '-0.02em' }}>
            DeuAcordo<span style={{ color: E }}>.com</span>
          </span>
        </Link>

        {/* Menu */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {menuItems.map((item) => (
            <div
              key={item.label}
              style={{ position: 'relative' }}
              // ✅ FIX 1: só ativa se tiver dropdown; ao sair do item fecha
              onMouseEnter={() => { if (item.dropdown) setActiveDropdown(item.label) }}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              {item.href && !item.dropdown ? (
                <Link href={item.href} style={{
                  padding: '8px 14px', fontSize: 14, fontWeight: 600,
                  color: NAVY, textDecoration: 'none', borderRadius: 6, display: 'block',
                }}>
                  {item.label}
                </Link>
              ) : (
                <button style={{
                  background: 'transparent', border: 'none',
                  padding: '8px 14px', fontSize: 14, fontWeight: 600,
                  color: activeDropdown === item.label ? E : NAVY,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  borderRadius: 6,
                }}>
                  {item.label}
                  <span style={{
                    fontSize: 9,
                    transition: 'transform 0.2s',
                    transform: activeDropdown === item.label ? 'rotate(180deg)' : 'rotate(0deg)',
                    display: 'inline-block',
                  }}>▼</span>
                </button>
              )}

              {/* ✅ FIX 2: paddingTop cria ponte invisível entre botão e card,
                  eliminando o gap que fechava o dropdown prematuramente */}
              {item.dropdown && activeDropdown === item.label && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0,
                  width: 300,
                  paddingTop: 6,  // ponte invisível — não remova
                  zIndex: 200,
                }}>
                  <div style={{
                    background: '#fff',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 12,
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    padding: 8,
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}>
                    {item.dropdown.map((sub) => (
                      <Link
                        key={sub.title}
                        href={sub.href}
                        style={{
                          display: 'flex', alignItems: 'flex-start',
                          gap: 12, padding: '10px 12px',
                          borderRadius: 8, textDecoration: 'none',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{sub.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{sub.title}</div>
                          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.45, marginTop: 2 }}>{sub.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/login" style={{ color: NAVY, padding: '8px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Entrar
          </Link>
          <Link href="/empresa" style={{
            background: E, color: '#fff', padding: '9px 18px',
            borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
          }}>
            Economize já →
          </Link>
        </div>
      </div>
    </header>
  )
}

