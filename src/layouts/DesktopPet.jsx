// src/layouts/DesktopPet.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { MascotRenderer } from '../components/MascotRenderer.jsx'
import { SpeechBubble } from '../components/SpeechBubble.jsx'
import { OnboardingCard } from '../components/OnboardingCard.jsx'
import { useStore } from '../store.js'
import { playNotify, playSuccess } from '../services/sound.js'
import { suggestReplies } from '../services/aiSuggest.js'

const MASCOT_SIZE = 100
const WALK_SPEED = 42   // px/s — peak speed (eased in/out during the walk)
const IDLE_AFTER = 20   // seconds of inactivity before sleep

function rand(a, b) { return a + Math.random() * (b - a) }

// Eased speed curve — accelerates in, cruises, decelerates out so walk starts
// and ends feel natural instead of teleporting to full speed.
function easedSpeedFactor(t) {
  // t in [0, 1]. Returns a value in [0, 1] with a smooth trapezoid shape:
  // 0 → ramp up to 1 by t=0.25, cruise until t=0.75, ramp down to 0 by t=1.
  if (t < 0.25) return t / 0.25
  if (t > 0.75) return (1 - t) / 0.25
  return 1
}

const VISUAL_STATE = {
  idle: 'idle', walk: 'walk', alert: 'alert',
  wave: 'wave', sleep: 'sleep', happy: 'happy', thinking: 'thinking',
  // Extended behaviors from the sprite sheet
  meditate: 'meditate', love: 'love', confused: 'confused',
  determined: 'determined', surprised: 'surprised',
}

// Before falling fully asleep, sometimes meditate for a while — lends Airie
// a bit of personality and reads as "chilling" rather than "ignored".
const MEDITATE_CHANCE = 0.35
const MEDITATE_DURATION = [6, 12]  // seconds

