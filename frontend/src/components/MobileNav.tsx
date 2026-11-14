import ActionBar from './ActionBar.tsx'
import { Link, NavLink, useLocation } from 'react-router'
import { paths } from '../paths.ts'
import { navIcons } from './nav-icons.tsx'
import { navItems } from './nav-items.ts'
import './MobileNav.css'

// Barra inferiore: pollice destro sul pulsante "nuovo movimento", sempre raggiungibile.
export default function MobileNav() {
  // Nella schermata del movimento il pulsante "nuovo" non serve e coprirebbe il pulsante di salvataggio.
  // Solo nelle viste dove si registra: non copre impostazioni, tasse e la schermata del movimento stesso.
  const { pathname } = useLocation()
  const fabPaths: readonly string[] = [paths.home, paths.transactions, paths.cashFlow, paths.budget]
  const showFab = fabPaths.includes(pathname)
  return (
    <div className="mobile-nav">
      {showFab && (
        <ActionBar inline>
          <Link to={paths.newTransaction} className="button button--primary">
            Nuovo movimento
          </Link>
        </ActionBar>
      )}
      <div id="action-bar-slot" />
      <nav aria-label="Navigazione principale" className="mobile-nav__bar">
        <ul className="mobile-nav__list">
          {navItems
            .filter((item) => !item.desktopOnly)
            .map((item) => (
            <li key={item.to} className="mobile-nav__cell">
              <NavLink to={item.to} end={item.end} className="mobile-nav__item">
                {navIcons[item.to]}
                <span className="mobile-nav__label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
