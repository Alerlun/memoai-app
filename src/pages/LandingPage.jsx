import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import logoSrc from '../assets/logo.png'

const STEPS = [
  {
    num: '01', icon: '📂',
    title: 'Upload anything',
    desc: 'Drop a PDF, paste your notes, or record a lecture. MemoAI reads and structures your content instantly.',
  },
  {
    num: '02', icon: '✨',
    title: 'AI builds your toolkit',
    desc: 'Flashcards, quiz questions, a practice exam, and a full study guide — all generated in seconds.',
  },
  {
    num: '03', icon: '🚀',
    title: 'Study until mastery',
    desc: 'Spaced repetition tracks every card and resurfaces what you\'re forgetting — right when you need it.',
  },
]

const MODES = [
  { icon: '🃏', name: 'Flashcards',     col: '#8b7ff5', desc: 'AI-crafted Q&A cards with memory scoring and flip animations.' },
  { icon: '🧠', name: 'Learn Mode',     col: '#4ade80', desc: 'SM-2 spaced repetition — the algorithm behind Anki and Duolingo.' },
  { icon: '🎯', name: 'Quiz',           col: '#f97316', desc: 'Multiple-choice with instant feedback, difficulty badges, and scoring.' },
  { icon: '📝', name: 'Practice Test',  col: '#fbbf24', desc: 'MC, true/false, and short-answer — exam-style and auto-graded.' },
  { icon: '✨', name: 'Magic Notes',    col: '#f472b6', desc: 'Structured study guide: summary, key terms, sections, quick facts.' },
]

/* ── shared inline style helpers ── */
const DARK = '#09090e'
const C    = (a) => `rgba(${a})`
const tx   = '#f0f0f8'
const t2   = '#8c8ca8'
const t3   = '#4e4e60'
const bd   = 'rgba(36,36,52,.9)'
const sf   = 'rgba(17,17,25,.9)'

