// Skleja build Vite w jeden plik HTML (CSS + JS w środku):
//  - ../GRAJ_Spanish_Verb_Rush.html  → dwuklik i gra działa, bez serwera i bez npm
//  - ../docs/index.html               → wersja publikowana na GitHub Pages (link dla gracza)
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const app = join(dirname(fileURLToPath(import.meta.url)), '..')
const assets = join(app, 'dist', 'assets')
const files = readdirSync(assets)
const jsFile = files.find((f) => f.endsWith('.js'))
const cssFile = files.find((f) => f.endsWith('.css'))
if (!jsFile || !cssFile) throw new Error('Brak dist/assets — najpierw npm run build')

// "</script" w kodzie zamknąłby tag — rozbijamy go
const js = readFileSync(join(assets, jsFile), 'utf8').split('</script').join('<\\/script')
const css = readFileSync(join(assets, cssFile), 'utf8')

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com" />\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Rubik:wght@400;600;700;800&display=swap" />'

const full = `<!doctype html>
<html lang="pl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content" />
<meta name="theme-color" content="#0d1846" />
<title>Spanish Verb Rush</title>
${FONTS}
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script type="module">${js}</script>
</body>
</html>
`

mkdirSync(join(app, '..', 'docs'), { recursive: true })
writeFileSync(join(app, '..', 'GRAJ_Spanish_Verb_Rush.html'), full)
writeFileSync(join(app, '..', 'docs', 'index.html'), full)
console.log(`OK: GRAJ_Spanish_Verb_Rush.html (${Math.round(full.length / 1024)} KB) + docs/index.html`)
