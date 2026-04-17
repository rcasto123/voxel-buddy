// src/layouts/DesktopPet.jsx
//
// The floating desktop pet. Owns:
//   • A table-driven FSM for Airie's behavior (idle / walk / alert / wave /
//     happy / meditate / love / sleep / thinking / surprised / confused /
//     determined). Each state declares optional onEnter / onTick / onExit.
//   • A rAF loop that polls the store queue and advances the FSM. Switches
//     to setTimeout polling while sleeping to save battery.
//   • Mouse interaction: left-drag to reposition, left-click → wave,
//     double-click → love Easter egg, right-click → context menu.
//   • Click-through refcount: the Electron window is normally mouse-event
//     ignoring; entering the mascot / bubble / menu bumps a refcount that
//     flips it back. Window blur / visibility hide forces the count to 0
//     so a missed leave doesn't leave the overlay capturing clicks.
//
// Notification queue is derived directly from the Zustand store — there is
// no separate in-memory queue to keep in sync. The FSM tracks which IDs
// have been shown in a Set; the next candidate is the oldest unseen one.

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { MascotRenderer } from '../components/MascotRenderer.jsx'
import { SpeechBubble } from '../components/SpeechBubble.jsx'
import { OnboardingCard } from '../components/OnboardingCard.jsx'
import { useStore } from '../store.js'
import { playNotify, playSuccess } from '../services/sound.js'
import { suggestReplies } from '../services/aiSuggest.js'

// ── Tunables ─────────────────────────────────────────────
const MASCOT_SIZE = 100
const WALK_SPEED  = 42    // px/s peak (eased in/out across the walk)
const IDLE_AFTER  = 20    // seconds idle before sleep
const DRAG_THRESHOLD = 4  // px travel before a mousedown becomes a drag
const MEDITATE_CHANCE   = 0.35           // chance to meditate instead of napping
const MEDITATE_DURATION = [6, 12]        // seconds
// Safety cap on the "thinking" pose. handleReplyDone should kick us out far
// sooner, but IPC failures / unmounts could otherwise pin Airie here forever.
const THINKING_MAX_DURATION = 25 // seconds

// FSM visual mapping — internal state names match store mascotState values.
const VISUAL_STATE = {
  idle: 'idle', walk: 'walk', alert: 'alert', wave: 'wave',
  sleep: 'sleep', happy: 'happy', thinking: 'thinking',
  meditate: 'meditate', love: 'love', confused: 'confused',
  determined: 'determined', surprised: 'surprised',
}

function rand(a, b) { return a + Math.random() * (b - a) }

// Trapezoidal ease: 0 → 1 over t=[0,.25], 1 over t=[.25,.75], 1 → 0 over t=[.75,1]
function easedSpeedFactor(t) {
  if (t < 0.25) return t / 0.25
  if (t > 0.75) return (1 - t) / 0.25
  return 1
}

