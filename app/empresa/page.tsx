'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { createDeal } from '@/app/actions/deals'

type Etapa = 'empresa' | 'produto' | 'baseline' | 'confirma' | 'ok'

const vazio = {
  empresa: '', cnpj: '', nome: '', email: '', fone: '',
  produto: '', descricao: '', quantidade: '1', unidade: 'un',
  preco_atual: '', fornecedor: '', preco_alvo: '', prazo: '15'
}

function Campo({ label, id, value, onChange, placeholder, type = 'text', dica = '' }: any) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 12, color: '#0F172A', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input id={id} type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '11px 13px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
        onFocus={e => { e.target.style.borderColor = '#10B981'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)' }}
        onBlur={e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none' }}
      />
      {dica && <p style={{ fontSize: 11, color: '#64748B', marginTop: 4, margin: '4px 0 0' }}>{dica}</p>}
    </div>
  )
}

function Preview({ atual, alvo, quantidade }: any) {
  const a = parseFloat(atual.replace(',', '.')) || 0
  const b = parseFloat(alvo.replace(',', '.')) || 0
  const qty = parseInt(quantidade) || 1

  if (!a || !b || b >= a) return null

  const savingUnit = a - b
  const savingTotal = savingUnit * qty
  const pct = ((savingUnit / a) * 100).toFixed(1)
  const fee = (savingTotal * 0.2).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const liq = (savingTotal * 0.8).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '0.9rem', marginBottom: '1rem' }}>
      <p style={{ fontSize: 11, color: '#047857', marginBottom: 4, fontWeight: 700, letterSpacing: '0.07em', margin: '0 0 4px' }}>PRÉVIA DO SAVING TOTAL ({qty} {qty > 1 ? 'UNIDADES' : 'UNIDADE'})</p>
      <p style={{ fontSize: 24, fontWeight: 800, color: '#059669', margin: '0 0 3px' }}>{pct}% de economia estimada</p>
      <p style={{ fontSize: 12, color: '#065F46', margin: 0 }}>Fee DeuAcordo (20%): {fee} · Economia líquida: <strong>{liq}</strong></p>
    </div>
  )
}

const btn = (primary: boolean, label: string, onClick: any, disabled = false) => (
  <button onClick={onClick} disabled={disabled} style={{
    flex: primary ? 2 : 1, padding: '13px',
    background: disabled ? '#A7F3D0' : primary ? '#10B981' : '#F1F5F9',
    border: primary ? 'none' : '1px solid #CBD5E1',
    borderRadius: 8, color: primary ? '#FFFFFF' : '#334155',
    fontSize: 14, fontWeight: 700, cursor: disabled ? 'wait' : 'pointer',
    transition: 'all 0.2s ease'
  }}>{label}</button>
)

