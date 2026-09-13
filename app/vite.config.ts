/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// numer buildu: wpisany w grę i do version.json — gra sama wykrywa nową wersję na serwerze
const BUILD_ID = Date.now().toString(36)

// base './' — zbudowana gra działa z dowolnego folderu (i jako jeden plik HTML)
export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    react(),
    {
      name: 'version-json',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) })
      },
    },
  ],
  // wszystko (też czcionki) inline — gra jako jeden plik HTML, działa bez dodatkowych zapytań
  build: {
    assetsInlineLimit: 10_000_000,
  },
  test: {
    environment: 'node',
  },
})
