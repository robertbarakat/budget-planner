import type { ReactNode } from 'react'
import { paths } from '../paths.ts'
import { BudgetIcon, CashFlowIcon, HomeIcon, SettingsIcon, TaxIcon, TransactionsIcon } from './icons.tsx'

/** Icona di ogni voce di navigazione, condivisa da barra inferiore e barra laterale. */
export const navIcons: Record<string, ReactNode> = {
  [paths.home]: <HomeIcon />,
  [paths.transactions]: <TransactionsIcon />,
  [paths.cashFlow]: <CashFlowIcon />,
  [paths.budget]: <BudgetIcon />,
  [paths.tax]: <TaxIcon />,
  [paths.settings]: <SettingsIcon />,
}
