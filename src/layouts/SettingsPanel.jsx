// src/layouts/SettingsPanel.jsx
import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store.js'

const MASCOTS = [
  { id: 'airie', label: 'Airie', description: 'Teal robot with wings' },
  { id: 'buddy', label: 'Buddy', description: 'Classic blob companion' },
]

const STATUS_CONFIG = {
  connected:    { dot: 'bg-green-400',  label: 'Connected' },
  connecting:   { dot: 'bg-yellow-400 animate-pulse', label: 'Connecting…' },
  reconnecting: { dot: 'bg-yellow-400 animate-pulse', label: 'Reconnecting…' },
  disconnected: { dot: 'bg-red-400',    label: 'Disconnected' },
  error:        { dot: 'bg-red-400',    label: 'Error' },
  unknown:      { dot: 'bg-buddy-muted', label: 'Not connected' },
}

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-buddy-muted uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-xs text-buddy-muted/70">{hint}</p>}
    </div>
  )
}

function TokenInput({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-buddy-muted uppercase tracking-wider">{label}</label>
      <div className="flex gap-2">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-buddy-bg border border-buddy-border rounded-lg px-3 py-2
            text-sm text-buddy-text placeholder:text-buddy-muted/50 font-mono
            focus:outline-none focus:border-buddy-glow/60 transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="px-3 py-2 rounded-lg text-xs text-buddy-muted border border-buddy-border
            hover:border-buddy-glow/40 hover:text-buddy-text transition-colors"
          aria-label={show ? 'Hide token' : 'Show token'}
        >
          {show ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  )
}

function SlackStatusBadge({ status, error }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      <span className="text-xs text-buddy-muted">{cfg.label}</span>
      {status === 'error' && error && (
        <span className="text-xs text-red-400 truncate max-w-[180px]" title={error}>— {error}</span>
      )}
    </div>
  )
}

