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

function tokens(s: string): string[] {
  return clean(s).split(' ').filter(Boolean)
}

/** Okno słów z odpowiedzi gracza, które pasuje do formy (dokładnie albo bez akcentów). */
function matchWindow(input: string, answer: string): { words: string[]; grade: Grade } | null {
  const target = tokens(answer)
  const ws = tokens(input)
  let almost: string[] | null = null
  for (let i = 0; i + target.length <= ws.length; i++) {
    const win = ws.slice(i, i + target.length)
    if (win.every((w, j) => w === target[j])) return { words: win, grade: 'correct' }
    if (!almost && win.every((w, j) => stripAccents(w) === stripAccents(target[j]))) almost = win
  }
  return almost ? { words: almost, grade: 'almost' } : null
}

/**
 * Ocena odpowiedzi. Akceptuje samą formę ("hablo", "me levanto"), formę z podmiotem ("yo me levanto")
 * albo całe zdanie ("Yo me levanto a las siete.") — forma musi wystąpić w całości, w tej kolejności.
 */
export function grade(input: string, answer: string): Grade {
  return matchWindow(input, answer)?.grade ?? 'wrong'
}

/** Fragment odpowiedzi gracza najbliższy poprawnej formie. */
export function closestMatch(input: string, answer: string): string {
  const m = matchWindow(input, answer)
  if (m) return m.words.join(' ')
  const ws = tokens(input)
  return ws.slice(-tokens(answer).length).join(' ')
}

/** Indeksy znaków poprawnej formy, w których brakuje / jest zły akcent (dla PRAWIE!). */
export function accentDiffs(input: string, answer: string): number[] {
  const a = Array.from(clean(answer))
  const w = Array.from(closestMatch(input, answer))
  const out: number[] = []
  if (w.length !== a.length) return out
  for (let i = 0; i < a.length; i++) if (w[i] !== a[i]) out.push(i)
  return out
}
