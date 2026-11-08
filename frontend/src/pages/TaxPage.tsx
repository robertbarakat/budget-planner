import { useState } from 'react'
import { Link } from 'react-router'
import Amount from '../components/Amount.tsx'
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
      <h1>Fiscale</h1>
      <Link to={paths.taxF24} className="tax-page__link">Calendario F24 →</Link>
      <Link to={paths.taxInstallments} className="tax-page__link">Rateizzazioni →</Link>
      <YearSelector year={year} onChange={setYear} />
      {failed ? (
        <p role="alert" className="tax-page__note">Non riesco a leggere i dati fiscali. Riprova più tardi.</p>
      ) : loading ? (
        <p role="status" className="tax-page__note">Caricamento…</p>
      ) : !summary ? (
        <p className="tax-page__note">
          Mancano i parametri fiscali del {year}: inseriscili in <Link to={paths.settingsTaxParameters}>Parametri fiscali</Link>.
        </p>
      ) : (
        <>
          <dl className="tax-page__grid">
            <div><dt>Incassi professionali</dt><dd><Amount value={summary.collections} colored={false} /></dd></div>
            <div><dt>Base imponibile</dt><dd><Amount value={summary.taxableBase} colored={false} /></dd></div>
            <div><dt>INPS dovuta</dt><dd><Amount value={summary.inpsDue} colored={false} /></dd></div>
            <div><dt>INPS versata nell'anno</dt><dd><Amount value={summary.inpsPaid} colored={false} /></dd></div>
            <div><dt>Imposta sostitutiva</dt><dd><Amount value={summary.substituteTax} colored={false} /></dd></div>
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
