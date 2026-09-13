import { beforeAll, describe, expect, it, vi } from 'vitest'

// Atrapa odtwarzacza: rejestruje kolejne pliki i pozwala „zakończyć” nagranie
class FakeAudio {
  static last: FakeAudio | null = null
  src = ''
  private listeners: Record<string, (() => void)[]> = {}
  constructor() {
    FakeAudio.last = this
  }
  addEventListener(type: string, fn: () => void) {
    ;(this.listeners[type] ??= []).push(fn)
  }
  play() {
    return Promise.resolve()
  }
  pause() {}
  emit(type: string) {
    for (const fn of this.listeners[type] ?? []) fn()
  }
}

const file = () => FakeAudio.last?.src.split('/').pop()

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
})
