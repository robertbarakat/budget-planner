import { useOnline } from '../lib/use-online.ts'
import Banner from './Banner.tsx'

// Avviso di assenza di rete: i salvataggi sono bloccati finché non torna.
export default function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <Banner tone="warning">
      <span aria-hidden="true">!</span> Sei offline: puoi consultare i dati, ma non salvare.
    </Banner>
  )
}
