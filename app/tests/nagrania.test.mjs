// Kontrola przed publikacją: każde nagranie jest na miejscu, a w grze nie ma syntezatora mowy.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { sheetLineId } from '../src/data/cheatsheets'
import { LINES } from '../src/data/commentary'
import { LEVELS } from '../src/data/levels'

const APP = fileURLToPath(new URL('..', import.meta.url))
const AUDIO = join(APP, '..', 'docs', 'audio')

describe('nagrania', () => {
  it('manifest ma każdą kwestię, słówko i ściągę, a wszystkie pliki istnieją', () => {
    const m = JSON.parse(readFileSync(join(AUDIO, 'manifest.json'), 'utf8'))
    const ids = [...LINES.map((l) => l.id), ...LEVELS.map(sheetLineId)]
    expect(ids.filter((id) => !m.lines[id]?.length)).toEqual([])
    const hashes = new Set(Object.values(m.lines).flat())
    expect([...hashes].filter((h) => !existsSync(join(AUDIO, 'seg', `${h}.mp3`)))).toEqual([])
  })

  it('w grze nie ma syntezatora mowy z przeglądarki (sztuczny głos)', () => {
    const offenders = []
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) walk(path)
        else if (/\.tsx?$/.test(name) && !name.includes('.test.') && /speechSynthesis|SpeechSynthesisUtterance/.test(readFileSync(path, 'utf8')))
          offenders.push(path)
      }
    }
    walk(join(APP, 'src'))
    expect(offenders).toEqual([])
  })
})
