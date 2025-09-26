import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// We'll re-import the module fresh for each test to reset its module-level state
let reducer: any
let useToast: any
let toast: any

beforeEach(async () => {
  vi.useFakeTimers()
  vi.resetModules()
  const mod = await import('@/hooks/use-toast')
  reducer = mod.reducer
  useToast = mod.useToast
  toast = mod.toast
})

afterEach(() => {
  vi.useRealTimers()
})

describe('reducer (unit)', () => {
  it('ADD_TOAST: adds a toast and enforces TOAST_LIMIT (newest first)', () => {
    const initial = { toasts: [{ id: 'a', title: 'old', open: true }] }
    const result = reducer(initial, {
      type: 'ADD_TOAST',
      toast: { id: 'b', title: 'new', open: true },
    })

    // TOAST_LIMIT = 1, so only newest remains and first item is 'b'
    expect(result.toasts).toHaveLength(1)
    expect(result.toasts[0].id).toBe('b')
    expect(result.toasts[0].title).toBe('new')
  })

  it('UPDATE_TOAST: merges by id', () => {
    const initial = {
      toasts: [
        { id: 'a', title: 'A', open: true },
        { id: 'b', title: 'B', open: true },
      ],
    }
    const result = reducer(initial, {
      type: 'UPDATE_TOAST',
      toast: { id: 'a', title: 'A!' },
    })
    expect(result.toasts.find(t => t.id === 'a')?.title).toBe('A!')
    expect(result.toasts.find(t => t.id === 'b')?.title).toBe('B')
  })

  it('DISMISS_TOAST: sets open=false for that toast (or all when toastId is undefined)', () => {
    const initial = {
      toasts: [
        { id: 'a', title: 'A', open: true },
        { id: 'b', title: 'B', open: true },
      ],
    }
    // Dismiss only 'a'
    const resultA = reducer(initial, { type: 'DISMISS_TOAST', toastId: 'a' })
    expect(resultA.toasts.find(t => t.id === 'a')?.open).toBe(false)
    expect(resultA.toasts.find(t => t.id === 'b')?.open).toBe(true)

    // Dismiss all
    const resultAll = reducer(initial, { type: 'DISMISS_TOAST' })
    expect(resultAll.toasts.every(t => t.open === false)).toBe(true)
  })

  it('REMOVE_TOAST: removes by id or clears when toastId is undefined', () => {
    const initial = {
      toasts: [
        { id: 'a', title: 'A', open: true },
        { id: 'b', title: 'B', open: true },
      ],
    }
    const resultOne = reducer(initial, { type: 'REMOVE_TOAST', toastId: 'a' })
    expect(resultOne.toasts.map(t => t.id)).toEqual(['b'])

    const resultAll = reducer(initial, { type: 'REMOVE_TOAST' })
    expect(resultAll.toasts).toHaveLength(0)
  })
})

describe('toast() + useToast() (unit)', () => {
  it('creates a toast (open=true) and exposes dismiss/update fns', () => {
    const { result } = renderHook(() => useToast())

    let created: { id: string; dismiss: () => void; update: (p: any) => void }
    act(() => {
      created = toast({ title: 'Hello', description: 'World' })
    })

    // Hook state should reflect the memory state
    const firstState = result.current.toasts
    expect(firstState).toHaveLength(1)
    expect(firstState[0].open).toBe(true)
    expect(firstState[0].title).toBe('Hello')
    expect(firstState[0].description).toBe('World')
    expect(created!.id).toBeTruthy()
    expect(typeof created!.dismiss).toBe('function')
    expect(typeof created!.update).toBe('function')
  })

  it('enforces TOAST_LIMIT=1 (newest toast replaces previous)', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      toast({ title: 'First' })
    })
    act(() => {
      toast({ title: 'Second' })
    })

    const state = result.current.toasts
    expect(state).toHaveLength(1)
    expect(state[0].title).toBe('Second')
  })

  it('dismiss() marks toast open=false immediately and removes it after the timeout', () => {
    const { result } = renderHook(() => useToast())

    let created!: { id: string; dismiss: () => void }
    act(() => {
      created = toast({ title: 'Dismiss me' })
    })
    // Immediately after creation
    expect(result.current.toasts[0].open).toBe(true)

    // Dismiss schedules removal and sets open=false
    act(() => {
      created.dismiss()
    })
    expect(result.current.toasts[0].open).toBe(false)

    // Run timers to trigger the queued REMOVE_TOAST
    act(() => {
      vi.runOnlyPendingTimers()
    })

    expect(result.current.toasts).toHaveLength(0)
  })

  it('useToast().dismiss(toastId) supports dismissing by id as well as all', () => {
    const { result } = renderHook(() => useToast())

    let a!: { id: string }
    let b!: { id: string }

    act(() => {
      a = toast({ title: 'A' })
    })
    act(() => {
      b = toast({ title: 'B' })
    })

    // Only the newest kept due to limit = 1; ensure we can still call dismiss on the current one
    expect(result.current.toasts).toHaveLength(1)
    const currentId = result.current.toasts[0].id

    act(() => {
      result.current.dismiss(currentId)
    })
    expect(result.current.toasts[0].open).toBe(false)

    act(() => {
      vi.runOnlyPendingTimers()
    })
    expect(result.current.toasts).toHaveLength(0)

    // Dismiss all (no id) should not throw even if there are none
    act(() => {
      result.current.dismiss()
    })
    expect(result.current.toasts).toHaveLength(0)
  })
})