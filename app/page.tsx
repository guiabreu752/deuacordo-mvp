'use client'
import Link from 'next/link'

const E = '#10B981'   // emerald
const NAVY = '#0F172A'
const SLATE = '#F8FAFC'
const MUTED = '#64748B'
const BORDER = '#E2E8F0'

function BtnPrimario({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      display:'inline-block', background:E, color:'#fff',
      padding:'14px 32px', borderRadius:8, fontSize:15, fontWeight:700,
      textDecoration:'none', letterSpacing:'-0.01em',
      transition:'opacity .15s',
    }}
    onMouseEnter={e=>(e.currentTarget.style.opacity='.88')}
    onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
      {children}
    </Link>
  )
}

function BtnSecundario({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      display:'inline-block', background:'transparent', color:NAVY,
      padding:'13px 28px', borderRadius:8, fontSize:15, fontWeight:600,
      textDecoration:'none', border:`1.5px solid ${BORDER}`,
    }}>
      {children}
    </Link>
  )
}

function Stat({ valor, label }: { valor: string; label: string }) {
  return (
    <div style={{textAlign:'center', padding:'0 1.5rem'}}>
      <p style={{fontSize:34, fontWeight:800, color:E, margin:0, letterSpacing:'-0.03em'}}>{valor}</p>
      <p style={{fontSize:13, color:MUTED, margin:'4px 0 0'}}>{label}</p>
    </div>
  )
}

