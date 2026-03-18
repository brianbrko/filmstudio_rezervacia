import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendReservationConfirmation, sendAdminNotification } from '@/lib/email';

// Initialize Supabase client with service role (server-to-server)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customer_name,
      customer_email,
      service_id,
      employee_id,
      reservation_date,
      reservation_time,
      status,
    } = body;

    // Ak nemáme email zákazníka, nemá zmysel posielať
    if (!customer_email || customer_email === 'neznamy@email.sk') {
      return NextResponse.json(
        { success: true, message: 'Žiadny email zákazníka, notifikácia preskočená', skipped: true },
        { status: 200 }
      );
    }

    // Získaj detaily služby
    let serviceTitle = 'Neznáma služba';
    let servicePrice = 0;
    let duration = 30;

    if (service_id) {
      const { data: service } = await supabase
        .from('services')
        .select('name, price, duration_minutes')
        .eq('id', service_id)
        .single();

      if (service) {
        serviceTitle = service.name;
        servicePrice = parseFloat(service.price as unknown as string);
        duration = service.duration_minutes;
      }
    }

    // Získaj meno zamestnanca
    let employeeName = 'Nepridelený';
    if (employee_id) {
      const { data: employee } = await supabase
        .from('employees')
        .select('name')
        .eq('id', employee_id)
        .single();

      if (employee) {
        employeeName = employee.name;
      }
    }

    const emailData = {
      customerName: customer_name || 'Zákazník',
      customerEmail: customer_email,
      serviceTitle,
      servicePrice,
      duration,
      employeeName,
      reservationDate: reservation_date,
      reservationTime: reservation_time,
      status: status || 'confirmed',
    };

    // Pošli potvrdenie zákazníkovi
    const customerEmailResult = await sendReservationConfirmation(emailData);
    console.log('Customer email result:', customerEmailResult);

    // Pošli notifikáciu adminovi
    const adminEmailResult = await sendAdminNotification(emailData);
    console.log('Admin email result:', adminEmailResult);

    return NextResponse.json(
      {
        success: true,
        emailStatus: {
          customer: customerEmailResult.success,
          admin: adminEmailResult.success,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Notify API error:', error);
    return NextResponse.json(
      { error: 'Chyba pri odosielaní notifikácie' },
      { status: 500 }
    );
  }
}
