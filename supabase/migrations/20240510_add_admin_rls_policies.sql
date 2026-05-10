-- Add admin RLS policies for hotels table
-- Allow admin users to update and delete any hotel record

-- First, create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is in the admin_users table or has admin role
  -- For now, we'll use a simple check - in production, you might want a proper admin_users table
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'admin@percepta.app' -- Replace with actual admin email or use admin_users table
  );
END;
$$;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can update own hotel" ON public.hotels;
DROP POLICY IF EXISTS "Users can view own hotel" ON public.hotels;

-- Create new policies with admin support
CREATE POLICY "Users can insert own hotel" ON public.hotels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hotel" ON public.hotels
  FOR UPDATE USING (auth.uid() = user_id OR is_admin_user());

CREATE POLICY "Admins can delete any hotel" ON public.hotels
  FOR DELETE USING (is_admin_user());

CREATE POLICY "Users can view own hotel" ON public.hotels
  FOR SELECT USING (auth.uid() = user_id OR is_admin_user());