export function SettingsPanel() {
  const { slackStatus, slackError, setSlackStatus, gmailStatus, gmailError, setGmailStatus } = useStore()

  const [form, setForm] = useState({
    mascotName: 'Buddy',
    mascotCharacter: 'airie',
    slackAppToken: '',
    slackBotToken: '',
    aiApiKey: '',
    autoStart: false,
    muted: false,
  })
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'
  const [tokensChanged, setTokensChanged] = useState(false)
  const originalTokens = useRef({ app: '', bot: '' })

  // Gmail-specific state
  const [gmailConnectedEmail, setGmailConnectedEmail] = useState(null)
  const [showGmailCredentials, setShowGmailCredentials] = useState(false)
  const [gmailClientId, setGmailClientId] = useState('')
  const [gmailClientSecret, setGmailClientSecret] = useState('')
  const [gmailAuthStatus, setGmailAuthStatus] = useState(null) // null | 'connecting' | 'error'
  const [gmailAuthError, setGmailAuthError] = useState(null)

  // Listen for connection status updates pushed from main process
  useEffect(() => {
    if (!window.buddy) return
    return window.buddy.onSlackStatus(setSlackStatus)
  }, [setSlackStatus])

  useEffect(() => {
    if (!window.buddy?.onGmailStatus) return
    return window.buddy.onGmailStatus(setGmailStatus)
  }, [setGmailStatus])

  useEffect(() => {
    async function load() {
      try {
        const [s, loginItemEnabled] = await Promise.all([
          window.buddy?.getSettings() ?? {},
          window.buddy?.getLoginItem() ?? false,
        ])
        const appToken = s.integrations?.slack?.appToken ?? ''
        const botToken = s.integrations?.slack?.botToken ?? ''
        originalTokens.current = { app: appToken, bot: botToken }
        setForm({
          mascotName: s.mascotName ?? 'Buddy',
          mascotCharacter: s.mascotCharacter ?? 'airie',
          slackAppToken: appToken,
          slackBotToken: botToken,
          aiApiKey: s.integrations?.ai?.apiKey ?? '',
          autoStart: loginItemEnabled,
          muted: s.muted ?? false,
        })

        // Gmail — show connected state if tokens are saved
        const gmailEmail = s.integrations?.gmail?.email ?? null
        if (gmailEmail) {
          setGmailConnectedEmail(gmailEmail)
        }
      } catch (e) {
        console.error('[Settings] Failed to load:', e)
      }
    }
    load()
  }, [])

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaveStatus(null)
    if (key === 'slackAppToken' || key === 'slackBotToken') setTokensChanged(true)
  }

  async function handleGmailConnect() {
    if (!gmailClientId.trim() || !gmailClientSecret.trim()) {
      setGmailAuthError('Please enter both Client ID and Client Secret.')
      return
    }
    setGmailAuthStatus('connecting')
    setGmailAuthError(null)
    try {
      const result = await window.buddy?.gmailAuthStart(gmailClientId.trim(), gmailClientSecret.trim())
      if (result?.ok) {
        setGmailConnectedEmail(result.email ?? 'Connected')
        setShowGmailCredentials(false)
        setGmailClientId('')
        setGmailClientSecret('')
        setGmailAuthStatus(null)
      } else {
        setGmailAuthError(result?.error ?? 'Unknown error during OAuth flow.')
        setGmailAuthStatus('error')
      }
    } catch (e) {
      setGmailAuthError(e.message)
      setGmailAuthStatus('error')
    }
  }

  async function handleGmailDisconnect() {
    try {
      await window.buddy?.gmailDisconnect()
      setGmailConnectedEmail(null)
      setGmailAuthStatus(null)
      setGmailAuthError(null)
    } catch (e) {
      console.error('[Settings] Gmail disconnect failed:', e)
    }
  }

  async function handleSave() {
    setSaveStatus('saving')
    try {
      const settings = {
        mascotName: form.mascotName,
        mascotCharacter: form.mascotCharacter,
        muted: form.muted,
        autoStart: form.autoStart,
        integrations: {
          slack: {
            appToken: form.slackAppToken.trim(),
            botToken: form.slackBotToken.trim(),
          },
          ai: {
            apiKey: form.aiApiKey.trim(),
          },
        },
      }

      await window.buddy?.saveSettings(settings)
      await window.buddy?.setLoginItem(form.autoStart)

      if (tokensChanged && form.slackAppToken.trim() && form.slackBotToken.trim()) {
        await window.buddy?.restartIntegrations()
      }

      originalTokens.current = { app: form.slackAppToken, bot: form.slackBotToken }
      setTokensChanged(false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (e) {
      console.error('[Settings] Save failed:', e)
      setSaveStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-buddy-bg text-buddy-text flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-buddy-border">
        <span className="text-2xl">🤖</span>
        <div className="flex-1">
          <h1 className="text-base font-bold text-buddy-text">Voxel Buddy</h1>
          <p className="text-xs text-buddy-muted">Settings</p>
        </div>
        {/* Live Slack status in header */}
        <SlackStatusBadge status={slackStatus} error={slackError} />
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

        {/* ── Mascot ── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-bold text-buddy-glow uppercase tracking-widest">Companion</h2>

          <Field label="Name">
            <input
              type="text"
              value={form.mascotName}
              onChange={(e) => update('mascotName', e.target.value)}
              maxLength={24}
              className="bg-buddy-bg border border-buddy-border rounded-lg px-3 py-2
                text-sm text-buddy-text placeholder:text-buddy-muted
                focus:outline-none focus:border-buddy-glow/60 transition-colors"
            />
          </Field>

          <Field label="Character">
            <div className="flex gap-3">
              {MASCOTS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => update('mascotCharacter', m.id)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors
                    ${form.mascotCharacter === m.id
                      ? 'border-buddy-glow/60 bg-buddy-glow/10 text-buddy-glow'
                      : 'border-buddy-border text-buddy-muted hover:border-buddy-glow/30'}`}
                >
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{m.description}</div>
                </button>
              ))}
            </div>
          </Field>
        </section>

        <div className="border-t border-buddy-border" />

        {/* ── Slack Integration ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-buddy-glow uppercase tracking-widest">Slack</h2>
            <button
              type="button"
              onClick={() => window.buddy?.openExternal('https://api.slack.com/apps')}
              className="text-xs text-buddy-glow/70 hover:text-buddy-glow underline underline-offset-2 transition-colors"
            >
              Get tokens →
            </button>
          </div>

          {/* Live connection status */}
          <div className="flex items-center justify-between bg-buddy-bg rounded-lg px-3 py-2.5 border border-buddy-border">
            <SlackStatusBadge status={slackStatus} error={slackError} />
            {(slackStatus === 'error' || slackStatus === 'disconnected') && (
              <button
                type="button"
                onClick={() => window.buddy?.restartIntegrations()}
                className="text-xs text-buddy-glow underline underline-offset-2 hover:opacity-80"
              >
                Reconnect
              </button>
            )}
          </div>

          <TokenInput
            label="App Token"
            value={form.slackAppToken}
            onChange={(v) => update('slackAppToken', v)}
            placeholder="xapp-1-..."
          />
          <TokenInput
            label="Bot Token"
            value={form.slackBotToken}
            onChange={(v) => update('slackBotToken', v)}
            placeholder="xoxb-..."
          />

          {tokensChanged && form.slackAppToken && form.slackBotToken && (
            <p className="text-xs text-buddy-glow/80 bg-buddy-glow/10 border border-buddy-glow/20 rounded-lg px-3 py-2">
              Tokens changed — Slack will reconnect when you save.
            </p>
          )}
        </section>

        <div className="border-t border-buddy-border" />

        {/* ── Gmail Integration ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-teal-400 uppercase tracking-widest">Gmail</h2>
            <button
              type="button"
              onClick={() => window.buddy?.openExternal('https://console.cloud.google.com/apis/credentials')}
              className="text-xs text-teal-400/70 hover:text-teal-400 underline underline-offset-2 transition-colors"
            >
              Get credentials →
            </button>
          </div>

          {gmailConnectedEmail ? (
            /* Connected state */
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between bg-buddy-bg rounded-lg px-3 py-2.5 border border-buddy-border">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0 bg-green-400" />
                  <span className="text-xs text-buddy-muted">Connected</span>
                  <span className="text-xs text-buddy-text ml-1 font-mono truncate max-w-[180px]">{gmailConnectedEmail}</span>
                </div>
                <button
                  type="button"
                  onClick={handleGmailDisconnect}
                  className="text-xs text-red-400/80 hover:text-red-400 underline underline-offset-2 transition-colors"
                >
                  Disconnect
                </button>
              </div>

              {/* Live Gmail status badge */}
              {gmailStatus !== 'unknown' && (
                <SlackStatusBadge status={gmailStatus} error={gmailError} />
              )}
            </div>
          ) : (
            /* Not connected state */
            <div className="flex flex-col gap-3">
              {!showGmailCredentials ? (
                <button
                  type="button"
                  onClick={() => setShowGmailCredentials(true)}
                  className="w-full py-2.5 rounded-xl border border-teal-400/40 text-sm font-medium text-teal-400
                    bg-teal-400/5 hover:bg-teal-400/10 transition-colors"
                >
                  Connect Gmail
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-buddy-muted/80">
                    Enter your OAuth 2.0 credentials from{' '}
                    <button
                      type="button"
                      onClick={() => window.buddy?.openExternal('https://console.cloud.google.com/apis/credentials')}
                      className="text-teal-400/80 underline underline-offset-2 hover:text-teal-400"
                    >
                      Google Cloud Console
                    </button>
                    . Use redirect URI:{' '}
                    <span className="font-mono text-buddy-text/80 text-xs">http://localhost:42813/oauth/google/callback</span>
                  </p>

                  <TokenInput
                    label="Google Client ID"
                    value={gmailClientId}
                    onChange={setGmailClientId}
                    placeholder="123456789-abc....apps.googleusercontent.com"
                  />
                  <TokenInput
                    label="Google Client Secret"
                    value={gmailClientSecret}
                    onChange={setGmailClientSecret}
                    placeholder="GOCSPX-..."
                  />

                  {gmailAuthError && (
                    <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                      {gmailAuthError}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowGmailCredentials(false); setGmailAuthError(null) }}
                      className="px-4 py-2 rounded-xl text-xs text-buddy-muted border border-buddy-border
                        hover:border-buddy-glow/30 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleGmailConnect}
                      disabled={gmailAuthStatus === 'connecting'}
                      className="flex-1 py-2 rounded-xl text-sm font-medium text-teal-400
                        border border-teal-400/40 bg-teal-400/5 hover:bg-teal-400/10
                        transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {gmailAuthStatus === 'connecting' ? 'Connecting…' : 'Connect Gmail'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="border-t border-buddy-border" />

        {/* ── AI Suggestions ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-buddy-glow uppercase tracking-widest">AI Suggestions</h2>
            <button
              type="button"
              onClick={() => window.buddy?.openExternal('https://console.anthropic.com')}
              className="text-xs text-buddy-glow/70 hover:text-buddy-glow underline underline-offset-2 transition-colors"
            >
              Get a key →
            </button>
          </div>

          <TokenInput
            label="Claude API Key"
            value={form.aiApiKey}
            onChange={(v) => update('aiApiKey', v)}
            placeholder="sk-ant-..."
          />

          <p className="text-xs text-buddy-muted/70 leading-relaxed">
            Airie will suggest 3 casual replies when you get a notification. Suggestions are optional and fail silently.{' '}
            <button
              type="button"
              onClick={() => window.buddy?.openExternal('https://console.anthropic.com')}
              className="text-buddy-glow/70 hover:text-buddy-glow underline underline-offset-2 transition-colors"
            >
              console.anthropic.com
            </button>
          </p>
        </section>

        <div className="border-t border-buddy-border" />

        {/* ── Behaviour ── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-bold text-buddy-glow uppercase tracking-widest">Behaviour</h2>

          {[
            { key: 'muted',     label: 'Mute notifications', description: 'Buddy wanders but hides message bubbles' },
            { key: 'autoStart', label: 'Launch at login',    description: 'Start Voxel Buddy when you log in' },
          ].map(({ key, label, description }) => (
            <label key={key} className="flex items-center justify-between gap-4 cursor-pointer group">
              <div>
                <p className="text-sm text-buddy-text group-hover:text-buddy-glow transition-colors">{label}</p>
                <p className="text-xs text-buddy-muted">{description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form[key]}
                onClick={() => update(key, !form[key])}
                className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0
                  ${form[key] ? 'bg-buddy-glow/80' : 'bg-buddy-border'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200
                  ${form[key] ? 'left-5' : 'left-1'}`} />
              </button>
            </label>
          ))}
        </section>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-buddy-border flex items-center justify-between gap-4">
        <div className="text-xs">
          {saveStatus === 'saving' && <span className="text-buddy-muted">Saving…</span>}
          {saveStatus === 'saved'  && <span className="text-buddy-glow">✓ Saved</span>}
          {saveStatus === 'error'  && <span className="text-red-400">Save failed — check console</span>}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-buddy-glow/20 text-buddy-glow
            border border-buddy-glow/40 hover:bg-buddy-glow/30 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>
    </div>
  )
}
