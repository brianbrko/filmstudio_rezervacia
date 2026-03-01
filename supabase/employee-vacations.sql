-- Tabuľka pre dovolenky zamestnankýň
-- Automaticky vytvorené cez Supabase MCP

-- Táto tabuľka je už vytvorená v databáze
-- Tento súbor slúži len na dokumentáciu

/*
CREATE TABLE IF NOT EXISTS employee_vacations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Index pre rýchlejšie vyhľadávanie
CREATE INDEX IF NOT EXISTS idx_employee_vacations_employee_id ON employee_vacations(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_vacations_dates ON employee_vacations(start_date, end_date);

-- RLS politiky
ALTER TABLE employee_vacations ENABLE ROW LEVEL SECURITY;

-- OPRAVENÉ: Všetci používatelia môžu vidieť dovolenky (vrátane zákazníkov)
-- Toto je potrebné aby sa správne zobrazili dostupné termíny
CREATE POLICY "Anyone can view vacations" ON employee_vacations
  FOR SELECT USING (true);

-- Len admin môže pridávať, upravovať a mazať dovolenky
CREATE POLICY "Only admins can insert vacations" ON employee_vacations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update vacations" ON employee_vacations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete vacations" ON employee_vacations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

COMMENT ON TABLE employee_vacations IS 'Dovolenky zamestnankýň - zákazníci nemôžu rezervovať termín počas dovolenky';
COMMENT ON COLUMN employee_vacations.start_date IS 'Začiatok dovolenky (vrátane)';
COMMENT ON COLUMN employee_vacations.end_date IS 'Koniec dovolenky (vrátane)';
*/

-- POZNÁMKY K IMPLEMENTÁCII:
-- ===========================

-- 1. Priorita kontroly pracovných hodín (lib/workingHours.ts):
--    special_days > employee_vacations > employee_day_overrides > employee_working_hours > working_hours

-- 2. Validácia rezervácií:
--    - Keď zákazník/admin vytvára rezerváciu, systém automaticky kontroluje dovolenky
--    - Ak má zamestnankyna dovolenku v daný deň, nedostupné časové sloty sa nezobrazia
--    - Reason code 'on_vacation' indikuje, že zamestnankyna je na dovolenke

-- 3. Admin rozhranie:
--    - Nová karta "Dovolenky" v /working-hours
--    - Admin môže pridávať/mazať dovolenky pre akúkoľvek zamestnankyňu
--    - Zamestnanci môžu len prezerať dovolenky (read-only)

-- 4. Príklad použitia:
--    INSERT INTO employee_vacations (employee_id, start_date, end_date, note)
--    VALUES ('uuid-zamestnankyne', '2026-07-01', '2026-07-14', 'Letná dovolenka');

-- 5. Pri vytváraní rezervácie systém kontroluje:
--    SELECT * FROM employee_vacations
--    WHERE employee_id = 'uuid-zamestnankyne'
--      AND start_date <= '2026-07-05'
--      AND end_date >= '2026-07-05';
--    -- Ak vráti záznam, zamestnankyňa je na dovolenke
