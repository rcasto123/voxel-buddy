// src/components/MascotAirie.jsx
// Airie: cute robot angel with wings and headset.
// Props: state ('idle'|'alert'|'wave'|'sleep'|'thinking'|'happy'), size (px)

export function MascotAirie({ state = 'idle', size = 120, className = '' }) {
  const isSleep = state === 'sleep'
  const isHappy = state === 'happy'
  const isAlert = state === 'alert' || state === 'wave'
  const isThinking = state === 'thinking'

  // Big chibi eyes — pupils shift up-left when thinking
  const eyeR = isAlert ? 12 : 10
  const lPupilX = isThinking ? 43 : 46
  const lPupilY = isThinking ? 32 : 36
  const rPupilX = isThinking ? 72 : 75
  const rPupilY = isThinking ? 32 : 36

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`mascot mascot--${state} ${isAlert ? 'airie--wings-up' : ''} ${className}`}
      aria-label={`Airie is ${state}`}
    >
      <defs>
        {/* Helmet — mint teal, lighter top */}
        <linearGradient id="ag-head" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#b4ede6" />
          <stop offset="100%" stopColor="#4eb8ae" />
        </linearGradient>
        {/* Face visor screen — lighter, glassy */}
        <linearGradient id="ag-visor" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d6f5f0" />
          <stop offset="100%" stopColor="#a8e4dc" />
        </linearGradient>
        {/* Chest panel */}
        <linearGradient id="ag-chest" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6ec8be" />
          <stop offset="100%" stopColor="#46a89e" />
        </linearGradient>
        {/* Wings — white/icy with warm orange glow at root */}
        <linearGradient id="ag-wing" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%"   stopColor="#f5a33a" stopOpacity="0.8" />
          <stop offset="20%"  stopColor="#d4eef8" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#f4faff" stopOpacity="0.95" />
        </linearGradient>
        {/* Sleep wings — muted */}
        <linearGradient id="ag-wing-sleep" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#c8c0a8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#e8eef0" stopOpacity="0.75" />
        </linearGradient>
        {/* Notification badge */}
        <linearGradient id="ag-badge" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fbcb5a" />
          <stop offset="100%" stopColor="#ef7c20" />
        </linearGradient>
        {/* Arm */}
        <linearGradient id="ag-arm" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7eccc4" />
          <stop offset="100%" stopColor="#4eb8ae" />
        </linearGradient>
      </defs>

      {/* ═══════════════════════════════════════
          WINGS  — drawn first, behind everything
      ═══════════════════════════════════════ */}

      {isSleep ? (
        /* Sleep: small, drooped wings tucked down */
        <>
          <path className="airie-wing-left"
            d="M36 66 C26 70 14 76 12 86 C10 93 20 95 32 88 C35 82 36 74 36 66 Z"
            fill="url(#ag-wing-sleep)" stroke="#c0d4dc" strokeWidth="0.6" />
          <path className="airie-wing-right"
            d="M84 66 C94 70 106 76 108 86 C110 93 100 95 88 88 C85 82 84 74 84 66 Z"
            fill="url(#ag-wing-sleep)" stroke="#c0d4dc" strokeWidth="0.6" />
        </>
      ) : isAlert ? (
        /* Alert: wings flared wide and high */
        <>
          {/* Left wing layers (feathered look) */}
          <path className="airie-wing-left"
            d="M36 70 C14 52 0 28 8 10 C12 2 28 6 36 24 C39 44 38 62 36 70 Z"
            fill="url(#ag-wing)" stroke="#b4ccd8" strokeWidth="0.6" />
          <path
            d="M36 68 C18 52 8 32 14 18 C18 10 28 12 34 28 C36 46 36 60 36 68 Z"
            fill="white" opacity="0.3" />
          <path className="airie-wing-right"
            d="M84 70 C106 52 120 28 112 10 C108 2 92 6 84 24 C81 44 82 62 84 70 Z"
            fill="url(#ag-wing)" stroke="#b4ccd8" strokeWidth="0.6" />
          <path
            d="M84 68 C102 52 112 32 106 18 C102 10 92 12 86 28 C84 46 84 60 84 68 Z"
            fill="white" opacity="0.3" />
        </>
      ) : (
        /* Idle/active: wings sweep naturally outward and up */
        <>
          {/* Left wing */}
          <path className="airie-wing-left"
            d="M36 70 C16 58 4 38 10 20 C14 10 28 14 36 30 C39 48 38 62 36 70 Z"
            fill="url(#ag-wing)" stroke="#b4ccd8" strokeWidth="0.6" />
          <path
            d="M36 68 C20 58 10 42 14 26 C18 16 28 18 34 32 C36 48 36 60 36 68 Z"
            fill="white" opacity="0.28" />
          {/* Right wing */}
          <path className="airie-wing-right"
            d="M84 70 C104 58 116 38 110 20 C106 10 92 14 84 30 C81 48 82 62 84 70 Z"
            fill="url(#ag-wing)" stroke="#b4ccd8" strokeWidth="0.6" />
          <path
            d="M84 68 C100 58 110 42 106 26 C102 16 92 18 86 32 C84 48 84 60 84 68 Z"
            fill="white" opacity="0.28" />
        </>
      )}

      {/* Orange wing-root glow (active/alert only) */}
      {!isSleep && (
        <>
          <ellipse cx="36" cy="71" rx="6" ry="4" fill="#f5a33a" opacity="0.6" />
          <ellipse cx="84" cy="71" rx="6" ry="4" fill="#f5a33a" opacity="0.6" />
        </>
      )}

      {/* ═══════════════════════════════════════
          BODY
      ═══════════════════════════════════════ */}

      {/* Main body */}
      <rect x="37" y="58" width="46" height="38" rx="13" fill="white" />

      {/* Teal chest panel */}
      <rect x="37" y="58" width="46" height="20" rx="13" fill="url(#ag-chest)" />
      <rect x="37" y="68"  width="46" height="10" fill="url(#ag-chest)" />

      {/* Chest sheen */}
      <ellipse cx="60" cy="63" rx="14" ry="6" fill="white" opacity="0.18" />

      {/* "A" logo */}
      <text x="60" y="73" textAnchor="middle" fontSize="13" fontWeight="900"
        fill="white" fontFamily="Arial Black, Arial, sans-serif" opacity="0.95">A</text>

      {/* Orange waist band */}
      <rect x="37" y="76" width="46" height="8" rx="3" fill="#f5a33a" />
      <rect x="39" y="77" width="42" height="3" rx="1.5" fill="white" opacity="0.28" />

      {/* White lower body */}
      <rect x="39" y="82" width="42" height="14" rx="9" fill="#eef5f4" />

      {/* ═══════════════════════════════════════
          ARMS  (teal, rounded, on body sides)
      ═══════════════════════════════════════ */}
      {!isSleep && (
        <>
          {/* Left arm */}
          <rect x="27" y="61" width="13" height="22" rx="7" fill="url(#ag-arm)" />
          {/* Left hand */}
          <circle cx="33" cy="84" r="6" fill="url(#ag-arm)" />
          {/* Right arm */}
          <rect x="80" y="61" width="13" height="22" rx="7" fill="url(#ag-arm)" />
          {/* Right hand */}
          <circle cx="87" cy="84" r="6" fill="url(#ag-arm)" />
        </>
      )}

      {/* ═══════════════════════════════════════
          LEGS + SHOES  (hidden in sleep)
      ═══════════════════════════════════════ */}
      {!isSleep && (
        <>
          {/* Left leg */}
          <rect x="43" y="94" width="13" height="12" rx="5" fill="#5ec0b6" />
          {/* Left sneaker */}
          <rect x="40" y="102" width="19" height="9" rx="5" fill="#f2f8f6" />
          <rect x="40" y="107" width="19" height="3" rx="1.5" fill="#f5a33a" opacity="0.85" />
          <ellipse cx="54" cy="104" rx="3" ry="2" fill="white" opacity="0.55" />

          {/* Right leg */}
          <rect x="64" y="94" width="13" height="12" rx="5" fill="#5ec0b6" />
          {/* Right sneaker */}
          <rect x="61" y="102" width="19" height="9" rx="5" fill="#f2f8f6" />
          <rect x="61" y="107" width="19" height="3" rx="1.5" fill="#f5a33a" opacity="0.85" />
          <ellipse cx="75" cy="104" rx="3" ry="2" fill="white" opacity="0.55" />
        </>
      )}

      {/* ═══════════════════════════════════════
          CLOUD  (sleep only, replaces legs)
      ═══════════════════════════════════════ */}
      {isSleep && (
        <g opacity="0.92">
          <ellipse cx="60" cy="111" rx="30" ry="7" fill="#d8eef8" opacity="0.5" />
          <ellipse cx="60" cy="111" rx="28" ry="7" fill="white" />
          <ellipse cx="46" cy="108" rx="14" ry="9" fill="white" />
          <ellipse cx="60" cy="106" rx="17" ry="10" fill="white" />
          <ellipse cx="74" cy="108" rx="14" ry="9" fill="white" />
          <ellipse cx="50" cy="105" rx="8" ry="4" fill="white" opacity="0.7" />
        </g>
      )}

      {/* ═══════════════════════════════════════
          HEAD / HELMET  (large, chibi)
      ═══════════════════════════════════════ */}

      {/* Outer helmet shell */}
      <rect x="20" y="4" width="80" height="58" rx="24" fill="url(#ag-head)" />

      {/* Depth shade at bottom of helmet */}
      <rect x="20" y="46" width="80" height="16" rx="14" fill="#38a89e" opacity="0.2" />

      {/* Face visor — distinct inner screen */}
      <rect x="25" y="9" width="70" height="49" rx="19" fill="url(#ag-visor)" opacity="0.6" />

      {/* Visor glass highlight (upper-left sheen) */}
      <ellipse cx="44" cy="20" rx="18" ry="8" fill="white" opacity="0.22" transform="rotate(-15 44 20)" />

      {/* Camera/sensor dot */}
      <circle cx="60" cy="7" r="3.5" fill="#263040" opacity="0.6" />
      <circle cx="60" cy="7" r="1.5" fill="#5ad4f0" opacity="0.85" />

      {/* ═══════════════════════════════════════
          HEADSET
      ═══════════════════════════════════════ */}

      {/* Band arc — over the very top of helmet */}
      <path d="M30 30 Q60 2 90 30"
        stroke="#263040" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      <path d="M30 30 Q60 4 90 30"
        stroke="#3d4e62" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Left ear cup */}
      <circle cx="23" cy="34" r="9.5" fill="#263040" />
      <circle cx="23" cy="34" r="6.5" fill="#36485a" />
      <circle cx="23" cy="34" r="3.5" fill="#4a5e72" />

      {/* Right ear cup */}
      <circle cx="97" cy="34" r="9.5" fill="#263040" />
      <circle cx="97" cy="34" r="6.5" fill="#36485a" />
      <circle cx="97" cy="34" r="3.5" fill="#4a5e72" />

      {/* Mic arm — from right ear cup curving to mouth position */}
      <path d="M90 40 C86 50 80 54 76 56"
        stroke="#263040" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Mic capsule */}
      <circle cx="76" cy="57" r="4.5" fill="#263040" />
      <circle cx="76" cy="57" r="2.5" fill="#4a5e72" />

      {/* ═══════════════════════════════════════
          EYES  (big and expressive)
      ═══════════════════════════════════════ */}

      {/* Normal / alert / thinking */}
      {!isSleep && !isHappy && (
        <>
          {/* Left eye */}
          <circle cx="45" cy="36" r={eyeR} fill="white" />
          <circle cx="45" cy="36" r={eyeR - 3} fill="#5aaece" />
          <circle cx={lPupilX} cy={lPupilY} r={isAlert ? 4 : 3.5} fill="#192838" />
          <circle cx="41" cy="31" r="2.8" fill="white" opacity="0.9" />

          {/* Right eye */}
          <circle cx="75" cy="36" r={eyeR} fill="white" />
          <circle cx="75" cy="36" r={eyeR - 3} fill="#5aaece" />
          <circle cx={rPupilX} cy={rPupilY} r={isAlert ? 4 : 3.5} fill="#192838" />
          <circle cx="71" cy="31" r="2.8" fill="white" opacity="0.9" />
        </>
      )}

      {/* Happy — upward arcs ^‿^ */}
      {isHappy && (
        <>
          <path d="M37 40 Q45 28 53 40" stroke="#192838" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M67 40 Q75 28 83 40" stroke="#192838" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Sleep — closed peaceful arcs */}
      {isSleep && (
        <>
          <path d="M37 37 Q45 28 53 37" stroke="#263040" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M67 37 Q75 28 83 37" stroke="#263040" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* ═══════════════════════════════════════
          MOUTH / EXPRESSION
      ═══════════════════════════════════════ */}

      {/* Gentle smile (idle / thinking / happy) */}
      {!isSleep && !isAlert && (
        <path d="M52 50 Q60 56 68 50"
          stroke="#192838" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      )}

      {/* Surprised O-mouth (alert / wave) */}
      {isAlert && (
        <ellipse cx="60" cy="52" rx="5.5" ry="4.5" fill="#192838" />
      )}

      {/* ═══════════════════════════════════════
          STATE ACCESSORIES
      ═══════════════════════════════════════ */}

      {/* ZzZ (sleep) */}
      {isSleep && (
        <>
          <text x="88" y="20" fontSize="12" fill="#5ac8d8" opacity="0.9"
            fontFamily="monospace" fontWeight="bold">z</text>
          <text x="100" y="11" fontSize="9" fill="#5ac8d8" opacity="0.55"
            fontFamily="monospace" fontWeight="bold">z</text>
        </>
      )}

      {/* Notification badge (alert / wave) */}
      {isAlert && (
        <g>
          <circle cx="97" cy="13" r="13" fill="url(#ag-badge)" />
          {/* Chat bubble */}
          <rect x="90.5" y="7" width="13" height="10" rx="3" fill="white" opacity="0.95" />
          <path d="M91 17 L93.5 22 L97 17 Z" fill="white" opacity="0.95" />
          {/* Bubble lines */}
          <rect x="93" y="10" width="8" height="2" rx="1" fill="#ef7c20" />
          <rect x="93" y="13.5" width="5" height="1.5" rx="0.75" fill="#ef7c20" />
          {/* Sparkle dots */}
          <circle cx="82" cy="6" r="2.2" fill="#fcd06a" opacity="0.85" />
          <circle cx="79" cy="12" r="1.6" fill="#fcd06a" opacity="0.6" />
        </g>
      )}
    </svg>
  )
}
