import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vitest/config'

// Scrive un id di build in sw.js: il file cambia a ogni build e il browser rileva la nuova versione.
function swBuildId(): Plugin {
  return {
    name: 'sw-build-id',
    apply: 'build',
    closeBundle() {
      const file = 'dist/sw.js'
      writeFileSync(file, readFileSync(file, 'utf8').replace('__BUILD_ID__', Date.now().toString(36)))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), swBuildId()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // I test non parlano mai con il vero Supabase: indirizzo locale inesistente, chiave finta.
    env: { VITE_SUPABASE_URL: 'http://127.0.0.1:9', VITE_SUPABASE_ANON_KEY: 'test-anon-key' },
  },
})
