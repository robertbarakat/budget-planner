import type { RouteObject } from 'react-router'
import App from './App.tsx'
import RequireAuth from './components/RequireAuth.tsx'
import BudgetPage from './pages/BudgetPage.tsx'
import CashFlowPage from './pages/CashFlowPage.tsx'
import HomePage from './pages/HomePage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import MacroAreasPage from './pages/MacroAreasPage.tsx'
import NewTransactionPage from './pages/NewTransactionPage.tsx'
import EditTransactionPage from './pages/EditTransactionPage.tsx'
import TransactionsPage from './pages/TransactionsPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import SettingsPage from './pages/settings/SettingsPage.tsx'
import BudgetItemsSettingsPage from './pages/settings/BudgetItemsSettingsPage.tsx'
import AccountsSettingsPage from './pages/settings/AccountsSettingsPage.tsx'
import CategoriesSettingsPage from './pages/settings/CategoriesSettingsPage.tsx'
import RevenueDriverPage from './pages/settings/RevenueDriverPage.tsx'
import WorkedDaysPage from './pages/settings/WorkedDaysPage.tsx'
import ClientDetailPage from './pages/settings/ClientDetailPage.tsx'
import ClientsSettingsPage from './pages/settings/ClientsSettingsPage.tsx'
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
          { path: 'transactions', element: <TransactionsPage /> },
          { path: 'transactions/new', element: <NewTransactionPage /> },
          { path: 'transactions/:id/edit', element: <EditTransactionPage /> },
          { path: 'cash-flow', element: <CashFlowPage /> },
          { path: 'budget', element: <BudgetPage /> },
          { path: 'macro-areas', element: <MacroAreasPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'settings/macro-areas', element: <MacroAreasSettingsPage /> },
          { path: 'settings/budget-items', element: <BudgetItemsSettingsPage /> },
          { path: 'settings/categories', element: <CategoriesSettingsPage /> },
          { path: 'settings/accounts', element: <AccountsSettingsPage /> },
          { path: 'settings/clients', element: <ClientsSettingsPage /> },
          { path: 'settings/clients/:id', element: <ClientDetailPage /> },
          { path: 'settings/worked-days', element: <WorkedDaysPage /> },
          { path: 'settings/revenue-driver', element: <RevenueDriverPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
