import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { paths } from '../paths.ts'
import { CashFlowIcon, HomeIcon, MacroAreasIcon, PlusIcon } from './icons.tsx'
import { navItems } from './nav-items.ts'
import './MobileNav.css'

const icons: Record<string, ReactNode> = {
  [paths.home]: <HomeIcon />,
  [paths.cashFlow]: <CashFlowIcon />,
  [paths.macroAreas]: <MacroAreasIcon />,
}

// Barra inferiore: pollice destro sul pulsante "nuovo movimento", sempre raggiungibile.
export default function MobileNav() {
  return (
    <div className="mobile-nav">
      <Link
        to={paths.newTransaction}
        className="mobile-nav__fab"
        aria-label="Nuovo movimento"
      >
        <PlusIcon />
      </Link>
      <nav aria-label="Navigazione principale" className="mobile-nav__bar">
        <ul className="mobile-nav__list">
          {navItems.map((item) => (
            <li key={item.to} className="mobile-nav__cell">
              <NavLink to={item.to} end={item.end} className="mobile-nav__item">
                {icons[item.to]}
                <span className="mobile-nav__label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
