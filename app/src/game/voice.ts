import { LINES_BY_CAT, displayText } from '../data/commentary'
import type { Line } from '../data/commentary'
import { sayWord, stopSpeaking } from './speech'

// Komentatorzy z nagrań (ElevenLabs): po hiszpańsku mówi Hiszpan, po polsku Polak.
// Każda kwestia = kilka fragmentów audio/seg/<hash>.mp3 granych po kolei (lista w audio/manifest.json).
// Gdy nagrań nie ma, komentator milczy, a słówka czyta głos przeglądarki.

type Manifest = { lines: Record<string, string[]> }
type Item = { lineId: string; files: string[]; caption: string | null; cuttable: boolean; word: boolean }

let manifest: Manifest | null = null
let enabled = true
let player: HTMLAudioElement | null = null
let queue: Item[] = []
let current: { item: Item; index: number } | null = null
let captionListener: ((text: string | null) => void) | null = null
const bags = new Map<string, string[]>()

export async function loadVoiceManifest(): Promise<void> {
  try {
    const res = await fetch('audio/manifest.json', { cache: 'no-cache' })
    if (!res.ok) return
    const data = (await res.json()) as Manifest
    if (data && data.lines && typeof data.lines === 'object') manifest = data
  } catch {
    manifest = null
  }
}

export function voiceReady(): boolean {
  return Boolean(manifest && Object.keys(manifest.lines).length > 0)
}

const has = (id: string) => Boolean(manifest?.lines[id]?.length)

export function setCommentatorEnabled(on: boolean): void {
  enabled = on
  if (!on) {
    queue = queue.filter((i) => i.word)
    if (current && !current.item.word) stopCurrent()
  }
}

export function onCaption(fn: ((text: string | null) => void) | null): void {
  captionListener = fn
}

function getPlayer(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null
  if (!player) {
    player = new Audio()
    player.addEventListener('ended', advance)
    player.addEventListener('error', advance)
  }
  return player
}

function stopCurrent(): void {
  // samo pause — bez czyszczenia src, żeby nie wywołać „error” i przeskoku kolejki
  getPlayer()?.pause()
  current = null
  captionListener?.(null)
}

function playFile(): void {
  const p = getPlayer()
  if (!p || !current) return
  p.src = `audio/seg/${current.item.files[current.index]}.mp3`
  p.play().catch(() => {
    // autoodtwarzanie zablokowane (brak interakcji) albo brak pliku — pomijamy kwestię
    current = null
    captionListener?.(null)
    startNext()
  })
}

function advance(): void {
  if (!current) return
  if (current.index + 1 < current.item.files.length) {
    current = { item: current.item, index: current.index + 1 }
    playFile()
    return
  }
  current = null
  startNext()
}

function startNext(): void {
  const item = queue.shift()
  if (!item) {
    captionListener?.(null)
    return
  }
  current = { item, index: 0 }
  if (item.caption) captionListener?.(item.caption)
  playFile()
}

function enqueue(items: Item[]): void {
  queue.push(...items)
  if (!current) startNext()
}

/** losowa kwestia z kategorii, bez powtórek aż do wyczerpania puli */
function pick(cat: string): Line | null {
  const pool = (LINES_BY_CAT[cat] ?? []).filter((l) => has(l.id))
  if (!pool.length) return null
  let bag = bags.get(cat)
  if (!bag || !bag.length) {
    bag = pool.map((l) => l.id).sort(() => Math.random() - 0.5)
    bags.set(cat, bag)
  }
  const id = bag.shift()!
  return pool.find((l) => l.id === id) ?? pool[0]
}

/**
 * Komentarz. `cuttable` = następne pytanie może go przerwać (np. podpowiedź po błędzie).
 * Zwraca true, gdy kwestia poszła do kolejki.
 */
export function comment(cat: string, opts: { cuttable?: boolean; interrupt?: boolean } = {}): boolean {
  if (!enabled || !voiceReady()) return false
  const line = pick(cat)
  if (!line) return false
  if (opts.interrupt) {
    queue = []
    stopSpeaking()
    stopCurrent()
  }
  enqueue([{ lineId: line.id, files: manifest!.lines[line.id], caption: displayText(line), cuttable: opts.cuttable ?? false, word: false }])
  return true
}

/** słówko przy pytaniu: po polsku (Polak), potem po hiszpańsku (Hiszpan); przerywa podpowiedź, czeka na pochwałę */
export function playWord(infinitive: string, meaning: string): void {
  const pl = `word-pl-${infinitive}`
  const es = `word-es-${infinitive}`
  if (!voiceReady() || !has(pl) || !has(es)) {
    sayWord(infinitive, meaning)
    return
  }
  queue = queue.filter((i) => !i.cuttable && !i.word)
  if (current && (current.item.cuttable || current.item.word)) stopCurrent()
  enqueue([
    { lineId: pl, files: manifest!.lines[pl], caption: null, cuttable: true, word: true },
    { lineId: es, files: manifest!.lines[es], caption: null, cuttable: true, word: true },
  ])
}

export function stopVoice(): void {
  queue = []
  stopCurrent()
}
