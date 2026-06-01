import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const APP_URL = "https://checkinexpress.app"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  console.log(`[invite-employee] ${req.method} ${new URL(req.url).pathname}`)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return json({ error: "Non autorisé" }, 401, CORS_HEADERS)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!

    // Client with the caller's token — used to verify ownership via RLS
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await callerClient.auth.getUser()
    if (userError || !user) return json({ error: "Non autorisé" }, 401, CORS_HEADERS)

    const body = await req.json()
    const { hotel_id, email, nom } = body as { hotel_id?: string; email?: string; nom?: string }

    if (!hotel_id || !email || !nom) {
      return json({ error: "hotel_id, email et nom sont requis" }, 400, CORS_HEADERS)
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Verify the caller owns this hotel (RLS enforces it on the callerClient)
    const { data: hotel, error: hotelError } = await callerClient
      .from("hotels")
      .select("id, hotel_name")
      .eq("id", hotel_id)
      .single()

    if (hotelError || !hotel) {
      return json({ error: "Hôtel introuvable ou accès non autorisé" }, 403, CORS_HEADERS)
    }

    // Service-role client for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Check for existing employee with same email in this hotel
    const { data: existing } = await adminClient
      .from("hotel_employees")
      .select("id, status")
      .eq("hotel_id", hotel_id)
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (existing) {
      if (existing.status === "inactive") {
        // Re-activate
        await adminClient
          .from("hotel_employees")
          .update({ status: "pending", nom: nom.trim(), invited_by: user.id })
          .eq("id", existing.id)
      } else {
        return json({ error: "Un employé avec cet email existe déjà pour cet hôtel" }, 409, CORS_HEADERS)
      }
    } else {
      // Insert new employee record
      const { error: insertError } = await adminClient
        .from("hotel_employees")
        .insert({
          hotel_id,
          email: normalizedEmail,
          nom: nom.trim(),
          role: "receptionniste",
          status: "pending",
          invited_by: user.id,
        })

      if (insertError) throw insertError
    }

    // Send invitation via Supabase auth admin
    // This creates the auth user (or re-sends invite if already exists) and emails them a link
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: `${APP_URL}/dashboard`,
        data: {
          hotel_id,
          hotel_name: hotel.hotel_name,
          invited_as: "receptionniste",
        },
      }
    )

    // "already been registered" means the user exists; they can still log in and be linked
    if (inviteError && !inviteError.message.toLowerCase().includes("already been registered")) {
      // Roll back the insert if invite failed for another reason
      await adminClient
        .from("hotel_employees")
        .delete()
        .eq("hotel_id", hotel_id)
        .eq("email", normalizedEmail)
      throw inviteError
    }

    console.log(`[invite-employee] ✓ invited ${normalizedEmail} to hotel ${hotel.hotel_name}`)
    return json(
      { success: true, message: `Invitation envoyée à ${normalizedEmail}` },
      200,
      CORS_HEADERS
    )

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[invite-employee] Error:", msg)
    return json({ error: msg }, 500, CORS_HEADERS)
  }
})

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  })
}
