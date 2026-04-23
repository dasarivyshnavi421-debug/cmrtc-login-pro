import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyToken(token: string): Promise<{ faculty_id: number; role: string } | null> {
  try {
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(payloadB64));
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return { faculty_id: payload.faculty_id, role: payload.role };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
  const session = authHeader ? await verifyToken(authHeader) : null;

  if (!session || session.role !== "admin") {
    return new Response(JSON.stringify({ error: "Unauthorized - admin access required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "add") {
      const { name, department, email, password, photo_url } = body;
      if (!name || !department || !email || !password) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: faculty, error } = await supabase
        .from("faculty")
        .insert({ name, department, email, photo_url: photo_url || null })
        .select("id, name, department, email, photo_url")
        .single();

      if (error) throw error;

      // Hash and store password
      await supabase.rpc("set_faculty_password", {
        p_faculty_id: faculty.id,
        p_password: password,
      });

      // Assign faculty role
      await supabase.from("user_roles").insert({ faculty_id: faculty.id, role: "faculty" });

      return new Response(JSON.stringify({ faculty }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("faculty").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { id, name, department, email } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const update: Record<string, string> = {};
      if (name) update.name = name;
      if (department) update.department = department;
      if (email) update.email = email;

      const { error } = await supabase.from("faculty").update(update).eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_photo") {
      const { id, photo_url, face_descriptor } = body;
      if (!id || !photo_url) {
        return new Response(JSON.stringify({ error: "ID and photo_url required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const update: Record<string, unknown> = {
        photo_url,
        profile_updated_at: new Date().toISOString(),
      };
      if (face_descriptor) update.face_descriptor = face_descriptor;
      const { error } = await supabase.from("faculty").update(update).eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Faculty API error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
