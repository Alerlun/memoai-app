import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../hooks/useLang'
import { redirectToEducationCheckout } from '../lib/stripe'
import Layout from '../components/Layout'

const PLANS = [
  {
    id: 'class',
    icon: '🏫',
    titleEn: 'Class Plan',
    titleSv: 'Klassplan',
    priceEn: '$100 / month',
    priceSv: '$100 / månad',
    limitEn: 'Up to 30 students',
    limitSv: 'Upp till 30 elever',
    featuresEn: ['1 class', 'Up to 30 students', 'AI tutor & study tools', 'Group join code', 'Member management'],
    featuresSv: ['1 klass', 'Upp till 30 elever', 'AI-tutor & studieverktyg', 'Gruppkod', 'Medlemshantering'],
  },
  {
    id: 'school',
    icon: '🏛️',
    titleEn: 'School Plan',
    titleSv: 'Skolplan',
    priceEn: '$500 / month',
    priceSv: '$500 / månad',
    limitEn: 'Up to 600 students',
    limitSv: 'Upp till 600 elever',
    featuresEn: ['Whole school', 'Up to 600 students', 'AI tutor & study tools', 'Group join code', 'Member management'],
    featuresSv: ['Hela skolan', 'Upp till 600 elever', 'AI-tutor & studieverktyg', 'Gruppkod', 'Medlemshantering'],
  },
]

export default function EducationSetupPage() {
  const { t, lang } = useLang()
  const nav = useNavigate()
  const [params] = useSearchParams()

  const paramPlan = params.get('plan')
  const [planType, setPlanType] = useState(paramPlan === 'class' || paramPlan === 'school' ? paramPlan : '')
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const eduCancelled = params.get('edu') === 'cancelled'
  const sv = lang === 'sv'

  async function handleCreate(e) {
    e.preventDefault()
    if (!planType || !groupName.trim()) return
    setErr(''); setLoading(true)
    try {
      await redirectToEducationCheckout(groupName.trim(), planType)
    } catch (ex) {
      setErr(ex.message || t('stripe_error'))
      setLoading(false)
    }
  }

  return (
    <Layout active="settings">
      <div className="page screen">

        {/* Back link */}
        <button
          onClick={() => nav('/settings')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 20, padding: 0, fontFamily: 'inherit' }}
        >
          ← {sv ? 'Tillbaka' : 'Back'}
        </button>

        {/* Cancelled banner */}
        {eduCancelled && (
          <div style={{ background: 'var(--aml)', border: '1px solid var(--am)', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--am)', fontWeight: 600 }}>
            {t('edu_cancelled')}
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.4px', marginBottom: 6 }}>{t('edu_setup_title')}</div>
          <div style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.6 }}>{sv ? 'Välj en plan för din grupp.' : 'Choose a plan for your group.'}</div>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {PLANS.map(plan => {
            const selected = planType === plan.id
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setPlanType(plan.id)}
                style={{
                  background: selected ? 'rgba(139,127,245,.1)' : 'var(--c2)',
                  border: selected ? '2px solid var(--ac)' : '2px solid var(--bd)',
                  borderRadius: 'var(--r)',
                  padding: '16px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color .15s, background .15s',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{plan.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>{sv ? plan.titleSv : plan.titleEn}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--ac)', marginBottom: 4 }}>{sv ? plan.priceSv : plan.priceEn}</div>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 10, fontWeight: 600 }}>{sv ? plan.limitSv : plan.limitEn}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(sv ? plan.featuresSv : plan.featuresEn).map(f => (
                    <div key={f} style={{ fontSize: 12, color: 'var(--t2)', display: 'flex', gap: 6 }}>
                      <span style={{ color: selected ? 'var(--ac)' : 'var(--t3)', flexShrink: 0 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {err && <div className="err-box" style={{ marginBottom: 16 }}>{err}</div>}

        <form onSubmit={handleCreate}>
          <div className="field">
            <label>{t('edu_group_name_label')}</label>
            <input
              className="inp"
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder={t('edu_group_name_placeholder')}
              maxLength={80}
              required
            />
          </div>
          <button
            className="btn btn-p btn-lg btn-w"
            type="submit"
            disabled={loading || !groupName.trim() || !planType}
            style={{ marginTop: 8, background: 'linear-gradient(135deg,#5b4fe9 0%,#7c6ff5 60%,#a855f7 100%)', border: 'none' }}
          >
            {loading ? t('opening_stripe') : t('edu_continue_payment')}
          </button>
          {!planType && (
            <p style={{ fontSize: 12, color: 'var(--am)', textAlign: 'center', marginTop: 8, fontWeight: 600 }}>
              {sv ? 'Välj en plan ovan för att fortsätta' : 'Select a plan above to continue'}
            </p>
          )}
          <p style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', marginTop: 8 }}>{t('secure_stripe')}</p>
        </form>

      </div>
    </Layout>
  )
}
