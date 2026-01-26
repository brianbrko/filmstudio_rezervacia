-- Najprv vymazať všetky rezervácie (kvôli foreign key)
DELETE FROM reservations;

-- Potom vymazať staré služby
DELETE FROM services;

-- Pridať nové služby
INSERT INTO services (name, description, price, duration_minutes) VALUES
('Balíček pre Pánov Kombo', 'Brada, styling, strih, umytie', 23.00, 45),
('Brada (tvarovanie)', 'Tvarovanie brady', 8.00, 20),
('Pánsky strih + umytie', 'Klasický pánsky strih s umytím', 15.00, 30),
('Detský strih 1–12 rokov + umytie', 'Strih pre deti do 12 rokov', 10.00, 30),
('Detský strih 12 a viac rokov + umytie', 'Strih pre deti nad 12 rokov', 12.00, 30),
('Spoločenský účes', 'Profesionálny spoločenský účes', 45.00, 60),
('Regenerácia vlasov plus strih kombo!', 'Regeneračná kúra + strih', 48.00, 80),
('Air touch', 'Air touch farbenie', 117.00, 240),
('Úprava vlasov (žehlenie, vlny)', 'Styling vlasov', 34.00, 60),
('Sťahovanie farby (odfarbovanie)', 'Profesionálne odfarbenie', 115.00, 180),
('Balayage', 'Balayage technika', 103.00, 240),
('Farbenie', 'Klasické farbenie vlasov', 68.00, 120),
('Dámsky strih', 'Profesionálny dámsky strih', 26.00, 60),
('Melír', 'Melírovanie vlasov', 87.00, 180),
('Svadobný účes – Nevesta', 'Svadobný účes pre nevestu', 65.00, 90),
('Skúšobný účes – Nevesta', 'Skúšobný svadobný účes', 34.00, 90);
