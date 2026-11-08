import { paths } from '../paths.ts'

// Voci di navigazione condivise da barra inferiore (mobile) e barra laterale (web).
export const navItems = [
  { to: paths.home, label: 'Home', end: true },
  { to: paths.transactions, label: 'Movimenti', end: false },
  { to: paths.cashFlow, label: 'Flusso di cassa', end: false },
  { to: paths.budget, label: 'Budget', end: false },
  { to: paths.macroAreas, label: 'Macro-aree', end: false },
  { to: paths.settings, label: 'Impostazioni', end: false },
] as const
