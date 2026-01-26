-- Pridanie stĺpca pre oprávnenia zamestnancov

-- Pridaj JSONB stĺpec pre jednotlivé oprávnenia
ALTER TABLE user_profiles 
ADD COLUMN permissions JSONB DEFAULT '{"services": false, "working_hours": false, "statistics": false, "users": false}'::jsonb;

-- Nastavenie defaultných oprávnení pre existujúcich adminov (všetko povolené)
UPDATE user_profiles 
SET permissions = '{"services": true, "working_hours": true, "statistics": true, "users": true}'::jsonb
WHERE role = 'admin';

-- Overenie zmien
SELECT 
  full_name, 
  role, 
  permissions
FROM user_profiles 
ORDER BY role, full_name;

-- Popis oprávnení:
-- services - prístup k správe služieb
-- working_hours - prístup k pracovným hodinám
-- statistics - prístup k štatistikám
-- users - prístup k správe používateľov
-- POZNÁMKA: Súkromné termíny majú zamestnanci aj admin vždy prístupné (nie je v permissions)
