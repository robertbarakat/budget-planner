import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { paths } from '../paths.ts'
import { ChevronIcon } from './icons.tsx'
import { navIcons } from './nav-icons.tsx'
import SignOutButton from './SignOutButton.tsx'
import { navItems } from './nav-items.ts'
import './SideNav.css'

const STORAGE_KEY = 'side-nav-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

// Barra laterale: visibile solo da desktop in su (la barra inferiore sta sotto).
// Chiusa mostra solo le icone; il testo resta nel title (tooltip) e nel nome accessibile.
export default function SideNav() {
  const [collapsed, setCollapsed] = useState(readCollapsed)

  function toggle() {
    setCollapsed((current) => {
      try {
        localStorage.setItem(STORAGE_KEY, current ? '0' : '1')
      } catch {
        // Preferenza solo comoda: se non si salva, vale per questa visita.
      }
      return !current
    })
  }

  return (
    <aside className={collapsed ? 'side-nav side-nav--collapsed' : 'side-nav'}>
      <div className="side-nav__brand">
        <span className="side-nav__logo" aria-hidden="true" />
        <span className="side-nav__title">Budget e cassa</span>
      </div>
      <nav aria-label="Navigazione principale">
        <ul className="side-nav__list">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} className="side-nav__item" title={item.label}>
                {navIcons[item.to]}
                <span className="side-nav__label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Link to={paths.newTransaction} className="button button--primary side-nav__new" title="Nuovo movimento">
        {collapsed ? '+' : 'Nuovo movimento'}
      </Link>
      <SignOutButton className="side-nav__sign-out" iconOnly={collapsed} />
      <button
        type="button"
        className="side-nav__toggle"
        onClick={toggle}
        aria-expanded={!collapsed}
        title={collapsed ? 'Espandi la barra laterale' : 'Comprimi la barra laterale'}
        aria-label={collapsed ? 'Espandi la barra laterale' : 'Comprimi la barra laterale'}
      >
        <ChevronIcon direction={collapsed ? 'right' : 'left'} />
        {!collapsed && <span>Comprimi</span>}
      </button>
    </aside>
  )
}
