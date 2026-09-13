// Nagrania gry (ElevenLabs): komentator Toni, słówka i ściągi — po hiszpańsku mówi Hiszpan, po polsku Polak.
//   node scripts/generate-voice.mjs licz                               → ile nagrań, fragmentów i znaków + czego brakuje (bez API)
//   node scripts/generate-voice.mjs probki                             → próbki głosów: docs/probki/index.html
//   node scripts/generate-voice.mjs wszystko <glosES> <glosPL> [model] → wszystkie nagrania + docs/audio/manifest.json
// Klucz: app/.env.local (ELEVENLABS_API_KEY=...). Nie trafia do repo.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { VOICE_LINES } from './voice-lines.mjs'

const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = join(APP, '..', 'docs')
const SEG = join(DOCS, 'audio', 'seg')
const SAMPLES = join(DOCS, 'probki')
const API = 'https://api.elevenlabs.io'
const FORMAT = 'mp3_44100_64'
const DEFAULT_MODEL = 'eleven_v3'

const ES_CANDIDATES = ['mGlMpcOq63YZLdidTVyo', 'D7dkYvH17OKLgp4SLulf', 'NhUo7cJi70nyU8yfCimA'] // Dino, Martin Osborne, Theo
const PL_CANDIDATES = ['H0Es1EyjnIrTdY0BEF0V', '04BD7Fenyf9Ysq983wrd', 'RHB1OklmK66FVkCBVHhP'] // Maciek, Oscar, Krzysztof

function apiKey() {
  const file = join(APP, '.env.local')
  if (!existsSync(file)) return ''
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i > 0 && line.slice(0, i).trim() === 'ELEVENLABS_API_KEY') return line.slice(i + 1).trim()
  }
  return ''
}

const KEY = apiKey()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function needKey() {
  if (!KEY) {
    console.error('Brak klucza w app/.env.local')
    process.exit(1)
  }
}

async function api(path, init = {}) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(`${API}${path}`, { ...init, headers: { 'xi-api-key': KEY, ...(init.headers ?? {}) } })
    if (res.status === 429 || res.status >= 500) {
      await sleep(1500 * attempt)
      continue
    }
    return res
  }
  throw new Error(`API ${path}: za dużo prób`)
}

/** WIELKIE nazwy (TENER) czytane jako słowo, nie literowane */
const ttsText = (text) => text.replace(/\b[A-ZÁÉÍÓÚÑ]{2,}\b/g, (w) => w.toLowerCase())

function settings(model) {
  if (model === 'eleven_v3') return { stability: 0.5 }
  return { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true }
}

