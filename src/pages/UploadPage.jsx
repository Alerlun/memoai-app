import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSets } from '../hooks/useSets'
import { useLang } from '../hooks/useLang'
import { generateFlashcards as aiFlashcards, generateQuiz as aiQuiz, generateTitle as aiTitle } from '../lib/ai'
import { generateFlashcards as sqFlashcards, generateQuiz as sqQuiz, generateTitle as sqTitle, generatePlan } from '../lib/smartQuiz'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

const ICONS = ['📝','🎓','💡','🔬','📖','🌍','⚡','🧩','🏛️','🔭']
const COLORS = [['#edeafd','#5b4fe9'],['#dcfce7','#16a34a'],['#fef3c7','#d97706'],['#fee2e2','#dc2626'],['#dbeafe','#2563eb'],['#fce7f3','#be185d']]

async function readFileAsText(file) {
  // Plain text / markdown
  if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result)
      reader.onerror = () => reject(new Error('Could not read file'))
      reader.readAsText(file)
    })
  }

  // PDF
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
    GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await getDocument({ data: arrayBuffer }).promise
    const pages = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map(item => item.str).join(' ')
      pages.push(pageText)
    }
    return pages.join('\n\n')
  }

  throw new Error('Unsupported file type. Please upload a .txt, .md, or .pdf file.')
}

