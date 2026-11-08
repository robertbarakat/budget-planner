import { Link } from 'react-router'
import { paths } from '../../paths.ts'
import './settings.css'

// Le sezioni si aggiungono qui man mano che le pagine esistono.
const sections = [
  { to: paths.settingsMacroAreas, title: 'Macro-aree', description: 'Raggruppamenti per la vista di sintesi.' },
  { to: paths.settingsBudgetItems, title: 'Voci di budget', description: 'Il livello della previsione, raggruppato per macro-area.' },
  { to: paths.settingsCategories, title: 'Categorie', description: 'Il livello dell\'inserimento, raggruppato per voce di budget.' },
  { to: paths.settingsAccounts, title: 'Conti', description: 'Dove stanno i soldi: aggiungi, riordina, archivia.' },
  { to: paths.settingsClients, title: 'Clienti', description: 'Chi ti paga: ogni cliente alimenta una voce di entrata.' },
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
