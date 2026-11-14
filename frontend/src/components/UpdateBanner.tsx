import { useEffect, useState } from 'react'
import { applyUpdate, onUpdateAvailable } from '../lib/register-sw.ts'
import Button from './Button.tsx'
import Banner from './Banner.tsx'

// Avviso "nuova versione disponibile": l'utente decide quando aggiornare.
export default function UpdateBanner() {
  const [available, setAvailable] = useState(false)
  useEffect(() => onUpdateAvailable((worker) => setAvailable(worker !== null)), [])
  if (!available) return null
  return (
    <Banner>
      <span>Nuova versione disponibile.</span>
      <Button variant="secondary" onClick={applyUpdate}>
        Aggiorna
      </Button>
    </Banner>
  )
}
