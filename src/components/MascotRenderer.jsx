// src/components/MascotRenderer.jsx
// Renders the correct mascot based on the user's mascotCharacter setting.

import { Mascot } from './Mascot.jsx'
import { MascotAirie } from './MascotAirie.jsx'
import { useStore } from '../store.js'

export function MascotRenderer({ state, size, className, walking = false }) {
  const mascotCharacter = useStore((s) => s.settings.mascotCharacter)
  if (mascotCharacter === 'airie') return <MascotAirie state={state} size={size} className={className} walking={walking} />
  return <Mascot state={state} size={size} className={className} />
}
