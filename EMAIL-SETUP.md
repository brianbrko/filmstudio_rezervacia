# Email Notifikácie pre Rezervácie

Tento systém odosiela automatické email potvrdenia zákazníkom a notifikácie správcovi vždy keď sa vytvorí nová rezervácia.

## Setup

### 1. Resend API Key
1. Choď na https://resend.com
2. Zaregistruj sa alebo prihlásiť sa
3. V sekcii **API Keys** skopíruj svoj API kľúč
4. V `.env.local` nahraď `re_YOUR_RESEND_API_KEY_HERE` svojou skutočnou hodnotou

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_EMAIL_FROM=noreply@filmstudiorezervacie.online
RESEND_ADMIN_EMAIL=admin@filmstudiorezervacie.online
```

### 2. Resend Domain Verification
1. V Resend console v sekcii **Domains** klikni **Add Domain**
2. Pridaj `filmstudiorezervacie.online`
3. Resend ti poskytne DNS záznamy, ktoré musíš pridať vo WebSupporte:
   - CNAME záznam pre verifikáciu
4. Počkaj na verifikáciu (zvyčajne pár minút)

### 3. Npm balíčky
Resend je už nainštalovaný. Ak potrebuješ aktualizovať:
```bash
npm install resend@latest
```

## Použitie

### V React Komponente (Front-end)

```typescript
import { useCreateReservation } from '@/app/hooks/useCreateReservation';
import { useUser } from '@supabase/auth-helpers-react';

export function ReservationForm() {
  const { user } = useUser();
  const { createReservation, isLoading, error, success } = useCreateReservation({
    onSuccess: (message) => {
      console.log('Úspech:', message);
      // Zobraz toast notifikáciu
    },
    onError: (error) => {
      console.log('Chyba:', error);
      // Zobraz error notifikáciu
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Prosím prihláste sa');
      return;
    }

    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      
      await createReservation({
        userId: user.id,
        employeeId: formData.get('employeeId') as string,
        serviceId: formData.get('serviceId') as string,
        reservationDate: formData.get('reservationDate') as string,
        reservationTime: formData.get('reservationTime') as string,
      });

      // Resetni form, naviguj ďalej atď.
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Spracovania...' : 'Vytvoriť rezerváciu'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>Rezervácia bola vytvorená! Email bol poslaný.</p>}
    </form>
  );
}
```

## Pozostávajúce časti

### Backend API
- **POST `/api/reservations/create`** - Vytvorí rezerváciu a pošle emaily
  - Validuje vstup
  - Vytvorí záznam v `reservations` tabuľke
  - Posila potvrdenie na email zákazníka
  - Posila notifikáciu správcovi

### Email Templates

#### Zákazník dostane:
- ✨ Pekne formátované potvrdenie
- 📋 Detaily rezervácie (služba, čas, cena, stylistka)
- ❓ Pokyny čo ďalej
- 📞 Kontaktné údaje salónu

#### Správca dostane:
- 📌 Notifikácia o novej rezervácii
- 👤 Meno a email zákazníka
- 💰 Cena a detaily služby
- ⏰ Dátum a čas rezervácie

## Testovanie

### Testovací mode (Dev)
Resend umožňuje testovanie bez reálneho posielania:

```bash
# Spustí dev server s hot-reload
npm run dev
```

V `development` mode-e:
- Emails sú "odoslané" bez chyby
- Skontroluj Network tab v Dev Tools na API request
- Skontroluj Console na debug logy

### Produkcia
Keď deployme na Vercel:
1. Nastav `RESEND_API_KEY` v Vercel Environment Variables
2. Skontroluj Resend dashboard na analytics

## Troubleshooting

### "RESEND_API_KEY is undefined"
- Skontroluj `.env.local` - je tam kľúč?
- Reštartuj dev server: `npm run dev`
- V Vercel: Skontroluj Environment Variables

### "Email sending failed: 422"
- Skontroluj či je domain verifikovaný v Resend
- Skontroluj `RESEND_EMAIL_FROM` - je to @vašadomena.online?

### "Chyba: Nie je možné zistiť email používateľa"
- Skontroluj či je `user_id` reálny
- Skontroluj RLS politiky na `reservations` tabuľke

## Budúce Optimalizácie

1. **Database Trigger** - Namiesto API route, použiť Supabase trigger na automatické poslanie emailu
2. **Email Templates v DB** - Uložiť customizované šablóny v databáze
3. **Email History** - Ukladať históriu poslaných emailov v tabuľke
4. **Resend Webhooks** - Trackuj delivery a bounces

## Files na Review

- `/lib/email.ts` - Email utility a templates
- `/app/api/reservations/create/route.ts` - API endpoint
- `/lib/reservationService.ts` - Client-side service
- `/app/hooks/useCreateReservation.ts` - React hook
