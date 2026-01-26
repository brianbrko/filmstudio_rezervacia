-- 1. Pridaj is_blocked stĺpec
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- 2. Pridaj RLS politiku aby admin videl všetkých používateľov
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles" ON user_profiles
FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE role = 'admin'
  )
);

-- 3. Pridaj politiku aby admin mohol upravovať všetky profily
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
CREATE POLICY "Admins can update all profiles" ON user_profiles
FOR UPDATE USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE role = 'admin'
  )
);

-- 4. Pridaj politiku aby admin mohol mazať profily
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
CREATE POLICY "Admins can delete profiles" ON user_profiles
FOR DELETE USING (
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE role = 'admin'
  )
);

-- 5. Uprav politiku pre vytváranie rezervácií - zablokovaní používatelia nemôžu
DROP POLICY IF EXISTS "Users can create their own reservations" ON reservations;
CREATE POLICY "Users can create their own reservations" ON reservations
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_blocked = true
  )
);

-- 6. Uprav politiku pre úpravu rezervácií - zablokovaní používatelia nemôžu
DROP POLICY IF EXISTS "Users can update their own reservations" ON reservations;
CREATE POLICY "Users can update their own reservations" ON reservations
FOR UPDATE USING (
  auth.uid() = user_id AND
  NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_blocked = true
  )
);

-- 7. Skontroluj výsledok
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'is_blocked';
