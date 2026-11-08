import './MonthStatusBadge.css'

/** Stato del mese: il testo ("Chiuso" con ✓ / "Aperto") accompagna sempre il colore. */
export default function MonthStatusBadge({ closed }: { closed: boolean }) {
  return (
    <span className={closed ? 'month-badge month-badge--closed' : 'month-badge'}>
      <span aria-hidden="true">{closed ? '✓' : '○'}</span> {closed ? 'Chiuso' : 'Aperto'}
    </span>
  )
}
