import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import type { Session, User } from '@supabase/supabase-js'
import React from 'react'

// --- Mock supabase auth methods ---
vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      auth: {
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ error: null }),
        signOut: vi.fn().mockResolvedValue({}),
      },
    },
  }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws if used outside provider', () => {
    const { result } = renderHook(() => {
      try {
        // intentionally calling without provider
        return useAuth()
      } catch (e) {
        return e
      }
    })
    expect((result.current as Error).message).toMatch(/must be used within an AuthProvider/i)
  })

  it('initializes with loading=true, then resolves session', async () => {
    ;(supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: { user: { id: '123', email: 'a@test.com' } } as Session },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    // after effect runs, we expect user/session to be set
    expect(result.current.loading).toBe(true)
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.user?.id).toBe('123')
    expect(result.current.loading).toBe(false)
  })

  it('signIn calls supabase.auth.signInWithPassword', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.signIn('test@test.com', 'secret')
    })
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'secret',
    })
  })

  it('signUp calls supabase.auth.signUp with redirect and data', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.signUp('new@test.com', 'secret', 'Kevin')
    })
    expect(supabase.auth.signUp).toHaveBeenCalled()
    const args = (supabase.auth.signUp as any).mock.calls[0][0]
    expect(args.email).toBe('new@test.com')
    expect(args.options.data.full_name).toBe('Kevin')
  })

  it('signOut calls supabase.auth.signOut', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.signOut()
    })
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})