import { useState } from 'react'
import { generatePracticeTest, gradeShortAnswers } from '../../lib/ai'
import { getGrade, XP_VALUES } from '../../lib/xp'

const SA_GRADE_META = {
  A: { color: '#4ade80', bg: 'rgba(74,222,128,.15)', border: 'rgba(74,222,128,.35)' },
  B: { color: '#60a5fa', bg: 'rgba(96,165,250,.15)', border: 'rgba(96,165,250,.35)' },
  C: { color: '#fbbf24', bg: 'rgba(251,191,36,.15)', border: 'rgba(251,191,36,.35)' },
  D: { color: '#f97316', bg: 'rgba(249,115,22,.15)', border: 'rgba(249,115,22,.35)' },
  F: { color: '#f87171', bg: 'rgba(248,113,113,.15)', border: 'rgba(248,113,113,.35)' },
}

function saPoints(score) {
  if (score === 2) return 1
  if (score === 1) return 0.5
  return 0
}

export default function PracticeTestView({ set, onSaveTest, onTestGraded }) {
  const [questions, setQuestions] = useState(set.practice_test || null)
  const [loading, setLoading]     = useState(false)
  const [grading, setGrading]     = useState(false)
  const [error, setError]         = useState('')
  const [answers, setAnswers]     = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore]         = useState(null)
  const [saResults, setSaResults] = useState({})  // question index → {grade,score,feedback,improve}

  async function generate() {
    setLoading(true); setError('')
    try {
      const sourceText = set.source_text || set.flashcards.map(f => `${f.q} ${f.a}`).join(' ')
      const qs = await generatePracticeTest(sourceText)
      setQuestions(qs)
      onSaveTest?.(qs)
      setAnswers({})
      setSubmitted(false)
      setScore(null)
      setSaResults({})
    } catch {
      setError('Could not generate test. Try again.')
    } finally { setLoading(false) }
  }

  async function newTest() {
    setQuestions(null)
    onSaveTest?.(null)
    await generate()
  }

  async function submit() {
    setGrading(true)
    try {
      // Collect short-answer questions
      const saQueue = []
      questions.forEach((q, i) => {
        if (q.type === 'short_answer') {
          saQueue.push({ idx: i, q: q.q, sampleAnswer: q.sampleAnswer, keyPoints: q.keyPoints, userAnswer: answers[i] || '' })
        }
      })

      // Grade short answers with AI
      let saGraded = []
      try {
        saGraded = await gradeShortAnswers(saQueue)
      } catch {
        saGraded = saQueue.map(() => ({ grade: 'F', score: 0, feedback: 'Could not grade automatically.', improve: '' }))
      }

      // Build result map and tally points
      const resultMap = {}
      let points = 0
      questions.forEach((q, i) => {
        if (q.type === 'multiple_choice' || q.type === 'true_false') {
          if (answers[i] === q.correct) points++
        }
      })
      saQueue.forEach((q, j) => {
        const res = saGraded[j] || { grade: 'F', score: 0, feedback: '', improve: '' }
        resultMap[q.idx] = res
        points += saPoints(res.score)
      })

      const total = questions.length
      const pct   = Math.round(points / total * 100)
      const grade = getGrade(pct)
      const xp    = XP_VALUES[`PRACTICE_TEST_${grade.letter}`] ?? 10

      setSaResults(resultMap)
      setScore({ points, total, pct, grade, xp })
      setSubmitted(true)
      onTestGraded?.(grade.letter, xp, pct)
    } finally {
      setGrading(false)
    }
  }

  const LABELS = ['A', 'B', 'C', 'D']

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 36, marginBottom: 12, animation: 'pulse 1s infinite' }}>📝</div>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Generating Practice Test…</div>
      <div style={{ fontSize: 13, color: 'var(--t2)' }}>Saved automatically — won't cost credits again</div>
    </div>
  )

  if (!questions) return (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Practice Test</div>
      <div style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 6, lineHeight: 1.6 }}>
        10 exam-style questions mixing multiple choice, true/false, and short answer. Generated once and saved.
      </div>
      <div style={{ fontSize: 13, color: 'var(--ac)', fontWeight: 700, marginBottom: 16, padding: '10px 14px', background: 'var(--al)', borderRadius: 'var(--rs)', border: '1px solid rgba(139,127,245,.3)' }}>
        🏆 Score an <strong>A (90%+)</strong> to unlock <strong>Master</strong> status for this set
      </div>
      {error && <div className="err-box" style={{ marginBottom: 16 }}>{error}</div>}
      <button className="btn btn-p btn-lg" onClick={generate}>📝 Generate Practice Test</button>
    </div>
  )

  const answeredCount = submitted ? questions.length : questions.filter((q, i) => q.type === 'short_answer' ? (answers[i] || '').trim().length > 0 : answers[i] !== undefined).length
  const progressPct   = Math.round(answeredCount / questions.length * 100)

  return (
    <div>
      {/* Progress bar */}
      {!submitted && (
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', paddingBottom: 10, marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 5 }}>
            <span>{answeredCount < questions.length ? `Question ${answeredCount + 1} of ${questions.length}` : 'All answered — ready to submit!'}</span>
            <span>{progressPct}%</span>
          </div>
          <div style={{ height: 4, background: 'var(--s3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg,var(--ac),#a855f7)', borderRadius: 4, transition: 'width .3s ease' }} />
          </div>
        </div>
      )}

      {/* Score card */}
      {submitted && score && (
        <div style={{ background: score.grade.bg, border: `2px solid ${score.grade.color}`, borderRadius: 'var(--r)', padding: '20px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: score.grade.color, lineHeight: 1, marginBottom: 4, animation: 'gradeBounce .55s cubic-bezier(.34,1.56,.64,1) forwards' }}>
            {score.grade.letter}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: score.grade.color, marginBottom: 4 }}>
            {score.pct}%
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 2 }}>
            {score.points}/{score.total} points
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>
            (short answers may earn partial credit)
          </div>
          <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 12, lineHeight: 1.5 }}>
            {score.grade.label}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,.12)', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 800, color: score.grade.color }}>
            ⚡ +{score.xp} XP earned
          </div>
          {score.grade.letter === 'A' && (
            <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: '#4ade80', padding: '8px 12px', background: 'rgba(74,222,128,.15)', borderRadius: 'var(--rs)', border: '1px solid rgba(74,222,128,.35)' }}>
              🏆 Master status unlocked for this set!
            </div>
          )}
          {score.grade.letter !== 'A' && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--t3)', padding: '8px 12px', background: 'var(--s2)', borderRadius: 'var(--rs)' }}>
              Score <strong style={{ color: '#4ade80' }}>A (90%+)</strong> to unlock Master status
            </div>
          )}
        </div>
      )}

      {/* Grade scale legend */}
      {!submitted && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, justifyContent: 'center' }}>
          {[['A','90%+','#4ade80'],['B','80%','#60a5fa'],['C','70%','#fbbf24'],['D','60%','#f97316'],['F','<60%','#f87171']].map(([g, t, c]) => (
            <div key={g} style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 'var(--rs)', background: `${c}18`, border: `1px solid ${c}44` }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: c }}>{g}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>{t}</div>
            </div>
          ))}
        </div>
      )}

      {questions.map((q, i) => (
        <div key={i} className="card" style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--ac)', color: '#fff', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>
                {q.type === 'multiple_choice' ? 'Multiple Choice' : q.type === 'true_false' ? 'True / False' : 'Short Answer'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>{q.q}</div>
            </div>
          </div>

          {q.type === 'multiple_choice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {q.options.map((opt, j) => {
                const isSelected = answers[i] === j
                const isCorrect  = j === q.correct
                let bg = 'var(--s2)', border = 'var(--bd2)', color = 'var(--tx)'
                if (submitted) {
                  if (isCorrect) { bg = 'var(--gl)'; border = 'var(--gn)'; color = 'var(--gn)' }
                  else if (isSelected && !isCorrect) { bg = 'var(--rl)'; border = 'var(--rd)'; color = 'var(--rd)' }
                } else if (isSelected) { bg = 'var(--al)'; border = 'var(--ac)'; color = 'var(--ac)' }
                return (
                  <button key={j} onClick={() => !submitted && setAnswers(a => ({ ...a, [i]: j }))}
                    style={{ background: bg, border: `2px solid ${border}`, borderRadius: 'var(--rs)', padding: '10px 14px', cursor: submitted ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: submitted && isCorrect ? 'var(--gn)' : submitted && isSelected ? 'var(--rd)' : isSelected ? 'var(--ac)' : 'var(--s3)', color: (submitted && (isCorrect || isSelected)) || isSelected ? '#fff' : 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{LABELS[j]}</div>
                    <span style={{ fontSize: 13, color }}>{opt}</span>
                  </button>
                )
              })}
            </div>
          )}

          {q.type === 'true_false' && (
            <div style={{ display: 'flex', gap: 8 }}>
              {[true, false].map(val => {
                const isSelected = answers[i] === val
                const isCorrect  = val === q.correct
                let bg, border, color
                if (submitted) {
                  if (isCorrect) { bg = 'var(--gl)'; border = 'var(--gn)'; color = 'var(--gn)' }
                  else if (isSelected && !isCorrect) { bg = 'var(--rl)'; border = 'var(--rd)'; color = 'var(--rd)' }
                  else { bg = 'var(--s2)'; border = 'var(--bd)'; color = 'var(--t3)' }
                } else if (isSelected) {
                  bg = val ? 'var(--gl)' : 'var(--rl)'
                  border = val ? 'var(--gn)' : 'var(--rd)'
                  color = val ? 'var(--gn)' : 'var(--rd)'
                } else {
                  bg = val ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.12)'
                  border = val ? 'rgba(74,222,128,.35)' : 'rgba(248,113,113,.35)'
                  color = val ? 'var(--gn)' : 'var(--rd)'
                }
                return (
                  <button key={String(val)} onClick={() => !submitted && setAnswers(a => ({ ...a, [i]: val }))}
                    style={{ flex: 1, padding: '12px', borderRadius: 'var(--r)', border: `2px solid ${border}`, background: bg, color, fontWeight: 700, cursor: submitted ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 14, transition: 'all .15s' }}>
                    {val ? '✓ True' : '✗ False'}
                  </button>
                )
              })}
            </div>
          )}

          {q.type === 'short_answer' && (() => {
            const res  = saResults[i]
            const meta = res ? (SA_GRADE_META[res.grade] || SA_GRADE_META.F) : null
            return (
              <div>
                <textarea className="inp" style={{ minHeight: 80, marginBottom: 8 }}
                  placeholder="Write your answer here…"
                  value={answers[i] || ''}
                  onChange={e => !submitted && setAnswers(a => ({ ...a, [i]: e.target.value }))}
                  disabled={submitted} />

                {submitted && res && (
                  <div style={{ borderRadius: 'var(--rs)', overflow: 'hidden', border: `2px solid ${meta.border}` }}>
                    {/* Grade banner */}
                    <div style={{ background: meta.bg, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: meta.color, lineHeight: 1, minWidth: 28 }}>{res.grade}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: meta.color, marginBottom: 2 }}>AI Feedback</div>
                        <div style={{ fontSize: 13, color: 'var(--tx)', lineHeight: 1.5 }}>{res.feedback}</div>
                      </div>
                    </div>

                    {/* How to improve */}
                    {res.improve && res.grade !== 'A' && (
                      <div style={{ background: 'var(--s2)', padding: '10px 14px', borderTop: `1px solid ${meta.border}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ac)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>How to score higher</div>
                        <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 }}>{res.improve}</div>
                      </div>
                    )}

                    {/* Sample answer */}
                    <div style={{ background: 'var(--al)', padding: '10px 14px', borderTop: `1px solid ${meta.border}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ac)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Model Answer</div>
                      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: q.keyPoints?.length ? 8 : 0 }}>{q.sampleAnswer}</div>
                      {q.keyPoints?.map((pt, k) => (
                        <div key={k} style={{ fontSize: 12, color: 'var(--t2)', display: 'flex', gap: 6, marginBottom: 3 }}>
                          <span>•</span><span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {submitted && q.explanation && q.type !== 'short_answer' && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--s2)', borderRadius: 'var(--rs)', fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>
              💡 {q.explanation}
            </div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {!submitted ? (
          grading ? (
            <div style={{ width: '100%', padding: '14px', background: 'var(--al)', borderRadius: 'var(--r)', textAlign: 'center', border: '2px solid var(--ac)' }}>
              <div style={{ fontSize: 20, marginBottom: 6, animation: 'pulse 1s infinite' }}>🤖</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ac)', marginBottom: 2 }}>AI is grading your short answers…</div>
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>Reading your responses and computing your score</div>
            </div>
          ) : (
            <button className="btn btn-p btn-w btn-lg"
              disabled={questions.some((q, i) => q.type !== 'short_answer' && answers[i] === undefined)}
              onClick={submit}>
              Submit Test
            </button>
          )
        ) : (
          <button className="btn btn-s btn-w" onClick={newTest}>📝 New Test</button>
        )}
      </div>
    </div>
  )
}
