import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSets } from '../hooks/useSets'
import { useLang } from '../hooks/useLang'
import Layout from '../components/Layout'
import { getXPProgress, getSetLevel, MILESTONES, getNextMilestone, DAILY_GOAL, getLevelFromXP } from '../lib/xp'
import { supabase } from '../lib/supabase'

const COLORS = [['#edeafd','#5b4fe9'],['#dcfce7','#16a34a'],['#fef3c7','#d97706'],['#fee2e2','#dc2626'],['#dbeafe','#2563eb'],['#fce7f3','#be185d']]

function greetKey() {
  const h = new Date().getHours()
  return h < 12 ? 'good_morning' : h < 17 ? 'good_afternoon' : 'good_evening'
}

// ── Daily Goal Ring ────────────────────────────────────────────────────────────
function GoalRing({ count, goal, streak }) {
  const pct     = Math.min(1, count / goal)
  const radius  = 26
  const circ    = 2 * Math.PI * radius
  const done    = pct >= 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--s3)" strokeWidth="7" />
          <circle cx="32" cy="32" r={radius} fill="none"
            stroke={done ? 'var(--gn)' : 'var(--ac)'}
            strokeWidth="7"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset .5s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: done ? 20 : 13, fontWeight: 900, color: done ? 'var(--gn)' : 'var(--ac)' }}>
          {done ? '✓' : `${count}`}
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--t2)', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>
        Daily goal<br/>{done ? '🎉 Done!' : `${count}/${goal}`}
      </div>
      {streak > 0 && (
        <div style={{ fontSize: 9, color: 'var(--am)', fontWeight: 700 }}>{streak}🔥</div>
      )}
    </div>
  )
}

// ── Activity Graph (GitHub-style contribution graph) ──────────────────────────
const ACTIVITY_LEVELS = [
  { min: 0,  max: 0,   bg: 'var(--s3)',              label: 'No activity' },
  { min: 1,  max: 4,   bg: 'rgba(74,222,128,.25)',   label: '1–4 cards' },
  { min: 5,  max: 9,   bg: 'rgba(74,222,128,.50)',   label: '5–9 cards' },
  { min: 10, max: 19,  bg: 'rgba(74,222,128,.75)',   label: '10–19 cards' },
  { min: 20, max: Infinity, bg: '#4ade80',           label: '20+ cards' },
]
function activityLevel(count) {
  return ACTIVITY_LEVELS.find(l => count >= l.min && count <= l.max) || ACTIVITY_LEVELS[0]
}

