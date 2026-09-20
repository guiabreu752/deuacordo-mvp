'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ── Paleta Executiva DeuAcordo ──────────────────────────────
const NAVY   = '#0F172A'
const E      = '#10B981'
const MUTED  = '#64748B'
const BORDER = '#E2E8F0'
const RED    = '#DC2626'
const WHITE  = '#FFFFFF'
const SLATE  = '#F8FAFC'

type Tab = 'entrar' | 'criar'

function redirectToHub(router: ReturnType<typeof useRouter>) {
  router.replace('/dashboard')
}

function traduzirErro(msg: string): string {
  if (msg.includes('Invalid login credentials'))
    return 'E-mail ou senha incorretos. Verifique e tente novamente.'
  if (msg.includes('Email not confirmed'))
    return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'
  if (msg.includes('User already registered'))
    return 'Este e-mail já possui uma conta. Use a aba "Entrar".'
  if (msg.includes('Password should be at least'))
    return 'A senha deve ter pelo menos 6 caracteres.'
  if (msg.includes('Unable to validate email address'))
    return 'Endereço de e-mail inválido.'
  if (msg.includes('Email rate limit exceeded'))
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  if (msg.includes('signup_disabled'))
    return 'Cadastro temporariamente desabilitado. Entre em contato.'
  return msg
}

