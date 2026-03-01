-- Umožniť používateľom zrušiť svoje vlastné rezervácie
-- Pridáme UPDATE politiku pre používateľov, aby mohli zmeniť status na 'cancelled'

-- Najprv odstránime existujúcu UPDATE politiku ak existuje
DROP POLICY IF EXISTS "Users can cancel own reservations" ON reservations;

-- Vytvoríme novú politiku ktorá umožňuje používateľom aktualizovať iba status svojich vlastných rezervácií
CREATE POLICY "Users can cancel own reservations" ON reservations
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND status = 'cancelled'
  AND (
    SELECT status FROM reservations WHERE id = reservations.id
  ) IN ('pending', 'confirmed')
);

-- Poznámka: Táto politika umožňuje používateľom zmeniť iba status na 'cancelled'
-- a iba pre rezervácie, ktoré sú v stave 'pending' alebo 'confirmed'
