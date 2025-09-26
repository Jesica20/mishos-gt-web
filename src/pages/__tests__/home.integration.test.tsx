import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { AppRoutes } from '@/AppRoutes'
import { renderIntegration } from '@/test/testUtils.integration'
import { useLocation } from 'react-router-dom'

function PathnameProbe() {
  const { pathname } = useLocation()
  return <div data-testid="pathname">{pathname}</div>
}

describe('Home (integration)', () => {
  it('renderiza Home en "/"', async () => {
    renderIntegration(<AppRoutes />, { initialEntries: ['/'] })
    expect(await screen.findByRole('heading', { name: /mishos gt/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /nuestros servicios/i, level: 2 })).toBeInTheDocument()
  })

  it('navega a "/donations" al hacer click en "Ver Donaciones"', async () => {
    const user = userEvent.setup()
    renderIntegration(<><AppRoutes /><PathnameProbe /></>, { initialEntries: ['/'] })
    await user.click(screen.getByTestId('cta-donations'))
    expect(await screen.findByTestId('pathname')).toHaveTextContent('/donations')
  })

  it('navega a "/castrations" al hacer click en "Agendar Castración"', async () => {
    const user = userEvent.setup()
    renderIntegration(<><AppRoutes /><PathnameProbe /></>, { initialEntries: ['/'] })
    await user.click(screen.getByTestId('cta-castrations'))
    expect(await screen.findByTestId('pathname')).toHaveTextContent('/castrations')
  })
})