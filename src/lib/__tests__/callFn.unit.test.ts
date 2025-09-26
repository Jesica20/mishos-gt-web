// tests/callFn.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock del cliente de Supabase
vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn()
      }
    }
  }
})

async function importCallFnWithEnv(env: Partial<ImportMetaEnv>) {
  const ORIGINAL = { ...import.meta.env }

  // aplica env deseado
  Object.entries(env).forEach(([k, v]) => {
    if (v === undefined || v === null) {
      // clave “no definida” → bórrala, no la conviertas a "undefined"
      // @ts-ignore
      delete import.meta.env[k]
    } else {
      // @ts-ignore
      import.meta.env[k] = v as any
    }
  })

  vi.resetModules()
  const mod = await import('@/lib/callFn') // <-- tu ruta real
  Object.assign(import.meta.env, ORIGINAL)
  return mod
}

// Utilidad para crear una respuesta simulada de fetch
function mockFetchResponse(ok: boolean, status: number, body: any) {
  return {
    ok,
    status,
    json: vi.fn(async () => body)
  } as unknown as Response
}

describe('callFn()', async () => {
  const { supabase } = await import('@/integrations/supabase/client') as any

  const ORIGINAL_ENV = { ...import.meta.env }
  const ORIGINAL_FETCH = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
    // mock global fetch
    globalThis.fetch = vi.fn() as any
  })

  afterEach(() => {
    Object.assign(import.meta.env, ORIGINAL_ENV)
    globalThis.fetch = ORIGINAL_FETCH as any
  })

  it('hace POST con Authorization cuando hay token y devuelve el JSON', async () => {
    // Arrange env: usa VITE_FUNCTIONS_BASE
    const env = {
      VITE_SUPABASE_URL: 'https://unused.example.com'
    }

    // Mock supabase token
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } }
    })

    // Mock fetch ok
    ;(globalThis.fetch as any).mockResolvedValue(
      mockFetchResponse(true, 200, { hello: 'world' })
    )

    const { callFn } = await importCallFnWithEnv(env)

    // Act
    const payload = { a: 1 }
    const result = await callFn('greet', payload)

    // Assert
    expect(result).toEqual({ hello: 'world' })
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toBe('https://functions.example.com/v1/greet')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.headers.Authorization).toBe('Bearer token-123')
    expect(init.body).toBe(JSON.stringify(payload))
  })

  it('no agrega Authorization cuando no hay sesión/token', async () => {
    const env = {
      VITE_SUPABASE_URL: 'https://unused.example.com'
    }

    supabase.auth.getSession.mockResolvedValue({
      data: { session: null }
    })

    ;(globalThis.fetch as any).mockResolvedValue(
      mockFetchResponse(true, 200, { ok: true })
    )

    const { callFn } = await importCallFnWithEnv(env)

    await callFn('no-auth', { b: 2 })

    const [, init] = (globalThis.fetch as any).mock.calls[0]
    expect(init.headers['Content-Type']).toBe('application/json')
    expect('Authorization' in init.headers).toBe(false)
  })

  it('lanza Error con el mensaje de json.error cuando la respuesta no es ok', async () => {
    const env = {
      VITE_SUPABASE_URL: 'https://unused.example.com'
    }

    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 't' } }
    })

    ;(globalThis.fetch as any).mockResolvedValue(
      mockFetchResponse(false, 400, { error: 'Bad request' })
    )

    const { callFn } = await importCallFnWithEnv(env)

    await expect(callFn('fail', {})).rejects.toThrow('Bad request')
  })

  it('lanza Error con `HTTP <status>` cuando no hay json.error en error response', async () => {
    const env = {
      VITE_SUPABASE_URL: 'https://unused.example.com'
    }

    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 't' } }
    })

    ;(globalThis.fetch as any).mockResolvedValue(
      mockFetchResponse(false, 503, {})
    )

    const { callFn } = await importCallFnWithEnv(env)

    await expect(callFn('unavailable', {})).rejects.toThrow('HTTP 503')
  })

  it('usa VITE_FUNCTIONS_BASE cuando está definida', async () => {
    const env = {
      VITE_SUPABASE_URL: 'https://supabase.example.com'
    }

    supabase.auth.getSession.mockResolvedValue({
      data: { session: null }
    })

    ;(globalThis.fetch as any).mockResolvedValue(
      mockFetchResponse(true, 200, { ok: true })
    )

    const { callFn } = await importCallFnWithEnv(env)
    await callFn('ping', {})

    const [url] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toBe('https://explicit-base.example.com/fn/ping')
  })

  it('si NO hay VITE_FUNCTIONS_BASE, usa `${VITE_SUPABASE_URL}/functions/v1`', async () => {
    const env = {
      VITE_SUPABASE_URL: 'https://supabase.example.com'
    }

    supabase.auth.getSession.mockResolvedValue({
      data: { session: null }
    })

    ;(globalThis.fetch as any).mockResolvedValue(
      mockFetchResponse(true, 200, { ok: true })
    )

    const { callFn } = await importCallFnWithEnv(env)
    await callFn('pong', {})

    const [url] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toBe('https://supabase.example.com/functions/v1/pong')
  })
})