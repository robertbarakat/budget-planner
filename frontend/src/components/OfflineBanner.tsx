import { useOnline } from '../lib/use-online.ts'
import './OfflineBanner.css'

// Avviso di assenza di rete: i salvataggi sono bloccati finché non torna.
export default function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div className="offline-banner" role="status">
      <span aria-hidden="true">!</span> Sei offline: puoi consultare i dati, ma non salvare.
    </div>
  )
}
