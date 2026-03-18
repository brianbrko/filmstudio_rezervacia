export interface CreateReservationParams {
  userId: string;
  employeeId: string;
  serviceId: string;
  reservationDate: string;
  reservationTime: string;
}

export async function createReservationWithEmail(params: CreateReservationParams) {
  try {
    const response = await fetch('/api/reservations/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Chyba pri vytváraní rezervácie');
    }

    return {
      success: true,
      data,
      message: data.message,
    };
  } catch (error) {
    console.error('Create reservation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Neznáma chyba',
    };
  }
}

export function formatTimeForDisplay(time: string): string {
  // Convert HH:MM:SS to HH:MM
  return time.substring(0, 5);
}

export function formatDateForDisplay(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('sk-SK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
