// Skleja build Vite w jeden plik HTML (CSS + JS w środku):
//  - ../docs/index.html          → gra publikowana na GitHub Pages (link dla gracza)
//  - ../docs/version.json        → numer wersji: otwarta gra sama wykrywa nową i się przeładowuje
//  - ../GRAJ_Spanish_Verb_Rush.html → skrót na komputer: przenosi do gry w internecie
//    (nagrania głosów leżą obok gry na serwerze, więc gra z samego pliku byłaby niema)
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const GAME_URL = 'https://alekscoach.github.io/spanish-verb-rush/'
const app = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(app, 'dist')
const assets = join(dist, 'assets')
const files = readdirSync(assets)
const jsFile = files.find((f) => f.endsWith('.js'))
const cssFile = files.find((f) => f.endsWith('.css'))
if (!jsFile || !cssFile) throw new Error('Brak dist/assets — najpierw npm run build')

// "</script" w kodzie zamknąłby tag — rozbijamy go
const js = readFileSync(join(assets, jsFile), 'utf8').split('</script').join('<\\/script')
const css = readFileSync(join(assets, cssFile), 'utf8')

const full = `<!doctype html>
<html lang="pl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content" />
<meta name="theme-color" content="#0d1846" />
<title>¡A conjugar!</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script type="module">${js}</script>
</body>
</html>
`

const shortcut = `<!doctype html>
<html lang="pl">
<head>
<meta charset="UTF-8" />
<title>¡A conjugar!</title>
<meta http-equiv="refresh" content="0; url=${GAME_URL}" />
</head>
<body style="font:18px system-ui,sans-serif;padding:24px">
<p>Gra jest w internecie: <a href="${GAME_URL}">${GAME_URL}</a></p>
</body>
</html>
`

const docs = join(app, '..', 'docs')
mkdirSync(docs, { recursive: true })
writeFileSync(join(docs, 'index.html'), full)
copyFileSync(join(dist, 'version.json'), join(docs, 'version.json'))
writeFileSync(join(app, '..', 'GRAJ_Spanish_Verb_Rush.html'), shortcut)
const { id } = JSON.parse(readFileSync(join(dist, 'version.json'), 'utf8'))
console.log(`OK: docs/index.html (${Math.round(full.length / 1024)} KB), wersja ${id} + skrót GRAJ_Spanish_Verb_Rush.html`)
