import { useState, useRef, useEffect } from 'react'
import { askTutor } from '../../lib/ai'
import { useLang } from '../../hooks/useLang'

export default function TutorView({ set }) {
  const { lang } = useLang()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: lang === 'sv'
        ? `Hej! Jag är Memo, din AI-studiehandledare. Jag är här för att hjälpa dig förstå "${set.title}". Vad vill du lära dig eller vad är du osäker på?`
        : `Hi! I'm Memo, your AI study tutor. I'm here to help you understand "${set.title}". What would you like to learn or what are you unsure about?`
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sourceText = set.source_text || set.flashcards?.map(f => `${f.q} ${f.a}`).join(' ') || ''

  async function send() {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      // Pass history excluding the initial greeting
      const history = messages.slice(1)
      const reply = await askTutor(msg, history, sourceText, lang)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: lang === 'sv' ? 'Något gick fel. Försök igen.' : 'Something went wrong. Please try again.' }])
    } finally { setLoading(false) }
  }

  // Quick starter questions based on flashcards
  const starters = set.flashcards?.slice(0, 3).map(f => f.q) || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: 400 }}>
      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
            {m.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ac)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, marginRight: 8, marginTop: 2 }}>M</div>
            )}
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.role === 'user' ? 'var(--ac)' : 'var(--sf)',
              color: m.role === 'user' ? '#fff' : 'var(--tx)',
              border: m.role === 'assistant' ? '1px solid var(--bd)' : 'none',
              fontSize: 14,
              lineHeight: 1.55,
              boxShadow: 'var(--s0)',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ac)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>M</div>
            <div style={{ background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: '18px 18px 18px 4px', padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0,1,2].map(j => (
                  <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ac)', animation: `pulse 1s infinite ${j*0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick starters */}
      {messages.length === 1 && starters.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700, marginBottom: 6 }}>
            {lang === 'sv' ? 'FÖRSLAG:' : 'SUGGESTED:'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {starters.map((q, i) => (
              <button key={i} onClick={() => { setInput(q); }}
                style={{ background: 'var(--al)', border: '1px solid var(--ac)', borderRadius: 'var(--rs)', padding: '8px 12px', fontSize: 12, color: 'var(--ac)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                💬 {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid var(--bd)' }}>
        <input
          className="inp"
          style={{ flex: 1, borderRadius: 24, padding: '10px 16px' }}
          placeholder={lang === 'sv' ? 'Ställ en fråga…' : 'Ask a question…'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          disabled={loading}
        />
        <button className="btn btn-p" style={{ borderRadius: 24, padding: '10px 18px' }} onClick={send} disabled={!input.trim() || loading}>
          →
        </button>
      </div>
    </div>
  )
}
