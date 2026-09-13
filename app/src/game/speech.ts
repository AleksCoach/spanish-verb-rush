import type { Seg } from '../data/cheatsheets'

// Głos wbudowany w telefon/komputer (Web Speech API) — bez internetu i bez kont.
// Docelowo można podmienić na nagrania (np. ElevenLabs) z tym samym podziałem na fragmenty PL/ES.

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

function pickVoice(lang: 'pl' | 'es'): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const want = lang === 'es' ? ['es-es', 'es'] : ['pl-pl', 'pl']
  for (const prefix of want) {
    const matching = voices.filter((x) => x.lang.toLowerCase().replace('_', '-').startsWith(prefix))
    // głosy Google brzmią naturalniej niż systemowe (np. Microsoft Adam) — biorę je, gdy są
    const v = matching.find((x) => x.name.includes('Google')) ?? matching[0]
    if (v) return v
  }
  return undefined
}

export function speak(segs: Seg[], onEnd?: () => void): void {
  if (!canSpeak()) return
  const synth = window.speechSynthesis
  synth.cancel()
  segs.forEach((s, i) => {
    const u = new SpeechSynthesisUtterance(s.text)
    u.lang = s.lang === 'es' ? 'es-ES' : 'pl-PL'
    const voice = pickVoice(s.lang)
    if (voice) u.voice = voice
    u.rate = s.lang === 'es' ? 0.9 : 1
    if (i === segs.length - 1 && onEnd) u.onend = onEnd
    synth.speak(u)
  })
}

/** tekst do czytania: bez ukośników i nawiasów ("iść / jechać" → "iść albo jechać") */
export function speakable(text: string): string {
  return text.split(' / ').join(' albo ').split('/').join(' albo ').split('(').join(', ').split(')').join('')
}

/** słówko przy pytaniu: najpierw po polsku, potem po hiszpańsku */
export function sayWord(infinitive: string, meaning: string): void {
  speak([
    { lang: 'pl', text: speakable(meaning) },
    { lang: 'es', text: infinitive },
  ])
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel()
}
