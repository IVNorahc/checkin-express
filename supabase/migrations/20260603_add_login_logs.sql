-- Add last_login column to hotels
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Create login_logs table
CREATE TABLE IF NOT EXISTS login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  device TEXT,
  browser TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotels see own logs" ON login_logs FOR SELECT USING (
  hotel_id IN (SELECT id FROM hotels WHERE user_id = auth.uid())
);

CREATE POLICY "Hotels insert own logs" ON login_logs FOR INSERT WITH CHECK (
  hotel_id IN (SELECT id FROM hotels WHERE user_id = auth.uid())
);
