import { Link } from 'react-router'
import { paths } from '../../paths.ts'
import './settings.css'

// Le sezioni si aggiungono qui man mano che le pagine esistono.
const sections = [
  { to: paths.settingsMacroAreas, title: 'Macro-aree', description: 'Raggruppamenti per la vista di sintesi.' },
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
