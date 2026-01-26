# 🔧 Návod na opravu Drag & Drop problému

## Problém
Keď presúvate rezervačné bloky v kalendári, blok zmizne a neobjaví sa na novom mieste.

## Riešenie

### Krok 1: Vypnúť RLS na rezerváciách
1. Choďte na https://supabase.com a prihláste sa
2. Otvorte váš projekt
3. V ľavom menu kliknite na **SQL Editor**
4. Vytvorte nový query a vložte tento kód:

```sql
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
```

5. Kliknite **RUN** (alebo stlačte Ctrl+Enter)
6. Mali by ste vidieť hlášku: "Success. No rows returned"

### Krok 2: Overiť zmeny v aplikácii
1. Otvorte terminál v projekte
2. Reštartujte server (ak beží, ukončite ho Ctrl+C a spustite znova):
```bash
npm run dev
```

3. Otvorte http://localhost:3000 v prehliadači
4. Prihláste sa
5. Choďte do kalendára
6. Otvorte DevTools (F12) → Console tab
7. Skúste presunúť rezerváciu alebo vytvoriť novú

### Krok 3: Sledovať konzolu
Po dropnutí bloku by ste mali vidieť v konzole:
- `📦 Drop:` - Informácia o tom, čo sa draguje
- `🔄 Presúvam rezerváciu...` alebo `➕ Vytváram novú rezerváciu...`
- `✅ Rezervácia presunutá:` alebo `✅ Rezervácia vytvorená:`
- `🔄 Načítavam dáta...`
- `✅ Načítané rezervácie: X`

Ak vidíte `❌` alebo `Error:`, skopírujte celú chybovú hlášku.

## Čo bolo opravené v kóde

### calendar/page.tsx
1. ✅ Pridané console.log() výpisy pre debugging
2. ✅ Zmenená funkcia `getReservationAtSlot` na `getReservationStartingAt` - vráti iba rezervácie ktoré ZAČÍNAJÚ v danom slote
3. ✅ Pridaný `.select()` do INSERT/UPDATE queries aby sme videli výsledok
4. ✅ Lepšia detekcia kolízií pri presúvaní
5. ✅ Await na fetchData() pre zabezpečenie refresh
6. ✅ Lepšie vizuálne feedback (emoji, texty)

## Ak to stále nefunguje

### Skontrolujte RLS politiky
V Supabase → SQL Editor spustite:
```sql
-- Zistite či je RLS aktívne
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'reservations';
```

Malo by vrátiť `rowsecurity = false`. Ak je `true`, RLS je stále zapnuté.

### Alternatívne riešenie (s RLS)
Ak chcete ponechať RLS zapnuté, spustite v Supabase SQL Editor:

```sql
-- Najprv zmažte existujúce politiky
DROP POLICY IF EXISTS "Users can view own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can create reservations" ON reservations;
DROP POLICY IF EXISTS "Admins can update reservations" ON reservations;
DROP POLICY IF EXISTS "Admins can delete reservations" ON reservations;

-- Vytvorte nové, voľnejšie politiky
CREATE POLICY "Anyone authenticated can view reservations" 
ON reservations FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their reservations" 
ON reservations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and admins can update reservations" 
ON reservations FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users and admins can delete reservations" 
ON reservations FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
```

## Testovacia stránka
Môžete navštíviť http://localhost:3000/test pre otestovanie databázového pripojenia a RLS politík.

## Kontaktné info
Ak problém pretrváva, pošlite screenshot z Console (F12) s chybovými hláškami.
