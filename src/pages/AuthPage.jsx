import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks/useLang'
import { joinEducationGroup } from '../lib/stripe'
import { supabase } from '../lib/supabase'
import logoSrc from '../assets/logo.png'

export default function AuthPage() {
  const { signIn, signUp, refreshProfile } = useAuth()
  const { t, lang, switchLang } = useLang()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()

  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [le, setLe] = useState(''); const [lp, setLp] = useState('')
  const [sn, setSn] = useState(''); const [se, setSe] = useState(''); const [sp, setSp] = useState('')
  const [role, setRole] = useState('')
  const [joinCode, setJoinCode] = useState(searchParams.get('code') ?? '')

  async function handleLogin(e) {
    e.preventDefault(); setErr(''); setLoading(true)
    try { await signIn(le.trim(), lp); nav('/') }
    catch { setErr(t('incorrect_credentials')) }
    finally { setLoading(false) }
  }

  async function handleSignup(e) {
    e.preventDefault(); setErr(''); setLoading(true)
    if (sp.length < 6) { setErr(t('password_too_short')); setLoading(false); return }
    try {
      // Set redirect destination before auth fires so PublicRoute picks it up
      if (role === 'educator') localStorage.setItem('memoai_redirect', '/education/welcome')

      const { data } = await signUp(se.trim(), sp, sn.trim())

      // Persist role to profile
      if (role && data?.user?.id) {
        await supabase.from('profiles').update({ role }).eq('id', data.user.id)
      }

      // Auto-join group if student provided a code
      if (role === 'student' && joinCode.trim()) {
        try { await joinEducationGroup(joinCode.trim()) } catch { /* non-fatal */ }
      }
    } catch (ex) {
      localStorage.removeItem('memoai_redirect')
      setErr(ex.message?.includes('already') ? (lang === 'sv' ? 'E-postadressen används redan.' : 'Email already registered.') : t('could_not_create'))
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'var(--bg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div aria-hidden style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 500, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(139,127,245,.12) 0%, transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '10%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(249,115,22,.07) 0%, transparent 65%)', filter: 'blur(50px)', pointerEvents: 'none' }} />

      {/* Language switcher */}
      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 6, zIndex: 10 }}>
        {['en', 'sv'].map(l => (
          <button key={l} onClick={() => switchLang(l)}
            style={{ padding: '6px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${lang === l ? 'rgba(139,127,245,.5)' : 'rgba(255,255,255,.08)'}`, background: lang === l ? 'rgba(139,127,245,.15)' : 'rgba(255,255,255,.04)', color: lang === l ? '#a09af7' : 'var(--t2)', fontFamily: 'inherit', transition: 'all .15s' }}>
            {l === 'en' ? '🇬🇧 EN' : '🇸🇪 SV'}
          </button>
        ))}
      </div>

      {/* Back to landing */}
      <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 10 }}>
        <button onClick={() => nav('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 9999, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.09)'; e.currentTarget.style.color = 'var(--tx)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.color = 'var(--t2)' }}>
          ← Home
        </button>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ background: 'rgba(17,17,25,.8)', border: '1px solid rgba(36,36,52,.9)', borderRadius: 22, padding: '36px 32px', backdropFilter: 'blur(20px)', boxShadow: '0 24px 64px rgba(0,0,0,.7), 0 0 40px rgba(139,127,245,.08)' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff', overflow: 'hidden', flexShrink: 0, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={logoSrc} alt="MemoAI" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-.4px', color: 'var(--tx)' }}>MemoAI</span>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', background: 'rgba(24,24,31,.8)', border: '1px solid rgba(36,36,52,.6)', borderRadius: 12, padding: 4, marginBottom: 28, gap: 4 }}>
            {['login', 'signup'].map(t2 => (
              <button key={t2} onClick={() => { setTab(t2); setErr('') }}
                style={{ flex: 1, padding: '9px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center', border: 'none', fontFamily: 'inherit', transition: 'all .18s', background: tab === t2 ? 'rgba(139,127,245,.2)' : 'transparent', color: tab === t2 ? 'var(--ac)' : 'var(--t2)', boxShadow: tab === t2 ? '0 0 0 1px rgba(139,127,245,.3)' : 'none' }}>
                {t2 === 'login' ? t('log_in') : t('sign_up')}
              </button>
            ))}
          </div>

          {err && <div className="err-box">{err}</div>}

          {tab === 'login' ? (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.4px', color: 'var(--tx)', marginBottom: 5 }}>{t('welcome_back')}</div>
                <div style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 24 }}>{t('continue_journey')}</div>
              </div>
              <div className="field">
                <label>{t('email')}</label>
                <input className="inp" type="email" value={le} onChange={e => setLe(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="field">
                <label>{t('password')}</label>
                <input className="inp" type="password" value={lp} onChange={e => setLp(e.target.value)} placeholder="••••••••" required />
              </div>
              <button className="btn btn-p btn-lg btn-w" type="submit" disabled={loading} style={{ marginTop: 8, borderRadius: 12, fontSize: 14 }}>
                {loading ? t('logging_in') : `${t('log_in')} →`}
              </button>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--t2)', marginTop: 18 }}>
                {t('no_account')}{' '}
                <a href="#" style={{ color: 'var(--ac)', fontWeight: 700, textDecoration: 'none' }}
                  onClick={e => { e.preventDefault(); setTab('signup') }}>{t('sign_up_free')}</a>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignup}>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.4px', color: 'var(--tx)', marginBottom: 5 }}>{t('create_account')}</div>
                <div style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 20 }}>{t('free_forever')}</div>
              </div>

              {/* Role selector */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { key: 'student',  label: t('iam_student'),  desc: t('role_student_desc'),  icon: '🎒' },
                    { key: 'educator', label: t('iam_educator'), desc: t('role_educator_desc'), icon: '🏫' },
                  ].map(r => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRole(r.key)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: `1.5px solid ${role === r.key ? 'rgba(139,127,245,.6)' : 'rgba(255,255,255,.08)'}`,
                        background: role === r.key ? 'rgba(139,127,245,.12)' : 'rgba(255,255,255,.03)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all .15s',
                        fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{r.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: role === r.key ? 'var(--ac)' : 'var(--tx)', marginBottom: 2 }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.3 }}>{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>{t('full_name')}</label>
                <input className="inp" type="text" value={sn} onChange={e => setSn(e.target.value)} placeholder="Alex Johnson" required />
              </div>
              <div className="field">
                <label>{t('email')}</label>
                <input className="inp" type="email" value={se} onChange={e => setSe(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="field">
                <label>{t('password')}</label>
                <input className="inp" type="password" value={sp} onChange={e => setSp(e.target.value)} placeholder={t('min_6_chars')} required />
              </div>

              {/* Join code — only shown for students */}
              {role === 'student' && (
                <div className="field">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t('join_code_label')}
                    <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 400 }}>({lang === 'sv' ? 'valfritt' : 'optional'})</span>
                  </label>
                  <input
                    className="inp"
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder={t('join_code_placeholder')}
                    maxLength={8}
                    style={{ fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase' }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{t('join_code_optional')}</p>
                </div>
              )}

              <button className="btn btn-p btn-lg btn-w" type="submit" disabled={loading} style={{ marginTop: 8, borderRadius: 12, fontSize: 14 }}>
                {loading ? t('creating') : `${t('sign_up')} →`}
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--t3)', marginTop: 14, lineHeight: 1.5 }}>
                {t('by_signing_up')}{' '}
                <Link to="/terms" style={{ color: 'var(--ac)', fontWeight: 600 }}>{t('tos_link')}</Link>.
              </p>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--t2)', marginTop: 10 }}>
                {t('have_account')}{' '}
                <a href="#" style={{ color: 'var(--ac)', fontWeight: 700, textDecoration: 'none' }}
                  onClick={e => { e.preventDefault(); setTab('login') }}>{t('log_in')}</a>
              </p>
            </form>
          )}
        </div>

        {/* Footer links */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--t3)' }}>
          <Link to="/privacy" style={{ color: 'var(--t3)', marginRight: 16 }}>Privacy Policy</Link>
          <Link to="/terms" style={{ color: 'var(--t3)' }}>Terms of Service</Link>
        </div>
      </div>
    </div>
  )
}
