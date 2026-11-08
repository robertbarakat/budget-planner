import { Outlet } from 'react-router'
import MobileNav from './components/MobileNav.tsx'
import './App.css'

// Layout radice: contenuto + navigazione.
export default function App() {
  return (
    <div className="app-shell">
      <div className="app-content">
        <Outlet />
      </div>
      <MobileNav />
    </div>
  )
}
