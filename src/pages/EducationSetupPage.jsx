import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../hooks/useLang'
import { redirectToEducationCheckout } from '../lib/stripe'
import Layout from '../components/Layout'

export default function EducationSetupPage() {
  const { t, lang } = useLang()
  const nav = useNavigate()
  const [params] = useSearchParams()

  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const eduCancelled = params.get('edu') === 'cancelled'

  async function handleCreate(e) {
    e.preventDefault()
    if (!groupName.trim()) return
    setErr(''); setLoading(true)
    try {
      await redirectToEducationCheckout(groupName.trim())
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
          ← {lang === 'sv' ? 'Tillbaka' : 'Back'}
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
          <div style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.6 }}>{t('edu_setup_desc')}</div>
        </div>

        {/* Feature highlights */}
        <div style={{ background: 'rgba(139,127,245,.07)', border: '1px solid rgba(139,127,245,.18)', borderRadius: 'var(--r)', padding: 16, marginBottom: 24 }}>
          {[t('edu_upsell_feat1'), t('edu_upsell_feat2'), t('edu_upsell_feat3'), t('edu_upsell_feat4')].map(f => (
            <div key={f} style={{ fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, color: 'var(--t2)', lineHeight: 1.4 }}>
              <span style={{ color: 'var(--ac)', flexShrink: 0 }}>✓</span>{f}
            </div>
          ))}
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ac)', marginTop: 6 }}>{t('edu_upsell_price')}</div>
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
            disabled={loading || !groupName.trim()}
            style={{ marginTop: 8, background: 'linear-gradient(135deg,#5b4fe9 0%,#7c6ff5 60%,#a855f7 100%)', border: 'none' }}
          >
            {loading ? t('opening_stripe') : t('edu_continue_payment')}
          </button>
          <p style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', marginTop: 8 }}>{t('secure_stripe')}</p>
        </form>

      </div>
    </Layout>
  )
}
