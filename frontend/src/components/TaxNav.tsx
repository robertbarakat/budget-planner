import { NavLink } from 'react-router'
import { paths } from '../paths.ts'
import './TaxNav.css'

const tabs = [
  { to: paths.tax, label: 'Riepilogo', end: true },
  { to: paths.taxF24, label: 'Calendario F24', end: false },
  { to: paths.taxInstallments, label: 'Rateizzazioni', end: false },
] as const

/** Schede delle tre viste fiscali: sempre visibili, la scheda attiva è evidenziata. */
export default function TaxNav() {
  return (
    <nav className="tax-nav" aria-label="Sezioni di tasse e contributi">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className="tax-nav__tab">
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
