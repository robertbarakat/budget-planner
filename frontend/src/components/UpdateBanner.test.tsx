import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ listener: null as ((w: object | null) => void) | null, apply: vi.fn() }))
vi.mock('../lib/register-sw.ts', () => ({
  onUpdateAvailable: (l: (w: object | null) => void) => {
    state.listener = l
    l(null)
    return () => {}
  },
  applyUpdate: state.apply,
}))

import UpdateBanner from './UpdateBanner.tsx'

describe('UpdateBanner', () => {
  it('compare solo con una nuova versione e il pulsante aggiorna', () => {
    render(<UpdateBanner />)
    expect(screen.queryByText('Nuova versione disponibile.')).toBeNull()
    act(() => state.listener?.({}))
    expect(screen.getByText('Nuova versione disponibile.')).toBeTruthy()
    screen.getByRole('button', { name: 'Aggiorna' }).click()
    expect(state.apply).toHaveBeenCalled()
  })
})
