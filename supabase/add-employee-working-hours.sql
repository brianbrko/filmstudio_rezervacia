-- Tabuľka pre pracovné hodiny zamestnankýň
CREATE TABLE IF NOT EXISTS employee_working_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Pondelok, 6 = Nedeľa
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_working BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(employee_id, day_of_week)
);

-- Tabuľka pre špeciálne dni (override defaultných otváracích hodín)
CREATE TABLE IF NOT EXISTS special_days (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    start_time TIME,
    end_time TIME,
    is_closed BOOLEAN DEFAULT false,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS policies
ALTER TABLE employee_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_days ENABLE ROW LEVEL SECURITY;

-- Všetci môžu čítať pracovné hodiny
CREATE POLICY "Anyone can view employee working hours" ON employee_working_hours FOR SELECT USING (true);
CREATE POLICY "Anyone can view special days" ON special_days FOR SELECT USING (true);

-- Len admin môže upravovať
CREATE POLICY "Admin can manage employee working hours" ON employee_working_hours FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admin can manage special days" ON special_days FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Aktualizuj working_hours tabuľku - pridaj default flag
ALTER TABLE working_hours ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT true;

-- Vloženie defaultných otváracích hodín (Pondelok-Piatok 8:00-18:00)
INSERT INTO working_hours (day_of_week, start_time, end_time, is_open, is_default)
VALUES 
    (0, '08:00', '18:00', true, true), -- Pondelok
    (1, '08:00', '18:00', true, true), -- Utorok
    (2, '08:00', '18:00', true, true), -- Streda
    (3, '08:00', '18:00', true, true), -- Štvrtok
    (4, '08:00', '18:00', true, true), -- Piatok
    (5, '09:00', '14:00', true, true), -- Sobota
    (6, '00:00', '00:00', false, true) -- Nedeľa - zatvorené
ON CONFLICT DO NOTHING;
