-- Create the profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    role text CHECK (role IN ('buyer', 'seller')) NOT NULL,
    latitude double precision,
    longitude double precision,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update their own profile." ON public.profiles;

-- Policy for inserting a new profile (only if the ID matches the authenticated user's ID)
CREATE POLICY "Authenticated users can insert their own profile."
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy for selecting (reading) a profile (only if the ID matches the authenticated user's ID)
CREATE POLICY "Authenticated users can view their own profile."
ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Policy for updating a profile (only if the ID matches the authenticated user's ID)
CREATE POLICY "Authenticated users can update their own profile."
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create the product-images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for product-images bucket: allow authenticated users to upload their own images
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for product-images bucket: allow authenticated users to view all images
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product-images');

-- Policy for product-images bucket: allow authenticated users to delete their own images
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create the products table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    image_url text,
    seller_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Set up Row Level Security (RLS) for products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for products if they exist
DROP POLICY IF EXISTS "Sellers can create their own products." ON public.products;
DROP POLICY IF EXISTS "All authenticated users can view products." ON public.products;
DROP POLICY IF EXISTS "Sellers can update their own products." ON public.products;
DROP POLICY IF EXISTS "Sellers can delete their own products." ON public.products;

-- Policy for sellers to insert their own products
CREATE POLICY "Sellers can create their own products."
ON public.products FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- Policy for all authenticated users to view all products
CREATE POLICY "All authenticated users can view products."
ON public.products FOR SELECT USING (true);

-- Policy for sellers to update their own products
CREATE POLICY "Sellers can update their own products."
ON public.products FOR UPDATE USING (auth.uid() = seller_id);

-- Policy for sellers to delete their own products
CREATE POLICY "Sellers can delete their own products."
ON public.products FOR DELETE USING (auth.uid() = seller_id);