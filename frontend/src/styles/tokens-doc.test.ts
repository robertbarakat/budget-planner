/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(import.meta.dirname, '..', '..', '..')
const css = readFileSync(join(root, 'frontend/src/styles/tokens.css'), 'utf8')
const doc = readFileSync(join(root, 'docs/design-tokens.md'), 'utf8')

const inCss = [...css.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]).sort()
const inDoc = [...doc.matchAll(/^\| `(--[a-z0-9-]+)` \|/gm)].map((m) => m[1]).sort()

describe('docs/design-tokens.md', () => {
  it('elenca tutti i token di tokens.css', () => {
    expect(inCss.filter((n) => !inDoc.includes(n))).toEqual([])
  })

  it('non elenca token che non esistono più', () => {
    expect(inDoc.filter((n) => !inCss.includes(n))).toEqual([])
  })
})
