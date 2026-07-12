import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    // Vérifier le JWT appelant
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

    // Client admin (service role — jamais exposé côté navigateur)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { action, ...params } = await req.json()

    switch (action) {
      case 'listHotels': {
        const { data: hotels, error } = await admin
          .from('hotels')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error

        const { data: authData } = await admin.auth.admin.listUsers()
        const users = authData?.users ?? []

        // Scans du mois en cours par hôtel (depuis table clients)
        const monthStart = new Date().toISOString().slice(0, 7) + '-01'
        const { data: monthlyRows } = await admin
          .from('clients')
          .select('hotel_id')
          .gte('created_at', monthStart)
        const monthlyCounts: Record<string, number> = {}
        for (const row of (monthlyRows ?? [])) {
          monthlyCounts[row.hotel_id] = (monthlyCounts[row.hotel_id] ?? 0) + 1
        }

        const merged = (hotels ?? []).map((h: Record<string, unknown>) => {
          const authUser = users.find((u) => u.id === h.user_id)
          return {
            ...h,
            email: authUser?.email ?? 'N/A',
            last_sign_in_at: authUser?.last_sign_in_at ?? null,
            monthly_scans: monthlyCounts[h.id as string] ?? 0,
          }
        })
        return json({ hotels: merged })
      }

      case 'getKPIs': {
        const { count: totalHotels } = await admin
          .from('hotels')
          .select('*', { count: 'exact', head: true })
        const { data: activeHotels } = await admin
          .from('hotels')
          .select('subscription_status, trial_end')
          .or(`subscription_status.eq.active,and(subscription_status.eq.trial,trial_end.gt.${new Date().toISOString()})`)
        const today = new Date().toISOString().slice(0, 10)
        const { count: todayScans } = await admin
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today)
        return json({
          totalHotels: totalHotels ?? 0,
          activeSubscriptions: activeHotels?.length ?? 0,
          todayScans: todayScans ?? 0,
        })
      }

      case 'getDailyScans': {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        let q = admin
          .from('clients')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true })
        if (params.hotelId && params.hotelId !== 'all') q = q.eq('hotel_id', params.hotelId)
        const { data } = await q
        return json({ data: data ?? [] })
      }

      case 'getMonthlyScans': {
        const currentMonth = new Date().toISOString().slice(0, 7)
        const monthStart = new Date(currentMonth + '-01').toISOString()
        const monthEnd = new Date(currentMonth + '-31').toISOString()
        let q = admin
          .from('clients')
          .select('hotel_id, hotels!inner(hotel_name)')
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd)
        if (params.hotelId && params.hotelId !== 'all') q = q.eq('hotel_id', params.hotelId)
        const { data } = await q
        return json({ data: data ?? [] })
      }

      case 'updateHotel': {
        const { hotelId, updateData } = params as { hotelId: string; updateData: Record<string, unknown> }
        const { error } = await admin.from('hotels').update(updateData).eq('id', hotelId)
        if (error) throw error
        return json({ success: true })
      }

      case 'deleteHotel': {
        const { hotelId, userId } = params as { hotelId: string; userId: string }
        await admin.from('clients').delete().eq('hotel_id', hotelId)
        await admin.from('profiles').delete().eq('id', userId)
        const { error: hotelErr } = await admin.from('hotels').delete().eq('id', hotelId)
        if (hotelErr) throw hotelErr
        const { error: authErr } = await admin.auth.admin.deleteUser(userId)
        if (authErr) throw authErr
        return json({ success: true })
      }

      case 'getDetailedKPIs': {
        const now = new Date()
        const today = now.toISOString().slice(0, 10)
        const monthStart = today.slice(0, 7) + '-01'

        const { data: allHotels } = await admin
          .from('hotels')
          .select('subscription_status, trial_end')

        const hs = allHotels ?? []
        const trialActive = hs.filter(
          (h: Record<string, string>) => h.subscription_status === 'trial' && new Date(h.trial_end) > now
        ).length
        const trialExpired = hs.filter(
          (h: Record<string, string>) => h.subscription_status === 'trial' && new Date(h.trial_end) <= now
        ).length
        const starter = hs.filter((h: Record<string, string>) => h.subscription_status === 'starter').length
        const business = hs.filter((h: Record<string, string>) => h.subscription_status === 'business').length

        const { count: todayScans } = await admin
          .from('clients').select('*', { count: 'exact', head: true }).gte('created_at', today)
        const { count: monthScans } = await admin
          .from('clients').select('*', { count: 'exact', head: true }).gte('created_at', monthStart)

        return json({
          totalHotels: hs.length,
          trialActive,
          trialExpired,
          starter,
          business,
          todayScans: todayScans ?? 0,
          monthScans: monthScans ?? 0,
          monthlyRevenue: (starter * 49.99 + business * 89.99).toFixed(2),
        })
      }

      case 'getWeeklySignups': {
        const threeMonthsAgo = new Date()
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
        const { data } = await admin
          .from('hotels')
          .select('created_at')
          .gte('created_at', threeMonthsAgo.toISOString())
          .order('created_at', { ascending: true })
        return json({ data: data ?? [] })
      }

      case 'createHotelAccount': {
        const {
          email,
          password,
          hotel_name,
          phone,
          address,
          city,
          country,
          subscription_status,
          trial_days,
        } = params as {
          email: string
          password: string
          hotel_name: string
          phone: string
          address?: string
          city?: string
          country?: string
          subscription_status?: string
          trial_days?: number
        }

        if (!email || !password || !hotel_name || !phone) {
          return json({ error: 'email, password, hotel_name et phone sont obligatoires' }, 400)
        }

        // Créer le compte auth (email confirmé d'office)
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })
        if (createErr) throw createErr

        const userId = newUser.user.id
        const trialEnd = new Date()
        trialEnd.setDate(trialEnd.getDate() + (trial_days ?? 7))

        const { error: hotelErr } = await admin.from('hotels').insert({
          user_id: userId,
          hotel_name: hotel_name.trim(),
          phone: phone.trim(),
          address: address?.trim() || null,
          city: city?.trim() || null,
          country: country || 'Sénégal',
          subscription_status: subscription_status || 'trial',
          trial_end: trialEnd.toISOString(),
          status: 'active',
          created_at: new Date().toISOString(),
        })
        if (hotelErr) {
          // Rollback : supprimer le user créé si l'hôtel échoue
          await admin.auth.admin.deleteUser(userId)
          throw hotelErr
        }

        return json({ success: true, userId })
      }

      default:
        return json({ error: 'Unknown action' }, 400)
    }
  } catch (err) {
    console.error('[admin-api] error:', err)
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500)
  }
})
