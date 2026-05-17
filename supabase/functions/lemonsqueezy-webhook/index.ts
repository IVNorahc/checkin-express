import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const body = await req.text()

  // ── Vérification signature HMAC-SHA256 ───────────────────────────────────
  const webhookSecret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET")
  if (webhookSecret) {
    const signature = req.headers.get("X-Signature") ?? ""
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const hmac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
    const digest = Array.from(new Uint8Array(hmac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    if (digest !== signature) {
      console.error("[lemonsqueezy-webhook] Invalid signature")
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
  }

  try {
    const payload = JSON.parse(body)
    const eventName = payload.meta?.event_name
    const userEmail = payload.data?.attributes?.user_email

    console.log("[lemonsqueezy-webhook] Event:", eventName, "| Email:", userEmail)

    if (!userEmail) {
      return json({ error: "No user_email in payload" }, 400)
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    // Trouver l'utilisateur via auth.users (service role requis)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (usersError) throw usersError

    const user = users.find((u) => u.email?.toLowerCase() === userEmail.toLowerCase())
    if (!user) {
      console.error("[lemonsqueezy-webhook] No user found for email:", userEmail)
      // Retourner 200 pour éviter que LemonSqueezy ne retente indéfiniment
      return json({ warning: "User not found", email: userEmail })
    }

    const updateHotel = async (status: string) => {
      const { error } = await supabase
        .from("hotels")
        .update({ subscription_status: status })
        .eq("user_id", user.id)
      if (error) throw error
      console.log(`[lemonsqueezy-webhook] hotels.subscription_status = '${status}' for user ${user.id}`)
    }

    if (eventName === "subscription_created" || eventName === "order_created") {
      await updateHotel("active")
    } else if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
      await updateHotel("expired")
    } else if (eventName === "subscription_paused") {
      await updateHotel("suspended")
    } else if (eventName === "subscription_resumed") {
      await updateHotel("active")
    } else {
      console.log("[lemonsqueezy-webhook] Unhandled event:", eventName)
    }

    return json({ success: true, event: eventName })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[lemonsqueezy-webhook] Error:", msg)
    return json({ error: msg }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}
