// src/components/OnboardingCard.jsx
// First-run welcome card — shown above the mascot when no Slack tokens are configured.
// Guides the user through connecting Slack and opening Settings.

export function OnboardingCard({ onDismiss }) {
  function openSettings() {
    window.buddy?.openSettingsWindow()
  }

  function openSlackDocs() {
    window.buddy?.openExternal('https://api.slack.com/apps')
  }

  return (
    <div
      className="w-80 rounded-2xl border border-buddy-border bg-buddy-surface shadow-2xl shadow-black/40
        flex flex-col gap-3 p-4 text-buddy-text pointer-events-auto"
      onMouseEnter={() => window.buddy?.setMouseOverMascot(true)}
      onMouseLeave={() => window.buddy?.setMouseOverMascot(false)}
    >
      {/* Bubble tail pointing down toward mascot */}
      <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0 h-0
        border-l-[10px] border-l-transparent
        border-r-[10px] border-r-transparent
        border-t-[10px] border-t-buddy-border" />

      <div className="flex items-center gap-2">
        <span className="text-xl">👋</span>
        <h2 className="text-sm font-bold text-buddy-glow">Welcome to Voxel Buddy!</h2>
      </div>

      <p className="text-xs text-buddy-muted leading-relaxed">
        Connect Slack to start getting notifications. It only takes a minute.
      </p>

      <ol className="flex flex-col gap-2">
        {[
          { num: '1', text: 'Create a Slack app', action: openSlackDocs, link: 'api.slack.com/apps' },
          { num: '2', text: 'Paste your App Token + Bot Token in Settings', action: openSettings, link: 'Open Settings' },
          { num: '3', text: "That's it — Buddy watches your DMs!", action: null, link: null },
        ].map(({ num, text, action, link }) => (
          <li key={num} className="flex items-start gap-2.5">
            <span className="shrink-0 w-5 h-5 rounded-full bg-buddy-glow/20 text-buddy-glow
              text-xs font-bold flex items-center justify-center mt-0.5">
              {num}
            </span>
            <span className="text-xs text-buddy-muted">
              {text}
              {action && link && (
                <>
                  {' — '}
                  <button
                    type="button"
                    onClick={action}
                    className="text-buddy-glow underline underline-offset-2 hover:text-buddy-glow/80 transition-colors"
                  >
                    {link}
                  </button>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={openSettings}
          className="flex-1 py-2 rounded-xl text-xs font-semibold bg-buddy-glow/20 text-buddy-glow
            border border-buddy-glow/30 hover:bg-buddy-glow/30 transition-colors"
        >
          Open Settings
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-4 py-2 rounded-xl text-xs text-buddy-muted border border-buddy-border
            hover:text-buddy-text hover:border-buddy-glow/30 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
