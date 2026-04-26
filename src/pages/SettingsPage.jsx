import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks/useLang'
import { useTheme } from '../hooks/useTheme'
import { redirectToCheckout, redirectToPortal, leaveEducationGroup } from '../lib/stripe'
import { supabase } from '../lib/supabase'
import { useSets } from '../hooks/useSets'
import Layout from '../components/Layout'

export default function SettingsPage() {
  const { user, profile, isPro, proExpiresAt, isEducation, canAccess, userRole, educationGroupId, signOut, uploadsThisWeek, FREE_UPLOAD_LIMIT, refreshProfile } = useAuth()
  const { t, lang, switchLang } = useLang()
  const { theme, toggleTheme } = useTheme()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [loadingStripe, setLoadingStripe] = useState(false)
  const [stripeErr, setStripeErr] = useState('')
  const [banner, setBanner] = useState('')
  const [showExportPanel, setShowExportPanel] = useState(false)
  const { sets } = useSets()
  const pollRef = useRef(null)

  // Education group state (for owners)
  const [eduGroup, setEduGroup] = useState(null)
  const [eduMembers, setEduMembers] = useState([])
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [removingMember, setRemovingMember] = useState(null)
  const [leavingGroup, setLeavingGroup] = useState(false)

  const name = profile?.full_name || user?.user_metadata?.full_name || 'User'
  const email = user?.email || ''
  const isCanceling = isPro && !!proExpiresAt
  const isEduOwner = isEducation && userRole === 'educator'
  const isEduStudent = isEducation && userRole === 'student'
  const isEduCanceling = isEduOwner && !!eduGroup?.expires_at

  // Fetch education group info for owners
  useEffect(() => {
    if (!educationGroupId) return
    async function fetchEduGroup() {
      const { data: group } = await supabase
        .from('education_groups')
        .select('id, name, join_code, is_active, expires_at')
        .eq('id', educationGroupId)
        .single()
      if (group) setEduGroup(group)

      if (userRole === 'educator') {
        const { data: members } = await supabase.rpc('get_education_group_members', { p_group_id: educationGroupId })
        if (members) setEduMembers(members.map(m => ({ ...m, role: m.member_role, profiles: { full_name: m.full_name } })))
      }
    }
    fetchEduGroup()
  }, [educationGroupId, userRole])

  // Handle redirect back from Education Stripe
  useEffect(() => {
    const e = params.get('edu')
    if (e === 'success') {
      setBanner('edu_success')
      window.history.replaceState({}, '', '/settings')
      let attempts = 0
      pollRef.current = setInterval(async () => {
        await refreshProfile()
        attempts++
        if (attempts >= 8) clearInterval(pollRef.current)
      }, 2000)
    }
  }, [])

  useEffect(() => {
    if (isEducation && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [isEducation])

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
    catch (e) {
      setStripeErr(e.message || t('portal_error'))
      setLoadingStripe(false)
      // If the portal reset the account (stale/missing customer), refresh so the UI reflects the DB state
      if (e.message?.includes('reset')) await refreshProfile()
    }
  }

  async function handleSignOut() {
    if (!window.confirm(t('sign_out_confirm'))) return
    await signOut()
    nav('/auth')
  }

  async function handleLeaveGroup() {
    if (!window.confirm(t('edu_leave_confirm'))) return
    setLeavingGroup(true)
    try {
      await leaveEducationGroup()
      await refreshProfile()
    } catch (e) {
      setStripeErr(e.message)
    } finally {
      setLeavingGroup(false)
    }
  }

  async function handleRemoveMember(memberId) {
    setRemovingMember(memberId)
    try {
      await supabase.from('education_members').delete().eq('user_id', memberId).eq('group_id', educationGroupId)
      await supabase.from('profiles').update({ is_education: false, education_group_id: null }).eq('id', memberId)
      setEduMembers(m => m.filter(x => x.user_id !== memberId))
    } catch (e) {
      setStripeErr(e.message)
    } finally {
      setRemovingMember(null)
    }
  }

  function copyJoinCode() {
    if (!eduGroup?.join_code) return
    navigator.clipboard.writeText(eduGroup.join_code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function exportAnki() {
    // Tab-separated front\tback — directly importable by Anki and Quizlet
    const lines = []
    sets.forEach(s => {
      (s.flashcards || []).forEach(c => {
        const front = String(c.q || '').replace(/\t|\n/g, ' ')
        const back  = String(c.a || '').replace(/\t|\n/g, ' ')
        lines.push(`${front}\t${back}`)
      })
    })
    downloadFile(lines.join('\n'), 'memoai-flashcards.txt', 'text/plain')
  }

  function exportCSV() {
    const escape = v => `"${String(v).replace(/"/g, '""')}"`
    const rows   = ['Set,Question,Answer']
    sets.forEach(s => {
      (s.flashcards || []).forEach(c => {
        rows.push([escape(s.title || 'Untitled'), escape(c.q || ''), escape(c.a || '')].join(','))
      })
    })
    downloadFile(rows.join('\n'), 'memoai-flashcards.csv', 'text/csv')
  }

  function exportJSON() {
    const data = sets.map(s => ({
      title:      s.title,
      icon:       s.icon,
      created_at: s.created_at,
      flashcards: (s.flashcards || []).map(c => ({ question: c.q, answer: c.a })),
      quiz:       (s.quiz || []).map(q => ({ question: q.q, options: q.options, correct: q.correct })),
    }))
    downloadFile(JSON.stringify(data, null, 2), 'memoai-sets.json', 'application/json')
  }

  function copyJoinLink() {
    if (!eduGroup?.join_code) return
    navigator.clipboard.writeText(`${window.location.origin}/join/${eduGroup.join_code}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
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

        {/* Education success banner */}
        {banner === 'edu_success' && (
          <div style={{ background: isEducation ? 'var(--gl)' : 'var(--aml)', border: `1px solid ${isEducation ? 'var(--gn)' : 'var(--am)'}`, borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{isEducation ? '🎓' : '⏳'}</span>
            <span style={{ color: isEducation ? '#166534' : '#92400e' }}>
              {isEducation
                ? (lang === 'sv' ? 'Education aktiverat! Dela koden nedan med dina elever.' : 'Education activated! Share the code below with your students.')
                : t('edu_payment_activating')
              }
            </span>
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
              {isEducation ? (
                isEduCanceling
                  ? <span className="bdg bdg-a">⚠ {t('education_plan')} · {t('canceling')}</span>
                  : <span className="bdg bdg-g">🎓 {t('education_plan')}</span>
              ) : isPro ? (
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

        {/* ── Subscription (Pro only — hidden for Education users) ── */}
        {!isEducation && <SectionHeader label={t('subscription')} />}

        {!isEducation && (!isPro ? (
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
        ))}

        {/* ── Education section ── */}
        {isEducation ? (
          <>
            <SectionHeader label={t('education_group')} />

            {isEduOwner && eduGroup ? (
              // ── Owner view ──────────────────────────────────────────
              <>
                {/* ── Join code — shown first so it's always easy to find ── */}
                <div className="card" style={{ marginBottom: 16, border: '1.5px solid rgba(139,127,245,.35)', background: 'rgba(139,127,245,.06)' }}>
                  <div style={{ padding: '16px 16px 6px' }}>
                    <div style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                      {t('edu_join_code')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                      <code style={{ fontSize: 26, fontWeight: 900, letterSpacing: 5, color: 'var(--ac)', background: 'rgba(139,127,245,.12)', padding: '8px 18px', borderRadius: 10, fontFamily: 'monospace', flexShrink: 0 }}>
                        {eduGroup.join_code}
                      </code>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-p btn-sm" onClick={copyJoinCode} style={{ fontWeight: 700 }}>
                          {copiedCode ? '✓ ' + t('edu_copied') : t('edu_copy_code')}
                        </button>
                        <button className="btn btn-s btn-sm" onClick={copyJoinLink}>
                          {copiedLink ? '✓ ' + t('edu_copied') : t('edu_copy_link')}
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 14 }}>
                      {lang === 'sv' ? 'Delningslänk:' : 'Share link:'}{' '}
                      <code style={{ fontSize: 11 }}>{window.location.origin}/join/{eduGroup.join_code}</code>
                    </p>
                  </div>
                </div>

                {/* ── Billing status ── */}
                {isEduCanceling ? (
                  <div style={{ background: 'var(--aml)', border: '1.5px solid var(--am)', borderRadius: 'var(--r)', padding: 18, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>⚠️</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>{t('edu_canceling')}</div>
                        <div style={{ fontSize: 13, color: '#92400e', marginTop: 3 }}>
                          {t('edu_expires_on')}: <strong>{formatDate(eduGroup.expires_at)}</strong>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#78350f', marginBottom: 14, lineHeight: 1.6, background: 'rgba(0,0,0,.04)', borderRadius: 8, padding: '10px 12px' }}>
                      {t('edu_cancel_info')}
                    </div>
                    <button className="btn btn-sm btn-w" disabled={loadingStripe}
                      style={{ background: 'var(--am)', color: '#fff', fontWeight: 700, border: 'none' }}
                      onClick={handleManageBilling}>
                      {loadingStripe ? t('opening_stripe') : t('edu_reactivate')}
                    </button>
                  </div>
                ) : (
                  <div style={{ background: 'var(--gl)', border: '1.5px solid var(--gn)', borderRadius: 'var(--r)', padding: 18, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <span style={{ fontSize: 24 }}>🎓</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>{t('education_active')}</div>
                        <div style={{ fontSize: 12, color: '#166534', opacity: .8, marginTop: 2 }}>{eduGroup.name}</div>
                      </div>
                    </div>
                    <button className="btn btn-danger btn-sm btn-w" disabled={loadingStripe} onClick={handleManageBilling}>
                      {loadingStripe ? t('opening_stripe') : t('edu_manage_billing')}
                    </button>
                    <p style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', marginTop: 8 }}>{t('manage_desc')}</p>
                  </div>
                )}

                {/* ── Member list ── */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--bd)' }}>
                    <div style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 700, marginBottom: 4 }}>{t('edu_group_name')}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{eduGroup.name}</div>
                  </div>

                  {/* Member list */}
                  <div style={{ padding: '10px 16px 4px' }}>
                    <div style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 700, marginBottom: 8 }}>
                      {t('edu_members')} ({eduMembers.length})
                    </div>
                    {eduMembers.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--t3)', paddingBottom: 8 }}>
                        {lang === 'sv' ? 'Inga medlemmar ännu. Dela koden ovan!' : 'No members yet. Share the code above!'}
                      </div>
                    ) : (
                      eduMembers.map((m, i) => (
                        <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < eduMembers.length - 1 ? '1px solid var(--bd)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: m.role === 'educator' ? 'linear-gradient(135deg,#5b4fe9,#8b5cf6)' : 'linear-gradient(135deg,var(--ac),#8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                              {(m.profiles?.full_name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{m.profiles?.full_name || (lang === 'sv' ? 'Okänd' : 'Unknown')}</div>
                              <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                                {m.role === 'educator' ? (lang === 'sv' ? 'Ägare' : 'Owner') : t('iam_student')} · {t('edu_member_since')} {formatDate(m.joined_at)}
                              </div>
                            </div>
                          </div>
                          {m.user_id !== user?.id && (
                            <button
                              className="btn btn-s btn-sm"
                              disabled={removingMember === m.user_id}
                              onClick={() => handleRemoveMember(m.user_id)}
                              style={{ color: 'var(--rd)', borderColor: 'rgba(239,68,68,.3)', fontSize: 11 }}
                            >
                              {removingMember === m.user_id ? '…' : t('edu_remove_member')}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : isEduStudent ? (
              // ── Student view ──────────────────────────────────────────
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>🎓</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{t('education_active')}</div>
                    <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
                      {t('edu_active_via')} <strong>{eduGroup?.name ?? '…'}</strong>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '8px 16px 14px' }}>
                  <button
                    className="btn btn-s btn-sm"
                    style={{ color: 'var(--rd)', borderColor: 'rgba(239,68,68,.3)', fontSize: 12 }}
                    disabled={leavingGroup}
                    onClick={handleLeaveGroup}
                  >
                    {leavingGroup ? '…' : t('edu_leave_group')}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : userRole === 'educator' && !isEducation ? (
          // ── Educator without a group — upsell ─────────────────────────
          <>
            <SectionHeader label={t('education_group')} />
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#3730a3 100%)', borderRadius: 'var(--r)', padding: 20, color: '#fff', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -18, right: 14, fontSize: 90, opacity: .06, pointerEvents: 'none' }}>🎓</div>
              <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 5 }}>{t('edu_upsell_title')}</div>
              <div style={{ fontSize: 13, opacity: .85, marginBottom: 14, lineHeight: 1.5 }}>{t('edu_upsell_desc')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                {[t('edu_upsell_feat1'), t('edu_upsell_feat2'), t('edu_upsell_feat3'), t('edu_upsell_feat4')].map(f => (
                  <div key={f} style={{ fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 7, opacity: .9, lineHeight: 1.4 }}>✓ {f}</div>
                ))}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, opacity: .9 }}>{t('edu_upsell_price')}</div>
              <button
                className="btn btn-lg btn-w"
                style={{ background: '#fff', color: '#312e81', fontWeight: 800 }}
                onClick={() => nav('/education/setup')}
              >
                {t('edu_create_group_btn')}
              </button>
            </div>
          </>
        ) : null}

        {/* ── Upload usage (free only) ── */}
        {!canAccess && (
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
            rightEl={
              <button className="btn btn-s btn-sm" onClick={() => setShowExportPanel(b => !b)}>
                {showExportPanel ? '▲' : (lang === 'sv' ? 'Exportera' : 'Export')}
              </button>
            }
          />
          {showExportPanel && (
            <div style={{ margin: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 2 }}>
                {sets.length} {lang === 'sv' ? 'paket' : 'sets'} · {sets.reduce((n, s) => n + (s.flashcards?.length || 0), 0)} {lang === 'sv' ? 'flashcards totalt' : 'flashcards total'}
              </div>
              <button className="btn btn-s btn-sm btn-w" onClick={exportAnki} style={{ justifyContent: 'flex-start', gap: 8 }}>
                <span>📋</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700 }}>{lang === 'sv' ? 'Anki / Quizlet (.txt)' : 'Anki / Quizlet (.txt)'}</div>
                  <div style={{ fontSize: 11, opacity: .7, fontWeight: 400 }}>{lang === 'sv' ? 'Tabbavskilt — importera direkt' : 'Tab-separated — import directly'}</div>
                </div>
              </button>
              <button className="btn btn-s btn-sm btn-w" onClick={exportCSV} style={{ justifyContent: 'flex-start', gap: 8 }}>
                <span>📊</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700 }}>Spreadsheet (.csv)</div>
                  <div style={{ fontSize: 11, opacity: .7, fontWeight: 400 }}>{lang === 'sv' ? 'Öppna i Excel eller Google Sheets' : 'Open in Excel or Google Sheets'}</div>
                </div>
              </button>
              <button className="btn btn-s btn-sm btn-w" onClick={exportJSON} style={{ justifyContent: 'flex-start', gap: 8 }}>
                <span>📦</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700 }}>All data (.json)</div>
                  <div style={{ fontSize: 11, opacity: .7, fontWeight: 400 }}>{lang === 'sv' ? 'Fullständig export med quiz & anteckningar' : 'Full export including quiz & notes'}</div>
                </div>
              </button>
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
