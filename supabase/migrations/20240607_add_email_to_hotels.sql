-- Ajoute la colonne email de contact de l'hôtel (distincte du email du compte utilisateur)
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS email TEXT;
