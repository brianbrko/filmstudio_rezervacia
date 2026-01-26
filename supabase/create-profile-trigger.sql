-- Funkcia, ktorá automaticky vytvorí user_profile pri registrácii nového používateľa

-- 1. Najprv vytvor funkciu
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, phone, role, is_blocked, permissions)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    false,
    '{"services": false, "working_hours": false, "statistics": false, "users": false}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', user_profiles.full_name),
    phone = COALESCE(NEW.raw_user_meta_data->>'phone', user_profiles.phone),
    role = COALESCE(NEW.raw_user_meta_data->>'role', user_profiles.role);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Vytvor trigger, ktorý zavolá funkciu pri každom INSERT do auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Overenie
-- Po spustení tohto scriptu sa pri každej registrácii automaticky vytvorí profil v user_profiles
