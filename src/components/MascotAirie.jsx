// src/components/MascotAirie.jsx
// Airie: cute robot angel with wings and headset.
// 3 visual modes: sleep (peaceful on cloud), active (normal/happy/thinking),
// alert (wings flared, notification badge, surprised eyes).
// Props: state ('idle'|'alert'|'wave'|'sleep'|'thinking'|'happy'), size (px)

export function MascotAirie({ state = 'idle', size = 120, className = '' }) {
  const isSleep = state === 'sleep'
  const isHappy = state === 'happy'
  const isAlert = state === 'alert' || state === 'wave'
  const isThinking = state === 'thinking'

  // Pupil positions — shift up-left when thinking
  const lPupilX = isThinking ? 44 : 47
  const lPupilY = isThinking ? 33 : 37
  const rPupilX = isThinking ? 72 : 75
  const rPupilY = isThinking ? 33 : 37
  const eyeR = isAlert ? 10 : 8

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`mascot mascot--${state} ${isAlert ? 'airie--wings-up' : ''} ${className}`}
      aria-label={`Airie is ${state}`}
    >
      <defs>
        {/* Helmet/head — mint teal gradient */}
        <linearGradient id="airie-head" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a8eae4" />
          <stop offset="100%" stopColor="#52b5ab" />
        </linearGradient>
        {/* Chest / upper body */}
        <linearGradient id="airie-chest" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#72c8bf" />
          <stop offset="100%" stopColor="#4eaaa0" />
        </linearGradient>
        {/* Wing — white/icy with orange glow at root */}
        <linearGradient id="airie-wing" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#f59e4a" stopOpacity="0.75" />
          <stop offset="25%" stopColor="#c8e8f4" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f0f8ff" stopOpacity="0.95" />
        </linearGradient>
        {/* Wing sleep variant (small/drooped, dimmer) */}
        <linearGradient id="airie-wing-sleep" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#d8c8a8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#e8f0f4" stopOpacity="0.7" />
        </linearGradient>
        {/* Notification badge */}
        <linearGradient id="airie-badge" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fbbf5a" />
          <stop offset="100%" stopColor="#f07a28" />
        </linearGradient>
        {/* Visor glass highlight */}
        <linearGradient id="airie-visor" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* ═══════════════════════════════════════
          WINGS  (drawn behind body + head)
      ═══════════════════════════════════════ */}

      {isSleep ? (
        /* Sleep: small, drooped wings tucked to sides */
        <>
          <path
            className="airie-wing-left"
            d="M36 68 C28 70 18 76 16 84 C14 90 22 92 32 86 C35 80 36 74 36 68 Z"
            fill="url(#airie-wing-sleep)"
            stroke="#c0d4dc"
            strokeWidth="0.75"
          />
          <path
            className="airie-wing-right"
            d="M84 68 C92 70 102 76 104 84 C106 90 98 92 88 86 C85 80 84 74 84 68 Z"
            fill="url(#airie-wing-sleep)"
            stroke="#c0d4dc"
            strokeWidth="0.75"
          />
        </>
      ) : isAlert ? (
        /* Alert: wings flared upward and wide */
        <>
          {/* Left wing — main shape */}
          <path
            className="airie-wing-left"
            d="M37 70 C18 56 4 36 10 18 C14 6 28 10 36 26 C38 44 38 60 37 70 Z"
            fill="url(#airie-wing)"
            stroke="#b0ccd8"
            strokeWidth="0.75"
          />
          {/* Left wing inner feather highlight */}
          <path
            d="M36 68 C22 56 12 40 16 26 C20 16 30 18 34 32 C36 48 36 60 36 68 Z"
            fill="white"
            opacity="0.35"
          />
          {/* Right wing — main shape */}
          <path
            className="airie-wing-right"
            d="M83 70 C102 56 116 36 110 18 C106 6 92 10 84 26 C82 44 82 60 83 70 Z"
            fill="url(#airie-wing)"
            stroke="#b0ccd8"
            strokeWidth="0.75"
          />
          {/* Right wing inner feather highlight */}
          <path
            d="M84 68 C98 56 108 40 104 26 C100 16 90 18 86 32 C84 48 84 60 84 68 Z"
            fill="white"
            opacity="0.35"
          />
        </>
      ) : (
        /* Idle/active: wings spread naturally to the sides */
        <>
          {/* Left wing — main shape */}
          <path
            className="airie-wing-left"
            d="M37 70 C20 60 8 44 12 28 C16 16 28 20 36 34 C38 50 38 62 37 70 Z"
            fill="url(#airie-wing)"
            stroke="#b0ccd8"
            strokeWidth="0.75"
          />
          {/* Left wing inner feather highlight */}
          <path
            d="M36 68 C24 60 14 46 16 32 C20 22 28 24 34 36 C36 50 36 62 36 68 Z"
            fill="white"
            opacity="0.3"
          />
          {/* Right wing — main shape */}
          <path
            className="airie-wing-right"
            d="M83 70 C100 60 112 44 108 28 C104 16 92 20 84 34 C82 50 82 62 83 70 Z"
            fill="url(#airie-wing)"
            stroke="#b0ccd8"
            strokeWidth="0.75"
          />
          {/* Right wing inner feather highlight */}
          <path
            d="M84 68 C96 60 106 46 104 32 C100 22 92 24 86 36 C84 50 84 62 84 68 Z"
            fill="white"
            opacity="0.3"
          />
        </>
      )}

      {/* Orange wing-root glow (active/alert only) */}
      {!isSleep && (
        <>
          <ellipse cx="37" cy="71" rx="5" ry="4" fill="#f59e4a" opacity="0.55" />
          <ellipse cx="83" cy="71" rx="5" ry="4" fill="#f59e4a" opacity="0.55" />
        </>
      )}

      {/* ═══════════════════════════════════════
          BODY
      ═══════════════════════════════════════ */}

      {/* Main body rounded rect */}
      <rect x="36" y="58" width="48" height="40" rx="14" fill="white" />

      {/* Teal chest panel (upper half of body) */}
      <rect x="36" y="58" width="48" height="22" rx="14" fill="url(#airie-chest)" />
      <rect x="36" y="68" width="48" height="12" fill="url(#airie-chest)" />

      {/* Chest highlight */}
      <ellipse cx="60" cy="64" rx="16" ry="7" fill="white" opacity="0.15" />

      {/* "A" logo on chest */}
      <text
        x="60" y="74"
        textAnchor="middle"
        fontSize="12"
        fontWeight="900"
        fill="white"
        fontFamily="Arial Black, Arial, sans-serif"
        opacity="0.92"
      >A</text>

      {/* Orange waist / hip band */}
      <rect x="36" y="78" width="48" height="8" rx="3" fill="#f59e4a" />
      {/* Orange band highlight */}
      <rect x="38" y="79" width="44" height="3" rx="1.5" fill="white" opacity="0.25" />

      {/* Lower body (white section) */}
      <rect x="38" y="84" width="44" height="14" rx="8" fill="#eef4f4" />

      {/* ═══════════════════════════════════════
          LEGS + SHOES  (hidden in sleep)
      ═══════════════════════════════════════ */}
      {!isSleep && (
        <>
          {/* Left leg */}
          <rect x="42" y="95" width="14" height="13" rx="5" fill="#62bab2" />
          {/* Left shoe — white with orange stripe */}
          <rect x="39" y="104" width="20" height="9" rx="5" fill="#f4f8f8" />
          <rect x="39" y="109" width="20" height="3" rx="1.5" fill="#f59e4a" opacity="0.8" />
          <ellipse cx="55" cy="106" rx="3" ry="2" fill="white" opacity="0.6" />

          {/* Right leg */}
          <rect x="64" y="95" width="14" height="13" rx="5" fill="#62bab2" />
          {/* Right shoe — white with orange stripe */}
          <rect x="61" y="104" width="20" height="9" rx="5" fill="#f4f8f8" />
          <rect x="61" y="109" width="20" height="3" rx="1.5" fill="#f59e4a" opacity="0.8" />
          <ellipse cx="77" cy="106" rx="3" ry="2" fill="white" opacity="0.6" />
        </>
      )}

      {/* ═══════════════════════════════════════
          CLOUD  (sleep mode only)
      ═══════════════════════════════════════ */}
      {isSleep && (
        <g opacity="0.9">
          {/* Cloud glow */}
          <ellipse cx="60" cy="110" rx="30" ry="7" fill="#c8e4f4" opacity="0.4" />
          {/* Cloud puffs */}
          <ellipse cx="60" cy="110" rx="27" ry="7" fill="white" />
          <ellipse cx="46" cy="107" rx="14" ry="9" fill="white" />
          <ellipse cx="60" cy="105" rx="16" ry="10" fill="white" />
          <ellipse cx="74" cy="107" rx="14" ry="9" fill="white" />
          {/* Cloud highlight */}
          <ellipse cx="52" cy="104" rx="7" ry="4" fill="white" opacity="0.7" />
        </g>
      )}

      {/* ═══════════════════════════════════════
          HEAD / HELMET
      ═══════════════════════════════════════ */}

      {/* Helmet outer — large chibi head */}
      <rect x="22" y="6" width="76" height="54" rx="22" fill="url(#airie-head)" />

      {/* Helmet shade (darker bottom edge for depth) */}
      <rect x="22" y="44" width="76" height="16" rx="14" fill="#3ea89e" opacity="0.25" />

      {/* Visor glass overlay (upper-left highlight) */}
      <rect x="26" y="10" width="68" height="46" rx="18" fill="url(#airie-visor)" />

      {/* Camera / sensor dot at top center */}
      <circle cx="60" cy="9" r="3.5" fill="#2a3848" opacity="0.65" />
      <circle cx="60" cy="9" r="1.5" fill="#38bdf8" opacity="0.8" />

      {/* ═══════════════════════════════════════
          HEADSET
      ═══════════════════════════════════════ */}

      {/* Headset band arc — over the helmet */}
      <path
        d="M32 32 Q60 4 88 32"
        stroke="#2a3848"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Band highlight stripe */}
      <path
        d="M32 32 Q60 6 88 32"
        stroke="#4a5a6e"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Left ear cup */}
      <circle cx="26" cy="36" r="9" fill="#2a3848" />
      <circle cx="26" cy="36" r="6" fill="#374454" />
      <circle cx="26" cy="36" r="3" fill="#4a5a6e" />

      {/* Right ear cup */}
      <circle cx="94" cy="36" r="9" fill="#2a3848" />
      <circle cx="94" cy="36" r="6" fill="#374454" />
      <circle cx="94" cy="36" r="3" fill="#4a5a6e" />

      {/* Mic arm — curves down from right ear cup toward mouth */}
      <path
        d="M88 42 C84 50 78 54 74 56"
        stroke="#2a3848"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Mic capsule (small disc at end of arm) */}
      <circle cx="74" cy="57" r="4" fill="#2a3848" />
      <circle cx="74" cy="57" r="2.2" fill="#4a5a6e" />

      {/* ═══════════════════════════════════════
          EYES
      ═══════════════════════════════════════ */}

      {/* Normal / alert / thinking eyes */}
      {!isSleep && !isHappy && (
        <>
          {/* Left eye — white sclera */}
          <circle cx="47" cy="38" r={eyeR} fill="white" />
          {/* Iris */}
          <circle cx="47" cy="38" r={eyeR - 3} fill="#5aaec8" />
          {/* Pupil */}
          <circle cx={lPupilX} cy={lPupilY} r={isAlert ? 3.5 : 3} fill="#1a2d40" />
          {/* Highlight */}
          <circle cx="43" cy="33" r="2.2" fill="white" opacity="0.9" />

          {/* Right eye — white sclera */}
          <circle cx="73" cy="38" r={eyeR} fill="white" />
          {/* Iris */}
          <circle cx="73" cy="38" r={eyeR - 3} fill="#5aaec8" />
          {/* Pupil */}
          <circle cx={rPupilX} cy={rPupilY} r={isAlert ? 3.5 : 3} fill="#1a2d40" />
          {/* Highlight */}
          <circle cx="69" cy="33" r="2.2" fill="white" opacity="0.9" />
        </>
      )}

      {/* Happy eyes — upward arc (^‿^) */}
      {isHappy && (
        <>
          <path d="M40 42 Q47 30 54 42" stroke="#1a2d40" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M66 42 Q73 30 80 42" stroke="#1a2d40" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Sleep eyes — peaceful closed arcs */}
      {isSleep && (
        <>
          <path d="M40 38 Q47 30 54 38" stroke="#2a3848" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M66 38 Q73 30 80 38" stroke="#2a3848" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* ═══════════════════════════════════════
          MOUTH / EXPRESSION
      ═══════════════════════════════════════ */}

      {/* Small smile (idle / thinking / happy) */}
      {!isSleep && !isAlert && (
        <path
          d="M53 49 Q60 55 67 49"
          stroke="#1a2d40"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* Surprised O-mouth (alert / wave) */}
      {isAlert && (
        <ellipse cx="60" cy="51" rx="5" ry="4.5" fill="#1a2d40" />
      )}

      {/* ═══════════════════════════════════════
          STATE ACCESSORIES
      ═══════════════════════════════════════ */}

      {/* ZzZ for sleep */}
      {isSleep && (
        <>
          <text x="90" y="22" fontSize="11" fill="#5ab5c8" opacity="0.9" fontFamily="monospace" fontWeight="bold">z</text>
          <text x="100" y="13" fontSize="8" fill="#5ab5c8" opacity="0.6" fontFamily="monospace" fontWeight="bold">z</text>
        </>
      )}

      {/* Notification badge (alert / wave) */}
      {isAlert && (
        <g>
          {/* Badge circle */}
          <circle cx="96" cy="14" r="13" fill="url(#airie-badge)" />
          {/* Chat bubble icon */}
          <rect x="90" y="8" width="13" height="10" rx="2.5" fill="white" opacity="0.95" />
          <path d="M91 18 L93 22 L97 18" fill="white" opacity="0.95" />
          {/* Lines inside bubble */}
          <rect x="92" y="11" width="9" height="2" rx="1" fill="#f07a28" />
          <rect x="92" y="14.5" width="6" height="1.5" rx="0.75" fill="#f07a28" />
          {/* Sparkle dots */}
          <circle cx="82" cy="7" r="2" fill="#fbbf5a" opacity="0.8" />
          <circle cx="79" cy="12" r="1.5" fill="#fbbf5a" opacity="0.6" />
        </g>
      )}
    </svg>
  )
}
