import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks/useLang'
import { useTheme } from '../hooks/useTheme'
import { redirectToCheckout, redirectToPortal } from '../lib/stripe'
import Layout from '../components/Layout'

export default function SettingsPage() {
  const { user, profile, isPro, proExpiresAt, signOut, uploadsThisWeek, FREE_UPLOAD_LIMIT, refreshProfile } = useAuth()
  const { t, lang, switchLang } = useLang()
  const { theme, toggleTheme } = useTheme()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [loadingStripe, setLoadingStripe] = useState(false)
  const [stripeErr, setStripeErr] = useState('')
  const [banner, setBanner] = useState('')
  const [showExportBanner, setShowExportBanner] = useState(false)
  const pollRef = useRef(null)

  const name = profile?.full_name || user?.user_metadata?.full_name || 'User'
  const email = user?.email || ''
  const isCanceling = isPro && !!proExpiresAt

  // Handle redirect back from Stripe
  useEffect(() => {
    const p = params.get('payment')
    if (p === 'success') {
      setBanner('success')
      window.history.replaceState({}, '', '/settings')
      // Poll for pro status — webhook may take a few seconds to fire
      let attempts = 0
      pollRef.current = setInterval(async () => {
        await refreshProfile()
        attempts++
        if (attempts >= 6) clearInterval(pollRef.current)
      }, 2000)
    } else if (p === 'cancelled') {
      setBanner('cancelled')
      window.history.replaceState({}, '', '/settings')
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // Stop polling once pro activates
  useEffect(() => {
    if (isPro && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [isPro])

  async function handleUpgrade() {
    setStripeErr(''); setLoadingStripe(true)
    try { await redirectToCheckout(email, user.id) }
    catch (e) { setStripeErr(t('stripe_error')); setLoadingStripe(false) }
  }

  async function handleManageBilling() {
    setStripeErr(''); setLoadingStripe(true)
    try { await redirectToPortal() }
    catch (e) { setStripeErr(e.message || t('portal_error')); setLoadingStripe(false) }
  }

  async function handleSignOut() {
    if (!window.confirm(t('sign_out_confirm'))) return
    await signOut()
    nav('/auth')
  }

  function formatDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  const SectionHeader = ({ label }) => (
    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8, marginTop: 4, paddingLeft: 2 }}>
      {label}
    </div>
  )

  const CardRow = ({ label, value, onClick, danger, rightEl, borderBottom = true }) => (
    <div
      onClick={onClick}
      style={{
        padding: '13px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: borderBottom ? '1px solid var(--bd)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: borderBottom ? 0 : 'var(--rs)',
        transition: 'background .15s',
      }}
      onMouseEnter={onClick ? (e => e.currentTarget.style.background = 'var(--s2)') : undefined}
      onMouseLeave={onClick ? (e => e.currentTarget.style.background = '') : undefined}
    >
      <span style={{ fontSize: 14, color: danger ? 'var(--rd)' : 'var(--tx)' }}>{label}</span>
      {rightEl || (value !== undefined && <span style={{ color: 'var(--t3)', fontSize: 13 }}>{value}</span>)}
    </div>
  )

  return (
    <Layout active="settings">
      <div className="page screen">

        {/* Success banner */}
        {banner === 'success' && (
          <div style={{ background: isPro ? 'var(--gl)' : 'var(--aml)', border: `1px solid ${isPro ? 'var(--gn)' : 'var(--am)'}`, borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{isPro ? '🎉' : '⏳'}</span>
            <span style={{ color: isPro ? '#166534' : '#92400e' }}>
              {isPro
                ? (lang === 'sv' ? 'Pro aktiverat! Välkommen till MemoAI Pro.' : 'Pro activated! Welcome to MemoAI Pro.')
                : t('payment_activating')
              }
            </span>
          </div>
        )}

        {/* Cancelled banner */}
        {banner === 'cancelled' && (
          <div style={{ background: 'var(--aml)', border: '1px solid var(--am)', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--am)', fontWeight: 600 }}>
            {lang === 'sv' ? 'Betalningen avbröts. Inga avgifter togs ut.' : 'Payment cancelled. No charges were made.'}
          </div>
        )}

        {/* ── Profile card ── */}
        <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg,var(--ac),#8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
            <div style={{ marginTop: 6 }}>
              {isPro ? (
                isCanceling
                  ? <span className="bdg bdg-a">⚠ {t('pro_plan')} · {t('canceling')}</span>
                  : <span className="bdg bdg-g">✓ {t('pro_plan')}</span>
              ) : (
                <span className="bdg bdg-p">{t('free_plan')}</span>
              )}
            </div>
          </div>
        </div>

        {stripeErr && <div className="err-box">{stripeErr}</div>}

        {/* ── Subscription ── */}
        <SectionHeader label={t('subscription')} />

        {!isPro ? (
          // Free → upgrade card
          <div style={{ background: 'linear-gradient(135deg,#5b4fe9 0%,#7c6ff5 60%,#a855f7 100%)', borderRadius: 'var(--r)', padding: 20, color: '#fff', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -18, right: 14, fontSize: 90, opacity: .07, pointerEvents: 'none' }}>✦</div>
            <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 5 }}>{t('upgrade_to_pro')}</div>
            <div style={{ fontSize: 13, opacity: .85, marginBottom: 14, lineHeight: 1.5 }}>{t('pro_desc')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
              {[t('feat1'), t('feat2'), t('feat3'), t('feat4')].map(f => (
                <div key={f} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, opacity: .9 }}>✓ {f}</div>
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, opacity: .9 }}>{t('per_month')}</div>
            <button className="btn btn-lg btn-w" disabled={loadingStripe}
              style={{ background: '#fff', color: 'var(--ac)', fontWeight: 800 }}
              onClick={handleUpgrade}>
              {loadingStripe ? t('opening_stripe') : t('upgrade_btn')}
            </button>
            <p style={{ fontSize: 11, opacity: .6, textAlign: 'center', marginTop: 8 }}>{t('secure_stripe')}</p>
          </div>

        ) : isCanceling ? (
          // Pro but canceling
          <div style={{ background: 'var(--aml)', border: '1.5px solid var(--am)', borderRadius: 'var(--r)', padding: 18, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>{t('pro_canceling')}</div>
                <div style={{ fontSize: 13, color: '#92400e', marginTop: 3 }}>
                  {t('pro_expires_on')}: <strong>{formatDate(proExpiresAt)}</strong>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#78350f', marginBottom: 14, lineHeight: 1.6, background: 'rgba(0,0,0,.04)', borderRadius: 8, padding: '10px 12px' }}>
              {t('cancel_info')}
            </div>
            <button className="btn btn-sm btn-w" disabled={loadingStripe}
              style={{ background: 'var(--am)', color: '#fff', fontWeight: 700, border: 'none' }}
              onClick={handleManageBilling}>
              {loadingStripe ? t('opening_stripe') : t('reactivate')}
            </button>
          </div>

        ) : (
          // Pro active
          <div style={{ background: 'var(--gl)', border: '1.5px solid var(--gn)', borderRadius: 'var(--r)', padding: 18, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 24 }}>🌟</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>{t('pro_active')}</div>
                <div style={{ fontSize: 12, color: '#166534', opacity: .8, marginTop: 2 }}>{t('pro_active_desc')}</div>
              </div>
            </div>
            <button className="btn btn-danger btn-sm btn-w" disabled={loadingStripe} onClick={handleManageBilling}>
              {loadingStripe ? t('opening_stripe') : t('manage_cancel')}
            </button>
            <p style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', marginTop: 8 }}>{t('manage_desc')}</p>
          </div>
        )}

        {/* ── Upload usage (free only) ── */}
        {!isPro && (
          <>
            <SectionHeader label={t('usage_week')} />
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ padding: '13px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 14 }}>{t('uploads_used')}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: uploadsThisWeek >= FREE_UPLOAD_LIMIT ? 'var(--rd)' : 'var(--tx)' }}>
                    {uploadsThisWeek} / {FREE_UPLOAD_LIMIT}
                  </span>
                </div>
                <div className="prog">
                  <div className="prog-fill" style={{
                    width: `${Math.min(100, uploadsThisWeek / FREE_UPLOAD_LIMIT * 100)}%`,
                    background: uploadsThisWeek >= FREE_UPLOAD_LIMIT ? 'var(--rd)' : 'var(--ac)',
                  }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 8 }}>{t('resets_monday')}</p>
              </div>
            </div>
          </>
        )}

        {/* ── Preferences ── */}
        <SectionHeader label={t('preferences')} />
        <div className="card" style={{ marginBottom: 20 }}>
          <CardRow
            label={t('language')}
            rightEl={
              <div style={{ display: 'flex', gap: 6 }}>
                {['en', 'sv'].map(l => (
                  <button key={l} className={`btn btn-sm ${lang === l ? 'btn-p' : 'btn-s'}`} onClick={() => switchLang(l)}>
                    {l === 'en' ? '🇬🇧 EN' : '🇸🇪 SV'}
                  </button>
                ))}
              </div>
            }
          />
          <CardRow
            label={theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            borderBottom={false}
            rightEl={
              <button
                onClick={toggleTheme}
                style={{
                  width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                  background: theme === 'dark' ? 'var(--ac)' : 'var(--s3)',
                  position: 'relative', transition: 'background .2s', flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, left: theme === 'dark' ? 25 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)',
                }} />
              </button>
            }
          />
        </div>

        {/* ── Legal ── */}
        <SectionHeader label={t('legal')} />
        <div className="card" style={{ marginBottom: 20 }}>
          <Link to="/terms" style={{ padding: '13px 16px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
            <span style={{ fontSize: 14 }}>{t('tos_link')}</span>
            <span style={{ color: 'var(--t3)', fontSize: 16 }}>›</span>
          </Link>
          <Link to="/privacy" style={{ padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
            <span style={{ fontSize: 14 }}>{t('privacy_link')}</span>
            <span style={{ color: 'var(--t3)', fontSize: 16 }}>›</span>
          </Link>
        </div>

        {/* ── Account ── */}
        <SectionHeader label={t('account')} />
        <div className="card">
          <CardRow
            label={t('export_sets')}
            value="›"
            onClick={() => setShowExportBanner(b => !b)}
          />
          {showExportBanner && (
            <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: 'var(--aml)', border: '1px solid var(--am)', borderRadius: 'var(--rs)', fontSize: 13, color: 'var(--am)', fontWeight: 600 }}>
              🚧 Export is coming soon — we're working on CSV and Anki formats. Stay tuned!
            </div>
          )}
          <CardRow
            label={t('sign_out')}
            danger
            borderBottom={false}
            onClick={handleSignOut}
          />
        </div>

      </div>
    </Layout>
  )
}
