import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const APP_URL = "https://checkinexpress.app"
const LOGO_URL = "https://checkinexpress.app/percepta-logo.png"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  console.log(`[send-welcome-email] ${req.method} ${new URL(req.url).pathname}`)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    const payload = await req.json()
    console.log(`[send-welcome-email] payload: hotel_name="${payload.hotel_name}" email="${payload.email}"`)
    const { hotel_name, email } = payload

    if (!hotel_name || !email) {
      return json({ error: "hotel_name and email are required" }, 400)
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured")

    const subject = "Bienvenue sur Check-in Express — Votre essai gratuit commence maintenant 🎉"
    const html = buildWelcomeHtml(hotel_name)

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Check-in Express <onboarding@resend.dev>",
        reply_to: "perceptasn@gmail.com",
        to: [email],
        subject,
        html,
      }),
    })

    const resBody = await res.text()
    console.log(`[send-welcome-email] Resend response: status=${res.status} body=${resBody}`)

    if (!res.ok) {
      throw new Error(`Resend HTTP ${res.status}: ${resBody}`)
    }

    console.log(`[send-welcome-email] ✓ sent to ${email} (${hotel_name})`)
    return json({ success: true }, 200, CORS_HEADERS)

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[send-welcome-email] Error:", msg)
    return json({ error: msg }, 500, CORS_HEADERS)
  }
})

// ─── HTML template ────────────────────────────────────────────────────────────

