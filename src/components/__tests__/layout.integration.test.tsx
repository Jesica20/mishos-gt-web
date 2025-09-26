// src/components/__tests__/layout.integration.test.tsx
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderIntegration } from '@/test/testUtils.integration'
import { Layout } from '@/components/Layout'
import React from 'react'
import { useLocation } from 'react-router-dom'

// Sonda para ver el pathname actual
function PathnameProbe() {
  const { pathname } = useLocation()
  return <div data-testid="pathname">{pathname}</div>
}

describe('Layout (integration)', () => {
  it('renders header, brand and navigation items (scoped to header)', () => {
    renderIntegration(
      <Layout>
        <PathnameProbe />
        <div>Content</div>
      </Layout>,
      { initialEntries: ['/'] },
    )

    // Scope al header (landmark "banner")
    const header = screen.getByRole('banner')

    // Marca/Logo en el header
    expect(within(header).getByRole('link', { name: /mishos gt/i })).toBeInTheDocument()

    // Ítems de navegación en el header (evita duplicados con el nav móvil)
    expect(within(header).getByRole('link', { name: /inicio/i })).toBeInTheDocument()
    expect(within(header).getByRole('link', { name: /donaciones/i })).toBeInTheDocument()
    expect(within(header).getByRole('link', { name: /castraciones/i })).toBeInTheDocument()

    // Botón/link de Admin (también en el header)
    expect(within(header).getByRole('link', { name: /admin/i })).toBeInTheDocument()
  })

  it('marks the active nav item in header based on current pathname', () => {
    renderIntegration(
      <Layout>
        <PathnameProbe />
      </Layout>,
      { initialEntries: ['/donations'] },
    )

    const header = screen.getByRole('banner')

    const inicio = within(header).getByRole('link', { name: /inicio/i })
    const donations = within(header).getByRole('link', { name: /donaciones/i })
    const castrations = within(header).getByRole('link', { name: /castraciones/i })

    // Activo debe tener clases de fondo primario, los demás no
    expect(donations.className).toMatch(/bg-primary/)
    expect(inicio.className).not.toMatch(/bg-primary/)
    expect(castrations.className).not.toMatch(/bg-primary/)
  })

  it('navigates to /auth when clicking the Admin button', async () => {
    const user = userEvent.setup()

    renderIntegration(
      <Layout>
        <PathnameProbe />
      </Layout>,
      { initialEntries: ['/'] },
    )

    await user.click(screen.getByRole('link', { name: /admin/i }))
    expect(await screen.findByTestId('pathname')).toHaveTextContent('/auth')
  })

  it('navigates between header nav links (e.g., to /castrations)', async () => {
    const user = userEvent.setup()

    renderIntegration(
      <Layout>
        <PathnameProbe />
      </Layout>,
      { initialEntries: ['/donations'] }, // partimos desde /donations
    )

    const header = screen.getByRole('banner')
    await user.click(within(header).getByRole('link', { name: /castraciones/i }))

    // espera a que cambie el pathname
    expect(await screen.findByTestId('pathname')).toHaveTextContent('/castrations')
  })

  it('renders mobile nav links in the DOM (in addition to header)', () => {
    renderIntegration(
      <Layout>
        <PathnameProbe />
      </Layout>,
      { initialEntries: ['/'] },
    )

    // El nav móvil también está en el DOM; contamos duplicados
    const allInicio = screen.getAllByRole('link', { name: /inicio/i })
    const allDonaciones = screen.getAllByRole('link', { name: /donaciones/i })
    const allCastraciones = screen.getAllByRole('link', { name: /castraciones/i })

    expect(allInicio.length).toBeGreaterThanOrEqual(2)
    expect(allDonaciones.length).toBeGreaterThanOrEqual(2)
    expect(allCastraciones.length).toBeGreaterThanOrEqual(2)
  })
})