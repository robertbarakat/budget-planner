import { Outlet } from 'react-router'
import SideNav from './components/SideNav.tsx'
import SignOutButton from './components/SignOutButton.tsx'
import MobileNav from './components/MobileNav.tsx'
import OfflineBanner from './components/OfflineBanner.tsx'
import UpdateBanner from './components/UpdateBanner.tsx'
import './App.css'

// Layout radice: contenuto + navigazione.
export default function App() {
  return (
    <div className="app-shell">
      <SideNav />
      <div className="app-content">
        <OfflineBanner />
        <UpdateBanner />
        <div className="app-topbar">
          <SignOutButton />
        </div>
        <Outlet />
      </div>
      <MobileNav />
    </div>
  )
}
