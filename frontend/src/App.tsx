import { Outlet } from 'react-router'
import SideNav from './components/SideNav.tsx'
import MobileNav from './components/MobileNav.tsx'
import './App.css'

// Layout radice: contenuto + navigazione.
export default function App() {
  return (
    <div className="app-shell">
      <SideNav />
      <div className="app-content">
        <Outlet />
      </div>
      <MobileNav />
    </div>
  )
}
