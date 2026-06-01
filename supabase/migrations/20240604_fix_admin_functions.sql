-- 1. Corriger is_admin_user() pour utiliser user_metadata.is_admin
--    (l'ancienne version vérifiait un email hardcodé qui ne correspond pas)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean IS TRUE
  );
END;
$$;

-- 2. Permettre aux admins de lire toutes les lignes de clients (pour Realtime + requêtes directes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'clients' AND policyname = 'Admins can view all clients'
  ) THEN
    CREATE POLICY "Admins can view all clients" ON public.clients
      FOR SELECT USING (is_admin_user());
  END IF;
END;
$$;

-- 3. Trigger : incrémenter automatiquement ocr_scans_used à chaque insert dans clients
CREATE OR REPLACE FUNCTION increment_hotel_scan_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.hotels
  SET ocr_scans_used = ocr_scans_used + 1
  WHERE id = NEW.hotel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_increment_hotel_scans ON public.clients;
CREATE TRIGGER trg_increment_hotel_scans
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION increment_hotel_scan_count();
