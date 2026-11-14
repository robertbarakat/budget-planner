import { Link } from 'react-router'
import { paths } from '../../paths.ts'
import './settings.css'

// Le sezioni si aggiungono qui man mano che le pagine esistono.
const sections = [
  { to: paths.settingsStructure, title: 'Voci e categorie', description: 'Come sono organizzati i tuoi soldi: gruppi, voci di budget e categorie dei movimenti.' },
  { to: paths.settingsAccounts, title: 'Conti', description: 'Dove stanno i soldi: aggiungi, riordina, archivia.' },
  { to: paths.settingsWorkedDays, title: 'Giorni lavorati', description: 'Giorni previsti per cliente e mese: l\'input della previsione dei ricavi.' },
  { to: paths.settingsRevenueDriver, title: 'Previsione ricavi', description: 'Incassi previsti per cliente e mese, con ritardo d\'incasso e riporto sull\'anno dopo.' },
  { to: paths.settingsRecurrences, title: 'Ricorrenze', description: 'Pagamenti periodici (mutuo, abbonamenti): generano le righe di budget.' },
  { to: paths.tax, title: 'Tasse e contributi', description: 'Riepilogo, calendario F24, rateizzazioni e parametri fiscali, tutto in un posto.' },
] as const

export default function SettingsPage() {
  return (
    <main className="settings">
      <h1>Impostazioni</h1>
      <ul className="settings__links">
        {sections.map((section) => (
          <li key={section.to}>
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
