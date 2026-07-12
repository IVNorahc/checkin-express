import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUBSCRIBE_URL = "https://checkinexpress.app/subscribe"

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    // Jour courant à minuit UTC — comparaison de dates sans heure
    const todayUTC = new Date()
    todayUTC.setUTCHours(0, 0, 0, 0)

    // Tous les hôtels encore en trial
    const { data: hotels, error: hotelsError } = await supabase
      .from("hotels")
      .select("id, user_id, hotel_name, trial_end")
      .eq("subscription_status", "trial")

    if (hotelsError) throw hotelsError
    if (!hotels || hotels.length === 0) {
      return json({ message: "No trial hotels found" })
    }

    // Récupérer tous les emails en une seule requête (service role requis)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (usersError) throw usersError
    const emailMap = new Map(users.map((u) => [u.id, u.email ?? ""]))

    let notifsSent = 0
    const errors: string[] = []

    for (const hotel of hotels) {
      const email = emailMap.get(hotel.user_id)
      if (!email) {
        errors.push(`No email for user_id ${hotel.user_id}`)
        continue
      }

      if (!hotel.trial_end) {
        errors.push(`No trial_end for hotel ${hotel.id}`)
        continue
      }

      // Comparaison jour par jour (UTC) pour éviter les décalages d'heure
      const trialEndDay = new Date(hotel.trial_end)
      trialEndDay.setUTCHours(0, 0, 0, 0)
      const daysLeft = Math.round(
        (trialEndDay.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24)
      )

      console.log(`[send-notifications] Hotel ${hotel.hotel_name} — daysLeft: ${daysLeft}`)

      try {
        if (daysLeft === 3) {
          await sendEmail(email, hotel.hotel_name, "j3")
          notifsSent++
        } else if (daysLeft === 1) {
          await sendEmail(email, hotel.hotel_name, "j1")
          notifsSent++
        } else if (daysLeft <= 0) {
          await sendEmail(email, hotel.hotel_name, "j0")
          await supabase
            .from("hotels")
            .update({ subscription_status: "expired" })
            .eq("id", hotel.id)
          notifsSent++
        }
      } catch (emailError) {
        const msg = emailError instanceof Error ? emailError.message : String(emailError)
        errors.push(`${email}: ${msg}`)
        console.error(`[send-notifications] Failed for ${email}:`, msg)
      }
    }

    return json({ success: true, notifications_sent: notifsSent, errors })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[send-notifications] Fatal error:", msg)
    return json({ error: msg }, 500)
  }
})

// ─── Email sender ─────────────────────────────────────────────────────────────

type EmailType = "j3" | "j1" | "j0"

async function sendEmail(email: string, hotelName: string, type: EmailType) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  if (!resendApiKey) throw new Error("RESEND_API_KEY not configured")

  const config: Record<EmailType, {
    subject: string
    headerBg: string
    bodyBg: string
    accentColor: string
    message: string
    btnText: string
  }> = {
    j3: {
      subject: "⏳ Votre essai Check-in Express se termine dans 3 jours",
      headerBg: "#1e3a8a",
      bodyBg: "#f0f9ff",
      accentColor: "#1e3a8a",
      message: `Il vous reste <strong>3 jours</strong> d'essai gratuit.<br><br>
        Pour continuer à utiliser Check-in Express et conserver toutes vos fiches
        de police, souscrivez maintenant à un abonnement.`,
      btnText: "Voir les offres",
    },
    j1: {
      subject: "⚠️ Dernier jour d'essai — Check-in Express",
      headerBg: "#92400e",
      bodyBg: "#fef3c7",
      accentColor: "#92400e",
      message: `C'est votre <strong>dernier jour d'essai</strong> sur Check-in Express.<br><br>
        Demain, votre accès sera suspendu. Souscrivez maintenant pour ne pas
        interrompre vos check-ins.`,
      btnText: "Souscrire maintenant",
    },
    j0: {
      subject: "🔒 Votre essai Check-in Express est terminé",
      headerBg: "#991b1b",
      bodyBg: "#fee2e2",
      accentColor: "#991b1b",
      message: `Votre période d'essai gratuit est terminée.<br><br>
        Pour continuer à utiliser Check-in Express et accéder à vos fiches
        de police, souscrivez à un abonnement.`,
      btnText: "Réactiver mon accès",
    },
  }

  const { subject, headerBg, bodyBg, accentColor, message, btnText } = config[type]

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background: ${headerBg}; padding: 28px 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">🏨 Check-in Express</h1>
        <p style="color: #93c5fd; margin: 6px 0 0; font-size: 14px;">by Percepta</p>
      </div>
      <div style="padding: 32px 30px; background: ${bodyBg};">
        <h2 style="color: ${accentColor}; margin: 0 0 16px;">Bonjour ${hotelName} 👋</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
          ${message}
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${SUBSCRIBE_URL}"
            style="background: ${accentColor}; color: white; padding: 14px 32px;
            border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;
            display: inline-block;">
            ${btnText}
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 13px; margin: 0; text-align: center;">
          Des questions ? <a href="mailto:perceptasn@gmail.com"
            style="color: ${accentColor}; text-decoration: none;">perceptasn@gmail.com</a>
        </p>
      </div>
    </div>
  `

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "Check-in Express <noreply@checkinexpress.app>",
      reply_to: "perceptasn@gmail.com",
      to: [email],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend HTTP ${res.status}: ${body}`)
  }

  console.log(`[send-notifications] ✓ ${type} sent to ${email}`)
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
