import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import PeriodSelector, { usePeriod, type MonthMode } from './PeriodSelector.tsx'

function Harness({ monthMode }: { monthMode: MonthMode }) {
  const [period, setPeriod] = usePeriod(monthMode)
  const location = useLocation()
  return (
    <>
      <PeriodSelector period={period} onChange={setPeriod} monthMode={monthMode} />
      <output data-testid="search">{location.search}</output>
    </>
  )
}

function setup(url: string, monthMode: MonthMode) {
  const router = createMemoryRouter([{ path: '/', element: <Harness monthMode={monthMode} /> }], { initialEntries: [url] })
  render(<RouterProvider router={router} />)
}

describe('PeriodSelector', () => {
  it('legge anno e mese dall\'indirizzo', () => {
    setup('/?year=2029&month=3', 'required')
    expect(screen.getByLabelText('Anno')).toHaveValue(2029)
    expect(screen.getByLabelText('Mese')).toHaveValue('3')
  })

  it('cambiando anno e mese aggiorna l\'indirizzo; qualsiasi anno è raggiungibile', async () => {
    const user = userEvent.setup()
    setup('/?year=2026&month=3', 'required')
    await user.click(screen.getByRole('button', { name: 'Anno successivo' }))
    expect(screen.getByTestId('search')).toHaveTextContent('year=2027')
    await user.selectOptions(screen.getByLabelText('Mese'), 'Maggio')
    expect(screen.getByTestId('search')).toHaveTextContent('year=2027&month=5')
    await user.clear(screen.getByLabelText('Anno'))
    await user.type(screen.getByLabelText('Anno'), '2045')
    expect(screen.getByTestId('search')).toHaveTextContent('year=2045')
  })

  it('con mese opzionale offre "Anno intero" e toglie il parametro', async () => {
    const user = userEvent.setup()
    setup('/?year=2026&month=3', 'optional')
    await user.selectOptions(screen.getByLabelText('Mese'), 'Anno intero')
    expect(screen.getByTestId('search')).toHaveTextContent(/^\?year=2026$/)
  })

  it('senza mese mostra solo l\'anno', () => {
    setup('/', 'none')
    expect(screen.queryByLabelText('Mese')).not.toBeInTheDocument()
  })
})
