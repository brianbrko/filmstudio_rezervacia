-- Pridanie validácie rezervácií voči pracovným hodinám
-- Zabezpečí, že rezervácie sa dajú vytvoriť len v rámci pracovných hodín zamestnanca

-- Funkcia na kontrolu či je rezervácia v pracovných hodinách
CREATE OR REPLACE FUNCTION validate_reservation_working_hours()
RETURNS TRIGGER AS $$
DECLARE
  v_day_of_week INTEGER;
  v_start_time TIME;
  v_end_time TIME;
  v_is_working BOOLEAN := false;
  v_reservation_end_time TIME;
  v_service_duration INTEGER;
  v_special_day RECORD;
  v_day_override RECORD;
  v_emp_hours RECORD;
  v_default_hours RECORD;
BEGIN
  -- Kontrola, či nie je rezervácia v minulosti
  IF NEW.reservation_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Nemôžete rezervovať termín v minulosti';
  END IF;
  
  -- Ak je dnes, skontroluj aj čas
  IF NEW.reservation_date = CURRENT_DATE THEN
    IF NEW.reservation_time < CURRENT_TIME THEN
      RAISE EXCEPTION 'Nemôžete rezervovať čas, ktorý už prešiel';
    END IF;
  END IF;

  -- Pre súkromné termíny (is_private = true) použiť end_time priamo
  IF NEW.is_private AND NEW.end_time IS NOT NULL THEN
    v_reservation_end_time := NEW.end_time;
  ELSE
    -- Pre normálne rezervácie vypočítať end_time zo služby
    SELECT duration_minutes INTO v_service_duration
    FROM services
    WHERE id = NEW.service_id;
    
    IF v_service_duration IS NULL THEN
      RAISE EXCEPTION 'Služba nebola nájdená';
    END IF;
    
    v_reservation_end_time := NEW.reservation_time + (v_service_duration || ' minutes')::INTERVAL;
  END IF;
  
  -- Vypočítaj deň v týždni (0 = Pondelok, 6 = Nedeľa)
  v_day_of_week := EXTRACT(DOW FROM NEW.reservation_date);
  v_day_of_week := CASE WHEN v_day_of_week = 0 THEN 6 ELSE v_day_of_week - 1 END;
  
  -- 1. PRIORITA: Kontrola special_days (špeciálne dni pre celý salón)
  SELECT * INTO v_special_day
  FROM special_days
  WHERE date = NEW.reservation_date
  LIMIT 1;
  
  IF FOUND THEN
    IF v_special_day.is_closed OR v_special_day.start_time IS NULL OR v_special_day.end_time IS NULL THEN
      RAISE EXCEPTION 'Kaderníctvo je v tento deň zatvorené (špeciálny deň)';
    END IF;
    
    v_start_time := v_special_day.start_time;
    v_end_time := v_special_day.end_time;
    v_is_working := true;
  END IF;
  
  -- 2. PRIORITA: Kontrola employee_day_overrides (špecifické hodiny na daný deň)
  IF NOT FOUND THEN
    SELECT * INTO v_day_override
    FROM employee_day_overrides
    WHERE employee_id = NEW.employee_id AND specific_date = NEW.reservation_date
    LIMIT 1;
    
    IF FOUND THEN
      IF v_day_override.start_time IS NULL OR v_day_override.end_time IS NULL THEN
        RAISE EXCEPTION 'Zamestnankyňa nepracuje v tento deň (override)';
      END IF;
      
      v_start_time := v_day_override.start_time;
      v_end_time := v_day_override.end_time;
      v_is_working := true;
    END IF;
  END IF;
  
  -- 3. PRIORITA: Kontrola employee_working_hours (pravidelné hodiny zamestnanca)
  IF NOT FOUND THEN
    SELECT * INTO v_emp_hours
    FROM employee_working_hours
    WHERE employee_id = NEW.employee_id AND day_of_week = v_day_of_week
    LIMIT 1;
    
    IF FOUND THEN
      IF NOT v_emp_hours.is_working THEN
        RAISE EXCEPTION 'Zamestnankyňa nepracuje v tento deň v týždni';
      END IF;
      
      v_start_time := v_emp_hours.start_time;
      v_end_time := v_emp_hours.end_time;
      v_is_working := true;
    END IF;
  END IF;
  
  -- 4. PRIORITA: Kontrola working_hours (defaultné otváracie hodiny)
  IF NOT FOUND THEN
    SELECT * INTO v_default_hours
    FROM working_hours
    WHERE day_of_week = v_day_of_week
    LIMIT 1;
    
    IF FOUND THEN
      IF NOT v_default_hours.is_open THEN
        RAISE EXCEPTION 'Kaderníctvo je v tento deň zatvorené';
      END IF;
      
      v_start_time := v_default_hours.start_time;
      v_end_time := v_default_hours.end_time;
      v_is_working := true;
    END IF;
  END IF;
  
  -- Ak sa nenašli žiadne pracovné hodiny
  IF NOT v_is_working THEN
    RAISE EXCEPTION 'Neboli definované pracovné hodiny pre tento deň';
  END IF;
  
  -- Kontrola či je rezervácia v rámci pracovných hodín
  IF NEW.reservation_time < v_start_time OR v_reservation_end_time > v_end_time THEN
    RAISE EXCEPTION 'Rezervácia je mimo pracovných hodín (%, hodiny: % - %)', 
      NEW.reservation_time, v_start_time, v_end_time;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vytvor trigger pre INSERT
CREATE TRIGGER validate_reservation_before_insert
BEFORE INSERT ON reservations
FOR EACH ROW
EXECUTE FUNCTION validate_reservation_working_hours();

-- Vytvor trigger pre UPDATE (len ak sa menia dôležité polia)
CREATE TRIGGER validate_reservation_before_update
BEFORE UPDATE ON reservations
FOR EACH ROW
WHEN (
  NEW.employee_id IS DISTINCT FROM OLD.employee_id OR
  NEW.reservation_date IS DISTINCT FROM OLD.reservation_date OR
  NEW.reservation_time IS DISTINCT FROM OLD.reservation_time OR
  NEW.service_id IS DISTINCT FROM OLD.service_id OR
  NEW.end_time IS DISTINCT FROM OLD.end_time
)
EXECUTE FUNCTION validate_reservation_working_hours();

-- Poznámka: Tento trigger zabezpečí, že rezervácie sa môžu vytvoriť len v rámci pracovných hodín
-- Priorita kontroly: special_days > employee_day_overrides > employee_working_hours > working_hours