async function tts(text, voiceId, model, lang) {
  const body = { text: ttsText(text), model_id: model, voice_settings: settings(model), language_code: lang }
  let res = await api(`/v1/text-to-speech/${voiceId}?output_format=${FORMAT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 400) {
    delete body.language_code
    res = await api(`/v1/text-to-speech/${voiceId}?output_format=${FORMAT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return Buffer.from(await res.arrayBuffer())
}

const segHash = (voice, model, lang, text) => createHash('sha1').update(`${voice}|${model}|${lang}|${text}`).digest('hex').slice(0, 14)

/** dodaje głos z biblioteki do „Moich głosów” (API wymaga tego przed użyciem) */
async function ensureVoices(ids, language) {
  const mine = await (await api('/v1/voices')).json()
  const mineIds = new Set((mine.voices ?? []).map((v) => v.voice_id))
  const shared = []
  for (const q of ['sort=trending', 'search=energetic', 'search=upbeat', 'search=dynamic']) {
    const r = await api(`/v1/shared-voices?page_size=100&language=${language}&gender=male&${q}`)
    if (r.ok) shared.push(...((await r.json()).voices ?? []))
  }
  const out = []
  for (const id of ids) {
    const meta = shared.find((v) => v.voice_id === id)
    if (!mineIds.has(id) && meta) {
      const add = await api(`/v1/voices/add/${meta.public_owner_id}/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_name: `Toni ${language} ${meta.name}`.slice(0, 40) }),
      })
      if (!add.ok) console.log(`Nie dodano głosu ${meta.name}: ${add.status}`)
    }
    out.push({ id, name: meta?.name ?? id, description: meta?.description ?? '' })
  }
  return out
}

async function samples() {
  needKey()
  const es = await ensureVoices(ES_CANDIDATES, 'es')
  const pl = await ensureVoices(PL_CANDIDATES, 'pl')
  const esTexts = ['¡Hola, campeón! ¡Vamos!', '¡Golazo! ¡Qué máquina!', 'Hablas, comes, vives.', 'trabajar']
  const plTexts = ['Pięć z rzędu! Kibice wstają z miejsc!', 'Uważaj! Najpierw sprawdź końcówkę, potem osobę.', 'pracować']
  mkdirSync(SAMPLES, { recursive: true })
  const block = async (voices, texts, lang, label) => {
    const parts = []
    for (const [i, v] of voices.entries()) {
      const clips = []
      for (const [j, t] of texts.entries()) {
        const file = `${lang}${i + 1}-${j + 1}.mp3`
        const out = join(SAMPLES, file)
        if (!existsSync(out)) writeFileSync(out, await tts(t, v.id, DEFAULT_MODEL, lang))
        clips.push({ file, t })
        console.log('✓', file)
      }
      parts.push(
        `<section><h2>${label} ${i + 1}</h2><p>${esc(v.name)}</p>${clips
          .map((c) => `<div class="clip"><span>${esc(c.t)}</span><audio controls preload="none" src="${c.file}"></audio></div>`)
          .join('')}</section>`,
      )
    }
    return parts.join('')
  }
  const esHtml = await block(es, esTexts, 'es', 'Hiszpan')
  const plHtml = await block(pl, plTexts, 'pl', 'Polak')
  writeFileSync(join(SAMPLES, 'voices.json'), JSON.stringify({ es, pl }, null, 2))
  writeFileSync(
    join(SAMPLES, 'index.html'),
    `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Głosy komentatorów — próbki</title>
<style>body{margin:0;background:#0d1846;color:#eef2ff;font:16px/1.45 system-ui,sans-serif}main{max-width:720px;margin:0 auto;padding:20px}
h1{margin:0 0 6px;font-size:28px}h3{margin:26px 0 0;color:#ffb627;font-size:22px}p{color:#a9b6e6;margin:4px 0}
section{background:#16256a;border-radius:14px;padding:14px;margin:12px 0;box-shadow:inset 0 0 0 1px rgba(176,196,255,.18)}
h2{margin:0;font-size:20px}.clip{display:grid;gap:4px;margin:10px 0}.clip span{font-size:14px}audio{width:100%}</style></head>
<body><main><h1>Głosy komentatorów</h1><p>Wybierz jednego Hiszpana i jednego Polaka. Napisz Drew np. <b>„H2 P1”</b>.</p>
<h3>Hiszpan (mówi po hiszpańsku)</h3>${esHtml}<h3>Polak (mówi po polsku)</h3>${plHtml}</main></body></html>`,
  )
  console.log('Próbki: docs/probki/index.html')
}

async function all(esVoice, plVoice, model = DEFAULT_MODEL) {
  needKey()
  if (!esVoice || !plVoice) {
    console.error('Użycie: wszystko <glosES> <glosPL> [model]')
    process.exit(1)
  }
  mkdirSync(SEG, { recursive: true })
  const manifest = { esVoice, plVoice, model, lines: {} }
  const jobs = new Map()
  for (const { id, segments } of VOICE_LINES) {
    manifest.lines[id] = segments.map((s) => {
      const voice = s.lang === 'es' ? esVoice : plVoice
      const h = segHash(voice, model, s.lang, s.text)
      if (!existsSync(join(SEG, `${h}.mp3`))) jobs.set(h, { ...s, voice })
      return h
    })
  }
  console.log(`Do nagrania: ${jobs.size} fragmentów (${[...jobs.values()].reduce((a, j) => a + j.text.length, 0)} znaków)`)
  const queue = [...jobs.entries()]
  let done = 0
  let failed = 0
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const [h, j] = item
      try {
        writeFileSync(join(SEG, `${h}.mp3`), await tts(j.text, j.voice, model, j.lang))
        done += 1
        if (done % 25 === 0) console.log(`… ${done}/${jobs.size}`)
      } catch (e) {
        failed += 1
        console.error(`✗ ${j.lang} "${j.text}": ${e.message}`)
      }
    }
  }
  await Promise.all([worker(), worker(), worker()])
  // w manifeście tylko kwestie, których wszystkie fragmenty istnieją
  for (const [id, hashes] of Object.entries(manifest.lines)) {
    if (!hashes.every((h) => existsSync(join(SEG, `${h}.mp3`)))) delete manifest.lines[id]
  }
  writeFileSync(join(DOCS, 'audio', 'manifest.json'), JSON.stringify(manifest))
  console.log(`Gotowe: ${done} nagranych, ${failed} błędów, ${Object.keys(manifest.lines).length}/${VOICE_LINES.length} nagrań w manifeście`)
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')

const [cmd, a, b, c] = process.argv.slice(2)
if (cmd === 'licz') {
  const segs = VOICE_LINES.flatMap((l) => l.segments)
  const uniq = new Map(segs.map((s) => [`${s.lang}|${s.text}`, s]))
  const chars = [...uniq.values()].reduce((n, s) => n + s.text.length, 0)
  console.log(`${VOICE_LINES.length} nagrań, ${segs.length} fragmentów (${uniq.size} unikalnych), ~${chars} znaków`)
  const mf = join(DOCS, 'audio', 'manifest.json')
  if (existsSync(mf)) {
    const m = JSON.parse(readFileSync(mf, 'utf8'))
    const missing = [...uniq.values()].filter((s) => !existsSync(join(SEG, `${segHash(s.lang === 'es' ? m.esVoice : m.plVoice, m.model, s.lang, s.text)}.mp3`)))
    console.log(`Brakuje dla głosów z manifestu: ${missing.length} fragmentów (${missing.reduce((n, s) => n + s.text.length, 0)} znaków)`)
  }
} else if (cmd === 'probki') await samples()
else if (cmd === 'wszystko') await all(a, b, c)
else console.log('Komendy: licz | probki | wszystko <glosES> <glosPL> [model]')
