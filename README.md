# Rezervačný systém pre kaderníctvo

Moderná webová aplikácia pre rezerváciu termínov v kaderníctve s drag & drop kalendárom, postavená na Next.js a Supabase.

## 🚀 Funkcie

- 📅 **Drag & Drop kalendár**: Intuítívne presúvanie rezervácií medzi časmi a zamestnancami
- 🎯 **Služby**: Jednoduché vytváranie rezervácií potiahnutím služby na časový slot
- 👥 **Viacerí zamestnanci**: Prehľadný kalendár s 3 stylistkami
- 👤 **Autentifikácia**: Prihlásenie a registrácia zákazníkov
- 👑 **Admin režim**: Admin kód "2589" pre plné oprávnenia
- ⚡ **Real-time**: Okamžité zobrazenie zmien v kalendári
- 🎨 **Moderný dizajn**: Čierno-biela farebná schéma s bold fontami
- 📱 **Responzívny dizajn**: Funguje na všetkých zariadeniach

## 🛠️ Technológie

- **Next.js 14** - React framework s App Router
- **TypeScript** - Typová bezpečnosť
- **Tailwind CSS** - Moderný styling
- **Supabase** - PostgreSQL databáza, autentifikácia a RLS
- **HTML5 Drag & Drop API** - Natívne drag & drop

## 📦 Inštalácia

1. Nainštalujte závislosti:
```bash
npm install
```

2. Vytvorte Supabase projekt na [supabase.com](https://supabase.com)

3. Spustite SQL skript zo súboru `supabase/schema.sql` v Supabase SQL editore

4. **DÔLEŽITÉ**: Vypnite RLS na rezerváciách (pre jednoduchšie testovanie):
```sql
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
```

5. Vypnite email confirmation v Supabase:
   - Authentication → Settings → "Confirm email" → OFF

6. Vytvorte `.env.local` súbor s Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

7. Spustite vývojový server:
```bash
npm run dev
```

8. Otvorte [http://localhost:3000](http://localhost:3000) v prehliadači

## 🐛 Riešenie problémov

Ak sa bloky v kalendári nezobrazujú po presune, pozrite [FIXING-DRAG-DROP.md](FIXING-DRAG-DROP.md)

## 📁 Štruktúra projektu

```
rezervacie/
├── app/
│   ├── admin/          # Admin panel (zoznam všetkých rezervácií)
│   ├── calendar/       # Hlavný drag & drop kalendár
│   ├── dashboard/      # Dashboard (redirect na calendar)
│   ├── login/          # Prihlásenie
│   ├── register/       # Registrácia (admin kód: 2589)
│   ├── test/           # Testovacia stránka DB pripojenia
│   ├── globals.css     # Globálne štýly
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Domovská stránka (login/register)
├── lib/
│   ├── supabase.ts        # Supabase klient
│   └── database.types.ts  # TypeScript typy pre databázu
├── supabase/
│   ├── schema.sql      # Kompletná databázová schéma
│   └── fix-rls.sql     # Script pre opravu RLS politík
└── package.json
```

## 🗄️ Databázová schéma

### Tabuľky:
- **user_profiles** - Profily používateľov (customer/admin)
- **employees** - Zamestnankyne kaderníctva
- **services** - Služby kaderníctva (strihy, farbenie, atď.)
- **reservations** - Rezervácie s väzbou na employee_id, service_id, user_id
- **working_hours** - Pracovné hodiny (deň v týždni, otváracie hodiny)

## 🎨 Služby

Predvolené služby:
- ✂️ Dámske strihy - 25€ (60 min = 2 sloty)
- ✂️ Pánske strihy - 15€ (30 min = 1 slot)
- 🎨 Farbenie - 45€ (90 min = 3 sloty)
- 💆 Úprava brady - 10€ (20 min = 1 slot)
- 👶 Detské strihy - 12€ (30 min = 1 slot)

## 📝 Použitie

### Prvé prihlásenie:
1. Choďte na [http://localhost:3000](http://localhost:3000)
2. Kliknite na "Registrácia"
3. Pre admina zadajte admin kód: **2589**
4. Pre zákazníka nechajte pole prázdne

### Kalendár:
1. Po prihlásení sa zobrazí kalendár s časmi 9:00-17:00
2. Vľavo sú služby - potiahnite službu na voľný slot
3. Černé bloky = vaše rezervácie (admin vidí všetky)
4. Sivé bloky = cudzie rezervácie
5. Presúvajte rezervácie medzi časmi a zamestnancami
6. Hover na blok → tlačidlo ✕ pre vymazanie

### Admin panel:
1. Tlačidlo "📋 Zoznam" v pravom hornom rohu
2. Zoznam všetkých rezervácií s filtrami
3. Možnosť filtrovať podľa stavu

## 🔐 Bezpečnosť

### Súčasné nastavenie (pre vývoj):
- RLS vypnuté na rezerváciách (ALTER TABLE reservations DISABLE ROW LEVEL SECURITY)
- Email confirmation vypnutý
- Admin kód "2589" hardcoded

### Pre produkciu:
- Zapnúť RLS s správnymi politikami (pozri `fix-rls.sql`)
- Zapnúť email confirmation
- Admin kód presunúť do env premenných
- Implementovať rate limiting
- Pridať email notifikácie

## 🧪 Testovanie

Testovacia stránka: [http://localhost:3000/test](http://localhost:3000/test)

Testuje:
- ✅ Pripojenie k Supabase
- ✅ Čítanie z employees, services, reservations
- ✅ INSERT/UPDATE/DELETE na reservations
- ✅ RLS politiky

## 📄 Licencia

MIT

## 🤝 Podpora

Pre otázky alebo problémy vytvorte issue v repozitári.
