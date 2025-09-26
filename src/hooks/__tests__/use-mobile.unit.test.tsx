import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '@/hooks/use-mobile'

const MOBILE_BREAKPOINT = 768

describe('useIsMobile', () => {
  let listeners: { change: ((e: any) => void)[] }

  beforeEach(() => {
    listeners = { change: [] }

    // mock window.matchMedia
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
      return {
        media: query,
        matches: window.innerWidth < MOBILE_BREAKPOINT,
        addEventListener: (event: string, cb: any) => {
          listeners[event as 'change'].push(cb)
        },
        removeEventListener: (event: string, cb: any) => {
          listeners[event as 'change'] = listeners[event as 'change'].filter(fn => fn !== cb)
        },
        dispatchEvent: vi.fn(),
      } as any
    })
  })

  it('returns true when window width is less than breakpoint', () => {
    window.innerWidth = 500
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false when window width is greater than or equal to breakpoint', () => {
    window.innerWidth = 1000
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('updates value when the window width changes', () => {
    window.innerWidth = 1000
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    // simulate resize below breakpoint
    act(() => {
      window.innerWidth = 600
      listeners.change.forEach(cb => cb({ matches: true }))
    })

    expect(result.current).toBe(true)
  })
})