function Step({ num, titulo, desc }: { num: string; titulo: string; desc: string }) {
  return (
    <div style={{display:'flex', gap:'1.25rem', alignItems:'flex-start'}}>
      <div style={{
        width:40, height:40, borderRadius:'50%', background:E,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:15, fontWeight:800, color:'#fff', flexShrink:0,
      }}>{num}</div>
      <div>
        <p style={{fontSize:16, fontWeight:700, color:NAVY, margin:'6px 0 6px'}}>{titulo}</p>
        <p style={{fontSize:14, color:MUTED, lineHeight:1.65, margin:0}}>{desc}</p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const maxW = { maxWidth:1080, margin:'0 auto', padding:'0 1.5rem' }

  return (
    <div style={{background:SLATE, color:NAVY, fontFamily:'Inter,system-ui,sans-serif', lineHeight:1.6}}>

      {/* ── HEADER ────────────────────────────────────── */}
      <header style={{
        position:'sticky', top:0, zIndex:50,
        background:'rgba(248,250,252,0.92)',
        backdropFilter:'blur(12px)',
        borderBottom:`1px solid ${BORDER}`,
      }}>
        <div style={{...maxW, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.5rem'}}>
          <span style={{fontWeight:800, fontSize:18, color:NAVY, letterSpacing:'-0.02em'}}>
            DeuAcordo<span style={{color:E}}>.com</span>
          </span>
          <nav style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
            <span style={{
              background:'#ECFDF5', color:'#065F46', fontSize:11, fontWeight:700,
              padding:'3px 10px', borderRadius:20, letterSpacing:'0.05em',
              border:'1px solid #A7F3D0',
            }}>
              SUCCESS FEE
            </span>
            <Link href="/empresa" style={{
              background:E, color:'#fff', padding:'9px 20px', borderRadius:7,
              fontSize:13, fontWeight:700, textDecoration:'none',
            }}>
              Economize já →
            </Link>
          </nav>
        </div>
      </header>

      {/* ── HERO ──────────────────────────────────────── */}
      <section style={{padding:'6rem 0 4.5rem', textAlign:'center'}}>
        <div style={maxW}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            background:'#ECFDF5', border:'1px solid #6EE7B7',
            borderRadius:24, padding:'6px 16px', marginBottom:'1.75rem',
          }}>
            <span style={{
              width:8, height:8, borderRadius:'50%', background:E,
              display:'inline-block', animation:'pulse 2s infinite',
            }}/>
            <span style={{fontSize:12, fontWeight:600, color:'#065F46', letterSpacing:'0.05em'}}>
              SEM SAVING, SEM CUSTO — RISCO ZERO PARA VOCÊ
            </span>
          </div>

          <h1 style={{
            fontSize:'clamp(2rem, 5vw, 3.25rem)', fontWeight:800,
            lineHeight:1.12, letterSpacing:'-0.03em',
            margin:'0 auto 1.5rem', maxWidth:780,
          }}>
            Sua empresa está pagando mais do que deveria nas compras.{' '}
            <span style={{color:E}}>Vamos mudar isso.</span>
          </h1>

          <p style={{
            fontSize:'clamp(1rem, 2vw, 1.2rem)', color:MUTED,
            maxWidth:580, margin:'0 auto 2.5rem', lineHeight:1.7,
          }}>
            Conectamos você a um negociador especializado que busca fornecedores melhores e negocia por você. Você só paga <strong style={{color:NAVY}}>20% da economia real gerada</strong>. Zero risco.
          </p>

          <div style={{display:'flex', gap:'1rem', justifyContent:'center', flexWrap:'wrap', marginBottom:'4rem'}}>
            <BtnPrimario href="/empresa">Economize já →</BtnPrimario>
            <BtnSecundario href="/consultor">Sou consultor de compras</BtnSecundario>
          </div>

          {/* Stats bar */}
          <div style={{
            display:'flex', justifyContent:'center', flexWrap:'wrap',
            gap:0, borderTop:`1px solid ${BORDER}`, paddingTop:'3rem',
            borderBottom:`1px solid ${BORDER}`, paddingBottom:'3rem',
          }}>
            <Stat valor="R$ 38.400" label="em saving já gerado" />
            <div style={{width:1, background:BORDER, margin:'0 0.5rem'}}/>
            <Stat valor="20%" label="fee só sobre saving real" />
            <div style={{width:1, background:BORDER, margin:'0 0.5rem'}}/>
            <Stat valor="100%" label="risco zero para o cliente" />
            <div style={{width:1, background:BORDER, margin:'0 0.5rem'}}/>
            <Stat valor="15 dias" label="prazo médio de resultado" />
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ─────────────────────────────── */}
      <section style={{padding:'5rem 0', background:'#fff'}}>
        <div style={maxW}>
          <div style={{textAlign:'center', marginBottom:'3.5rem'}}>
            <p style={{fontSize:12, fontWeight:700, color:E, letterSpacing:'0.1em', marginBottom:10}}>COMO FUNCIONA</p>
            <h2 style={{fontSize:'clamp(1.5rem,3vw,2.25rem)', fontWeight:800, letterSpacing:'-0.02em', margin:0}}>
              Três etapas. Resultado garantido.
            </h2>
          </div>

          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',
            gap:'2.5rem',
          }}>
            <Step
              num="1"
              titulo="Cadastre sua demanda"
              desc="Informe o produto ou serviço que precisa sourcear e o preço que paga hoje. Não é necessário ter cotação prévia — aceitamos descrição simples."
            />
            <Step
              num="2"
              titulo="Nosso negociador age"
              desc="Um especialista busca fornecedores alternativos e negocia em nome da DeuAcordo. Sua identidade é protegida pelo protocolo Duplo-Cego — nenhum fornecedor atual é contatado."
            />
            <Step
              num="3"
              titulo="Você confirma e economiza"
              desc="Recebe a proposta com o saving calculado. Se aceitar, o fee de 20% é processado automaticamente. Se não houver economia, não há nenhum custo."
            />
          </div>

          <div style={{textAlign:'center', marginTop:'3.5rem'}}>
            <BtnPrimario href="/empresa">Quero minha primeira economia →</BtnPrimario>
          </div>
        </div>
      </section>

      {/* ── PERFIL CARDS ──────────────────────────────── */}
      <section style={{padding:'5rem 0'}}>
        <div style={maxW}>
          <div style={{textAlign:'center', marginBottom:'3rem'}}>
            <p style={{fontSize:12, fontWeight:700, color:E, letterSpacing:'0.1em', marginBottom:10}}>PARA QUEM É</p>
            <h2 style={{fontSize:'clamp(1.5rem,3vw,2.25rem)', fontWeight:800, letterSpacing:'-0.02em', margin:0}}>
              Escolha o seu perfil
            </h2>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'1.5rem'}}>

            {/* Card Empresa */}
            <Link href="/empresa" style={{textDecoration:'none'}}>
              <div style={{
                background:'#fff', border:`1.5px solid ${BORDER}`,
                borderRadius:16, padding:'2rem',
                transition:'border-color .15s, box-shadow .15s',
                cursor:'pointer', height:'100%',
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=E; e.currentTarget.style.boxShadow=`0 0 0 3px ${E}18`}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=BORDER; e.currentTarget.style.boxShadow='none'}}>
                <div style={{
                  width:48, height:48, background:'#ECFDF5', borderRadius:12,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:24, marginBottom:'1.25rem',
                }}>🏢</div>
                <p style={{fontSize:11, fontWeight:700, color:E, letterSpacing:'0.08em', marginBottom:8}}>PARA EMPRESAS</p>
                <h3 style={{fontSize:20, fontWeight:800, color:NAVY, margin:'0 0 0.75rem', letterSpacing:'-0.02em'}}>
                  Empresa buscando saving
                </h3>
                <p style={{fontSize:14, color:MUTED, lineHeight:1.65, margin:'0 0 1.5rem'}}>
                  Você tem uma compra recorrente e quer pagar menos. Cadastre a demanda, nosso negociador trabalha por você, e você só paga se economizar.
                </p>
                <ul style={{listStyle:'none', padding:0, margin:'0 0 1.75rem', display:'flex', flexDirection:'column', gap:8}}>
                  {['Gratuito para cadastrar','Fee de 20% só sobre saving real','Resultado em até 15 dias','Identidade protegida — fornecedor atual não é contatado'].map(item => (
                    <li key={item} style={{display:'flex', alignItems:'flex-start', gap:8, fontSize:13, color:NAVY}}>
                      <span style={{color:E, fontWeight:700, flexShrink:0}}>✓</span> {item}
                    </li>
                  ))}
                </ul>
                <div style={{
                  display:'block', background:E, color:'#fff',
                  padding:'13px 20px', borderRadius:8, fontSize:14,
                  fontWeight:700, textAlign:'center',
                }}>
                  Economize já →
                </div>
              </div>
            </Link>

            {/* Card Consultor */}
            <Link href="/consultor" style={{textDecoration:'none'}}>
              <div style={{
                background:'#fff', border:`1.5px solid ${BORDER}`,
                borderRadius:16, padding:'2rem',
                transition:'border-color .15s, box-shadow .15s',
                cursor:'pointer', height:'100%',
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#F59E0B'; e.currentTarget.style.boxShadow='0 0 0 3px #F59E0B18'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=BORDER; e.currentTarget.style.boxShadow='none'}}>
                <div style={{
                  width:48, height:48, background:'#FFFBEB', borderRadius:12,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:24, marginBottom:'1.25rem',
                }}>🎯</div>
                <p style={{fontSize:11, fontWeight:700, color:'#B45309', letterSpacing:'0.08em', marginBottom:8}}>PARA CONSULTORES</p>
                <h3 style={{fontSize:20, fontWeight:800, color:NAVY, margin:'0 0 0.75rem', letterSpacing:'-0.02em'}}>
                  Consultor de saving
                </h3>
                <p style={{fontSize:14, color:MUTED, lineHeight:1.65, margin:'0 0 1.5rem'}}>
                  Você tem experiência em compras, negociação ou KAM. Receba mesas prontas, negocie no seu tempo e ganhe 70% do fee gerado — sem chefe, sem CLT.
                </p>
                <ul style={{listStyle:'none', padding:0, margin:'0 0 1.75rem', display:'flex', flexDirection:'column', gap:8}}>
                  {['70% do saving fee diretamente para você','Escolha as mesas que aceitar','Trabalhe de qualquer lugar','Saque disponível após cada mesa concluída'].map(item => (
                    <li key={item} style={{display:'flex', alignItems:'flex-start', gap:8, fontSize:13, color:NAVY}}>
                      <span style={{color:'#F59E0B', fontWeight:700, flexShrink:0}}>✓</span> {item}
                    </li>
                  ))}
                </ul>
                <div style={{
                  display:'block', background:'#F59E0B', color:'#0F172A',
                  padding:'13px 20px', borderRadius:8, fontSize:14,
                  fontWeight:700, textAlign:'center',
                }}>
                  Quero ser Closer →
                </div>
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* ── GARANTIA / OBJEÇÃO KILLER ─────────────────── */}
      <section style={{padding:'5rem 0', background:'#fff'}}>
        <div style={{...maxW, maxWidth:760}}>
          <div style={{
            border:`1.5px solid #A7F3D0`, borderRadius:16,
            padding:'2.5rem', background:'#ECFDF5', textAlign:'center',
          }}>
            <p style={{fontSize:32, fontWeight:800, color:E, margin:'0 0 0.75rem', letterSpacing:'-0.02em'}}>
              Sem saving = sem custo.
            </p>
            <p style={{fontSize:16, color:'#065F46', lineHeight:1.7, margin:'0 0 2rem'}}>
              O fee de 20% é cobrado exclusivamente sobre a economia real e auditável gerada. Se o negociador não encontrar uma alternativa mais barata com as mesmas especificações, você não paga absolutamente nada. Sem mensalidade, sem taxa de cadastro, sem contrato de fidelidade.
            </p>
            <BtnPrimario href="/empresa">Abrir minha primeira demanda →</BtnPrimario>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────── */}
      <section style={{padding:'6rem 0', textAlign:'center'}}>
        <div style={maxW}>
          <h2 style={{fontSize:'clamp(1.5rem,3.5vw,2.5rem)', fontWeight:800, letterSpacing:'-0.02em', margin:'0 0 1rem'}}>
            Pronto para descobrir quanto sua empresa está deixando na mesa?
          </h2>
          <p style={{fontSize:16, color:MUTED, margin:'0 auto 2.5rem', maxWidth:480, lineHeight:1.65}}>
            Cadastre em menos de 3 minutos. Sem cartão de crédito, sem compromisso.
          </p>
          <BtnPrimario href="/empresa">Economize já — é gratuito →</BtnPrimario>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────── */}
      <footer style={{borderTop:`1px solid ${BORDER}`, padding:'2rem 1.5rem', textAlign:'center'}}>
        <div style={maxW}>
          <p style={{fontWeight:800, fontSize:15, color:NAVY, margin:'0 0 0.5rem'}}>
            DeuAcordo<span style={{color:E}}>.com</span>
          </p>
          <p style={{fontSize:13, color:MUTED, margin:'0 0 1rem'}}>
            Procurement-as-a-Service · Negociação estruturada com resultado garantido
          </p>
          <div style={{display:'flex', gap:'1.5rem', justifyContent:'center', fontSize:13}}>
            <Link href="/empresa" style={{color:MUTED, textDecoration:'none'}}>Para empresas</Link>
            <Link href="/consultor" style={{color:MUTED, textDecoration:'none'}}>Para consultores</Link>
          </div>
          <p style={{fontSize:11, color:'#CBD5E1', marginTop:'1.5rem', margin:'1.5rem 0 0'}}>
            © {new Date().getFullYear()} DeuAcordo.com · Todos os direitos reservados
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
