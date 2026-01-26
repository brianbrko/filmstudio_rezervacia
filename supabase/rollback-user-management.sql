-- Odstráň trigger a funkciu
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Odstráň nové RLS politiky
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- Najprv oprav politiky na reservations (odstráň závislosť na is_blocked)
DROP POLICY IF EXISTS "Users can create their own reservations" ON reservations;
CREATE POLICY "Users can create their own reservations" ON reservations
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reservations" ON reservations;
CREATE POLICY "Users can update their own reservations" ON reservations
FOR UPDATE USING (auth.uid() = user_id);

-- Teraz môžeme odstrániť is_blocked stĺpec
ALTER TABLE user_profiles DROP COLUMN IF EXISTS is_blocked;

-- Skontroluj že všetko je preč
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_profiles';

SELECT policyname 
FROM pg_policies 
WHERE tablename = 'user_profiles';
