import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <main>
      <h1>Pagina non trovata</h1>
      <p>L'indirizzo richiesto non esiste.</p>
      <Link to="/">Torna alla Home</Link>
    </main>
  )
}
