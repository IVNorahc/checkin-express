import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const twoDaysFromNow = new Date(today)
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)
    twoDaysFromNow.setHours(23, 59, 59, 999)

    const oneDayFromNow = new Date(today)
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1)
    oneDayFromNow.setHours(23, 59, 59, 999)

    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    // Récupérer tous les profils en essai
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'trial')

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No trial users" }),
        { status: 200 }
      )
    }

    let notifsSent = 0

    for (const profile of profiles) {
      const trialEnd = new Date(profile.trial_end)
      const daysLeft = Math.ceil(
        (trialEnd.getTime() - now.getTime()) 
        / (1000 * 60 * 60 * 24)
      )

      // J-2 : 2 jours restants
      if (daysLeft === 2) {
        await sendEmail(
          profile.email,
          profile.hotel_name,
          "j2"
        )
        notifsSent++
      }

      // J-1 : 1 jour restant
      if (daysLeft === 1) {
        await sendEmail(
          profile.email,
          profile.hotel_name,
          "j1"
        )
        notifsSent++
      }

      // J+0 : essai expiré
      if (daysLeft <= 0) {
        await sendEmail(
          profile.email,
          profile.hotel_name,
          "j0"
        )
        // Mettre à jour le statut
        await supabase
          .from('profiles')
          .update({ status: 'expired' })
          .eq('id', profile.id)
        notifsSent++
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_sent: notifsSent 
      }),
      { status: 200 }
    )

  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})

async function sendEmail(
  email: string, 
  hotelName: string,
  type: "j2" | "j1" | "j0"
) {
  const subjects = {
    j2: "Votre essai Check-in Express se termine dans 2 jours",
    j1: "Dernier jour d'essai — Check-in Express",
    j0: "Votre essai Check-in Express est terminé"
  }

  const bodies = {
    j2: `
      <div style="font-family: Arial, sans-serif; 
        max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a8a; 
          padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">
            🏨 Check-in Express
          </h1>
          <p style="color: #93c5fd; margin: 8px 0 0;">
            by Percepta
          </p>
        </div>
        <div style="padding: 30px; 
          background: #f8fafc;">
          <h2 style="color: #1e3a8a;">
            Bonjour ${hotelName} 👋
          </h2>
          <p style="color: #475569; font-size: 16px;">
            Votre période d'essai gratuit se termine 
            dans <strong>2 jours</strong>.
          </p>
          <p style="color: #475569;">
            Pour continuer à utiliser Check-in Express 
            et conserver toutes vos fiches de police, 
            souscrivez maintenant à un abonnement.
          </p>
          <div style="text-align: center; 
            margin: 30px 0;">
            <a href="https://checkin-express.vercel.app" 
              style="background: #1e3a8a; 
              color: white; padding: 14px 28px; 
              border-radius: 8px; 
              text-decoration: none;
              font-weight: bold; font-size: 16px;">
              Souscrire maintenant — 89,99€/mois
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">
            Des questions ? Contactez-nous : 
            contact@percepta.io
          </p>
        </div>
      </div>
    `,
    j1: `
      <div style="font-family: Arial, sans-serif; 
        max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a8a; 
          padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">
            🏨 Check-in Express
          </h1>
          <p style="color: #93c5fd; margin: 8px 0 0;">
            by Percepta
          </p>
        </div>
        <div style="padding: 30px; 
          background: #fef3c7;">
          <h2 style="color: #92400e;">
            ⚠️ Dernier jour d'essai !
          </h2>
          <p style="color: #475569; font-size: 16px;">
            Bonjour ${hotelName},
          </p>
          <p style="color: #475569;">
            C'est votre <strong>dernier jour d'essai</strong> 
            sur Check-in Express. 
            Demain, votre accès sera suspendu.
          </p>
          <div style="text-align: center; 
            margin: 30px 0;">
            <a href="https://checkin-express.vercel.app" 
              style="background: #92400e; 
              color: white; padding: 14px 28px; 
              border-radius: 8px; 
              text-decoration: none;
              font-weight: bold; font-size: 16px;">
              Souscrire maintenant
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">
            contact@percepta.io
          </p>
        </div>
      </div>
    `,
    j0: `
      <div style="font-family: Arial, sans-serif; 
        max-width: 600px; margin: 0 auto;">
        <div style="background: #991b1b; 
          padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">
            🏨 Check-in Express
          </h1>
          <p style="color: #fca5a5; margin: 8px 0 0;">
            by Percepta
          </p>
        </div>
        <div style="padding: 30px; 
          background: #fee2e2;">
          <h2 style="color: #991b1b;">
            Votre essai est terminé
          </h2>
          <p style="color: #475569; font-size: 16px;">
            Bonjour ${hotelName},
          </p>
          <p style="color: #475569;">
            Votre période d'essai gratuit est terminée. 
            Pour continuer à utiliser Check-in Express, 
            souscrivez à un abonnement.
          </p>
          <div style="text-align: center; 
            margin: 30px 0;">
            <a href="https://checkin-express.vercel.app" 
              style="background: #991b1b; 
              color: white; padding: 14px 28px; 
              border-radius: 8px; 
              text-decoration: none;
              font-weight: bold; font-size: 16px;">
              Réactiver mon compte
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">
            contact@percepta.io
          </p>
        </div>
      </div>
    `
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}` 
    },
    body: JSON.stringify({
      from: "Check-in Express <noreply@percepta.io>",
      to: [email],
      subject: subjects[type],
      html: bodies[type]
    })
  })

  console.log(`Email ${type} sent to ${email}`)
}
