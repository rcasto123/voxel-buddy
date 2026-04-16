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

export function DesktopPet() {
  const {
    notifications, mascotState, setMascotState,
    clearNotification, isFirstRun, setFirstRun,
  } = useStore()

  const [posX, setPosX] = useState(window.innerWidth / 2)
  const [facing, setFacing] = useState(1)
  const [activeBubble, setActiveBubble] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

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

  function handleMascotClick() {
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

      <div className={`absolute pointer-events-auto cursor-pointer ${justMounted ? 'airie-entering' : ''}`}
        style={{
          bottom: mascotBottom, left: mascotLeft,
          transform: facing < 0 ? 'scaleX(-1)' : 'scaleX(1)',
          // Bouncier 0.28s pivot — reads as a deliberate turn, not a snap
          transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={handleMascotClick}
        onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <MascotRenderer state={mascotState} size={MASCOT_SIZE} />
      </div>
    </div>
  )
}
