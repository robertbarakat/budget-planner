import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import OfflineBanner from './OfflineBanner.tsx'

describe('OfflineBanner', () => {
  it('compare quando la rete cade e sparisce al ritorno', () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    render(<OfflineBanner />)
    expect(screen.queryByRole('status')).toBeNull()
    online.mockReturnValue(false)
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByRole('status').textContent).toContain('offline')
    online.mockReturnValue(true)
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.queryByRole('status')).toBeNull()
    online.mockRestore()
  })
})
