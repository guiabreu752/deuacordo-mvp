'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Etapa = 'empresa' | 'produto' | 'baseline' | 'confirma' | 'ok'

const vazio = {
  empresa:'', cnpj:'', nome:'', email:'', fone:'',
  produto:'', descricao:'', quantidade:'', unidade:'un',
  preco_atual:'', fornecedor:'', preco_alvo:'', prazo:'15'
}

function Campo({ label, id, value, onChange, placeholder, type='text', dica='' }:any) {
  return (
    <div style={{marginBottom:'1.1rem'}}>
      <label htmlFor={id} style={{display:'block',fontSize:12,color:'#0F172A',fontWeight:600,marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</label>
      <input id={id} type={type} value={value} placeholder={placeholder}
        onChange={e=>onChange(e.target.value)}
        style={{width:'100%',padding:'11px 13px',background:'#FFFFFF',border:'1px solid #CBD5E1',borderRadius:8,color:'#0F172A',fontSize:14,outline:'none'}}
        onFocus={e=>{e.target.style.borderColor='#10B981'; e.target.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.15)'}}
        onBlur={e=>{e.target.style.borderColor='#CBD5E1'; e.target.style.boxShadow='none'}}
      />
      {dica && <p style={{fontSize:11,color:'#64748B',marginTop:4}}>{dica}</p>}
    </div>
  )
}

function Preview({ atual, alvo }:any) {
  const a = parseFloat(atual.replace(',','.'))
  const b = parseFloat(alvo.replace(',','.'))
  if (!a || !b || b >= a) return null
  const saving = a - b
  const pct = (saving/a*100).toFixed(1)
  const fee = (saving*0.2).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
  const liq = (saving*0.8).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
  return (
    <div style={{background:'#ECFDF5',border:'1px solid #A7F3D0',borderRadius:10,padding:'0.9rem',marginBottom:'1rem'}}>
      <p style={{fontSize:11,color:'#047857',marginBottom:4,fontWeight:700,letterSpacing:'0.07em'}}>PRÉVIA DO SAVING</p>
      <p style={{fontSize:24,fontWeight:800,color:'#059669',marginBottom:3}}>{pct}% de economia</p>
      <p style={{fontSize:12,color:'#065F46'}}>Fee DeuAcordo (20%): {fee} · Economia líquida: <strong>{liq}</strong></p>
    </div>
  )
}

const btn = (primary:boolean, label:string, onClick:any, disabled=false) => (
  <button onClick={onClick} disabled={disabled} style={{
    flex: primary?2:1, padding:'13px',
    background: disabled ? '#A7F3D0' : primary ? '#10B981' : '#F1F5F9',
    border: primary ? 'none' : '1px solid #CBD5E1',
    borderRadius:8, color: primary ? '#FFFFFF' : '#334155',
    fontSize:14, fontWeight: 700, cursor: disabled?'wait':'pointer',
    transition: 'all 0.2s ease'
  }}>{label}</button>
)

export default function Page() {
  const [etapa, setEtapa] = useState<Etapa>('empresa')
  const [f, setF] = useState(vazio)
  const [arquivo, setArquivo] = useState<File|null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k:string) => (v:string) => setF(p=>({...p,[k]:v}))
  const fileRef = useRef<HTMLInputElement>(null)

  async function enviar() {
    setEnviando(true); setErro('')
    try {
      const { error } = await supabase.from('cotacoes').insert({
        empresa_nome: f.empresa, cnpj: f.cnpj||null,
        contato_nome: f.nome, contato_email: f.email, contato_fone: f.fone||null,
        produto: f.produto, descricao: f.descricao||null,
        quantidade: f.quantidade||null, unidade: f.unidade,
        preco_atual: f.preco_atual ? parseFloat(f.preco_atual.replace(',','.')) : null,
        fornecedor_atual: f.fornecedor||null,
        tem_nf: !!arquivo,
        preco_alvo: f.preco_alvo ? parseFloat(f.preco_alvo.replace(',','.')) : null,
        prazo_dias: parseInt(f.prazo)
      })
      if (error) throw error
      setEtapa('ok')
    } catch(e:any) {
      setErro(e.message || 'Erro ao enviar. Tente novamente.')
    } finally { setEnviando(false) }
  }

  const card = (children:any) => (
    <div style={{maxWidth:520,margin:'0 auto',padding:'1rem 1rem 3rem'}}>
      <div style={{background:'#FFFFFF',border:'1px solid #E2E8F0',borderRadius:14,padding:'1.5rem',boxShadow:'0 10px 25px -5px rgba(15, 23, 42, 0.05)'}}>
        {children}
      </div>
    </div>
  )

  const titulo = (t:string, sub='') => (
    <div style={{marginBottom:'1.25rem'}}>
      <h2 style={{fontSize:19,fontWeight:800,color:'#0F172A',marginBottom:sub?4:0}}>{t}</h2>
      {sub && <p style={{fontSize:13,color:'#64748B'}}>{sub}</p>}
    </div>
  )

  const rodape = (voltar:Etapa|null, proximo:()=>void, labelProximo='Continuar →', disabled=false) => (
    <div style={{display:'flex',gap:8,marginTop:8}}>
      {voltar && btn(false,'← Voltar',()=>setEtapa(voltar))}
      {btn(true, labelProximo, proximo, disabled)}
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#F8FAFC'}}>
      {/* Header */}
      <header style={{background:'#FFFFFF',borderBottom:'1px solid #E2E8F0',padding:'0.9rem 1.25rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontWeight:800,fontSize:18,color:'#0F172A'}}>DeuAcordo<span style={{color:'#10B981'}}>.com</span></span>
        <span style={{fontSize:11,fontWeight:700,color:'#059669',background:'#ECFDF5',border:'1px solid #A7F3D0',padding:'4px 12px',borderRadius:20}}>Gratuito para o comprador</span>
      </header>

      {/* Hero (só na primeira etapa) */}
      {etapa === 'empresa' && (
        <div style={{textAlign:'center',padding:'2.5rem 1rem 1rem',maxWidth:520,margin:'0 auto'}}>
          <div style={{display:'inline-block',background:'#ECFDF5',border:'1px solid #A7F3D0',color:'#059669',padding:'5px 14px',borderRadius:20,fontSize:11,fontWeight:700,letterSpacing:'0.08em',marginBottom:'0.9rem'}}>
            SEM SAVING, SEM CUSTO
          </div>
          <h1 style={{fontSize:28,fontWeight:800,lineHeight:1.25,color:'#0F172A',marginBottom:'0.75rem'}}>
            Sua empresa está pagando mais do que deveria nas compras?
          </h1>
          <p style={{fontSize:14,color:'#475569',lineHeight:1.65,marginBottom:'1.5rem'}}>
            Cadastre o que precisa sourcear. Um negociador busca alternativas e negocia por você.
            Você só paga <strong style={{color:'#059669',background:'#ECFDF5',padding:'2px 6px',borderRadius:4}}>20% da economia real</strong>.
          </p>
          
          {/* Contador de saving */}
          <div style={{background:'#FFFFFF',border:'1px solid #E2E8F0',borderRadius:12,padding:'1rem',display:'flex',alignItems:'center',gap:'1rem',textAlign:'left',marginBottom:'0.5rem',boxShadow:'0 4px 6px -1px rgba(0,0,0,0.03)'}}>
            <div>
              <p style={{fontSize:10,color:'#64748B',fontWeight:700,letterSpacing:'0.08em',marginBottom:2}}>SAVING JÁ GERADO</p>
              <p style={{fontSize:26,fontWeight:800,color:'#10B981'}}>R$ 38.400</p>
              <p style={{fontSize:11,color:'#64748B'}}>em 3 mesas concluídas</p>
            </div>
            <div style={{flex:1}}>
              <div style={{background:'#E2E8F0',borderRadius:4,height:6,overflow:'hidden'}}>
                <div style={{width:'73%',background:'#10B981',height:'100%',borderRadius:4}}/>
              </div>
              <p style={{fontSize:10,color:'#64748B',marginTop:4,fontWeight:500}}>73% da meta mensal</p>
            </div>
          </div>
        </div>
      )}

      {/* ETAPAS */}
      {etapa === 'empresa' && card(
        <>
          {titulo('Dados da sua empresa')}
          <Campo label="Nome da empresa *" id="emp" value={f.empresa} onChange={set('empresa')} placeholder="Ex: Metalúrgica Souza Ltda"/>
          <Campo label="CNPJ" id="cnpj" value={f.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" dica="Opcional"/>
          <Campo label="Seu nome *" id="nome" value={f.nome} onChange={set('nome')} placeholder="João Silva"/>
          <Campo label="E-mail *" id="email" type="email" value={f.email} onChange={set('email')} placeholder="joao@empresa.com.br"/>
          <Campo label="WhatsApp" id="fone" value={f.fone} onChange={set('fone')} placeholder="(11) 99999-9999"/>
          {erro && <p style={{color:'#DC2626',fontSize:13,marginBottom:8,fontWeight:600}}>{erro}</p>}
          {rodape(null,()=>{
            if(!f.empresa||!f.nome||!f.email){setErro('Preencha os campos obrigatórios.');return}
            setErro('');setEtapa('produto')
          })}
        </>
      )}

      {etapa === 'produto' && card(
        <>
          {titulo('O que você precisa sourcear?','Seja específico — quanto mais detalhe, melhor.')}
          <Campo label="Produto ou serviço *" id="prod" value={f.produto} onChange={set('produto')} placeholder="Ex: Caixas de papelão ondulado 30x20x15cm"/>
          <Campo label="Descrição técnica" id="desc" value={f.descricao} onChange={set('descricao')} placeholder="Especificações, normas, qualidade..."/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <Campo label="Quantidade" id="qtd" value={f.quantidade} onChange={set('quantidade')} placeholder="5.000"/>
            <div style={{marginBottom:'1.1rem'}}>
              <label style={{display:'block',fontSize:12,color:'#0F172A',fontWeight:600,marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>Unidade</label>
              <select value={f.unidade} onChange={e=>set('unidade')(e.target.value)}
                style={{width:'100%',padding:'11px 13px',background:'#FFFFFF',border:'1px solid #CBD5E1',borderRadius:8,color:'#0F172A',fontSize:14}}>
                {['un','kg','ton','cx','pç','litro','m²','hora'].map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          {erro && <p style={{color:'#DC2626',fontSize:13,marginBottom:8,fontWeight:600}}>{erro}</p>}
          {rodape('empresa',()=>{if(!f.produto){setErro('Informe o produto.');return}setErro('');setEtapa('baseline')})}
        </>
      )}

      {etapa === 'baseline' && card(
        <>
          {titulo('Qual o preço que você paga hoje?','Base para calcular o saving real.')}
          <Campo label="Preço atual por unidade (R$)" id="pa" value={f.preco_atual} onChange={set('preco_atual')} placeholder="Ex: 3,50" dica="Use vírgula ou ponto: 3,50 ou 3.50"/>
          <Campo label="Fornecedor atual" id="forn" value={f.fornecedor} onChange={set('fornecedor')} placeholder="Ex: Embalagens Norte Ltda" dica="Não entraremos em contato com ele"/>

          {/* Upload NF */}
          <div style={{marginBottom:'1.1rem'}}>
            <label style={{display:'block',fontSize:12,color:'#0F172A',fontWeight:600,marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>NF ou orçamento atual</label>
            <label style={{display:'block',border:'2px dashed #CBD5E1',borderRadius:8,padding:'1rem',textAlign:'center',cursor:'pointer',background:arquivo?'#ECFDF5':'#F8FAFC'}}>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}}
                onChange={e=>{const fi=e.target.files?.[0];if(fi)setArquivo(fi)}}/>
              <span style={{fontSize:13,fontWeight:600,color:arquivo?'#059669':'#64748B'}}>
                {arquivo ? `✓ ${arquivo.name}` : '📎 Anexar PDF ou imagem (opcional)'}
              </span>
            </label>
          </div>

          <Campo label="Preço alvo (R$)" id="palvo" value={f.preco_alvo} onChange={set('preco_alvo')} placeholder="Ex: 2,80 (deixe vazio se não souber)"/>
          <Preview atual={f.preco_atual} alvo={f.preco_alvo}/>

          <div style={{marginBottom:'1.1rem'}}>
            <label style={{display:'block',fontSize:12,color:'#0F172A',fontWeight:600,marginBottom:5,textTransform:'uppercase',letterSpacing:'0.05em'}}>Prazo para resultado</label>
            <select value={f.prazo} onChange={e=>set('prazo')(e.target.value)}
              style={{width:'100%',padding:'11px 13px',background:'#FFFFFF',border:'1px solid #CBD5E1',borderRadius:8,color:'#0F172A',fontSize:14}}>
              <option value="7">7 dias — urgente</option>
              <option value="15">15 dias — padrão</option>
              <option value="30">30 dias — sem pressa</option>
            </select>
          </div>
          {rodape('produto',()=>{setEtapa('confirma')})}
        </>
      )}

      {etapa === 'confirma' && card(
        <>
          {titulo('Confirme sua solicitação')}
          {[
            ['Empresa',f.empresa],['Contato',`${f.nome} · ${f.email}`],['Produto',f.produto],
            ['Preço atual',f.preco_atual?`R$ ${f.preco_atual}`:'—'],
            ['Prazo',`${f.prazo} dias`],['NF',arquivo?arquivo.name:'Não']
          ].map(([k,v])=>(
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid #E2E8F0',fontSize:13}}>
              <span style={{color:'#64748B'}}>{k}</span>
              <span style={{color:'#0F172A',fontWeight:600,textAlign:'right',maxWidth:'60%'}}>{v}</span>
            </div>
          ))}
          <div style={{marginTop:'1rem'}}>
            <Preview atual={f.preco_atual} alvo={f.preco_alvo}/>
          </div>
          <div style={{background:'#F1F5F9',borderRadius:8,padding:'0.9rem',margin:'1rem 0',fontSize:12,color:'#475569',lineHeight:1.6,border:'1px solid #E2E8F0'}}>
            Você só paga <strong style={{color:'#059669'}}>20% da economia gerada</strong> após confirmar o resultado.
            Se não houver saving, não há custo.
          </div>
          {erro && <p style={{color:'#DC2626',fontSize:13,marginBottom:8,fontWeight:600}}>{erro}</p>}
          {rodape('baseline', enviar, enviando?'Enviando...':'Enviar solicitação', enviando)}
        </>
      )}

      {etapa === 'ok' && (
        <div style={{maxWidth:480,margin:'3rem auto',padding:'0 1rem',textAlign:'center'}}>
          <div style={{fontSize:56,marginBottom:'1rem'}}>🎉</div>
          <h1 style={{fontSize:26,fontWeight:800,color:'#059669',marginBottom:'0.75rem'}}>Solicitação recebida!</h1>
          <p style={{fontSize:14,color:'#475569',lineHeight:1.65,marginBottom:'2rem'}}>
            Entraremos em contato em até <strong style={{color:'#0F172A'}}>24 horas úteis</strong> pelo e-mail <strong style={{color:'#0F172A'}}>{f.email}</strong>.
          </p>
          <div style={{background:'#ECFDF5',border:'1px solid #A7F3D0',borderRadius:12,padding:'1.25rem',textAlign:'left',marginBottom:'1.5rem'}}>
            <p style={{fontSize:11,color:'#047857',fontWeight:700,letterSpacing:'0.07em',marginBottom:10}}>O QUE ACONTECE AGORA</p>
            {['Analisamos seu briefing e as especificações.','Buscamos fornecedores alternativos na sua categoria.','Negociamos por você — sua identidade protegida.','Apresentamos o resultado com o saving calculated.','Você confirma — e só então cobra o fee de 20%.'].map((s,i)=>(
              <div key={i} style={{display:'flex',gap:10,marginBottom:8,alignItems:'flex-start'}}>
                <span style={{width:20,height:20,background:'#10B981',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#FFFFFF',flexShrink:0}}>{i+1}</span>
                <span style={{fontSize:13,color:'#065F46',lineHeight:1.5,fontWeight:500}}>{s}</span>
              </div>
            ))}
          </div>
          <button onClick={()=>{setF(vazio);setArquivo(null);setEtapa('empresa')}}
            style={{padding:'12px 28px',background:'#FFFFFF',border:'1px solid #CBD5E1',borderRadius:8,color:'#0F172A',fontSize:13,fontWeight:600,cursor:'pointer'}}>
            Enviar outra solicitação
          </button>
        </div>
      )}

      <footer style={{borderTop:'1px solid #E2E8F0',background:'#FFFFFF',padding:'1.25rem',textAlign:'center',marginTop:'2rem'}}>
        <p style={{fontSize:11,color:'#64748B'}}>DeuAcordo.com · Negociação com resultado garantido · Gratuito para o comprador</p>
      </footer>
    </div>
  )
}
