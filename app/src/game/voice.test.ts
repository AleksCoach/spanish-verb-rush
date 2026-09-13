import { beforeAll, describe, expect, it, vi } from 'vitest'

// Atrapa odtwarzacza jak w przeglądarce: play() czeka na wczytanie (tryb `slow`),
// a pauza albo zmiana pliku przed startem odrzuca je błędem AbortError
class FakeAudio {
  static last: FakeAudio | null = null
  static slow = false
  private file = ''
  private pending: { resolve: () => void; reject: (e: unknown) => void } | null = null
  private listeners: Record<string, (() => void)[]> = {}
  constructor() {
    FakeAudio.last = this
  }
  get src() {
    return this.file
  }
  set src(value: string) {
    this.abort()
    this.file = value
  }
  addEventListener(type: string, fn: () => void) {
    ;(this.listeners[type] ??= []).push(fn)
  }
  play() {
    if (!FakeAudio.slow) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      this.pending = { resolve, reject }
    })
  }
  pause() {
    this.abort()
  }
  /** nagranie się wczytało i gra */
  start() {
    this.pending?.resolve()
    this.pending = null
  }
  emit(type: string) {
    for (const fn of this.listeners[type] ?? []) fn()
  }
  private abort() {
    this.pending?.reject(new DOMException('interrupted', 'AbortError'))
    this.pending = null
  }
}

const file = () => FakeAudio.last?.src.split('/').pop()
const flush = () => new Promise((r) => setTimeout(r, 0))

beforeAll(() => {
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        lines: {
          'welcome-01': ['w1', 'w2'],
          'hint-generic-01': ['h1', 'h2'],
          'combo5-01': ['c1', 'c2'],
          'word-pl-hablar': ['pl'],
          'word-es-hablar': ['es'],
        },
      }),
    })),
  )
})

describe('komentatorzy — kolejka nagrań', () => {
  it('gra fragmenty po kolei, słówko przerywa podpowiedź, ale czeka na pochwałę', async () => {
    const voice = await import('./voice')
    await voice.loadVoiceManifest()
    expect(voice.voiceReady()).toBe(true)

    const captions: (string | null)[] = []
    voice.onCaption((c) => captions.push(c))

    expect(voice.comment('welcome')).toBe(true)
    expect(file()).toBe('w1.mp3')
    expect(captions.at(-1)).toContain('Toni')
    FakeAudio.last!.emit('ended')
    expect(file()).toBe('w2.mp3')
    FakeAudio.last!.emit('ended')
    expect(captions.at(-1)).toBeNull()

    // podpowiedź po błędzie (można przerwać) → nowe pytanie czyta słówko od razu
    voice.comment('hint-generic', { cuttable: true })
    expect(file()).toBe('h1.mp3')
    voice.playWord('hablar', 'mówić')
    expect(file()).toBe('pl.mp3')
    FakeAudio.last!.emit('ended')
    expect(file()).toBe('es.mp3')
    FakeAudio.last!.emit('ended')

    // pochwała za serię — słówko czeka, aż się skończy
    voice.comment('combo5')
    expect(file()).toBe('c1.mp3')
    voice.playWord('hablar', 'mówić')
    expect(file()).toBe('c1.mp3')
    FakeAudio.last!.emit('ended')
    expect(file()).toBe('c2.mp3')
    FakeAudio.last!.emit('ended')
    expect(file()).toBe('pl.mp3')

    // wyłączony komentator milczy
    voice.setCommentatorEnabled(false)
    expect(voice.comment('welcome')).toBe(false)
  })

  it('przerwanie nagrania, które jeszcze się wczytuje, nie gubi słówka ani reszty kwestii', async () => {
    const voice = await import('./voice')
    voice.setCommentatorEnabled(true)
    voice.stopVoice()
    FakeAudio.slow = true
    const captions: (string | null)[] = []
    voice.onCaption((c) => captions.push(c))

    // szybki Enter: podpowiedź jeszcze się nie zaczęła, a już jest nowe pytanie
    voice.comment('hint-generic', { cuttable: true })
    expect(file()).toBe('h1.mp3')
    voice.playWord('hablar', 'mówić')
    await flush()
    expect(file()).toBe('pl.mp3')
    FakeAudio.last!.start()
    FakeAudio.last!.emit('ended')
    expect(file()).toBe('es.mp3')
    FakeAudio.last!.start()
    FakeAudio.last!.emit('ended')

    // szybkie przejście do poziomu: powitanie przerwane zapowiedzią, zanim zagrało
    voice.comment('welcome')
    voice.comment('combo5', { interrupt: true })
    await flush()
    expect(file()).toBe('c1.mp3')
    expect(captions.at(-1)).not.toBeNull()
    FakeAudio.last!.start()
    FakeAudio.last!.emit('ended')
    expect(file()).toBe('c2.mp3')
    FakeAudio.slow = false
  })
})
