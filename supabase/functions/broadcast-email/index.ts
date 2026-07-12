import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_URL = 'https://checkinexpress.app'
const LOGO_URL = 'https://checkinexpress.app/percepta-logo.png'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Filter = 'all' | 'trial_active' | 'starter' | 'business' | 'trial_expired'

interface Hotel {
  id: string
  hotel_name: string | null
  user_id: string
  subscription_status: string | null
  trial_end: string | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })

  try {
    // ── Auth: vérifier JWT et statut admin ─────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)
    if (!user.user_metadata?.is_admin) return json({ error: 'Forbidden' }, 403)

    // ── Payload ────────────────────────────────────────────────────────────
    const { subject, message, filter } = await req.json() as {
      subject: string
      message: string
      filter: Filter
    }

    if (!subject?.trim() || !message?.trim()) {
      return json({ error: 'subject and message are required' }, 400)
    }
    if (!['all', 'trial_active', 'starter', 'business', 'trial_expired'].includes(filter)) {
      return json({ error: 'Invalid filter' }, 400)
    }

    // ── Admin client (service role) ────────────────────────────────────────
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Récupérer les hôtels selon le filtre ──────────────────────────────
    const now = new Date().toISOString()
    let query = admin
      .from('hotels')
      .select('id, hotel_name, user_id, subscription_status, trial_end')

    if (filter === 'trial_active') {
      query = query.eq('subscription_status', 'trial').gt('trial_end', now)
    } else if (filter === 'trial_expired') {
      query = query.eq('subscription_status', 'trial').lte('trial_end', now)
    } else if (filter === 'starter') {
      query = query.eq('subscription_status', 'starter')
    } else if (filter === 'business') {
      query = query.eq('subscription_status', 'business')
    }
    // 'all' → pas de filtre supplémentaire

    const { data: hotels, error: hotelsError } = await query
    if (hotelsError) throw hotelsError

    if (!hotels || hotels.length === 0) {
      return json({ sent: 0, failed: 0, total: 0 })
    }

    // ── Récupérer les emails depuis auth ──────────────────────────────────
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const userMap = new Map<string, string>()
    for (const u of authData?.users ?? []) {
      if (u.email) userMap.set(u.id, u.email)
    }

    // ── Construire les destinataires ──────────────────────────────────────
    const recipients = (hotels as Hotel[])
      .map(h => ({ email: userMap.get(h.user_id) ?? null, hotelName: h.hotel_name ?? 'Hôtel' }))
      .filter((r): r is { email: string; hotelName: string } => r.email !== null)

    if (recipients.length === 0) {
      return json({ sent: 0, failed: 0, total: 0 })
    }

    // ── Envoyer via Resend ────────────────────────────────────────────────
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) throw new Error('RESEND_API_KEY not configured')

    const results = await Promise.allSettled(
      recipients.map(({ email, hotelName }) =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'Check-in Express <noreply@checkinexpress.app>',
            reply_to: 'perceptasn@gmail.com',
            to: [email],
            subject: subject.trim(),
            html: buildBroadcastHtml(hotelName, subject.trim(), message.trim()),
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const body = await res.text()
            throw new Error(`Resend ${res.status}: ${body}`)
          }
          return res
        })
      )
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`[broadcast-email] filter=${filter} total=${recipients.length} sent=${sent} failed=${failed}`)

    return json({ sent, failed, total: recipients.length })

  } catch (err) {
    console.error('[broadcast-email] error:', err)
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500)
  }
})

// ─── Template HTML ────────────────────────────────────────────────────────────

function buildBroadcastHtml(hotelName: string, subject: string, message: string): string {
  const messageHtml = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />')

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background:#f1f5f9; font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px; background:#ffffff; border-radius:16px;
          overflow:hidden; border:1px solid #e2e8f0;
          box-shadow:0 4px 24px rgba(30,58,138,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);
              padding:28px 30px; text-align:center;">
              <img src="${LOGO_URL}" alt="Percepta" width="52" height="52"
                style="display:block; margin:0 auto 10px; border-radius:10px;
                object-fit:contain; background:rgba(255,255,255,0.1); padding:5px;" />
              <h1 style="margin:0; font-size:20px; font-weight:800; color:#ffffff;
                letter-spacing:-0.3px;">Check-in Express</h1>
              <p style="margin:3px 0 0; font-size:12px; color:#93c5fd;">by Percepta</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 28px;">

              <!-- Greeting -->
              <p style="margin:0 0 20px; font-size:15px; color:#475569;">
                Bonjour <strong style="color:#1e3a8a;">${hotelName}</strong>,
              </p>

              <!-- Subject -->
              <h2 style="margin:0 0 20px; font-size:20px; font-weight:800; color:#1e3a8a;
                padding-bottom:16px; border-bottom:2px solid #dbeafe;">
                ${subject}
              </h2>

              <!-- Message -->
              <div style="font-size:15px; color:#334155; line-height:1.75;
                background:#f8fafc; border-left:4px solid #2563eb;
                border-radius:0 8px 8px 0; padding:20px 24px; margin-bottom:28px;">
                ${messageHtml}
              </div>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="text-align:center;">
                    <a href="${APP_URL}/dashboard"
                      style="display:inline-block;
                      background:linear-gradient(135deg,#1e3a8a,#2563eb);
                      color:#ffffff; text-decoration:none; font-size:15px; font-weight:700;
                      padding:14px 36px; border-radius:10px;
                      box-shadow:0 4px 14px rgba(30,58,138,0.3);">
                      Accéder à mon dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Separator -->
              <hr style="border:none; border-top:1px solid #e2e8f0; margin:0 0 24px;" />

              <!-- Contact -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0 0 6px; font-size:13px; color:#64748b;">
                      Des questions ? Notre équipe est disponible 7j/7.
                    </p>
                    <p style="margin:0 0 3px; font-size:13px; color:#64748b;">
                      💬 &nbsp;WhatsApp :
                      <a href="https://wa.me/221711279503"
                        style="color:#1e3a8a; font-weight:600; text-decoration:none;">
                        +221 71 127 95 03
                      </a>
                    </p>
                    <p style="margin:0; font-size:13px; color:#64748b;">
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

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc; border-top:1px solid #e2e8f0;
              padding:18px 32px; text-align:center;">
              <p style="margin:0 0 6px; font-size:12px; color:#94a3b8;">
                Vous recevez cet email car vous êtes utilisateur de Check-in Express.
              </p>
              <p style="margin:0 0 6px; font-size:12px; color:#94a3b8;">
                <a href="${APP_URL}/cgu" style="color:#64748b; text-decoration:none; margin:0 6px;">CGU</a>
                ·
                <a href="${APP_URL}/confidentialite" style="color:#64748b; text-decoration:none; margin:0 6px;">Confidentialité</a>
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