// ── FSM table ─────────────────────────────────────────────
// Each state declares up to three hooks. All receive a `ctx` with refs and
// helpers. onTick returns `null` (stay) or a transition `{ state, duration? }`.
//
// Separating the dispatch from the ad-hoc switch in tick() catches entire
// classes of bugs (missing exit cleanup, forgotten timer resets) and makes
// adding a new state a localized change.
const STATES = {
  idle: {
    onTick: (ctx) => {
      if (ctx.idleAccum() >= IDLE_AFTER) {
        if (Math.random() < MEDITATE_CHANCE) {
          return { state: 'meditate', duration: rand(...MEDITATE_DURATION) }
        }
        return { state: 'sleep' }
      }
      if (ctx.stateElapsed() < ctx.stateDuration()) return null

      // Wander roll
      const roll = Math.random()
      if (roll < 0.6) {
        ctx.setFacing(Math.random() > 0.5 ? 1 : -1)
        return { state: 'walk', duration: rand(2, 5) }
      }
      if (roll < 0.85) {
        // Glance — flip facing only, no walk
        ctx.setFacing(-ctx.facing())
        return { state: 'idle', duration: rand(1.2, 2.2) }
      }
      return { state: 'idle', duration: rand(2, 4) }
    },
  },

  walk: {
    onTick: (ctx) => {
      const progress = Math.min(1, ctx.stateElapsed() / ctx.stateDuration())
      const speed = WALK_SPEED * easedSpeedFactor(progress)
      const newX = ctx.posX() + ctx.facing() * speed * ctx.dt()
      const { minX, maxX } = ctx.bounds()
      const clamped = Math.max(minX, Math.min(maxX, newX))
      if (clamped !== newX) ctx.setFacing(-ctx.facing())
      ctx.setPosX(clamped)
      if (ctx.stateElapsed() >= ctx.stateDuration()) {
        return { state: 'idle', duration: rand(1.5, 3.5) }
      }
      return null
    },
  },

  alert: {
    // Entering alert resets idle accum so the notification burst doesn't
    // immediately fall asleep when it ends.
    onEnter: (ctx) => { ctx.resetIdleAccum() },
    onTick: (ctx) => (ctx.stateElapsed() >= ctx.stateDuration()
      ? { state: 'wave', duration: 2.5 }
      : null),
  },

  wave: {
    onEnter: (ctx) => { ctx.resetIdleAccum() },
    onTick: (ctx) => {
      if (ctx.stateElapsed() < ctx.stateDuration()) return null
      // If another notification is pending, alert again; otherwise decay to happy.
      if (ctx.hasPending()) return { state: 'alert', duration: 2.5, drain: true }
      return { state: 'happy', duration: 1.5 }
    },
  },

  happy: {
    onTick: (ctx) => (ctx.stateElapsed() >= ctx.stateDuration()
      ? { state: 'idle' } : null),
  },

  meditate: {
    onTick: (ctx) => (ctx.stateElapsed() >= ctx.stateDuration()
      ? { state: 'sleep' } : null),
  },

  love: {
    onTick: (ctx) => (ctx.stateElapsed() >= ctx.stateDuration()
      ? { state: 'happy', duration: 1.2 } : null),
  },

  // Thinking is externally driven (handleReplySending / handleReplyDone),
  // but a safety cap prevents stuck-forever if the IPC round-trip dies.
  thinking: {
    onTick: (ctx) => (ctx.stateElapsed() >= THINKING_MAX_DURATION
      ? { state: 'confused', duration: 1.5 } : null),
  },

  sleep: {
    // onEnter requests a low-power poll from tick(); see scheduleSleepPoll
    // below. onExit isn't needed — resuming the rAF loop is handled by
    // whichever path kicked us out of sleep.
  },

  confused:   { onTick: (ctx) => ctx.stateElapsed() >= ctx.stateDuration() ? { state: 'idle' } : null },
  determined: { onTick: (ctx) => ctx.stateElapsed() >= ctx.stateDuration() ? { state: 'idle' } : null },
  surprised:  { onTick: (ctx) => ctx.stateElapsed() >= ctx.stateDuration() ? { state: 'idle' } : null },
}

