-- Tabuľka pre špecifické pracovné hodiny zamestnankýň na konkrétne dni
-- Umožňuje override defaultných pracovných hodín pre konkrétny deň

-- Vytvoríme NOVÚ tabuľku s INÝM názvom (neprepisujeme employee_working_hours)
DROP TABLE IF EXISTS employee_day_overrides CASCADE;

CREATE TABLE employee_day_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    specific_date DATE NOT NULL,
    start_time TIME, -- NULL znamená že nepracuje tento deň
    end_time TIME,   -- NULL znamená že nepracuje tento deň
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(employee_id, specific_date)
);

-- Index pre rýchlejšie vyhľadávanie
CREATE INDEX idx_employee_day_overrides_employee ON employee_day_overrides(employee_id);
CREATE INDEX idx_employee_day_overrides_date ON employee_day_overrides(specific_date);

-- RLS Politiky
ALTER TABLE employee_day_overrides ENABLE ROW LEVEL SECURITY;

-- Všetci môžu čítať pracovné hodiny
CREATE POLICY "Anyone can view employee day overrides" ON employee_day_overrides
FOR SELECT USING (true);

-- Len admini môžu upravovať pracovné hodiny
CREATE POLICY "Admins can insert employee day overrides" ON employee_day_overrides
FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can update employee day overrides" ON employee_day_overrides
FOR UPDATE USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can delete employee day overrides" ON employee_day_overrides
FOR DELETE USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Trigger pre automatické updatovanie updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employee_day_overrides_updated_at BEFORE UPDATE ON employee_day_overrides
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
