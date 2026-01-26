-- Pridanie nových polí do rezervácií pre kontaktné údaje
ALTER TABLE reservations 
ADD COLUMN phone TEXT,
ADD COLUMN title TEXT,
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN email TEXT;

-- Aktualizuj existujúce rezervácie s fallback hodnotami
UPDATE reservations 
SET 
  first_name = 'Neznámy',
  last_name = 'Používateľ',
  email = 'neznamy@email.sk',
  phone = 'neuvedené'
WHERE first_name IS NULL;