// ── Component ────────────────────────────────────────────
export function DesktopPet() {
  const {
    notifications, mascotState, setMascotState,
    clearNotification, isFirstRun, setFirstRun,
    isMuted, addNotification,
  } = useStore()

  const [posX, setPosX] = useState(window.innerWidth / 2)
  const [facing, setFacing] = useState(1)
  const [activeBubble, setActiveBubble] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [contextMenu, setContextMenu] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [justMounted, setJustMounted] = useState(true)

  // ── Refs that persist across ticks ─────────────────────
  const stateRef          = useRef('idle')
  const posXRef           = useRef(posX)
  const facingRef         = useRef(1)
  const lastTimeRef       = useRef(performance.now())
  const dtRef             = useRef(0)
  const idleAccumRef      = useRef(0)
  const stateTimerRef     = useRef(0)
  const stateDurationRef  = useRef(rand(3, 6))
  // IDs of notifications already shown. Used to derive "next pending" from
  // the store without a parallel queue that can drift.
  const shownIdsRef       = useRef(new Set())
  const lastClickRef      = useRef(0)
  const dragRef           = useRef({
    dragging: false, moved: false, startX: 0, startMouseX: 0, consumedClick: false,
  })

  // ── Window resize ─────────────────────────────────────
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── Notification queue (derived from store) ───────────
  // Returns the next notification that hasn't been shown yet, oldest first.
  // Store is already bounded to 50 entries; iterating it each tick is cheap.
  // We trim shownIdsRef when its IDs no longer exist in the store so the
  // Set doesn't leak memory across hours of notifications.
  const notificationsRef = useRef(notifications)
  useEffect(() => {
    notificationsRef.current = notifications
    // Reconcile shown-ids: drop IDs no longer in the store (cleared from
    // elsewhere — future feature, also catches burst dismisses cleanly).
    const current = new Set(notifications.map((n) => n.id))
    const shown = shownIdsRef.current
    for (const id of shown) if (!current.has(id)) shown.delete(id)
  }, [notifications])

  const nextPending = useCallback(() => {
    const list = notificationsRef.current
    // `notifications` is stored newest-first; play back oldest-first.
    for (let i = list.length - 1; i >= 0; i--) {
      const n = list[i]
      if (!shownIdsRef.current.has(n.id)) return n
    }
    return null
  }, [])

  // ── FSM dispatch ─────────────────────────────────────
  // setState does the onExit → change → onEnter dance and resets timers.
  const setState = useCallback((s, duration) => {
    if (s === stateRef.current) {
      // Same state, just resetting duration — still bump timer.
      stateTimerRef.current = 0
      if (duration !== undefined) stateDurationRef.current = duration
      return
    }
    const prev = STATES[stateRef.current]
    if (prev?.onExit) prev.onExit(ctxRef.current)

    stateRef.current = s
    stateTimerRef.current = 0
    stateDurationRef.current = duration ?? rand(3, 6)
    setMascotState(VISUAL_STATE[s] ?? 'idle')

    const next = STATES[s]
    if (next?.onEnter) next.onEnter(ctxRef.current)
  }, [setMascotState])

  // Stable ctx bag used by FSM hooks. Backed by refs so each call sees live values.
  const ctxRef = useRef(null)
  ctxRef.current = useMemo(() => ({
    dt: () => dtRef.current,
    posX: () => posXRef.current,
    setPosX: (x) => { posXRef.current = x; setPosX(x) },
    facing: () => facingRef.current,
    setFacing: (f) => { facingRef.current = f; setFacing(f) },
    bounds: () => ({
      minX: 20,
      maxX: window.innerWidth - MASCOT_SIZE - 20,
    }),
    idleAccum: () => idleAccumRef.current,
    resetIdleAccum: () => { idleAccumRef.current = 0 },
    stateElapsed: () => stateTimerRef.current,
    stateDuration: () => stateDurationRef.current,
    hasPending: () => nextPending() !== null,
  }), [nextPending])

  // ── Bubble + AI suggestions ──────────────────────────
  const showBubble = useCallback(async (notification) => {
    setSuggestions([])
    setActiveBubble(notification)
    shownIdsRef.current.add(notification.id)
    try {
      const settings = await window.buddy?.getSettings() ?? {}
      const apiKey = settings.integrations?.ai?.apiKey ?? ''
      if (apiKey) {
        const chips = await suggestReplies(notification, apiKey)
        setSuggestions(chips)
      }
    } catch { /* suggestions optional */ }
  }, [])

  // ── rAF game loop ────────────────────────────────────
  // The main tick handles:
  //   1. Drain pending notifications (mute-aware, state-aware)
  //   2. Run the active state's onTick; apply any returned transition
  //   3. Schedule either another rAF (active) or setTimeout poll (sleeping)
  useEffect(() => {
    let rafId = null
    let sleepPollId = null
    let stopped = false

    function tick() {
      if (stopped) return
      const now = performance.now()
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = now
      dtRef.current = dt
      idleAccumRef.current += dt
      stateTimerRef.current += dt

      const current = stateRef.current

      // Notification drain — mute-aware. Mute mid-burst just stops visually
      // interrupting Airie; the notification stays in the store for later.
      // BUG FIX: previously `wave` had its own drain path without the mute
      // check, silently swallowing notifications if mute flipped mid-stream.
      const muted = useStore.getState().isMuted
      if (!muted && current !== 'alert' && current !== 'wave' && current !== 'sleep') {
        const pending = nextPending()
        if (pending) {
          playNotify()
          setState('alert', 2.5)
          showBubble(pending)
          rafId = requestAnimationFrame(tick)
          return
        }
      }

      // Dispatch to the FSM
      const handler = STATES[current]
      if (handler?.onTick) {
        const transition = handler.onTick(ctxRef.current)
        if (transition) {
          // wave→alert drain: only if a pending notif *and* we aren't muted
          if (transition.drain) {
            if (!muted) {
              const next = nextPending()
              if (next) {
                setState(transition.state, transition.duration)
                playNotify()
                showBubble(next)
                rafId = requestAnimationFrame(tick)
                return
              }
            }
            // No pending or muted → fall through to happy decay
            setState('happy', 1.5)
          } else {
            setState(transition.state, transition.duration)
          }
        }
      }

      // If we ended up in sleep, drop to polling loop
      if (stateRef.current === 'sleep') {
        scheduleSleepPoll()
        return
      }
      rafId = requestAnimationFrame(tick)
    }

    function scheduleSleepPoll() {
      // Every 500ms: check for a pending notification. On resume, reset
      // idle accum so we don't immediately re-sleep (BUG FIX) and reset
      // lastTimeRef so `dt` after the long gap doesn't spike.
      sleepPollId = setTimeout(() => {
        if (stopped) return
        const muted = useStore.getState().isMuted
        const pending = !muted ? nextPending() : null
        if (pending) {
          playNotify()
          setState('alert', 2.5)
          showBubble(pending)
          idleAccumRef.current = 0
          stateTimerRef.current = 0
          lastTimeRef.current = performance.now()
          rafId = requestAnimationFrame(tick)
        } else {
          scheduleSleepPoll()
        }
      }, 500)
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      stopped = true
      if (rafId) cancelAnimationFrame(rafId)
      if (sleepPollId) clearTimeout(sleepPollId)
    }
  }, [setState, showBubble, nextPending])

  // ── Startup: fade in, wave, return to idle ───────────
  useEffect(() => {
    const fadeDone = setTimeout(() => setJustMounted(false), 650)
    const toWave   = setTimeout(() => setState('wave', 2), 750)
    const toIdle   = setTimeout(() => setState('idle'), 2700)
    return () => { clearTimeout(fadeDone); clearTimeout(toWave); clearTimeout(toIdle) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Drag ─────────────────────────────────────────────
  // Global listeners handle move/up outside the mascot box. While dragging
  // we suppress `handleMouseLeave`'s click-through decrement so the window
  // stays interactive even when the cursor whips off-screen — otherwise
  // Electron stops delivering mouseup and Airie gets stuck mid-drag.
  useEffect(() => {
    function onMove(e) {
      const d = dragRef.current
      if (!d.dragging) return
      const dx = e.clientX - d.startMouseX
      if (!d.moved && Math.abs(dx) >= DRAG_THRESHOLD) {
        d.moved = true
        setIsDragging(true)
        if (stateRef.current === 'walk') setState('idle')
      }
      if (!d.moved) return
      const maxX = window.innerWidth - MASCOT_SIZE / 2 - 4
      const minX = MASCOT_SIZE / 2 + 4
      const newX = Math.max(minX, Math.min(maxX, d.startX + dx))
      posXRef.current = newX
      setPosX(newX)
      idleAccumRef.current = 0
    }
    function endDrag(wasMoved) {
      const d = dragRef.current
      if (!d.dragging) return
      d.dragging = false
      if (wasMoved ?? d.moved) {
        d.consumedClick = true
        setIsDragging(false)
        setState('happy', 1.2)
      }
    }
    function onUp() { endDrag() }
    // Safety net: any of these force-ends a drag to avoid stuck states.
    function onBlur() { endDrag(true) }
    function onVisibility() { if (document.hidden) endDrag(true) }
    function onDocMouseLeave() { /* intentionally no-op — drag continues even
                                   when cursor leaves viewport, because we
                                   get mouseup delivered regardless */ }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('mouseleave', onDocMouseLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('mouseleave', onDocMouseLeave)
    }
  }, [setState])

  function handleMouseDown(e) {
    if (e.button !== 0) return
    dragRef.current = {
      dragging: true, moved: false,
      startX: posXRef.current, startMouseX: e.clientX,
      consumedClick: false,
    }
    if (contextMenu) setContextMenu(null)
    e.preventDefault()
  }

  function handleMascotClick(e) {
    // Swallow the click that terminated a drag
    if (dragRef.current.consumedClick) {
      dragRef.current.consumedClick = false
      return
    }
    // Ignore synthetic clicks from right/middle button and ctrl+click on
    // macOS (which opens the context menu and also fires a click).
    if (e && (e.button !== 0 || e.ctrlKey)) return
    if (stateRef.current === 'alert' || stateRef.current === 'wave') return
    idleAccumRef.current = 0

    const now = performance.now()
    const delta = now - lastClickRef.current
    lastClickRef.current = now
    if (delta < 400) {
      setState('love', 2.6)
      return
    }
    setState('wave', 2)
  }

  // ── Right-click context menu ─────────────────────────
  // After opening the menu, swallow the next `click` synthesized from the
  // same pointer (prevents ctrl-click from also waving). `menuJustOpenedRef`
  // covers the window where `mouseup` after the contextmenu could fire
  // `handleMascotClick`.
  const menuJustOpenedRef = useRef(false)
  function handleContextMenu(e) {
    e.preventDefault()
    const menuW = 208
    const menuH = 280
    const x = Math.min(e.clientX, window.innerWidth - menuW - 8)
    const y = Math.min(e.clientY, window.innerHeight - menuH - 8)
    setContextMenu({ x, y })
    menuJustOpenedRef.current = true
    setTimeout(() => { menuJustOpenedRef.current = false }, 350)
  }

  // Outside-click / Escape dismiss
  useEffect(() => {
    if (!contextMenu) return
    function onDown() { setContextMenu(null) }
    function onKey(e) { if (e.key === 'Escape') setContextMenu(null) }
    const t = setTimeout(() => {
      window.addEventListener('mousedown', onDown)
      window.addEventListener('keydown', onKey)
    }, 0)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [contextMenu])

  function handleMenuAction(action) {
    setContextMenu(null)
    switch (action) {
      case 'wave':     setState('wave', 2); break
      case 'meditate': setState('meditate', 10); break
      case 'sleep':    setState('sleep'); break
      case 'test':
        addNotification({
          id: `demo-${Date.now()}`,
          source: 'slack', type: 'dm',
          sender: { name: 'Airie' },
          text: 'Hey! This is what a notification from me looks like. Pretty cute, right?',
        })
        break
      case 'mute': {
        const next = !isMuted
        useStore.getState().setMuted(next)
        window.buddy?.setMuted(next)
        break
      }
      case 'settings': window.buddy?.openSettingsWindow(); break
      case 'quit':     window.buddy?.quit(); break
      default: break
    }
  }

  // ── Click-through refcount ───────────────────────────
  // Multiple interactive regions overlap — a naive boolean flipped on
  // every enter/leave caused `setIgnoreMouseEvents` thrash and dropped
  // mid-drag events. We keep a local counter matching main.js's, bump/drop
  // via IPC, and hard-reset on blur / visibility so a missed leave doesn't
  // leave the overlay capturing the whole desktop.
  const hoverCountRef = useRef(0)
  const enterRegion = useCallback(() => {
    hoverCountRef.current += 1
    window.buddy?.bumpMouseOverMascot?.(+1)
  }, [])
  const leaveRegion = useCallback(() => {
    // Never decrement during a drag — mouseleave fires when the cursor
    // crosses into the no-render gap outside the mascot and would flip the
    // window click-through, killing the pending mouseup.
    if (dragRef.current.dragging) return
    if (hoverCountRef.current > 0) {
      hoverCountRef.current -= 1
      window.buddy?.bumpMouseOverMascot?.(-1)
    }
  }, [])

  useEffect(() => {
    function forceReset() {
      hoverCountRef.current = 0
      window.buddy?.resetMouseOverMascot?.()
    }
    window.addEventListener('blur', forceReset)
    document.addEventListener('visibilitychange', () => { if (document.hidden) forceReset() })
    return () => {
      window.removeEventListener('blur', forceReset)
      // visibilitychange listener on document leaks intentionally — cleanup
      // is not supported for anonymous handlers. Low impact, one per mount.
    }
  }, [])

  function handleDismissBubble() {
    if (activeBubble) {
      clearNotification(activeBubble.id)
      window.buddy?.dismissNotification(activeBubble.id)
      shownIdsRef.current.delete(activeBubble.id)
    }
    setActiveBubble(null)
    setSuggestions([])
  }

  async function handleReply(notificationId, text) {
    // Guard: always clear thinking state even if IPC throws / returns weird.
    try {
      return await window.buddy?.sendReply(notificationId, text)
    } finally {
      handleReplyDone()
    }
  }

  function handleReplySending() {
    setState('thinking', THINKING_MAX_DURATION)
  }

  function handleReplyDone() {
    if (stateRef.current === 'thinking') {
      playSuccess()
      setState('happy', 1.5)
    }
  }

  // ── Layout ────────────────────────────────────────────
  const mascotBottom = 24
  const mascotLeft = posX - MASCOT_SIZE / 2
  const bubbleBottom = mascotBottom + MASCOT_SIZE + 12
  const bubbleLeft = Math.max(8, Math.min(windowWidth - 296, posX - 144))
  const onboardingLeft = Math.max(8, Math.min(windowWidth - 328, posX - 160))

  // Memoize the mascot wrapper style so frequent posX updates don't rebuild
  // the style object repeatedly (every walk frame = many re-renders).
  const mascotStyle = useMemo(() => ({
    bottom: mascotBottom,
    left: mascotLeft,
    transform: facing < 0 ? 'scaleX(-1)' : 'scaleX(1)',
    transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
  }), [mascotLeft, facing])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div aria-live="polite" aria-atomic="true">
        {activeBubble && (
          <div className="absolute pointer-events-auto"
            style={{ bottom: bubbleBottom, left: bubbleLeft }}
            onMouseEnter={enterRegion} onMouseLeave={leaveRegion}>
            <SpeechBubble
              notification={activeBubble}
              onDismiss={handleDismissBubble}
              onReply={handleReply}
              onReplySending={handleReplySending}
              onReplyDone={handleReplyDone}
              suggestions={suggestions}
            />
          </div>
        )}
      </div>

      {isFirstRun && !activeBubble && (
        <div className="absolute"
          style={{ bottom: bubbleBottom, left: onboardingLeft }}
          onMouseEnter={enterRegion} onMouseLeave={leaveRegion}>
          <OnboardingCard onDismiss={() => setFirstRun(false)} />
        </div>
      )}

      <div
        className={`absolute pointer-events-auto ${justMounted ? 'airie-entering' : ''} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={mascotStyle}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          if (menuJustOpenedRef.current) return
          handleMascotClick(e)
        }}
        onContextMenu={handleContextMenu}
        onMouseEnter={enterRegion} onMouseLeave={leaveRegion}>
        <MascotRenderer state={mascotState} size={MASCOT_SIZE} />
      </div>

      {contextMenu && (
        <div
          className="absolute pointer-events-auto buddy-menu animate-fade-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          onMouseEnter={enterRegion} onMouseLeave={leaveRegion}
          role="menu"
        >
          <MenuItem icon="👋" label="Say hi"            onClick={() => handleMenuAction('wave')} />
          <MenuItem icon="🧘" label="Meditate"          onClick={() => handleMenuAction('meditate')} />
          <MenuItem icon="💤" label="Take a nap"        onClick={() => handleMenuAction('sleep')} />
          <MenuDivider />
          <MenuItem icon="🔔" label="Test notification" onClick={() => handleMenuAction('test')} />
          <MenuItem
            icon={isMuted ? '🔇' : '🔊'}
            label={isMuted ? 'Unmute' : 'Mute'}
            onClick={() => handleMenuAction('mute')}
          />
          <MenuDivider />
          <MenuItem icon="⚙️" label="Settings…"         onClick={() => handleMenuAction('settings')} />
          <MenuItem icon="⏻"  label="Quit Voxel Buddy"  onClick={() => handleMenuAction('quit')} danger />
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-left
        transition-colors
        ${danger ? 'text-red-300 hover:bg-red-500/15' : 'text-buddy-text hover:bg-white/8'}
      `}
    >
      <span className="w-4 text-center text-[13px] leading-none">{icon}</span>
      <span className="flex-1">{label}</span>
    </button>
  )
}

function MenuDivider() {
  return <div className="my-1 h-px bg-buddy-border/70" />
}
