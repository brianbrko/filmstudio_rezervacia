-- Tabuľka používateľov (rozšírenie Supabase Auth)
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabuľka zamestnankýň
CREATE TABLE employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabuľka služieb
CREATE TABLE services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabuľka rezervácií
CREATE TABLE reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    employee_id UUID NOT NULL REFERENCES employees(id),
    service_id UUID NOT NULL REFERENCES services(id),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabuľka pracovných hodín
CREATE TABLE working_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_open BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(day_of_week)
);

-- Vloženie zamestnankýň
INSERT INTO employees (name, position, is_active) VALUES
('Jana Nováková', 'Senior stylistka', true),
('Petra Horváthová', 'Stylistka', true),
('Lucia Kováčová', 'Junior stylistka', true);

-- Vloženie základných služieb
INSERT INTO services (name, description, price, duration_minutes) VALUES
('Dámsky strih', 'Profesionálny dámsky strih', 25.00, 60),
('Pánsky strih', 'Klasický pánsky strih', 15.00, 30),
('Farbenie', 'Kompletné farbenie vlasov', 45.00, 90),
('Úprava brady', 'Striž a úprava brady', 10.00, 20),
('Detský strih', 'Strih pre deti do 12 rokov', 12.00, 30);

-- Vloženie pracovných hodín (Pondelok-Piatok 9:00-17:00)
INSERT INTO working_hours (day_of_week, start_time, end_time, is_open) VALUES
(0, '00:00:00', '00:00:00', false), -- Nedeľa zatvorené
(1, '09:00:00', '17:00:00', true),  -- Pondelok
(2, '09:00:00', '17:00:00', true),  -- Utorok
(3, '09:00:00', '17:00:00', true),  -- Streda
(4, '09:00:00', '17:00:00', true),  -- Štvrtok
(5, '09:00:00', '17:00:00', true),  -- Piatok
(6, '00:00:00', '00:00:00', false); -- Sobota zatvorené

-- Index pre rýchlejšie vyhľadávanie
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_employee ON reservations(employee_id);

-- RLS Politiky
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;

-- Politiky pre user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
FOR INSERT WITH CHECK (true);

-- Politiky pre employees (všetci môžu čítať)
CREATE POLICY "Anyone can view employees" ON employees
FOR SELECT USING (true);

-- Politiky pre services (všetci môžu čítať)
CREATE POLICY "Anyone can view services" ON services
FOR SELECT USING (true);

-- Politiky pre reservations
CREATE POLICY "Users can view own reservations" ON reservations
FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Users can create reservations" ON reservations
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update reservations" ON reservations
FOR UPDATE USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can delete reservations" ON reservations
FOR DELETE USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Politiky pre working_hours (všetci môžu čítať)
CREATE POLICY "Anyone can view working hours" ON working_hours
FOR SELECT USING (true);
