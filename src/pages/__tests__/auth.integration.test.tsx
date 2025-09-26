import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderIntegration } from '@/test/testUtils.integration'
import Auth from '@/pages/Auth'
import { vi } from 'vitest'
import React from 'react'

// --- Mock useAuth: solo el hook; dejamos AuthProvider real fuera de este test ---
const mockSignIn = vi.fn()
const mockSignUp = vi.fn()

vi.mock('@/hooks/useAuth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useAuth')>()
  return {
    ...actual,
    useAuth: () => ({
      signIn: mockSignIn,
      signUp: mockSignUp,
    }),
  }
})

// --- Mock toast API ---
const toastSpy = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  toast: (...args: any[]) => toastSpy(...args),
}))

// --- Mock useNavigate para capturar redirects ---
const navigateSpy = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  }
})

describe('Auth page (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders basic UI (login form only)', () => {
    renderIntegration(<Auth />)

    // Títulos y form
    expect(screen.getByRole('heading', { name: /mishos gt/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /acceso administrativo/i })).toBeInTheDocument()

    // Inputs de Sign In únicamente
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
    
    // No debe haber tabs de registro
    expect(screen.queryByRole('tab', { name: /registrarse/i })).not.toBeInTheDocument()
  })

  it('sign in success: shows welcome toast and navigates to /admin', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValueOnce({ error: null })

    renderIntegration(<Auth />)

    await user.type(screen.getByLabelText(/email/i), 'admin@mishosgt.com')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /^iniciar sesión$/i }))

    expect(mockSignIn).toHaveBeenCalledWith('admin@mishosgt.com', 'secret123')
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringMatching(/bienvenido/i) })
    )
    expect(navigateSpy).toHaveBeenCalledWith('/admin')
  })

  it('sign in error: shows invalid credentials toast', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } })

    renderIntegration(<Auth />)

    await user.type(screen.getByLabelText(/email/i), 'x@mishosgt.com')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'badpass')
    await user.click(screen.getByRole('button', { name: /^iniciar sesión$/i }))

    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/error de autenticación/i),
        description: expect.stringMatching(/credenciales incorrectas/i),
        variant: 'destructive',
      })
    )
    expect(navigateSpy).not.toHaveBeenCalled()
  })

  it('sign in error: shows generic auth error toast', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValueOnce({ error: { message: 'Something went wrong' } })

    renderIntegration(<Auth />)

    await user.type(screen.getByLabelText(/email/i), 'x@mishosgt.com')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'badpass')
    await user.click(screen.getByRole('button', { name: /^iniciar sesión$/i }))

    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/error de autenticación/i),
        description: 'Something went wrong',
        variant: 'destructive',
      })
    )
    expect(navigateSpy).not.toHaveBeenCalled()
  })

  it('can toggle password visibility in Sign In', async () => {
    const user = userEvent.setup()
    renderIntegration(<Auth />)

    const password = screen.getByLabelText(/^contraseña$/i) as HTMLInputElement
    const toggle = screen.getByRole('button', { name: '' }) // ojo: ícono sin nombre; se puede mejorar con aria-label

    expect(password.type).toBe('password')
    await user.click(toggle)
    expect(password.type).toBe('text')
    await user.click(toggle)
    expect(password.type).toBe('password')
  })

  it('back to home button calls navigate("/")', async () => {
    const user = userEvent.setup()
    renderIntegration(<Auth />)

    await user.click(screen.getByRole('button', { name: /volver al inicio/i }))
    expect(navigateSpy).toHaveBeenCalledWith('/')
  })
})
