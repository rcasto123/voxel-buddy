// src/components/MascotAirie.jsx
// Image-based Airie mascot using real artwork PNGs.
// 4 source images map to 7 mascot states:
//   sleep              → sleep.png  (sitting on cloud, wings folded)
//   alert, wave        → alert.png  (finger up, notification bell)
//   idle, thinking,
//   happy              → active.png (flying, wings spread, standing)
//   walk               → alternates active.png ↔ walk.png (running stride)
// CSS animations (breathe, bounceSoft, walk frames) target .airie-img inside.
// Props: state ('idle'|'walk'|'alert'|'wave'|'sleep'|'thinking'|'happy'), size (px)

import { memo } from 'react'
import airieActive from '../assets/airie/active.png'
import airieAlert  from '../assets/airie/alert.png'
import airieSleep  from '../assets/airie/sleep.png'
import airieWalk   from '../assets/airie/walk.png'

const STATE_IMAGE = {
  idle:     airieActive,
  thinking: airieActive,
  happy:    airieActive,
  alert:    airieAlert,
  wave:     airieAlert,
  sleep:    airieSleep,
  // walk is handled specially — two frames stacked & alternated via CSS
  walk:     airieActive,
}

const IMG_STYLE = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  // Align characters at their base so they appear to stand on the ground
  objectPosition: 'center bottom',
  userSelect: 'none',
  pointerEvents: 'none',
}

export const MascotAirie = memo(function MascotAirie({ state = 'idle', size = 120, className = '' }) {
  const isWalk = state === 'walk'
  const src = STATE_IMAGE[state] ?? airieActive

  return (
    // Wrapper carries the state class so CSS animations target .airie-img inside.
    // 'walk' gets its own .airie--walk class with the hop animation — no !important needed.
    <div
      className={`airie--${state} ${className}`}
      style={{ width: size, height: size, position: 'relative' }}
      aria-label={`Airie is ${state}`}
    >
      {/* Ground shadow — sits under the feet, pulses on hop, dims on alert glow */}
      <div className="airie-shadow" aria-hidden="true" />

      {/* Motion streaks — pure CSS, only visible while walking */}
      <div className="airie-streaks" aria-hidden="true">
        <span /><span /><span />
      </div>

      {isWalk ? (
        // Two-frame walk cycle: both images stacked, opacity toggled via CSS steps()
        // .airie-frame-a / .airie-frame-b alternate at half the hop period (~260ms)
        // Result: visible leg swap + wing beat on every hop, reads as a real run cycle.
        <>
          <img
            src={airieActive}
            alt=""
            className="airie-img airie-frame-a"
            draggable={false}
            style={{ ...IMG_STYLE, position: 'absolute', inset: 0 }}
          />
          <img
            src={airieWalk}
            alt=""
            className="airie-img airie-frame-b"
            draggable={false}
            style={{ ...IMG_STYLE, position: 'absolute', inset: 0 }}
          />
        </>
      ) : (
        <img
          src={src}
          alt=""
          className="airie-img"
          draggable={false}
          style={IMG_STYLE}
        />
      )}
    </div>
  )
})
