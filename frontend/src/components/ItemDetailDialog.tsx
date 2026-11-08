import { Dialog } from 'radix-ui'
import { Link } from 'react-router'
import type { ItemDetail } from '../lib/item-detail.ts'
import { monthName } from '../lib/months.ts'
import { paths } from '../paths.ts'
import Amount from './Amount.tsx'
import Button from './Button.tsx'
import './ItemDetailDialog.css'

export interface ItemDetailDialogProps {
  name: string
  detail: ItemDetail
  onClose: () => void
}

/** Pannello con l'andamento mensile di una voce e il reale per categoria. Si chiude con Esc o con "Chiudi". */
export default function ItemDetailDialog({ name, detail, onClose }: ItemDetailDialogProps) {
  const { year } = detail
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="item-detail__overlay" />
        <Dialog.Content className="item-detail">
          <Dialog.Title className="item-detail__title">
            {name} · {year}
          </Dialog.Title>
          <Dialog.Description className="item-detail__text">
            Previsto, reale e scostamento (reale − previsto) mese per mese. Entrate positive, spese negative.
          </Dialog.Description>

          <div className="item-detail__scroll">
            <table className="item-detail__table">
              <caption className="visually-hidden">Andamento mensile di {name}</caption>
              <thead>
                <tr>
                  <th scope="col">Mese</th>
                  <th scope="col">Previsto</th>
                  <th scope="col">Reale</th>
                  <th scope="col">Scostamento</th>
                  <th scope="col">Movimenti</th>
                </tr>
              </thead>
              <tbody>
                {detail.months.map((row) => (
                  <tr key={row.month}>
                    <th scope="row">
                      {monthName(row.month)} <span className="item-detail__state">({row.isClosed ? 'chiuso' : 'aperto'})</span>
                    </th>
                    <td>
                      <Amount value={row.budgeted} colored={false} />
                    </td>
                    <td>
                      <Amount value={row.actual} colored={false} />
                    </td>
                    <td>
                      <Amount value={row.variance} explicitPlus />
                    </td>
                    <td>
                      <Link
                        className="item-detail__link"
                        to={`${paths.transactions}?year=${year}&month=${row.month}`}
                        aria-label={`Movimenti di ${monthName(row.month)} ${year}`}
                      >
                        Apri
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Totale {year}</th>
                  <td>
                    <Amount value={detail.total.budgeted} colored={false} />
                  </td>
                  <td>
                    <Amount value={detail.total.actual} colored={false} />
                  </td>
                  <td>
                    <Amount value={detail.total.variance} explicitPlus />
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <h3 className="item-detail__subtitle">Categorie nella voce (reale {year})</h3>
          {detail.categories.length === 0 ? (
            <p className="item-detail__text">Nessuna categoria collegata a questa voce.</p>
          ) : (
            <ul className="item-detail__categories">
              {detail.categories.map((category) => (
                <li key={category.categoryId}>
                  <span>{category.name}</span>
                  <Amount value={category.actual} colored={false} />
                </li>
              ))}
            </ul>
          )}

          <div className="item-detail__actions">
            <Dialog.Close asChild>
              <Button variant="secondary">Chiudi</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
