// src/services/sound.js
// Synthesised notification sounds via Web Audio API — no audio files needed.

let _ctx = null

function getCtx() {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  // Resume context if it was suspended (browser autoplay policy)
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

/**
 * Soft two-tone chime — used when a notification arrives.
 * Sounds like a gentle "ding-ding" rising tone.
 */
export function playNotify() {
  try {
    const ctx = getCtx()
    const now = ctx.currentTime

    const tones = [
      { freq: 880, start: 0, dur: 0.18 },
      { freq: 1108, start: 0.14, dur: 0.22 },
    ]

    for (const { freq, start, dur } of tones) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)

      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.18, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + start)
      osc.stop(now + start + dur + 0.02)
    }
  } catch (e) {
    // Audio is always best-effort
  }
}

/**
 * Short happy trill — used when Airie's reply sends successfully.
 */
export function playSuccess() {
  try {
    const ctx = getCtx()
    const now = ctx.currentTime

    const tones = [
      { freq: 784, start: 0 },
      { freq: 988, start: 0.08 },
      { freq: 1175, start: 0.16 },
    ]

    for (const { freq, start } of tones) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)

      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.12, now + start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.12)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + start)
      osc.stop(now + start + 0.15)
    }
  } catch (e) {}
}
