-- Créer la table scan_history pour suivre tous les scans
CREATE TABLE IF NOT EXISTS public.scan_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  document_type TEXT,
  success BOOLEAN DEFAULT true,
  ocr_data JSONB,
  processing_time_ms INTEGER,
  error_message TEXT
);

-- Activer RLS (Row Level Security)
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- Politique pour les hôtels : insérer uniquement leurs propres scans
CREATE POLICY "Hotels can insert own scans" ON public.scan_history
FOR INSERT WITH CHECK (
  hotel_id IN (
    SELECT id FROM public.hotels WHERE user_id = auth.uid()
  )
);

-- Politique pour les hôtels : voir uniquement leurs propres scans
CREATE POLICY "Hotels can view own scans" ON public.scan_history
FOR SELECT USING (
  hotel_id IN (
    SELECT id FROM public.hotels WHERE user_id = auth.uid()
  )
);

-- Politique pour l'admin : voir tous les scans
CREATE POLICY "Admin can view all scans" ON public.scan_history
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_scan_history_hotel_id ON public.scan_history(hotel_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_created_at ON public.scan_history(created_at);
CREATE INDEX IF NOT EXISTS idx_scan_history_success ON public.scan_history(success);
CREATE INDEX IF NOT EXISTS idx_scan_history_hotel_created ON public.scan_history(hotel_id, created_at);

-- Trigger pour mettre à jour le compteur de scans mensuels
CREATE OR REPLACE FUNCTION update_monthly_scan_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le compteur de scans pour l'hôtel
  INSERT INTO public.monthly_scan_counts (hotel_id, month_year, scan_count)
  VALUES (
    NEW.hotel_id,
    DATE_TRUNC('month', NEW.created_at),
    1
  )
  ON CONFLICT (hotel_id, month_year)
  DO UPDATE SET
    scan_count = monthly_scan_counts.scan_count + 1,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer la table pour les compteurs mensuels
CREATE TABLE IF NOT EXISTS public.monthly_scan_counts (
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
  month_year DATE NOT NULL,
  scan_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (hotel_id, month_year)
);

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_monthly_scan_count ON public.scan_history;
CREATE TRIGGER trigger_update_monthly_scan_count
AFTER INSERT ON public.scan_history
FOR EACH ROW
EXECUTE FUNCTION update_monthly_scan_count();
