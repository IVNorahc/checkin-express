-- Créer une fonction RPC pour incrémenter le compteur de scans OCR
CREATE OR REPLACE FUNCTION increment_ocr_scans(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE hotels 
    SET ocr_scans_used = ocr_scans_used + 1
    WHERE id = user_id;
END;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION increment_ocr_scans(UUID) TO authenticated;
