# Špecifické pracovné hodiny pre zamestnankyne

## Popis funkcionality

Táto funkcionalita umožňuje administrátorovi nastaviť špecifické pracovné hodiny pre jednotlivé zamestnankyne na konkrétne dni, ktoré prepisujú (override) ich pravidelné pracovné hodiny.

## Použitie

### V admin kalendári:

1. **Kliknite na sivé pole** (zatvorené/nepracuje) pri konkrétnej zamestnankynii
2. **Vyberte si možnosť**:
   - **Zmeniť pravidelnú pracovnú dobu**: Presmeruje vás na stránku pracovných hodín kde môžete upraviť pravidelné hodiny pre celý týždeň
   - **Zmeniť len pre tento deň**: Umožní nastaviť pracovné hodiny len pre aktuálne vybraný deň

### Pri zmene hodín pre konkrétny deň:

- **Checkbox "Nepracuje tento deň"**: Označte ak zamestnankyňa tento deň nepracuje vôbec
- **Začiatok/Koniec**: Nastavte špecifické pracovné hodiny pre tento deň (napríklad 10:00 - 15:00)

## Databázová schéma

### Tabuľka: `employee_working_hours`

```sql
CREATE TABLE employee_working_hours (
    id UUID PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id),
    date DATE NOT NULL,
    start_time TIME,  -- NULL = nepracuje
    end_time TIME,    -- NULL = nepracuje
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(employee_id, date)
);
```

### Ako to funguje:

1. Aplikácia najprv načíta pravidelné pracovné hodiny z `working_hours` tabuľky (podľa dňa v týždni)
2. Potom skontroluje či existuje záznam v `employee_working_hours` pre konkrétnu zamestnankyu a dátum
3. Ak existuje, použije tieto špecifické hodiny namiesto defaultných
4. Ak je `start_time` a `end_time` NULL, znamená to že zamestnankyňa tento deň nepracuje

## Inštalácia

1. Otvorte Supabase SQL Editor
2. Spustite SQL skript zo súboru `employee-specific-hours.sql`
3. Skontrolujte že tabuľka bola vytvorená a RLS politiky sú aktívne

## Príklady použitia

### Zamestnankyňa má dovolenku:
- Kliknite na sivé pole v kalendári
- Označte checkbox "Nepracuje tento deň"
- Uložte → V databáze sa uloží záznam s `start_time=NULL`, `end_time=NULL`

### Zamestnankyňa príde neskôr:
- Kliknite na sivé pole v kalendári  
- Zadajte začiatok: 12:00, koniec: 18:00
- Uložte → Tento deň bude pracovať 12:00-18:00 namiesto bežných hodín

### Návrat k pravidelným hodinám:
- Vymažte záznam z `employee_working_hours` pre konkrétny deň
- Alebo upravte cez UI (v budúcnosti možno pridať tlačidlo "Vrátiť na default")

## Bezpečnosť (RLS Policies)

- ✅ Všetci používatelia môžu **čítať** pracovné hodiny (potrebné pre zobrazenie voľných termínov)
- ✅ Len **admini** môžu **vytvárať, upravovať a mazať** špecifické hodiny
- ✅ Automatické mazanie pri vymazaní zamestnankyne (`ON DELETE CASCADE`)
