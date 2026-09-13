/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' — zbudowana gra działa z dowolnego folderu (i jako jeden plik HTML)
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
