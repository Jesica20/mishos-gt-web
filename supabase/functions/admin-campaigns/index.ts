// Deno Edge Function: admin-campaigns
// Un SOLO endpoint POST: lee { action, payload } y responde.
// Requiere: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CORS_ORIGINS (opcional)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS_ORIGINS = (Deno.env.get("CORS_ORIGINS") ?? "*")
  .split(",")
  .map((s) => s.trim());

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function cors(res: Response, req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow =
    CORS_ORIGINS.includes("*") || CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0] ?? "*";
  const headers = new Headers(res.headers);
  headers.set("access-control-allow-origin", allow || "*");
  headers.set("access-control-allow-headers", "authorization, x-client-info, content-type, apikey");
  headers.set("access-control-allow-methods", "POST,OPTIONS");
  headers.set("access-control-expose-headers", "content-length, content-type");
  return new Response(res.body, { ...res, headers });
}

function ok(data: Json, code = 200) {
  return new Response(JSON.stringify(data), {
    status: code,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
function bad(msg: string, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function getUserFromAuthHeader(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}

async function isAdmin(userId: string) {
  // tu migración ya tiene public.profiles con role
  const { data, error } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return (data?.role ?? "").toLowerCase() === "admin";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }), req);
  }
  if (req.method !== "POST") {
    return cors(bad("Method not allowed", 405), req);
  }

  try {
    const { action, payload } = await req.json().catch(() => ({} as any));

    // LIST (público) -> campañas + conteo en una sola llamada
    if (action === "list") {
      const { data, error } = await admin
        .from("castration_campaigns")
        .select(`
          id, title, location, date, start_time, end_time, max_appointments,
          description, image_url, created_at,
          appointment_count:appointments!appointments_campaign_id_fkey(count)
        `)
        .order("date", { ascending: false });

      if (error) throw error;

      const campaigns = (data ?? []).map((row: any) => {
        const count = Array.isArray(row.appointment_count) && row.appointment_count.length
          ? Number(row.appointment_count[0].count)
          : 0;
        const { appointment_count, ...rest } = row;
        return { ...rest, appointment_count: count };
      });

      return cors(ok({ campaigns }), req);
    }

    // Las siguientes acciones requieren admin
    const user = await getUserFromAuthHeader(req);
    if (!user) return cors(bad("Unauthorized", 401), req);
    const adminRole = await isAdmin(user.id);
    if (!adminRole) return cors(bad("Forbidden", 403), req);

    if (action === "create") {
      const {
        title, location, date, start_time, end_time, max_appointments,
        description = null, image_url = null,
      } = payload ?? {};
      if (!title || !location || !date || !start_time || !end_time || !max_appointments) {
        return cors(bad("Missing required fields"), req);
      }

      const { data, error } = await admin
        .from("castration_campaigns")
        .insert([{
          title,
          location,
          date,
          start_time,
          end_time,
          max_appointments,
          description,
          image_url,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return cors(ok({ campaign: data }, 201), req);
    }

    if (action === "update") {
      const { id, ...fields } = payload ?? {};
      if (!id) return cors(bad("id is required"), req);

      const { data, error } = await admin
        .from("castration_campaigns")
        .update(fields)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return cors(ok({ campaign: data }), req);
    }

    if (action === "delete") {
      const { id } = payload ?? {};
      if (!id) return cors(bad("id is required"), req);

      // Bloquea eliminación si existen citas
      const { count, error: cErr } = await admin
        .from("appointments")
        .select("*", { head: true, count: "exact" })
        .eq("campaign_id", id);
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) return cors(bad("Campaign has appointments; cannot delete", 409), req);

      const { error } = await admin.from("castration_campaigns").delete().eq("id", id);
      if (error) throw error;
      return cors(ok({ ok: true }), req);
    }

    return cors(bad("Unknown action"), req);
  } catch (e) {
    console.error(e);
    return cors(bad("Internal error", 500), req);
  }
});