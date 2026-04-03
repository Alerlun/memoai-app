import { useState, useEffect } from 'react'
import { sm2 } from '../../lib/smartQuiz'
import { explainCard } from '../../lib/ai'
import { useLang } from '../../hooks/useLang'

export default function LearnView({ set, onUpdateCards }) {
  const { t, lang } = useLang()
  const cards = set.flashcards || []

  // Cards due for review today (or new cards)
  const [queue, setQueue] = useState(() => {
    const today = new Date()
    return cards
      .filter(c => !c.nextReview || new Date(c.nextReview) <= today)
      .sort(() => Math.random() - 0.5)
  })
  const [current, setCurrent] = useState(0)
  const [phase, setPhase] = useState('question') // question | answer | done
  const [sessionStats, setSessionStats] = useState({ correct: 0, hard: 0, again: 0 })
  const [showHint, setShowHint] = useState(false)
  const [explanation, setExplanation] = useState(null)
  const [loadingExplain, setLoadingExplain] = useState(false)

  const card = queue[current]
  const progress = cards.length > 0 ? Math.round(
    cards.filter(c => c.memoryScore > 60).length / cards.length * 100
  ) : 0

  function rate(quality) {
    // quality: 5=easy, 4=good, 3=hard, 1=again
    const updated = sm2(card, quality)
    const updatedCard = { ...card, ...updated }

    // Update the card in the full set
    const updatedCards = cards.map(c => c.id === card.id ? updatedCard : c)
    onUpdateCards(updatedCards)

    // Track session stats
    setSessionStats(s => ({
      correct: s.correct + (quality >= 4 ? 1 : 0),
      hard: s.hard + (quality === 3 ? 1 : 0),
      again: s.again + (quality <= 2 ? 1 : 0),
    }))

    // Move to next
    if (current + 1 >= queue.length) {
      setPhase('done')
    } else {
      setCurrent(i => i + 1)
      setPhase('question')
      setShowHint(false)
      setExplanation(null)
      setLoadingExplain(false)
    }
  }

  async function askExpert() {
    if (!card) return
    setLoadingExplain(true)
    setExplanation(null)
    try {
      const sourceText = set.source_text || ''
      const result = await explainCard(card.q, card.a, sourceText, lang)
      setExplanation(result)
    } catch {
      setExplanation('Could not load explanation. Please try again.')
    } finally {
      setLoadingExplain(false)
    }
  }

  if (queue.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 16px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>All caught up!</div>
      <div style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 20 }}>
        No cards due for review right now. Come back later for your next session.
      </div>
      <MemoryScoreBar cards={cards} />
    </div>
  )

  if (phase === 'done') return (
    <div style={{ textAlign: 'center', padding: '28px 16px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>
        {sessionStats.correct / queue.length >= 0.8 ? '🎉' : sessionStats.correct / queue.length >= 0.5 ? '👍' : '💪'}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Session complete!</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
        <StatPill color="var(--gn)" label="Easy" val={sessionStats.correct} />
        <StatPill color="var(--am)" label="Hard" val={sessionStats.hard} />
        <StatPill color="var(--rd)" label="Again" val={sessionStats.again} />
      </div>
      <MemoryScoreBar cards={cards} />
      <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button className="btn btn-p" onClick={() => { setCurrent(0); setPhase('question'); setShowHint(false); setSessionStats({ correct:0, hard:0, again:0 }) }}>
          🔄 Study Again
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {/* Progress */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--t2)', marginBottom: 6 }}>
          <span>{current + 1} / {queue.length} cards</span>
          <span>Memory: {progress}%</span>
        </div>
        <div className="prog"><div className="prog-fill" style={{ width: `${(current / queue.length) * 100}%` }} /></div>
      </div>

      {/* Card */}
      <div className="card" style={{ padding: 28, minHeight: 180, marginBottom: 16, textAlign: 'center', position: 'relative' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 14 }}>
          {phase === 'question' ? 'QUESTION' : 'ANSWER'}
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.55, marginBottom: phase === 'answer' ? 20 : 0 }}>
          {phase === 'question' ? card?.q : card?.a}
        </div>

        {/* Hint — first words of answer */}
        {phase === 'question' && showHint && (
          <div style={{ marginTop: 12, padding: '8px 14px', background: 'var(--aml)', borderRadius: 'var(--rs)', fontSize: 12, color: 'var(--am)', fontStyle: 'italic' }}>
            Hint: {card?.a?.split(' ').slice(0, 5).join(' ')}…
          </div>
        )}
      </div>

      {phase === 'question' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-p btn-w btn-lg" onClick={() => setPhase('answer')}>
            Show Answer
          </button>
          {!showHint && (
            <button className="btn btn-s btn-w" onClick={() => setShowHint(true)} style={{ fontSize: 13 }}>
              💡 Show Hint
            </button>
          )}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', textAlign: 'center', marginBottom: 10 }}>
            How well did you know this?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => rate(1)} style={{ padding: '14px 8px', borderRadius: 'var(--r)', border: '2px solid var(--rd)', background: 'var(--rl)', color: 'var(--rd)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
              😕 Again<br/><span style={{ fontSize: 11, fontWeight: 500 }}>Didn't know it</span>
            </button>
            <button onClick={() => rate(3)} style={{ padding: '14px 8px', borderRadius: 'var(--r)', border: '2px solid var(--am)', background: 'var(--aml)', color: 'var(--am)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
              🤔 Hard<br/><span style={{ fontSize: 11, fontWeight: 500 }}>Got it with effort</span>
            </button>
            <button onClick={() => rate(4)} style={{ padding: '14px 8px', borderRadius: 'var(--r)', border: '2px solid var(--gn)', background: 'var(--gl)', color: 'var(--gn)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
              😊 Good<br/><span style={{ fontSize: 11, fontWeight: 500 }}>Knew it well</span>
            </button>
            <button onClick={() => rate(5)} style={{ padding: '14px 8px', borderRadius: 'var(--r)', border: '2px solid var(--ac)', background: 'var(--al)', color: 'var(--ac)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
              🚀 Easy<br/><span style={{ fontSize: 11, fontWeight: 500 }}>Perfect recall</span>
            </button>
          </div>
          {/* Expert Solutions — shown after rating Again */}
          {phase === 'answer' && (
            <div style={{ marginTop: 14 }}>
              {!explanation && !loadingExplain && (
                <button
                  onClick={askExpert}
                  style={{ width: '100%', padding: '11px', borderRadius: 'var(--r)', border: '1.5px solid var(--ac)', background: 'var(--al)', color: 'var(--ac)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}
                >
                  💡 Expert Explanation
                </button>
              )}
              {loadingExplain && (
                <div style={{ textAlign: 'center', padding: '12px', fontSize: 13, color: 'var(--t2)' }}>
                  <span style={{ animation: 'pulse 1s infinite' }}>✨</span> Generating explanation…
                </div>
              )}
              {explanation && (
                <div style={{ padding: '14px 16px', borderRadius: 'var(--r)', background: 'linear-gradient(135deg,var(--al),#f0f4ff)', border: '1.5px solid var(--ac)', fontSize: 13, lineHeight: 1.65, color: 'var(--tx)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ac)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>💡 Expert Explanation</div>
                  {explanation}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatPill({ color, label, val }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 900, color }}>{val}</div>
      <div style={{ fontSize: 11, color: 'var(--t2)' }}>{label}</div>
    </div>
  )
}

function MemoryScoreBar({ cards }) {
  const avg = cards.length ? Math.round(cards.reduce((a, c) => a + (c.memoryScore || 0), 0) / cards.length) : 0
  const color = avg >= 70 ? 'var(--gn)' : avg >= 40 ? 'var(--am)' : 'var(--rd)'
  return (
    <div className="card" style={{ padding: '14px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>🧠 Memory Score</span>
        <span style={{ fontSize: 13, fontWeight: 900, color }}>{avg}%</span>
      </div>
      <div className="prog">
        <div className="prog-fill" style={{ width: `${avg}%`, background: color }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>
        {cards.filter(c => c.memoryScore >= 70).length} of {cards.length} cards mastered
      </div>
    </div>
  )
}
