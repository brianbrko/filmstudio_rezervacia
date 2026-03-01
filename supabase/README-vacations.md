# Systém dovoleniek zamestnankýň

## Prehľad

Systém dovoleniek umožňuje adminovi zadať dovolenky pre zamestnankyne. Počas dovolenky nemôže zákazník rezervovать termín u danej zamestnankyne.

## Funkcie

### Pre adminov
- ✅ Pridávanie dovoleniek (od kedy do kedy, ktorá zamestnankyna)
- ✅ Mazanie dovoleniek
- ✅ Zobrazenie všetkých dovoleniek
- ✅ Pridanie poznámky k dovolenke (napr. "Letná dovolenka")

### Pre zamestnancov
- ✅ Prezeranie dovoleniek (read-only režim)

### Pre zákazníkov
- ✅ Automatická kontrola - nemožno rezervovať termín počas dovolenky
- ✅ Dovolenky sú transparentne zahrnené do dostupných časových slotov

## Priorita kontroly

Systém kontroluje dostupnosť zamestnankyne v tomto poradí:

1. **special_days** - Špeciálne dni (celé kaderníctvo zatvorené)
2. **employee_vacations** - Dovolenka zamestnankyne ⭐ NOVÉ
3. **employee_day_overrides** - Špecifické hodiny na konkrétny deň
4. **employee_working_hours** - Pracovné hodiny zamestnankyne podľa dňa v týždní
5. **working_hours** - Defaultné otváracie hodiny kaderníctva

## Ako používať

### Pridanie dovolenky

1. Prejdite na **Správa pracovných hodín** → **Dovolenky**
2. Kliknite na **➕ Pridať dovolenku**
3. Vyplňte formulár:
   - Vyberte zamestnankyňu
   - Zadajte začiatok dovolenky (dátum)
   - Zadajte koniec dovolenky (dátum)
   - Voliteľne pridajte poznámku
4. Kliknite **Uložiť**

### Mazanie dovolenky

1. V zozname dovoleniek kliknite na **🗑️ Zmazať** pri konkrétnej dovolenke
2. Potvrďte zmazanie

## Technická implementácia

### Databázová tabuľka

```sql
CREATE TABLE employee_vacations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);
```

### Validácia rezervácií

Pri vytváraní rezervácie sa kontroluje:

```typescript
const onVacation = employeeVacations.find(
  vacation => 
    vacation.employee_id === employeeId &&
    vacation.start_date <= date &&
    vacation.end_date >= date
)

if (onVacation) {
  return {
    isWorking: false,
    startTime: null,
    endTime: null,
    reason: 'on_vacation'
  }
}
```

### Súbory ktoré boli upravené

1. **Databáza**
   - `supabase/employee-vacations.sql` - SQL schéma a dokumentácia

2. **Validačná logika**
   - `lib/workingHours.ts` - Pridaná kontrola dovoleniek

3. **Admin rozhranie**
   - `app/working-hours/page.tsx` - Nová karta "Dovolenky"

4. **Kalendár a rezervácie**
   - `app/calendar/page.tsx` - Aktualizované volania validačnej funkcie
   - `app/dashboard/page.tsx` - Aktualizované volania validačnej funkcie

## Príklady použitia

### Príklad 1: Letná dovolenka
- Zamestnankyna: Jana Nováková
- Od: 1.7.2026
- Do: 14.7.2026
- Poznámka: "Letná dovolenka"

### Príklad 2: Krátka dovolenka
- Zamestnankyna: Mária Horváthová
- Od: 15.8.2026
- Do: 15.8.2026
- Poznámka: "Osobné voľno"

## Bezpečnosť (RLS Policies)

- **Prezeranie**: Admin a zamestnanci môžu vidieť všetky dovolenky
- **Pridávanie**: Len admin môže pridávať dovolenky
- **Úpravy**: Len admin môže upravovať dovolenky
- **Mazanie**: Len admin môže mazať dovolenky

## Dôležité upozornenia

⚠️ **Automatická kontrola**: Keď zákazník vytvára rezerváciu, systém automaticky kontroluje dovolenky. Nemusíte robiť žiadne manuálne kroky.

⚠️ **Dátumové rozpätie**: Koniec dovolenky musí byť rovnaký alebo neskorší ako začiatok.

⚠️ **Cascade delete**: Ak zmažete zamestnankyňu, všetky jej dovolenky sa automaticky zmažú.

## Otázky a odpovede

**Q: Čo sa stane, ak má zamestnankyna dovolenku, ale existuje špeciálny deň?**  
A: Špeciálne dni majú vyššiu prioritu. Ak je kaderníctvo zatvorené (special_day), netreba kontrolovať dovolenky.

**Q: Môže zamestnankyna sama pridať svoju dovolenku?**  
A: Nie, len admin môže pridávať dovolenky. Zamestnankyna môže len prezerať existujúce dovolenky.

**Q: Čo ak dovolenka sa prekrýva s už existujúcimi rezerváciami?**  
A: Systém to nedovolí automaticky blokovať. Admin by mal najprv skontrolovať rezervácie a prípadne ich presunúť alebo zrušiť pred pridaním dovolenky.

**Q: Môžem pridať dovolenku do minulosti?**  
A: Áno, systém to umožňuje pre účtovné a dokumentačné účely.
