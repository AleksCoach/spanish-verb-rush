let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(on: boolean): void {
  enabled = on
}

function audio(): AudioContext | null {
  if (!enabled) return null
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.08, slideTo?: number): void {
  const a = audio()
  if (!a) return
  const t0 = a.currentTime + start
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(a.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

export const sfx = {
  /** wywołaj przy pierwszej interakcji, żeby odblokować audio w przeglądarce */
  unlock(): void {
    audio()
  },
  correct(): void {
    tone(660, 0, 0.09, 'triangle', 0.07)
    tone(990, 0.07, 0.12, 'triangle', 0.07)
  },
  /** neutralny dźwięk zapisania odpowiedzi (egzamin) */
  tick(): void {
    tone(520, 0, 0.06, 'sine', 0.05)
  },
  almost(): void {
    tone(620, 0, 0.14, 'triangle', 0.06)
  },
  wrong(): void {
    tone(260, 0, 0.22, 'sine', 0.08, 170)
  },
  combo(level: number): void {
    const base = level >= 10 ? 740 : 587
    tone(base, 0, 0.08, 'square', 0.035)
    tone(base * 1.26, 0.07, 0.08, 'square', 0.035)
    tone(base * 1.5, 0.14, 0.14, 'square', 0.035)
  },
  hit(): void {
    tone(140, 0, 0.12, 'square', 0.05, 70)
  },
  victory(): void {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.18, 'triangle', 0.07))
  },
}
