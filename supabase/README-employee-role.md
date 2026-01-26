# Inštalácia role zamestnanec

## Kroky:

1. Otvorte Supabase Dashboard → SQL Editor
2. Skopírujte a spustite obsah súboru `add-employee-role.sql`
3. Kliknite "Run"

## Čo sa zmení:

- Pridá sa nová rola **"employee"** (zamestnanec) do systému
- Systém bude mať 3 role:
  - `customer` - Zákazník
  - `employee` - Zamestnanec
  - `admin` - Administrátor

## Funkcie rolí:

### 👤 Zákazník (customer):
- Môže vytvárať vlastné rezervácie
- Vidí len svoje osobné údaje na rezerváciách
- Môže upravovať len svoje rezervácie

### 💼 Zamestnanec (employee):
- **Vidí všetky osobné údaje** na všetkých rezerváciách (mená, telefóny, poznámky)
- **Môže upravovať a presúvať všetky rezervácie** (nie len svoje)
- Má prístup k kalendáru a správe rezervácií
- **NEMÔŽE**: pristupovať k službám, pracovným hodinám, štatistikám, správe používateľov, vytvárať súkromné termíny

### 👑 Admin (admin):
- **Plný prístup** k všetkým funkciám
- Môže spravovať služby, pracovné hodiny, štatistiky
- Môže spravovať používateľov a meniť im role
- Môže vytvárať súkromné termíny
- Vidí a upravuje všetky rezervácie

## Nastavenie role zamestnanec:

1. Prihlás sa ako admin
2. Choď do sekcie **"👥 Používatelia"**
3. Pri používateľovi, ktorého chceš nastaviť ako zamestnanca:
   - V dropdown menu vyber **"💼 Zamestnanec"**
4. Používateľ bude mať okamžite rozšírené oprávnenia

## Bezpečnosť:

- Admin nemôže zmeniť svoju vlastnú rolu
- Všetky admin stránky (služby, štatistiky, používatelia atď.) sú chránené pred prístupom zamestnancov
- RLS politiky v databáze zostávajú zachované
