import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return new Response(JSON.stringify({ error: "Email and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find faculty by email
    const { data: faculty, error: facultyError } = await supabase
      .from("faculty")
      .select("id, name, email, department")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (facultyError || !faculty) {
      return new Response(JSON.stringify({ error: "Invalid email or password" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify password server-side using pgcrypto crypt()
    const { data: credCheck, error: credError } = await supabase.rpc("verify_password", {
      p_faculty_id: faculty.id,
      p_password: password,
    });

    if (credError || !credCheck) {
      return new Response(JSON.stringify({ error: "Invalid email or password" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("faculty_id", faculty.id)
      .maybeSingle();

    const role = roleData?.role || "faculty";

    // Create a simple signed token (HMAC-SHA256)
    const payload = {
      faculty_id: faculty.id,
      email: faculty.email,
      role,
      exp: Math.floor(Date.now() / 1000) + 86400, // 24h
    };

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const payloadB64 = btoa(JSON.stringify(payload));
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    const token = `${payloadB64}.${sigB64}`;

    return new Response(
      JSON.stringify({
        user: {
          id: `${role === "admin" ? "admin" : "faculty"}-${faculty.id}`,
          email: faculty.email,
          name: faculty.name,
          role,
        },
        token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Login error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
