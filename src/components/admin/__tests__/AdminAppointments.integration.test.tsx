// src/components/admin/__tests__/AdminAppointments.integration.test.tsx
import React from 'react'
import { screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'

// ✅ 1) Declara todos los mocks en un bloque hoisted
const h = vi.hoisted(() => {
  // Cadena supabase.from().select().order()
  const orderMock = vi.fn().mockResolvedValue({ data: null, error: null })
  const selectMock = vi.fn(() => ({ order: orderMock }))
  const fromMock = vi.fn(() => ({ select: selectMock }))

  // Auth mocks (para useAuth en tu wrapper)
  const onAuthStateChange = vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }))
  const getSession = vi.fn().mockResolvedValue({ data: { session: null } })

  // Helper para setear el próximo resultado de .order()
  function setSupabaseResult(result: { data: any; error: any }) {
    orderMock.mockResolvedValueOnce(result)
  }

  return {
    orderMock,
    selectMock,
    fromMock,
    onAuthStateChange,
    getSession,
    setSupabaseResult,
  }
})

// ✅ 2) Mockea el módulo usando SOLO lo definido en el hoisted
vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: h.fromMock,
      auth: {
        onAuthStateChange: h.onAuthStateChange,
        getSession: h.getSession,
      },
    },
  }
})

// ✅ 3) Ahora sí importa lo que usa el mock
import { renderIntegration } from '@/test/testUtils.integration'
import { AdminAppointments } from '@/components/admin/AdminAppointments'

describe('AdminAppointments (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when no appointments', async () => {
    h.setSupabaseResult({ data: [], error: null })

    renderIntegration(<AdminAppointments />)

    // Espera a que deje de estar "Cargando..." y aparezca el título
    expect(
      await screen.findByRole('heading', { name: /citas agendadas/i })
    ).toBeInTheDocument()

    // Estado vacío
    expect(screen.getByText(/no hay citas agendadas/i)).toBeInTheDocument()

    // Verifica cadena hacia Supabase
    expect(h.fromMock).toHaveBeenCalledWith('appointments')
    expect(h.selectMock).toHaveBeenCalledWith(
      expect.stringContaining('castration_campaigns')
    )
    expect(h.orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('renders a list of appointments with campaign info', async () => {
    h.setSupabaseResult({
      data: [
        {
          id: 'a1',
          pet_name: 'Mishi',
          pet_size: 'mediana',
          owner_first_name: 'Kevin',
          owner_last_name: 'Mendez',
          appointment_time: '09:30',
          campaign: { title: 'Zona 1', date: '2099-10-10', location: 'Parque Central' },
        },
        {
          id: 'a2',
          pet_name: 'Firulais',
          pet_size: 'grande',
          owner_first_name: 'Ana',
          owner_last_name: 'Lopez',
          appointment_time: '10:00',
          campaign: { title: 'Zona 5', date: '2099-11-01', location: 'Colonia Jardines' },
        },
      ],
      error: null,
    })

    renderIntegration(<AdminAppointments />)

    expect(
      await screen.findByRole('heading', { name: /citas agendadas/i })
    ).toBeInTheDocument()

    // Card 1
    expect(screen.getByText('Mishi')).toBeInTheDocument()
    expect(screen.getByText('mediana')).toBeInTheDocument()
    expect(screen.getByText(/kevin mendez/i)).toBeInTheDocument()
    expect(screen.getByText('09:30')).toBeInTheDocument()
    expect(screen.getByText('2099-10-10')).toBeInTheDocument()
    expect(screen.getByText('Parque Central')).toBeInTheDocument()

    // Card 2
    expect(screen.getByText('Firulais')).toBeInTheDocument()
    expect(screen.getByText('grande')).toBeInTheDocument()
    expect(screen.getByText(/ana lopez/i)).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(screen.getByText('2099-11-01')).toBeInTheDocument()
    expect(screen.getByText('Colonia Jardines')).toBeInTheDocument()
  })

  it('handles fetch error: logs and shows empty state', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.setSupabaseResult({ data: null, error: new Error('boom') })

    renderIntegration(<AdminAppointments />)

    expect(
      await screen.findByRole('heading', { name: /citas agendadas/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/no hay citas agendadas/i)).toBeInTheDocument()

    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})