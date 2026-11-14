import './MonthStatusBadge.css'

/** Stato del mese: il testo ("Chiuso" con ✓ / "Aperto" senza simbolo) accompagna sempre il colore. */
export default function MonthStatusBadge({ closed }: { closed: boolean }) {
  return (
    <span className={closed ? 'month-badge month-badge--closed' : 'month-badge'}>
      {closed && <span aria-hidden="true">✓ </span>}
      {closed ? 'Chiuso' : 'Aperto'}
    </span>
  )
}
