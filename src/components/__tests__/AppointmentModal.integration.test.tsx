import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderIntegration } from '@/test/testUtils.integration'
import { AppointmentModal } from '@/components/AppointmentModal'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'

const h = vi.hoisted(() => {
  const order = vi.fn().mockResolvedValue({ data: null, error: null }) // select().order()
  const gte   = vi.fn(() => ({ order }))                                      // select().gte().order()
  const select = vi.fn(() => ({ gte, order }))                                 // select()
  const insert = vi.fn().mockResolvedValue({ data: null, error: null })         // insert()
  const from   = vi.fn(() => ({ select, insert }))                             // from()

  const auth = {
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }

  // Helpers para configurar respuestas en cada test:
  const setSelectOnce = (result: { data:any; error:any }) => order.mockResolvedValueOnce(result)
  const setInsertOnce = (result: { data?:any; error:any }) => insert.mockResolvedValueOnce(result)

  const resetAll = () => {
    order.mockReset()
    gte.mockReset()
    select.mockReset()
    insert.mockReset()
    from.mockReset()
    Object.values(auth).forEach((fn) => (fn as any).mockReset?.())
    // Re-establece defaults si hace falta
    auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    auth.getSession.mockResolvedValue({ data: { session: null } })
  }

  return { order, gte, select, insert, from, auth, setSelectOnce, setInsertOnce, resetAll }
})

// --------- Mocks de UI (Dialog, Select, RadioGroup) para simplificar interacciones ---------
// Dialog: renderiza los children directamente
vi.mock('@/components/ui/dialog', () => {
  const Dialog = ({ open, onOpenChange, children }: any) => <div data-testid="dialog">{children}</div>
  const DialogContent = ({ children, className }: any) => <div data-testid="dialog-content" className={className}>{children}</div>
  const DialogHeader = ({ children }: any) => <div>{children}</div>
  const DialogTitle = ({ children, className }: any) => <h2 className={className}>{children}</h2>
  const DialogDescription = ({ children }: any) => <p>{children}</p>
  return { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription }
})

// Select: versión “controlada” simple
vi.mock('@/components/ui/select', () => {
  const Select = ({ value, onValueChange, children }: any) => <div data-testid="select" data-value={value}>{children}</div>
  const SelectTrigger = ({ children }: any) => <button type="button">{children}</button>
  const SelectValue = ({ placeholder }: any) => <span>{placeholder}</span>
  const SelectContent = ({ children }: any) => <div>{children}</div>
  const SelectItem = ({ value, children }: any) => (
    <button type="button" data-testid={`select-item-${value}`} onClick={() => (document as any).__onSelect?.(value)}>
      {children}
    </button>
  )
  // “puente” para simular onValueChange desde el test
  ;(globalThis as any).___setSelectHandler = (fn: (v: string)=>void) => {
    ;(document as any).__onSelect = fn
  }
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
})

// RadioGroup: botones tipo radio simples
vi.mock('@/components/ui/radio-group', () => {
  const RadioGroup = ({ value, onValueChange, children, className }: any) => (
    <div data-testid="radiogroup" data-value={value} className={className}>
      {children}
    </div>
  )
  const RadioGroupItem = ({ value, id }: any) => (
    <input type="radio" role="radio" aria-checked="false" data-value={value} id={id} />
  )
  return { RadioGroup, RadioGroupItem }
})

// No necesitamos mockear Button/Input/Label/Textarea

// --------- Mock toast ---------
const toastSpy = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  toast: (...args: any[]) => toastSpy(...args),
}))

// --------- Mock Supabase ---------
const insertMock = vi.fn()
const fromMock = vi.fn(() => ({ insert: insertMock }))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: fromMock },
}))

// --------- Helpers ---------
const defaultCampaign = {
  id: 'cmp-1',
  title: 'Campaña Zona 1',
  location: 'Parque Central',
  date: '2099-10-10T00:00:00.000Z',
  start_time: '09:00',
  end_time: '10:30', // slots esperados: 09:00, 09:30, 10:00
  max_appointments: 10,
}

