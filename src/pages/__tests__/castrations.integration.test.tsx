import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderIntegration } from '@/test/testUtils.integration'
import Castrations from '@/pages/Castrations'
import { vi } from 'vitest'

// --- Mock AuthProvider/useAuth to avoid real Supabase auth wiring in tests ---
vi.mock('@/hooks/useAuth', () => {
  const React = require('react')
  return {
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
  }
})

// --- Mock Supabase client with a controllable response chain ---
vi.mock('@/integrations/supabase/client', () => {
  type Resp = { data: any; error: any }
  let response: Resp = { data: [], error: null }

  const chain = {
    select: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    order: vi.fn(async () => response),
  }

  const from = vi.fn(() => chain)

  return {
    supabase: { from },
    __setMockResponse: (r: Resp) => {
      response = r
    },
  }
})

// --- Mock AppointmentModal so we can assert it opens without rendering the real modal ---
vi.mock('@/components/AppointmentModal', () => ({
  AppointmentModal: ({ campaign }: { campaign: any }) => (
    <div data-testid="appointment-modal">Modal for: {campaign?.title}</div>
  ),
}))

// Access the helper exported by our mock to control responses per test
import * as SupaMod from '@/integrations/supabase/client'
const setSupabase = (SupaMod as any).__setMockResponse as (r: { data: any; error: any }) => void

// Helpers to build fake campaigns
function campaign(overrides: Partial<any> = {}) {
  return {
    id: crypto.randomUUID(),
    title: 'Campaña en Zona 1',
    location: 'Zona 1',
    date: '2099-12-01',
    start_time: '08:00',
    end_time: '12:00',
    max_appointments: 10,
    appointments_count: 3,
    description: 'Descripción corta',
    image_url: '',
    ...overrides,
  }
}

describe('Castrations page (integration)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when there are no upcoming campaigns', async () => {
    setSupabase({ data: [], error: null })

    renderIntegration(<Castrations />)

    expect(await screen.findByRole('heading', { name: /no hay jornadas programadas/i }))
      .toBeInTheDocument()
    expect(screen.getByText(/las próximas jornadas de castración aparecerán aquí/i))
      .toBeInTheDocument()
  })

  it('renders campaign cards with availability badges', async () => {
    const items = [
      campaign({ title: 'Zona 10', appointments_count: 2, max_appointments: 5 }), // 3 available
      campaign({ title: 'Zona 12', appointments_count: 10, max_appointments: 10 }), // full
    ]
    setSupabase({ data: items, error: null })

    renderIntegration(<Castrations />)

    // Both campaign headings should render
    expect(await screen.findByRole('heading', { name: /zona 10/i })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /zona 12/i })).toBeInTheDocument()

    // There should be at least one enabled "Agendar cita" button (for available campaign)
    const bookButtons = await screen.findAllByRole('button', { name: /agendar cita/i })
    expect(bookButtons.some((b) => !b.hasAttribute('disabled'))).toBe(true)
  })

  it('opens the appointment modal after clicking "Agendar cita"', async () => {
    const item = campaign({ title: 'Zona 5', appointments_count: 1, max_appointments: 2 })
    setSupabase({ data: [item], error: null })

    const user = userEvent.setup()
    renderIntegration(<Castrations />)

    const btn = await screen.findByRole('button', { name: /agendar cita/i })
    await user.click(btn)

    expect(await screen.findByTestId('appointment-modal')).toHaveTextContent('Zona 5')
  })
})