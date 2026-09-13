// Jednorazowo: oznacza hiszpańskie fragmenty kwestii jako {es:...} (reszta = polski głos).
//   node scripts/segment-lines.mjs podglad   → pokaż wynik
//   node scripts/segment-lines.mjs zapisz    → wpisz znaczniki do src/data/commentary.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LINES } from '../src/data/commentary.ts'
import { VERBS } from '../src/data/verbs.ts'

const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const FILE = join(APP, 'src', 'data', 'commentary.ts')

const lexicon = new Set(
  `yo tú él ella nosotros nosotras vosotros ellos ellas me te se nos os
  hola campeón crack vamos buenas bienvenido venga por ello nuevo conjugar qué alegría verte adelante
  concentración puedes ojo atención cuidado miedo sin aguanta suerte silencio en el estadio dale fuerza
  tres seguidas eso es muy bien olé perfecto sí señor genial bravo buenísimo golazo cinco máquina increíble
  madre mía espectacular imparable fantástico no lo creo de chilena del mundo pasada histórico leyenda así hace
  casi uy tilde con la cerca ánimo pasa nada sigue tranquilo excusas jefe derrotado partido victoria has conseguido
  adiós dragón noches última parte estrellas matrícula honor impresionante fallos dos jugado buen aprobado vale otra
  vez rindas subes nivel sobresaliente enhorabuena mejor que ella jugar`
    .split(/\s+/)
    .filter(Boolean),
)
for (const v of VERBS) {
  lexicon.add(v.infinitive)
  for (const f of Object.values(v.forms)) for (const w of f.split(' ')) lexicon.add(w)
}
// litery i gołe końcówki czyta polski głos (brzmią podobnie), nazwy bossów WIELKIMI → hiszpański
for (const w of ['a', 'e', 'o', 'ar', 'er', 'ir', 'as', 'an', 'en', 'ue', 'ie', 'mos', 'amos', 'emos', 'imos', 'áis', 'éis', 'ís']) lexicon.delete(w)

const core = (w) => w.replace(/^[¡¿"„(]+|[.,!?;:"”)]+$/g, '')

function segment(text) {
  const words = text.split(' ')
  let inBang = false
  const tagged = words.map((w) => {
    const c = core(w)
    const lower = c.toLowerCase()
    const startsBang = w.startsWith('¡') || w.startsWith('¿')
    if (startsBang) inBang = true
    let es = inBang || lexicon.has(lower) || (c === 'IR' || (c.length > 2 && c === c.toUpperCase() && lexicon.has(lower)))
    if (!c) es = inBang
    if (w.endsWith('!') || w.endsWith('?')) inBang = false
    return { w, es }
  })
  // krótkie wtrącenia złożone tylko z interpunkcji dołącz do poprzedniego
  const segs = []
  for (const t of tagged) {
    const last = segs[segs.length - 1]
    if (last && last.es === t.es) last.words.push(t.w)
    else segs.push({ es: t.es, words: [t.w] })
  }
  return segs.map((s) => (s.es ? `{es:${s.words.join(' ')}}` : s.words.join(' '))).join(' ')
}

const mode = process.argv[2]
const lines = LINES.filter((l) => !l.lang)
if (mode === 'podglad') {
  for (const l of lines) console.log(`${l.id}: ${segment(l.text)}`)
} else if (mode === 'zapisz') {
  let src = readFileSync(FILE, 'utf8')
  let n = 0
  for (const l of lines) {
    const from = `'${l.text.replace(/'/g, "\\'")}'`
    if (!src.includes(from)) continue
    src = src.replace(from, `'${segment(l.text).replace(/'/g, "\\'")}'`)
    n += 1
  }
  writeFileSync(FILE, src)
  console.log(`oznaczono ${n} kwestii`)
} else console.log('podglad | zapisz')
