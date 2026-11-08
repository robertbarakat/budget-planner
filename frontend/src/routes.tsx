import type { RouteObject } from 'react-router'
import App from './App.tsx'
import CashFlowPage from './pages/CashFlowPage.tsx'
import HomePage from './pages/HomePage.tsx'
import MacroAreasPage from './pages/MacroAreasPage.tsx'
import NewTransactionPage from './pages/NewTransactionPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'

// Unico file delle rotte. Gli indirizzi sono in inglese (come gli identificatori);
// i testi mostrati all'utente sono in italiano.
export const paths = {
  home: '/',
  newTransaction: '/transactions/new',
  cashFlow: '/cash-flow',
  macroAreas: '/macro-areas',
} as const

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'transactions/new', element: <NewTransactionPage /> },
      { path: 'cash-flow', element: <CashFlowPage /> },
      { path: 'macro-areas', element: <MacroAreasPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
