# Oprava validácie pracovných hodín v rezervačnom systéme

## Problém
Zákazníci si mohli rezervovať termíny aj keď zamestnankyňa nepracovala. Systém nevalidoval správne všetky vrstvy pracovných hodín (celkové hodiny, hodiny zamestnankýň, sviatky, špecifické dni).

## Riešenie

### 1. Vytvorená centralizovaná logika pracovných hodín
**Súbor:** `lib/workingHours.ts`

Vytvorená funkcia `getEmployeeWorkingHoursForDate()` ktorá implementuje správnu prioritu kontroly:
1. **special_days** - špeciálne dni / sviatky (celý salón)
2. **employee_day_overrides** - špecifické hodiny na konkrétny deň pre zamestnanca
3. **employee_working_hours** - pravidelné týždenné hodiny zamestnanca
4. **working_hours** - defaultné otváracie hodiny salónu

### 2. Opravená frontend validácia
**Súbor:** `app/calendar/page.tsx`

#### Importovaná centralizovaná funkcia:
```typescript
import { getEmployeeWorkingHoursForDate } from '@/lib/workingHours'
```

#### Upravená funkcia `getEmployeeWorkingHours()`:
- Teraz používa centralizovanú funkciu namiesto vlastnej implementácie
- Zabezpečuje konzistentnú logiku vo všetkých častiach aplikácie

#### Pridaná validácia v `confirmMove()`:
- Kontrola pracovných hodín pri drag & drop vytváraní rezervácie
- Kontrola pracovných hodín pri presúvaní rezervácie
- Zobrazuje užívateľsky prívetivé chybové hlášky

#### Pridaná validácia v booking modal:
- Kontrola pracovných hodín pred vytvorením rezervácie
- Kontrola kolízií s existujúcimi rezerváciami
- Zabránenie vytvoreniu rezervácie mimo pracovných hodín

### 3. Pridaná backend validácia v databáze
**Súbor:** `supabase/add-reservation-validation.sql`

Vytvorený databázový trigger `validate_reservation_working_hours()` ktorý:
- Automaticky validuje všetky INSERT a UPDATE operácie na tabuľke `reservations`
- Kontroluje pracovné hodiny podľa tej istej priority ako frontend
- Zabezpečuje, že ani priame API volanie nemôže obísť validáciu
- Vhodne rozlišuje medzi súkromnými a normálnymi rezerváciami
- Vracia jasné chybové hlášky pri pokuse o neplatnú rezerváciu

#### Kontrolované scenáre:
- ✅ Zamestnankyňa nepracuje v daný deň
- ✅ Rezervácia je mimo pracovných hodín zamestnankyne
- ✅ Salón je zatvorený (špeciálny deň)
- ✅ Zamestnankyňa má špecifické hodiny na daný deň (override)
- ✅ Rešpektuje všetky 4 vrstvy pracovných hodín

## Testovanie

### Spustenie build testu:
```bash
npm run build
```
✅ Build prebehol úspešne

### Odporúčané manuálne testy:
1. Skúste vytvoriť rezerváciu v čase, keď zamestnankyňa nepracuje
2. Skúste vytvoriť rezerváciu mimo pracovných hodín
3. Vytvorte špecifický deň (override) a skúste rezervovať
4. Nastavte špeciálny deň (sviatok) a skúste rezervovať
5. Skúste presunúť rezerváciu mimo pracovných hodín

## Závislosti medzi vrstvami pracovných hodín

```
Priorita (najvyššia → najnižšia):
1. special_days       → Ovplyvňuje celý salón na daný deň
2. employee_day_overrides → Špecificky pre zamestnanca na daný deň
3. employee_working_hours → Pravidelné hodiny zamestnanca (deň v týždni)
4. working_hours      → Defaultné otváracie hodiny salónu
```

## Súbory upravené/vytvorené:
- ✅ `lib/workingHours.ts` - Vytvorený (centralizovaná logika)
- ✅ `app/calendar/page.tsx` - Upravený (pridaná validácia)
- ✅ `supabase/add-reservation-validation.sql` - Vytvorený (backend validácia)

## Bezpečnostné zlepšenia:
- ✅ Frontend validácia pri všetkých možnostiach vytvorenia rezervácie
- ✅ Backend validácia na databázovej úrovni (trigger)
- ✅ Zabránenie obídeniu validácie priamym API volaním
- ✅ Konzistentná logika medzi frontend a backend
