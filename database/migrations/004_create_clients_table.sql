-- Création de la table clients pour l'historique des check-ins
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
  nom TEXT,
  prenoms TEXT,
  date_naissance TEXT,
  lieu_naissance TEXT,
  nationalite TEXT,
  document_type TEXT,
  numero_document TEXT,
  date_delivrance TEXT,
  date_expiration TEXT,
  chambre TEXT,
  profession TEXT,
  domicile TEXT,
  venant_de TEXT,
  allant_a TEXT,
  objet_voyage TEXT,
  nb_enfants TEXT,
  immatriculation TEXT,
  signature TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Activer RLS sur la table clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Politique pour que les hôtels ne puissent gérer que leurs propres clients
CREATE POLICY "Hotels can manage own clients" ON public.clients
FOR ALL USING (
  hotel_id IN (
    SELECT id FROM public.hotels WHERE user_id = auth.uid()
  )
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_clients_hotel_id ON public.clients(hotel_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_nom_prenoms ON public.clients(nom, prenoms);