export default function EmpresaWizardPage() {
  const [etapa, setEtapa] = useState<Etapa>('empresa')
  const [f, setF] = useState(vazio)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k: string) => (v: string) => setF(p => ({ ...p, [k]: v }))
  const fileRef = useRef<HTMLInputElement>(null)

  async function enviar() {
    setEnviando(true); setErro('')
    try {
      // 1. Tenta pegar a sessão ativa do usuário
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id || `anon_${Date.now()}`
      const orgId = session?.user?.user_metadata?.organizationId || `org_${Date.now()}`

      const targetVal = f.preco_atual ? parseFloat(f.preco_atual.replace(',', '.')) : 0
      const currentVal = f.preco_alvo ? parseFloat(f.preco_alvo.replace(',', '.')) : 0
      const qty = parseInt(f.quantidade) || 1

      // 2. Registra o Deal oficial no Prisma através da Server Action
      const res = await createDeal({
        title: f.produto.trim(),
        description: `Descrição: ${f.descricao || 'N/A'} | Qtd: ${qty} ${f.unidade} | Contato: ${f.nome} (${f.email}) | Fornecedor Atual: ${f.fornecedor || 'N/A'}`,
        quantity: qty,
        targetValue: targetVal,
        currentValue: currentVal,
        organizationId: orgId,
        createdById: userId,
      })

      if (!res.success) {
        throw new Error(res.error || 'Erro ao registrar negociação.')
      }

      setEtapa('ok')
    } catch (e: any) {
      setErro(e.message || 'Erro ao enviar solicitação. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const card = (children: any) => (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '1rem 1rem 3rem' }}>
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '1.5rem', boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05)' }}>
        {children}
      </div>
    </div>
  )

  const titulo = (t: string, sub = '') => (
    <div style={{ marginBottom: '1.25rem' }}>
      <h2 style={{ fontSize: 19, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>{t}</h2>
      {sub && <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{sub}</p>}
    </div>
  )

  const rodape = (voltar: Etapa | null, proximo: () => void, labelProximo = 'Continuar →', disabled = false) => (
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      {voltar && btn(false, '← Voltar', () => setEtapa(voltar))}
      {btn(true, labelProximo, proximo, disabled)}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', fontWeight: 800, fontSize: 18, color: '#0F172A' }}>
          DeuAcordo<span style={{ color: '#10B981' }}>.com</span>
        </Link>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '4px 12px', borderRadius: 20 }}>
          Gratuito para o comprador
        </span>
      </header>

      {/* Botão voltar */}
      <div style={{ maxWidth: 520, margin: '0.75rem auto', padding: '0 1rem' }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Voltar para o Dashboard Hub
        </Link>
      </div>

      {/* Hero (só na primeira etapa) */}
      {etapa === 'empresa' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 1rem 0.5rem', maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669', padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.9rem' }}>
            SEM SAVING, SEM CUSTO
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, color: '#0F172A', margin: '0 0 0.75rem' }}>
            Sua empresa está pagando mais do que deveria nas compras?
          </h1>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.65, margin: '0 0 1.5rem' }}>
            Cadastre o que precisa sourcear. Um negociador busca alternativas e negocia por você.
            Você só paga <strong style={{ color: '#059669', background: '#ECFDF5', padding: '2px 6px', borderRadius: 4 }}>20% da economia real</strong>.
          </p>
        </div>
      )}

      {/* ETAPAS */}
      {etapa === 'empresa' && card(
        <>
          {titulo('Dados da sua empresa')}
          <Campo label="Nome da empresa *" id="emp" value={f.empresa} onChange={set('empresa')} placeholder="Ex: Metalúrgica Souza Ltda" />
          <Campo label="CNPJ" id="cnpj" value={f.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" dica="Opcional" />
          <Campo label="Seu nome *" id="nome" value={f.nome} onChange={set('nome')} placeholder="João Silva" />
          <Campo label="E-mail *" id="email" type="email" value={f.email} onChange={set('email')} placeholder="joao@empresa.com.br" />
          <Campo label="WhatsApp" id="fone" value={f.fone} onChange={set('fone')} placeholder="(11) 99999-9999" />
          {erro && <p style={{ color: '#DC2626', fontSize: 13, margin: '0 0 8px', fontWeight: 600 }}>⚠️ {erro}</p>}
          {rodape(null, () => {
            if (!f.empresa || !f.nome || !f.email) { setErro('Preencha os campos obrigatórios.'); return }
            setErro(''); setEtapa('produto')
          })}
        </>
      )}

      {etapa === 'produto' && card(
        <>
          {titulo('O que você precisa sourcear?', 'Seja específico — quanto mais detalhe, melhor.')}
          <Campo label="Produto ou serviço *" id="prod" value={f.produto} onChange={set('produto')} placeholder="Ex: Caixas de papelão ondulado 30x20x15cm" />
          <Campo label="Descrição técnica" id="desc" value={f.descricao} onChange={set('descricao')} placeholder="Especificações, normas, qualidade..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Campo label="Quantidade *" id="qtd" type="number" value={f.quantidade} onChange={set('quantidade')} placeholder="1" />
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: 12, color: '#0F172A', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unidade</label>
              <select value={f.unidade} onChange={e => set('unidade')(e.target.value)}
                style={{ width: '100%', padding: '11px 13px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 14, outline: 'none' }}>
                {['un', 'kg', 'ton', 'cx', 'pç', 'litro', 'm²', 'hora'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          {erro && <p style={{ color: '#DC2626', fontSize: 13, margin: '0 0 8px', fontWeight: 600 }}>⚠️ {erro}</p>}
          {rodape('empresa', () => { if (!f.produto) { setErro('Informe o produto.'); return } setErro(''); setEtapa('baseline') })}
        </>
      )}

      {etapa === 'baseline' && card(
        <>
          {titulo('Qual o preço que você paga hoje?', 'Base para calcular o saving real.')}
          <Campo label="Preço atual por unidade (R$) *" id="pa" value={f.preco_atual} onChange={set('preco_atual')} placeholder="Ex: 3,50" dica="Use vírgula ou ponto: 3,50 ou 3.50" />
          <Campo label="Fornecedor atual" id="forn" value={f.fornecedor} onChange={set('fornecedor')} placeholder="Ex: Embalagens Norte Ltda" dica="Não entraremos em contato com ele" />

          {/* Upload NF */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ display: 'block', fontSize: 12, color: '#0F172A', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>NF ou orçamento atual</label>
            <label style={{ display: 'block', border: '2px dashed #CBD5E1', borderRadius: 8, padding: '1rem', textAlign: 'center', cursor: 'pointer', background: arquivo ? '#ECFDF5' : '#F8FAFC' }}>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                onChange={e => { const fi = e.target.files?.[0]; if (fi) setArquivo(fi) }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: arquivo ? '#059669' : '#64748B' }}>
                {arquivo ? `✓ ${arquivo.name}` : '📎 Anexar PDF ou imagem (opcional)'}
              </span>
            </label>
          </div>

          <Campo label="Preço alvo por unidade (R$)" id="palvo" value={f.preco_alvo} onChange={set('preco_alvo')} placeholder="Ex: 2,80 (deixe vazio se não souber)" />
          <Preview atual={f.preco_atual} alvo={f.preco_alvo} quantidade={f.quantidade} />

          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ display: 'block', fontSize: 12, color: '#0F172A', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prazo para resultado</label>
            <select value={f.prazo} onChange={e => set('prazo')(e.target.value)}
              style={{ width: '100%', padding: '11px 13px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 14, outline: 'none' }}>
              <option value="7">7 dias — urgente</option>
              <option value="15">15 dias — padrão</option>
              <option value="30">30 dias — sem pressa</option>
            </select>
          </div>
          {erro && <p style={{ color: '#DC2626', fontSize: 13, margin: '0 0 8px', fontWeight: 600 }}>⚠️ {erro}</p>}
          {rodape('produto', () => {
            if (!f.preco_atual) { setErro('Informe o preço pago atualmente.'); return }
            setErro(''); setEtapa('confirma')
          })}
        </>
      )}

      {etapa === 'confirma' && card(
        <>
          {titulo('Confirme sua solicitação')}
          {[
            ['Empresa', f.empresa],
            ['Contato', `${f.nome} · ${f.email}`],
            ['Produto', f.produto],
            ['Quantidade', `${f.quantidade} ${f.unidade}`],
            ['Preço atual unitário', f.preco_atual ? `R$ ${f.preco_atual}` : '—'],
            ['Prazo desejado', `${f.prazo} dias`],
            ['Anexo NF', arquivo ? arquivo.name : 'Não enviado']
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #E2E8F0', fontSize: 13 }}>
              <span style={{ color: '#64748B' }}>{k}</span>
              <span style={{ color: '#0F172A', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: '1rem' }}>
            <Preview atual={f.preco_atual} alvo={f.preco_alvo} quantidade={f.quantidade} />
          </div>
          <div style={{ background: '#F1F5F9', borderRadius: 8, padding: '0.9rem', margin: '1rem 0', fontSize: 12, color: '#475569', lineHeight: 1.6, border: '1px solid #E2E8F0' }}>
            Você só paga <strong style={{ color: '#059669' }}>20% da economia gerada</strong> após confirmar o resultado.
            Se não houver saving, não há custo.
          </div>
          {erro && <p style={{ color: '#DC2626', fontSize: 13, margin: '0 0 8px', fontWeight: 600 }}>⚠️ {erro}</p>}
          {rodape('baseline', enviar, enviando ? 'Criando mesa...' : 'Confirmar e Abrir Mesa →', enviando)}
        </>
      )}

      {etapa === 'ok' && (
        <div style={{ maxWidth: 480, margin: '3rem auto', padding: '0 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#059669', margin: '0 0 0.75rem' }}>Mesa de Negociação Aberta!</h1>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.65, margin: '0 0 2rem' }}>
            Sua solicitação foi registrada no ecossistema DeuAcordo.com. Nossos Closers começarão a trabalhar no seu saving imediatamente.
          </p>
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '1.25rem', textAlign: 'left', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: 11, color: '#047857', fontWeight: 700, letterSpacing: '0.07em', margin: '0 0 10px' }}>PRÓXIMOS PASSOS</p>
            {[
              'Sua demanda fica disponível na vitrine de negociações.',
              'Um Closer qualificado assume a mesa e busca fornecedores.',
              'Sua identidade permanece protegida (Duplo-Cego).',
              'Você acompanha a proposta gerada diretamente no seu Dashboard.',
              'Se você aprovar o saving, o fee de 20% é faturado.'
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                <span style={{ width: 20, height: 20, background: '#10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#FFFFFF', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: '#065F46', lineHeight: 1.5, fontWeight: 500 }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link href="/dashboard"
              style={{ padding: '12px 20px', background: '#10B981', border: 'none', borderRadius: 8, color: '#FFFFFF', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              Ir para o Dashboard Hub →
            </Link>
            <button onClick={() => { setF(vazio); setArquivo(null); setEtapa('empresa') }}
              style={{ padding: '12px 20px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Nova solicitação
            </button>
          </div>
        </div>
      )}

      <footer style={{ borderTop: '1px solid #E2E8F0', background: '#FFFFFF', padding: '1.25rem', textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>DeuAcordo.com · Procurement-as-a-Service B2B · Modelo Success Fee (20%)</p>
      </footer>
    </div>
  )
}
