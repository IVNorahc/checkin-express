import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature",
}

/**
 * Lit le nom du variant dans le payload LemonSqueezy et retourne
 * "starter", "business" ou "active" (fallback) selon le plan souscrit.
 *
 * LemonSqueezy expose le nom du variant dans :
 *   payload.data.attributes.variant_name          (subscriptions)
 *   payload.data.attributes.first_order_item.variant_name  (orders)
 */
function getPlanStatus(payload: Record<string, unknown>): string {
  const attrs = (payload.data as Record<string, unknown>)?.attributes as Record<string, unknown> | undefined
  const variantName = (
    (attrs?.variant_name as string | undefined) ??
    ((attrs?.first_order_item as Record<string, unknown> | undefined)?.variant_name as string | undefined) ??
    ""
  ).toLowerCase()

  console.log("[lemonsqueezy-webhook] variant_name:", variantName)

  if (variantName.includes("business")) return "business"
  if (variantName.includes("starter")) return "starter"
  return "active" // fallback si le nom de plan n'est pas reconnu
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const body = await req.text()

  // ── Vérification signature HMAC-SHA256 ───────────────────────────────────
  const webhookSecret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET")
  if (!webhookSecret) {
    console.error("[lemonsqueezy-webhook] LEMONSQUEEZY_WEBHOOK_SECRET not configured")
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  {
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
    const payload = JSON.parse(body) as Record<string, unknown>
    const eventName = (payload.meta as Record<string, unknown>)?.event_name as string | undefined
    const attrs = (payload.data as Record<string, unknown>)?.attributes as Record<string, unknown> | undefined
    const userEmail = attrs?.user_email as string | undefined

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

    const ocrLimit = (status: string): number => {
      if (status === "business") return 999999
      if (status === "expired" || status === "suspended") return 0
      return 500 // starter + active fallback
    }

    const updateHotel = async (status: string) => {
      const { error } = await supabase
        .from("hotels")
        .update({ subscription_status: status, ocr_scans_limit: ocrLimit(status) })
        .eq("user_id", user.id)
      if (error) throw error
      console.log(`[lemonsqueezy-webhook] hotels updated: status='${status}' ocr_scans_limit=${ocrLimit(status)} for user ${user.id}`)
    }

    if (eventName === "subscription_created" || eventName === "order_created") {
      // Lire le plan depuis le payload pour distinguer Starter / Business
      await updateHotel(getPlanStatus(payload))
    } else if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
      await updateHotel("expired")
    } else if (eventName === "subscription_paused") {
      await updateHotel("suspended")
    } else if (eventName === "subscription_resumed") {
      // Rétablissement : relire le plan depuis le payload
      await updateHotel(getPlanStatus(payload))
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
