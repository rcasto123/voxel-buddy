// src/layouts/DesktopPet.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { MascotRenderer } from '../components/MascotRenderer.jsx'
import { SpeechBubble } from '../components/SpeechBubble.jsx'
import { OnboardingCard } from '../components/OnboardingCard.jsx'
import { useStore } from '../store.js'
import { playNotify, playSuccess } from '../services/sound.js'
import { suggestReplies } from '../services/aiSuggest.js'

const MASCOT_SIZE = 100
const WALK_SPEED = 40   // px/s
const IDLE_AFTER = 20   // seconds of inactivity before sleep

function rand(a, b) { return a + Math.random() * (b - a) }

const VISUAL_STATE = {
  idle: 'idle', walk: 'walk', alert: 'alert',
  wave: 'wave', sleep: 'sleep', happy: 'happy', thinking: 'thinking',
}

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
          setState('sleep')
          return scheduleSleepPoll() // switch to low-power poll
        } else if (stateTimerRef.current >= stateDurationRef.current) {
          facingRef.current = Math.random() > 0.5 ? 1 : -1
          setFacing(facingRef.current)
          setState('walk', rand(2, 4))
        }
      } else if (current === 'walk') {
        const newX = posXRef.current + facingRef.current * WALK_SPEED * dt
        const clamped = Math.max(minX, Math.min(maxX, newX))
        if (clamped !== newX) { facingRef.current = -facingRef.current; setFacing(facingRef.current) }
        posXRef.current = clamped
        setPosX(clamped)
        if (stateTimerRef.current >= stateDurationRef.current) setState('idle')
      } else if (current === 'alert') {
        if (stateTimerRef.current >= stateDurationRef.current) setState('wave', 2.5)
      } else if (current === 'wave') {
        if (stateTimerRef.current >= stateDurationRef.current) {
          if (queue.length > 0) { setState('alert', 2.5); showBubble(queue.shift()) }
          else setState('happy', 1.5)
        }
      } else if (current === 'happy') {
        if (stateTimerRef.current >= stateDurationRef.current) setState('idle')
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

  function handleMascotClick() {
    if (stateRef.current === 'alert' || stateRef.current === 'wave') return
    idleAccumRef.current = 0
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

      <div className="absolute pointer-events-auto cursor-pointer"
        style={{
          bottom: mascotBottom, left: mascotLeft,
          transform: facing < 0 ? 'scaleX(-1)' : 'none',
          transition: 'transform 0.15s ease',
        }}
        onClick={handleMascotClick}
        onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <MascotRenderer state={mascotState} size={MASCOT_SIZE} />
      </div>
    </div>
  )
}
