// src/components/Mascot.jsx
// Animated SVG mascot. State controls which eyes/animations are shown.
// Props: state ('idle'|'alert'|'wave'|'sleep'|'thinking'|'happy'), size (px)

export function Mascot({ state = 'idle', size = 120, className = '' }) {
  const isSleep = state === 'sleep'
  const isHappy = state === 'happy'
  const isAlert = state === 'alert'
  const isThinking = state === 'thinking'

  // Thinking: pupils shift up-left
  const lPupilX = isThinking ? 41 : 44
  const lPupilY = isThinking ? 48 : 52
  const rPupilX = isThinking ? 73 : 76
  const rPupilY = isThinking ? 48 : 52
  const eyeR = isAlert ? 11 : 9

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`mascot mascot--${state} ${className}`}
      aria-label={`Buddy is ${state}`}
    >
      {/* Ambient floating particles */}
      <circle className="particle" cx="28" cy="30" r="2" fill="#38bdf8" opacity="0.6" />
      <circle className="particle" cx="92" cy="38" r="1.5" fill="#38bdf8" opacity="0.5" />
      <circle className="particle" cx="18" cy="72" r="1" fill="#38bdf8" opacity="0.4" />
      <circle className="particle" cx="102" cy="68" r="1.5" fill="#38bdf8" opacity="0.5" />

      {/* Outer glow border */}
      <path
        className="mascot-glow"
        d="M60 16 C82 12 104 32 104 56 C104 80 83 100 60 100 C37 100 16 80 16 56 C16 32 38 20 60 16 Z"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="1.5"
        opacity="0.35"
      />

      {/* Body */}
      <path
        className="mascot-body"
        d="M60 16 C82 12 104 32 104 56 C104 80 83 100 60 100 C37 100 16 80 16 56 C16 32 38 20 60 16 Z"
        fill="#1a1f2e"
      />

      {/* Inner ambient glow */}
      <ellipse cx="60" cy="60" rx="24" ry="20" fill="#38bdf8" opacity="0.06" />

      {/* ── Eyes ── */}

      {/* Normal / alert eyes */}
      {!isSleep && !isHappy && (
        <>
          {/* Left eye */}
          <circle cx="44" cy="52" r={eyeR} fill="#e2e8f0" />
          <circle cx={lPupilX} cy={lPupilY} r={isAlert ? 6 : 5} fill="#0f172a" />
          <circle cx="42" cy="49" r="1.8" fill="white" />

          {/* Right eye */}
          <circle cx="76" cy="52" r={eyeR} fill="#e2e8f0" />
          <circle cx={rPupilX} cy={rPupilY} r={isAlert ? 6 : 5} fill="#0f172a" />
          <circle cx="74" cy="49" r="1.8" fill="white" />
        </>
      )}

      {/* Sleep eyes: closed arc lines + zzz */}
      {isSleep && (
        <>
          <path d="M36 52 Q44 44 52 52" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M68 52 Q76 44 84 52" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <text x="85" y="32" fontSize="10" fill="#38bdf8" opacity="0.8" fontFamily="monospace" fontWeight="bold">z</text>
          <text x="93" y="23" fontSize="8"  fill="#38bdf8" opacity="0.5" fontFamily="monospace" fontWeight="bold">z</text>
        </>
      )}

      {/* Happy eyes: upward arc */}
      {isHappy && (
        <>
          <path d="M36 56 Q44 45 52 56" stroke="#e2e8f0" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M68 56 Q76 45 84 56" stroke="#e2e8f0" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* ── Arms ── */}
      <path
        className="arm arm-left"
        d="M22 66 C12 58 10 72 20 74"
        stroke="#38bdf8"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
      <path
        className="arm arm-right"
        d="M98 66 C108 58 110 72 100 74"
        stroke="#38bdf8"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
    </svg>
  )
}
