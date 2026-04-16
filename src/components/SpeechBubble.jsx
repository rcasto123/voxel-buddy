// src/components/SpeechBubble.jsx
import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Props:
 *   notification: { id, source, type, sender: { name }, text }
 *   onDismiss: () => void
 *   onReply: async (notificationId, text) => { ok: boolean, error?: string }
 *   onReplySending: () => void   — called when send starts (triggers thinking animation)
 *   onReplyDone: () => void      — called when send completes (exits thinking)
 *   autoDismissMs: number (default 8000, 0 = never)
 *   suggestions: string[]        — AI reply suggestions (can be empty)
 */
export function SpeechBubble({
  notification,
  onDismiss,
  onReply,
  onReplySending,
  onReplyDone,
  autoDismissMs = 8000,
  suggestions = [],
}) {
  const [replyText, setReplyText] = useState('')
  const [sendState, setSendState] = useState('idle') // 'idle' | 'sending' | 'sent' | 'error'
  const [sendError, setSendError] = useState(null)
  const [exiting, setExiting] = useState(false)
  const [chipsHidden, setChipsHidden] = useState(false)
  const inputRef = useRef(null)

  const onDismissRef = useRef(onDismiss)
  useEffect(() => { onDismissRef.current = onDismiss })

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => onDismissRef.current(), 250)
  }, [])

  const dismissRef = useRef(dismiss)
  useEffect(() => { dismissRef.current = dismiss }, [dismiss])

  const timerRef = useRef(null)
  const clearTimer = useCallback(() => clearTimeout(timerRef.current), [])
  const startTimer = useCallback(() => {
    if (!autoDismissMs) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => dismissRef.current(), autoDismissMs)
  }, [autoDismissMs])

  useEffect(() => { startTimer(); return clearTimer }, [startTimer, clearTimer])

  async function handleSend() {
    if (!replyText.trim() || sendState === 'sending') return
    clearTimer()
    const text = replyText.trim()
    setReplyText('')
    setSendState('sending')
    onReplySending?.()

    try {
      const result = await onReply(notification.id, text)
      onReplyDone?.()

      if (result?.ok === false) {
        setSendState('error')
        setSendError(result.error ?? 'Send failed')
        // Restart timer so error state doesn't stay forever
        startTimer()
      } else {
        setSendState('sent')
        setTimeout(() => dismissRef.current(), 1000)
      }
    } catch (e) {
      onReplyDone?.()
      setSendState('error')
      setSendError(e.message ?? 'Unknown error')
      startTimer()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape') dismiss()
  }

  function handleChipClick(suggestion) {
    setReplyText(suggestion)
    setChipsHidden(true)
    inputRef.current?.focus()
  }

  const typeLabel = notification.type === 'dm' ? 'DM' : notification.type === 'mention' ? 'Mention' : 'Email'
  const sourceLabel = notification.source === 'slack' ? '🔔 Slack' : '📧 Gmail'

  return (
    <div className={`
      ${exiting ? 'bubble-exit pointer-events-none' : 'bubble-enter'}
      w-72 rounded-2xl border border-buddy-border bg-buddy-surface shadow-2xl shadow-black/40
      flex flex-col gap-2 p-3 text-buddy-text relative
    `}>
      {/* Bubble tail */}
      <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0 h-0
        border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent
        border-t-[10px] border-t-buddy-border" />

      {/* Notification */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs text-buddy-muted">{sourceLabel}</span>
            <span className="text-xs bg-buddy-border text-buddy-muted px-1.5 py-0.5 rounded">{typeLabel}</span>
          </div>
          <p className="text-xs font-semibold text-buddy-glow truncate">{notification.sender.name}</p>
          <p className="text-sm leading-snug line-clamp-2 mt-0.5">{notification.text}</p>
        </div>
        <button onClick={dismiss}
          className="shrink-0 text-buddy-muted hover:text-buddy-text text-lg leading-none -mt-0.5"
          aria-label="Dismiss">×</button>
      </div>

      {/* AI suggestion chips — stagger in after the bubble pops */}
      {sendState === 'idle' && !chipsHidden && suggestions.length > 0 && (
        <div className="border-t border-buddy-border pt-2 flex flex-col gap-1.5">
          <p className="text-[10px] text-buddy-muted/60 uppercase tracking-wider chip-in"
             style={{ animationDelay: '0.15s' }}>✨ suggestions</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleChipClick(s)}
                className="bg-white/10 hover:bg-white/20 hover:-translate-y-0.5 text-white/80 text-xs px-2 py-1
                  rounded-full border border-white/10 cursor-pointer transition-all chip-in"
                style={{ animationDelay: `${0.22 + i * 0.06}s` }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reply input */}
      <div className="border-t border-buddy-border pt-2 flex gap-2">
        {sendState === 'sent' && (
          <p className="text-xs text-buddy-glow w-full text-center py-1">Sent ✓</p>
        )}
        {sendState === 'sending' && (
          <div className="w-full flex items-center justify-center gap-1 py-1 text-xs text-buddy-muted">
            <span>Sending</span>
            <span className="typing-dot inline-block">•</span>
            <span className="typing-dot inline-block" style={{ animationDelay: '0.15s' }}>•</span>
            <span className="typing-dot inline-block" style={{ animationDelay: '0.3s' }}>•</span>
          </div>
        )}
        {sendState === 'error' && (
          <div className="flex-1 flex flex-col gap-1.5">
            <p className="text-xs text-red-400">Failed: {sendError}</p>
            <button onClick={() => { setSendState('idle'); setSendError(null) }}
              className="text-xs text-buddy-muted underline text-left">Try again</button>
          </div>
        )}
        {sendState === 'idle' && (
          <>
            <input
              ref={inputRef}
              type="text"
              value={replyText}
              onChange={(e) => { setReplyText(e.target.value); if (e.target.value) setChipsHidden(true) }}
              onKeyDown={handleKeyDown} onFocus={clearTimer} onBlur={startTimer}
              placeholder="Reply…"
              className="flex-1 bg-buddy-bg border border-buddy-border rounded-lg px-2.5 py-1.5
                text-sm text-buddy-text placeholder:text-buddy-muted
                focus:outline-none focus:border-buddy-glow/60 transition-colors"
            />
            <button onClick={handleSend} disabled={!replyText.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-buddy-glow/20 text-buddy-glow
                border border-buddy-glow/30 hover:bg-buddy-glow/30
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Send
            </button>
          </>
        )}
      </div>
    </div>
  )
}
