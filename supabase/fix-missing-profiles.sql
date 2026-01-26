-- Vytvorenie profilov pre existujúcich používateľov, ktorí nemajú profil

-- Vloží profily pre všetkých používateľov z auth.users, ktorí nemajú záznam v user_profiles
INSERT INTO public.user_profiles (id, full_name, phone, role, is_blocked, permissions)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email, 'Bez mena'),
  COALESCE(au.raw_user_meta_data->>'phone', ''),
  COALESCE(au.raw_user_meta_data->>'role', 'customer'),
  false,
  '{"services": false, "working_hours": false, "statistics": false, "users": false}'::jsonb
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- Overenie - ukáže koľko profilov bolo vytvorených
SELECT 
  COUNT(*) as pocet_pouzivatelov_v_auth,
  (SELECT COUNT(*) FROM user_profiles) as pocet_profilov
FROM auth.users;

-- Ukáže používateľov bez profilov (malo by byť 0)
SELECT 
  au.email,
  au.created_at,
  'CHÝBA PROFIL' as status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;
