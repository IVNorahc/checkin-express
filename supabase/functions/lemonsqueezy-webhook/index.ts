import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": 
      "authorization, x-client-info, apikey, content-type, x-signature",
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.text()
    const payload = JSON.parse(body)
    
    console.log("LemonSqueezy webhook received:", 
      JSON.stringify(payload))

    const eventName = payload.meta?.event_name
    const userEmail = payload.data?.attributes
      ?.user_email
    const status = payload.data?.attributes?.status
    const subscriptionId = payload.data?.id

    console.log("Event:", eventName)
    console.log("Email:", userEmail)
    console.log("Status:", status)

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    if (eventName === "subscription_created" || 
        eventName === "order_created") {
      
      if (userEmail) {
        const { error } = await supabase
          .from("profiles")
          .update({ 
            status: "active",
            subscription_id: subscriptionId?.toString()
          })
          .eq("email", userEmail)

        if (error) {
          console.error("Update error:", error)
        } else {
          console.log("User activated:", userEmail)
        }
      }
    }

    if (eventName === "subscription_cancelled" ||
        eventName === "subscription_expired") {
      
      if (userEmail) {
        const { error } = await supabase
          .from("profiles")
          .update({ status: "expired" })
          .eq("email", userEmail)

        if (error) {
          console.error("Update error:", error)
        } else {
          console.log("User expired:", userEmail)
        }
      }
    }

    if (eventName === "subscription_paused") {
      if (userEmail) {
        await supabase
          .from("profiles")
          .update({ status: "suspended" })
          .eq("email", userEmail)
      }
    }

    if (eventName === "subscription_resumed") {
      if (userEmail) {
        await supabase
          .from("profiles")
          .update({ status: "active" })
          .eq("email", userEmail)
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      }
    )

  } catch (error) {
    console.error("Webhook error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      }
    )
  }
})
