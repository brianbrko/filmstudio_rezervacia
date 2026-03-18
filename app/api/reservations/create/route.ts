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
    const { userId, employeeId, serviceId, reservationDate, reservationTime } = body;

    // Validation
    if (!userId || !employeeId || !serviceId || !reservationDate || !reservationTime) {
      return NextResponse.json(
        { error: 'Chýbajúce povinné polia' },
        { status: 400 }
      );
    }

    // 1. Get user data with email
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    if (!authUser?.user?.email) {
      return NextResponse.json(
        { error: 'Nie je možné zistiť email používateľa' },
        { status: 400 }
      );
    }

    // Get user profile (for name)
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: 'Nie je možné zistiť profil používateľa' },
        { status: 400 }
      );
    }

    // 2. Get service details
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('name, price, duration_minutes')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Služba nenájdená' },
        { status: 400 }
      );
    }

    // 3. Get employee name
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('name')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: 'Zamestnanec nenájdený' },
        { status: 400 }
      );
    }

    // 4. Create reservation
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        user_id: userId,
        employee_id: employeeId,
        service_id: serviceId,
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        status: 'pending',
      })
      .select()
      .single();

    if (reservationError || !reservation) {
      console.error('Reservation error:', reservationError);
      return NextResponse.json(
        { error: 'Nie je možné vytvoriť rezerváciu' },
        { status: 500 }
      );
    }

    // 5. Send confirmation emails
    const emailData = {
      customerName: userProfile.full_name,
      customerEmail: authUser.user.email,
      serviceTitle: service.name,
      servicePrice: parseFloat(service.price),
      duration: service.duration_minutes,
      employeeName: employee.name,
      reservationDate,
      reservationTime,
      status: reservation.status,
    };

    // Send customer confirmation
    const customerEmailResult = await sendReservationConfirmation(emailData);
    console.log('Customer email result:', customerEmailResult);

    // Send admin notification
    const adminEmailResult = await sendAdminNotification(emailData);
    console.log('Admin email result:', adminEmailResult);

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
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Interná chyba servera' },
      { status: 500 }
    );
  }
}
