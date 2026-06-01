-- Ajoute le numéro de registre journalier (format YYYYMMDD-XXX) à la table clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS numero_registre TEXT;
