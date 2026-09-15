'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const NAVY = '#0F172A'
const E = '#10B981'
const MUTED = '#64748B'
const BORDER = '#E2E8F0'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Redireciona para a área logada de teste
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F8FAFC', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* LADO ESQUERDO: Branding & Impacto */}
      <div
        style={{
          flex: 1,
          padding: '4rem 3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: `1px solid ${BORDER}`,
          background: '#FFFFFF',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="DeuAcordo.com" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 20, color: NAVY, letterSpacing: '-0.02em' }}>
            DeuAcordo<span style={{ color: E }}>.com</span>
          </span>
        </Link>

        <div style={{ maxWidth: 520, margin: '2rem 0' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: NAVY, lineHeight: 1.25, letterSpacing: '-0.03em' }}>
            A plataforma que conecta sua empresa aos melhores compradores para <span style={{ color: E, fontStyle: 'italic' }}>reduzir custos</span> e gerar <span style={{ color: E, fontStyle: 'italic' }}>saving real</span>.
          </h1>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '3rem', paddingTop: '2rem', borderTop: `1px solid ${BORDER}` }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>+R$ 15M+</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>savings gerados</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>100%</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>risco zero (success fee)</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>Rede ativa</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>compradores B2B</div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: MUTED }}>
          © {new Date().getFullYear()} DeuAcordo.com — Inteligência e Redução de Custos B2B.
        </div>
      </div>

      {/* LADO DIREITO: Card de Login */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '2.5rem',
            border: `1px solid ${BORDER}`,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: '0.1em' }}>
            ACESSAR PLATAFORMA
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: NAVY, marginTop: 6, marginBottom: '2rem' }}>
            Bem-vindo de volta.
          </h2>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                E-mail corporativo
              </label>
              <input
                type="email"
                required
                placeholder="voce@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  fontSize: 14,
                  outline: 'none',
                  background: '#F8FAFC',
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>Senha</label>
                <a href="#" style={{ fontSize: 12, color: MUTED, textDecoration: 'none' }}>
                  Esqueci minha senha
                </a>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  fontSize: 14,
                  outline: 'none',
                  background: '#F8FAFC',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                background: NAVY,
                color: '#FFF',
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                marginTop: '0.5rem',
                boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
              }}
            >
              Entrar →
            </button>
          </form>
        </div>
      </div>

    </div>
  )
}