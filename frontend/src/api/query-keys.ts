/**
 * Chiavi di cache React Query, una radice per area. Una mutazione invalida la radice delle aree
 * che toccano gli stessi dati (es. i movimenti invalidano anche i saldi).
 */
export const queryKeys = {
  classification: {
    all: ['classification'] as const,
    macroAreas: ['classification', 'macro_areas'] as const,
    budgetItems: ['classification', 'budget_items'] as const,
    categories: ['classification', 'categories'] as const,
  },
  accounts: {
    all: ['accounts'] as const,
    accounts: ['accounts', 'accounts'] as const,
    openingBalances: ['accounts', 'opening_balances'] as const,
  },
  transactions: { all: ['transactions'] as const },
  budget: {
    all: ['budget'] as const,
    entries: ['budget', 'entries'] as const,
    closedMonths: ['budget', 'closed_months'] as const,
  },
  recurrences: {
    all: ['recurrences'] as const,
    recurrences: ['recurrences', 'recurrences'] as const,
    occurrences: ['recurrences', 'occurrences'] as const,
  },
  revenue: {
    all: ['revenue'] as const,
    clients: ['revenue', 'clients'] as const,
    rates: ['revenue', 'client_rates'] as const,
    workedDays: ['revenue', 'worked_days'] as const,
  },
  tax: {
    all: ['tax'] as const,
    parameters: ['tax', 'parameters'] as const,
    installmentPlans: ['tax', 'installment_plans'] as const,
    installments: ['tax', 'installments'] as const,
    f24Deadlines: ['tax', 'f24_deadlines'] as const,
  },
} as const
