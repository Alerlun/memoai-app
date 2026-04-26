import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks/useLang'
import { redirectToCheckout, redirectToPortal, joinEducationGroup } from '../lib/stripe'
import Layout from '../components/Layout'

export default function PlanPage() {
  const { user, profile, isPro, proExpiresAt, isEducation, canAccess, userRole, educationGroupId, refreshProfile } = useAuth()
  const { t, lang } = useLang()
  const nav = useNavigate()

  const [loadingPro, setLoadingPro]   = useState(false)
  const [loadingEdu, setLoadingEdu]   = useState(false)
  const [joinCode, setJoinCode]       = useState('')
  const [joining, setJoining]         = useState(false)
  const [showJoin, setShowJoin]       = useState(false)
  const [joinErr, setJoinErr]         = useState('')
  const [err, setErr]                 = useState('')

  const email        = user?.email || ''
  const isCanceling  = isPro && !!proExpiresAt

  async function handleUpgradePro() {
    setErr(''); setLoadingPro(true)
    try { await redirectToCheckout(email, user.id) }
    catch (e) { setErr(t('stripe_error')); setLoadingPro(false) }
  }

  async function handleManage() {
    setErr(''); setLoadingPro(true)
    try { await redirectToPortal() }
    catch (e) { setErr(e.message || t('portal_error')); setLoadingPro(false) }
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoinErr(''); setJoining(true)
    try {
      await joinEducationGroup(joinCode.trim())
      await refreshProfile()
      nav('/settings')
    } catch (ex) {
      setJoinErr(ex.message?.includes('Invalid') || ex.message?.includes('invalid')
        ? (lang === 'sv' ? 'Ogiltig eller inaktiv kod.' : 'Invalid or inactive code — check with the group owner.')
        : (ex.message || t('something_wrong'))
      )
    } finally { setJoining(false) }
  }

  function formatDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const sv = lang === 'sv'

  // ── Plan definitions ─────────────────────────────────────────────────────
  const plans = [
    {
      key: 'free',
      name: sv ? 'Gratis' : 'Free',
      price: sv ? '0 kr / mån' : '$0 / month',
      badge: null,
      current: !isPro && !isEducation,
      color: 'var(--s2)',
      border: 'var(--bd)',
      features: sv
        ? ['3 uppladdningar / månad', 'Alla studielägen', 'Flashcards, quiz & plan', 'AI-handledare']
        : ['3 uploads / month', 'All study modes', 'Flashcards, quiz & plan', 'AI tutor'],
    },
    {
      key: 'pro',
      name: 'Pro',
      price: sv ? '49 kr / mån' : '€4.99 / month',
      badge: 'PRO',
      badgeColor: '#f97316',
      current: isPro,
      color: 'rgba(249,115,22,.06)',
      border: 'rgba(249,115,22,.3)',
      features: sv
        ? ['Obegränsade uppladdningar', 'Alla studielägen', 'Prioriterad AI-hastighet', 'Avancerade quiz-lägen']
        : ['Unlimited uploads', 'All study modes', 'Priority AI speed', 'Advanced quiz modes'],
    },
    {
      key: 'education',
      name: 'Education',
      price: sv ? '2 490 kr / mån' : '$249 / month',
      badge: 'EDU',
      badgeColor: '#16a34a',
      current: isEducation,
      color: 'rgba(22,163,74,.06)',
      border: 'rgba(22,163,74,.3)',
      features: sv
        ? ['Allt i Pro', 'Hela klassen med en kod', 'Obegränsat antal elever', 'Fungerar för K–12 och uni', 'Medlärare kan gå med']
        : ['Everything in Pro', 'Whole class with one code', 'Unlimited students', 'Works for K–12 and uni', 'Co-teachers can join too'],
    },
  ]

  return (
    <Layout active="plan">
      <div className="page screen" style={{ maxWidth: 560 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.4px', marginBottom: 4 }}>
            {sv ? 'Din plan' : 'Your Plan'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--t2)' }}>
            {isEducation
              ? (sv ? 'Du har MemoAI Education via en grupp.' : 'You have MemoAI Education via a group.')
              : isPro
                ? (sv ? 'Du har MemoAI Pro.' : 'You have MemoAI Pro.')
                : (sv ? 'Du är på gratisplanen.' : 'You\'re on the free plan.')
            }
          </div>
        </div>

        {err && <div className="err-box" style={{ marginBottom: 16 }}>{err}</div>}

        {/* Plan cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          {plans.map(plan => (
            <div
              key={plan.key}
              style={{
                background: plan.current ? plan.color : 'var(--s1)',
                border: `1.5px solid ${plan.current ? plan.border : 'var(--bd)'}`,
                borderRadius: 16,
                padding: 20,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Current indicator */}
              {plan.current && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: plan.badgeColor ?? 'var(--ac)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, letterSpacing: '.5px' }}>
                  {sv ? 'NUVARANDE' : 'CURRENT'}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, paddingRight: plan.current ? 70 : 0 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    {plan.badge && <span style={{ background: plan.badgeColor, color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5 }}>{plan.badge}</span>}
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)' }}>{plan.name}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: plan.current && plan.badgeColor ? plan.badgeColor : 'var(--tx)', marginTop: 2 }}>{plan.price}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, color: 'var(--t2)' }}>
                    <span style={{ color: plan.current && plan.badgeColor ? plan.badgeColor : 'var(--ac)', flexShrink: 0 }}>✓</span> {f}
                  </div>
                ))}
              </div>

              {/* CTAs */}
              {plan.key === 'free' && !plan.current && null}

              {plan.key === 'pro' && (
                plan.current ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {isCanceling && (
                      <div style={{ fontSize: 12, color: '#92400e', background: 'var(--aml)', border: '1px solid var(--am)', borderRadius: 8, padding: '6px 10px', width: '100%', marginBottom: 4 }}>
                        ⚠ {t('pro_expires_on')}: {formatDate(proExpiresAt)}
                      </div>
                    )}
                    <button className="btn btn-s btn-sm" disabled={loadingPro} onClick={handleManage}>
                      {loadingPro ? t('opening_stripe') : (isCanceling ? t('reactivate') : t('manage_cancel'))}
                    </button>
                  </div>
                ) : !isEducation ? (
                  <button className="btn btn-p btn-sm" disabled={loadingPro} style={{ background: '#f97316', border: 'none' }} onClick={handleUpgradePro}>
                    {loadingPro ? t('opening_stripe') : (sv ? 'Uppgradera till Pro →' : 'Upgrade to Pro →')}
                  </button>
                ) : null
              )}

              {plan.key === 'education' && (
                isEducation ? (
                  <button className="btn btn-s btn-sm" onClick={() => nav('/settings')}>
                    {sv ? 'Hantera grupp →' : 'Manage group →'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      className="btn btn-sm btn-w"
                      style={{ background: '#16a34a', color: '#fff', border: 'none', fontWeight: 700 }}
                      disabled={loadingEdu}
                      onClick={() => nav('/education/welcome')}
                    >
                      {sv ? '🎓 Skapa eller gå med i en grupp →' : '🎓 Create or join a group →'}
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>

        {/* FAQ-style note */}
        <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.7, textAlign: 'center', padding: '0 8px' }}>
          {sv
            ? 'Alla planer inkluderar alla studielägen. Uppgraderingar träder i kraft omedelbart. Avsluta när som helst.'
            : 'All plans include all study modes. Upgrades take effect immediately. Cancel any time.'
          }
        </div>

      </div>
    </Layout>
  )
}
