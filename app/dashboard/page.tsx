// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getEmployeeWorkingHoursForDate } from '@/lib/workingHours'
import Image from 'next/image'

interface TimeSlot {
  time: string
  employee_id: string
  employee_name: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('any')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  
  // Dropdown states
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // Refs pre dropdowny
  const datePickerRef = useRef<HTMLDivElement>(null)
  const serviceDropdownRef = useRef<HTMLDivElement>(null)
  const employeeDropdownRef = useRef<HTMLDivElement>(null)
  
  const [bookingForm, setBookingForm] = useState({
    phone: '',
    title: 'Pán',
    first_name: '',
    last_name: '',
    email: '',
    notes: ''
  })
  
  const [notification, setNotification] = useState<{
    show: boolean
    type: 'error' | 'success' | 'warning' | 'info'
    message: string
    title?: string
  }>({
    show: false,
    type: 'info',
    message: ''
  })
  
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  
  const showNotification = (type: 'error' | 'success' | 'warning' | 'info', message: string, title?: string) => {
    setNotification({ show: true, type, message, title })
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }))
    }, 5000)
  }

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (profile) {
      if (profile.role === 'admin' || profile.role === 'employee') {
        router.push('/calendar')
        return
      }
      fetchData()
    }
  }, [profile])

  useEffect(() => {
    if (selectedDate && selectedService && employees.length > 0) {
      fetchAvailableSlots()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedService, selectedEmployee, employees])

  // Polling mechanizmus - fallback pre real-time (každých 10 sekúnd)
  useEffect(() => {
    if (!profile || !selectedDate || !selectedService || employees.length === 0) return

    console.log('Spúšťam polling mechanizmus (každých 10s) pre istotu')
    
    const pollingInterval = setInterval(() => {
      console.log('Polling: Automaticky načítavam dostupné sloty')
      fetchAvailableSlots()
    }, 10000) // Každých 10 sekúnd

    return () => {
      console.log('Zastavujem polling mechanizmus')
      clearInterval(pollingInterval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, selectedDate, selectedService, selectedEmployee, employees])

  // Real-time aktualizácie - počúvaj na všetky zmeny ktoré ovplyvňujú dostupné sloty
  useEffect(() => {
    if (!profile || !selectedDate) return

    console.log('Nastavujem real-time subscriptions pre dashboard (WebSocket)')

    // Subscription na rezervácie
    const reservationSubscription = supabase
      .channel('dashboard-reservations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reservations',
        filter: `reservation_date=eq.${selectedDate}`
      }, (payload) => {
        console.log('Real-time zmena v rezerváciách:', payload)
        fetchAvailableSlots()
      })
      .subscribe()

    // Subscription na employee_day_overrides (špecifické hodiny na daný deň)
    const dayOverridesSubscription = supabase
      .channel('dashboard-day-overrides')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'employee_day_overrides',
        filter: `specific_date=eq.${selectedDate}`
      }, () => {
        console.log('Real-time zmena v employee_day_overrides')
        fetchAvailableSlots()
      })
      .subscribe()

    // Subscription na special_days (sviatky a špeciálne dni)
    const specialDaysSubscription = supabase
      .channel('dashboard-special-days')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'special_days',
        filter: `date=eq.${selectedDate}`
      }, () => {
        console.log('Real-time zmena v special_days')
        fetchAvailableSlots()
      })
      .subscribe()

    // Subscription na employee_working_hours (pravidelné hodiny zamestnancov)
    const employeeWorkingHoursSubscription = supabase
      .channel('dashboard-employee-hours')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'employee_working_hours'
      }, () => {
        console.log('Real-time zmena v employee_working_hours')
        fetchAvailableSlots()
      })
      .subscribe()

    // Subscription na working_hours (defaultné otváracie hodiny)
    const workingHoursSubscription = supabase
      .channel('dashboard-working-hours')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'working_hours'
      }, () => {
        console.log('Real-time zmena v working_hours')
        fetchAvailableSlots()
      })
      .subscribe()

    return () => {
      console.log('Ukončujem real-time subscriptions pre dashboard')
      supabase.removeChannel(reservationSubscription)
      supabase.removeChannel(dayOverridesSubscription)
      supabase.removeChannel(specialDaysSubscription)
      supabase.removeChannel(employeeWorkingHoursSubscription)
      supabase.removeChannel(workingHoursSubscription)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, selectedDate])

  useEffect(() => {
    // Zatvoriť dropdowny pri kliknutí mimo
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
      }
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setShowServiceDropdown(false)
      }
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setShowEmployeeDropdown(false)
      }
    }
    
    if (showServiceDropdown || showEmployeeDropdown || showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showServiceDropdown, showEmployeeDropdown, showDatePicker])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    setUser(user)

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    // Kontrola či je používateľ zablokovaný
    if (profileData?.is_blocked) {
      await supabase.auth.signOut()
      router.push('/login?blocked=true')
      return
    }
    
    setProfile(profileData)
    
    if (profileData) {
      const nameParts = profileData.full_name?.split(' ') || []
      setBookingForm({
        phone: profileData.phone || '',
        title: 'Pán',
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: user.email || '',
        notes: ''
      })
    }
    
    setLoading(false)
  }

  const fetchData = async () => {
    const [emp, srv] = await Promise.all([
      supabase.from('employees').select('*').eq('is_active', true).order('name'),
      supabase.from('services').select('*').order('price')
    ])

    if (emp.data) setEmployees(emp.data)
    if (srv.data) setServices(srv.data)
  }

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  const fetchAvailableSlots = async () => {
    const service = services.find(s => s.id === selectedService)
    if (!service) return

    setRefreshing(true)
    console.log('Načítavam dostupné sloty...')

    // Aktuálny čas pre kontrolu minulých časov
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const isToday = selectedDate === today

    // Načítaj všetky potrebné dáta
    const [reservationsData, workingHoursData, employeeWorkingHoursData, employeeDayOverridesData, specialDaysData, employeeVacationsData] = await Promise.all([
      supabase.from('reservations').select('*').eq('reservation_date', selectedDate).neq('status', 'cancelled'),
      supabase.from('working_hours').select('*').order('day_of_week'),
      supabase.from('employee_working_hours').select('*'),
      supabase.from('employee_day_overrides').select('*').eq('specific_date', selectedDate),
      supabase.from('special_days').select('*').eq('date', selectedDate).maybeSingle(),
      // Načítaj VŠETKY dovolenky a filtruj v JS (istejšie než SQL date porovnanie)
      supabase.from('employee_vacations').select('*')
    ])

    const reservations = reservationsData.data || []
    const workingHours = workingHoursData.data || []
    const employeeWorkingHours = employeeWorkingHoursData.data || []
    const employeeDayOverrides = employeeDayOverridesData.data || []
    const specialDays = specialDaysData.data ? [specialDaysData.data] : []
    // Filtruj dovolenky ktoré zahŕňajú vybraný dátum
    const employeeVacations = (employeeVacationsData.data || []).filter((v: any) => 
      v.start_date <= selectedDate && v.end_date >= selectedDate
    )

    const slots: TimeSlot[] = []
    const employeesToCheck = selectedEmployee === 'any' 
      ? employees 
      : employees.filter(e => e.id === selectedEmployee)

    employeesToCheck.forEach(emp => {
      // KONTROLA DOSTUPNOSTI - Centralizovaná funkcia kontroluje všetko:
      // 1. Špeciálne dni (sviatky - celé kaderníctvo zatvorené)
      // 2. Dovolenky (zamestnankyňa na dovolenke)
      // 3. Špecifické hodiny na daný deň (override)
      // 4. Pracovné hodiny zamestnankyne podľa dňa v týždni
      // 5. Defaultné otváracie hodiny
      const workingHoursResult = getEmployeeWorkingHoursForDate(
        selectedDate,
        emp.id,
        specialDays,
        employeeVacations,
        employeeDayOverrides,
        employeeWorkingHours,
        workingHours
      )

      // Ak zamestnankyňa NEPRACUJE v tento deň -> ŽIADNE SLOTY
      if (!workingHoursResult.isWorking || !workingHoursResult.startTime || !workingHoursResult.endTime) {
        return // Preskočiť túto zamestnankyňu, žiadne sloty sa nevygenerujú
      }

      const startMinutes = timeToMinutes(workingHoursResult.startTime)
      const endMinutes = timeToMinutes(workingHoursResult.endTime)
      
      // Generovanie časových slotov (každých 30 minút)
      for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
        
        const newSlotStart = minutes
        const newSlotEnd = minutes + service.duration_minutes
        
        // Kontrola, či slot spadá do pracovných hodín
        if (newSlotEnd > endMinutes) {
          continue
        }

        // Kontrola, či čas už neprešiel (len pre dnešný deň)
        if (isToday && newSlotStart < currentMinutes) {
          continue
        }
        
        // Kontrola prekrývania s existujúcimi rezerváciami
        const hasOverlap = reservations.some(r => {
          if (r.employee_id !== emp.id) return false
          
          const reservationStart = timeToMinutes(r.reservation_time.slice(0, 5))
          const reservationService = services.find(s => s.id === r.service_id)
          const reservationDuration = r.is_private && r.end_time
            ? timeToMinutes(r.end_time.slice(0, 5)) - reservationStart
            : (reservationService?.duration_minutes || 30)
          const reservationEnd = reservationStart + reservationDuration
          
          // Prekrývajú sa, ak nový slot začína pred koncom existujúcej rezervácie
          // A končí po začiatku existujúcej rezervácie
          return (newSlotStart < reservationEnd && newSlotEnd > reservationStart)
        })

        if (!hasOverlap) {
          slots.push({
            time: timeStr,
            employee_id: emp.id,
            employee_name: emp.name
          })
        }
      }
    })

    slots.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
    setAvailableSlots(slots)
    setLastRefresh(new Date())
    setRefreshing(false)
    console.log(`Načítaných ${slots.length} dostupných slotov`)
  }

  const handleSlotClick = (slot: TimeSlot) => {
    setSelectedSlot(slot)
    setShowBookingModal(true)
  }

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot) return

    // Skontroluj či nie je používateľ zablokovaný
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('is_blocked')
      .eq('id', user.id)
      .single()
    
    if (currentProfile?.is_blocked) {
      showNotification('error', 'Váš účet bol zablokovaný. Nemôžete vytvoriť rezervácie.', 'Zablokovaný účet')
      await supabase.auth.signOut()
      setTimeout(() => router.push('/login?blocked=true'), 2000)
      return
    }

    // KRITICKÁ VALIDÁCIA: Pred vytvorením rezervácie znovu over dostupnosť
    console.log('Overujem dostupnosť slotu pred vytvorením rezervácie...')
    
    const service = services.find(s => s.id === selectedService)
    if (!service) {
      showNotification('error', 'Služba nebola nájdená', 'Chyba')
      return
    }

    // Over, či čas už neprešiel
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    
    if (selectedDate === today) {
      const slotMinutes = timeToMinutes(selectedSlot.time)
      if (slotMinutes < currentMinutes) {
        showNotification('error', 'Tento čas už prešiel. Prosím vyberte budúci termín.', 'Čas prešiel')
        setShowBookingModal(false)
        fetchAvailableSlots()
        return
      }
    }

    // Over, či dátum nie je v minulosti
    if (selectedDate < today) {
      showNotification('error', 'Nemôžete rezervovať termín v minulosti.', 'Minulý dátum')
      setShowBookingModal(false)
      fetchAvailableSlots()
      return
    }

    // Načítaj aktuálne dáta z databázy pre validáciu
    const [reservationsData, workingHoursData, employeeWorkingHoursData, employeeDayOverridesData, specialDaysData, employeeVacationsData] = await Promise.all([
      supabase.from('reservations').select('*').eq('reservation_date', selectedDate).neq('status', 'cancelled'),
      supabase.from('working_hours').select('*').order('day_of_week'),
      supabase.from('employee_working_hours').select('*'),
      supabase.from('employee_day_overrides').select('*').eq('specific_date', selectedDate),
      supabase.from('special_days').select('*').eq('date', selectedDate).maybeSingle(),
      supabase.from('employee_vacations').select('*')
    ])

    const reservations = reservationsData.data || []
    const workingHours = workingHoursData.data || []
    const employeeWorkingHours = employeeWorkingHoursData.data || []
    const employeeDayOverrides = employeeDayOverridesData.data || []
    const specialDays = specialDaysData.data ? [specialDaysData.data] : []
    const employeeVacations = (employeeVacationsData.data || []).filter((v: any) => 
      v.start_date <= selectedDate && v.end_date >= selectedDate
    )

    // 1. Over pracovné hodiny
    const workingHoursResult = getEmployeeWorkingHoursForDate(
      selectedDate,
      selectedSlot.employee_id,
      specialDays,
      employeeVacations,
      employeeDayOverrides,
      employeeWorkingHours,
      workingHours
    )

    if (!workingHoursResult.isWorking || !workingHoursResult.startTime || !workingHoursResult.endTime) {
      let message = `${selectedSlot.employee_name} už nepracuje v tento deň. Prosím vyberte iný termín.`
      let title = 'Termín nie je dostupný'
      
      if (workingHoursResult.reason === 'on_vacation') {
        message = `${selectedSlot.employee_name} má v tento deň dovolenku. Prosím vyberte iný termín alebo inú zamestnankyňu.`
        title = 'Dovolenka'
      } else if (workingHoursResult.reason === 'special_day_closed') {
        message = 'Kaderníctvo je v tento deň zatvorené (sviatky).'
        title = 'Zatvorené'
      }
      
      showNotification('error', message, title)
      setShowBookingModal(false)
      fetchAvailableSlots() // Obnov zoznam
      return
    }

    const slotStartMinutes = timeToMinutes(selectedSlot.time)
    const slotEndMinutes = slotStartMinutes + service.duration_minutes
    const workStartMinutes = timeToMinutes(workingHoursResult.startTime)
    const workEndMinutes = timeToMinutes(workingHoursResult.endTime)

    if (slotStartMinutes < workStartMinutes || slotEndMinutes > workEndMinutes) {
      showNotification('error', `Tento čas je mimo pracovných hodín (${workingHoursResult.startTime} - ${workingHoursResult.endTime}). Prosím vyberte iný termín.`, 'Termín nie je dostupný')
      setShowBookingModal(false)
      fetchAvailableSlots() // Obnov zoznam
      return
    }

    // 2. Over kolízie s existujúcimi rezerváciami
    const hasCollision = reservations.some(r => {
      if (r.employee_id !== selectedSlot.employee_id) return false
      
      const reservationStart = timeToMinutes(r.reservation_time.slice(0, 5))
      const reservationService = services.find(s => s.id === r.service_id)
      const reservationDuration = r.is_private && r.end_time
        ? timeToMinutes(r.end_time.slice(0, 5)) - reservationStart
        : (reservationService?.duration_minutes || 30)
      const reservationEnd = reservationStart + reservationDuration
      
      return (slotStartMinutes < reservationEnd && slotEndMinutes > reservationStart)
    })

    if (hasCollision) {
      showNotification('error', `Tento termín bol práve obsadený. Prosím vyberte iný čas.`, 'Termín obsadený')
      setShowBookingModal(false)
      fetchAvailableSlots() // Obnov zoznam
      return
    }

    console.log('Validácia prešla - vytváram rezerváciu')

    // Všetko OK - vytvor rezerváciu
    const { error } = await supabase
      .from('reservations')
      .insert([{
        user_id: user.id,
        employee_id: selectedSlot.employee_id,
        service_id: selectedService,
        reservation_date: selectedDate,
        reservation_time: selectedSlot.time + ':00',
        status: 'confirmed',
        phone: bookingForm.phone,
        title: bookingForm.title,
        first_name: bookingForm.first_name,
        last_name: bookingForm.last_name,
        email: bookingForm.email,
        notes: bookingForm.notes
      }])

    if (error) {
      // Chyba z databázového triggera
      if (error.message.includes('pracovných hodín') || error.message.includes('nepracuje')) {
        showNotification('error', 'Tento termín už nie je dostupný. Prosím vyberte iný čas.', 'Termín nie je dostupný')
        setShowBookingModal(false)
        fetchAvailableSlots()
      } else {
        showNotification('error', error.message, 'Chyba')
      }
    } else {
      showNotification('success', 'Rezervácia bola úspešne vytvorená', 'Úspech')
      setShowBookingModal(false)
      fetchAvailableSlots()
    }
  }

  const changeDate = (days: number) => {
    const date = new Date(selectedDate + 'T00:00:00')
    date.setDate(date.getDate() + days)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Načítavam...</p>
      </div>
    )
  }

  const selectedServiceData = services.find(s => s.id === selectedService)

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Animated wave background */}
      <div className="absolute inset-0 z-0">
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{height: '40%'}}>
          <path fill="#f59e0b" fillOpacity="0.3" d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z">
            <animate attributeName="d" dur="10s" repeatCount="indefinite" values="
              M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,128L48,133.3C96,139,192,149,288,138.7C384,128,480,96,576,90.7C672,85,768,107,864,128C960,149,1056,171,1152,170.7C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </path>
        </svg>
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{height: '35%'}}>
          <path fill="#f59e0b" fillOpacity="0.15" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,154.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z">
            <animate attributeName="d" dur="15s" repeatCount="indefinite" values="
              M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,154.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,192L48,197.3C96,203,192,213,288,208C384,203,480,181,576,181.3C672,181,768,203,864,218.7C960,235,1056,245,1152,240C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,154.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </path>
        </svg>
      </div>
      
      {notification.show && (
        <div className="fixed top-4 right-4 z-[9999] animate-slide-in-right max-w-[90vw] sm:max-w-md">
          <div className={`
            rounded-xl shadow-2xl border-4 p-4 sm:p-5 
            ${notification.type === 'error' ? 'bg-red-500 border-red-700' : ''}
            ${notification.type === 'success' ? 'bg-green-500 border-green-700' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-500 border-yellow-700' : ''}
            ${notification.type === 'info' ? 'bg-blue-500 border-blue-700' : ''}
          `}>
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="flex-1">
                {notification.title && (
                  <div className="font-bold text-base sm:text-lg text-white mb-1">
                    {notification.title}
                  </div>
                )}
                <div className="text-white text-sm sm:text-base">
                  {notification.message}
                </div>
              </div>
              <button 
                onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                className="text-white hover:text-gray-200 text-xl sm:text-2xl leading-none">
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-gray-900 text-white p-4 sm:p-6 border-b-2 border-amber-500/30 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Image 
              src="/images/logo.png" 
              alt="Art Studio Logo" 
              width={80} 
              height={80}
              className="object-contain w-16 h-16 sm:w-20 sm:h-20"
            />
            <div>
              <p className="text-gray-300 text-base sm:text-lg">{profile?.full_name}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 w-full sm:w-auto">
            <button 
              onClick={() => router.push('/reservations')} 
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold text-sm sm:text-base hover:from-amber-500 hover:to-amber-700 shadow-lg shadow-amber-500/20">
              Moje rezervácie
            </button>
            <button onClick={() => router.push('/profile')} className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gray-700 text-white rounded-lg font-bold text-sm sm:text-base border-2 border-amber-500/50 hover:bg-gray-600">
              Profil
            </button>
            <button onClick={() => setShowLogoutModal(true)} className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gray-700 text-white rounded-lg font-bold text-sm sm:text-base border-2 border-amber-500/50 hover:bg-gray-600">
              Odhlásiť
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="grid lg:grid-cols-[1fr] gap-6">
          {/* Filtre v jednom riadku */}
          <div className="bg-gray-800 text-white rounded-2xl p-4 sm:p-6 border-2 border-amber-500/30">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Dátum */}
              <div className="relative" ref={datePickerRef}>
                <label className="block font-bold mb-2">Dátum</label>
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDatePicker(!showDatePicker)
                    setShowServiceDropdown(false)
                    setShowEmployeeDropdown(false)
                  }}
                  className="w-full p-3 border-2 border-amber-500/50 rounded-lg font-medium bg-gray-900 hover:bg-gray-700 cursor-pointer transition-colors flex justify-between items-center"
                >
                  <span className="text-white">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('sk-SK', { 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                
                {showDatePicker && (
                  <div 
                    className="absolute z-50 w-full mt-2 bg-gray-800 border-2 border-amber-500/50 rounded-lg shadow-2xl p-4"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const date = new Date(selectedDate + 'T00:00:00')
                          const newDate = new Date(date)
                          newDate.setMonth(newDate.getMonth() - 1)
                          
                          // Kontrola či nový mesiac nie je v minulosti
                          const today = new Date()
                          const currentMonth = today.getFullYear() * 12 + today.getMonth()
                          const newMonth = newDate.getFullYear() * 12 + newDate.getMonth()
                          
                          if (newMonth >= currentMonth) {
                            setSelectedDate(newDate.toISOString().split('T')[0])
                          }
                        }}
                        className="p-2 hover:bg-amber-500/20 rounded-lg font-bold text-xl disabled:opacity-30 disabled:cursor-not-allowed text-white"
                      >
                        ←
                      </button>
                      <span className="font-bold text-white">
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('sk-SK', { 
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const date = new Date(selectedDate + 'T00:00:00')
                          date.setMonth(date.getMonth() + 1)
                          setSelectedDate(date.toISOString().split('T')[0])
                        }}
                        className="p-1 sm:p-2 hover:bg-amber-500/20 rounded-lg font-bold text-lg sm:text-xl text-white"
                      >
                        →
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
                      {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(day => (
                        <div key={day} className="text-center text-[10px] sm:text-xs font-bold text-gray-400 p-0.5 sm:p-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                      {(() => {
                        const current = new Date(selectedDate + 'T00:00:00')
                        const year = current.getFullYear()
                        const month = current.getMonth()
                        const firstDay = new Date(year, month, 1)
                        const lastDay = new Date(year, month + 1, 0)
                        const startPadding = (firstDay.getDay() + 6) % 7
                        
                        const days = []
                        for (let i = 0; i < startPadding; i++) {
                          days.push(<div key={`empty-${i}`} />)
                        }
                        
                        const today = new Date().toISOString().split('T')[0]
                        
                        for (let day = 1; day <= lastDay.getDate(); day++) {
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                          const isSelected = dateStr === selectedDate
                          const isToday = dateStr === today
                          const isPast = dateStr < today
                          
                          days.push(
                            <button
                              key={day}
                              onClick={() => {
                                if (!isPast) {
                                  setSelectedDate(dateStr)
                                  setShowDatePicker(false)
                                }
                              }}
                              disabled={isPast}
                              className={`p-1 sm:p-2 text-center rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                                isPast
                                  ? 'text-gray-600 cursor-not-allowed'
                                  : isSelected 
                                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white font-bold shadow-lg' 
                                  : isToday
                                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500'
                                  : 'text-white hover:bg-gray-700'
                              }`}
                            >
                              {day}
                            </button>
                          )
                        }
                        
                        return days
                      })()}
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedDate(new Date().toISOString().split('T')[0])
                        setShowDatePicker(false)
                      }}
                      className="w-full mt-2 sm:mt-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg font-bold transition-colors border border-amber-500/50 text-sm sm:text-base"
                    >
                      Dnes
                    </button>
                  </div>
                )}
              </div>

              {/* Služba */}
              <div className="relative" ref={serviceDropdownRef}>
                <label className="block font-bold mb-2 text-sm sm:text-base">Služba</label>
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowServiceDropdown(!showServiceDropdown)
                    setShowEmployeeDropdown(false)
                  }}
                  className="w-full px-3 py-2 sm:p-3 border-2 border-amber-500/50 rounded-lg font-medium bg-gray-900 hover:bg-gray-700 cursor-pointer transition-colors flex justify-between items-center text-sm sm:text-base"
                >
                  <span className={selectedService ? 'text-white' : 'text-gray-400'}>
                    {selectedService 
                      ? services.find(s => s.id === selectedService)?.name + ` - ${services.find(s => s.id === selectedService)?.price}€`
                      : '-- Vyberte službu --'}
                  </span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {showServiceDropdown && (
                  <div className="absolute z-50 w-full mt-2 bg-gray-800 border-2 border-amber-500/50 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedService('')
                        setShowServiceDropdown(false)
                      }}
                      className="p-2 sm:p-3 hover:bg-gray-100 cursor-pointer border-b-2 border-gray-200 text-gray-500 font-medium text-sm sm:text-base"
                    >
                      -- Vyberte službu --
                    </div>
                    {services.map(service => (
                      <div
                        key={service.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedService(service.id)
                          setShowServiceDropdown(false)
                        }}
                        className={`p-2 sm:p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0 transition-colors ${
                          selectedService === service.id ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white font-bold' : 'text-white'
                        }`}
                      >
                        <p className="font-bold text-sm sm:text-base">{service.name}</p>
                        <p className={`text-xs sm:text-sm ${selectedService === service.id ? 'text-white/80' : 'text-gray-400'}`}>od {service.price}€ • {service.duration_minutes} min</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Zamestnankyňa */}
              <div className="relative" ref={employeeDropdownRef}>
                <label className="block font-bold mb-2 text-sm sm:text-base">Zamestnankyňa</label>
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowEmployeeDropdown(!showEmployeeDropdown)
                    setShowServiceDropdown(false)
                  }}
                  className="w-full px-3 py-2 sm:p-3 border-2 border-amber-500/50 rounded-lg font-medium bg-gray-900 hover:bg-gray-700 cursor-pointer transition-colors flex justify-between items-center text-white text-sm sm:text-base"
                >
                  <span>
                    {selectedEmployee === 'any' 
                      ? 'Je mi jedno'
                      : employees.find(e => e.id === selectedEmployee)?.name}
                  </span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {showEmployeeDropdown && (
                  <div className="absolute z-50 w-full mt-2 bg-gray-800 border-2 border-amber-500/50 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedEmployee('any')
                        setShowEmployeeDropdown(false)
                      }}
                      className={`p-2 sm:p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 transition-colors font-bold text-sm sm:text-base ${
                        selectedEmployee === 'any' ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white' : 'text-white'
                      }`}
                    >
                      Je mi jedno
                    </div>
                    {employees.map(emp => (
                      <div
                        key={emp.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedEmployee(emp.id)
                          setShowEmployeeDropdown(false)
                        }}
                        className={`p-2 sm:p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0 transition-colors text-sm sm:text-base ${
                          selectedEmployee === emp.id ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white font-bold' : 'text-white'
                        }`}
                      >
                        {emp.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Voľné časy */}
          <div className="bg-gray-800 text-white rounded-2xl p-4 sm:p-6 border-2 border-amber-500/30">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">Dostupné termíny</h2>
              <div className="flex items-center gap-2 sm:gap-3">
                {refreshing && (
                  <div className="flex items-center gap-2 text-amber-400 text-xs sm:text-sm">
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Aktualizujem...</span>
                  </div>
                )}
                {lastRefresh && !refreshing && (
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    Aktualizované: {lastRefresh.toLocaleTimeString('sk-SK')}
                  </span>
                )}
                <button
                  onClick={() => fetchAvailableSlots()}
                  disabled={refreshing}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg font-bold transition-colors border border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                  title="Obnoviť dostupné termíny"
                >
                  <span className="hidden sm:inline">Obnoviť</span>
                </button>
              </div>
            </div>
            
            {!selectedService ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-gray-400 text-sm sm:text-base">Najprv vyberte službu</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-lg sm:text-xl font-bold mb-2 text-white">Žiadne voľné termíny</p>
                <p className="text-gray-400 text-sm sm:text-base">Skúste iný deň alebo zamestnankyňu</p>
              </div>
            ) : (
              <>
                <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-amber-500/10 rounded-lg border-2 border-amber-500/30">
                  <p className="font-bold text-white text-sm sm:text-base">Vybraná služba:</p>
                  <p className="text-base sm:text-lg text-gray-300">{selectedServiceData?.name} - {selectedServiceData?.price}€ ({selectedServiceData?.duration_minutes} min)</p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                  {availableSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSlotClick(slot)}
                      className="p-3 sm:p-4 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 border-2 border-amber-400 rounded-lg hover:from-amber-500 hover:to-amber-700 transition-all text-white shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      <p className="font-bold text-base sm:text-lg">{slot.time}</p>
                      {selectedEmployee === 'any' && (
                        <p className="text-[10px] sm:text-xs text-white/80 mt-1 truncate">{slot.employee_name}</p>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 text-white rounded-2xl p-4 sm:p-6 max-w-2xl w-full border-2 border-amber-500/50 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Potvrdenie rezervácie</h2>
            
            <div className="bg-amber-500/10 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 border-2 border-amber-500/30 text-sm sm:text-base">
              <p><strong>Dátum:</strong> {new Date(selectedDate + 'T00:00:00').toLocaleDateString('sk-SK')}</p>
              <p><strong>Čas:</strong> {selectedSlot.time}</p>
              <p><strong>Služba:</strong> {selectedServiceData?.name} ({selectedServiceData?.price}€)</p>
              <p><strong>Zamestnankyňa:</strong> {selectedSlot.employee_name}</p>
            </div>

            <form onSubmit={handleBooking} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-bold mb-2 text-sm sm:text-base">Titul</label>
                  <select
                    value={bookingForm.title}
                    onChange={(e) => setBookingForm({...bookingForm, title: e.target.value})}
                    className="w-full px-3 py-2 sm:p-3 border-2 border-amber-500/50 rounded-lg bg-gray-900 text-white text-sm sm:text-base"
                  >
                    <option>Pán</option>
                    <option>Pani</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-2 text-sm sm:text-base">Telefón *</label>
                  <input
                    type="tel"
                    value={bookingForm.phone}
                    onChange={(e) => setBookingForm({...bookingForm, phone: e.target.value})}
                    required
                    className="w-full px-3 py-2 sm:p-3 border-2 border-amber-500/50 rounded-lg bg-gray-900 text-white placeholder-gray-400 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-bold mb-2 text-sm sm:text-base">Meno *</label>
                  <input
                    type="text"
                    value={bookingForm.first_name}
                    onChange={(e) => setBookingForm({...bookingForm, first_name: e.target.value})}
                    required
                    className="w-full px-3 py-2 sm:p-3 border-2 border-amber-500/50 rounded-lg bg-gray-900 text-white placeholder-gray-400 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-2 text-sm sm:text-base">Priezvisko *</label>
                  <input
                    type="text"
                    value={bookingForm.last_name}
                    onChange={(e) => setBookingForm({...bookingForm, last_name: e.target.value})}
                    required
                    className="w-full px-3 py-2 sm:p-3 border-2 border-amber-500/50 rounded-lg bg-gray-900 text-white placeholder-gray-400 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-2 text-sm sm:text-base">Email *</label>
                <input
                  type="email"
                  value={bookingForm.email}
                  onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})}
                  required
                  className="w-full px-3 py-2 sm:p-3 border-2 border-amber-500/50 rounded-lg bg-gray-900 text-white placeholder-gray-400 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block font-bold mb-2 text-sm sm:text-base">Poznámka</label>
                <textarea
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})}
                  className="w-full px-3 py-2 sm:p-3 border-2 border-amber-500/50 rounded-lg bg-gray-900 text-white placeholder-gray-400 text-sm sm:text-base"
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 border-2 border-gray-600 text-sm sm:text-base"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg shadow-amber-500/30 text-sm sm:text-base"
                >
                  Potvrdiť rezerváciu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl p-6 sm:p-8 max-w-md w-full border-4 border-amber-500/50 shadow-2xl shadow-amber-500/20">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Odhlásiť sa?</h2>
              <p className="text-gray-300">
                Naozaj sa chcete odhlásiť zo svojho účtu?
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 border-2 border-gray-600"
              >
                Zrušiť
              </button>
              <button
                onClick={() => {
                  supabase.auth.signOut()
                  router.push('/login')
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg shadow-amber-500/30"
              >
                Áno, odhlásiť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
