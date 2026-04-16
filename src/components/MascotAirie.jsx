// src/components/MascotAirie.jsx
// Image-based Airie mascot using extracted sprite-sheet frames (rembg'd to transparent PNG).
//
// Animation strategy:
//   WALK       → 4-frame locomotion cycle (walk1..walk4) on steps(4) timing
//   IDLE       → 4-frame hover cycle (fly1..fly4) — subtle wing-beat while floating
//   Everything else → single-frame sprite (wave, celebrate, meditate, sleep, etc.)
//
// State → asset map (single-frame states):
//   alert     → notify.png       (bell + ! pose)
//   wave      → wave.png         (greeting, hand up)
//   happy     → celebrate.png    (arms out, joyful)
//   sleep     → sleep-v2.png     (curled on cloud, zZz)
//   thinking  → active.png       (kept original — desk variant from sheet feels off for mascot)
//   meditate  → meditate.png     (seated lotus on cloud)
//   love      → love.png         (hugging a heart)
//   confused  → confused.png     (? over head)
//   determined → determined.png  (fist raised)
//   surprised  → surprised.png   (startled, ! bubble)
//
// CSS keyframes target .airie-img inside the state wrapper.

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

import walk1 from '../assets/airie/walk1.png'
import walk2 from '../assets/airie/walk2.png'
import walk3 from '../assets/airie/walk3.png'
import walk4 from '../assets/airie/walk4.png'
import fly1  from '../assets/airie/fly1.png'
import fly2  from '../assets/airie/fly2.png'
import fly3  from '../assets/airie/fly3.png'
import fly4  from '../assets/airie/fly4.png'

const STATE_IMAGE = {
  idle:       airieActive,      // fallback — overridden by 4-frame hover below
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

const WALK_FRAMES = [walk1, walk2, walk3, walk4]
const FLY_FRAMES  = [fly1, fly2, fly3, fly4]

const IMG_STYLE = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  objectPosition: 'center bottom',
  userSelect: 'none',
  pointerEvents: 'none',
}

// Renders N frames stacked, all sharing the same .airie-img class (for pose animations)
// plus a per-frame class .airie-frame-{0..N-1} that CSS uses to stagger opacity swaps.
// A single frameSwapBase keyframe holds opacity:1 for 1/N of the cycle, else 0.
// Each frame's animation-delay is staggered by -cycle*i/N so they alternate.
function SpriteCycle({ frames, extraClass = '' }) {
  return (
    <>
      {frames.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          className={`airie-img airie-frame-${i} ${extraClass}`}
          draggable={false}
          style={{ ...IMG_STYLE, position: 'absolute', inset: 0 }}
        />
      ))}
    </>
  )
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
      {/* Ground shadow — sits under the feet, pulses on hop, dims on alert glow */}
      <div className="airie-shadow" aria-hidden="true" />

      {/* Motion streaks — pure CSS, only visible while walking */}
      <div className="airie-streaks" aria-hidden="true">
        <span /><span /><span />
      </div>

      {isWalk ? (
        // 4-frame walk cycle — each frame shown for ~130ms (0.52s total loop)
        <SpriteCycle frames={WALK_FRAMES} />
      ) : isIdle ? (
        // 4-frame hover cycle — slower (~1.6s total) for a gentle idle breath
        <SpriteCycle frames={FLY_FRAMES} extraClass="airie-hover" />
      ) : (
        <img src={src} alt="" className="airie-img" draggable={false} style={IMG_STYLE} />
      )}
    </div>
  )
})
