/// <reference lib="deno.ns" />
// @ts-ignore usar SDK Deno
import { createClient } from "jsr:@supabase/supabase-js@2";

type ListReq   = { action: "list"; search?: string; page?: number; pageSize?: number };
type CreateReq = { action: "create"; description: string; date: string; image_url?: string | null };
type UpdateReq = { action: "update"; id: string; description?: string; date?: string; image_url?: string | null };
type DeleteReq = { action: "delete"; id: string };
type ReqBody = ListReq | CreateReq | UpdateReq | DeleteReq;

const ALLOWED = (Deno.env.get("CORS_ORIGINS") ?? "*")
  .split(",")
  .map((s) => s.trim());

const corsHeaders = (origin: string | null) => {
  const allow = origin && (ALLOWED.includes(origin) || ALLOWED.includes("*")) ? origin : (ALLOWED[0] || "*");
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  };
};

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  try {
    const body = (await req.json()) as ReqBody;

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth por JWT del cliente
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAnon.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });

    // Rol admin
    const { data: me } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!me || me.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers });
    }

    switch (body.action) {
      case "list": {
        const page = Math.max(1, body.page ?? 1);
        const pageSize = Math.min(100, Math.max(1, body.pageSize ?? 50));
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let q = supabaseAdmin
          .from("donations")
          .select("id,description,date,image_url,created_at", { count: "exact" })
          .order("date", { ascending: false });

        if (body.search && body.search.trim()) {
          const s = body.search.trim();
          q = q.ilike("description", `%${s}%`);
        }

        const { data, error, count } = await q.range(from, to);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });

        return new Response(JSON.stringify({
          data, page, pageSize, total: count ?? 0, totalPages: count ? Math.ceil(count / pageSize) : 1,
        }), { status: 200, headers });
      }

      case "create": {
        if (!body.description || !body.date) {
          return new Response(JSON.stringify({ error: "description and date required" }), { status: 400, headers });
        }
        const payload = {
          description: body.description,
          date: body.date,          // formato 'YYYY-MM-DD'
          image_url: body.image_url ?? null,
          created_by: user.id,
        };
        const { error } = await supabaseAdmin.from("donations").insert(payload);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });
        return new Response(JSON.stringify({ ok: true }), { status: 201, headers });
      }

      case "update": {
        if (!body.id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers });
        const patch: Record<string, unknown> = {};
        if (typeof body.description !== "undefined") patch.description = body.description;
        if (typeof body.date !== "undefined") patch.date = body.date;
        if (typeof body.image_url !== "undefined") patch.image_url = body.image_url;

        if (Object.keys(patch).length === 0) {
          return new Response(JSON.stringify({ error: "nothing to update" }), { status: 400, headers });
        }

        const { error } = await supabaseAdmin.from("donations").update(patch).eq("id", body.id);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
      }

      case "delete": {
        if (!body.id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers });
        const { error } = await supabaseAdmin.from("donations").delete().eq("id", body.id);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers });
  }
});