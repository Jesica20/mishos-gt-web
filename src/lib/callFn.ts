import { supabase } from '@/integrations/supabase/client'

const FUNCTIONS_BASE =
  import.meta.env.VITE_FUNCTIONS_BASE ??
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

export async function callFn<T = any>(name: string, payload: unknown): Promise<T> {
  const token = (await supabase.auth.getSession()).data.session?.access_token
  const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)
  return json
}
