-- Oprava: Premenujeme existujúcu tabuľku a vytvoríme správnu štruktúru

-- 1. Premenujeme existujúcu tabuľku (ktorá má specific_date) aby sme neprišli o dáta
ALTER TABLE IF EXISTS employee_working_hours RENAME TO employee_working_hours_old;

-- 2. Vytvoríme SPRÁVNU tabuľku pre týždenné pracovné hodiny zamestnankýň
CREATE TABLE employee_working_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Pondelok, 6 = Nedeľa
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_working BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(employee_id, day_of_week)
);

-- Index pre rýchlejšie vyhľadávanie
CREATE INDEX idx_emp_working_hours_employee ON employee_working_hours(employee_id);
CREATE INDEX idx_emp_working_hours_day ON employee_working_hours(day_of_week);

-- 3. RLS Politiky
ALTER TABLE employee_working_hours ENABLE ROW LEVEL SECURITY;

-- Všetci môžu čítať pracovné hodiny
CREATE POLICY "Anyone can view employee working hours" ON employee_working_hours 
FOR SELECT USING (true);

-- Len admin môže upravovať
CREATE POLICY "Admin can insert employee working hours" ON employee_working_hours 
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin can update employee working hours" ON employee_working_hours 
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin can delete employee working hours" ON employee_working_hours 
FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Vymažeme starú tabuľku (ak nechceme dáta, alebo ich môžeme nechať)
-- DROP TABLE IF EXISTS employee_working_hours_old CASCADE;

-- Poznámka: Starú tabuľku som premenoval na employee_working_hours_old
-- Ak ju nechcete, odkomentujte DROP príkaz vyššie
