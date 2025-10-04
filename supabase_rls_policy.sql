CREATE POLICY "Authenticated users can insert their own profile."
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);