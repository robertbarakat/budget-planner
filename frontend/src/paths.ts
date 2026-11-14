// Indirizzi in inglese (come gli identificatori); i testi per l'utente sono in italiano.
export const paths = {
  home: '/',
  login: '/login',
  newTransaction: '/transactions/new',
  transactions: '/transactions',
  editTransaction: (id: number | string) => `/transactions/${id}/edit`,
  cashFlow: '/cash-flow',
  budget: '/budget',
  tax: '/tax',
  taxF24: '/tax/f24',
  taxInstallments: '/tax/installments',
  taxParameters: '/tax/parameters',
  settings: '/settings',
  settingsStructure: '/settings/structure',
  settingsAccounts: '/settings/accounts',
  settingsRecurrences: '/settings/recurrences',
  settingsClients: '/settings/clients',
} as const
