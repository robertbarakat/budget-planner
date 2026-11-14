import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// jsdom non implementa i pointer capture, che Radix usa (toast, menu, select).
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => undefined
Element.prototype.releasePointerCapture ??= () => undefined
Element.prototype.scrollIntoView ??= () => undefined

// Stesso motivo: Radix (radio, select) osserva le dimensioni degli elementi.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Nessuna chiamata di rete verso l'esterno nei test: ciò che serve si simula.
const realFetch = globalThis.fetch?.bind(globalThis)
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, 'http://localhost')
  if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    return Promise.reject(new TypeError(`Rete bloccata nei test: ${url.hostname}`))
  }
  return realFetch(input, init)
}) as typeof fetch
