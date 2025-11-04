-- Create the profiles table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role text CHECK (role IN ('buyer', 'seller')) NOT NULL,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS) for the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow authenticated users to insert their own profile
CREATE POLICY "Authenticated users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create a policy to allow authenticated users to view their own profile
CREATE POLICY "Authenticated users can view their own profile." ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Create a policy to allow authenticated users to update their own profile
CREATE POLICY "Authenticated users can update their own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Optionally, if you want sellers to be visible to buyers (e.g., for location-based search)
-- This policy allows all authenticated users to see other sellers' profiles,
-- but only if they have a 'seller' role and location data.
CREATE POLICY "Buyers can view seller profiles with location." ON public.profiles
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    role = 'seller' AND
    latitude IS NOT NULL AND
    longitude IS NOT NULL
  );

-- Set up a trigger to automatically create a profile entry when a new user signs up
-- This is an alternative to inserting from the client, but client-side insert is already in place.
-- If you prefer server-side profile creation, you can use this:
-- CREATE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO public.profiles (id, role)
--   VALUES (NEW.id, 'buyer'); -- Default role, can be adjusted
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions to the authenticated role
GRANT ALL ON public.profiles TO authenticated;