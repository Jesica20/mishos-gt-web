// src/components/Gallery/__tests__/Gallery.integration.test.tsx
import React from 'react'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderIntegration } from '@/test/testUtils.integration'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// -------------------- Supabase mock (encadenable con hoisting) --------------------
const h = vi.hoisted(() => {
  type QueryResult = { data: any; error: any }

  // capturas de la última query
  let lastFrom: string | null = null
  let lastSelect: string | null = null
  let lastOrder: { column: string; opts: any } | null = null

  // núcleo de la promesa que controla el resultado de .order()
  const orderCore = vi.fn<[], Promise<QueryResult>>()

  // order() que captura argumentos y delega en orderCore()
  const order = vi.fn((column: string, opts: any) => {
    lastOrder = { column, opts }
    return orderCore()
  })

  // select().order()
  const select = vi.fn((sel: string) => {
    lastSelect = sel
    return { order }
  })

  // from().select()
  const from = vi.fn((tbl: string) => {
    lastFrom = tbl
    return { select }
  })

  // helpers para tests
  const setOrderOnce = (result: QueryResult | Promise<QueryResult>) => {
    if (result instanceof Promise) {
      orderCore.mockReturnValueOnce(result as Promise<QueryResult>)
    } else {
      orderCore.mockResolvedValueOnce(result)
    }
  }

  const resetAll = () => {
    orderCore.mockReset()
    order.mockClear()
    select.mockClear()
    from.mockClear()
    lastFrom = null
    lastSelect = null
    lastOrder = null
  }

  return {
    // fns que usará el mock del módulo
    from,
    select,
    order,
    // helpers
    setOrderOnce,
    resetAll,
    getLastCall: () => ({ from: lastFrom, select: lastSelect, order: lastOrder }),
    // auth stubs
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }
})

// Inyectamos el mock de Supabase (REUSA *lo de h*; nada de variables nuevas aquí)
vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: h.from,
      auth: {
        onAuthStateChange: h.onAuthStateChange,
        getSession: h.getSession,
        signInWithPassword: h.signInWithPassword,
        signUp: h.signUp,
        signOut: h.signOut,
      },
    },
  }
})

// -------------------- Mocks de UI (shadcn/ui + lucide) --------------------
vi.mock('@/components/ui/card', () => {
  const Card = ({ children, ...props }: any) => (
    <div data-testid="card" {...props}>{children}</div>
  )
  const CardContent = ({ children, ...props }: any) => (
    <div data-testid="card-content" {...props}>{children}</div>
  )
  return { Card, CardContent }
})

vi.mock('@/components/ui/dialog', () => {
  const Dialog = ({ open, onOpenChange, children }: any) => (
    <div data-testid="dialog-root" data-open={!!open}>{open ? children : null}</div>
  )
  const DialogContent = ({ children, className }: any) => (
    <div role="dialog" aria-modal="true" className={className}>{children}</div>
  )
  const DialogHeader = ({ children }: any) => <div>{children}</div>
  const DialogTitle = ({ children, className }: any) => <h2 className={className}>{children}</h2>
  const DialogTrigger = ({ children }: any) => <div>{children}</div>
  return { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger }
})

vi.mock('@/components/ui/button', () => {
  const Button = ({ children, ...props }: any) => <button type="button" {...props}>{children}</button>
  return { Button }
})

vi.mock('@/components/ui/badge', () => {
  const Badge = ({ children, ...props }: any) => <span {...props}>{children}</span>
  return { Badge }
})

vi.mock('lucide-react', () => ({
  ImageIcon: (props: any) => <span aria-label="image-icon" {...props} />,
  X: (props: any) => <span aria-label="x-icon" {...props} />,
}))

// -------------------- Import del componente bajo prueba --------------------
import { Gallery } from '@/components/Gallery'

