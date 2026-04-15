-- Create hotels table
CREATE TABLE IF NOT EXISTS public.hotels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  hotel_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  trial_end TIMESTAMP DEFAULT (now() + interval '7 days'),
  subscription_status TEXT DEFAULT 'trial',
  ocr_scans_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.hotels 
  ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert own hotel" ON public.hotels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hotel" ON public.hotels
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own hotel" ON public.hotels
  FOR SELECT USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS hotels_user_id_idx ON public.hotels(user_id);
