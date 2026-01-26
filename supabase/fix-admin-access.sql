-- 1. Najprv zisti kto má byť admin (zobraz všetkých používateľov s emailom)
-- SKOPÍRUJ SI EMAIL TOHO SPRÁVNEHO ADMINA
SELECT up.id, up.full_name, up.role, au.email, up.created_at
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at;

-- 2. NAHRAĎ 'admin@email.com' SVOJÍM EMAILOM a spusti tento blok:
/*
UPDATE user_profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@email.com'
);
*/

-- 3. Pridaj chýbajúcu RLS politiku pre adminov
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles" ON user_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Pridaj politiku pre adminov na úpravu všetkých profilov
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
CREATE POLICY "Admins can update all profiles" ON user_profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 5. Skontroluj všetky politiky
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
