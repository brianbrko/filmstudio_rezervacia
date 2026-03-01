// Komplexná logika pre pracovné hodiny
// Priorita: special_days > employee_vacations > employee_day_overrides > employee_working_hours > working_hours

export interface WorkingHoursResult {
  isWorking: boolean
  startTime: string | null // HH:MM format
  endTime: string | null   // HH:MM format
  reason?: 'special_day_closed' | 'on_vacation' | 'override_closed' | 'not_working_day' | 'default_closed'
}

export interface SpecialDay {
  date: string
  start_time: string | null
  end_time: string | null
  is_closed: boolean
  note?: string
}

export interface EmployeeVacation {
  employee_id: string
  start_date: string // YYYY-MM-DD
  end_date: string   // YYYY-MM-DD
  note?: string
}

export interface EmployeeDayOverride {
  employee_id: string
  specific_date: string
  start_time: string | null
  end_time: string | null
}

export interface EmployeeWorkingHours {
  employee_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_working: boolean
}

export interface WorkingHours {
  day_of_week: number
  start_time: string
  end_time: string
  is_open: boolean
}

/**
 * Získa pracovné hodiny pre zamestnanca na konkrétny dátum
 * S prioritou: special_days > employee_vacations > employee_day_overrides > employee_working_hours > working_hours
 */
export function getEmployeeWorkingHoursForDate(
  date: string, // YYYY-MM-DD
  employeeId: string,
  specialDays: SpecialDay[],
  employeeVacations: EmployeeVacation[],
  employeeDayOverrides: EmployeeDayOverride[],
  employeeWorkingHours: EmployeeWorkingHours[],
  workingHours: WorkingHours[]
): WorkingHoursResult {
  // 1. Kontrola special_days (špeciálne dni pre celé kaderníctvo)
  const specialDay = specialDays.find(sd => sd.date === date)
  if (specialDay) {
    if (specialDay.is_closed || !specialDay.start_time || !specialDay.end_time) {
      return {
        isWorking: false,
        startTime: null,
        endTime: null,
        reason: 'special_day_closed'
      }
    }
    return {
      isWorking: true,
      startTime: specialDay.start_time.slice(0, 5),
      endTime: specialDay.end_time.slice(0, 5)
    }
  }

  // 2. Kontrola employee_vacations (dovolenka zamestnankyne)
  // DÔLEŽITÉ: employeeVacations by mali byť už vyfiltrované pre daný dátum
  const onVacation = employeeVacations.find(
    vacation => vacation.employee_id === employeeId
  )
  
  if (onVacation) {
    return {
      isWorking: false,
      startTime: null,
      endTime: null,
      reason: 'on_vacation'
    }
  }

  // 3. Kontrola employee_day_overrides (špecifické hodiny na daný deň)
  const dayOverride = employeeDayOverrides.find(
    edo => edo.employee_id === employeeId && edo.specific_date === date
  )
  if (dayOverride) {
    if (!dayOverride.start_time || !dayOverride.end_time) {
      return {
        isWorking: false,
        startTime: null,
        endTime: null,
        reason: 'override_closed'
      }
    }
    return {
      isWorking: true,
      startTime: dayOverride.start_time.slice(0, 5),
      endTime: dayOverride.end_time.slice(0, 5)
    }
  }

  // Vypočítaj deň v týždni (0 = Pondelok, 6 = Nedeľa)
  const dateObj = new Date(date + 'T00:00:00')
  const dayOfWeek = dateObj.getDay()
  const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  // 4. Kontrola employee_working_hours (pracovné hodiny zamestnanca podľa dňa v týždni)
  const empHours = employeeWorkingHours.find(
    ewh => ewh.employee_id === employeeId && ewh.day_of_week === adjustedDay
  )
  if (empHours) {
    if (!empHours.is_working) {
      return {
        isWorking: false,
        startTime: null,
        endTime: null,
        reason: 'not_working_day'
      }
    }
    return {
      isWorking: true,
      startTime: empHours.start_time.slice(0, 5),
      endTime: empHours.end_time.slice(0, 5)
    }
  }

  // 5. Použitie working_hours (defaultné otváracie hodiny)
  const defaultHours = workingHours.find(wh => wh.day_of_week === adjustedDay)
  if (defaultHours) {
    if (!defaultHours.is_open) {
      return {
        isWorking: false,
        startTime: null,
        endTime: null,
        reason: 'default_closed'
      }
    }
    return {
      isWorking: true,
      startTime: defaultHours.start_time.slice(0, 5),
      endTime: defaultHours.end_time.slice(0, 5)
    }
  }

  // Fallback - ak nič nie je definované, predpokladáme že nepracuje
  return {
    isWorking: false,
    startTime: null,
    endTime: null,
    reason: 'default_closed'
  }
}

/**
 * Konverzia času HH:MM na minúty od polnoci
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Konverzia minút na HH:MM
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/**
 * Skontroluje či sa dva časové úseky prekrývajú
 */
export function hasTimeOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && end1 > start2
}

/**
 * Vygeneruje dostupné časové sloty
 */
export function generateTimeSlots(
  startMinutes: number,
  endMinutes: number,
  durationMinutes: number,
  intervalMinutes: number = 30
): Array<{ startMinutes: number; endMinutes: number; time: string }> {
  const slots: Array<{ startMinutes: number; endMinutes: number; time: string }> = []
  
  for (let minutes = startMinutes; minutes < endMinutes; minutes += intervalMinutes) {
    const slotEnd = minutes + durationMinutes
    if (slotEnd <= endMinutes) {
      slots.push({
        startMinutes: minutes,
        endMinutes: slotEnd,
        time: minutesToTime(minutes)
      })
    }
  }
  
  return slots
}
