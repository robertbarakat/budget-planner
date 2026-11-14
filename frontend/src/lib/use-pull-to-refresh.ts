import { useEffect, useRef, useState, type RefObject } from 'react'

const THRESHOLD = 72

/**
 * «Tira per aggiornare» sul contenitore che scorre (dove il browser non lo fa da solo, come nell'app installata).
 * Si attiva solo dall'inizio della pagina; `onRefresh` torna a fine aggiornamento.
 */
export function usePullToRefresh(ref: RefObject<HTMLElement | null>, onRefresh: () => Promise<unknown>) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const start = useRef<number | null>(null)
  const latest = useRef(onRefresh)
  latest.current = onRefresh

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let distance = 0
    const onStart = (e: TouchEvent) => {
      start.current = el.scrollTop <= 0 ? (e.touches[0]?.clientY ?? null) : null
      distance = 0
    }
    const onMove = (e: TouchEvent) => {
      if (start.current === null) return
      const y = e.touches[0]?.clientY ?? start.current
      distance = Math.max(0, (y - start.current) * 0.5)
      setPull(Math.min(distance, THRESHOLD * 1.5))
    }
    const onEnd = () => {
      const triggered = start.current !== null && distance >= THRESHOLD
      start.current = null
      setPull(0)
      if (!triggered) return
      setRefreshing(true)
      void latest.current().finally(() => setRefreshing(false))
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [ref])

  return { pull, refreshing, threshold: THRESHOLD }
}
