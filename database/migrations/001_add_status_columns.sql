-- Ajouter les colonnes de statut à la table hotels
ALTER TABLE public.hotels 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- Ajouter des index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_hotels_status ON public.hotels(status);
CREATE INDEX IF NOT EXISTS idx_hotels_suspended_at ON public.hotels(suspended_at);

-- Mettre à jour les comptes existants pour qu'ils soient actifs
UPDATE public.hotels 
SET status = 'active' 
WHERE status IS NULL OR status = '';