function Campo({
  label, id, type = 'text', value, onChange, placeholder, autoComplete,
}: {
  label: string; id: string; type?: string; value: string
  onChange: (v: string) => void; placeholder?: string; autoComplete?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <label htmlFor={id} style={{
        display: 'block', fontSize: 12, fontWeight: 700, color: NAVY,
        marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {label}
      </label>
      <input
        id={id} type={type} value={value} placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '11px 13px', background: WHITE,
          border: `1px solid ${focused ? E : BORDER}`, borderRadius: 8,
          color: NAVY, fontSize: 14, outline: 'none', boxSizing: 'border-box',
          boxShadow: focused ? `0 0 0 3px ${E}20` : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  )
}

function Alerta({ tipo, texto }: { tipo: 'erro' | 'sucesso'; texto: string }) {
  const isErro = tipo === 'erro'
  return (
    <div style={{
      background: isErro ? '#FEF2F2' : '#ECFDF5',
      border: `1px solid ${isErro ? '#FECACA' : '#A7F3D0'}`,
      borderRadius: 8, padding: '10px 14px', marginBottom: '1rem',
      display: 'flex', alignItems: 'flex-start', gap: 8,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{isErro ? '⚠️' : '✅'}</span>
      <p style={{ fontSize: 13, color: isErro ? RED : '#065F46', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
        {texto}
      </p>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()

  const [tab, setTab]         = useState<Tab>('entrar')
  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [nome, setNome]       = useState('')
  const [erro, setErro]       = useState('')
  const [sucesso, setSucesso] = useState('')
  const [loading, setLoading] = useState(false)
  const [checando, setChecando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        redirectToHub(router)
      } else {
        setChecando(false)
      }
    })
  }, [router])

  function limpar() { setErro(''); setSucesso('') }

  async function entrar(e: React.FormEvent) {
    e.preventDefault(); limpar()
    if (!email || !senha) { setErro('Preencha e-mail e senha.'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      })
      if (error) throw error

      redirectToHub(router)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.'
      setErro(traduzirErro(msg))
    } finally {
      setLoading(false)
    }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault(); limpar()
    if (!nome.trim())     { setErro('Informe seu nome completo.'); return }
    if (!email)           { setErro('Informe seu e-mail.'); return }
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          data: {
            nome_completo: nome.trim(),
          },
        },
      })
      if (error) throw error
      setSucesso('Conta criada com sucesso! Faça login para acessar o Hub.')
      setTab('entrar')
      setSenha('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.'
      setErro(traduzirErro(msg))
    } finally {
      setLoading(false)
    }
  }

  if (checando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: SLATE }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: E,
          borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: 13, color: MUTED }}>Verificando sessão...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, system-ui, sans-serif', background: SLATE }}>

      {/* Lado esquerdo: Branding */}
      <div style={{
        flex: 1, padding: '3rem', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', background: WHITE, borderRight: `1px solid ${BORDER}`,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.png" alt="DeuAcordo.com" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 20, color: NAVY, letterSpacing: '-0.02em' }}>
            DeuAcordo<span style={{ color: E }}>.com</span>
          </span>
        </Link>

        <div style={{ maxWidth: 440 }}>
          <div style={{
            display: 'inline-block', background: '#ECFDF5', color: '#065F46',
            fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
            marginBottom: '1.5rem', letterSpacing: '0.06em', textTransform: 'uppercase'
          }}>
            Acesso Único à Plataforma
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: NAVY, lineHeight: 1.25, letterSpacing: '-0.03em', margin: '0 0 1.5rem' }}>
            Negociação estruturada com{' '}
            <span style={{ color: E, fontStyle: 'italic' }}>resultado garantido</span>.
          </h1>

          <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: '2rem' }}>
            Acesse as ferramentas de inteligência de compras, cotações B2B, leilões e ecossistema de soluções da DeuAcordo.com.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', paddingTop: '1.5rem', borderTop: `1px solid ${BORDER}` }}>
            {[
              { valor: '20%', label: 'fee só sobre saving real' },
              { valor: '100%', label: 'risco zero garantido' },
              { valor: '15 dias', label: 'prazo médio de resultado' },
            ].map(({ valor, label }) => (
              <div key={label}>
                <div style={{ fontSize: 20, fontWeight: 800, color: E, letterSpacing: '-0.02em' }}>{valor}</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 1.4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#CBD5E1' }}>© {new Date().getFullYear()} DeuAcordo.com</p>
      </div>

      {/* Lado direito: Formulário sem seleção de perfil */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          <div style={{
            display: 'flex', background: WHITE, border: `1px solid ${BORDER}`,
            borderRadius: 10, padding: 4, gap: 4, marginBottom: '2rem',
          }}>
            {(['entrar', 'criar'] as Tab[]).map(t => (
              <button key={t} onClick={() => { setTab(t); limpar() }} style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: 7,
                background: tab === t ? NAVY : 'transparent',
                color: tab === t ? WHITE : MUTED,
                fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {t === 'entrar' ? 'Entrar' : 'Criar Conta'}
              </button>
            ))}
          </div>

          <div style={{
            background: WHITE, borderRadius: 16, padding: '2rem',
            border: `1px solid ${BORDER}`, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.04)',
          }}>

            {tab === 'entrar' && (
              <>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 0.25rem' }}>Bem-vindo de volta.</h2>
                <p style={{ fontSize: 13, color: MUTED, margin: '0 0 1.75rem' }}>
                  Acesse o ecossistema e navegue pelos seus módulos ativos.
                </p>

                <form onSubmit={entrar} noValidate>
                  <Campo label="E-mail" id="login-email" type="email" value={email}
                    onChange={setEmail} placeholder="seu@email.com.br" autoComplete="email" />
                  <Campo label="Senha" id="login-senha" type="password" value={senha}
                    onChange={setSenha} placeholder="••••••••" autoComplete="current-password" />

                  {erro    && <Alerta tipo="erro"    texto={erro} />}
                  {sucesso && <Alerta tipo="sucesso" texto={sucesso} />}

                  <button type="submit" disabled={loading} style={{
                    width: '100%', padding: '13px', marginTop: 8,
                    background: loading ? '#A7F3D0' : E, border: 'none', borderRadius: 8,
                    color: loading ? '#065F46' : WHITE,
                    fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                    transition: 'background 0.15s',
                  }}>
                    {loading ? 'Entrando...' : 'Entrar no Hub →'}
                  </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: 13, color: MUTED }}>
                  Não tem conta?{' '}
                  <button onClick={() => { setTab('criar'); limpar() }} style={{
                    background: 'none', border: 'none', color: E,
                    fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: 0,
                  }}>
                    Criar agora
                  </button>
                </p>
              </>
            )}

            {tab === 'criar' && (
              <>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 0.25rem' }}>Criar sua conta.</h2>
                <p style={{ fontSize: 13, color: MUTED, margin: '0 0 1.5rem' }}>Gratuito. Sem cartão de crédito.</p>

                <form onSubmit={criar} noValidate>
                  <Campo label="Seu nome completo" id="criar-nome" value={nome}
                    onChange={setNome} placeholder="João Silva" autoComplete="name" />
                  <Campo label="E-mail" id="criar-email" type="email" value={email}
                    onChange={setEmail} placeholder="seu@email.com.br" autoComplete="email" />
                  <Campo label="Senha (mínimo 6 caracteres)" id="criar-senha" type="password" value={senha}
                    onChange={setSenha} placeholder="••••••••" autoComplete="new-password" />

                  <div style={{ marginBottom: '1.25rem' }}>
                    {[
                      { ok: senha.length >= 6, label: 'Pelo menos 6 caracteres' },
                      { ok: /[A-Z]/.test(senha), label: 'Uma letra maiúscula (recomendado)' },
                      { ok: /\d/.test(senha),    label: 'Um número (recomendado)' },
                    ].map(r => (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: r.ok ? E : '#CBD5E1', fontWeight: 700 }}>
                          {r.ok ? '✓' : '○'}
                        </span>
                        <span style={{ fontSize: 11, color: r.ok ? '#065F46' : MUTED }}>{r.label}</span>
                      </div>
                    ))}
                  </div>

                  {erro    && <Alerta tipo="erro"    texto={erro} />}
                  {sucesso && <Alerta tipo="sucesso" texto={sucesso} />}

                  <button type="submit" disabled={loading} style={{
                    width: '100%', padding: '13px', marginTop: 4,
                    background: loading ? '#A7F3D0' : E,
                    border: 'none', borderRadius: 8,
                    color: loading ? '#065F46' : WHITE,
                    fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                    transition: 'background 0.15s',
                  }}>
                    {loading ? 'Criando conta...' : 'Criar minha conta gratuita →'}
                  </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: 13, color: MUTED }}>
                  Já tem conta?{' '}
                  <button onClick={() => { setTab('entrar'); limpar() }} style={{
                    background: 'none', border: 'none', color: E,
                    fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: 0,
                  }}>
                    Entrar
                  </button>
                </p>
              </>
            )}
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: 12, color: '#CBD5E1', lineHeight: 1.6 }}>
            Ao continuar, você concorda com os{' '}
            <Link href="/termos" style={{ color: MUTED, textDecoration: 'underline' }}>Termos de Uso</Link>{' '}
            e a{' '}
            <Link href="/privacidade" style={{ color: MUTED, textDecoration: 'underline' }}>Política de Privacidade</Link>.
          </p>
        </div>
      </div>

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  )
}
