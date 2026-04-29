-- 1. Ajouter une colonne is_admin pour identifier les comptes admin
ALTER TABLE public.hotels 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Marquer le compte admin (remplacer l'UUID par celui du vrai admin)
UPDATE public.hotels 
SET is_admin = true 
WHERE email = 'muhammadsamb@gmail.com';

-- 2. Créer la politique RLS pour que l'admin puisse voir tous les comptes
-- Remplacer 'ADMIN_UUID_HERE' par l'UUID réel du compte admin
DROP POLICY IF EXISTS "Admin can view all hotels" ON public.hotels;
CREATE POLICY "Admin can view all hotels" ON public.hotels
FOR SELECT USING (
  auth.uid() = 'ADMIN_UUID_HERE'::uuid
  OR auth.uid() = user_id
);

-- 3. Créer la vue hotels_with_email pour joindre les emails depuis auth.users
CREATE OR REPLACE VIEW hotels_with_email AS
SELECT 
  h.*,
  u.email,
  u.created_at as user_created_at,
  u.last_sign_in_at
FROM public.hotels h
JOIN auth.users u ON h.user_id = u.id;

-- Accorder les permissions sur la vue
GRANT SELECT ON hotels_with_email TO authenticated;
GRANT SELECT ON hotels_with_email TO service_role;

-- 4. Créer une vue pour les scans avec emails des hôtels
CREATE OR REPLACE VIEW scan_history_with_hotel AS
SELECT 
  sh.*,
  h.hotel_name,
  h.email as hotel_email,
  h.subscription_status,
  h.status as hotel_status
FROM public.scan_history sh
JOIN public.hotels h ON sh.hotel_id = h.id;

GRANT SELECT ON scan_history_with_hotel TO authenticated;
GRANT SELECT ON scan_history_with_hotel TO service_role;

-- 5. Mettre à jour les politiques pour la vue hotels_with_email
DROP POLICY IF EXISTS "Admin can view all hotels_with_email" ON hotels_with_email;
CREATE POLICY "Admin can view all hotels_with_email" ON hotels_with_email
FOR SELECT USING (
  auth.uid() = 'ADMIN_UUID_HERE'::uuid
  OR auth.uid() = user_id
);

-- 6. Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_hotels_is_admin ON public.hotels(is_admin);
CREATE INDEX IF NOT EXISTS idx_hotels_email ON public.hotels(email);
