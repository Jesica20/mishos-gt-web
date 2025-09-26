// Deno runtime
import { createClient } from 'jsr:@supabase/supabase-js@2'

type ListReq = { action: 'list'; search?: string; page?: number; pageSize?: number }
type CreateReq = { action: 'create'; email: string; password: string; fullName?: string; role?: string }
type UpdateReq = { action: 'update'; userId: string; fullName?: string; role?: string }
type DeleteReq = { action: 'delete'; userId: string }
type ReqBody = ListReq | CreateReq | UpdateReq | DeleteReq

// ---------- CORS ----------
const ALLOWED = (Deno.env.get('CORS_ORIGINS') ?? '*')
  .split(',')
  .map(s => s.trim())
const corsHeaders = (origin: string | null) => {
  const allow = origin && ALLOWED.includes(origin) ? origin : ALLOWED[0] ?? '*'
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  }
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  try {
    const body = (await req.json()) as ReqBody

    // Clients
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // --- Auth del solicitante (JWT requerido) ---
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requester }, error: userErr } = await supabaseAnon.auth.getUser(token)
    if (userErr || !requester) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
    }

    // --- Autorización: debe ser admin ---
    // Checamos en profiles por user_id del solicitante
    const { data: me, error: meErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', requester.id)
      .maybeSingle()
    if (meErr || !me || me.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
    }

    // ---------- Actions ----------
    switch (body.action) {
      case 'list': {
        const page = Math.max(1, body.page ?? 1)
        const pageSize = Math.min(100, Math.max(1, body.pageSize ?? 20))
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        let query = supabaseAdmin
          .from('profiles')
          .select('id,user_id,email,full_name,role,created_at,updated_at', { count: 'exact' })
          .order('created_at', { ascending: false })

        if (body.search && body.search.trim()) {
          const s = body.search.trim()
          // busca por email o nombre
          query = query.or(`email.ilike.%${s}%,full_name.ilike.%${s}%`)
        }

        const { data, error, count } = await query.range(from, to)
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers })

        return new Response(JSON.stringify({
          data,
          page,
          pageSize,
          total: count ?? 0,
          totalPages: count ? Math.ceil(count / pageSize) : 1
        }), { status: 200, headers })
      }

      case 'create': {
        const { email, password, fullName, role } = body
        if (!email || !password) {
          return new Response(JSON.stringify({ error: 'email and password are required' }), { status: 400, headers })
        }

        // Crea el usuario en Auth (no confirmado por defecto; ajusta según tu policy)
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // o false si quieres que confirme por correo
          user_metadata: { full_name: fullName ?? null }
        })
        if (createErr || !created.user) {
          return new Response(JSON.stringify({ error: createErr?.message ?? 'create failed' }), { status: 400, headers })
        }

        // Upsert en profiles (por si tienes trigger que ya lo cree, esto lo sincroniza)
        const { error: upErr } = await supabaseAdmin.from('profiles').upsert({
          id: created.user.id,       // si usas id = auth.uid()
          user_id: created.user.id,  // si tienes ambas columnas
          email,
          full_name: fullName ?? null,
          role: role ?? 'user'
        }, { onConflict: 'user_id' })
        if (upErr) {
          // intenta limpiar auth si falló profiles
          await supabaseAdmin.auth.admin.deleteUser(created.user.id)
          return new Response(JSON.stringify({ error: upErr.message }), { status: 400, headers })
        }

        return new Response(JSON.stringify({ ok: true, user_id: created.user.id }), { status: 201, headers })
      }

      case 'update': {
        const { userId, fullName, role } = body
        if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers })

        const patch: Record<string, unknown> = {}
        if (typeof fullName !== 'undefined') patch.full_name = fullName
        if (typeof role !== 'undefined') patch.role = role

        if (Object.keys(patch).length === 0) {
          return new Response(JSON.stringify({ error: 'nothing to update' }), { status: 400, headers })
        }

        const { error } = await supabaseAdmin
          .from('profiles')
          .update(patch)
          .eq('user_id', userId)   // o .eq('id', userId) según tu esquema
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers })

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
      }

      case 'delete': {
        const { userId } = body
        if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers })

        // borra perfil primero
        await supabaseAdmin.from('profiles').delete().eq('user_id', userId)

        // borra auth.user
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers })

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers })
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers })
  }
})