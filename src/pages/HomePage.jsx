import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSets } from '../hooks/useSets'
import { useLang } from '../hooks/useLang'
import Layout from '../components/Layout'

const COLORS = [['#edeafd','#5b4fe9'],['#dcfce7','#16a34a'],['#fef3c7','#d97706'],['#fee2e2','#dc2626'],['#dbeafe','#2563eb'],['#fce7f3','#be185d']]

function greetKey() {
  const h = new Date().getHours()
  return h < 12 ? 'good_morning' : h < 17 ? 'good_afternoon' : 'good_evening'
}

export default function HomePage() {
  const { user, profile, isPro, uploadsThisWeek, FREE_UPLOAD_LIMIT } = useAuth()
  const { sets, loading, deleteSet } = useSets()
  const { t } = useLang()
  const nav = useNavigate()

  const name = profile?.full_name || user?.user_metadata?.full_name || ''
  const firstName = name.split(' ')[0] || ''
  const totalCards = sets.reduce((a, s) => a + (s.flashcards?.length || 0), 0)
  const uploadsLeft = Math.max(0, FREE_UPLOAD_LIMIT - uploadsThisWeek)

  // Streak tracking
  const streak = parseInt(localStorage.getItem('memoai_streak') || '0')
  const lastStudy = localStorage.getItem('memoai_last_study') || ''
  const today = new Date().toDateString()
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const isStreakActive = lastStudy === today || lastStudy === yesterday.toDateString()
  const displayStreak = isStreakActive ? streak : 0

  return (
    <Layout active="home">
      <div className="page screen">
        {/* Greeting */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.4px' }}>{t(greetKey())}{firstName ? `, ${firstName}` : ''} 👋</h1>
          <p style={{ color: 'var(--t2)', fontSize: 14, marginTop: 3 }}>
            {sets.length} {sets.length === 1 ? t('study_set') : t('study_sets')} {t('study_sets_ready')}
          </p>
        </div>

        {/* Upload limit banner */}
        {!isPro && (
          <div style={{ background: uploadsLeft === 0 ? 'var(--rl)' : 'var(--aml)', border: `1px solid ${uploadsLeft === 0 ? 'var(--rd)' : 'var(--am)'}`, borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: uploadsLeft === 0 ? 'var(--rd)' : 'var(--am)' }}>
                {uploadsLeft === 0 ? `⚠️ ${t('upload_limit_reached')}` : `📤 ${uploadsLeft} ${t('uploads_left')}`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
                {uploadsLeft === 0 ? t('upgrade_unlimited') : t('free_plan_limit')}
              </div>
            </div>
            <button className="btn btn-pro btn-sm" onClick={() => nav('/settings')}>{t('upgrade')}</button>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, margin: '0 0 18px' }}>
          {[
            { v: sets.length, l: sets.length === 1 ? t('study_set') : t('study_sets'), icon: '📚' },
            { v: totalCards, l: t('cards'), icon: '🃏' },
            { v: isPro ? '∞' : `${uploadsThisWeek}/${FREE_UPLOAD_LIMIT}`, l: t('uploads'), icon: '📤' },
            { v: `${displayStreak}🔥`, l: 'Day streak', icon: null },
          ].map(({ v, l }) => (
            <div key={l} className="card" style={{ padding: '12px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ac)', letterSpacing: -1 }}>{v}</div>
              <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 3, fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Weak Areas */}
        {(() => {
          const weakCards = sets
            .flatMap(s => (s.flashcards || []).map(c => ({ ...c, setTitle: s.title, setId: s.id })))
            .filter(c => (c.memoryScore || 0) < 40 && c.repetitions > 0)
            .sort((a, b) => (a.memoryScore || 0) - (b.memoryScore || 0))
            .slice(0, 3)
          if (!weakCards.length) return null
          return (
            <div style={{ marginBottom: 18 }}>
              <div className="sechd">⚠️ Needs Review</div>
              {weakCards.map((c, i) => (
                <div key={i} className="card card-tap" style={{ padding: '11px 14px', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid var(--rd)' }}
                  onClick={() => nav(`/study/${c.setId}?mode=learn`)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.q}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{c.setTitle}</div>
                  </div>
                  <div style={{ background: 'var(--rl)', borderRadius: 20, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: 'var(--rd)', flexShrink: 0 }}>
                    {c.memoryScore || 0}%
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
          <div onClick={() => nav('/upload')} style={{ background: 'var(--ac)', borderRadius: 'var(--r)', padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--s1)', transition: 'all .18s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--s2s)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--s1)' }}>
            <span style={{ fontSize: 26 }}>⚡</span>
            <div><div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{t('new_set')}</div><div style={{ fontSize: 12, opacity: .72, color: '#fff' }}>{t('upload_material')}</div></div>
          </div>
          <div onClick={() => sets.length && nav(`/study/${sets[0].id}`)} className={`card${sets.length ? ' card-tap' : ''}`} style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, opacity: sets.length ? 1 : .5 }}>
            <span style={{ fontSize: 26 }}>▶️</span>
            <div><div style={{ fontSize: 13, fontWeight: 700 }}>{t('continue_studying')}</div><div style={{ fontSize: 12, color: 'var(--t2)' }}>{t('resume_last')}</div></div>
          </div>
        </div>

        {/* Sets list */}
        <div className="sechd">{t('your_study_sets')} <a onClick={() => nav('/upload')}>+ {t('new_set')}</a></div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Loading…</div>
        ) : sets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--t3)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📚</div>
            <p style={{ fontSize: 14 }}>{t('no_sets_yet')}<br />{t('upload_to_start')}</p>
            <button className="btn btn-p" style={{ marginTop: 16 }} onClick={() => nav('/upload')}>{t('create_first_set')}</button>
          </div>
        ) : sets.map(s => {
          const ci = s.id ? (s.id.charCodeAt(0) + s.id.charCodeAt(1)) % COLORS.length : 0
          const [bg, fg] = COLORS[ci]
          return (
            <div key={s.id} className="card card-tap" style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}
              onClick={() => nav(`/study/${s.id}`)}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {s.icon || '📚'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{s.flashcards?.length || 0} {t('cards')} · {s.quiz?.length || 0} quiz</div>
              </div>
              <div style={{ width: 56, flexShrink: 0 }}>
                <div className="prog" style={{ height: 4 }}><div className="prog-fill" style={{ width: `${s.progress || 0}%` }} /></div>
                <div style={{ fontSize: 10, color: 'var(--t3)', textAlign: 'right', marginTop: 3 }}>{s.progress || 0}%</div>
              </div>
              <button className="btn btn-g btn-sm" style={{ flexShrink: 0, fontSize: 15 }}
                onClick={e => { e.stopPropagation(); if (window.confirm(t('delete_confirm'))) deleteSet(s.id) }}>
                🗑
              </button>
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
