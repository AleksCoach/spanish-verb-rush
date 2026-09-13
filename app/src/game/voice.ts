import { LINES_BY_CAT, displayText } from '../data/commentary'
import type { Line } from '../data/commentary'

// Wszystko, co gra mówi, to nagrania (ElevenLabs): po hiszpańsku mówi Hiszpan, po polsku Polak.
// Każda kwestia = kilka fragmentów audio/seg/<hash>.mp3 granych po kolei (lista w audio/manifest.json).
// Bez nagrań gra milczy — żadnego syntezatora mowy z telefonu czy komputera.

type Manifest = { lines: Record<string, string[]> }
type Item = {
  lineId: string
  files: string[]
  caption: string | null
  /** następne pytanie może przerwać (podpowiedź, ściąga) */
  cuttable: boolean
  /** comment = komentator, word = słówko przy pytaniu, line = nagranie na żądanie (ściąga) */
  kind: 'comment' | 'word' | 'line'
  /** koniec albo przerwanie tej kwestii */
  done?: () => void
}

let manifest: Manifest | null = null
let loading: Promise<void> | null = null
let enabled = true
let player: HTMLAudioElement | null = null
let queue: Item[] = []
let current: { item: Item; index: number } | null = null
let captionListener: ((text: string | null) => void) | null = null
// każde nowe nagranie i każda pauza unieważnia stare play() — ich spóźnione błędy nie ruszają kolejki
let playToken = 0
const bags = new Map<string, string[]>()

async function fetchManifest(): Promise<void> {
  try {
    const res = await fetch('audio/manifest.json', { cache: 'no-cache' })
    if (!res.ok) return
    const data = (await res.json()) as Manifest
    if (data && data.lines && typeof data.lines === 'object') manifest = data
  } catch {
    manifest = null
  }
}

/** wczytuje listę nagrań; po nieudanej próbie następne wywołanie próbuje znowu */
export function loadVoiceManifest(): Promise<void> {
  if (manifest) return Promise.resolve()
  if (!loading) {
    loading = fetchManifest().finally(() => {
      loading = null
    })
  }
  return loading
}

export function voiceReady(): boolean {
  return Boolean(manifest && Object.keys(manifest.lines).length > 0)
}

/** czy jest nagranie o tym id (np. ściąga poziomu) */
export function hasRecording(id: string): boolean {
  return Boolean(manifest?.lines[id]?.length)
}

export function setCommentatorEnabled(on: boolean): void {
  enabled = on
  if (!on) {
    dropQueued((i) => i.kind !== 'comment')
    if (current?.item.kind === 'comment') {
      stopCurrent()
      startNext()
    }
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

function dropQueued(keep: (i: Item) => boolean): void {
  const dropped = queue.filter((i) => !keep(i))
  queue = queue.filter(keep)
  for (const i of dropped) i.done?.()
}

function stopCurrent(): void {
  // samo pause — bez czyszczenia src, żeby nie wywołać „error” i przeskoku kolejki
  playToken += 1
  getPlayer()?.pause()
  const item = current?.item
  current = null
  captionListener?.(null)
  item?.done?.()
}

function playFile(): void {
  const p = getPlayer()
  if (!p || !current) return
  const token = ++playToken
  p.src = `audio/seg/${current.item.files[current.index]}.mp3`
  p.play().catch(() => {
    // przerwane pauzą albo następnym nagraniem, zanim zagrało — już obsłużone
    if (token !== playToken) return
    // autoodtwarzanie zablokowane (brak interakcji) albo brak pliku — pomijamy kwestię
    finishCurrent()
  })
}

function finishCurrent(): void {
  const item = current?.item
  current = null
  captionListener?.(null)
  item?.done?.()
  startNext()
}

function advance(): void {
  if (!current) return
  if (current.index + 1 < current.item.files.length) {
    current = { item: current.item, index: current.index + 1 }
    playFile()
    return
  }
  finishCurrent()
}

function startNext(): void {
  const item = queue.shift()
  if (!item) return
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
  const pool = (LINES_BY_CAT[cat] ?? []).filter((l) => hasRecording(l.id))
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
    dropQueued(() => false)
    stopCurrent()
  }
  enqueue([{ lineId: line.id, files: manifest!.lines[line.id], caption: displayText(line), cuttable: opts.cuttable ?? false, kind: 'comment' }])
  return true
}

/** słówko przy pytaniu: po polsku (Polak), potem po hiszpańsku (Hiszpan); przerywa podpowiedź, czeka na pochwałę */
export function playWord(infinitive: string): void {
  const pl = `word-pl-${infinitive}`
  const es = `word-es-${infinitive}`
  if (!hasRecording(pl) || !hasRecording(es)) {
    void loadVoiceManifest() // lista nagrań nie doszła przy starcie — następne pytanie już zagra
    return
  }
  dropQueued((i) => !i.cuttable && i.kind !== 'word')
  if (current && (current.item.cuttable || current.item.kind === 'word')) stopCurrent()
  enqueue([
    { lineId: pl, files: manifest!.lines[pl], caption: null, cuttable: true, kind: 'word' },
    { lineId: es, files: manifest!.lines[es], caption: null, cuttable: true, kind: 'word' },
  ])
}

/** nagranie na żądanie (ściąga): przerywa wszystko inne; `done` po końcu albo przerwaniu */
export function playLine(id: string, done?: () => void): boolean {
  if (!hasRecording(id)) return false
  dropQueued(() => false)
  stopCurrent()
  enqueue([{ lineId: id, files: manifest!.lines[id], caption: null, cuttable: true, kind: 'line', done }])
  return true
}

/** zatrzymuje to nagranie, jeśli gra albo czeka w kolejce */
export function stopLine(id: string): void {
  dropQueued((i) => i.lineId !== id)
  if (current?.item.lineId === id) {
    stopCurrent()
    startNext()
  }
}

export function stopVoice(): void {
  dropQueued(() => false)
  stopCurrent()
}
