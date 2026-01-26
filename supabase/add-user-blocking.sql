-- Pridaj pole pre blokovanie používateľov
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Update RLS policies aby blokovaní používatelia nemohli vytvárať rezervácie
DROP POLICY IF EXISTS "Users can create their own reservations" ON reservations;
CREATE POLICY "Users can create their own reservations" ON reservations FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND is_blocked = false
  )
);

-- Update policy pre update rezervácií
DROP POLICY IF EXISTS "Users can update their own reservations" ON reservations;
CREATE POLICY "Users can update their own reservations" ON reservations FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND is_blocked = false
  )
);
