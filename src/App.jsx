// src/App.jsx
import { useEffect, Component } from 'react'
import { useStore } from './store.js'
import { DesktopPet } from './layouts/DesktopPet.jsx'
import { SettingsPanel } from './layouts/SettingsPanel.jsx'

// Future layouts imported here in later phases
const LAYOUTS = {
  'desktop-pet': DesktopPet,
}

// Catches render-phase errors inside any layout and shows a minimal fallback
// instead of leaving a blank transparent window with no way to recover.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'rgba(30,10,10,0.85)',
            border: '1px solid #f87171',
            borderRadius: 12,
            padding: '8px 14px',
            color: '#f87171',
            fontSize: 12,
            fontFamily: 'monospace',
            maxWidth: 280,
            backdropFilter: 'blur(8px)',
          }}
        >
          <strong>Buddy crashed 😵</strong>
          <br />
          <span style={{ opacity: 0.7 }}>{String(this.state.error).slice(0, 120)}</span>
          <br />
          <button
            style={{ marginTop: 6, color: '#f87171', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11 }}
            onClick={() => this.setState({ error: null })}
          >
            Try to recover
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  const { layoutMode, addNotification, setMuted, setFirstRun, updateSettings } = useStore()

  // Hash-based routing — settings panel runs in a separate BrowserWindow
  // loaded at http://localhost:5173/#/settings (dev) or index.html#/settings (prod)
  const isSettings = window.location.hash === '#/settings'

  // Listen for notifications from Electron main process
  useEffect(() => {
    if (!window.buddy) return
    const cleanup = window.buddy.onNotification((notification) => {
      addNotification(notification)
    })
    return cleanup
  }, [addNotification])

  // Listen for tray-driven mute toggles
  useEffect(() => {
    if (!window.buddy) return
    const cleanup = window.buddy.onMuteChanged((muted) => setMuted(muted))
    return cleanup
  }, [setMuted])

  // On mount: load settings to detect first-run and sync store state
  useEffect(() => {
    if (!window.buddy || isSettings) return
    window.buddy.getSettings().then((s) => {
      const hasTokens = Boolean(
        s?.integrations?.slack?.appToken && s?.integrations?.slack?.botToken
      )
      setFirstRun(!hasTokens)
      setMuted(s?.muted ?? false)
      updateSettings({
        mascotName: s?.mascotName ?? 'Buddy',
        mascotCharacter: s?.mascotCharacter ?? 'airie',
      })
    })
  }, [isSettings, setFirstRun, setMuted, updateSettings])

  if (isSettings) {
    return (
      <ErrorBoundary>
        <SettingsPanel />
      </ErrorBoundary>
    )
  }

  const Layout = LAYOUTS[layoutMode] ?? DesktopPet

  return (
    <ErrorBoundary>
      <Layout />
    </ErrorBoundary>
  )
}
