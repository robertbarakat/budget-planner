/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BREAKPOINTS, minWidthQuery } from './breakpoints.ts'

// Vitest non restituisce il contenuto dei .css importati con ?raw: li leggo dal disco.
const srcDir = join(import.meta.dirname, '..')
const cssFiles: Record<string, string> = {}
for (const entry of readdirSync(srcDir, { recursive: true, encoding: 'utf8' })) {
  if (entry.endsWith('.css')) cssFiles[entry] = readFileSync(join(srcDir, entry), 'utf8')
}
const tokens = cssFiles[join('styles', 'tokens.css')] ?? ''

function tokenBreakpoints(): Record<string, number> {
  const found: Record<string, number> = {}
  for (const m of tokens.matchAll(/--breakpoint-([a-z]+):\s*(\d+)px/g)) {
    found[m[1]] = Number(m[2])
  }
  return found
}

describe('breakpoint', () => {
  it('breakpoints.ts coincide con i token di tokens.css', () => {
    expect(tokenBreakpoints()).toEqual(BREAKPOINTS)
  })

  it('le media query usano solo min-width con i valori dei token', () => {
    const allowed = new Set<number>(Object.values(BREAKPOINTS))
    const offenders: string[] = []
    for (const [file, css] of Object.entries(cssFiles)) {
      for (const m of css.matchAll(/@media[^{]*\{/g)) {
        const query = m[0]
        // Le media query di preferenze (reduced-motion, ecc.) non hanno larghezze.
        const widths = [...query.matchAll(/(min|max)-width:\s*([\d.]+)(\w*)/g)]
        for (const w of widths) {
          if (w[1] !== 'min' || w[3] !== 'px' || !allowed.has(Number(w[2]))) {
            offenders.push(`${file}: ${query.trim()}`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('minWidthQuery produce la media query attesa', () => {
    expect(minWidthQuery('desktop')).toBe('(min-width: 1024px)')
  })
})
