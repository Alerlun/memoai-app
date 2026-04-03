import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks/useLang'
import logoSrc from '../assets/logo.png'

const NAV = [
  {
    key: 'home',
    emoji: '🏠',
    svgPath: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  },
  {
    key: 'upload',
    emoji: '⚡',
    svgPath: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
  },
  {
    key: 'settings',
    emoji: '⚙️',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
  },
]

export default function Layout({ children, active }) {
  const nav = useNavigate()
  const { user, profile, isPro } = useAuth()
  const { t } = useLang()

  const name  = profile?.full_name || user?.user_metadata?.full_name || 'User'
  const first = name.split(' ')[0]

  const items = [
    { key: 'home',     label: t('home'),     path: '/',         emoji: '🏠' },
    { key: 'upload',   label: t('upload'),   path: '/upload',   emoji: '⚡' },
    { key: 'settings', label: t('profile'),  path: '/settings', emoji: '⚙️' },
  ]

  return (
    <div className="sb-layout">

      {/* ════ SIDEBAR (desktop ≥ 769 px) ════ */}
      <aside className="sb">
        {/* Logo */}
        <div className="sb-logo" onClick={() => nav('/')}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: '#fff', overflow: 'hidden', flexShrink: 0, padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={logoSrc} alt="MemoAI" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </div>
          <span style={{ color: 'var(--tx)', flex: 1 }}>MemoAI</span>
          {isPro && <span className="bdg bdg-or" style={{ fontSize: 10, padding: '2px 7px' }}>PRO</span>}
        </div>

        {/* Nav */}
        <div className="sb-body">
          <span className="sb-label">Menu</span>
          {items.map(item => (
            <button key={item.key} className={`sb-item${active === item.key ? ' on' : ''}`} onClick={() => nav(item.path)}>
              <span className="sb-icon">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* User footer */}
        <div className="sb-footer">
          <div className="sb-user" onClick={() => nav('/settings')}>
            <div className="sb-avatar">{first.charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--tx)' }}>{first}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>{isPro ? '✦ Pro plan' : 'Free plan'}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </aside>

      {/* ════ MAIN CONTENT ════ */}
      <div className="sb-content">

        {/* Mobile top navbar */}
        <nav className="nb mobile-nb">
          <div className="nbrand" onClick={() => nav('/')}>
            <div className="nlogo">
              <img src={logoSrc} alt="MemoAI" />
            </div>
            MemoAI
          </div>
          <div style={{ flex: 1 }} />
          <div className="nav-av" onClick={() => nav('/settings')} title="Settings">
            {first.charAt(0).toUpperCase()}
          </div>
        </nav>

        <main style={{ flex: 1 }}>{children}</main>

        {/* Mobile bottom nav */}
        <nav className="bnav">
          {items.map(({ key, label, path }, i) => (
            <button key={key} className={`bni${active === key ? ' on' : ''}`} onClick={() => nav(path)}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d={NAV[i].svgPath} />
              </svg>
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
