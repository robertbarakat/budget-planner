import { useState } from 'react'
import { Popover } from 'radix-ui'
import type { CategoryGroup } from './TransactionForm.tsx'
import './CategoryPicker.css'

interface Props {
  id: string
  className?: string
  groups: CategoryGroup[]
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  describedBy?: string
}

/** Menu categorie con ricerca dentro il menu: macro-area come intestazione, categoria come riga. */
export default function CategoryPicker({ id, groups, value, onChange, invalid, describedBy }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()

  const rows = groups.flatMap((g) => g.categories.map((c) => ({ ...c, item: g.budgetItemName, macro: g.macroAreaName })))
  const selected = rows.find((r) => String(r.id) === value)
  const visible = rows.filter((r) => !needle || `${r.name} ${r.item} ${r.macro}`.toLowerCase().includes(needle))
  visible.sort((a, b) => a.name.localeCompare(b.name, 'it'))
  const macros = [...new Set(visible.map((r) => r.macro))].sort((a, b) => a.localeCompare(b, 'it'))

  function pick(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          id={id}
          className="category-picker__trigger"
          aria-haspopup="listbox"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        >
          <span className={selected ? undefined : 'category-picker__placeholder'}>{selected ? selected.name : 'Scegli…'}</span>
          <span aria-hidden="true">▾</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="category-picker__panel" align="start" sideOffset={4} collisionPadding={8}>
          <input
            type="search"
            className="category-picker__search"
            aria-label="Cerca categoria"
            placeholder="Cerca categoria…"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="category-picker__list" role="listbox" aria-label="Categorie">
            {macros.length === 0 && <p className="category-picker__empty">Nessun risultato</p>}
            {macros.map((macro) => (
              <div key={macro} role="group" aria-label={macro}>
                <p className="category-picker__macro">{macro}</p>
                {visible
                  .filter((r) => r.macro === macro)
                  .map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      role="option"
                      aria-selected={String(r.id) === value}
                      className="category-picker__option"
                      onClick={() => pick(String(r.id))}
                    >
                      {r.name}
                      {r.item !== r.name && !r.item.startsWith(r.name) && <small>{r.item}</small>}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
