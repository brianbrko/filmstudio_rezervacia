-- Pridanie role "zamestnanec" (employee) do systému

-- 1. Aktualizácia CHECK constraint pre role
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('customer', 'employee', 'admin'));

-- 2. Overenie zmien
SELECT DISTINCT role, COUNT(*) as count 
FROM user_profiles 
GROUP BY role 
ORDER BY role;

-- Popis rolí:
-- customer - zákazník (môže vytvárať vlastné rezervácie)
-- employee - zamestnanec (vidí všetky údaje, môže upravovať všetky rezervácie)
-- admin - administrátor (plný prístup vrátane služieb, pracovných hodín, štatistík, používateľov, súkromných termínov)
