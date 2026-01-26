'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  
  // Dropdown states
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  
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
  }, [selectedDate, selectedService, selectedEmployee, employees])

  useEffect(() => {
    // Zatvoriť dropdowny pri kliknutí mimo
    const handleClickOutside = () => {
      setShowServiceDropdown(false)
      setShowEmployeeDropdown(false)
      setShowDatePicker(false)
    }
    
    if (showServiceDropdown || showEmployeeDropdown || showDatePicker) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
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

    const { data: reservations } = await supabase
      .from('reservations')
      .select('*')
      .eq('reservation_date', selectedDate)
      .neq('status', 'cancelled')

    const { data: workingHours } = await supabase
      .from('working_hours')
      .select('*')
      .order('day_of_week')

    const { data: employeeWorkingHours } = await supabase
      .from('employee_working_hours')
      .select('*')

    console.log('All employee working hours:', employeeWorkingHours)
    
    const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay()
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    
    console.log(`Selected date: ${selectedDate}, Day of week: ${dayOfWeek}, Adjusted day: ${adjustedDay}`)

    const slots: TimeSlot[] = []
    const employeesToCheck = selectedEmployee === 'any' 
      ? employees 
      : employees.filter(e => e.id === selectedEmployee)

    employeesToCheck.forEach(emp => {
      const empHours = employeeWorkingHours?.find(
        h => h.employee_id === emp.id && h.day_of_week === adjustedDay
      )
      const defaultHours = workingHours?.find(h => h.day_of_week === adjustedDay)
      
      console.log(`Employee: ${emp.name}, Day: ${adjustedDay}`)
      console.log('Employee Hours:', empHours)
      console.log('Default Hours:', defaultHours)
      
      // Determine working status - employee hours take priority
      let isWorking: boolean
      if (empHours) {
        isWorking = empHours.is_working ?? true
      } else {
        isWorking = defaultHours?.is_open ?? true
      }

      if (!isWorking) {
        console.log(`Skipping ${emp.name} - not working this day`)
        return
      }

      // Get employee's hours
      const empStart = empHours?.start_time || '08:00:00'
      const empEnd = empHours?.end_time || '18:00:00'
      
      // Get default business hours
      const defaultStart = defaultHours?.start_time || '08:00:00'
      const defaultEnd = defaultHours?.end_time || '18:00:00'
      
      // Use intersection of employee hours and business hours
      // Start time is the LATER of the two (max)
      // End time is the EARLIER of the two (min)
      const empStartMinutes = timeToMinutes(empStart.slice(0, 5))
      const empEndMinutes = timeToMinutes(empEnd.slice(0, 5))
      const defaultStartMinutes = timeToMinutes(defaultStart.slice(0, 5))
      const defaultEndMinutes = timeToMinutes(defaultEnd.slice(0, 5))
      
      const startMinutes = Math.max(empStartMinutes, defaultStartMinutes)
      const endMinutes = Math.min(empEndMinutes, defaultEndMinutes)
      
      console.log(`${emp.name} working hours: ${empStart.slice(0, 5)} - ${empEnd.slice(0, 5)}`)
      console.log(`Business hours: ${defaultStart.slice(0, 5)} - ${defaultEnd.slice(0, 5)}`)
      console.log(`Final available hours: ${Math.floor(startMinutes/60).toString().padStart(2,'0')}:${(startMinutes%60).toString().padStart(2,'0')} - ${Math.floor(endMinutes/60).toString().padStart(2,'0')}:${(endMinutes%60).toString().padStart(2,'0')}`)
      
      // If there's no overlap (employee comes after business closes, or leaves before business opens)
      if (startMinutes >= endMinutes) {
        console.log(`No overlap between ${emp.name}'s hours and business hours`)
        return
      }
      
      for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
        
        const newSlotStart = minutes
        const newSlotEnd = minutes + service.duration_minutes
        
        // Kontrola prekrývania s existujúcimi rezerváciami
        const hasOverlap = reservations?.some(r => {
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

        if (!hasOverlap && newSlotEnd <= endMinutes) {
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
  }

  const handleSlotClick = (slot: TimeSlot) => {
    setSelectedSlot(slot)
    setShowBookingModal(true)
  }

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot) return

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
      showNotification('error', error.message, '❌ Chyba')
    } else {
      showNotification('success', 'Rezervácia bola úspešne vytvorená', '✅ Úspech')
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-xl">Načítavam...</p>
      </div>
    )
  }

  const selectedServiceData = services.find(s => s.id === selectedService)

  return (
    <div className="min-h-screen bg-black text-white">
      {notification.show && (
        <div className="fixed top-6 right-6 z-[9999] animate-slide-in-right">
          <div className={`
            max-w-md rounded-xl shadow-2xl border-4 p-5 
            ${notification.type === 'error' ? 'bg-red-500 border-red-700' : ''}
            ${notification.type === 'success' ? 'bg-green-500 border-green-700' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-500 border-yellow-700' : ''}
            ${notification.type === 'info' ? 'bg-blue-500 border-blue-700' : ''}
          `}>
            <div className="flex items-start gap-3">
              <div className="text-3xl">
                {notification.type === 'error' && '❌'}
                {notification.type === 'success' && '✅'}
                {notification.type === 'warning' && '⚠️'}
                {notification.type === 'info' && 'ℹ️'}
              </div>
              <div className="flex-1">
                {notification.title && (
                  <div className="font-bold text-lg text-white mb-1">
                    {notification.title}
                  </div>
                )}
                <div className="text-white">
                  {notification.message}
                </div>
              </div>
              <button 
                onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                className="text-white hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white text-black p-6 border-b-4 border-black">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">✂️ Online rezervácie</h1>
            <p className="text-gray-600">{profile?.full_name}</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => router.push('/reservations')} 
              className="px-6 py-3 bg-black text-white rounded-lg font-bold border-2 border-black hover:bg-gray-800">
              📋 Moje rezervácie
            </button>
            <button onClick={() => router.push('/profile')} className="px-6 py-3 bg-gray-200 text-black rounded-lg font-bold border-2 border-black hover:bg-gray-300">
              👤 Profil
            </button>
            <button onClick={() => {supabase.auth.signOut(); router.push('/login')}} className="px-6 py-3 bg-gray-200 text-black rounded-lg font-bold border-2 border-black hover:bg-gray-300">
              Odhlásiť
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid lg:grid-cols-[1fr] gap-6">
          {/* Filtre v jednom riadku */}
          <div className="bg-white text-black rounded-2xl p-6 border-4 border-gray-900">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Dátum */}
              <div className="relative">
                <label className="block font-bold mb-2">📅 Dátum</label>
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDatePicker(!showDatePicker)
                    setShowServiceDropdown(false)
                    setShowEmployeeDropdown(false)
                  }}
                  className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium bg-white hover:bg-gray-50 cursor-pointer transition-colors flex justify-between items-center"
                >
                  <span>
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('sk-SK', { 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                
                {showDatePicker && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute z-50 w-full mt-2 bg-white border-4 border-gray-900 rounded-lg shadow-2xl p-4"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <button
                        onClick={() => {
                          const date = new Date(selectedDate + 'T00:00:00')
                          date.setDate(date.getDate() - 1)
                          setSelectedDate(date.toISOString().split('T')[0])
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg font-bold text-xl"
                      >
                        ←
                      </button>
                      <span className="font-bold">
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('sk-SK', { 
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                      <button
                        onClick={() => {
                          const date = new Date(selectedDate + 'T00:00:00')
                          date.setDate(date.getDate() + 1)
                          setSelectedDate(date.toISOString().split('T')[0])
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg font-bold text-xl"
                      >
                        →
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(day => (
                        <div key={day} className="text-center text-xs font-bold text-gray-500 p-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1">
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
                        
                        for (let day = 1; day <= lastDay.getDate(); day++) {
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                          const isSelected = dateStr === selectedDate
                          const isToday = dateStr === new Date().toISOString().split('T')[0]
                          
                          days.push(
                            <button
                              key={day}
                              onClick={() => {
                                setSelectedDate(dateStr)
                                setShowDatePicker(false)
                              }}
                              className={`p-2 text-center rounded-lg font-medium transition-colors ${
                                isSelected 
                                  ? 'bg-black text-white' 
                                  : isToday
                                  ? 'bg-gray-200 hover:bg-gray-300'
                                  : 'hover:bg-gray-100'
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
                      className="w-full mt-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold transition-colors"
                    >
                      Dnes
                    </button>
                  </div>
                )}
              </div>

              {/* Služba */}
              <div className="relative">
                <label className="block font-bold mb-2">✂️ Služba</label>
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowServiceDropdown(!showServiceDropdown)
                    setShowEmployeeDropdown(false)
                  }}
                  className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium bg-white hover:bg-gray-50 cursor-pointer transition-colors flex justify-between items-center"
                >
                  <span className={selectedService ? 'text-black' : 'text-gray-500'}>
                    {selectedService 
                      ? services.find(s => s.id === selectedService)?.name + ` - ${services.find(s => s.id === selectedService)?.price}€`
                      : '-- Vyberte službu --'}
                  </span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {showServiceDropdown && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-4 border-gray-900 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedService('')
                        setShowServiceDropdown(false)
                      }}
                      className="p-3 hover:bg-gray-100 cursor-pointer border-b-2 border-gray-200 text-gray-500 font-medium"
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
                        className={`p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0 transition-colors ${
                          selectedService === service.id ? 'bg-black text-white hover:bg-gray-800' : ''
                        }`}
                      >
                        <p className="font-bold">{service.name}</p>
                        <p className="text-sm opacity-70">{service.price}€ • {service.duration_minutes} min</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Zamestnankyňa */}
              <div className="relative">
                <label className="block font-bold mb-2">💇‍♀️ Zamestnankyňa</label>
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowEmployeeDropdown(!showEmployeeDropdown)
                    setShowServiceDropdown(false)
                  }}
                  className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium bg-white hover:bg-gray-50 cursor-pointer transition-colors flex justify-between items-center"
                >
                  <span>
                    {selectedEmployee === 'any' 
                      ? '✨ Je mi jedno'
                      : employees.find(e => e.id === selectedEmployee)?.name}
                  </span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {showEmployeeDropdown && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-4 border-gray-900 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedEmployee('any')
                        setShowEmployeeDropdown(false)
                      }}
                      className={`p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 transition-colors font-bold ${
                        selectedEmployee === 'any' ? 'bg-black text-white hover:bg-gray-800' : ''
                      }`}
                    >
                      ✨ Je mi jedno
                    </div>
                    {employees.map(emp => (
                      <div
                        key={emp.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedEmployee(emp.id)
                          setShowEmployeeDropdown(false)
                        }}
                        className={`p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0 transition-colors ${
                          selectedEmployee === emp.id ? 'bg-black text-white hover:bg-gray-800' : ''
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
          <div className="bg-white text-black rounded-2xl p-6 border-4 border-gray-900">
            <h2 className="text-2xl font-bold mb-6">🕐 Dostupné termíny</h2>
            
            {!selectedService ? (
              <div className="text-center py-12">
                <p className="text-2xl mb-2">👈</p>
                <p className="text-gray-600">Najprv vyberte službu</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-4">😔</p>
                <p className="text-xl font-bold mb-2">Žiadne voľné termíny</p>
                <p className="text-gray-600">Skúste iný deň alebo zamestnankyňu</p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <p className="font-bold">📋 Vybraná služba:</p>
                  <p className="text-lg">{selectedServiceData?.name} - {selectedServiceData?.price}€ ({selectedServiceData?.duration_minutes} min)</p>
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {availableSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSlotClick(slot)}
                      className="p-4 bg-green-100 border-2 border-green-600 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <p className="font-bold text-lg">{slot.time}</p>
                      {selectedEmployee === 'any' && (
                        <p className="text-xs text-gray-600 mt-1">{slot.employee_name}</p>
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
          <div className="bg-white text-black rounded-2xl p-6 max-w-2xl w-full border-4 border-gray-900">
            <h2 className="text-2xl font-bold mb-6">✅ Potvrdenie rezervácie</h2>
            
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <p><strong>Dátum:</strong> {new Date(selectedDate + 'T00:00:00').toLocaleDateString('sk-SK')}</p>
              <p><strong>Čas:</strong> {selectedSlot.time}</p>
              <p><strong>Služba:</strong> {selectedServiceData?.name} ({selectedServiceData?.price}€)</p>
              <p><strong>Zamestnankyňa:</strong> {selectedSlot.employee_name}</p>
            </div>

            <form onSubmit={handleBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-2">Titul</label>
                  <select
                    value={bookingForm.title}
                    onChange={(e) => setBookingForm({...bookingForm, title: e.target.value})}
                    className="w-full p-3 border-2 border-gray-900 rounded-lg"
                  >
                    <option>Pán</option>
                    <option>Pani</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-2">Telefón *</label>
                  <input
                    type="tel"
                    value={bookingForm.phone}
                    onChange={(e) => setBookingForm({...bookingForm, phone: e.target.value})}
                    required
                    className="w-full p-3 border-2 border-gray-900 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-2">Meno *</label>
                  <input
                    type="text"
                    value={bookingForm.first_name}
                    onChange={(e) => setBookingForm({...bookingForm, first_name: e.target.value})}
                    required
                    className="w-full p-3 border-2 border-gray-900 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-2">Priezvisko *</label>
                  <input
                    type="text"
                    value={bookingForm.last_name}
                    onChange={(e) => setBookingForm({...bookingForm, last_name: e.target.value})}
                    required
                    className="w-full p-3 border-2 border-gray-900 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-2">Email *</label>
                <input
                  type="email"
                  value={bookingForm.email}
                  onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})}
                  required
                  className="w-full p-3 border-2 border-gray-900 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold mb-2">Poznámka</label>
                <textarea
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})}
                  className="w-full p-3 border-2 border-gray-900 rounded-lg"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-300 rounded-lg font-bold hover:bg-gray-400"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
                >
                  ✅ Potvrdiť rezerváciu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