export default function UploadPage() {
  const { user, isPro, canAccess, canUpload, uploadsThisWeek, FREE_UPLOAD_LIMIT, refreshProfile } = useAuth()
  const { addSet } = useSets()
  const { t, lang } = useLang()
  const nav = useNavigate()

  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [processing, setProcessing] = useState(false)
  const [stepIdx, setStepIdx] = useState(-1)
  const [doneSteps, setDoneSteps] = useState([])
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const fileInputRef = useRef(null)
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [recognitionRef] = useState({ current: null })
  const [recordingSupported] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition))

  const STEPS = [t('step_parsing'), t('step_flashcards'), t('step_quiz'), t('step_plan'), t('step_finalise')]

  async function handleFile(file) {
    if (!file) return
    setError('')
    if (file.size > 20 * 1024 * 1024) {
      setError('File is too large (max 20 MB). Try a smaller file or paste text directly.')
      return
    }
    setFileLoading(true)
    try {
      const content = await readFileAsText(file)
      setText(content)
      setFileName(file.name)
    } catch (e) {
      setError(e.message || 'Could not read file.')
    } finally {
      setFileLoading(false)
    }
  }

  const onDrop = useCallback(async (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) await handleFile(file)
  }, [])

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const onDragLeave = useCallback(() => setDragOver(false), [])

  function startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = lang === 'sv' ? 'sv-SE' : 'en-US'
    let finalText = text // start from existing text

    rec.onresult = (e) => {
      let interim = ''
      let newFinal = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) newFinal += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      if (newFinal) finalText += newFinal
      setText(finalText + interim)
      setTranscript(interim)
    }
    rec.onerror = () => stopRecording()
    rec.onend = () => { if (recording) rec.start() } // keep going until stopped
    rec.start()
    recognitionRef.current = rec
    setRecording(true)
    setFileName('')
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setRecording(false)
    setTranscript('')
  }

  async function generate() {
    const txt = text.trim()
    if (txt.length < 50) { setError(t('add_more_text')); return }
    if (!canUpload) { nav('/settings'); return }
    setError('')
    setProcessing(true)
    setDoneSteps([])
    setStepIdx(0)

    try {
      await delay(400)
      tick(0)

      let title, flashcards
      try {
        ;[title, flashcards] = await Promise.all([aiTitle(txt, lang), aiFlashcards(txt, lang)])
      } catch {
        ;[title, flashcards] = await Promise.all([sqTitle(txt, lang), sqFlashcards(txt, lang)])
      }
      if (flashcards.length < 2) throw new Error(t('need_more_text'))
      tick(1)

      let quiz
      try {
        quiz = await aiQuiz(txt, flashcards, lang)
      } catch {
        quiz = await sqQuiz(txt, flashcards, lang)
      }
      tick(2)

      const plan = generatePlan(txt)
      tick(3)

      const ci = Math.floor(Math.random() * COLORS.length)
      const newSet = {
        title: title.slice(0, 55),
        icon: ICONS[Math.floor(Math.random() * ICONS.length)],
        bg: COLORS[ci][0], fg: COLORS[ci][1],
        flashcards, quiz,
        source_text: txt.slice(0, 8000),
        plan: { desc: lang === 'sv' ? 'AI-genererad studieplan.' : 'AI-generated study plan.', weeks: [{ label: lang === 'sv' ? 'Ditt innehåll' : 'Your Content', topics: plan }] },
        progress: 0,
      }

      const saved = await addSet(newSet)
      tick(4)

      await supabase.from('profiles').update({ uploads_this_week: uploadsThisWeek + 1 }).eq('id', user.id)
      await refreshProfile()

      await delay(400)
      nav(`/study/${saved.id}`)
    } catch (e) {
      setError(e.message || t('something_wrong'))
      setProcessing(false)
      setStepIdx(-1)
      setDoneSteps([])
    }
  }

  function tick(i) {
    setDoneSteps(prev => [...prev, i])
    if (i + 1 < STEPS.length) setStepIdx(i + 1)
  }
  const delay = ms => new Promise(r => setTimeout(r, ms))

  if (processing) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(150deg,#edeafd 0%,var(--bg) 100%)' }}>
      <div style={{ padding: '40px 28px', maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 26px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ position: 'absolute', inset: i * 12, borderRadius: '50%', border: '3px solid transparent', borderTopColor: ['var(--ac)', '#f59e0b', '#10b981'][i], animation: `spin ${[1.1, 1.7, 2.2][i]}s linear infinite${i === 1 ? ' reverse' : ''}` }} />
          ))}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🧠</div>
        </div>
        <h2 style={{ fontSize: 21, fontWeight: 800, marginBottom: 6 }}>{t('generating')}</h2>
        <p style={{ color: 'var(--t2)', fontSize: 14, marginBottom: 22 }}>{t('building_set')}</p>
        <div className="card" style={{ padding: 14, textAlign: 'left' }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', fontSize: 13, color: doneSteps.includes(i) ? 'var(--gn)' : i === stepIdx ? 'var(--ac)' : 'var(--t2)', fontWeight: (doneSteps.includes(i) || i === stepIdx) ? 600 : 400 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: doneSteps.includes(i) ? 'var(--gn)' : i === stepIdx ? 'var(--ac)' : 'var(--s2)', color: (doneSteps.includes(i) || i === stepIdx) ? '#fff' : 'var(--t3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0, animation: i === stepIdx ? 'pulse .9s infinite' : 'none' }}>
                {doneSteps.includes(i) ? '✓' : i + 1}
              </div>
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <Layout active="upload">
      <div className="page screen">
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.3px' }}>{t('upload_title')}</h1>
          <p style={{ color: 'var(--t2)', marginTop: 6, fontSize: 14, lineHeight: 1.5 }}>
            Paste your notes or upload a file — MemoAI generates flashcards &amp; a quiz instantly.
          </p>
        </div>

        {/* Limit warning */}
        {!canAccess && (
          <div style={{ background: canUpload ? 'var(--al)' : 'var(--rl)', border: `1px solid ${canUpload ? 'var(--ac)' : 'var(--rd)'}`, borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 16 }}>
            {canUpload ? (
              <p style={{ fontSize: 13, color: 'var(--ac)', fontWeight: 600 }}>
                📤 {FREE_UPLOAD_LIMIT - uploadsThisWeek} {t('uploads_remaining')}. <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => nav('/settings')}>{t('upgrade_for_more')}</span>
              </p>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: 'var(--rd)', fontWeight: 700, marginBottom: 4 }}>⚠️ {t('upload_limit_reached')}</p>
                <p style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 10 }}>{t('upgrade_unlimited')}</p>
                <button className="btn btn-pro btn-sm" onClick={() => nav('/settings')}>{t('upgrade_btn')}</button>
              </div>
            )}
          </div>
        )}

        {error && <div className="err-box">{error}</div>}

        {/* Drag-and-drop file zone */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--ac)' : 'var(--bd2)'}`,
            borderRadius: 'var(--r)',
            padding: '22px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'var(--al)' : 'var(--sf)',
            transition: 'all .15s',
            marginBottom: 14,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0])}
          />
          {fileLoading ? (
            <div style={{ fontSize: 14, color: 'var(--ac)', fontWeight: 600 }}>Reading file…</div>
          ) : fileName ? (
            <div>
              <div style={{ fontSize: 22, marginBottom: 4 }}>📄</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', marginBottom: 2 }}>{fileName}</div>
              <div style={{ fontSize: 11, color: 'var(--t2)' }}>{text.length.toLocaleString()} characters loaded · click to change</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📂</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 2 }}>Drop a file here or click to browse</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>PDF, TXT, MD · Max 20 MB</div>
            </div>
          )}
        </div>

        {/* Audio Recording */}
        {/* {recordingSupported && (
          <div style={{ marginBottom: 14 }}>
            <button
              onClick={recording ? stopRecording : startRecording}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 'var(--r)',
                border: `2px solid ${recording ? 'var(--rd)' : 'var(--s3)'}`,
                background: recording ? 'var(--rl)' : 'var(--s1)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all .15s',
              }}
            >
              <span style={{ fontSize: 22, animation: recording ? 'pulse 1s infinite' : 'none' }}>🎙</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: recording ? 'var(--rd)' : 'var(--tx)' }}>
                  {recording ? '⏹ Stop Recording' : '🎙 Record Lecture / Audio'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                  {recording ? (transcript ? `Hearing: "${transcript.slice(0,40)}…"` : 'Listening…') : 'Speak your notes and we\'ll transcribe them'}
                </div>
              </div>
            </button>
          </div>
        )} */}

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--s3)' }} />
          <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>OR PASTE TEXT</span>
          <div style={{ flex: 1, height: 1, background: 'var(--s3)' }} />
        </div>

        {/* Text area */}
        <div className="field" style={{ marginBottom: 14 }}>
          <textarea
            className="inp"
            value={text}
            onChange={e => { setText(e.target.value); if (fileName) setFileName('') }}
            placeholder={t('paste_placeholder')}
          />
          <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'right', marginTop: 4 }}>
            {text.length.toLocaleString()} {t('characters')}
          </div>
        </div>

        <button className="btn btn-p btn-lg btn-w" disabled={text.trim().length < 50 || !canUpload} onClick={generate}>
          {t('generate_btn')}
        </button>
      </div>
    </Layout>
  )
}
