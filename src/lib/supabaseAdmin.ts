import { createClient } from '@supabase/supabase-js'

// Client Supabase avec service_role pour contourner les restrictions RLS
// Utilisé UNIQUEMENT dans AdminDashboard.tsx pour les opérations admin
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

export { supabaseAdmin }
