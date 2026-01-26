# Inštalácia funkcionalit súkromných termínov

## Kroky:

1. Otvorte Supabase Dashboard → SQL Editor
2. Skopírujte a spustite obsah súboru `add-private-events.sql`
3. Kliknite "Run" alebo stlačte Ctrl+Enter

## Čo sa zmení:

- Pridá sa stĺpec `is_private` do tabuľky `reservations` (boolean, default false)
- Pridá sa stĺpec `end_time` do tabuľky `reservations` (TIME, nullable)
- `service_id` stĺpec bude môcť byť NULL (pre súkromné termíny)
- Vytvorí sa index pre rýchlejšie vyhľadávanie súkromných termínov

## Funkcie:

### Pre admina:
- Nové tlačidlo "🔒 Súkromný termín" pod tlačidlom "Nová rezervácia"
- Možnosť vytvoriť blok v kalendári bez zákazníka a služby
- Polia: Zamestnankyňa, Dátum, Čas od-do, Poznámka

### Zobrazenie:
- Súkromné termíny majú čiernu farbu (ako admin rezervácie)
- Na blokoch sa zobrazuje:
  - 🔒 Súkromný termín
  - Poznámka (ak je vyplnená)
  - Dátum
  - Čas od kedy do kedy

### Bezpečnosť:
- Iba admin môže vytvárať súkromné termíny
- Kontrola kolízií funguje aj pre súkromné termíny
- Kontrola pracovných hodín platí aj pre súkromné termíny
