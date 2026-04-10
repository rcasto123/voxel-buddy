// src/components/SpeechBubble.jsx
import { useState, useEffect } from 'react'

/**
 * Props:
 *   notification: { id, source, type, sender: { name }, text }
 *   onDismiss: () => void
 *   onReply: (notificationId, text) => void
 *   autoDismissMs: number (default 8000, 0 = never)
 */
export function SpeechBubble({ notification, onDismiss, onReply, autoDismissMs = 8000 }) {
  const [replyText, setReplyText] = useState('')
  const [sent, setSent] = useState(false)
  const [exiting, setExiting] = useState(false)

  // Auto-dismiss timer
  useEffect(() => {
    if (!autoDismissMs) return
    const timer = setTimeout(() => dismiss(), autoDismissMs)
    return () => clearTimeout(timer)
  }, [autoDismissMs])

  function dismiss() {
    setExiting(true)
    setTimeout(onDismiss, 250) // wait for fade-out animation
  }

  function handleSend() {
    if (!replyText.trim()) return
    onReply(notification.id, replyText.trim())
    setSent(true)
    setReplyText('')
    setTimeout(dismiss, 1000)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') dismiss()
  }

  const typeLabel = notification.type === 'dm' ? 'DM' : notification.type === 'mention' ? 'Mention' : 'Email'
  const sourceLabel = notification.source === 'slack' ? '🔔 Slack' : '📧 Gmail'

  return (
    <div
      className={`
        ${exiting ? 'bubble-exit' : 'bubble-enter'}
        w-72 rounded-2xl border border-buddy-border bg-buddy-surface shadow-2xl shadow-black/40
        flex flex-col gap-2 p-3 text-buddy-text relative
      `}
    >
      {/* Bubble tail (pointing down toward mascot) */}
      <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0 h-0
        border-l-[10px] border-l-transparent
        border-r-[10px] border-r-transparent
        border-t-[10px] border-t-buddy-border" />

      {/* ── Layer 1: Notification ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs text-buddy-muted">{sourceLabel}</span>
            <span className="text-xs bg-buddy-border text-buddy-muted px-1.5 py-0.5 rounded">{typeLabel}</span>
          </div>
          <p className="text-xs font-semibold text-buddy-glow truncate">{notification.sender.name}</p>
          <p className="text-sm leading-snug line-clamp-2 mt-0.5">{notification.text}</p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 text-buddy-muted hover:text-buddy-text text-lg leading-none -mt-0.5"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {/* ── Layer 2: AI quip placeholder ── */}
      <div className="border-t border-buddy-border pt-2">
        <p className="text-xs text-buddy-muted italic">
          💬 <span className="text-buddy-glow/70">Buddy</span>
          {' '}· <span className="text-buddy-muted">AI responses coming in Phase 3</span>
        </p>
      </div>

      {/* ── Layer 3: Reply input ── */}
      <div className="border-t border-buddy-border pt-2 flex gap-2">
        {sent ? (
          <p className="text-xs text-buddy-glow w-full text-center py-1">Sent ✓</p>
        ) : (
          <>
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reply…"
              className="flex-1 bg-buddy-bg border border-buddy-border rounded-lg px-2.5 py-1.5
                text-sm text-buddy-text placeholder:text-buddy-muted
                focus:outline-none focus:border-buddy-glow/60 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!replyText.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-buddy-glow/20 text-buddy-glow
                border border-buddy-glow/30 hover:bg-buddy-glow/30
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </>
        )}
      </div>
    </div>
  )
}
