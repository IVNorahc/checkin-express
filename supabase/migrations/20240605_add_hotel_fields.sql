-- Ajouter les colonnes manquantes à la table hotels
-- (address, email, city existaient peut-être déjà — IF NOT EXISTS évite l'erreur)

ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS address          TEXT,
  ADD COLUMN IF NOT EXISTS email            TEXT,
  ADD COLUMN IF NOT EXISTS city             TEXT,
  ADD COLUMN IF NOT EXISTS website          TEXT,
  ADD COLUMN IF NOT EXISTS numero_registre  TEXT,
  ADD COLUMN IF NOT EXISTS numero_agrement  TEXT;
