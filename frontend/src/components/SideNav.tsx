import { Link, NavLink } from 'react-router'
import { paths } from '../paths.ts'
import SignOutButton from './SignOutButton.tsx'
import { navItems } from './nav-items.ts'
import './SideNav.css'

// Barra laterale: visibile solo da desktop in su (la barra inferiore sta sotto).
export default function SideNav() {
  return (
    <aside className="side-nav">
      <div className="side-nav__brand">
        <span className="side-nav__logo" aria-hidden="true" />
        <span className="side-nav__title">Budget e cassa</span>
      </div>
      <nav aria-label="Navigazione principale">
        <ul className="side-nav__list">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} className="side-nav__item">
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Link to={paths.newTransaction} className="side-nav__new">
        Nuovo movimento
      </Link>
      <SignOutButton className="side-nav__sign-out" />
    </aside>
  )
}
