// src/components/MascotAirie.jsx
// Airie: a cute robot with wings and a headset.
// Props: state ('idle'|'alert'|'wave'|'sleep'|'thinking'|'happy'), size (px)

export function MascotAirie({ state = 'idle', size = 120, className = '' }) {
  const isSleep = state === 'sleep'
  const isHappy = state === 'happy'
  const isAlert = state === 'alert' || state === 'wave'
  const isThinking = state === 'thinking'
  const wingsUp = isAlert

  // Pupils shift up-left when thinking
  const lPupilX = isThinking ? 48 : 51
  const lPupilY = isThinking ? 27 : 32
  const rPupilX = isThinking ? 68 : 71
  const rPupilY = isThinking ? 27 : 32
  const eyeR = isAlert ? 10 : 8

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`mascot mascot--${state} ${wingsUp ? 'airie--wings-up' : ''} ${className}`}
      aria-label={`Airie is ${state}`}
    >
      {/* ── Wings (behind body) ── */}

      {/* Left wing */}
      <path
        className="airie-wing-left"
        d="M42 72 C28 62 22 50 30 46 C34 44 38 48 40 55 C42 62 42 68 42 72 Z"
        fill="#0ea5e9"
        opacity="0.75"
        style={{ transition: 'transform 0.3s ease' }}
      />
      {/* Left wing inner highlight */}
      <path
        className="airie-wing-left"
        d="M41 70 C30 63 26 54 32 50 C35 48 38 51 40 57 Z"
        fill="#38bdf8"
        opacity="0.35"
        style={{ transition: 'transform 0.3s ease' }}
      />

      {/* Right wing */}
      <path
        className="airie-wing-right"
        d="M78 72 C92 62 98 50 90 46 C86 44 82 48 80 55 C78 62 78 68 78 72 Z"
        fill="#0ea5e9"
        opacity="0.75"
        style={{ transition: 'transform 0.3s ease' }}
      />
      {/* Right wing inner highlight */}
      <path
        className="airie-wing-right"
        d="M79 70 C90 63 94 54 88 50 C85 48 82 51 80 57 Z"
        fill="#38bdf8"
        opacity="0.35"
        style={{ transition: 'transform 0.3s ease' }}
      />

      {/* ── Body ── */}
      <rect
        className="mascot-body"
        x="42" y="43" width="36" height="44" rx="8" ry="8"
        fill="#1a1f2e"
      />
      {/* Body inner glow */}
      <rect
        x="44" y="45" width="32" height="40" rx="6" ry="6"
        fill="#38bdf8"
        opacity="0.05"
      />
      {/* Body outer glow border */}
      <rect
        className="mascot-glow"
        x="42" y="43" width="36" height="44" rx="8" ry="8"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="1"
        opacity="0.3"
      />

      {/* Belly glow ellipse */}
      <ellipse cx="60" cy="72" rx="10" ry="7" fill="#38bdf8" opacity="0.08" />

      {/* Chest indicator line */}
      <rect x="52" y="68" width="16" height="2" rx="1" fill="#38bdf8" opacity="0.7" />
      {/* Small status dot */}
      <circle cx="60" cy="76" r="2" fill="#38bdf8" opacity="0.5" />

      {/* ── Head ── */}
      <rect
        x="44" y="14" width="32" height="28" rx="7" ry="7"
        fill="#1a1f2e"
      />
      {/* Head outer glow border */}
      <rect
        x="44" y="14" width="32" height="28" rx="7" ry="7"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="0.75"
        opacity="0.25"
      />
      {/* Neck connector */}
      <rect x="54" y="40" width="12" height="5" rx="2" fill="#1a1f2e" />

      {/* ── Antenna ── */}
      <line x1="60" y1="14" x2="60" y2="6" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="60" cy="5" r="2.5" fill="#38bdf8" opacity="0.9" />
      {/* Antenna glow */}
      <circle cx="60" cy="5" r="4" fill="#38bdf8" opacity="0.15" />

      {/* ── Headset ── */}
      {/* Arc over head */}
      <path
        d="M46 24 C46 10 74 10 74 24"
        stroke="#38bdf8"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Left ear pad */}
      <circle cx="46" cy="25" r="3" fill="#0ea5e9" opacity="0.8" />
      {/* Right ear pad */}
      <circle cx="74" cy="25" r="3" fill="#0ea5e9" opacity="0.8" />
      {/* Mic arm: extends down from right ear */}
      <path
        d="M74 28 C76 32 75 36 72 38"
        stroke="#38bdf8"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Mic dot */}
      <circle cx="72" cy="38" r="2" fill="#38bdf8" opacity="0.9" />

      {/* ── Eyes ── */}

      {/* Normal / alert eyes */}
      {!isSleep && !isHappy && (
        <>
          {/* Left eye */}
          <circle cx="53" cy="30" r={eyeR} fill="#e2e8f0" />
          <circle cx={lPupilX} cy={lPupilY} r={isAlert ? 6 : 5} fill="#0f172a" />
          <circle cx="50" cy="27" r="1.8" fill="white" />

          {/* Right eye */}
          <circle cx="67" cy="30" r={eyeR} fill="#e2e8f0" />
          <circle cx={rPupilX} cy={rPupilY} r={isAlert ? 6 : 5} fill="#0f172a" />
          <circle cx="64" cy="27" r="1.8" fill="white" />
        </>
      )}

      {/* Sleep eyes: closed arc lines */}
      {isSleep && (
        <>
          <path d="M46 30 Q53 23 60 30" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M60 30 Q67 23 74 30" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <text x="78" y="16" fontSize="8" fill="#38bdf8" opacity="0.8" fontFamily="monospace" fontWeight="bold">z</text>
          <text x="85" y="10" fontSize="6" fill="#38bdf8" opacity="0.5" fontFamily="monospace" fontWeight="bold">z</text>
        </>
      )}

      {/* Happy eyes: upward arc */}
      {isHappy && (
        <>
          <path d="M46 33 Q53 23 60 33" stroke="#e2e8f0" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M60 33 Q67 23 74 33" stroke="#e2e8f0" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* ── Feet ── */}
      <rect x="48" y="85" width="10" height="6" rx="3" fill="#1e293b" />
      <rect x="62" y="85" width="10" height="6" rx="3" fill="#1e293b" />
      {/* Foot glow */}
      <rect x="48" y="85" width="10" height="6" rx="3" fill="none" stroke="#38bdf8" strokeWidth="0.5" opacity="0.4" />
      <rect x="62" y="85" width="10" height="6" rx="3" fill="none" stroke="#38bdf8" strokeWidth="0.5" opacity="0.4" />
    </svg>
  )
}
