import MonthStatusList from '../components/MonthStatusList.tsx'
import PeriodSelector, { usePeriod } from '../components/PeriodSelector.tsx'
import './CashFlowPage.css'

export default function CashFlowPage() {
  const [period, setPeriod] = usePeriod('none')
  return (
    <main className="cash-flow-page">
      <h1>Flusso di cassa</h1>
      <PeriodSelector period={period} onChange={setPeriod} monthMode="none" />
      <MonthStatusList year={period.year} />
    </main>
  )
}
