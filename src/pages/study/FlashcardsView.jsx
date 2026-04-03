import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../../hooks/useLang'

export default function FlashcardsView({ set, onUpdateCards }) {
  const nav = useNavigate()
  const { t } = useLang()
  const cards = set.flashcards || []
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [marks, setMarks] = useState({})
  const [done, setDone] = useState(false)

  const card = cards[idx]
  const isLast = idx === cards.length - 1
  const gotCount = Object.values(marks).filter(v => v === 'got').length
  const againCount = Object.values(marks).filter(v => v === 'again').length

  function mark(r) {
    setMarks(m => ({ ...m, [idx]: r }))
    if (!isLast) { setIdx(i => i + 1); setFlipped(false) }
  }

  function complete() {
    const finalMarks = { ...marks, [idx]: 'got' }
    setMarks(finalMarks)

    if (onUpdateCards) {
      const updatedCards = cards.map((c, i) => {
        const m = finalMarks[i]
        if (m === 'got')   return { ...c, memoryScore: Math.max(c.memoryScore || 0, 75), repetitions: (c.repetitions || 0) + 1 }
        if (m === 'again') return { ...c, memoryScore: Math.min(c.memoryScore || 0, 20) }
        return c
      })
      onUpdateCards(updatedCards)
    }
    setDone(true)
  }

  if (!cards.length) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--t2)' }}>No flashcards available.</div>
  )

  if (done) {
    const total = cards.length
    const pct = Math.round(gotCount / total * 100)
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
          {pct >= 80 ? t('outstanding') : pct >= 50 ? t('good_work') : t('keep_going')}
        </div>
        <div style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 24 }}>
          {t('you_scored')} {gotCount} / {total}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ background: 'var(--gl)', border: '1px solid var(--gn)', borderRadius: 'var(--r)', padding: '12px 20px', minWidth: 90 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--gn)' }}>{gotCount}</div>
            <div style={{ fontSize: 11, color: 'var(--gn)', fontWeight: 600 }}>{t('got_it')}</div>
          </div>
          <div style={{ background: 'var(--rl)', border: '1px solid var(--rd)', borderRadius: 'var(--r)', padding: '12px 20px', minWidth: 90 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--rd)' }}>{againCount}</div>
            <div style={{ fontSize: 11, color: 'var(--rd)', fontWeight: 600 }}>{t('again')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="btn btn-s btn-lg" onClick={() => nav('/')}>🏠 {t('home')}</button>
          <button className="btn btn-p btn-lg" onClick={() => { setIdx(0); setFlipped(false); setMarks({}); setDone(false) }}>{t('retry')}</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8, gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gn)' }}>✓ {gotCount}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rd)' }}>↩ {againCount}</span>
      </div>

      <div className="prog" style={{ marginBottom: 18 }}>
        <div className="prog-fill" style={{ width: `${(idx + 1) / cards.length * 100}%` }} />
      </div>

      <div className="fc-scene" onClick={() => setFlipped(f => !f)} style={{ marginBottom: 12 }}>
        <div className={`fc-card${flipped ? ' flipped' : ''}`}>
          <div className="fc-face fc-front">
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', opacity: .4, marginBottom: 12 }}>{t('question')}</div>
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.55 }}>{card?.q}</div>
          </div>
          <div className="fc-face fc-back">
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', opacity: .5, marginBottom: 12 }}>{t('answer')}</div>
            <div style={{ fontSize: 14, lineHeight: 1.7 }}>{card?.a}</div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {t('tap_to_reveal')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        <button onClick={() => mark('skip')}
          style={{ padding: '13px 4px', borderRadius: 'var(--rs)', fontSize: 13, fontWeight: 700, border: '1.5px solid var(--bd)', cursor: 'pointer', fontFamily: 'inherit', background: 'var(--sf)', color: 'var(--t2)' }}>
          {t('skip')}
        </button>
        <button onClick={() => mark('again')}
          style={{ padding: '13px 4px', borderRadius: 'var(--rs)', fontSize: 13, fontWeight: 700, border: '1.5px solid var(--rd)', cursor: 'pointer', fontFamily: 'inherit', background: 'var(--rl)', color: 'var(--rd)' }}>
          {t('again')}
        </button>
        {isLast ? (
          <button onClick={complete}
            style={{ padding: '13px 4px', borderRadius: 'var(--rs)', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: 'var(--ac)', color: '#fff' }}>
            ✓ Done
          </button>
        ) : (
          <button onClick={() => mark('got')}
            style={{ padding: '13px 4px', borderRadius: 'var(--rs)', fontSize: 13, fontWeight: 700, border: '1.5px solid var(--gn)', cursor: 'pointer', fontFamily: 'inherit', background: 'var(--gl)', color: 'var(--gn)' }}>
            {t('got_it')}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <button disabled={idx === 0} onClick={() => { setIdx(i => i - 1); setFlipped(false) }}
          style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid var(--bd2)', background: 'var(--sf)', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: 18, opacity: idx === 0 ? .28 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
        <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600 }}>{idx + 1} / {cards.length}</span>
        <button disabled={isLast} onClick={() => { setIdx(i => i + 1); setFlipped(false) }}
          style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid var(--bd2)', background: 'var(--sf)', cursor: isLast ? 'not-allowed' : 'pointer', fontSize: 18, opacity: isLast ? .28 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
      </div>
    </div>
  )
}
