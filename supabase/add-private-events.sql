-- Pridanie stĺpca pre súkromné termíny
ALTER TABLE reservations 
ADD COLUMN is_private BOOLEAN DEFAULT false;

-- Pridanie stĺpca pre čas ukončenia (pre súkromné termíny)
ALTER TABLE reservations 
ADD COLUMN end_time TIME;

-- Aktualizácia CHECK constraint pre service_id aby mohol byť NULL pre súkromné termíny
ALTER TABLE reservations 
ALTER COLUMN service_id DROP NOT NULL;

-- Index pre súkromné termíny
CREATE INDEX idx_reservations_is_private ON reservations(is_private);

-- Pridanie komentárov pre jasnosť
COMMENT ON COLUMN reservations.is_private IS 'Označuje či je rezervácia súkromný termín admina';
COMMENT ON COLUMN reservations.end_time IS 'Čas ukončenia pre súkromné termíny (ak je NULL, počíta sa z duration_minutes služby)';
