import { useState } from 'react'
import { generateMagicNotes as aiMagicNotes } from '../../lib/ai'
import { generateMagicNotes as sqMagicNotes } from '../../lib/smartQuiz'

export default function MagicNotesView({ set, onSaveNotes }) {
  const [notes, setNotes] = useState(set.magic_notes || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState({ summary: true, terms: false, sections: false, facts: false })

  function toggle(key) {
    setOpen(o => ({ ...o, [key]: !o[key] }))
  }

  async function generate() {
    setLoading(true); setError('')
    try {
      const sourceText = set.source_text || set.flashcards.map(f => f.a).join('. ')
      let result
      try {
        result = await aiMagicNotes(sourceText)
      } catch {
        result = await sqMagicNotes(sourceText)
      }
      setNotes(result)
      onSaveNotes?.(result)
    } catch {
      setError('Could not generate notes. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function regenerate() {
    setNotes(null)
    onSaveNotes?.(null)
    await generate()
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 36, marginBottom: 12, animation: 'pulse 1s infinite' }}>✨</div>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Generating Notes…</div>
      <div style={{ fontSize: 13, color: 'var(--t2)' }}>Saved automatically — won't cost credits again</div>
    </div>
  )

  if (!notes) return (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Magic Notes</div>
      <div style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 20, lineHeight: 1.6 }}>
        Transforms your content into a structured study guide. Generated once and saved — no repeat costs.
      </div>
      {error && <div className="err-box" style={{ marginBottom: 16 }}>{error}</div>}
      <button className="btn btn-p btn-lg" onClick={generate}>✨ Generate Study Guide</button>
    </div>
  )

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 4 }}>{notes.title}</h2>
        <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>
          ✨ AI Study Guide · Saved
        </div>
      </div>

      <Accordion icon="📋" label="Summary" open={open.summary} onToggle={() => toggle('summary')}>
        <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--tx)' }}>{notes.summary}</div>
      </Accordion>

      <Accordion icon="🔑" label="Key Terms" count={notes.keyTerms?.length} open={open.terms} onToggle={() => toggle('terms')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notes.keyTerms?.map((kt, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ background: 'var(--ac)', color: '#fff', borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1, whiteSpace: 'nowrap' }}>
                {kt.term}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--t2)' }}>{kt.definition}</div>
            </div>
          ))}
        </div>
      </Accordion>

      <Accordion icon="📖" label="Sections" count={notes.sections?.length} open={open.sections} onToggle={() => toggle('sections')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {notes.sections?.map((sec, i) => (
            <div key={i}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ac)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--al)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: 'var(--ac)', flexShrink: 0 }}>{i + 1}</div>
                {sec.heading}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 4 }}>
                {sec.points?.map((pt, j) => (
                  <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ac)', flexShrink: 0, marginTop: 7, opacity: .4 }} />
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--tx)' }}>{pt}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Accordion>

      <Accordion icon="⚡" label="Quick Facts" count={notes.quickFacts?.length} open={open.facts} onToggle={() => toggle('facts')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {notes.quickFacts?.map((fact, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 12px', background: 'var(--aml)', borderRadius: 'var(--rs)', border: '1px solid var(--am)' }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
              <span style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--tx)', fontWeight: 500 }}>{fact}</span>
            </div>
          ))}
        </div>
      </Accordion>

      <button className="btn btn-s btn-sm" onClick={regenerate} style={{ marginTop: 8 }}>↺ Regenerate</button>
    </div>
  )
}

function Accordion({ icon, label, count, open, onToggle, children }) {
  return (
    <div style={{ marginBottom: 10, borderRadius: 'var(--r)', border: '1.5px solid var(--bd)', overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, background: open ? 'var(--al)' : 'var(--sf)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: open ? '1.5px solid var(--bd)' : 'none', transition: 'background .15s' }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--tx)', textAlign: 'left' }}>{label}</span>
        {count != null && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', background: 'var(--s2)', borderRadius: 10, padding: '2px 7px' }}>{count}</span>
        )}
        <span style={{ fontSize: 11, color: 'var(--t3)', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '14px 16px', background: 'var(--bg)' }}>
          {children}
        </div>
      )}
    </div>
  )
}
