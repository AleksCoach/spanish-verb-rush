/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' — zbudowana gra działa z dowolnego folderu (i jako jeden plik HTML)
export default defineConfig({
  base: './',
  plugins: [react()],
  // wszystko (też czcionki) inline — gra jako jeden plik HTML, działa bez dodatkowych zapytań
  build: {
    assetsInlineLimit: 10_000_000,
  },
  test: {
    environment: 'node',
  },
})
