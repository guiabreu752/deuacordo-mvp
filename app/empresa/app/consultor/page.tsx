'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const vazio = { nome:'', email:'', fone:'', linkedin:'', cidade:'', cargo_atual:'', empresa_atual:'', anos_experiencia:'', setores:'', disponibilidade:'', motivacao:'' }

function Campo({ label, id, value, onChange, placeholder, type='text', dica='' }:any) {
  return (
    <div style={{marginBottom:'1.1rem'}}>
      <label htmlFor={id} style={{display:'block',fontSize:12,color:'#64748B',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</label>
      <input id={id} type={type} value={value} placeholder={placeholder}
        onChange={e=>onChange(e.target.value)}
        style={{width:'100%',padding:'11px 13px',background:'#1E293B',border:'1px solid #334155',borderRadius:8,color:'#F8FAFC',fontSize:14,outline:'none'}}
        onFocus={e=>{e.target.style.borderColor='#10B981'}}
        onBlur={e=>{e.target.style.borderColor='#334155'}}
      />
      {dica && <p style={{fontSize:11,color:'#475569',marginTop:4}}>{dica}</p>}
    </div>
  )
}

export default function ConsultorPage() {
  const [f, setF] = useState(vazio)
  const [enviando, setEnviando] = useState(false)
  const [ok, setOk] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k:string) => (v:string) => setF(p=>({...p,[k]:v}))

  async function enviar() {
    if (!f.nome || !f.email) { setErro('Nome e e-mail são obrigatórios.'); return }
    setEnviando(true); setErro('')
    try {
      const { error } = await supabase.from('closers_interesse').insert({
        nome: f.nome, email: f.email, fone: f.fone||null,
        linkedin: f.linkedin||null, cidade: f.cidade||null,
        cargo_atual: f.cargo_atual||null, empresa_atual: f.empresa_atual||null,
        anos_experiencia: f.anos_experiencia ? parseInt(f.anos_experiencia) : null,
        setores: f.setores||null, disponibilidade: f.disponibilidade||null,
        motivacao: f.motivacao||null,
      })
      if (error) throw error
      setOk(true)
    } catch(e:any) { setErro(e.message||'Erro ao enviar.') }
    finally { setEnviando(false) }
  }

  return (
    <div style={{minHeight:'100vh',background:'#0F172A',color:'#F8FAFC',fontFamily:'Inter,system-ui,sans-serif'}}>
      <header style={{borderBottom:'1px solid #1E293B',padding:'0.9rem 1.25rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <a href="/" style={{fontWeight:800,fontSize:17,textDecoration:'none',color:'#F8FAFC'}}>DeuAcordo<span style={{color:'#10B981'}}>.com</span></a>
        <span style={{fontSize:11,color:'#F59E0B',border:'1px solid #F59E0B',padding:'3px 10px',borderRadius:20}}>Para Consultores</span>
      </header>

      {!ok ? (
        <div style={{maxWidth:560,margin:'0 auto',padding:'2rem 1rem 4rem'}}>
          <div style={{textAlign:'center',marginBottom:'2rem'}}>
            <div style={{display:'inline-block',background:'#1C1408',color:'#F59E0B',padding:'5px 14px',borderRadius:20,fontSize:11,fontWeight:700,letterSpacing:'0.08em',marginBottom:'0.9rem',border:'1px solid #F59E0B'}}>
              GANHE ATÉ R$ 20K/MÊS NEGOCIANDO
            </div>
            <h1 style={{fontSize:26,fontWeight:800,lineHeight:1.25,marginBottom:'0.75rem'}}>
              Sua experiência em negociação vale muito mais do que você imagina
            </h1>
            <p style={{fontSize:14,color:'#94A3B8',lineHeight:1.65}}>
              Cadastre-se como Closer. Você escolhe as mesas que aceita, negocia no seu tempo e recebe <strong style={{color:'#F59E0B'}}>70% do saving fee</strong> gerado. Sem chefe, sem CLT.
            </p>
          </div>

          <div style={{background:'#1E293B',border:'1px solid #2D3E50',borderRadius:14,padding:'1.5rem'}}>
            <h2 style={{fontSize:16,fontWeight:700,marginBottom:'1.25rem'}}>Cadastro de interesse</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Campo label="Nome completo *" id="nome" value={f.nome} onChange={set('nome')} placeholder="João Silva"/>
              <Campo label="E-mail *" id="email" type="email" value={f.email} onChange={set('email')} placeholder="joao@email.com"/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Campo label="WhatsApp" id="fone" value={f.fone} onChange={set('fone')} placeholder="(11) 99999-9999"/>
              <Campo label="Cidade" id="cidade" value={f.cidade} onChange={set('cidade')} placeholder="São Paulo - SP"/>
            </div>
            <Campo label="LinkedIn (URL do perfil)" id="linkedin" value={f.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/joaosilva"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Campo label="Cargo atual ou anterior" id="cargo" value={f.cargo_atual} onChange={set('cargo_atual')} placeholder="Gerente de Compras"/>
              <Campo label="Empresa atual / anterior" id="empresa" value={f.empresa_atual} onChange={set('empresa_atual')} placeholder="Empresa XYZ"/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Campo label="Anos de experiência em negociação" id="anos" type="number" value={f.anos_experiencia} onChange={set('anos_experiencia')} placeholder="8"/>
              <div style={{marginBottom:'1.1rem'}}>
                <label style={{display:'block',fontSize:12,color:'#64748B',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>Disponibilidade semanal</label>
                <select value={f.disponibilidade} onChange={e=>set('disponibilidade')(e.target.value)}
                  style={{width:'100%',padding:'11px 13px',background:'#1E293B',border:'1px solid #334155',borderRadius:8,color:f.disponibilidade?'#F8FAFC':'#475569',fontSize:14}}>
                  <option value="">Selecione...</option>
                  <option value="5h">Até 5h por semana</option>
                  <option value="10h">5–10h por semana</option>
                  <option value="20h">10–20h por semana</option>
                  <option value="full">Tempo integral</option>
                </select>
              </div>
            </div>
            <Campo label="Setores de especialidade" id="setores" value={f.setores} onChange={set('setores')} placeholder="Ex: Embalagem, EPI, Logística, TI, Agro..." dica="Quanto mais específico, melhores as mesas que vamos te indicar"/>
            {erro && <p style={{color:'#FCA5A5',fontSize:13,marginBottom:8}}>{erro}</p>}
            <button onClick={enviar} disabled={enviando} style={{
              width:'100%',padding:'14px',background:enviando?'#065F46':'#F59E0B',
              border:'none',borderRadius:8,color:'#0F172A',fontSize:15,fontWeight:800,cursor:enviando?'wait':'pointer',marginTop:4
            }}>
              {enviando ? 'Enviando...' : 'Quero me tornar um Closer →'}
            </button>
            <p style={{fontSize:11,color:'#334155',textAlign:'center',marginTop:10}}>
              Entraremos em contato em até 48h para apresentar o modelo e as primeiras mesas disponíveis.
            </p>
          </div>
        </div>
      ) : (
        <div style={{maxWidth:480,margin:'4rem auto',padding:'0 1rem',textAlign:'center'}}>
          <div style={{fontSize:56,marginBottom:'1rem'}}>🎯</div>
          <h1 style={{fontSize:24,fontWeight:800,color:'#F59E0B',marginBottom:'0.75rem'}}>Cadastro recebido!</h1>
          <p style={{fontSize:14,color:'#94A3B8',lineHeight:1.65,marginBottom:'2rem'}}>
            Em até <strong style={{color:'#F8FAFC'}}>48 horas</strong> entraremos em contato pelo e-mail <strong style={{color:'#F8FAFC'}}>{f.email}</strong> com o próximo passo do onboarding.
          </p>
          <a href="/" style={{padding:'12px 28px',background:'#1E293B',border:'1px solid #334155',borderRadius:8,color:'#94A3B8',fontSize:13,textDecoration:'none'}}>
            Voltar ao início
          </a>
        </div>
      )}
    </div>
  )
}