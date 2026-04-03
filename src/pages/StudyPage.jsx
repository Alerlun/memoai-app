import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSets } from '../hooks/useSets'
import { useLang } from '../hooks/useLang'
import FlashcardsView from './study/FlashcardsView'
import LearnView from './study/LearnView'
import QuizView from './study/QuizView'
import PracticeTestView from './study/PracticeTestView'
import MagicNotesView from './study/MagicNotesView'
const MODES = [
  { id:'cards', icon:'🃏', label:'Flashcards' },
  { id:'learn', icon:'🧠', label:'Learn' },
  { id:'quiz',  icon:'🎯', label:'Quiz' },
  { id:'test',  icon:'📝', label:'Test' },
  { id:'notes', icon:'✨', label:'Notes' },
]

export default function StudyPage() {
  const { id } = useParams()
  const { sets, updateProgress, updateSet } = useSets()
  const { t } = useLang()
  const nav = useNavigate()
  const [mode, setMode] = useState('cards')

  const set = sets.find(s => s.id === id)

  if (!set) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <div style={{ fontSize:40 }}>📚</div>
      <p style={{ color:'var(--t2)' }}>{t('set_not_found')}</p>
      <button className="btn btn-p" onClick={() => nav('/')}>{t('go_home')}</button>
    </div>
  )

  const cards = set.flashcards || []
  const avgMemory = cards.length ? Math.round(cards.reduce((a,c) => a+(c.memoryScore||0),0)/cards.length) : 0

  function updateStreak() {
    const today = new Date().toDateString()
    const lastStudy = localStorage.getItem('memoai_last_study') || ''
    if (lastStudy === today) return
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    const current = parseInt(localStorage.getItem('memoai_streak') || '0')
    const next = lastStudy === yesterday.toDateString() ? current + 1 : 1
    localStorage.setItem('memoai_streak', String(next))
    localStorage.setItem('memoai_last_study', today)
  }

  function handleUpdateCards(updatedCards) {
    const newProgress = updatedCards.length
      ? Math.round(updatedCards.reduce((a, c) => a + (c.memoryScore || 0), 0) / updatedCards.length)
      : 0
    updateProgress(set.id, newProgress, updatedCards)
    updateStreak()
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <div className="nb">
        <button className="btn btn-g btn-sm" onClick={() => nav('/')}>← {t('home')}</button>
        <div style={{ flex:1, minWidth:0, textAlign:'center', padding:'0 8px' }}>
          <div style={{ fontSize:13, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{set.title}</div>
          <div style={{ fontSize:11, color:'var(--t3)' }}>{cards.length} {t('cards')}</div>
        </div>
        <div style={{ background: avgMemory>=70?'var(--gl)':avgMemory>=40?'var(--aml)':'var(--al)', borderRadius:20, padding:'4px 11px', fontSize:11, fontWeight:700, color: avgMemory>=70?'var(--gn)':avgMemory>=40?'var(--am)':'var(--ac)', flexShrink:0 }}>
          🧠 {avgMemory}%
        </div>
      </div>

      <div style={{ background:'var(--sf)', borderBottom:'1px solid var(--bd)', overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
        <div style={{ display:'flex', padding:'0 6px', minWidth:'max-content' }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`mode-tab${mode===m.id?' on':''}`}>
              <span className="icon">{m.icon}</span>
              <span className="lbl">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, padding:'16px 20px', maxWidth:640, margin:'0 auto', width:'100%', paddingBottom:40 }}>
        {mode==='cards' && <FlashcardsView set={set} onUpdateCards={handleUpdateCards} />}
        {mode==='learn' && <LearnView set={set} onUpdateCards={handleUpdateCards} />}
        {mode==='quiz'  && <QuizView set={set} onUpdateCards={handleUpdateCards} />}
        {mode==='test'  && <PracticeTestView set={set} onSaveTest={qs => updateSet(set.id, { practice_test: qs })} />}
        {mode==='notes' && <MagicNotesView set={set} onSaveNotes={notes => updateSet(set.id, { magic_notes: notes })} />}
      </div>
    </div>
  )
}
