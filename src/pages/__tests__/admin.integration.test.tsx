

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { renderIntegration } from '@/test/testUtils.integration'
import Admin from '@/pages/Admin'

// --- Mocks ---
// Mock useAuth hook to control auth states per test
vi.mock('@/hooks/useAuth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useAuth')>()
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})

// Mock useNavigate to observe redirects without a real router navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock heavy admin child components to keep tests fast and deterministic
vi.mock('@/components/admin/AdminDonations', () => ({
  AdminDonations: () => <h2>Donations Panel</h2>,
}))
vi.mock('@/components/admin/AdminCampaigns', () => ({
  AdminCampaigns: () => <h2>Campaigns Panel</h2>,
}))
vi.mock('@/components/admin/AdminAppointments', () => ({
  AdminAppointments: () => <h2>Appointments Panel</h2>,
}))

// Type helper to get strong typing on mocked useAuth
import { useAuth as useAuthUnmocked } from '@/hooks/useAuth'
const useAuth = useAuthUnmocked as unknown as ReturnType<typeof vi.fn>

describe('Admin page (integration)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state when loading=true', () => {
    useAuth.mockReturnValue({ user: null, loading: true, signOut: vi.fn() })

    renderIntegration(<Admin />)

    expect(screen.getByText(/cargando/i)).toBeInTheDocument()
  })

  it('redirects to /auth when user is not present and loading=false', () => {
    useAuth.mockReturnValue({ user: null, loading: false, signOut: vi.fn() })

    renderIntegration(<Admin />)

    expect(mockNavigate).toHaveBeenCalledWith('/auth')
  })

  it('renders the admin panel when user is present', () => {
    useAuth.mockReturnValue({ user: { email: 'test@mail.com' }, loading: false, signOut: vi.fn() })

    renderIntegration(<Admin />)

    expect(screen.getByRole('heading', { name: /panel de administración/i })).toBeInTheDocument()
    expect(screen.getByText(/bienvenido, test@mail.com/i)).toBeInTheDocument()
    // Default tab should be Donations
    expect(screen.getByRole('heading', { name: /donations panel/i })).toBeInTheDocument()
  })

  it('signs out and navigates to / after clicking "Cerrar Sesión"', async () => {
    const mockSignOut = vi.fn()
    useAuth.mockReturnValue({ user: { email: 'test@mail.com' }, loading: false, signOut: mockSignOut })

    const user = userEvent.setup()
    renderIntegration(<Admin />)

    await user.click(screen.getByRole('button', { name: /cerrar sesión/i }))

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('switches tabs: Donations → Campaigns → Appointments', async () => {
    useAuth.mockReturnValue({ user: { email: 'test@mail.com' }, loading: false, signOut: vi.fn() })

    const user = userEvent.setup()
    renderIntegration(<Admin />)

    // Default tab content
    expect(screen.getByRole('heading', { name: /donations panel/i })).toBeInTheDocument()

    // Go to Campaigns
    await user.click(screen.getByRole('tab', { name: /jornadas/i }))
    expect(screen.getByRole('heading', { name: /campaigns panel/i })).toBeInTheDocument()

    // Go to Appointments
    await user.click(screen.getByRole('tab', { name: /citas/i }))
    expect(screen.getByRole('heading', { name: /appointments panel/i })).toBeInTheDocument()
  })
})