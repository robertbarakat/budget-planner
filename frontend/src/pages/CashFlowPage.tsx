import PeriodSelector, { usePeriod } from '../components/PeriodSelector.tsx'

export default function CashFlowPage() {
  const [period, setPeriod] = usePeriod('none')
  return (
    <main>
      <h1>Flusso di cassa</h1>
      <PeriodSelector period={period} onChange={setPeriod} monthMode="none" />
      <p>Pagina in costruzione.</p>
    </main>
  )
}
