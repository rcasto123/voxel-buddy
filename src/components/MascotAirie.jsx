// src/components/MascotAirie.jsx
// Image-based Airie mascot using real artwork PNGs.
// 3 source images map to 6 mascot states:
//   sleep  → sleep.png  (sitting on cloud, wings folded)
//   alert, wave → alert.png  (finger up, notification bell)
//   idle, walk, thinking, happy → active.png  (flying, wings spread)
// CSS animations (breathe, bounceSoft) are applied via .airie--<state> wrapper.
// Props: state ('idle'|'alert'|'wave'|'sleep'|'thinking'|'happy'), size (px)

import airieActive from '../assets/airie/active.png'
import airieAlert  from '../assets/airie/alert.png'
import airieSleep  from '../assets/airie/sleep.png'

const STATE_IMAGE = {
  idle:     airieActive,
  walk:     airieActive,
  thinking: airieActive,
  happy:    airieActive,
  alert:    airieAlert,
  wave:     airieAlert,
  sleep:    airieSleep,
}

export function MascotAirie({ state = 'idle', size = 120, className = '', walking = false }) {
  const src = STATE_IMAGE[state] ?? airieActive

  return (
    // Wrapper carries the state class so CSS animations target .airie-img inside
    // airie--walking overrides idle float with the hop cycle when wandering
    <div
      className={`airie--${state}${walking ? ' airie--walking' : ''} ${className}`}
      style={{ width: size, height: size, position: 'relative' }}
      aria-label={`Airie is ${state}`}
    >
      <img
        src={src}
        alt=""
        className="airie-img"
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          // Align characters at their base so they appear to stand on the ground
          objectPosition: 'center bottom',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
