import { paths } from '../paths.ts'

// Voci di navigazione condivise da barra inferiore (mobile) e barra laterale (web).
// `desktopOnly`: la voce sta solo nella barra laterale (la matrice è una vista web).
export const navItems: readonly { to: string; label: string; end: boolean; desktopOnly?: boolean }[] = [
  { to: paths.home, label: 'Home', end: true },
  { to: paths.transactions, label: 'Movimenti', end: false },
  { to: paths.cashFlow, label: 'Flusso di cassa', end: false },
  { to: paths.budget, label: 'Budget', end: false },
  { to: paths.macroAreas, label: 'Previsto/Reale', end: false },
  { to: paths.matrix, label: 'Matrice', end: false, desktopOnly: true },
  { to: paths.tax, label: 'Fiscale', end: false, desktopOnly: true },
  { to: paths.settings, label: 'Impostazioni', end: false },
]
