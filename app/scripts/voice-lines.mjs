// Lista wszystkich nagrań gry: kwestie komentatora, słówka i ściągi poziomów.
// Pliki .ts importujemy wprost (Node 24 zdejmuje typy); importy bez rozszerzenia dopina hak poniżej.
import { registerHooks } from 'node:module'

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (err) {
      if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context)
      throw err
    }
  },
})

const { LINES, segmentsOf } = await import('../src/data/commentary.ts')
const { LEVELS } = await import('../src/data/levels.ts')
const { sheetLineId, sheetSpeech } = await import('../src/data/cheatsheets.ts')

/** [{ id, segments: [{ lang: 'pl' | 'es', text }] }] */
export const VOICE_LINES = [
  ...LINES.map((line) => ({ id: line.id, segments: segmentsOf(line) })),
  ...LEVELS.map((level) => ({ id: sheetLineId(level), segments: sheetSpeech(level) })),
]
