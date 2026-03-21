-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  hotel_name TEXT,
  email TEXT,
  country TEXT,
  status TEXT DEFAULT 'trial',
  trial_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trial_end TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  total_scans INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles 
  ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Admin can update profiles"
  ON public.profiles FOR UPDATE
  USING (true);

-- Create trigger to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
