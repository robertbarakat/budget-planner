import type { RouteObject } from 'react-router'
import App from './App.tsx'
import CashFlowPage from './pages/CashFlowPage.tsx'
import HomePage from './pages/HomePage.tsx'
import MacroAreasPage from './pages/MacroAreasPage.tsx'
import NewTransactionPage from './pages/NewTransactionPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'

// Unico file delle rotte (gli indirizzi stanno in paths.ts).
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
