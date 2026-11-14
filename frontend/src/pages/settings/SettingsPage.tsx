import { Link } from 'react-router'
import { paths } from '../../paths.ts'
import './settings.css'

// Le sezioni si aggiungono qui man mano che le pagine esistono.
const sections = [
  { to: paths.settingsStructure, title: 'Voci e categorie', description: 'Le tue uscite e le tue entrate, divise per gruppo.' },
  { to: paths.settingsAccounts, title: 'Conti', description: 'Dove stanno i soldi: aggiungi, riordina, archivia.' },
  { to: paths.settingsRecurrences, title: 'Ricorrenze', description: 'Pagamenti periodici (mutuo, abbonamenti): generano le righe di budget.' },
  { to: paths.settingsClients, title: 'Clienti', description: 'Previsioni dei ricavi: giorni, tariffa, mese di competenza e di incasso.' },
  { to: paths.tax, title: 'Tasse e contributi', description: 'Riepilogo, calendario F24, rateizzazioni e parametri fiscali, tutto in un posto.', mobileOnly: true },
] as { to: string; title: string; description: string; mobileOnly?: boolean }[]

export default function SettingsPage() {
  return (
    <main className="settings">
      <h1>Impostazioni</h1>
      <ul className="settings__links">
        {sections.map((section) => (
          <li key={section.to} className={section.mobileOnly ? 'settings__mobile-only' : undefined}>
            <Link to={section.to} className="settings__link">
              <span className="settings__link-title">{section.title}</span>
              <span className="settings__link-text">{section.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
