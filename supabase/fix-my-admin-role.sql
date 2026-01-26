-- 1. Zobraz všetkých používateľov s emailom
SELECT up.id, up.full_name, up.role, au.email
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at;

-- 2. NAHRAĎ 'vas@email.com' SVOJÍM EMAILOM a spusti:
/*
UPDATE user_profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'vas@email.com');
*/

-- 3. Skontroluj výsledok:
/*
SELECT up.full_name, up.role, au.email
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE au.email = 'vas@email.com';
*/
