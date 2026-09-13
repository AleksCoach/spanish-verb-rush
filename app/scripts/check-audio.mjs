// Kontrola nagrań: czas trwania vs długość tekstu (wyłapuje ucięte albo „rozgadane” fragmenty)
import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LINES, segmentsOf } from '../src/data/commentary.ts'

const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = join(APP, '..', 'docs', 'audio')
const m = JSON.parse(readFileSync(join(DOCS, 'manifest.json'), 'utf8'))
const hash = (voice, lang, text) => createHash('sha1').update(`${voice}|${m.model}|${lang}|${text}`).digest('hex').slice(0, 14)

const rows = []
const seen = new Set()
for (const line of LINES) {
  for (const s of segmentsOf(line)) {
    const h = hash(s.lang === 'es' ? m.esVoice : m.plVoice, s.lang, s.text)
    if (seen.has(h)) continue
    seen.add(h)
    const sec = (statSync(join(DOCS, 'seg', `${h}.mp3`)).size * 8) / 64000
    const letters = s.text.replace(/[^\p{L}]/gu, '').length || 1
    rows.push({ id: line.id, lang: s.lang, text: s.text, sec, perLetter: sec / letters })
  }
}
rows.sort((a, b) => b.perLetter - a.perLetter)
const fmt = (r) => `${r.perLetter.toFixed(3)} s/lit · ${r.sec.toFixed(2)} s · ${r.lang} · ${r.id} · "${r.text}"`
console.log('NAJWOLNIEJSZE (podejrzane: dłuższe niż tekst):')
rows.slice(0, 12).forEach((r) => console.log('  ' + fmt(r)))
console.log('NAJSZYBSZE (podejrzane: ucięte):')
rows.slice(-8).forEach((r) => console.log('  ' + fmt(r)))
const avg = rows.reduce((a, r) => a + r.perLetter, 0) / rows.length
console.log(`średnio ${avg.toFixed(3)} s/literę, fragmentów: ${rows.length}`)
