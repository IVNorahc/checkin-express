-- Ajouter la colonne ocr_scans_used à la table hotels
ALTER TABLE hotels 
ADD COLUMN ocr_scans_used INTEGER DEFAULT 0;

-- Mettre à jour les enregistrements existants avec 0 scans utilisés
UPDATE hotels 
SET ocr_scans_used = 0 
WHERE ocr_scans_used IS NULL;

-- Créer un index pour optimiser les requêtes sur cette colonne
CREATE INDEX idx_hotels_ocr_scans_used ON hotels(ocr_scans_used);
