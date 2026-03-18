import { useState } from 'react';
import { createReservationWithEmail } from '@/lib/reservationService';

export interface UseCreateReservationOptions {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function useCreateReservation(options?: UseCreateReservationOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createReservation = async (params: {
    userId: string;
    employeeId: string;
    serviceId: string;
    reservationDate: string;
    reservationTime: string;
  }) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await createReservationWithEmail(params);

      if (result.success) {
        setSuccess(true);
        options?.onSuccess?.(result.message);
        return result.data;
      } else {
        const errorMessage = result.error || 'Neznáma chyba';
        setError(errorMessage);
        options?.onError?.(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Neznáma chyba pri vytváraní rezervácie';
      setError(errorMessage);
      options?.onError?.(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
  };

  return {
    createReservation,
    isLoading,
    error,
    success,
    reset,
  };
}
