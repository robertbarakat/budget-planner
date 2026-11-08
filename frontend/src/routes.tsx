import type { RouteObject } from 'react-router'
import App from './App.tsx'
import RequireAuth from './components/RequireAuth.tsx'
import CashFlowPage from './pages/CashFlowPage.tsx'
import HomePage from './pages/HomePage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import MacroAreasPage from './pages/MacroAreasPage.tsx'
import NewTransactionPage from './pages/NewTransactionPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import SettingsPage from './pages/settings/SettingsPage.tsx'
import BudgetItemsSettingsPage from './pages/settings/BudgetItemsSettingsPage.tsx'
import CategoriesSettingsPage from './pages/settings/CategoriesSettingsPage.tsx'
import MacroAreasSettingsPage from './pages/settings/MacroAreasSettingsPage.tsx'

// Unico file delle rotte (gli indirizzi stanno in paths.ts).
export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <App />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'transactions/new', element: <NewTransactionPage /> },
          { path: 'cash-flow', element: <CashFlowPage /> },
          { path: 'macro-areas', element: <MacroAreasPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'settings/macro-areas', element: <MacroAreasSettingsPage /> },
          { path: 'settings/budget-items', element: <BudgetItemsSettingsPage /> },
          { path: 'settings/categories', element: <CategoriesSettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