function ActivityGraph() {
  const [tooltip, setTooltip] = useState(null)

  const { activity, weeks, months, totalCards, activeDays } = useMemo(() => {
    const activity = JSON.parse(localStorage.getItem('memoai_activity') || '{}')
    const WEEKS = 20  // show ~5 months
    const totalDays = WEEKS * 7

    // Build grid: sunday-first, ending today
    const today = new Date(); today.setHours(0,0,0,0)
    const startOffset = today.getDay() // days past Sunday of current week
    // Pad so grid ends exactly on today's column
    const cells = []
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      cells.push({ key: d.toDateString(), date: d, count: activity[d.toDateString()] || 0 })
    }

    // Group into weeks (columns of 7)
    const weeks = []
    for (let w = 0; w < WEEKS; w++) {
      weeks.push(cells.slice(w * 7, w * 7 + 7))
    }

    // Month labels: find first cell of each month
    const months = []
    weeks.forEach((week, wi) => {
      week.forEach((cell, di) => {
        if (cell.date.getDate() === 1 || (wi === 0 && di === 0)) {
          const label = cell.date.toLocaleDateString('en', { month: 'short' })
          if (!months.length || months[months.length - 1].label !== label) {
            months.push({ label, col: wi })
          }
        }
      })
    })

    const totalCards = Object.values(activity).reduce((a, b) => a + b, 0)
    const activeDays = Object.values(activity).filter(v => v > 0).length

    return { activity, weeks, months, totalCards, activeDays }
  }, [])

  if (!Object.keys(JSON.parse(localStorage.getItem('memoai_activity') || '{}')).length) return null

  const CELL = 11  // px per cell
  const GAP  = 2   // px gap

  return (
    <div style={{ marginBottom: 18 }}>
      <div className="sechd" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span>📊 Study Activity</span>
        <span style={{ fontSize:11, color:'var(--t3)', fontWeight:500 }}>{activeDays} active days · {totalCards} cards total</span>
      </div>

      <div style={{ overflowX:'auto', paddingBottom:4 }}>
        <div style={{ display:'inline-block', position:'relative' }}>
          {/* Month labels */}
          <div style={{ display:'flex', marginBottom:3, paddingLeft:18 }}>
            {weeks.map((_, wi) => {
              const mo = months.find(m => m.col === wi)
              return (
                <div key={wi} style={{ width: CELL + GAP, fontSize: 9, color:'var(--t3)', fontWeight:600, flexShrink:0 }}>
                  {mo ? mo.label : ''}
                </div>
              )
            })}
          </div>

          <div style={{ display:'flex', gap:0 }}>
            {/* Day labels */}
            <div style={{ display:'flex', flexDirection:'column', gap:GAP, marginRight:4, paddingTop:1 }}>
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} style={{ height:CELL, fontSize:8, color:'var(--t3)', fontWeight:600, display:'flex', alignItems:'center', lineHeight:1 }}>
                  {i % 2 === 1 ? d : ''}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div style={{ display:'flex', gap:GAP }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display:'flex', flexDirection:'column', gap:GAP }}>
                  {week.map((cell, di) => {
                    const lv = activityLevel(cell.count)
                    const isFuture = cell.date > new Date()
                    return (
                      <div
                        key={di}
                        title={`${cell.date.toLocaleDateString('en', { month:'short', day:'numeric' })}: ${cell.count} cards`}
                        onMouseEnter={e => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setTooltip({ text: `${cell.date.toLocaleDateString('en',{month:'short',day:'numeric'})}: ${cell.count} card${cell.count!==1?'s':''}`, x: rect.left, y: rect.top })
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        style={{
                          width: CELL, height: CELL,
                          borderRadius: 2,
                          background: isFuture ? 'transparent' : lv.bg,
                          border: isFuture ? 'none' : cell.count === 0 ? '1px solid var(--bd)' : 'none',
                          cursor: cell.count > 0 ? 'default' : 'default',
                          transition: 'transform .1s',
                          flexShrink: 0,
                        }}
                        onMouseOver={e => { if (cell.count > 0) e.currentTarget.style.transform = 'scale(1.3)' }}
                        onMouseOut={e => { e.currentTarget.style.transform = '' }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:6, paddingLeft:18 }}>
            <span style={{ fontSize:9, color:'var(--t3)' }}>Less</span>
            {ACTIVITY_LEVELS.map((l, i) => (
              <div key={i} style={{ width:10, height:10, borderRadius:2, background:l.bg, border:i===0?'1px solid var(--bd)':'none' }} />
            ))}
            <span style={{ fontSize:9, color:'var(--t3)' }}>More</span>
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {tooltip && (
        <div style={{ position:'fixed', left:tooltip.x, top:tooltip.y - 28, background:'var(--s3)', border:'1px solid var(--bd2)', borderRadius:6, padding:'3px 8px', fontSize:11, color:'var(--tx)', fontWeight:600, pointerEvents:'none', zIndex:9999, whiteSpace:'nowrap', transform:'translateX(-50%)' }}>
          {tooltip.text}
        </div>
      )}
    </div>
  )
}

// ── Streak urgency banner ──────────────────────────────────────────────────────
function StreakUrgencyBanner({ streak }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function calc() {
      const now = new Date()
      const midnight = new Date(); midnight.setHours(24, 0, 0, 0)
      const diff = midnight - now
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTimeLeft(`${h}h ${m}m`)
    }
    calc()
    const id = setInterval(calc, 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ background: 'rgba(249,115,22,.12)', border: '1px solid rgba(249,115,22,.4)', borderRadius: 'var(--r)', padding: '11px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>🔥</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#f97316' }}>Don't break your {streak}-day streak!</div>
        <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>Study anything today · {timeLeft} left</div>
      </div>
    </div>
  )
}