// -------------------- Helpers --------------------
const createDeferred = <T,>() => {
  let resolve!: (v: T) => void
  let reject!: (e: any) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe('<Gallery /> (integration)', () => {
  beforeEach(() => {
    h.resetAll()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    ;(console.error as any).mockRestore?.()
  })

  it('muestra skeletons mientras carga y luego estado vacío', async () => {
    // Deja la promesa pendiente para ver "loading"
    const deferred = createDeferred<{ data: any; error: any }>()
    h.setOrderOnce(deferred.promise)

    renderIntegration(<Gallery />)

    // 6 skeleton cards
    const skeletons = screen.getAllByTestId('card')
    expect(skeletons).toHaveLength(6)

    // Resuelve vacío y espera estado "en construcción"
    deferred.resolve({ data: [], error: null })
    expect(await screen.findByText(/galería en construcción/i)).toBeInTheDocument()
    expect(screen.getByLabelText('image-icon')).toBeInTheDocument()
  })

  it('renderiza estado vacío cuando no hay fotos', async () => {
    h.setOrderOnce({ data: [], error: null })

    renderIntegration(<Gallery />)

    expect(await screen.findByText(/galería en construcción/i)).toBeInTheDocument()
    expect(screen.getByText(/pronto compartiremos fotos/i)).toBeInTheDocument()
  })

  it('renderiza fotos y permite abrir/cerrar el modal', async () => {
    const photos = [
      {
        id: '1',
        title: 'Jornada 1',
        description: 'Desc 1',
        image_url: 'https://example.com/1.jpg',
        created_at: '2025-09-21T00:00:00Z',
      },
      {
        id: '2',
        title: 'Jornada 2',
        image_url: 'https://example.com/2.jpg',
        created_at: '2025-09-22T00:00:00Z',
      },
    ]
    h.setOrderOnce({ data: photos, error: null })

    renderIntegration(<Gallery />)

    const cards = await screen.findAllByTestId('card')
    expect(cards).toHaveLength(6)
    expect(screen.getByText('Jornada 1')).toBeInTheDocument()
    expect(screen.getByText('Jornada 2')).toBeInTheDocument()

    // Abre modal
    await userEvent.click(cards[0])

    const dialog = await screen.findByTestId('dialog-root')
    expect(within(dialog).getByText('Jornada 1')).toBeInTheDocument()
    expect(within(dialog).getByText('Desc 1')).toBeInTheDocument()

    // Cierra modal
    const closeBtn = within(dialog).getByRole('button')
    await userEvent.click(closeBtn)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('muestra descripción en el modal solo cuando existe', async () => {
    const user = userEvent.setup()

    const photos = [
      { id: '1', title: 'Con desc', description: 'Detalle', image_url: 'https://e/1.jpg', created_at: '2025-09-21T00:00:00Z' },
      { id: '2', title: 'Sin desc', image_url: 'https://e/2.jpg', created_at: '2025-09-22T00:00:00Z' },
    ]
    h.setOrderOnce({ data: photos, error: null })

    renderIntegration(<Gallery />)

    // 🚩 Espera a post-loading
    await screen.findByText('Con desc')
    await screen.findByText('Sin desc')

    const cards = screen.getAllByTestId('card')

    // Con descripción
    await user.click(cards[0])
    let dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Detalle')).toBeInTheDocument()

    // Cierra
    await user.click(within(dialog).getByRole('button'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Sin descripción
    await user.click(cards[1])
    dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByText('Detalle')).not.toBeInTheDocument()
  })

  it('maneja error de supabase: loguea error y muestra estado vacío', async () => {
    h.setOrderOnce({ data: null, error: new Error('boom') })

    renderIntegration(<Gallery />)

    expect(await screen.findByText(/galería en construcción/i)).toBeInTheDocument()
    expect(console.error).toHaveBeenCalledWith(
      'Error fetching gallery photos:',
      expect.any(Error)
    )
  })

  it('verifica la query: from("gallery").select("*").order("created_at", { ascending: false })', async () => {
    h.setOrderOnce({ data: [], error: null })

    renderIntegration(<Gallery />)
    await screen.findByText(/galería en construcción/i)

    const calls = h.getLastCall()
    expect(calls.from).toBe('gallery')
    expect(calls.select).toBe('*')
    expect(calls.order).toEqual({ column: 'created_at', opts: { ascending: false } })
  })
})