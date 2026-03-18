import { NextResponse } from 'next/server';
import { sendReservationConfirmation, sendAdminNotification } from '@/lib/email';

export async function GET() {
  const logs: string[] = [];

  logs.push('=== TEST EMAIL ENDPOINT ===');
  logs.push(`Čas: ${new Date().toISOString()}`);

  // 1. Kontrola env premenných
  logs.push('');
  logs.push('--- 1. ENV PREMENNÉ ---');
  logs.push(`RESEND_API_KEY: ${process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 12) + '...' : '❌ CHÝBA!'}`);
  logs.push(`CONTACT_TO_EMAIL: ${process.env.CONTACT_TO_EMAIL || '❌ CHÝBA!'}`);
  logs.push(`CONTACT_FROM_EMAIL: ${process.env.CONTACT_FROM_EMAIL || '❌ CHÝBA!'}`);

  if (!process.env.RESEND_API_KEY) {
    logs.push('');
    logs.push('❌ RESEND_API_KEY nie je nastavený! Server nevidí env premenné.');
    logs.push('Reštartoval si dev server po zmene .env.local?');
    return NextResponse.json({ success: false, logs }, { status: 500 });
  }

  // 2. Test odoslania admin emailu
  logs.push('');
  logs.push('--- 2. POSIELAM ADMIN NOTIFIKÁCIU ---');

  const testData = {
    customerName: 'Test Zákazník',
    customerEmail: process.env.CONTACT_TO_EMAIL || 'briankalafut9@gmail.com',
    serviceTitle: 'Test Služba',
    servicePrice: 25.00,
    duration: 30,
    employeeName: 'Test Zamestnanec',
    reservationDate: new Date().toISOString().split('T')[0],
    reservationTime: '14:00:00',
    status: 'confirmed',
  };

  logs.push(`Dáta: ${JSON.stringify(testData, null, 2)}`);

  try {
    const adminResult = await sendAdminNotification(testData);
    logs.push(`Admin email výsledok: ${JSON.stringify(adminResult)}`);

    if (adminResult.success) {
      logs.push('✅ Admin notifikácia odoslaná úspešne!');
    } else {
      logs.push(`❌ Admin email ZLYHAL: ${JSON.stringify(adminResult.error)}`);
    }
  } catch (error: any) {
    logs.push(`❌ VÝNIMKA pri admin emaile: ${error.message}`);
    logs.push(`Stack: ${error.stack}`);
  }

  // 3. Test odoslania zákazníckeho emailu
  logs.push('');
  logs.push('--- 3. POSIELAM ZÁKAZNÍCKY EMAIL ---');

  try {
    const customerResult = await sendReservationConfirmation(testData);
    logs.push(`Zákaznícky email výsledok: ${JSON.stringify(customerResult)}`);

    if (customerResult.success) {
      logs.push('✅ Zákaznícky email odoslaný úspešne!');
    } else {
      logs.push(`❌ Zákaznícky email ZLYHAL: ${JSON.stringify(customerResult.error)}`);
    }
  } catch (error: any) {
    logs.push(`❌ VÝNIMKA pri zákazníckom emaile: ${error.message}`);
    logs.push(`Stack: ${error.stack}`);
  }

  logs.push('');
  logs.push('=== KONIEC TESTU ===');

  console.log(logs.join('\n'));

  return NextResponse.json({
    success: true,
    logs,
    message: 'Skontroluj svoju emailovú schránku a tiež terminál servera'
  });
}
