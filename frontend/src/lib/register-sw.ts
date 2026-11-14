// Registra il service worker (solo in produzione) e segnala quando c'è una nuova versione.
type Listener = (waiting: ServiceWorker | null) => void

let waitingWorker: ServiceWorker | null = null
const listeners = new Set<Listener>()

function setWaiting(worker: ServiceWorker | null): void {
  waitingWorker = worker
  listeners.forEach((l) => l(worker))
}

/** Si iscrive agli aggiornamenti; restituisce la funzione per annullare. */
export function onUpdateAvailable(listener: Listener): () => void {
  listeners.add(listener)
  listener(waitingWorker)
  return () => {
    listeners.delete(listener)
  }
}

/** Attiva la nuova versione: il worker in attesa prende il controllo e la pagina si ricarica. */
export function applyUpdate(): void {
  waitingWorker?.postMessage({ type: 'SKIP_WAITING' })
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const container = navigator.serviceWorker
  let reloading = false
  container.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  })
  window.addEventListener('load', () => {
    container
      .register('/sw.js')
      .then((reg) => {
        const watch = (worker: ServiceWorker | null) => {
          // Un worker in attesa con un controller attivo = aggiornamento (non prima installazione).
          if (worker && container.controller) setWaiting(worker)
        }
        watch(reg.waiting)
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed') watch(installing)
          })
        })
        // Controllo periodico per app lasciate aperte a lungo.
        setInterval(() => void reg.update().catch(() => {}), 60 * 60 * 1000)
      })
      .catch(() => {})
  })
}
