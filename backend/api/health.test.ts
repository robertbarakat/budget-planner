import { describe, expect, it } from 'vitest'
import { GET } from './health.ts'

describe('GET /api/health', () => {
  it('risponde 200 con JSON', async () => {
    const res = GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})
