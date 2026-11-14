import { useMemo, useState } from 'react'
import { Dialog } from 'radix-ui'
import { useCreateInstallmentPlanFromSchedule, useRebuildInstallmentPlan } from '../api/tax.queries.ts'
import { formatDate } from '../lib/dates.ts'
import { formatAbsoluteAmount } from '../lib/format-amount.ts'
import { taxTypeLabels } from '../lib/f24-plan.ts'
import {
  emptyInstallmentPlanDraft,
  emptyLineDraft,
  validateInstallmentPlan,
  type InstallmentLineDraft,
  type InstallmentPlanDraft,
} from '../lib/installments.ts'
import Button from './Button.tsx'
import Field from './Field.tsx'
import { useSnackbar } from './Snackbar.tsx'
import './InstallmentPlanFormDialog.css'
import './MoveDialog.css'

const TAX_TYPES = Object.keys(taxTypeLabels) as (keyof typeof taxTypeLabels)[]
const euro = (n: number) => n.toFixed(2).replace('.', ',')

/** Dati di un piano esistente, per modificarlo. `frozenIds` = righe delle rate già versate (non si toccano). */
export interface EditablePlan {
  planId: number
  description: string
  lines: { tax_type: InstallmentLineDraft['taxType']; reference_year: number; quota: number; last_number: number | null }[]
  installments: { id: number; number: number; due_date: string }[]
  frozenIds: ReadonlySet<number>
}

function draftFromPlan(plan: EditablePlan): InstallmentPlanDraft {
  const count = plan.installments.reduce((m, i) => Math.max(m, i.number), 0)
  return {
    description: plan.description,
    lines: plan.lines.map((l) => ({
      taxType: l.tax_type,
      referenceYearText: String(l.reference_year),
      quotaText: euro(Number(l.quota)),
      lastNumberText: l.last_number === null ? '' : String(l.last_number),
    })),
    countText: String(count),
    firstDueDate: plan.installments.find((i) => i.number === 1)?.due_date ?? '',
  }
}

