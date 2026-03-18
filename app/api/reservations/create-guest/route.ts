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
    console.log('📩 CREATE-GUEST: Prijatý request:', JSON.stringify(body));

    const {
      customer_name,
      customer_email,
      customer_phone,
      service_id,
      employee_id,
      reservation_date,
      reservation_time,
      notes
    } = body;

    // Validation
    if (!customer_name || !customer_email || !service_id || !reservation_date || !reservation_time) {
      console.log('❌ CREATE-GUEST: Chýbajúce polia:', { customer_name, customer_email, service_id, reservation_date, reservation_time });
      return NextResponse.json(
        { error: 'Chýbajúce povinné polia' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      console.log('❌ CREATE-GUEST: Neplatný email:', customer_email);
      return NextResponse.json(
        { error: 'Neplatný email' },
        { status: 400 }
      );
    }

    // Get service details
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('name, price, duration_minutes')
      .eq('id', service_id)
      .single();

    if (serviceError || !service) {
      console.log('❌ CREATE-GUEST: Služba nenájdená:', serviceError);
      return NextResponse.json(
        { error: 'Služba nenájdená' },
        { status: 400 }
      );
    }
    console.log('✅ CREATE-GUEST: Služba nájdená:', service.name);

    // Get employee - buď z requestu alebo prvý aktívny
    let assignedEmployee: any = null;

    if (employee_id) {
      const { data: emp, error: empError } = await supabase
        .from('employees')
        .select('id, name')
        .eq('id', employee_id)
        .single();

      if (!empError && emp) {
        assignedEmployee = emp;
      }
    }

    if (!assignedEmployee) {
      const { data: emp, error: empError } = await supabase
        .from('employees')
        .select('id, name')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (empError || !emp) {
        console.log('❌ CREATE-GUEST: Žiadny zamestnanec:', empError);
        return NextResponse.json(
          { error: 'Nie je dostupný žiadny zamestnanec' },
          { status: 400 }
        );
      }
      assignedEmployee = emp;
    }
    console.log('✅ CREATE-GUEST: Zamestnanec:', assignedEmployee.name);

    // Rozdelenie mena na first_name a last_name
    const nameParts = customer_name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create reservation s kontaktnými údajmi
    const insertData = {
      employee_id: assignedEmployee.id,
      service_id,
      reservation_date,
      reservation_time,
      status: 'confirmed',
      notes: notes || null,
      first_name: firstName,
      last_name: lastName,
      email: customer_email,
      phone: customer_phone || '',
    };
    console.log('📝 CREATE-GUEST: Vkladám rezerváciu:', JSON.stringify(insertData));

    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert(insertData)
      .select()
      .single();

    if (reservationError || !reservation) {
      console.error('❌ CREATE-GUEST: Insert error:', reservationError);
      return NextResponse.json(
        { error: `Nie je možné vytvoriť rezerváciu: ${reservationError?.message || 'Neznáma chyba'}` },
        { status: 500 }
      );
    }
    console.log('✅ CREATE-GUEST: Rezervácia vytvorená:', reservation.id);

    // Send confirmation emails
    const emailData = {
      customerName: customer_name,
      customerEmail: customer_email,
      serviceTitle: service.name,
      servicePrice: parseFloat(service.price as unknown as string),
      duration: service.duration_minutes,
      employeeName: assignedEmployee.name,
      reservationDate: reservation_date,
      reservationTime: reservation_time,
      status: reservation.status,
    };

    // Send customer confirmation
    console.log('📧 CREATE-GUEST: Posielam zákaznícky email na:', customer_email);
    const customerEmailResult = await sendReservationConfirmation(emailData);
    console.log('📧 CREATE-GUEST: Zákaznícky email:', customerEmailResult.success ? '✅ OK' : '❌ FAIL', customerEmailResult);

    // Send admin notification
    console.log('📧 CREATE-GUEST: Posielam admin notifikáciu');
    const adminEmailResult = await sendAdminNotification(emailData);
    console.log('📧 CREATE-GUEST: Admin email:', adminEmailResult.success ? '✅ OK' : '❌ FAIL', adminEmailResult);

    return NextResponse.json(
      {
        success: true,
        message: 'Rezervácia bola úspešne vytvorená. Potvrdenie bolo poslané na váš email.',
        reservation,
        emailStatus: {
          customer: customerEmailResult.success,
          admin: adminEmailResult.success,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ CREATE-GUEST: Kritická chyba:', error);
    return NextResponse.json(
      { error: 'Interná chyba servera' },
      { status: 500 }
    );
  }
}
