import { useRef } from 'react'
import { Outlet } from 'react-router'
import { queryClient } from './api/query-client.ts'
import { usePullToRefresh } from './lib/use-pull-to-refresh.ts'
import SideNav from './components/SideNav.tsx'
import SignOutButton from './components/SignOutButton.tsx'
import MobileNav from './components/MobileNav.tsx'
import OfflineBanner from './components/OfflineBanner.tsx'
import UpdateBanner from './components/UpdateBanner.tsx'
import './App.css'

// Layout radice: contenuto + navigazione.
export default function App() {
  const contentRef = useRef<HTMLDivElement>(null)
  // Tirando giù dall'inizio della pagina si rileggono tutti i dati.
  const { pull, refreshing, threshold } = usePullToRefresh(contentRef, () => queryClient.invalidateQueries())
  return (
    <div className="app-shell">
      <div className="app-notices">
        <OfflineBanner />
        <UpdateBanner />
      </div>
      <SideNav />
      <div className="app-content" ref={contentRef}>
        {(pull > 0 || refreshing) && (
          <div className="app-pull" role="status" style={{ height: refreshing ? threshold / 2 : pull / 2 }}>
            {refreshing ? 'Aggiorno…' : pull >= threshold ? 'Rilascia per aggiornare' : 'Tira per aggiornare'}
          </div>
        )}
        <div className="app-topbar">
          <SignOutButton />
        </div>
        <Outlet />
      </div>
      <MobileNav />
    </div>
  )
}
