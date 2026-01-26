-- Vypnúť RLS na rezerváciách pre jednoduchšie testovanie
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;

-- Alternatívne: Ak chcete ponechať RLS zapnuté, spustite tento kod namiesto:
-- DROP POLICY IF EXISTS "Users can view own reservations" ON reservations;
-- DROP POLICY IF EXISTS "Users can create reservations" ON reservations;
-- DROP POLICY IF EXISTS "Admins can update reservations" ON reservations;
-- DROP POLICY IF EXISTS "Admins can delete reservations" ON reservations;

-- CREATE POLICY "Anyone can view reservations" ON reservations
-- FOR SELECT USING (true);

-- CREATE POLICY "Users can create their own reservations" ON reservations
-- FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Users and admins can update reservations" ON reservations
-- FOR UPDATE USING (
--     auth.uid() = user_id OR 
--     EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
-- );

-- CREATE POLICY "Users and admins can delete reservations" ON reservations
-- FOR DELETE USING (
--     auth.uid() = user_id OR 
--     EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
-- );
