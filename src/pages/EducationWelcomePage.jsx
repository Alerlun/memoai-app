import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks/useLang'
import { joinEducationGroup } from '../lib/stripe'
import Layout from '../components/Layout'

export default function EducationWelcomePage() {
  const { user, refreshProfile } = useAuth()
  const { t, lang } = useLang()
  const nav = useNavigate()

  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinErr, setJoinErr] = useState('')

  const name = user?.user_metadata?.full_name?.split(' ')[0] || (lang === 'sv' ? 'lärare' : 'there')

  async function handleJoin(e) {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoinErr(''); setJoining(true)
    try {
      await joinEducationGroup(joinCode.trim())
      await refreshProfile()
      nav('/')
    } catch (ex) {
      setJoinErr(ex.message?.includes('Invalid') || ex.message?.includes('invalid')
        ? (lang === 'sv' ? 'Ogiltig eller inaktiv kod. Kontrollera koden med gruppens ägare.' : 'Invalid or inactive code — double-check with the group owner.')
        : (ex.message || t('something_wrong'))
      )
    } finally { setJoining(false) }
  }

  return (
    <Layout active="settings">
      <div className="page screen" style={{ maxWidth: 560 }}>

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.5px', marginBottom: 8 }}>
            {lang === 'sv' ? `Välkommen, ${name}!` : `Welcome, ${name}!`}
          </div>
          <div style={{ fontSize: 15, color: 'var(--t2)', lineHeight: 1.6 }}>
            {lang === 'sv'
              ? 'Vill du ge din klass MemoAI Education, eller gå med i en kollegas grupp?'
              : 'Would you like to give your class MemoAI Education, or join a colleague\'s group?'
            }
          </div>
        </div>

        {/* Option A — Create */}
        <div
          onClick={() => nav('/education/setup')}
          style={{
            background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#3730a3 100%)',
            border: '1.5px solid rgba(139,127,245,.35)',
            borderRadius: 18,
            padding: 24,
            marginBottom: 14,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform .15s, box-shadow .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(49,46,129,.4)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
        >
          <div aria-hidden style={{ position: 'absolute', top: -10, right: 16, fontSize: 80, opacity: .07, pointerEvents: 'none' }}>🏫</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>✨</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                {lang === 'sv' ? 'Skapa en ny grupp' : 'Create a new group'}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.5, marginBottom: 14 }}>
                {lang === 'sv'
                  ? 'Prenumerera för 2 490 kr/mån och bjud in hela din klass med en enkel kod.'
                  : 'Subscribe for $249/mo and invite your whole class with one simple code.'
                }
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
                {(lang === 'sv'
                  ? ['Obegränsad AI-generering för alla elever', 'Enkel inbjudningskod att dela', 'Fungerar för hela klassen direkt']
                  : ['Unlimited AI generation for all students', 'One invite code to share', 'Whole class gets access instantly']
                ).map(f => (
                  <div key={f} style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#a5b4fc' }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#312e81', borderRadius: 10, padding: '9px 18px', fontWeight: 800, fontSize: 14 }}>
                {lang === 'sv' ? 'Skapa grupp →' : 'Create group →'}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 14px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
          <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600 }}>{lang === 'sv' ? 'eller' : 'or'}</span>
          <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
        </div>

        {/* Option B — Join */}
        <div style={{ background: 'var(--s1)', border: '1.5px solid var(--bd)', borderRadius: 18, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139,127,245,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🔑</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>
                {lang === 'sv' ? 'Gå med i en kollegas grupp' : 'Join a colleague\'s group'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>
                {lang === 'sv'
                  ? 'En annan lärare har redan startat en grupp — ange deras kod nedan.'
                  : 'Another teacher already has a group — enter their code below.'
                }
              </div>
            </div>
          </div>

          {joinErr && <div className="err-box" style={{ marginBottom: 12 }}>{joinErr}</div>}

          <form onSubmit={handleJoin} style={{ display: 'flex', gap: 8 }}>
            <input
              className="inp"
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder={lang === 'sv' ? 'Ange kod — t.ex. AB3XY7' : 'Enter code — e.g. AB3XY7'}
              maxLength={8}
              style={{ flex: 1, fontFamily: 'monospace', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 0 }}
            />
            <button
              className="btn btn-p"
              type="submit"
              disabled={joining || !joinCode.trim()}
              style={{ flexShrink: 0 }}
            >
              {joining ? '…' : (lang === 'sv' ? 'Gå med' : 'Join')}
            </button>
          </form>
        </div>

        {/* Skip */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => nav('/')}
            style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
          >
            {lang === 'sv' ? 'Hoppa över för nu' : 'Skip for now'}
          </button>
        </div>

      </div>
    </Layout>
  )
}