// ── Leaderboard widget ─────────────────────────────────────────────────────────
function LeaderboardWidget({ currentUserId, limit = null }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    supabase.rpc('get_weekly_leaderboard')
      .then(({ data }) => { setRows(data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ marginBottom: 22 }}>
      <div className="sechd">🏅 Weekly XP Leaderboard</div>
      {[0,1,2].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 'var(--rs)', marginBottom: 6, height: 48 }}>
          <div className="shimmer" style={{ width: 24, height: 16, borderRadius: 4 }} />
          <div className="shimmer" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="shimmer" style={{ height: 12, borderRadius: 4, width: '55%' }} />
            <div className="shimmer" style={{ height: 9, borderRadius: 4, width: '30%' }} />
          </div>
          <div className="shimmer" style={{ width: 48, height: 14, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
  if (!rows.length) return null

  const visibleRows = limit && !expanded ? rows.slice(0, limit) : rows
  const hasMore = limit && rows.length > limit

  return (
    <div style={{ marginBottom: 22 }}>
      <div className="sechd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>🏅 Weekly XP Leaderboard</span>
        {hasMore && (
          <span style={{ fontSize: 11, color: 'var(--ac)', fontWeight: 700, cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
            {expanded ? 'Show less' : `See all ${rows.length} →`}
          </span>
        )}
      </div>
      {visibleRows.map((r, i) => {
        const isMe = r.user_id === currentUserId
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: isMe ? 'var(--al)' : i === 0 ? 'rgba(251,191,36,.08)' : 'var(--sf)', border: `1px solid ${isMe ? 'var(--ac)' : i === 0 ? 'rgba(251,191,36,.35)' : 'var(--bd)'}`, borderRadius: 'var(--rs)', marginBottom: 6 }}>
            <span style={{ fontSize: i < 3 ? 18 : 13, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{medal}</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: isMe ? 'linear-gradient(135deg,var(--ac),#a855f7)' : 'var(--s3)', color: isMe ? '#fff' : 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
              {r.avatar_char}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: isMe ? 800 : 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isMe ? 'var(--ac)' : 'var(--tx)' }}>{r.display_name}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)' }}>Lv.{getLevelFromXP(r.total_xp)}</div>
            </div>
            {isMe && <span style={{ fontSize: 9, fontWeight: 800, background: 'var(--ac)', color: '#fff', borderRadius: 6, padding: '2px 6px', letterSpacing: '.4px', flexShrink: 0 }}>YOU</span>}
            <div style={{ fontSize: 13, fontWeight: 800, color: isMe ? 'var(--ac)' : 'var(--t2)' }}>⚡ {r.xp_this_week}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function HomePage() {
  const { user, profile, isPro, uploadsThisWeek, FREE_UPLOAD_LIMIT, totalXP } = useAuth()
  const { sets, loading, deleteSet } = useSets()
  const { t } = useLang()
  const nav = useNavigate()

  const name = profile?.full_name || user?.user_metadata?.full_name || ''
  const firstName = name.split(' ')[0] || ''
  const totalCards = sets.reduce((a, s) => a + (s.flashcards?.length || 0), 0)
  const uploadsLeft = Math.max(0, FREE_UPLOAD_LIMIT - uploadsThisWeek)

  // Streak
  const streak = parseInt(localStorage.getItem('memoai_streak') || '0')
  const lastStudy = localStorage.getItem('memoai_last_study') || ''
  const today = new Date().toDateString()
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const isStreakActive = lastStudy === today || lastStudy === yesterday.toDateString()
  const displayStreak = isStreakActive ? streak : 0

  // Daily goal
  const goalDate   = localStorage.getItem('memoai_goal_date') || ''
  const goalCount  = goalDate === today ? parseInt(localStorage.getItem('memoai_goal_count') || '0') : 0
  const goalStreak = parseInt(localStorage.getItem('memoai_goal_streak') || '0')

  // ── Daily Smart Review ────────────────────────────────────────────────────
  const dailyReview = useMemo(() => {
    const now = new Date()
    now.setHours(23, 59, 59, 999)
    // Collect all cards with set info, filter to due/struggling
    const candidates = sets.flatMap(s =>
      (s.flashcards || []).map(c => ({ ...c, setId: s.id, setTitle: s.title }))
    ).filter(c =>
      (c.nextReview && new Date(c.nextReview) <= now) ||   // due today or overdue
      (!c.nextReview && (c.repetitions || 0) > 0) ||       // reviewed before but no nextReview
      ((c.memoryScore || 0) < 30 && (c.repetitions || 0) > 0) // struggling
    ).sort((a, b) => {
      // Sort: most overdue first, then by lowest memoryScore
      const aDate = a.nextReview ? new Date(a.nextReview) : new Date(0)
      const bDate = b.nextReview ? new Date(b.nextReview) : new Date(0)
      if (aDate - bDate !== 0) return aDate - bDate
      return (a.memoryScore || 0) - (b.memoryScore || 0)
    }).slice(0, 10)

    if (!candidates.length) return null
    // Pick the set with the most due cards
    const setCounts = {}
    candidates.forEach(c => { setCounts[c.setId] = (setCounts[c.setId] || 0) + 1 })
    const bestSetId = Object.entries(setCounts).sort((a, b) => b[1] - a[1])[0][0]
    return { cards: candidates, bestSetId, count: candidates.length }
  }, [sets])

  // ── Review Forecast (7 days, pure client-side) ─────────────────────────────
  const forecast = useMemo(() => {
    const allCards = sets.flatMap(s => s.flashcards || [])
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() + i)
      const next = new Date(day); next.setDate(next.getDate() + 1)
      const count = allCards.filter(c => {
        if (!c.nextReview) return false
        const r = new Date(c.nextReview)
        return r >= day && r < next
      }).length
      const label = i === 0 ? 'Today' : i === 1 ? 'Tmrw'
        : day.toLocaleDateString('en', { weekday: 'short' })
      return { label, count, isToday: i === 0 }
    })
  }, [sets])

  const weakCards = sets
    .flatMap(s => (s.flashcards || []).map(c => ({ ...c, setTitle: s.title, setId: s.id })))
    .filter(c => (c.memoryScore || 0) < 40 && c.repetitions > 0)
    .sort((a, b) => (a.memoryScore || 0) - (b.memoryScore || 0))
    .slice(0, 3)

  return (
    <Layout active="home">
      <div className="page screen">

        {/* ── Compact header ── */}
        <div style={{ marginBottom: 14 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.4px' }}>
            {t(greetKey())}{firstName ? `, ${firstName}` : ''} 👋
          </h1>
        </div>

        {/* ── Single stat bar: streak | level + XP | goal ring ── */}
        <div className="card" style={{ padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 20 }}>🔥</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: displayStreak > 0 ? 'var(--am)' : 'var(--t3)', lineHeight: 1 }}>{displayStreak}</div>
              <div style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 600 }}>streak</div>
            </div>
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--bd)' }} />
          {(() => {
            const { level, progress, required, pct } = getXPProgress(totalXP)
            return (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div style={{ background: 'linear-gradient(135deg,var(--ac),#a855f7)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                  Lv.{level}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ height: 5, borderRadius: 4, background: 'var(--s3)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,var(--ac),#a855f7)', borderRadius: 4, transition: 'width .5s ease' }} />
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>{progress}/{required} XP</div>
                </div>
              </div>
            )
          })()}
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--bd)' }} />
          <GoalRing count={goalCount} goal={DAILY_GOAL} streak={goalStreak} />
        </div>

        {/* ── Upload limit — only when at 0 ── */}
        {!isPro && uploadsLeft === 0 && (
          <div style={{ background: 'var(--rl)', border: '1px solid var(--rd)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rd)' }}>⚠️ {t('upload_limit_reached')}</div>
            <button className="btn btn-pro btn-sm" onClick={() => nav('/settings')}>{t('upgrade')}</button>
          </div>
        )}

        {/* ── Streak urgency banner ── */}
        {displayStreak > 0 && lastStudy !== today && <StreakUrgencyBanner streak={displayStreak} />}

        {/* ── Today's Focus hero card ── */}
        {dailyReview && (
          <div className="card" style={{ padding: '16px', marginBottom: 14, background: 'linear-gradient(135deg,var(--al),rgba(168,85,247,.07))', border: '1px solid var(--ac)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ac)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
              🎯 Today's Focus
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: weakCards.length ? 10 : 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--tx)', marginBottom: 2 }}>
                  {dailyReview.count} card{dailyReview.count !== 1 ? 's' : ''} waiting for review
                </div>
                <div style={{ fontSize: 11, color: 'var(--t2)' }}>Most overdue · lowest memory scores</div>
              </div>
              <button className="btn btn-p" style={{ flexShrink: 0 }} onClick={() => nav(`/study/${dailyReview.bestSetId}?mode=learn`)}>
                Start →
              </button>
            </div>
            {weakCards.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {weakCards.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                    <div style={{ width: 30, height: 18, borderRadius: 4, background: 'var(--rl)', color: 'var(--rd)', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {c.memoryScore || 0}%
                    </div>
                    <span style={{ color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.q}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Quest chips ── */}
        {(() => {
          const quests = [
            { icon: '🃏', label: 'Study 10 cards',    reward: '+25 XP', done: goalCount >= 10       },
            { icon: '🎯', label: 'Hit daily goal',     reward: '+50 XP', done: goalCount >= DAILY_GOAL },
            { icon: '🔥', label: 'Keep streak alive',  reward: '+30 XP', done: lastStudy === today   },
          ]
          return (
            <div style={{ display: 'flex', gap: 6, marginBottom: 18, overflowX: 'auto', paddingBottom: 2 }}>
              {quests.map((q, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 20, background: q.done ? 'var(--gl)' : 'var(--s2)', border: `1px solid ${q.done ? 'var(--gn)' : 'var(--bd)'}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <span style={{ fontSize: 14 }}>{q.done ? '✅' : q.icon}</span>
                  <div style={{ lineHeight: 1.2 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: q.done ? 'var(--gn)' : 'var(--tx)', textDecoration: q.done ? 'line-through' : 'none' }}>{q.label}</div>
                    <div style={{ fontSize: 9, color: q.done ? 'var(--gn)' : 'var(--t3)', fontWeight: 600 }}>{q.reward}</div>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* ── Your Study Sets ── */}
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
          const sCards = s.flashcards || []
          const sTotal = sCards.length
          const sMastered = sCards.filter(c => (c.memoryScore || 0) >= 70).length
          const sLearning = sCards.filter(c => (c.repetitions || 0) > 0 && (c.memoryScore || 0) < 70).length
          const masteredPct = sTotal ? (sMastered / sTotal) * 100 : 0
          const learningPct = sTotal ? (sLearning / sTotal) * 100 : 0
          return (
            <div key={s.id} className="card card-tap" style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}
              onClick={() => nav(`/study/${s.id}`)}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {s.icon || '📚'}
              </div>
              {(() => {
                const lvl = getSetLevel(s.progress || 0, s.best_test_grade || null)
                return (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{s.title}</div>
                      <span style={{ flexShrink: 0, background: lvl.bg, color: lvl.color, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>
                        {lvl.icon} {lvl.label}{lvl.locked ? ' 🔒' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{sTotal} {t('cards')} · {s.quiz?.length || 0} quiz</div>
                  </div>
                )
              })()}
              <div style={{ width: 64, flexShrink: 0 }}>
                <div style={{ height: 5, borderRadius: 4, background: 'var(--s3)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${masteredPct}%`, background: 'var(--gn)', animation: 'barGrow .8s ease', transformOrigin: 'left' }} />
                  <div style={{ width: `${learningPct}%`, background: 'var(--am)', animation: 'barGrow .8s ease .1s both', transformOrigin: 'left' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--t3)', textAlign: 'right', marginTop: 3 }}>{sMastered}/{sTotal}</div>
              </div>
              <button className="btn btn-g btn-sm" style={{ flexShrink: 0, fontSize: 15 }}
                onClick={e => { e.stopPropagation(); if (window.confirm(t('delete_confirm'))) deleteSet(s.id) }}>
                🗑
              </button>
            </div>
          )
        })}

        {/* ── Review Forecast ── */}
        {sets.length > 0 && forecast.some(d => d.count > 0) && (
          <div style={{ marginBottom: 18 }}>
            <div className="sechd">📅 Review Forecast</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
              {forecast.map((d, i) => {
                const maxCount = Math.max(...forecast.map(x => x.count), 1)
                const intensity = d.count / maxCount
                const hasCards = d.count > 0
                return (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: d.isToday ? 'var(--ac)' : 'var(--t3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.3px' }}>
                      {d.label}
                    </div>
                    <div style={{ height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hasCards ? 'var(--al)' : 'var(--s2)', opacity: hasCards ? 0.4 + intensity * 0.6 : 1, border: `1.5px solid ${d.isToday ? 'var(--ac)' : hasCards ? 'rgba(99,102,241,.3)' : 'var(--bd)'}` }}>
                      <span style={{ fontSize: hasCards ? 13 : 11, fontWeight: 900, color: hasCards ? 'var(--ac)' : 'var(--t3)', lineHeight: 1 }}>
                        {hasCards ? d.count : '·'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Leaderboard (top 3 collapsed) ── */}
        <LeaderboardWidget currentUserId={user?.id} limit={3} />

        {/* ── Activity Graph ── */}
        <ActivityGraph />

      </div>
    </Layout>
  )
}
