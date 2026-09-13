import type { Grade } from './types'

const ACCENT: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' }

/** Skrót klawiaturowy: a' → á, e' → é itd. (apostrof nigdy nie występuje w odpowiedziach). */
export function applyAccentShortcuts(value: string): string {
  return value.replace(/([aeiouAEIOU])['`´]/g, (_, v: string) => ACCENT[v])
}

const PUNCT = new Set(['.', ',', '!', '?', '¡', '¿', ';', ':', '"', '“', '”', '(', ')'])

export function clean(s: string): string {
  return Array.from(s.normalize('NFC').toLowerCase())
    .map((ch) => (PUNCT.has(ch) ? ' ' : ch))
    .join('')
    .split(' ')
    .filter(Boolean)
    .join(' ')
}

/** Usuwa znaki diakrytyczne (combining marks U+0300–U+036F): á→a, ą→a. */
export function stripAccents(s: string): string {
  return Array.from(s.normalize('NFD'))
    .filter((ch) => {
      const c = ch.charCodeAt(0)
      return c < 0x300 || c > 0x36f
    })
    .join('')
    .normalize('NFC')
}

function gradeWord(word: string, answer: string): Grade {
  if (word === answer) return 'correct'
  if (stripAccents(word) === stripAccents(answer)) return 'almost'
  return 'wrong'
}

function words(input: string): string[] {
  return clean(input)
    .split(' ')
    .map((w) => w.trim())
    .filter(Boolean)
}

/**
 * Ocena odpowiedzi. Akceptuje samą formę ("hablo"), formę z zaimkiem ("yo hablo")
 * albo całe zdanie ("Yo hablo español.") — liczy się najlepiej pasujące słowo.
 */
export function grade(input: string, answer: string): Grade {
  const target = answer.normalize('NFC')
  let best: Grade = 'wrong'
  for (const w of words(input)) {
    const g = gradeWord(w, target)
    if (g === 'correct') return 'correct'
    if (g === 'almost') best = 'almost'
  }
  return best
}

/** Najbardziej pasujące słowo z odpowiedzi gracza. */
export function closestWord(input: string, answer: string): string {
  const ws = words(input)
  return ws.find((w) => stripAccents(w) === stripAccents(answer)) ?? ws[ws.length - 1] ?? ''
}

/** Indeksy liter, w których brakuje / jest zły akcent (dla PRAWIE!). */
export function accentDiffs(input: string, answer: string): number[] {
  const a = Array.from(answer.normalize('NFC'))
  const w = Array.from(closestWord(input, answer))
  const out: number[] = []
  if (w.length !== a.length) return out
  for (let i = 0; i < a.length; i++) if (w[i] !== a[i]) out.push(i)
  return out
}