// Pixels of mouse travel before a mousedown turns into a drag (vs. a click).
// Below the threshold we treat the release as a click (wave / love Easter egg);
// above it, we suppress the click and keep dragging.
const DRAG_THRESHOLD = 4

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
  const [contextMenu, setContextMenu] = useState(null) // { x, y } in viewport px
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Hello on launch — Airie fades/grows in, then waves hi.
  // Start idle (so the fade happens on a calm pose), wave after the fade,
  // then return to normal idle. The rAF loop takes over afterward.
  const [justMounted, setJustMounted] = useState(true)
  useEffect(() => {
    const fadeDone = setTimeout(() => setJustMounted(false), 650)
    const toWave   = setTimeout(() => setMascotState('wave'), 750)
    const toIdle   = setTimeout(() => setMascotState('idle'), 2700)
    return () => { clearTimeout(fadeDone); clearTimeout(toWave); clearTimeout(toIdle) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stateRef = useRef('idle')
  const posXRef = useRef(posX)
  const facingRef = useRef(1)
  const lastTimeRef = useRef(performance.now())
  const idleAccumRef = useRef(0)
  const stateTimerRef = useRef(0)
  const stateDurationRef = useRef(rand(3, 6))
  const notificationQueueRef = useRef([])
  const rafRef = useRef(null)

  const setState = useCallback((s, duration) => {
    stateRef.current = s
    stateTimerRef.current = 0
    stateDurationRef.current = duration ?? rand(3, 6)
    setMascotState(VISUAL_STATE[s] ?? 'idle')
    if (s === 'alert' || s === 'wave') idleAccumRef.current = 0
  }, [setMascotState])

  // Show a notification bubble and kick off AI suggestions in the background
  const showBubble = useCallback(async (notification) => {
    setSuggestions([])
    setActiveBubble(notification)
    try {
      const settings = await window.buddy?.getSettings() ?? {}
      const apiKey = settings.integrations?.ai?.apiKey ?? ''
      if (apiKey) {
        const chips = await suggestReplies(notification, apiKey)
        setSuggestions(chips)
      }
    } catch {
      // suggestions are optional — never block
    }
  }, [])

  // Enqueue all unseen notifications — scan the full array to avoid race
  useEffect(() => {
    const queued = new Set(notificationQueueRef.current.map((n) => n.id))
    for (const n of notifications) {
      if (!queued.has(n.id)) notificationQueueRef.current.push(n)
    }
  }, [notifications])

  // Game loop — uses setTimeout instead of rAF during sleep for battery savings
  useEffect(() => {
    let rafId = null
    let sleepPollId = null

    function tick() {
      const now = performance.now()
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = now
      idleAccumRef.current += dt
      stateTimerRef.current += dt

      const maxX = window.innerWidth - MASCOT_SIZE - 20
      const minX = 20
      const current = stateRef.current
      const queue = notificationQueueRef.current

      if (queue.length > 0 && current !== 'alert' && current !== 'wave') {
        const next = queue.shift()
        if (!useStore.getState().isMuted) {
          playNotify()
          setState('alert', 2.5)
          showBubble(next)
        }
      } else if (current === 'idle') {
        if (idleAccumRef.current >= IDLE_AFTER) {
          // 35% of the time: meditate first (zen float) before napping.
          // Keeps Airie visually alive during long idle stretches.
          if (Math.random() < MEDITATE_CHANCE) {
            setState('meditate', rand(...MEDITATE_DURATION))
          } else {
            setState('sleep')
            return scheduleSleepPoll()
          }
        } else if (stateTimerRef.current >= stateDurationRef.current) {
          // Wander personality:
          //   60% — walk off in a random direction for 2-5s
          //   25% — quick "glance" in the opposite direction (just a turn, no walk)
          //   15% — stand and stare for another 2-4s (extend idle)
          const roll = Math.random()
          if (roll < 0.6) {
            facingRef.current = Math.random() > 0.5 ? 1 : -1
            setFacing(facingRef.current)
            setState('walk', rand(2, 5))
          } else if (roll < 0.85) {
            facingRef.current = -facingRef.current
            setFacing(facingRef.current)
            setState('idle', rand(1.2, 2.2))
          } else {
            setState('idle', rand(2, 4))
          }
        }
      } else if (current === 'walk') {
        // Eased speed — acceleration at the start, deceleration at the end.
        const progress = Math.min(1, stateTimerRef.current / stateDurationRef.current)
        const speed = WALK_SPEED * easedSpeedFactor(progress)
        const newX = posXRef.current + facingRef.current * speed * dt
        const clamped = Math.max(minX, Math.min(maxX, newX))
        if (clamped !== newX) { facingRef.current = -facingRef.current; setFacing(facingRef.current) }
        posXRef.current = clamped
        setPosX(clamped)
        if (stateTimerRef.current >= stateDurationRef.current) setState('idle', rand(1.5, 3.5))
      } else if (current === 'alert') {
        if (stateTimerRef.current >= stateDurationRef.current) setState('wave', 2.5)
      } else if (current === 'wave') {
        if (stateTimerRef.current >= stateDurationRef.current) {
          if (queue.length > 0) { setState('alert', 2.5); showBubble(queue.shift()) }
          else setState('happy', 1.5)
        }
      } else if (current === 'happy') {
        if (stateTimerRef.current >= stateDurationRef.current) setState('idle')
      } else if (current === 'meditate') {
        // Meditation is interruptible by notifications (handled at top of tick).
        // Otherwise hold the pose for the full duration, then go to sleep.
        if (stateTimerRef.current >= stateDurationRef.current) {
          setState('sleep')
          return scheduleSleepPoll()
        }
      } else if (current === 'love') {
        if (stateTimerRef.current >= stateDurationRef.current) setState('happy', 1.2)
      } else if (current === 'thinking') {
        // Thinking is controlled externally (during reply send) — no auto-transition
      } else if (current === 'sleep') {
        return scheduleSleepPoll()
      }

      rafId = requestAnimationFrame(tick)
    }

    function scheduleSleepPoll() {
      // In sleep: check for notifications every 500 ms instead of every frame
      sleepPollId = setTimeout(() => {
        const queue = notificationQueueRef.current
        if (queue.length > 0) {
          const next = queue.shift()
          if (!useStore.getState().isMuted) {
            playNotify()
            setState('alert', 2.5)
            showBubble(next)
          }
          lastTimeRef.current = performance.now()
          rafId = requestAnimationFrame(tick) // resume full loop
        } else {
          scheduleSleepPoll()
        }
      }, 500)
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      if (sleepPollId) clearTimeout(sleepPollId)
    }
  }, [setState, showBubble])

  // Double-click timer for the love Easter egg
  const lastClickRef = useRef(0)

  // ── Drag state ─────────────────────────────────────────
  // dragging: mousedown seen; moved: threshold exceeded → true drag in progress.
  // We only flip isDragging (state) once `moved` crosses the threshold so the
  // click-consumed-by-drag guard in handleMascotClick stays consistent even
  // for tiny jitters.
  const dragRef = useRef({ dragging: false, moved: false, startX: 0, startMouseX: 0, consumedClick: false })

  useEffect(() => {
    function onMove(e) {
      const d = dragRef.current
      if (!d.dragging) return
      const dx = e.clientX - d.startMouseX
      if (!d.moved && Math.abs(dx) >= DRAG_THRESHOLD) {
        d.moved = true
        setIsDragging(true)
        // Stop the rAF state machine from fighting us — pin to idle visually.
        if (stateRef.current === 'walk') setState('idle')
      }
      if (!d.moved) return
      const maxX = window.innerWidth - MASCOT_SIZE / 2 - 4
      const minX = MASCOT_SIZE / 2 + 4
      const newX = Math.max(minX, Math.min(maxX, d.startX + dx))
      posXRef.current = newX
      setPosX(newX)
      // Reset idle accum so she doesn't immediately snooze after being moved
      idleAccumRef.current = 0
    }
    function onUp() {
      const d = dragRef.current
      if (!d.dragging) return
      d.dragging = false
      if (d.moved) {
        d.consumedClick = true
        setIsDragging(false)
        // Little happy wiggle after being placed — feels responsive.
        setState('happy', 1.2)
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [setState])

  function handleMouseDown(e) {
    if (e.button !== 0) return // left only
    dragRef.current = {
      dragging: true, moved: false,
      startX: posXRef.current, startMouseX: e.clientX,
      consumedClick: false,
    }
    // Dismiss any open menu
    if (contextMenu) setContextMenu(null)
    e.preventDefault()
  }

  function handleMascotClick() {
    // Swallow the click that terminated a drag
    if (dragRef.current.consumedClick) {
      dragRef.current.consumedClick = false
      return
    }
    if (stateRef.current === 'alert' || stateRef.current === 'wave') return
    idleAccumRef.current = 0

    const now = performance.now()
    const delta = now - lastClickRef.current
    lastClickRef.current = now
    if (delta < 400) {
      // Double-click within 400ms → Airie shows affection
      setState('love', 2.6)
      return
    }
    setState('wave', 2)
  }

  // ── Right-click context menu ───────────────────────────
  function handleContextMenu(e) {
    e.preventDefault()
    // Clamp so the menu stays on screen (menu is ~200×260)
    const menuW = 208
    const menuH = 280
    const x = Math.min(e.clientX, window.innerWidth - menuW - 8)
    const y = Math.min(e.clientY, window.innerHeight - menuH - 8)
    setContextMenu({ x, y })
  }

  // Global dismiss of the menu on outside click / Escape
  useEffect(() => {
    if (!contextMenu) return
    function onDown() { setContextMenu(null) }
    function onKey(e) { if (e.key === 'Escape') setContextMenu(null) }
    // Defer so the click that opened the menu doesn't immediately close it
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
      case 'mute':
        useStore.getState().setMuted(!isMuted)
        window.buddy?.setMuted(!isMuted)
        break
      case 'settings': window.buddy?.openSettingsWindow(); break
      case 'quit':     window.buddy?.quit(); break
      default: break
    }
  }

  function handleMouseEnter() { window.buddy?.setMouseOverMascot(true) }
  function handleMouseLeave() { window.buddy?.setMouseOverMascot(false) }

  function handleDismissBubble() {
    if (activeBubble) {
      clearNotification(activeBubble.id)
      window.buddy?.dismissNotification(activeBubble.id)
    }
    setActiveBubble(null)
    setSuggestions([])
  }

  // async — awaits the IPC result so SpeechBubble can show success/failure
  async function handleReply(notificationId, text) {
    return await window.buddy?.sendReply(notificationId, text)
  }

  function handleReplySending() {
    // Show thinking animation while the Slack API call is in-flight
    setState('thinking', 60) // long duration — handleReplyDone will override
  }

  function handleReplyDone() {
    playSuccess()
    setState('happy', 1.5)
  }

  const mascotBottom = 24
  const mascotLeft = posX - MASCOT_SIZE / 2
  const bubbleBottom = mascotBottom + MASCOT_SIZE + 12
  const bubbleLeft = Math.max(8, Math.min(windowWidth - 296, posX - 144))
  const onboardingLeft = Math.max(8, Math.min(windowWidth - 328, posX - 160))

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div aria-live="polite" aria-atomic="true">
        {activeBubble && (
          <div className="absolute pointer-events-auto"
            style={{ bottom: bubbleBottom, left: bubbleLeft }}
            onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
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
          onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <OnboardingCard onDismiss={() => setFirstRun(false)} />
        </div>
      )}

      <div
        className={`absolute pointer-events-auto ${justMounted ? 'airie-entering' : ''} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          bottom: mascotBottom, left: mascotLeft,
          transform: facing < 0 ? 'scaleX(-1)' : 'scaleX(1)',
          // Bouncier 0.28s pivot — reads as a deliberate turn, not a snap
          transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onMouseDown={handleMouseDown}
        onClick={handleMascotClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <MascotRenderer state={mascotState} size={MASCOT_SIZE} />
      </div>

      {contextMenu && (
        <div
          className="absolute pointer-events-auto buddy-menu animate-fade-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
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
