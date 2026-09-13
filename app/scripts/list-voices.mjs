// Lista kandydatów na głos Toniego (hiszpański z Hiszpanii, męski) — bez generowania audio
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const key = readFileSync(join(APP, '.env.local'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .find((l) => l.startsWith('ELEVENLABS_API_KEY='))
  ?.slice('ELEVENLABS_API_KEY='.length)

const q = process.argv[2] ?? ''
const res = await fetch(
  `https://api.elevenlabs.io/v1/shared-voices?page_size=60&language=es&gender=male&accent=peninsular${q ? `&search=${encodeURIComponent(q)}` : ''}`,
  { headers: { 'xi-api-key': key } },
)
const { voices = [] } = await res.json()
for (const v of voices) {
  console.log(
    [v.voice_id, v.name, v.age, v.descriptive, v.use_case, `klony:${v.cloned_by_count}`, (v.description ?? '').slice(0, 110).split('\n').join(' ')].join(' | '),
  )
}
