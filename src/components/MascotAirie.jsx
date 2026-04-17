// src/components/MascotAirie.jsx
// Image-based Airie mascot.
//
// Animation strategy (revised to eliminate frame-swap flicker):
//   WALK / IDLE  → single <div> with a horizontal sprite strip as
//                  background-image. CSS steps(N) animation shifts
//                  background-position-x between frames. No stacked
//                  <img> layers, no opacity crossfade, no flicker.
//   Everything else (wave, celebrate, meditate, …) → single <img>
//                  keyframe pose.

import { memo } from 'react'
import airieActive     from '../assets/airie/active.png'
import airieSleep      from '../assets/airie/sleep-v2.png'
import airieWave       from '../assets/airie/wave.png'
import airieCelebrate  from '../assets/airie/celebrate.png'
import airieMeditate   from '../assets/airie/meditate.png'
import airieLove       from '../assets/airie/love.png'
import airieNotify     from '../assets/airie/notify.png'
import airieConfused   from '../assets/airie/confused.png'
import airieDetermined from '../assets/airie/determined.png'
import airieSurprised  from '../assets/airie/surprised.png'

import walkStrip from '../assets/airie/walk-strip.png'
import flyStrip  from '../assets/airie/fly-strip.png'

const STATE_IMAGE = {
  idle:       airieActive,
  thinking:   airieActive,
  happy:      airieCelebrate,
  alert:      airieNotify,
  wave:       airieWave,
  sleep:      airieSleep,
  meditate:   airieMeditate,
  love:       airieLove,
  confused:   airieConfused,
  determined: airieDetermined,
  surprised:  airieSurprised,
}

// Each strip: 2 frames horizontally, aspect 2:1. A <div> sized to the mascot
// gets `background-size: 200% 100%` so each frame fills the div exactly; the
// steps(2) animation drives background-position-x from 0% → -100%.
const STRIP_STYLE = {
  width: '100%',
  height: '100%',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '200% 100%',
  imageRendering: 'auto',
  userSelect: 'none',
  pointerEvents: 'none',
}

const IMG_STYLE = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  objectPosition: 'center bottom',
  userSelect: 'none',
  pointerEvents: 'none',
}

export const MascotAirie = memo(function MascotAirie({ state = 'idle', size = 120, className = '' }) {
  const isWalk = state === 'walk'
  const isIdle = state === 'idle'
  const src = STATE_IMAGE[state] ?? airieActive

  return (
    <div
      className={`airie--${state} ${className}`}
      style={{ width: size, height: size, position: 'relative' }}
      aria-label={`Airie is ${state}`}
    >
      {/* Ground shadow */}
      <div className="airie-shadow" aria-hidden="true" />
      {/* Motion streaks — only visible while walking */}
      <div className="airie-streaks" aria-hidden="true">
        <span /><span /><span />
      </div>

      {isWalk && walkStrip ? (
        <div
          className="airie-img airie-strip-walk"
          style={{ ...STRIP_STYLE, backgroundImage: `url(${walkStrip})` }}
        />
      ) : isIdle && flyStrip ? (
        <div
          className="airie-img airie-strip-idle"
          style={{ ...STRIP_STYLE, backgroundImage: `url(${flyStrip})` }}
        />
      ) : (
        <img
          src={src}
          alt=""
          className="airie-img"
          draggable={false}
          style={IMG_STYLE}
          onError={(e) => {
            // If the per-state sprite fails to load, fall back to the
            // always-present `active` pose so Airie never renders as a
            // broken-image icon. Logged so asset issues are visible.
            if (e.currentTarget.src !== airieActive) {
              console.warn('[Airie] sprite failed to load, falling back:', src)
              e.currentTarget.src = airieActive
            }
          }}
        />
      )}
    </div>
  )
})