/** Nuova rateizzazione o modifica: si indicano le righe da rateizzare, il numero di rate e la prima scadenza; rate e interessi li calcola l'app. */
export default function InstallmentPlanFormDialog({ edit }: { edit?: EditablePlan }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<InstallmentPlanDraft>(emptyInstallmentPlanDraft)
  const create = useCreateInstallmentPlanFromSchedule()
  const rebuild = useRebuildInstallmentPlan()
  const { showSuccess } = useSnackbar()

  const result = useMemo(() => validateInstallmentPlan(draft), [draft])
  const frozenNumbers = useMemo(() => {
    const byNumber = new Map<number, { all: boolean }>()
    for (const i of edit?.installments ?? []) byNumber.set(i.number, { all: (byNumber.get(i.number)?.all ?? true) && edit!.frozenIds.has(i.id) })
    return new Set([...byNumber].filter(([, v]) => v.all).map(([n]) => n))
  }, [edit])

  const setLine = (index: number, patch: Partial<InstallmentLineDraft>) =>
    setDraft((d) => ({ ...d, lines: d.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)) }))

  const preview = useMemo(() => {
    if (!('values' in result)) return []
    const byNumber = new Map<number, { date: string; principal: number; interest: number }>()
    for (const r of result.values.rows) {
      const cur = byNumber.get(r.number) ?? { date: r.dueDate, principal: 0, interest: 0 }
      cur.principal += r.principal
      cur.interest += r.interest
      byNumber.set(r.number, cur)
    }
    return [...byNumber.entries()].map(([number, v]) => ({ number, ...v }))
  }, [result])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!('values' in result)) return
    const v = result.values
    const lines = v.lines.map((l) => ({ taxType: l.taxType, referenceYear: l.referenceYear, quota: l.quota, lastNumber: l.lastNumber }))
    const done = (message: string) => ({
      onSuccess: () => {
        setOpen(false)
        showSuccess(message)
      },
    })
    if (edit) rebuild.mutate([edit.planId, lines, v.rows, edit.frozenIds], done('Rateizzazione aggiornata.'))
    else create.mutate([v.description, lines, v.rows], done('Rateizzazione creata.'))
  }

  const errors = 'errors' in result ? result.errors : {}
  const [touched, setTouched] = useState(false)
  const showError = (key: keyof typeof errors) => (touched ? errors[key] : undefined)

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setDraft(edit ? draftFromPlan(edit) : { ...emptyInstallmentPlanDraft, lines: [{ ...emptyLineDraft, referenceYearText: String(new Date().getFullYear() - 1) }] })
          setTouched(false)
        }
      }}
    >
      <Dialog.Trigger asChild>
        {edit ? (
          <button type="button" className="installment-form__link" aria-label={`Modifica ${edit.description}`}>
            Modifica
          </button>
        ) : (
          <Button>Nuova rateizzazione</Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="move-dialog__overlay" />
        <Dialog.Content className="move-dialog installment-form">
          <Dialog.Title className="move-dialog__title">{edit ? 'Modifica rateizzazione' : 'Nuova rateizzazione'}</Dialog.Title>
          <Dialog.Description className="move-dialog__text">
            {edit
              ? 'Le rate già versate non cambiano. Per togliere una riga dalle rate che restano, indica la sua ultima rata.'
              : 'Indica cosa rateizzi e quante rate: capitale e interessi di ogni rata li calcolo io.'}
          </Dialog.Description>
          <form className="installment-form__fields" onSubmit={(e) => { setTouched(true); submit(e) }} noValidate>
            {!edit && (
              <Field label="Descrizione" error={showError('description')} required>
                {(p) => <input {...p} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />}
              </Field>
            )}
            <fieldset className="installment-form__rows">
              <legend>Cosa rateizzo</legend>
              {draft.lines.map((line, index) => (
                <div key={index} className="installment-form__line">
                  <Field label="Tributo">
                    {(p) => (
                      <select {...p} value={line.taxType} onChange={(e) => setLine(index, { taxType: e.target.value as InstallmentLineDraft['taxType'] })}>
                        {TAX_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {taxTypeLabels[type]}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Field label="Anno">
                    {(p) => <input {...p} inputMode="numeric" value={line.referenceYearText} onChange={(e) => setLine(index, { referenceYearText: e.target.value })} />}
                  </Field>
                  <Field label="Quota per rata (€)" help="Importo dovuto diviso il numero di rate.">
                    {(p) => <input {...p} inputMode="decimal" value={line.quotaText} onChange={(e) => setLine(index, { quotaText: e.target.value })} />}
                  </Field>
                  <Field label="Ultima rata" help="Vuoto = fino alla fine.">
                    {(p) => <input {...p} inputMode="numeric" value={line.lastNumberText} onChange={(e) => setLine(index, { lastNumberText: e.target.value })} />}
                  </Field>
                  {draft.lines.length > 1 && (
                    <button type="button" className="installment-form__link installment-form__link--quiet" onClick={() => setDraft((d) => ({ ...d, lines: d.lines.filter((_, i) => i !== index) }))}>
                      Togli riga {index + 1}
                    </button>
                  )}
                </div>
              ))}
              {showError('lines') && <p role="alert" className="installment-form__error">{showError('lines')}</p>}
              <button type="button" className="installment-form__link" onClick={() => setDraft((d) => ({ ...d, lines: [...d.lines, { ...emptyLineDraft, referenceYearText: d.lines.at(-1)?.referenceYearText ?? '' }] }))}>
                + Aggiungi riga
              </button>
            </fieldset>
            <div className="installment-form__pair">
              <Field label="Numero di rate" error={showError('count')} required>
                {(p) => <input {...p} inputMode="numeric" value={draft.countText} onChange={(e) => setDraft({ ...draft, countText: e.target.value })} />}
              </Field>
              <Field label="Prima rata" error={showError('firstDueDate')} required>
                {(p) => <input {...p} type="date" value={draft.firstDueDate} onChange={(e) => setDraft({ ...draft, firstDueDate: e.target.value })} />}
              </Field>
            </div>
            {preview.length > 0 && (
              <table className="installment-form__preview">
                <caption>Rate calcolate</caption>
                <thead>
                  <tr>
                    <th scope="col">Rata</th>
                    <th scope="col">Capitale</th>
                    <th scope="col">Interessi</th>
                    <th scope="col">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r) => (
                    <tr key={r.number}>
                      <th scope="row">
                        {r.number} · {formatDate(r.date)}
                        {frozenNumbers.has(r.number) && <span className="installment-form__paid"> versata</span>}
                      </th>
                      <td>{formatAbsoluteAmount(r.principal)}</td>
                      <td>{formatAbsoluteAmount(r.interest)}</td>
                      <td>{formatAbsoluteAmount(r.principal + r.interest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="move-dialog__actions">
              <Button type="submit" loading={create.isPending || rebuild.isPending}>
                {edit ? 'Salva' : 'Crea'}
              </Button>
              <Dialog.Close asChild>
                <Button variant="secondary">Annulla</Button>
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
