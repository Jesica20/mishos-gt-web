/// <reference lib="deno.ns" />
// Deno runtime
// @ts-ignore - editor de Node no entiende jsr: (en ejecución real funciona)
import { createClient } from 'jsr:@supabase/supabase-js@2'

type ListReq   = { action: 'list'; search?: string; page?: number; pageSize?: number }
type CreateReq = { action: 'create'; title: string; description?: string; image_url: string; category?: string; is_active?: boolean }
type UpdateReq = { action: 'update'; id: string; title?: string; description?: string; category?: string; is_active?: boolean }
type DeleteReq = { action: 'delete'; id: string }
type ToggleReq = { action: 'toggle'; id: string; is_active: boolean }

// Opcional: firmado de subida (si lo quieres usar más adelante)
// type SignUrlReq = { action: 'sign-upload-url'; path: string } // p.ej. "recommendations/<uuid>.jpg"

type ReqBody = ListReq | CreateReq | UpdateReq | DeleteReq | ToggleReq /* | SignUrlReq */

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

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // --- Auth del solicitante (JWT requerido excepto si despliegas con --no-verify-jwt para pruebas) ---
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requester } } = await supabaseAnon.auth.getUser(token)
    if (!requester) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
    }

    // --- Autorización: debe ser admin ---
    const { data: me, error: meErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', requester.id)
      .maybeSingle()

    if (meErr || !me || me.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })
    }

    switch (body.action) {
      case 'list': {
        const page = Math.max(1, body.page ?? 1)
        const pageSize = Math.min(100, Math.max(1, body.pageSize ?? 24))
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        let q = supabaseAdmin
          .from('appointment_recommendations')
          .select('id,title,description,image_url,category,is_active,created_at,created_by', { count: 'exact' })
          .order('created_at', { ascending: false })

        if (body.search && body.search.trim()) {
          const s = body.search.trim()
          q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%,category.ilike.%${s}%`)
        }

        const { data, error, count } = await q.range(from, to)
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers })

        return new Response(JSON.stringify({
          data, page, pageSize, total: count ?? 0, totalPages: count ? Math.ceil(count / pageSize) : 1
        }), { status: 200, headers })
      }

      case 'create': {
        const { title, image_url } = body
        if (!title || !image_url) {
          return new Response(JSON.stringify({ error: 'title and image_url are required' }), { status: 400, headers })
        }
        const payload = {
          title,
          description: body.description ?? null,
          image_url,
          category: body.category ?? 'general',
          is_active: typeof body.is_active === 'boolean' ? body.is_active : true,
          created_by: requester.id,
        }
        const { error } = await supabaseAdmin
          .from('appointment_recommendations')
          .insert(payload)

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers })
        return new Response(JSON.stringify({ ok: true }), { status: 201, headers })
      }

      case 'update': {
        const { id } = body
        if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })

        const patch: Record<string, unknown> = {}
        if (typeof body.title !== 'undefined') patch.title = body.title
        if (typeof body.description !== 'undefined') patch.description = body.description
        if (typeof body.category !== 'undefined') patch.category = body.category
        if (typeof body.is_active !== 'undefined') patch.is_active = body.is_active

        if (Object.keys(patch).length === 0) {
          return new Response(JSON.stringify({ error: 'nothing to update' }), { status: 400, headers })
        }

        const { error } = await supabaseAdmin
          .from('appointment_recommendations')
          .update(patch)
          .eq('id', id)

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers })
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
      }

      case 'delete': {
        const { id } = body
        if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })

        const { error } = await supabaseAdmin
          .from('appointment_recommendations')
          .delete()
          .eq('id', id)

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers })
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
      }

      case 'toggle': {
        const { id, is_active } = body
        if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers })

        const { error } = await supabaseAdmin
          .from('appointment_recommendations')
          .update({ is_active: !is_active })
          .eq('id', id)

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers })
        return new Response(JSON.stringify({ ok: true, is_active: !is_active }), { status: 200, headers })
      }

      /* OPCIONAL: firmado de subida (si quieres mover la subida dentro de un flujo más seguro)
      case 'sign-upload-url': {
        const { path } = body
        if (!path) return new Response(JSON.stringify({ error: 'path required' }), { status: 400, headers })
        const bucket = 'images'
        const { data, error } = await supabaseAdmin
          .storage.from(bucket)
          .createSignedUploadUrl(path)
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers })
        return new Response(JSON.stringify({ url: data.signedUrl, token: data.token }), { status: 200, headers })
      }
      */

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers })
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers })
  }
})