describe('AppointmentModal (integration)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  it('renders basic info and generates time slots between start and end (each 30m)', async () => {
    renderIntegration(
      <AppointmentModal
        campaign={defaultCampaign as any}
        isOpen
        onClose={() => {}}
        onSuccess={() => {}}
      />
    )

    // Encabezado del formulario
    expect(
      screen.getByRole('heading', { name: /agendar cita de castración/i })
    ).toBeInTheDocument()

    // Info de campaña visible
    expect(screen.getByText(/campaña zona 1/i)).toBeInTheDocument()
    expect(screen.getByText(/parque central/i)).toBeInTheDocument()

    // Select de horario presente
    expect(screen.getByText(/selecciona un horario/i)).toBeInTheDocument()

    // simulamos la capa Select: necesitamos conectar el onValueChange
    const selectDiv = screen.getByTestId('select')
    const onValueChange = (value: string) => {
      // El componente final llama onValueChange → handleInputChange('appointment_time', value)
      // Aprovechamos el “puente” del mock de Select
    }
    ;(globalThis as any).___setSelectHandler((v: string) => {
      // noop: comprobamos que existan los items clicables
    })

    // Hay 3 ítems de tiempo esperados
    expect(screen.getByTestId('select-item-09:00')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-09:30')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-10:00')).toBeInTheDocument()
  })

  it('shows validation toast when required fields are missing', async () => {
    const user = userEvent.setup()

    renderIntegration(
      <AppointmentModal
        campaign={defaultCampaign as any}
        isOpen
        onClose={() => {}}
        onSuccess={() => {}}
      />
    )

    await user.click(screen.getByRole('button', { name: /agendar cita/i }))
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/faltan campos obligatorios/i),
        variant: 'destructive',
      })
    )
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('submits successfully: inserts, shows success toast and triggers onSuccess after 5s', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()

    insertMock.mockResolvedValueOnce({ error: null })

    renderIntegration(
      <AppointmentModal
        campaign={defaultCampaign as any}
        isOpen
        onClose={() => {}}
        onSuccess={onSuccess}
      />
    )

    // Completar campos obligatorios
    await user.type(screen.getByLabelText(/nombre de la mascota/i), 'Mishi')

    // Talla (Select) → usamos el mock para “elegir” una opción
    // Conecta el onValueChange del mock:
    const selectSpy = vi.fn()
    ;(globalThis as any).___setSelectHandler((v: string) => {
      // El componente usa onValueChange para setear pet_size y appointment_time según el Select activo.
      // Aquí solo necesitamos simular la selección; luego interactuaremos con ambos selects:
      selectSpy(v)
    })
    // Seleccionar talla:
    await user.click(screen.getByTestId('select-item-pequeña')) // existe en el DOM
    // Como el mock no cambia el DOM, seguimos llenando el resto.

    // Marcar ayuno (radio true)
    await user.click(screen.getByLabelText(/sí, mi mascota ha ayunado 12 horas/i))

    // Dueño
    await user.type(screen.getByLabelText(/nombres \*/i), 'Kevin')
    await user.type(screen.getByLabelText(/apellidos \*/i), 'Mendez')
    await user.type(screen.getByLabelText(/^edad \*/i), '30')
    await user.type(screen.getByLabelText(/identificación \*/i), '1234567')

    // Horario (Select de horas)
    await user.click(screen.getByTestId('select-item-09:30'))

    // Enviar
    await user.click(screen.getByRole('button', { name: /agendar cita/i }))

    // Verifica que se haya intentado insertar en la tabla 'appointments'
    expect(fromMock).toHaveBeenCalledWith('appointments')
    expect(insertMock).toHaveBeenCalled()
    // Éxito: toast de confirmación
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/cita agendada exitosamente/i),
      })
    )

    // El componente entra a “pantalla de confirmación” (título grande)
    expect(
      await screen.findByRole('heading', { name: /¡cita confirmada exitosamente!/i })
    ).toBeInTheDocument()

    // Avanzamos 5s para que auto-cierre y llame onSuccess
    await vi.advanceTimersByTimeAsync(5000)
    expect(onSuccess).toHaveBeenCalled()
  })

  it('handles unique constraint error (horario duplicado) with specific destructive toast', async () => {
    const user = userEvent.setup()

    insertMock.mockResolvedValueOnce({ error: { code: '23505' } })

    renderIntegration(
      <AppointmentModal
        campaign={defaultCampaign as any}
        isOpen
        onClose={() => {}}
        onSuccess={() => {}}
      />
    )

    // Required
    await user.type(screen.getByLabelText(/nombre de la mascota/i), 'Mishi')
    await user.click(screen.getByTestId('select-item-pequeña'))
    await user.click(screen.getByLabelText(/sí, mi mascota ha ayunado 12 horas/i))
    await user.type(screen.getByLabelText(/nombres \*/i), 'Kevin')
    await user.type(screen.getByLabelText(/apellidos \*/i), 'Mendez')
    await user.type(screen.getByLabelText(/^edad \*/i), '30')
    await user.type(screen.getByLabelText(/identificación \*/i), '1234567')
    await user.click(screen.getByTestId('select-item-10:00'))

    await user.click(screen.getByRole('button', { name: /agendar cita/i }))

    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/horario no disponible/i),
        variant: 'destructive',
      })
    )
  })

  it('handles generic error with destructive toast', async () => {
    const user = userEvent.setup()

    insertMock.mockRejectedValueOnce(new Error('boom'))

    renderIntegration(
      <AppointmentModal
        campaign={defaultCampaign as any}
        isOpen
        onClose={() => {}}
        onSuccess={() => {}}
      />
    )

    // Required
    await user.type(screen.getByLabelText(/nombre de la mascota/i), 'Mishi')
    await user.click(screen.getByTestId('select-item-pequeña'))
    await user.click(screen.getByLabelText(/sí, mi mascota ha ayunado 12 horas/i))
    await user.type(screen.getByLabelText(/nombres \*/i), 'Kevin')
    await user.type(screen.getByLabelText(/apellidos \*/i), 'Mendez')
    await user.type(screen.getByLabelText(/^edad \*/i), '30')
    await user.type(screen.getByLabelText(/identificación \*/i), '1234567')
    await user.click(screen.getByTestId('select-item-09:00'))

    await user.click(screen.getByRole('button', { name: /agendar cita/i }))

    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/error al agendar cita/i),
        variant: 'destructive',
      })
    )
  })
})
