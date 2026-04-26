import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks/useLang'
import { joinEducationGroup } from '../lib/stripe'
import { supabase } from '../lib/supabase'
import logoSrc from '../assets/logo.png'

export default function JoinGroupPage() {
  const { code } = useParams()
  const { user, signUp, signIn, refreshProfile, isEducation } = useAuth()
  const { t, lang, switchLang } = useLang()
  const nav = useNavigate()

  const [groupInfo, setGroupInfo] = useState(null)
  const [groupErr, setGroupErr] = useState('')
  const [loadingGroup, setLoadingGroup] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joinErr, setJoinErr] = useState('')
  const [joined, setJoined] = useState(false)

  // Auth form state (for non-logged-in users)
  const [authTab, setAuthTab] = useState('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authErr, setAuthErr] = useState('')

  // Look up the group by code
  useEffect(() => {
    async function fetchGroup() {
      if (!code) { setGroupErr(t('edu_join_invalid')); setLoadingGroup(false); return }
      const { data, error } = await supabase
        .from('education_groups')
        .select('id, name, is_active')
        .eq('join_code', code.toUpperCase())
        .maybeSingle()

      setLoadingGroup(false)
      if (error || !data) { setGroupErr(t('edu_join_invalid')); return }
      if (!data.is_active) { setGroupErr(t('edu_join_invalid')); return }
      setGroupInfo(data)
    }
    fetchGroup()
  }, [code])

  async function handleJoin() {
    setJoinErr(''); setJoining(true)
    try {
      await joinEducationGroup(code)
      await refreshProfile()
      setJoined(true)
    } catch (ex) {
      setJoinErr(ex.message || t('something_wrong'))
    } finally {
      setJoining(false)
    }
  }

  async function handleAuthAndJoin(e) {
    e.preventDefault()
    setAuthErr(''); setAuthLoading(true)
    try {
      if (authTab === 'signup') {
        if (password.length < 6) { setAuthErr(t('password_too_short')); return }
        await signUp(email.trim(), password, name.trim())
      } else {
        await signIn(email.trim(), password)
      }
      // After sign in/up, join the group
      await joinEducationGroup(code)
      await refreshProfile()
      setJoined(true)
    } catch (ex) {
      const msg = ex.message || ''
      if (msg.includes('already')) setAuthErr(lang === 'sv' ? 'E-postadressen används redan.' : 'Email already registered.')
      else if (msg.includes('credentials') || msg.includes('Invalid')) setAuthErr(t('incorrect_credentials'))
      else setAuthErr(msg || t('something_wrong'))
    } finally {
      setAuthLoading(false)
    }
  }

  const cardStyle = {
    background: 'rgba(17,17,25,.8)',
    border: '1px solid rgba(36,36,52,.9)',
    borderRadius: 22,
    padding: '36px 32px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 24px 64px rgba(0,0,0,.7), 0 0 40px rgba(139,127,245,.08)',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient glow */}
      <div aria-hidden style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 500, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(139,127,245,.12) 0%, transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

      {/* Language switcher */}
      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 6, zIndex: 10 }}>
        {['en', 'sv'].map(l => (
          <button key={l} onClick={() => switchLang(l)}
            style={{ padding: '6px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${lang === l ? 'rgba(139,127,245,.5)' : 'rgba(255,255,255,.08)'}`, background: lang === l ? 'rgba(139,127,245,.15)' : 'rgba(255,255,255,.04)', color: lang === l ? '#a09af7' : 'var(--t2)', fontFamily: 'inherit', transition: 'all .15s' }}>
            {l === 'en' ? '🇬🇧 EN' : '🇸🇪 SV'}
          </button>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={cardStyle}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff', overflow: 'hidden', flexShrink: 0, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={logoSrc} alt="MemoAI" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-.4px', color: 'var(--tx)' }}>MemoAI</span>
          </div>

          {loadingGroup ? (
            <div style={{ textAlign: 'center', color: 'var(--t2)', fontSize: 14, padding: '20px 0' }}>
              {lang === 'sv' ? 'Hämtar grupp…' : 'Looking up group…'}
            </div>
          ) : groupErr ? (
            <div>
              <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>❌</div>
              <div style={{ textAlign: 'center', color: 'var(--rd)', fontSize: 14, fontWeight: 600, marginBottom: 20 }}>{groupErr}</div>
              <button className="btn btn-s btn-lg btn-w" onClick={() => nav('/auth')}>
                {lang === 'sv' ? 'Gå till inloggning' : 'Go to Login'}
              </button>
            </div>
          ) : joined ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 6, color: 'var(--tx)' }}>{t('edu_join_success')}</div>
              <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 24 }}>{groupInfo?.name}</div>
              <button className="btn btn-p btn-lg btn-w" onClick={() => nav('/')}>
                {lang === 'sv' ? 'Börja studera →' : 'Start Studying →'}
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
                  {t('edu_join_title')}
                </div>
                <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-.3px', color: 'var(--tx)' }}>
                  {groupInfo?.name}
                </div>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ background: 'rgba(139,127,245,.15)', color: '#a09af7', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, letterSpacing: '.3px' }}>
                    🎓 EDUCATION
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--t3)' }}>Code: <strong style={{ color: 'var(--t2)', fontFamily: 'monospace' }}>{code?.toUpperCase()}</strong></span>
                </div>
              </div>

              {joinErr && <div className="err-box" style={{ marginBottom: 12 }}>{joinErr}</div>}

              {user ? (
                /* Already logged in — just confirm join */
                <div>
                  <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16, lineHeight: 1.5 }}>
                    {lang === 'sv'
                      ? `Inloggad som ${user.email}. Vill du gå med i denna utbildningsgrupp?`
                      : `Signed in as ${user.email}. Join this Education group?`
                    }
                  </div>
                  <button
                    className="btn btn-p btn-lg btn-w"
                    onClick={handleJoin}
                    disabled={joining}
                  >
                    {joining ? (lang === 'sv' ? 'Går med…' : 'Joining…') : `${t('edu_join_confirm')} ${groupInfo?.name} →`}
                  </button>
                </div>
              ) : (
                /* Not logged in — show sign up / sign in */
                <>
                  <div style={{ background: 'rgba(139,127,245,.08)', border: '1px solid rgba(139,127,245,.18)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--t2)', marginBottom: 18, lineHeight: 1.5 }}>
                    {lang === 'sv' ? 'Skapa ett gratis konto eller logga in för att gå med.' : 'Create a free account or log in to join.'}
                  </div>

                  {/* Tab switcher */}
                  <div style={{ display: 'flex', background: 'rgba(24,24,31,.8)', border: '1px solid rgba(36,36,52,.6)', borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
                    {['signup', 'login'].map(tab => (
                      <button key={tab} onClick={() => { setAuthTab(tab); setAuthErr('') }}
                        style={{ flex: 1, padding: '9px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center', border: 'none', fontFamily: 'inherit', transition: 'all .18s', background: authTab === tab ? 'rgba(139,127,245,.2)' : 'transparent', color: authTab === tab ? 'var(--ac)' : 'var(--t2)', boxShadow: authTab === tab ? '0 0 0 1px rgba(139,127,245,.3)' : 'none' }}>
                        {tab === 'signup' ? t('sign_up') : t('log_in')}
                      </button>
                    ))}
                  </div>

                  {authErr && <div className="err-box" style={{ marginBottom: 12 }}>{authErr}</div>}

                  <form onSubmit={handleAuthAndJoin}>
                    {authTab === 'signup' && (
                      <div className="field">
                        <label>{t('full_name')}</label>
                        <input className="inp" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Alex Johnson" required />
                      </div>
                    )}
                    <div className="field">
                      <label>{t('email')}</label>
                      <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                    </div>
                    <div className="field">
                      <label>{t('password')}</label>
                      <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('min_6_chars')} required />
                    </div>
                    <button className="btn btn-p btn-lg btn-w" type="submit" disabled={authLoading} style={{ marginTop: 8, borderRadius: 12, fontSize: 14 }}>
                      {authLoading
                        ? (authTab === 'signup' ? t('creating') : t('logging_in'))
                        : `${authTab === 'signup' ? t('sign_up') : t('log_in')} & ${t('edu_join_confirm')} →`
                      }
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--t3)' }}>
          <Link to="/privacy" style={{ color: 'var(--t3)', marginRight: 16 }}>Privacy Policy</Link>
          <Link to="/terms" style={{ color: 'var(--t3)' }}>Terms of Service</Link>
        </div>
      </div>
    </div>
  )
}