export default function LandingPage() {
  const nav = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div style={{ minHeight: '100vh', background: DARK, color: tx, fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>

      {/* ── Ambient glows ── */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-25%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 600, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(139,127,245,.14) 0%, transparent 65%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '55%', right: '-15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(249,115,22,.07) 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(139,127,245,.06) 0%, transparent 65%)', filter: 'blur(60px)' }} />
      </div>

      {/* ════════════════════ NAVBAR ════════════════════ */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300, padding: '12px clamp(16px,5vw,52px)' }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 10,
          background: scrolled ? 'rgba(13,13,20,.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          border: `1px solid ${scrolled ? 'rgba(36,36,52,.8)' : 'transparent'}`,
          borderRadius: 9999,
          padding: scrolled ? '10px 20px' : '8px 0',
          transition: 'all .3s',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800, fontSize: 16, letterSpacing: '-.3px', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#fff', overflow: 'hidden', flexShrink: 0, padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={logoSrc} alt="MemoAI" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
            MemoAI
          </div>

          <div style={{ flex: 1 }} />

          <button onClick={() => scrollTo('how')} className="btn btn-g btn-sm lp-hide-sm"
            style={{ color: 'rgba(240,240,248,.65)', fontSize: 13, padding: '6px 12px' }}>How it works</button>
          <button onClick={() => scrollTo('features')} className="btn btn-g btn-sm lp-hide-sm"
            style={{ color: 'rgba(240,240,248,.65)', fontSize: 13, padding: '6px 12px' }}>Features</button>

          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,.08)', margin: '0 2px' }} className="lp-hide-sm" />

          <button className="btn btn-sm" onClick={() => nav('/auth')}
            style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(240,240,248,.8)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9999, padding: '7px 16px', fontSize: 13 }}>
            Sign in
          </button>
          <button className="btn btn-sm" onClick={() => nav('/auth')}
            style={{ background: 'linear-gradient(135deg,#8b7ff5,#7c6ff5)', color: '#fff', borderRadius: 9999, padding: '7px 18px', fontSize: 13, fontWeight: 700, boxShadow: '0 0 20px rgba(139,127,245,.35)', border: 'none' }}>
            Get started free
          </button>
        </div>
      </nav>

      {/* ════════════════════ HERO ════════════════════ */}
      <section style={{ position: 'relative', zIndex: 1, paddingTop: 'clamp(130px,16vw,190px)', paddingBottom: 'clamp(80px,10vw,120px)', paddingLeft: 'clamp(16px,5vw,52px)', paddingRight: 'clamp(16px,5vw,52px)', textAlign: 'center' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>

          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(139,127,245,.1)', border: '1px solid rgba(139,127,245,.22)', borderRadius: 9999, padding: '6px 16px', marginBottom: 36, animation: 'fadeIn .6s ease' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b7ff5', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#a09af7', letterSpacing: '.3px' }}>AI-powered study workspace</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(42px,7.5vw,84px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-2.5px', marginBottom: 26, animation: 'fadeUp .7s ease .1s both' }}>
            Turn Any Material<br />
            Into{' '}
            <span className="grad-text" style={{ display: 'inline-block', paddingRight: 4 }}>Mastery</span>
          </h1>

          {/* Sub */}
          <p style={{ fontSize: 'clamp(15px,2.2vw,19px)', color: 'rgba(140,140,168,.85)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 44px', fontWeight: 400, animation: 'fadeUp .7s ease .2s both' }}>
            Upload your notes, PDFs, or lectures. MemoAI instantly creates flashcards, quizzes, practice tests, and study guides — powered by AI.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20, animation: 'fadeUp .7s ease .3s both' }}>
            <button onClick={() => nav('/auth')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '15px 36px', borderRadius: 9999, background: 'linear-gradient(135deg,#8b7ff5 0%,#f97316 100%)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 0 44px rgba(139,127,245,.32), 0 0 80px rgba(249,115,22,.12)', transition: 'all .22s', fontFamily: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 64px rgba(139,127,245,.45), 0 0 100px rgba(249,115,22,.2)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 44px rgba(139,127,245,.32), 0 0 80px rgba(249,115,22,.12)' }}>
              Get Started Free →
            </button>
            <button onClick={() => scrollTo('how')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 28px', borderRadius: 9999, background: 'rgba(255,255,255,.05)', color: 'rgba(240,240,248,.75)', fontWeight: 600, fontSize: 14, border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', transition: 'all .2s', fontFamily: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.18)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)' }}>
              See how it works ↓
            </button>
          </div>

          <p style={{ fontSize: 12, color: 'rgba(78,78,96,.8)', fontWeight: 600, letterSpacing: '.3px', animation: 'fadeIn .7s ease .5s both' }}>
            ✓ No credit card required &nbsp;·&nbsp; ✓ Free forever plan &nbsp;·&nbsp; ✓ 3 uploads/month free
          </p>
        </div>

        {/* App mockup */}
        <div style={{ maxWidth: 840, margin: '72px auto 0', position: 'relative', animation: 'fadeUp .9s ease .4s both' }}>
          <div aria-hidden style={{ position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)', width: '65%', height: 60, background: 'rgba(139,127,245,.18)', filter: 'blur(50px)', borderRadius: '50%', pointerEvents: 'none' }} />
          <AppMockup />
        </div>
      </section>

      {/* ════════════════════ HOW IT WORKS ════════════════════ */}
      <section id="how" style={{ position: 'relative', zIndex: 1, padding: 'clamp(72px,8vw,100px) clamp(16px,5vw,52px)', borderTop: '1px solid rgba(36,36,52,.7)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#8b7ff5', textTransform: 'uppercase', letterSpacing: '2.5px', marginBottom: 16 }}>How it works</div>
            <h2 style={{ fontSize: 'clamp(28px,4.5vw,52px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1, color: tx }}>
              Three steps to better grades
            </h2>
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {STEPS.map((s, i) => (
              <div key={i}
                style={{ flex: '1 1 280px', background: 'rgba(17,17,25,.7)', border: '1px solid rgba(36,36,52,.9)', borderRadius: 18, padding: '32px 28px', position: 'relative', overflow: 'hidden', transition: 'all .25s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,127,245,.35)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,.6), 0 0 30px rgba(139,127,245,.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(36,36,52,.9)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                <div aria-hidden style={{ position: 'absolute', top: -10, right: 16, fontSize: 76, fontWeight: 900, color: 'rgba(36,36,52,.7)', lineHeight: 1, userSelect: 'none' }}>{s.num}</div>
                <div style={{ fontSize: 38, marginBottom: 18, display: 'inline-block', animation: `float 3.5s ease-in-out infinite`, animationDelay: `${i * 0.45}s` }}>{s.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, letterSpacing: '-.3px', color: tx }}>{s.title}</div>
                <div style={{ fontSize: 14, color: 'rgba(140,140,168,.8)', lineHeight: 1.72 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ FEATURES ════════════════════ */}
      <section id="features" style={{ position: 'relative', zIndex: 1, padding: 'clamp(72px,8vw,100px) clamp(16px,5vw,52px)', borderTop: '1px solid rgba(36,36,52,.7)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#f97316', textTransform: 'uppercase', letterSpacing: '2.5px', marginBottom: 16 }}>Study modes</div>
            <h2 style={{ fontSize: 'clamp(28px,4.5vw,52px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 14 }}>
              Every way to study,{' '}
              <span className="grad-text-or">in one place</span>
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(140,140,168,.7)', maxWidth: 440, margin: '0 auto', lineHeight: 1.65 }}>
              Five science-backed modes, all generated from your own uploaded material.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(188px,1fr))', gap: 16 }}>
            {MODES.map((m, i) => (
              <div key={i}
                style={{ background: 'rgba(17,17,25,.6)', border: '1px solid rgba(36,36,52,.9)', borderRadius: 16, padding: '24px 20px', transition: 'all .25s', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = m.col + '44'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 16px 44px rgba(0,0,0,.5), 0 0 22px ${m.col}18` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(36,36,52,.9)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                <div aria-hidden style={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80, borderRadius: '50%', background: m.col, opacity: .06, filter: 'blur(24px)', pointerEvents: 'none' }} />
                <div style={{ fontSize: 28, marginBottom: 14 }}>{m.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8, letterSpacing: '-.2px', color: tx }}>{m.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(140,140,168,.75)', lineHeight: 1.65 }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ STATS ════════════════════ */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(56px,6vw,72px) clamp(16px,5vw,52px)', borderTop: '1px solid rgba(36,36,52,.7)', borderBottom: '1px solid rgba(36,36,52,.7)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0 }}>
          {[
            { v: 'AI',    l: 'Generated content',  s: 'Not algorithmic guessing' },
            { v: '5',     l: 'Study modes',         s: 'For every learning style' },
            { v: 'SM-2',  l: 'Spaced repetition',   s: 'Science-backed algorithm' },
            { v: '∞',     l: 'Sets for Pro users',  s: 'Unlimited uploads' },
          ].map((stat, i) => (
            <div key={i} style={{ flex: '1 1 180px', textAlign: 'center', padding: '28px 20px', borderRight: i < 3 ? '1px solid rgba(36,36,52,.5)' : 'none' }}>
              <div style={{ fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 6, background: 'linear-gradient(135deg,#f0f0f8,rgba(240,240,248,.45))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stat.v}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: tx }}>{stat.l}</div>
              <div style={{ fontSize: 12, color: 'rgba(78,78,96,.8)', fontWeight: 500 }}>{stat.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════ BOTTOM CTA ════════════════════ */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(80px,10vw,130px) clamp(16px,5vw,52px)', textAlign: 'center' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 700, height: 320, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(139,127,245,.09) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        </div>
        <div style={{ maxWidth: 580, margin: '0 auto', position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(34px,5.5vw,62px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.08, marginBottom: 22 }}>
            Ready to study<br />
            <span className="grad-text">smarter?</span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(140,140,168,.8)', lineHeight: 1.65, marginBottom: 40, maxWidth: 420, margin: '0 auto 40px' }}>
            Join students using MemoAI to turn dense material into lasting knowledge.
          </p>
          <button onClick={() => nav('/auth')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '16px 44px', borderRadius: 9999, background: 'linear-gradient(135deg,#8b7ff5,#f97316)', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 0 50px rgba(139,127,245,.35)', transition: 'all .22s', fontFamily: 'inherit', marginBottom: 16 }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 70px rgba(139,127,245,.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 50px rgba(139,127,245,.35)' }}>
            Get Started Free →
          </button>
          <p style={{ fontSize: 12, color: 'rgba(78,78,96,.7)', fontWeight: 600 }}>No credit card required · Free plan available</p>
        </div>
      </section>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(36,36,52,.7)', padding: '28px clamp(16px,5vw,52px)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800, fontSize: 14 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: '#fff', overflow: 'hidden', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src={logoSrc} alt="MemoAI" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </div>
          MemoAI
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          {[['Terms', '/terms'], ['Privacy', '/privacy'], ['Contact', 'mailto:alerlunai@gmail.com']].map(([label, href]) => (
            href.startsWith('/') ?
              <Link key={label} to={href} style={{ color: 'rgba(140,140,168,.55)', transition: 'color .15s' }}
                onMouseEnter={e => e.target.style.color = tx}
                onMouseLeave={e => e.target.style.color = 'rgba(140,140,168,.55)'}>{label}</Link> :
              <a key={label} href={href} style={{ color: 'rgba(140,140,168,.55)', transition: 'color .15s' }}
                onMouseEnter={e => e.target.style.color = tx}
                onMouseLeave={e => e.target.style.color = 'rgba(140,140,168,.55)'}>{label}</a>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(78,78,96,.6)', fontWeight: 500 }}>MemoAI</div>
      </footer>
    </div>
  )
}

/* ════════════════════ APP MOCKUP ════════════════════ */
function AppMockup() {
  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      {/* Floating pills */}
      <div style={{ position: 'absolute', top: -18, right: '10%', background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.25)', borderRadius: 9999, padding: '8px 16px', fontSize: 12, fontWeight: 700, color: '#4ade80', boxShadow: '0 0 20px rgba(74,222,128,.12)', zIndex: 2, backdropFilter: 'blur(12px)', whiteSpace: 'nowrap' }}>
        🔥 7 day streak
      </div>
      <div style={{ position: 'absolute', bottom: 28, left: '-3%', background: 'rgba(139,127,245,.1)', border: '1px solid rgba(139,127,245,.25)', borderRadius: 9999, padding: '8px 16px', fontSize: 12, fontWeight: 700, color: '#a09af7', boxShadow: '0 0 20px rgba(139,127,245,.15)', zIndex: 2, backdropFilter: 'blur(12px)', whiteSpace: 'nowrap' }}>
        🧠 Memory 84%
      </div>

      {/* Window frame */}
      <div style={{ background: 'rgba(14,14,22,.96)', border: '1px solid rgba(36,36,52,.95)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.85), 0 0 60px rgba(139,127,245,.07)' }}>
        {/* Chrome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '14px 18px', borderBottom: '1px solid rgba(36,36,52,.7)', background: 'rgba(9,9,14,.6)' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(36,36,52,.5)', marginLeft: 8 }} />
        </div>

        <div style={{ padding: '20px 22px 24px' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 20, background: 'rgba(24,24,31,.8)', borderRadius: 11, padding: 4, width: 'fit-content' }}>
            {['🃏 Flashcards', '🧠 Learn', '🎯 Quiz', '📝 Test'].map((tab, i) => (
              <div key={i} style={{ padding: '6px 14px', borderRadius: 8, background: i === 0 ? 'rgba(139,127,245,.18)' : 'transparent', color: i === 0 ? '#a09af7' : 'rgba(140,140,168,.45)', fontSize: 11, fontWeight: 700, border: i === 0 ? '1px solid rgba(139,127,245,.28)' : '1px solid transparent', whiteSpace: 'nowrap' }}>
                {tab}
              </div>
            ))}
          </div>

          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}>
            <span style={{ color: 'rgba(140,140,168,.5)' }}>8 / 13 cards</span>
            <span><span style={{ color: '#4ade80', fontWeight: 700 }}>✓ 6</span> <span style={{ color: '#f87171', fontWeight: 700 }}>↩ 2</span></span>
          </div>
          <div style={{ height: 3, background: 'rgba(36,36,52,.8)', borderRadius: 3, marginBottom: 22, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '62%', background: 'linear-gradient(90deg,#8b7ff5,#a09af7)', borderRadius: 3 }} />
          </div>

          {/* Flashcard */}
          <div style={{ background: 'linear-gradient(135deg,rgba(91,79,233,.45) 0%,rgba(124,111,245,.35) 50%,rgba(168,85,247,.25) 100%)', border: '1px solid rgba(139,127,245,.25)', borderRadius: 16, padding: '34px 26px', textAlign: 'center', marginBottom: 14, boxShadow: '0 0 40px rgba(139,127,245,.1)' }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', opacity: .45, marginBottom: 12, color: '#a09af7' }}>QUESTION</div>
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.5, color: '#f0f0f8' }}>What is mitosis?</div>
            <div style={{ marginTop: 14, fontSize: 11, color: 'rgba(160,154,247,.5)' }}>👆 Tap card to reveal answer</div>
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: '↩ Again', bg: 'rgba(248,113,113,.08)', border: 'rgba(248,113,113,.18)', col: '#f87171' },
              { label: '⏩ Skip',  bg: 'rgba(36,36,52,.6)',    border: 'rgba(52,52,80,.6)',    col: 'rgba(140,140,168,.6)' },
              { label: '✓ Got it',bg: 'rgba(74,222,128,.08)', border: 'rgba(74,222,128,.18)', col: '#4ade80' },
            ].map(b => (
              <div key={b.label} style={{ flex: 1, padding: '11px', borderRadius: 10, background: b.bg, border: `1px solid ${b.border}`, color: b.col, fontSize: 12, fontWeight: 700, textAlign: 'center' }}>{b.label}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
