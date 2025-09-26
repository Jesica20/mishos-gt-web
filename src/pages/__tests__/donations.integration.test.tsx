import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderIntegration } from '@/test/testUtils.integration'
import Donations from '@/pages/Donations'
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

// Access the helper exported by our mock to control responses per test
import * as SupaMod from '@/integrations/supabase/client'
const setSupabase = (SupaMod as any).__setMockResponse as (r: { data: any; error: any }) => void

// Helper to build fake donations
function donation(overrides: Partial<any> = {}) {
  return {
    id: crypto.randomUUID(),
    description: 'Saco de alimento para gatos',
    date: '2099-10-05T00:00:00.000Z',
    created_at: '2099-10-06T00:00:00.000Z',
    image_url: undefined,
    ...overrides,
  }
}

describe('Donations page (integration)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when there are no donations', async () => {
    setSupabase({ data: [], error: null })

    renderIntegration(<Donations />)

    // Header is visible
    expect(await screen.findByRole('heading', { name: /historial de donaciones/i })).toBeInTheDocument()
    // Empty state UI
    expect(screen.getByRole('heading', { name: /no hay donaciones registradas/i })).toBeInTheDocument()
    expect(screen.getByText(/las donaciones aparecerán aquí/i)).toBeInTheDocument()
  })

  it('renders donation cards with/without image and shows formatted dates', async () => {
    const items = [
      donation({
        description: 'Alimento premium',
        date: '2099-12-24T00:00:00.000Z',
        created_at: '2099-12-25T00:00:00.000Z',
        image_url: 'https://example.com/don1.jpg',
      }),
      donation({
        description: 'Medicinas para gatos',
        date: '2099-11-10T00:00:00.000Z',
        created_at: '2099-11-11T00:00:00.000Z',
        image_url: undefined,
    })]
    setSupabase({ data: items, error: null })

    renderIntegration(<Donations />)

    // Both descriptions should appear as card headings
    expect(await screen.findByRole('heading', { name: /alimento premium/i })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /medicinas para gatos/i })).toBeInTheDocument()

    // First card has an image
    const img = await screen.findByRole('img', { name: /donación/i })
    expect(img).toHaveAttribute('src', 'https://example.com/don1.jpg')

    // There should also be a placeholder (no <img>) for the second card (we
    // can assert the ImageIcon container by absence of another img)
    const allImgs = screen.getAllByRole('img')
    expect(allImgs.length).toBe(1)

    // Date badge (short format like "24 dic") — just assert the short day number appears
    // We avoid locale brittleness by checking presence of the day number the badge must contain.
    expect(screen.getByText(/24/i)).toBeInTheDocument()
    expect(screen.getByText(/10/i)).toBeInTheDocument()
  })
})
