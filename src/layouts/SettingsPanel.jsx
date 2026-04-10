// src/layouts/SettingsPanel.jsx
import { useState, useEffect, useRef } from 'react'

const MASCOTS = [
  { id: 'airie', label: 'Airie', description: 'Teal robot with wings' },
  { id: 'buddy', label: 'Buddy', description: 'Classic blob companion' },
]

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

export function SettingsPanel() {
  const [form, setForm] = useState({
    mascotName: 'Buddy',
    mascotCharacter: 'airie',
    slackAppToken: '',
    slackBotToken: '',
    autoStart: false,
    muted: false,
  })
  const [status, setStatus] = useState(null) // null | 'saving' | 'saved' | 'error'
  const [tokensChanged, setTokensChanged] = useState(false)
  const originalTokens = useRef({ app: '', bot: '' })

  // Load current settings from main process on mount
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
          autoStart: loginItemEnabled,
          muted: s.muted ?? false,
        })
      } catch (e) {
        console.error('[Settings] Failed to load:', e)
      }
    }
    load()
  }, [])

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setStatus(null)
    if (key === 'slackAppToken' || key === 'slackBotToken') {
      setTokensChanged(true)
    }
  }

  async function handleSave() {
    setStatus('saving')
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
        },
      }

      await window.buddy?.saveSettings(settings)
      await window.buddy?.setLoginItem(form.autoStart)

      if (tokensChanged && form.slackAppToken.trim() && form.slackBotToken.trim()) {
        await window.buddy?.restartIntegrations()
      }

      originalTokens.current = { app: form.slackAppToken, bot: form.slackBotToken }
      setTokensChanged(false)
      setStatus('saved')
      setTimeout(() => setStatus(null), 3000)
    } catch (e) {
      console.error('[Settings] Save failed:', e)
      setStatus('error')
    }
  }

  function openSlackDocs() {
    window.buddy?.openExternal('https://api.slack.com/apps')
  }

  return (
    <div className="min-h-screen bg-buddy-bg text-buddy-text flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-buddy-border">
        <span className="text-2xl">🤖</span>
        <div>
          <h1 className="text-base font-bold text-buddy-text">Voxel Buddy</h1>
          <p className="text-xs text-buddy-muted">Settings</p>
        </div>
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
                      : 'border-buddy-border text-buddy-muted hover:border-buddy-glow/30'
                    }`}
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
              onClick={openSlackDocs}
              className="text-xs text-buddy-glow/70 hover:text-buddy-glow underline underline-offset-2 transition-colors"
            >
              Get tokens →
            </button>
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

        {/* ── Behaviour ── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-bold text-buddy-glow uppercase tracking-widest">Behaviour</h2>

          {[
            { key: 'muted', label: 'Mute notifications', description: 'Buddy wanders but hides message bubbles' },
            { key: 'autoStart', label: 'Launch at login', description: 'Start Voxel Buddy when you log in' },
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
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200
                    ${form[key] ? 'left-5' : 'left-1'}`}
                />
              </button>
            </label>
          ))}
        </section>
      </div>

      {/* Footer / Save */}
      <div className="px-6 py-4 border-t border-buddy-border flex items-center justify-between gap-4">
        <div className="text-xs">
          {status === 'saving' && <span className="text-buddy-muted">Saving…</span>}
          {status === 'saved' && <span className="text-buddy-glow">✓ Saved</span>}
          {status === 'error' && <span className="text-red-400">Save failed — check console</span>}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={status === 'saving'}
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
