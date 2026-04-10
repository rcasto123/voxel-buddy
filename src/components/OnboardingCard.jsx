// src/components/OnboardingCard.jsx
// First-run welcome card — shown above the mascot when no Slack tokens are configured.

const REQUIRED_SCOPES = [
  { scope: 'connections:write', token: 'App Token', desc: 'Socket Mode connection' },
  { scope: 'im:history',        token: 'Bot Token', desc: 'Read DMs' },
  { scope: 'im:read',           token: 'Bot Token', desc: 'List DM channels' },
  { scope: 'users:read',        token: 'Bot Token', desc: 'Resolve display names' },
  { scope: 'chat:write',        token: 'Bot Token', desc: 'Send replies' },
]

export function OnboardingCard({ onDismiss }) {
  function openSettings() { window.buddy?.openSettingsWindow() }
  function openSlackApps() { window.buddy?.openExternal('https://api.slack.com/apps') }
  function openSlackDocs() { window.buddy?.openExternal('https://api.slack.com/apis/socket-mode') }

  return (
    // `relative` is required so the absolute bubble-tail positions correctly
    <div
      className="relative w-80 rounded-2xl border border-buddy-border bg-buddy-surface
        shadow-2xl shadow-black/40 flex flex-col gap-3 p-4 text-buddy-text pointer-events-auto"
      onMouseEnter={() => window.buddy?.setMouseOverMascot(true)}
      onMouseLeave={() => window.buddy?.setMouseOverMascot(false)}
    >
      {/* Bubble tail pointing down toward mascot */}
      <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0 h-0
        border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent
        border-t-[10px] border-t-buddy-border" />

      <div className="flex items-center gap-2">
        <span className="text-xl">👋</span>
        <h2 className="text-sm font-bold text-buddy-glow">Welcome to Voxel Buddy!</h2>
      </div>

      <p className="text-xs text-buddy-muted leading-relaxed">
        Connect Slack in 3 steps — takes about 2 minutes.
      </p>

      <ol className="flex flex-col gap-2.5">
        <li className="flex items-start gap-2.5">
          <span className="shrink-0 w-5 h-5 rounded-full bg-buddy-glow/20 text-buddy-glow
            text-xs font-bold flex items-center justify-center mt-0.5">1</span>
          <span className="text-xs text-buddy-muted">
            Create a Slack app at{' '}
            <button onClick={openSlackApps}
              className="text-buddy-glow underline underline-offset-2 hover:opacity-80">
              api.slack.com/apps
            </button>
            {' '}and enable <strong className="text-buddy-text">Socket Mode</strong>
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="shrink-0 w-5 h-5 rounded-full bg-buddy-glow/20 text-buddy-glow
            text-xs font-bold flex items-center justify-center mt-0.5">2</span>
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-xs text-buddy-muted">Add these scopes to your app:</span>
            <div className="flex flex-col gap-1">
              {REQUIRED_SCOPES.map(({ scope, token, desc }) => (
                <div key={scope} className="flex items-center gap-1.5">
                  <code className="text-buddy-glow text-xs bg-buddy-glow/10 px-1.5 py-0.5 rounded font-mono">
                    {scope}
                  </code>
                  <span className="text-xs text-buddy-muted/70">{token} · {desc}</span>
                </div>
              ))}
            </div>
          </div>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="shrink-0 w-5 h-5 rounded-full bg-buddy-glow/20 text-buddy-glow
            text-xs font-bold flex items-center justify-center mt-0.5">3</span>
          <span className="text-xs text-buddy-muted">
            Paste your App Token + Bot Token in{' '}
            <button onClick={openSettings}
              className="text-buddy-glow underline underline-offset-2 hover:opacity-80">
              Settings
            </button>
          </span>
        </li>
      </ol>

      <button onClick={openSlackDocs}
        className="text-xs text-buddy-muted/60 hover:text-buddy-muted text-left underline underline-offset-2">
        Socket Mode setup guide →
      </button>

      <div className="flex gap-2 pt-1">
        <button onClick={openSettings}
          className="flex-1 py-2 rounded-xl text-xs font-semibold bg-buddy-glow/20 text-buddy-glow
            border border-buddy-glow/30 hover:bg-buddy-glow/30 transition-colors">
          Open Settings
        </button>
        <button onClick={onDismiss}
          className="px-4 py-2 rounded-xl text-xs text-buddy-muted border border-buddy-border
            hover:text-buddy-text hover:border-buddy-glow/30 transition-colors">
          Dismiss
        </button>
      </div>
    </div>
  )
}
