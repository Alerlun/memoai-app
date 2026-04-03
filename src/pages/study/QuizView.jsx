import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../../hooks/useLang'

const LABELS = ['A','B','C','D']
const DIFF_COLOR = { easy: 'var(--gn)', medium: 'var(--am)', hard: 'var(--rd)' }

export default function QuizView({ set, onUpdateCards }) {
  const { t } = useLang()
  const nav = useNavigate()
  const quiz = set.quiz || []
  const [qi, setQi] = useState(0)
  const [qscore, setQscore] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [quizDone, setQuizDone] = useState(false)
  const [selected, setSelected] = useState(null)

  const q = quiz[qi]
  const pct = quiz.length ? Math.round(qscore / quiz.length * 100) : 0

  function answer(idx) {
    if (answered) return
    setAnswered(true); setSelected(idx)
    if (idx === q.correct) setQscore(s => s + 1)
  }

  function next() {
    if (qi + 1 >= quiz.length) {
      const finalScore = qscore + (selected === q.correct ? 0 : 0) // already counted in answer()
      finishQuiz()
      return
    }
    setQi(i => i + 1); setAnswered(false); setSelected(null)
  }

  function finishQuiz() {
    setQuizDone(true)
    if (onUpdateCards && set.flashcards?.length) {
      // 100% quiz → all cards go to 100 (unlocks 100% progress)
      // anything less → cards capped at 95 so 100% is only reachable by perfect quiz
      const updatedCards = set.flashcards.map(card => ({
        ...card,
        memoryScore: pct === 100
          ? 100
          : Math.min(95, Math.max(card.memoryScore || 0, Math.round(pct * 0.9))),
      }))
      onUpdateCards(updatedCards)
    }
  }

  function retry() { setQi(0); setQscore(0); setAnswered(false); setSelected(null); setQuizDone(false) }

  if (!quiz.length) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--t2)' }}>{t('no_quiz')}</div>
  )

  if (quizDone) return (
    <div style={{ textAlign: 'center', padding: '28px 16px' }}>
      <div style={{ width: 96, height: 96, borderRadius: '50%', background: pct === 100 ? 'var(--gl)' : 'var(--al)', border: `4px solid ${pct === 100 ? 'var(--gn)' : 'var(--ac)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: pct === 100 ? 'var(--gn)' : 'var(--ac)', lineHeight: 1 }}>{pct}%</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: pct === 100 ? 'var(--gn)' : 'var(--ac)' }}>{t('score')}</div>
      </div>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>
        {pct === 100 ? '🏆 Perfect Score!' : pct >= 80 ? t('outstanding') : pct >= 60 ? t('good_work') : t('keep_going')}
      </h2>
      <p style={{ color: 'var(--t2)', fontSize: 14, marginBottom: pct === 100 ? 6 : 20 }}>
        {t('you_scored')} {qscore} {t('out_of')} {quiz.length}.
      </p>
      {pct === 100 && (
        <p style={{ color: 'var(--gn)', fontSize: 13, fontWeight: 700, marginBottom: 20 }}>
          ✓ Study set marked 100% complete!
        </p>
      )}
      {pct < 100 && (
        <p style={{ color: 'var(--t3)', fontSize: 12, marginBottom: 20 }}>
          Get all questions correct to reach 100%.
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button className="btn btn-s" style={{ flex: 1 }} onClick={() => nav('/')}>🏠 {t('home')}</button>
        <button className="btn btn-p" style={{ flex: 1 }} onClick={retry}>{t('retry')}</button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--t2)' }}>{t('question_of')} {qi + 1} {t('of')} {quiz.length}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ac)' }}>{t('score')}: {qscore}</span>
        {q?.difficulty && (
          <span style={{ fontSize: 10, fontWeight: 700, color: DIFF_COLOR[q.difficulty] || 'var(--t3)', background: 'var(--s2)', padding: '2px 8px', borderRadius: 10 }}>
            {q.difficulty}
          </span>
        )}
      </div>

      <div className="prog" style={{ marginBottom: 14 }}>
        <div className="prog-fill" style={{ width: `${qi / quiz.length * 100}%` }} />
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.55 }}>{q?.q}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {q?.options.map((opt, i) => {
          const isCorrect = i === q.correct; const isSelected = i === selected
          let bg = 'var(--sf)', border = 'var(--bd)', col = 'var(--tx)'
          if (answered) {
            if (isCorrect) { bg='var(--gl)'; border='var(--gn)'; col='#166534' }
            else if (isSelected) { bg='var(--rl)'; border='var(--rd)'; col='#991b1b' }
          }
          return (
            <button key={i} className={`qopt${answered?' dis':''}`}
              style={{ background:bg, borderColor:border }}
              onClick={() => answer(i)}>
              <div style={{ width:26, height:26, borderRadius:'50%', background: answered&&isCorrect?'var(--gn)':answered&&isSelected?'var(--rd)':isSelected?'var(--ac)':'var(--s2)', color:(answered&&(isCorrect||isSelected))||isSelected?'#fff':'var(--t2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0 }}>
                {LABELS[i]}
              </div>
              <span style={{ flex:1, fontSize:13, lineHeight:1.4, color:col }}>{opt}</span>
            </button>
          )
        })}
      </div>

      {answered && (
        <div style={{ padding:'13px 15px', borderRadius:'var(--rs)', marginBottom:12, fontSize:13, lineHeight:1.5, background:selected===q.correct?'var(--gl)':'var(--rl)', borderLeft:`4px solid ${selected===q.correct?'var(--gn)':'var(--rd)'}`, color:selected===q.correct?'#166534':'#991b1b' }}>
          <strong>{selected===q.correct?t('correct'):t('not_quite')}</strong> {q?.explanation}
        </div>
      )}
      {answered && (
        <button className="btn btn-p btn-w" onClick={next}>
          {qi+1>=quiz.length ? t('see_results') : t('next')}
        </button>
      )}
    </div>
  )
}
