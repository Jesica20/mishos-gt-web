import { renderIntegration } from '@/test/testUtils.integration'
import { screen } from '@testing-library/react'
import NotFound from '@/pages/NotFound'
import { vi } from 'vitest'

describe('NotFound (integration)', () => {
  it('renders 404 page with message and link', () => {
    renderIntegration(<NotFound />, { initialEntries: ['/non-existent'] })

    // heading 404
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument()
    // message text
    expect(screen.getByText(/oops! page not found/i)).toBeInTheDocument()
    // home link
    const link = screen.getByRole('link', { name: /return to home/i })
    expect(link).toHaveAttribute('href', '/')
  })

  it('logs an error with the attempted path', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderIntegration(<NotFound />, { initialEntries: ['/missing-route'] })

    expect(spy).toHaveBeenCalledWith(
      '404 Error: User attempted to access non-existent route:',
      '/missing-route'
    )

    spy.mockRestore()
  })
})