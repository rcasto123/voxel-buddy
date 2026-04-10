// src/layouts/DesktopPet.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { MascotRenderer } from '../components/MascotRenderer.jsx'
import { SpeechBubble } from '../components/SpeechBubble.jsx'
import { useStore } from '../store.js'

const MASCOT_SIZE = 100
const WALK_SPEED = 40   // px/s
const IDLE_AFTER = 20   // seconds of no notifications before sleep

function rand(a, b) { return a + Math.random() * (b - a) }

const VISUAL_STATE = {
  idle: 'idle', walk: 'idle', alert: 'alert',
  wave: 'wave', sleep: 'sleep', happy: 'happy', thinking: 'thinking',
}

export function DesktopPet() {
  const { notifications, mascotState, setMascotState, clearNotification } = useStore()

  const [posX, setPosX] = useState(window.innerWidth / 2)
  const [facing, setFacing] = useState(1) // 1 = right, -1 = left
  const [activeBubble, setActiveBubble] = useState(null) // notification object or null

  const stateRef = useRef('idle')
  const posXRef = useRef(posX)
  const facingRef = useRef(1)
  const lastTimeRef = useRef(performance.now())
  const idleAccumRef = useRef(0)
  const stateTimerRef = useRef(0)
  const stateDurationRef = useRef(rand(3, 6))
  // Mutable ref queue: deliberately mutated inside the rAF loop to avoid
  // React re-render synchronization overhead in the game loop.
  const notificationQueueRef = useRef([])
  const rafRef = useRef(null)

  const setState = useCallback((s, duration) => {
    stateRef.current = s
    stateTimerRef.current = 0
    stateDurationRef.current = duration ?? rand(3, 6)
    setMascotState(VISUAL_STATE[s] ?? 'idle')

    if (s === 'alert' || s === 'wave') {
      idleAccumRef.current = 0
    }
  }, [setMascotState])

  // Enqueue incoming notifications
  useEffect(() => {
    if (notifications.length === 0) return
    const latest = notifications[0]
    // Only enqueue if not already in queue
    if (!notificationQueueRef.current.find((n) => n.id === latest.id)) {
      notificationQueueRef.current.push(latest)
    }
  }, [notifications])

  // Game loop
  useEffect(() => {
    function loop() {
      const now = performance.now()
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = now

      idleAccumRef.current += dt
      stateTimerRef.current += dt

      const maxX = window.innerWidth - MASCOT_SIZE - 20
      const minX = 20
      const current = stateRef.current
      const queue = notificationQueueRef.current

      // Notification arrives → alert (unless already alerting/waving)
      if (queue.length > 0 && current !== 'alert' && current !== 'wave') {
        const next = queue.shift()
        setState('alert', 2.5)
        setActiveBubble(next)
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      if (current === 'idle') {
        if (idleAccumRef.current >= IDLE_AFTER) {
          setState('sleep')
        } else if (stateTimerRef.current >= stateDurationRef.current) {
          const dir = Math.random() > 0.5 ? 1 : -1
          facingRef.current = dir
          setFacing(dir)
          setState('walk', rand(2, 4))
        }
      } else if (current === 'walk') {
        const newX = posXRef.current + facingRef.current * WALK_SPEED * dt
        const clamped = Math.max(minX, Math.min(maxX, newX))
        if (clamped !== newX) {
          facingRef.current = -facingRef.current
          setFacing(facingRef.current)
        }
        posXRef.current = clamped
        setPosX(clamped)

        if (stateTimerRef.current >= stateDurationRef.current) {
          setState('idle')
        }
      } else if (current === 'alert') {
        if (stateTimerRef.current >= stateDurationRef.current) {
          setState('wave', 2.5)
        }
      } else if (current === 'wave') {
        if (stateTimerRef.current >= stateDurationRef.current) {
          if (queue.length > 0) {
            const next = queue.shift()
            setState('alert', 2.5)
            setActiveBubble(next)
          } else {
            setState('happy', 1.5)
          }
        }
      } else if (current === 'happy') {
        if (stateTimerRef.current >= stateDurationRef.current) {
          setState('idle')
        }
      } else if (current === 'sleep') {
        if (queue.length > 0) {
          const next = queue.shift()
          setState('alert', 2.5)
          setActiveBubble(next)
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [setState])

  // Click mascot → wave + idle quip
  function handleMascotClick() {
    if (stateRef.current === 'alert' || stateRef.current === 'wave') return
    setState('wave', 2)
  }

  // Mouse enter/leave mascot: tell main process to disable/re-enable click-through
  function handleMouseEnter() { window.buddy?.setMouseOverMascot(true) }
  function handleMouseLeave() { window.buddy?.setMouseOverMascot(false) }

  function handleDismissBubble() {
    if (activeBubble) clearNotification(activeBubble.id)
    setActiveBubble(null)
  }

  function handleReply(notificationId, text) {
    window.buddy?.sendReply(notificationId, text)
  }

  const mascotBottom = 24 // px from bottom of screen
  const mascotLeft = posX - MASCOT_SIZE / 2
  const bubbleBottom = mascotBottom + MASCOT_SIZE + 12

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Speech bubble — positioned above mascot */}
      {activeBubble && (
        <div
          className="absolute pointer-events-auto"
          style={{
            bottom: bubbleBottom,
            left: Math.max(8, Math.min(window.innerWidth - 296, posX - 144)),
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <SpeechBubble
            notification={activeBubble}
            onDismiss={handleDismissBubble}
            onReply={handleReply}
          />
        </div>
      )}

      {/* Mascot */}
      <div
        className="absolute pointer-events-auto cursor-pointer"
        style={{
          bottom: mascotBottom,
          left: mascotLeft,
          transform: facing < 0 ? 'scaleX(-1)' : 'none',
          transition: 'transform 0.15s ease',
        }}
        onClick={handleMascotClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <MascotRenderer state={mascotState} size={MASCOT_SIZE} />
      </div>
    </div>
  )
}