function buildWelcomeHtml(hotelName: string): string {
  const steps = [
    {
      number: "1",
      emoji: "⚙️",
      title: "Configurez votre hôtel",
      desc: "Ajoutez votre logo, adresse et informations de contact.",
      href: `${APP_URL}/parametres`,
      cta: "Configurer mon hôtel",
    },
    {
      number: "2",
      emoji: "📷",
      title: "Scannez votre première pièce d'identité",
      desc: "Photographiez une CNI ou un passeport — notre IA extrait toutes les données en quelques secondes.",
      href: `${APP_URL}/scan`,
      cta: "Faire mon premier scan",
    },
    {
      number: "3",
      emoji: "📤",
      title: "Exportez votre première fiche SYNEXIE",
      desc: "Générez et transmettez la fiche de police à la gendarmerie en 1 clic.",
      href: `${APP_URL}/fiches`,
      cta: "Voir mes fiches",
    },
  ]

  const stepRows = steps.map(({ number, emoji, title, desc, href, cta }) => `
    <tr>
      <td style="padding: 0 0 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:#f0f7ff; border-radius:12px; border:1px solid #dbeafe; overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="44" valign="top" style="padding-right:16px;">
                    <div style="width:40px; height:40px; background:#1e3a8a; border-radius:10px;
                      display:flex; align-items:center; justify-content:center;
                      font-size:18px; text-align:center; line-height:40px;">
                      ${emoji}
                    </div>
                  </td>
                  <td valign="top">
                    <p style="margin:0 0 2px; font-size:11px; font-weight:700; color:#4a90d9;
                      text-transform:uppercase; letter-spacing:0.05em;">Étape ${number}</p>
                    <p style="margin:0 0 6px; font-size:15px; font-weight:700; color:#1e3a8a;">${title}</p>
                    <p style="margin:0 0 12px; font-size:13px; color:#475569; line-height:1.5;">${desc}</p>
                    <a href="${href}"
                      style="display:inline-block; background:#1e3a8a; color:#ffffff;
                      text-decoration:none; font-size:13px; font-weight:600;
                      padding:8px 18px; border-radius:7px;">
                      ${cta} →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenue sur Check-in Express</title>
</head>
<body style="margin:0; padding:0; background:#f1f5f9; font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px; background:#ffffff; border-radius:16px;
          overflow:hidden; border:1px solid #e2e8f0;
          box-shadow:0 4px 24px rgba(30,58,138,0.08);">

          <!-- ── Header ──────────────────────────────────────────────── -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);
              padding:32px 30px; text-align:center;">
              <img src="${LOGO_URL}" alt="Percepta" width="60" height="60"
                style="display:block; margin:0 auto 12px; border-radius:12px;
                object-fit:contain; background:rgba(255,255,255,0.1); padding:6px;" />
              <h1 style="margin:0; font-size:22px; font-weight:800; color:#ffffff;
                letter-spacing:-0.3px;">Check-in Express</h1>
              <p style="margin:4px 0 0; font-size:13px; color:#93c5fd;">by Percepta</p>
            </td>
          </tr>

          <!-- ── Body ───────────────────────────────────────────────── -->
          <tr>
            <td style="padding:36px 32px 28px;">

              <!-- Titre de bienvenue -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td style="text-align:center;">
                    <div style="font-size:36px; margin-bottom:12px;">🎉</div>
                    <h2 style="margin:0 0 8px; font-size:24px; font-weight:800; color:#1e3a8a;">
                      Bienvenue, ${hotelName} !
                    </h2>
                    <p style="margin:0; font-size:15px; color:#475569; line-height:1.6;">
                      Votre essai gratuit de <strong>7 jours</strong> a commencé.<br />
                      Voici comment tirer le meilleur de Check-in Express dès aujourd'hui.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Bandeau essai gratuit -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:10px; padding:14px 20px; text-align:center;">
                    <p style="margin:0; font-size:14px; color:#065f46; font-weight:600;">
                      ✅ &nbsp;7 jours d'essai complet &nbsp;·&nbsp; Accès illimité &nbsp;·&nbsp; Aucune carte bancaire requise
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Section 3 étapes -->
              <h3 style="margin:0 0 16px; font-size:16px; font-weight:700; color:#1e3a8a;">
                3 étapes pour démarrer
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${stepRows}
              </table>

              <!-- CTA principal -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 32px;">
                <tr>
                  <td style="text-align:center;">
                    <a href="${APP_URL}/dashboard"
                      style="display:inline-block; background:linear-gradient(135deg,#1e3a8a,#2563eb);
                      color:#ffffff; text-decoration:none; font-size:16px; font-weight:700;
                      padding:16px 40px; border-radius:10px;
                      box-shadow:0 4px 14px rgba(30,58,138,0.3);">
                      Accéder à mon dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Séparateur -->
              <hr style="border:none; border-top:1px solid #e2e8f0; margin:0 0 24px;" />

              <!-- Contact -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0 0 8px; font-size:14px; color:#475569;">
                      Des questions ? Nous sommes disponibles 7j/7.
                    </p>
                    <p style="margin:0 0 4px; font-size:14px; color:#475569;">
                      💬 &nbsp;WhatsApp :
                      <a href="https://wa.me/221711279503"
                        style="color:#1e3a8a; font-weight:600; text-decoration:none;">
                        +221 71 127 95 03
                      </a>
                    </p>
                    <p style="margin:0; font-size:14px; color:#475569;">
                      ✉️ &nbsp;Email :
                      <a href="mailto:perceptasn@gmail.com"
                        style="color:#1e3a8a; font-weight:600; text-decoration:none;">
                        perceptasn@gmail.com
                      </a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── Footer ──────────────────────────────────────────────── -->
          <tr>
            <td style="background:#f8fafc; border-top:1px solid #e2e8f0;
              padding:20px 32px; text-align:center;">
              <p style="margin:0 0 8px; font-size:12px; color:#94a3b8;">
                <a href="${APP_URL}/cgu" style="color:#64748b; text-decoration:none; margin:0 8px;">CGU</a>
                ·
                <a href="${APP_URL}/confidentialite" style="color:#64748b; text-decoration:none; margin:0 8px;">Confidentialité</a>
              </p>
              <p style="margin:0; font-size:12px; color:#94a3b8;">
                © 2026 Percepta SUARL · Tous droits réservés
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  })
}
