-- Aktualizácia mien zamestnankýň
-- POZOR: Tento skript aktualizuje mená v poradí ako boli vložené do databázy

-- Získaj ID zamestnankýň v poradí vytvorenia
WITH ordered_employees AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM employees
  WHERE is_active = true
)
-- Aktualizuj mená
UPDATE employees
SET name = CASE 
  WHEN id = (SELECT id FROM ordered_employees WHERE row_num = 1) THEN 'Simonka'
  WHEN id = (SELECT id FROM ordered_employees WHERE row_num = 2) THEN 'Natalia'
  WHEN id = (SELECT id FROM ordered_employees WHERE row_num = 3) THEN 'Tamara'
  ELSE name
END
WHERE id IN (SELECT id FROM ordered_employees);

-- Overiť zmeny
SELECT name, position, created_at FROM employees ORDER BY created_at;
