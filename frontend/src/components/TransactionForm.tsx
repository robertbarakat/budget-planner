import { useRef, useState, type FormEvent } from 'react'
import {
  validateTransactionForm,
  type CategorizedValues,
  type TransactionFormErrors,
  type TransactionFormState,
  type TransactionFormType,
  type TransferValues,
} from '../lib/transaction-form.ts'
import { todayIso } from '../lib/dates.ts'
import Button from './Button.tsx'
import ChoiceChips from './ChoiceChips.tsx'
import ActionBar from './ActionBar.tsx'
import CategoryPicker from './CategoryPicker.tsx'
import Field from './Field.tsx'
import './TransactionForm.css'

export interface AccountOption {
  id: number
  name: string
}

/** Categorie di una voce di budget; `kind` dice se la voce è di entrata o di spesa. */
export interface CategoryGroup {
  budgetItemId: number
  budgetItemName: string
  macroAreaName: string
  kind: 'expense' | 'income'
  categories: { id: number; name: string }[]
}

/** Spesa o entrata: con la voce di budget della categoria scelta. */
export interface CategorizedSubmit extends CategorizedValues {
  budgetItemId: number
}

export type TransactionFormSubmit = CategorizedSubmit | TransferValues

export interface TransactionFormProps {
  accounts: AccountOption[]
  categoryGroups: CategoryGroup[]
  /** Valori di partenza (modifica di un movimento); senza, oggi e spesa. */
  initial?: Partial<TransactionFormState>
  /** Testo del pulsante di salvataggio; senza, dipende dal tipo ("Salva spesa"...). */
  submitLabel?: string
  /** Operazione in corso: il pulsante non risponde (niente doppio invio). */
  busy?: boolean
  onSubmit: (values: TransactionFormSubmit) => void | Promise<void>
}

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Spesa' },
  { value: 'income', label: 'Entrata' },
  { value: 'transfer', label: 'Trasferimento' },
]
const SUBMIT_LABEL: Record<TransactionFormType, string> = {
  expense: 'Salva spesa',
  income: 'Salva entrata',
  transfer: 'Salva trasferimento',
}

/** Form "Nuovo movimento" per spesa ed entrata. La voce di budget si ricava dalla categoria scelta. */
export default function TransactionForm({ accounts, categoryGroups, initial, submitLabel, busy = false, onSubmit }: TransactionFormProps) {
  const [state, setState] = useState<TransactionFormState>(() => ({
    type: 'expense',
    amountText: '',
    accountId: '',
    destinationAccountId: '',
    categoryId: '',
    date: todayIso(),
    comment: '',
    tag: '',
    ...initial,
  }))
  const [errors, setErrors] = useState<TransactionFormErrors>({})
  // Blocca il secondo invio anche nello stesso istante del primo, prima che `busy` si aggiorni.
  const submitting = useRef(false)

  const isTransfer = state.type === 'transfer'
  const groups = categoryGroups.filter((group) => group.kind === state.type)
  const accountOptions = accounts.map((account) => ({ value: String(account.id), label: account.name }))
  const selectedGroup = groups.find((group) => group.categories.some((c) => String(c.id) === state.categoryId))

  function update<K extends keyof TransactionFormState>(key: K, value: TransactionFormState[K]) {
    setState((current) => ({ ...current, [key]: value }))
    const errorKey = ERROR_KEY[key]
    if (errorKey) setErrors((current) => ({ ...current, [errorKey]: undefined }))
  }

  function changeType(type: TransactionFormType) {
    setState((current) => {
      if (type === 'transfer') return { ...current, type, categoryId: '' }
      // Una categoria di spesa non vale per un'entrata (e viceversa): si riparte dalla scelta.
      const stillValid = categoryGroups.some(
        (group) => group.kind === type && group.categories.some((c) => String(c.id) === current.categoryId),
      )
      return { ...current, type, categoryId: stillValid ? current.categoryId : '' }
    })
    setErrors((current) => ({ ...current, category: undefined, destination: undefined }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || submitting.current) return
    const result = validateTransactionForm(state)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    let payload: TransactionFormSubmit
    if (result.values.type === 'transfer') {
      payload = result.values
    } else {
      const categoryId = result.values.categoryId
      const group = groups.find((g) => g.categories.some((c) => c.id === categoryId))
      if (!group) {
        setErrors({ category: 'Scegli la categoria.' })
        return
      }
      payload = { ...result.values, budgetItemId: group.budgetItemId }
    }
    submitting.current = true
    try {
      await onSubmit(payload)
    } finally {
      submitting.current = false
    }
  }

  return (
    <form className="transaction-form" onSubmit={submit} noValidate>
      <ChoiceChips
        label="Tipo di movimento"
        segmented
        options={TYPE_OPTIONS}
        value={state.type}
        onChange={(value) => changeType(value as TransactionFormType)}
      />

      <div className="transaction-form__amount">
        <Field label="Importo (€)" required error={errors.amount}>
          {(p) => (
            <input
              {...p}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={state.amountText}
              onChange={(e) => update('amountText', e.target.value)}
            />
          )}
        </Field>
      </div>

      <ChoiceChips
        label={isTransfer ? 'Conto di origine' : 'Conto'}
        required
        error={errors.account}
        options={accountOptions}
        value={state.accountId}
        onChange={(value) => update('accountId', value)}
      />
      {accounts.length === 0 && <p className="transaction-form__hint">Nessun conto: aggiungine uno nelle Impostazioni.</p>}

      {isTransfer && (
        <ChoiceChips
          label="Conto di destinazione"
          required
          error={errors.destination}
          options={accountOptions}
          value={state.destinationAccountId}
          onChange={(value) => update('destinationAccountId', value)}
        />
      )}

      {!isTransfer && (
        <>
      <Field label="Categoria" required error={errors.category}>
        {(p) => (
          <CategoryPicker
            id={p.id}
            groups={groups}
            value={state.categoryId}
            onChange={(value) => update('categoryId', value)}
            invalid={!!errors.category}
            describedBy={p['aria-describedby']}
          />
        )}
      </Field>

      <p className="transaction-form__budget-item" aria-live="polite">
        <span className="transaction-form__budget-item-label">Voce di budget</span>
        <span className="transaction-form__budget-item-value">
          {selectedGroup ? `${selectedGroup.budgetItemName} · ${selectedGroup.macroAreaName}` : 'Si sceglie con la categoria'}
        </span>
      </p>
        </>
      )}

      <Field label="Data" required error={errors.date}>
        {(p) => <input {...p} type="date" value={state.date} onChange={(e) => update('date', e.target.value)} />}
      </Field>

      <Field label="Commento">
        {(p) => (
          <input {...p} type="text" autoComplete="off" value={state.comment} onChange={(e) => update('comment', e.target.value)} />
        )}
      </Field>

      <Field label="Tag (facoltativo)">
        {(p) => <input {...p} type="text" autoComplete="off" value={state.tag} onChange={(e) => update('tag', e.target.value)} />}
      </Field>

      <ActionBar sticky>
        <Button type="submit" loading={busy}>
          {submitLabel ?? SUBMIT_LABEL[state.type]}
        </Button>
      </ActionBar>
    </form>
  )
}

const ERROR_KEY: Partial<Record<keyof TransactionFormState, keyof TransactionFormErrors>> = {
  amountText: 'amount',
  accountId: 'account',
  destinationAccountId: 'destination',
  categoryId: 'category',
  date: 'date',
}
