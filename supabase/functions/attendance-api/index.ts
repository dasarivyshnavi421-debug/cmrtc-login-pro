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

  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
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

    if (action === "mark") {
      const { faculty_id, date, status, method, in_time, out_time } = body;

      // Faculty can only mark their own attendance (admin can mark anyone's)
      if (session.role !== "admin" && session.faculty_id !== faculty_id) {
        return new Response(JSON.stringify({ error: "Cannot mark attendance for another faculty" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!faculty_id || !date || !status) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

      // Check existing
      const { data: existing } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("faculty_id", faculty_id)
        .eq("date", date)
        .maybeSingle();

      const record = {
        faculty_id,
        date,
        status,
        method: method || "manual",
        timestamp: now,
        in_time: in_time || existing?.in_time || (status === "present" ? now : null),
        out_time: out_time || existing?.out_time || null,
      };

      if (existing) {
        const { error } = await supabase
          .from("attendance_records")
          .update(record)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("attendance_records")
          .insert(record);
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "mark_out") {
      const { faculty_id, date } = body;

      if (session.role !== "admin" && session.faculty_id !== faculty_id) {
        return new Response(JSON.stringify({ error: "Cannot mark attendance for another faculty" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
      const { error } = await supabase
        .from("attendance_records")
        .update({ out_time: now })
        .eq("faculty_id", faculty_id)
        .eq("date", date);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_face_descriptor") {
      const { faculty_id, face_descriptor } = body;

      if (session.faculty_id !== faculty_id && session.role !== "admin") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("faculty")
        .update({ face_descriptor })
        .eq("id", faculty_id);
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
    console.error("Attendance API error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
