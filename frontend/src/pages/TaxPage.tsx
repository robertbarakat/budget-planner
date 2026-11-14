import { useState } from 'react'
import { Link } from 'react-router'
import Amount from '../components/Amount.tsx'
import TaxNav from '../components/TaxNav.tsx'
import YearSelector from '../components/YearSelector.tsx'
import type { TaxLine } from '../lib/tax-summary.ts'
import { paths } from '../paths.ts'
import { useTaxSummary } from './use-tax-summary.ts'
import './TaxPage.css'

const italianDate = (date: string) => date.split('-').reverse().join('/')

function LineAmount({ line }: { line: TaxLine }) {
  return (
    <>
      <span className="tax-page__value">{line.amount === null ? '—' : <Amount value={line.amount} colored={false} />}</span>
      <span className="tax-page__why">{line.explanation}</span>
    </>
  )
}

export default function TaxPage() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const { summary, isError: failed, isPending: loading } = useTaxSummary(year)

  return (
    <main className="tax-page">
      <h1>Tasse e contributi</h1>
      <TaxNav />
      <YearSelector year={year} onChange={setYear} />
      {failed ? (
        <p role="alert" className="tax-page__note">Non riesco a leggere i dati fiscali. Riprova più tardi.</p>
      ) : loading ? (
        <p role="status" className="tax-page__note">Caricamento…</p>
      ) : !summary ? (
        <section className="tax-page__empty">
          <h2>Mancano i parametri fiscali del {year}</h2>
          <p>
            Servono per calcolare imposta sostitutiva, INPS, acconti e saldo: aliquote, coefficiente di redditività e contributi dell'anno.
          </p>
          <Link to={paths.taxParameters} className="tax-page__cta">
            Inserisci i parametri del {year}
          </Link>
        </section>
      ) : (
        <>
          <dl className="tax-page__grid">
            <div><dt>Incassi professionali a oggi</dt><dd><Amount value={summary.collectionsToDate} colored={false} /></dd></div>
            <div><dt>Incassi stimati a fine anno</dt><dd><Amount value={summary.collections} colored={false} /></dd></div>
            <div><dt>Base imponibile stimata</dt><dd><Amount value={summary.taxableBase} colored={false} /></dd></div>
            <div><dt>INPS dovuta stimata</dt><dd><Amount value={summary.inpsDue} colored={false} /></dd></div>
            <div><dt>INPS pagata nell'anno (saldo + acconti)</dt><dd><Amount value={summary.inpsPaid} colored={false} /></dd></div>
            <div><dt>Imposta sostitutiva stimata</dt><dd><Amount value={summary.substituteTax} colored={false} /></dd></div>
          </dl>
          <h2>Acconti e saldo</h2>
          {summary.advances.map((a) => (
            <section key={a.position} className="tax-page__advance">
              <h3>
                {a.position === 'first' ? 'Primo acconto' : 'Secondo acconto'} · {italianDate(a.dueDate)} · {a.method === 'historic' ? 'Storico' : 'Previsionale'}
              </h3>
              <h4>Imposta sostitutiva</h4>
              <LineAmount line={a.substituteTax} />
              <h4>INPS</h4>
              <LineAmount line={a.inps} />
            </section>
          ))}
          <section className="tax-page__advance">
            <h3>Saldo dell'anno</h3>
            <h4>Imposta sostitutiva</h4>
            <span className="tax-page__value">{summary.substituteTaxBalance === null ? '—' : <Amount value={summary.substituteTaxBalance} colored={false} />}</span>
            <h4>INPS</h4>
            <span className="tax-page__value">{summary.inpsBalance === null ? '—' : <Amount value={summary.inpsBalance} colored={false} />}</span>
            <span className="tax-page__why">Saldo = importo dovuto meno gli acconti. Non calcolabile se un acconto non lo è.</span>
          </section>
        </>
      )}
    </main>
  )
}
