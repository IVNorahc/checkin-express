-- Add unique constraint on phone number in hotels table
ALTER TABLE public.hotels ADD CONSTRAINT hotels_phone_unique UNIQUE (phone);
