// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CalendarPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [calendarView, setCalendarView] = useState<Date>(new Date()) // Pre navigáciu v kalendári
  const [workingHours, setWorkingHours] = useState<any[]>([]) // Defaultné otváracie hodiny
  const [employeeWorkingHours, setEmployeeWorkingHours] = useState<any[]>([]) // Pracovné hodiny zamestnankýň
  const [specificDayHours, setSpecificDayHours] = useState<any[]>([]) // Špecifické hodiny na konkrétny deň
  const [specialDays, setSpecialDays] = useState<any[]>([]) // Špeciálne dni
  
  // Custom drag state
  const [isDragging, setIsDragging] = useState(false)
  const [draggedItem, setDraggedItem] = useState<any>(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 })
  const [mouseDownTime, setMouseDownTime] = useState(0)
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 })
  const calendarRef = useRef<HTMLDivElement>(null)
  
  // Edit modal state
  const [editingReservation, setEditingReservation] = useState<any>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [editForm, setEditForm] = useState({
    phone: '',
    title: '',
    first_name: '',
    last_name: '',
    email: '',
    service_id: '',
    employee_id: '',
    reservation_date: '',
    reservation_time: '',
    notes: ''
  })
  
  // Private event modal state
  const [showPrivateModal, setShowPrivateModal] = useState(false)
  const [editingPrivateEvent, setEditingPrivateEvent] = useState<any>(null)
  const [privateForm, setPrivateForm] = useState({
    employee_id: '',
    reservation_date: '',
    start_time: '',
    end_time: '',
    notes: ''
  })
  
  // Confirmation modal state for drag and drop
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingMove, setPendingMove] = useState<any>(null)
  
  // Custom dropdown states
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false)
  const [showPrivateEmployeeDropdown, setShowPrivateEmployeeDropdown] = useState(false)
  
  // Working hours change modal
  const [showWorkingHoursModal, setShowWorkingHoursModal] = useState(false)
  const [selectedEmployeeForHours, setSelectedEmployeeForHours] = useState<any>(null)
  const [specificDayHoursForm, setSpecificDayHoursForm] = useState({
    start_time: '',
    end_time: '',
    is_closed: false
  })
  
  // Custom notification system
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
  
  // Helper na zobrazenie notifikácie
  const showNotification = (type: 'error' | 'success' | 'warning' | 'info', message: string, title?: string) => {
    setNotification({ show: true, type, message, title })
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }))
    }, 5000) // Zmizne po 5 sekundách
  }
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })
  
  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm })
  }
  
  const handleConfirmAction = () => {
    confirmModal.onConfirm()
    setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })
  }
  
  const handleCancelConfirmAction = () => {
    setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })
  }

  const HOURS_START = 0
  const HOURS_END = 24
  const PIXELS_PER_HOUR = 120
  const SNAP_MINUTES = 5
  
  // Current time line state
  const [currentTime, setCurrentTime] = useState(new Date())

  // Helper funkcia pre bezpečnú konverziu Date na YYYY-MM-DD bez UTC problémov
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Farby pre zamestnankyňe
  const [employeeColors, setEmployeeColors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (profile) fetchData()
  }, [profile, selectedDate])
  
  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    
    return () => clearInterval(timer)
  }, [])

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
    setLoading(false)
  }

  const fetchData = async () => {
    console.log('🔄 Načítavam dáta...')
    const dateStr = formatDateToString(selectedDate)
    
    const [e, s, r, wh, ewh, sdh, sd] = await Promise.all([
      supabase.from('employees').select('*').eq('is_active', true).order('name'),
      supabase.from('services').select('*').order('price'),
      supabase.from('reservations').select('*')
        .eq('reservation_date', dateStr).neq('status', 'cancelled'),
      supabase.from('working_hours').select('*').order('day_of_week'),
      supabase.from('employee_working_hours').select('*').order('day_of_week'),
      supabase.from('employee_day_overrides').select('*').eq('specific_date', dateStr),
      supabase.from('special_days').select('*').eq('date', dateStr).maybeSingle()
    ])
    
    if (e.data) {
      setEmployees(e.data)
      // Priradí farby zamestnankyňam
      const colors = ['bg-blue-600', 'bg-yellow-600', 'bg-purple-600']
      const colorMap: { [key: string]: string } = {}
      e.data.forEach((emp: any, index: number) => {
        colorMap[emp.id] = colors[index % colors.length]
      })
      setEmployeeColors(colorMap)
    }
    if (s.data) setServices(s.data)
    if (wh.data) setWorkingHours(wh.data)
    if (ewh.data) setEmployeeWorkingHours(ewh.data)
    if (sdh.data) setSpecificDayHours(sdh.data)
    if (sd.data) {
      setSpecialDays([sd.data])
    } else {
      setSpecialDays([]) // Ak nie je špeciálny deň, nastav prázdne pole
    }
    
    if (r.error) {
      console.error('❌ Chyba pri načítaní rezervácií:', r.error)
      return
    }
    
    if (r.data) {
      const enrichedReservations = await Promise.all(
        r.data.map(async (reservation: any) => {
          const [serviceData, userData, userRole] = await Promise.all([
            supabase.from('services').select('*').eq('id', reservation.service_id).maybeSingle(),
            reservation.user_id 
              ? supabase.from('user_profiles').select('full_name').eq('id', reservation.user_id).maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            reservation.user_id 
              ? supabase.from('user_profiles').select('role').eq('id', reservation.user_id).maybeSingle()
              : Promise.resolve({ data: null, error: null })
          ])
          
          if (serviceData.error) {
            console.error('❌ Chyba pri načítaní služby:', serviceData.error)
          }
          if (userData.error) {
            console.error('❌ Chyba pri načítaní používateľa:', userData.error)
          }
          
          return {
            ...reservation,
            services: serviceData.data,
            user_profiles: userData.data || { full_name: 'Neznámy používateľ' },
            user_profile: userRole.data || { role: 'customer' }
          }
        })
      )
      
      console.log('✅ Načítané rezervácie:', enrichedReservations.length)
      setReservations(enrichedReservations)
    }
  }

  // Konvertuje čas (HH:MM) na minúty od začiatku dňa
  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }
  
  // Calculate position of current time line
  const getCurrentTimePosition = () => {
    // Only show line if selected date is today
    const today = new Date()
    const isToday = formatDateToString(selectedDate) === formatDateToString(today)
    
    if (!isToday) return null
    
    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    const totalMinutes = hours * 60 + minutes
    
    // Calculate position (similar to getTopPosition but for current time)
    const minutesFromStart = totalMinutes - (HOURS_START * 60)
    const position = (minutesFromStart / 60) * PIXELS_PER_HOUR
    
    return position
  }

  // Vypočíta koncový čas z reservation_time a duration_minutes
  const getEndTime = (startTime: string, durationMinutes: number) => {
    const startMinutes = timeToMinutes(startTime)
    const endMinutes = startMinutes + durationMinutes
    const hours = Math.floor(endMinutes / 60)
    const minutes = endMinutes % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // Konvertuje minúty na čas (HH:MM)
  const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  // Vypočíta top pozíciu v px na základe času
  const getTopPosition = (time: string) => {
    const minutes = timeToMinutes(time)
    const startMinutes = HOURS_START * 60
    const offsetMinutes = minutes - startMinutes
    return (offsetMinutes / 60) * PIXELS_PER_HOUR
  }

  // Vypočíta výšku bloku v px
  const getBlockHeight = (durationMinutes: number) => {
    return (durationMinutes / 60) * PIXELS_PER_HOUR
  }

  // Zaokrúhli minúty na najbližší SNAP interval
  const snapToInterval = (minutes: number) => {
    return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
  }

  // Kontrola kolízií
  const hasCollision = (empId: string, startMinutes: number, durationMinutes: number, excludeId?: string) => {
    const endMinutes = startMinutes + durationMinutes
    return reservations.some(r => {
      if (r.id === excludeId) return false
      if (r.employee_id !== empId) return false
      const rStart = timeToMinutes(r.reservation_time.slice(0, 5))
      // Pre súkromné termíny použij end_time, inak spočítaj z duration
      let rEnd
      if (r.is_private && r.end_time) {
        rEnd = timeToMinutes(r.end_time.slice(0, 5))
      } else {
        rEnd = rStart + (r.services?.duration_minutes || 0)
      }
      return (startMinutes < rEnd && endMinutes > rStart)
    })
  }

  const canEdit = (res: any) => profile?.role === 'admin' || profile?.role === 'employee' || res.user_id === user?.id

  // Získaj pracovné hodiny pre zamestnankyu na daný deň
  const getEmployeeWorkingHours = (employeeId: string) => {
    const dayOfWeek = selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1 // 0 = Pondelok
    
    // Najprv skontroluj špeciálny deň (celý salón zatvorený)
    const specialDay = specialDays.find(sd => sd && !sd.is_closed)
    if (specialDay) {
      return { start: specialDay.start_time, end: specialDay.end_time, isWorking: true }
    }
    
    // Ak je špeciálny deň zatvorený
    if (specialDays.some(sd => sd && sd.is_closed)) {
      return { start: '00:00', end: '00:00', isWorking: false }
    }
    
    // Skontroluj špecifické hodiny pre túto zamestnankyu na tento konkrétny deň
    const specificHours = specificDayHours.find(h => h.employee_id === employeeId)
    if (specificHours) {
      // Ak je start_time a end_time NULL, znamená to že nepracuje
      if (!specificHours.start_time || !specificHours.end_time) {
        return { start: '00:00', end: '00:00', isWorking: false }
      }
      return {
        start: specificHours.start_time,
        end: specificHours.end_time,
        isWorking: true
      }
    }
    
    // Skontroluj individuálne pravidelné pracovné hodiny zamestnankyne (týždenné)
    const empHours = employeeWorkingHours.find(h => 
      h.employee_id === employeeId && h.day_of_week === dayOfWeek
    )
    
    if (empHours) {
      return {
        start: empHours.start_time,
        end: empHours.end_time,
        isWorking: empHours.is_working
      }
    }
    
    // Použij defaultné otváracie hodiny
    const defaultHours = workingHours.find(h => h.day_of_week === dayOfWeek)
    if (defaultHours) {
      return {
        start: defaultHours.start_time,
        end: defaultHours.end_time,
        isWorking: defaultHours.is_open
      }
    }
    
    // Fallback
    return { start: '08:00', end: '18:00', isWorking: true }
  }

  // Skontroluj či je čas v pracovných hodinách
  const isWithinWorkingHours = (employeeId: string, startMin: number, durationMin: number) => {
    const hours = getEmployeeWorkingHours(employeeId)
    if (!hours.isWorking) return false
    
    const workStart = timeToMinutes(hours.start)
    const workEnd = timeToMinutes(hours.end)
    const endMin = startMin + durationMin
    
    return startMin >= workStart && endMin <= workEnd
  }
  
  // Skontroluj a vráť detailnú informáciu o pracovných hodinách
  const checkWorkingHoursDetailed = (employeeId: string, startMin: number, durationMin: number): {
    isValid: boolean
    reason?: 'not_working' | 'outside_hours'
    hours?: { start: string, end: string }
  } => {
    const hours = getEmployeeWorkingHours(employeeId)
    
    // Zamestnankyňa nepracuje tento deň
    if (!hours.isWorking) {
      return { 
        isValid: false, 
        reason: 'not_working',
        hours: { start: hours.start, end: hours.end }
      }
    }
    
    const workStart = timeToMinutes(hours.start)
    const workEnd = timeToMinutes(hours.end)
    const endMin = startMin + durationMin
    
    // Rezervácia je mimo pracovných hodín
    if (startMin < workStart || endMin > workEnd) {
      return { 
        isValid: false, 
        reason: 'outside_hours',
        hours: { start: hours.start, end: hours.end }
      }
    }
    
    return { isValid: true }
  }

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent, item: any, empId?: string) => {
    // Ignoruj kliknutia na tlačidlá
    if ((e.target as HTMLElement).tagName === 'BUTTON') return
    
    e.preventDefault()
    e.stopPropagation()
    setMouseDownTime(Date.now())
    setMouseDownPos({ x: e.clientX, y: e.clientY })
    setDraggedItem({ ...item, originalEmpId: empId })
    
    // Uložíme šírku bloku
    if (e.currentTarget instanceof HTMLElement) {
      const rect = e.currentTarget.getBoundingClientRect()
      setDragStartOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      // Uložíme aj šírku pre floating preview
      if (!item.price) {
        setDraggedItem({ 
          ...item, 
          originalEmpId: empId,
          blockWidth: rect.width 
        })
      }
    } else {
      setDragStartOffset({ x: 0, y: 0 })
    }
    
    setDragPosition({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggedItem) return
    
    // Začni dragovať až keď sa myš posunie aspoň 5px (aby sa odlíšil klik od dragu)
    const distance = Math.sqrt(
      Math.pow(e.clientX - mouseDownPos.x, 2) + 
      Math.pow(e.clientY - mouseDownPos.y, 2)
    )
    
    if (distance > 5) {
      setIsDragging(true)
    }
    
    setDragPosition({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = async (e: MouseEvent) => {
    if (!draggedItem) return
    
    // Ak sme sa nehýbali viac než 5px a je to rezervácia (nie služba), je to klik - otvor edit modal
    if (!isDragging && !draggedItem.price) {
      const reservation = draggedItem
      if (canEdit(reservation)) {
        openEditModal(reservation)
      }
      setDraggedItem(null)
      return
    }
    
    // Zistíme na ktorom employee sme pustili a na akom čase
    const calendars = document.querySelectorAll('[data-employee-calendar]')
    let targetEmpId: string | null = null
    let dropY = 0
    
    calendars.forEach(cal => {
      const rect = cal.getBoundingClientRect()
      if (e.clientX >= rect.left && e.clientX <= rect.right && 
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        targetEmpId = cal.getAttribute('data-employee-calendar')
        dropY = e.clientY - rect.top - dragStartOffset.y
      }
    })
    
    if (!targetEmpId) {
      // Pustili sme mimo kalendára
      setIsDragging(false)
      setDraggedItem(null)
      return
    }
    
    // Vypočítaj čas
    const minutesFromStart = Math.max(0, (dropY / PIXELS_PER_HOUR) * 60)
    const totalMinutes = HOURS_START * 60 + snapToInterval(minutesFromStart)
    const duration = draggedItem.duration_minutes || draggedItem.services?.duration_minutes || 30
    const endMinutes = totalMinutes + duration
    
    // Kontrola pracovných hodín
    const hoursCheck = checkWorkingHoursDetailed(targetEmpId, totalMinutes, duration)
    if (!hoursCheck.isValid) {
      if (hoursCheck.reason === 'not_working') {
        showNotification('error', 'Zamestnankyňa nepracuje v tento deň', '🚫 Nepracovný deň')
      } else {
        showNotification('error', `Pracovné hodiny sú ${hoursCheck.hours?.start} - ${hoursCheck.hours?.end}`, '⏰ Mimo pracovných hodín')
      }
      setIsDragging(false)
      setDraggedItem(null)
      return
    }
    
    const time = minutesToTime(totalMinutes)
    console.log('📦 Drop na:', targetEmpId, time)
    
    // Uložiť dočasné údaje pre potvrdenie
    setPendingMove({
      targetEmpId,
      time,
      totalMinutes,
      duration,
      isNewReservation: !!draggedItem.price,
      draggedItem: draggedItem  // Uložiť celý objekt pre neskoršie použitie
    })
    
    // Zobraziť potvrdzovací dialóg
    setShowConfirmModal(true)
    setIsDragging(false)
    setDraggedItem(null)
  }
  
  const confirmMove = async () => {
    if (!pendingMove) return
    
    const { targetEmpId, time, totalMinutes, duration, isNewReservation, draggedItem } = pendingMove
    
    try {
      if (isNewReservation) {
        // Nová služba z drag & drop
        if (hasCollision(targetEmpId, totalMinutes, duration)) {
          showNotification('error', 'V tomto čase už je obsadený termín', '⚠️ Čas obsadený')
          setShowConfirmModal(false)
          setPendingMove(null)
          return
        }
        
        console.log('➕ Vytváram novú rezerváciu...')
        // @ts-ignore
        const { error } = await supabase.from('reservations').insert([{
          employee_id: targetEmpId,
          service_id: draggedItem.id,
          reservation_date: formatDateToString(selectedDate),
          reservation_time: time + ':00',
          status: 'confirmed',
          user_id: user?.id,
          first_name: 'Neznámy',
          last_name: 'Používateľ',
          email: 'neznamy@email.sk',
          phone: 'neuvedené'
        }]).select()
        
        if (error) {
          console.error('❌ Insert error:', error)
          showNotification('error', error.message, '❌ Chyba pri vytváraní')
        } else {
          console.log('✅ Rezervácia vytvorená')
          showNotification('success', 'Rezervácia bola úspešne vytvorená', '✅ Úspech')
        }
      } else {
        // Presun existujúcej rezervácie
        if (!canEdit(draggedItem)) {
          showNotification('error', 'Nemôžete presúvať cudzie rezervácie!', '🔒 Bez oprávnenia')
          setShowConfirmModal(false)
          setPendingMove(null)
          return
        }
        
        if (hasCollision(targetEmpId, totalMinutes, duration, draggedItem.id)) {
          showNotification('error', 'Cieľový čas je obsadený!', '⚠️ Čas obsadený')
          setShowConfirmModal(false)
          setPendingMove(null)
          return
        }
        
        console.log('🔄 Presúvam rezerváciu...')
        
        // Pre súkromné termíny musíme prepočítať end_time podľa trvania
        let updateData: any = { 
          employee_id: targetEmpId, 
          reservation_time: time + ':00' 
        }
        
        if (draggedItem.is_private && draggedItem.end_time) {
          // Vypočítaj trvanie pôvodného súkromného termínu
          const startMinutes = timeToMinutes(draggedItem.reservation_time.slice(0, 5))
          const endMinutes = timeToMinutes(draggedItem.end_time.slice(0, 5))
          const durationMinutes = endMinutes - startMinutes
          
          // Vypočítaj nový end_time podľa nového start_time a trvania
          const newEndMinutes = totalMinutes + durationMinutes
          const newEndTime = minutesToTime(newEndMinutes)
          
          updateData.end_time = newEndTime + ':00'
        }
        
        // @ts-ignore
        const { error } = await supabase.from('reservations')
          // @ts-ignore
          .update(updateData)
          .eq('id', draggedItem.id)
          .select()
        
        if (error) {
          console.error('❌ Update error:', error)
          showNotification('error', error.message, '❌ Chyba pri aktualizovaní')
        } else {
          console.log('✅ Rezervácia presunutá')
          showNotification('success', 'Rezervácia bola úspešne presunutá', '✅ Úspech')
        }
      }
      
      await fetchData()
    } catch (err: any) {
      console.error('❌ Move error:', err)
      showNotification('error', err.message, '❌ Chyba')
    }
    
    setShowConfirmModal(false)
    setPendingMove(null)
  }
  
  const cancelMove = () => {
    setShowConfirmModal(false)
    setPendingMove(null)
  }

  const openEditModal = (reservation: any) => {
    // Check if it's a private appointment
    if (reservation.is_private) {
      setEditingPrivateEvent(reservation)
      setPrivateForm({
        employee_id: reservation.employee_id,
        reservation_date: reservation.reservation_date,
        start_time: reservation.reservation_time ? reservation.reservation_time.slice(0, 5) : '',
        end_time: reservation.end_time ? reservation.end_time.slice(0, 5) : '',
        notes: reservation.notes || ''
      })
      setShowPrivateModal(true)
    } else {
      // Regular reservation
      setIsCreatingNew(false)
      setEditingReservation(reservation)
      setEditForm({
        phone: reservation.phone || '',
        title: reservation.title || '',
        first_name: reservation.first_name || '',
        last_name: reservation.last_name || '',
        email: reservation.email || '',
        service_id: reservation.service_id,
        employee_id: reservation.employee_id,
        reservation_date: reservation.reservation_date,
        reservation_time: reservation.reservation_time.slice(0, 5), // HH:MM
        notes: reservation.notes || ''
      })
      setShowEditModal(true)
    }
  }

  useEffect(() => {
    if (draggedItem) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggedItem, isDragging])

  const openCreateModal = () => {
    // Kontrola či je používateľ zablokovaný
    if (profile?.is_blocked && profile?.role !== 'admin') {
      showNotification('error', 'Váš účet bol zablokovaný administrátorom. Nemôžete vytvárať rezervácie.', '🚫 Účet zablokovaný')
      return
    }

    // Rozdeľ full_name na first_name a last_name
    const nameParts = profile?.full_name?.split(' ') || []
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    setIsCreatingNew(true)
    setEditingReservation(null)
    setEditForm({
      phone: profile?.phone || '',
      title: '',
      first_name: firstName,
      last_name: lastName,
      email: user?.email || '',
      service_id: services[0]?.id || '',
      employee_id: employees[0]?.id || '',
      reservation_date: formatDateToString(selectedDate),
      reservation_time: '09:00',
      notes: ''
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Najdi duration služby
    const selectedService = services.find(s => s.id === editForm.service_id)
    const duration = selectedService?.duration_minutes || 30
    const newTime = timeToMinutes(editForm.reservation_time)
    
    // Skontroluj pracovné hodiny
    const hoursCheck = checkWorkingHoursDetailed(editForm.employee_id, newTime, duration)
    if (!hoursCheck.isValid) {
      if (hoursCheck.reason === 'not_working') {
        showNotification('error', 'Zamestnankyňa nepracuje v tento deň', '🚫 Nepracovný deň')
      } else {
        showNotification('error', `Pracovné hodiny sú ${hoursCheck.hours?.start} - ${hoursCheck.hours?.end}`, '⏰ Mimo pracovných hodín')
      }
      return
    }
    
    // Skontroluj kolízie
    if (hasCollision(editForm.employee_id, newTime, duration, editingReservation?.id)) {
      showNotification('error', 'V tomto čase už je obsadený termín', '⚠️ Čas obsadený')
      return
    }
    
    const reservationData = {
      phone: editForm.phone,
      title: editForm.title,
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      email: editForm.email,
      service_id: editForm.service_id,
      employee_id: editForm.employee_id,
      reservation_date: editForm.reservation_date,
      reservation_time: editForm.reservation_time + ':00',
      notes: editForm.notes,
      status: 'confirmed'
    }
    
    if (isCreatingNew) {
      // Vytvor novú rezerváciu
      // @ts-ignore
      const { error } = await supabase
        .from('reservations')
        // @ts-ignore
        .insert([{ ...reservationData, user_id: user?.id }])
      
      if (error) {
        console.error('❌ Create error:', error)
        showNotification('error', error.message, '❌ Chyba pri vytváraní')
      } else {
        console.log('✅ Rezervácia vytvorená')
        showNotification('success', 'Rezervácia bola úspešne vytvorená', '✅ Úspech')
        setShowEditModal(false)
        await fetchData()
      }
    } else {
      // Uprav existujúcu rezerváciu
      // @ts-ignore
      const { error } = await supabase
        .from('reservations')
        // @ts-ignore
        .update(reservationData)
        .eq('id', editingReservation.id)
      
      if (error) {
        console.error('❌ Update error:', error)
        showNotification('error', error.message, '❌ Chyba pri úprave')
      } else {
        console.log('✅ Rezervácia upravená')
        showNotification('success', 'Rezervácia bola úspešne upravená', '✅ Úspech')
        setShowEditModal(false)
        setEditingReservation(null)
        await fetchData()
      }
    }
  }
  
  const handlePrivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (profile?.role !== 'admin' && profile?.role !== 'employee') {
      showNotification('error', 'Iba admin a zamestnanci môžu vytvárať súkromné termíny!', '🔒 Bez oprávnenia')
      return
    }
    
    // Vypočítaj trvanie v minútach
    const startMinutes = timeToMinutes(privateForm.start_time)
    const endMinutes = timeToMinutes(privateForm.end_time)
    const duration = endMinutes - startMinutes
    
    if (duration <= 0) {
      showNotification('error', 'Čas ukončenia musí byť po čase začiatku!', '⏰ Neplatný časový rozsah')
      return
    }
    
    // Kontrola pracovných hodín
    const hoursCheck = checkWorkingHoursDetailed(privateForm.employee_id, startMinutes, duration)
    if (!hoursCheck.isValid) {
      if (hoursCheck.reason === 'not_working') {
        showNotification('error', 'Zamestnankyňa nepracuje v tento deň', '🚫 Nepracovný deň')
      } else {
        showNotification('error', `Pracovné hodiny sú ${hoursCheck.hours?.start} - ${hoursCheck.hours?.end}`, '⏰ Mimo pracovných hodín')
      }
      return
    }
    
    // Skontroluj kolízie (pri editácii vynechaj aktuálnu rezerváciu)
    if (hasCollision(privateForm.employee_id, startMinutes, duration, editingPrivateEvent?.id)) {
      showNotification('error', 'V tomto čase už je obsadený termín', '⚠️ Čas obsadený')
      return
    }
    
    try {
      if (editingPrivateEvent) {
        // Edit existing private appointment
        // @ts-ignore
        const { error } = await supabase
          .from('reservations')
          // @ts-ignore
          .update({
            employee_id: privateForm.employee_id,
            reservation_date: privateForm.reservation_date,
            reservation_time: privateForm.start_time + ':00',
            end_time: privateForm.end_time + ':00',
            notes: privateForm.notes
          })
          .eq('id', editingPrivateEvent.id)
        
        if (error) {
          console.error('❌ Update error:', error)
          showNotification('error', error.message, '❌ Chyba pri aktualizácii')
        } else {
          console.log('✅ Súkromný termín aktualizovaný')
          showNotification('success', 'Súkromný termín bol úspešne aktualizovaný', '✅ Úspech')
          setShowPrivateModal(false)
          setEditingPrivateEvent(null)
          setPrivateForm({
            employee_id: '',
            reservation_date: '',
            start_time: '',
            end_time: '',
            notes: ''
          })
          await fetchData()
        }
      } else {
        // Create new private appointment
        // @ts-ignore
        const { error } = await supabase.from('reservations').insert([{
          user_id: user?.id,
          employee_id: privateForm.employee_id,
          service_id: null, // Súkromný termín nemá službu
          reservation_date: privateForm.reservation_date,
          reservation_time: privateForm.start_time + ':00',
          end_time: privateForm.end_time + ':00',
          is_private: true,
          notes: privateForm.notes,
          status: 'confirmed',
          // Pre súkromné termíny nepotrebujeme kontaktné údaje
          phone: '',
          first_name: '',
          last_name: '',
          email: ''
        }]).select()
        
        if (error) {
          console.error('❌ Insert error:', error)
          showNotification('error', error.message, '❌ Chyba pri vytváraní')
        } else {
          console.log('✅ Súkromný termín vytvorený')
          showNotification('success', 'Súkromný termín bol úspešne vytvorený', '✅ Úspech')
          setShowPrivateModal(false)
          setPrivateForm({
            employee_id: '',
            reservation_date: '',
            start_time: '',
            end_time: '',
            notes: ''
          })
          await fetchData()
        }
      }
    } catch (err: any) {
      console.error('❌ Error:', err)
      showNotification('error', err.message, '❌ Chyba')
    }
  }

  useEffect(() => {
    if (draggedItem) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggedItem, isDragging, dragStartOffset, mouseDownPos])

  const deleteRes = async (id: string, res: any) => {
    try {
      if (!canEdit(res)) {
        showNotification('error', 'Nemôžete vymazať cudzie rezervácie!', '🔒 Bez oprávnenia')
        return
      }
      
      console.log('🗑️ Mažem rezerváciu:', id)
      const { error } = await supabase.from('reservations').delete().eq('id', id)
      
      if (error) {
        console.error('❌ Delete error:', error)
        showNotification('error', error.message, '❌ Chyba pri mazaní')
      } else {
        console.log('✅ Rezervácia vymazaná')
        showNotification('success', 'Rezervácia bola úspešne vymazaná', '✅ Úspech')
        await fetchData()
      }
    } catch (err: any) {
      console.error('❌ Delete catch error:', err)
      showNotification('error', err.message, '❌ Chyba pri mazaní')
    }
  }
  
  const handleSaveSpecificDayHours = async () => {
    if (!selectedEmployeeForHours) return
    
    try {
      const dateStr = formatDateToString(selectedDate)
      
      // Kontrola, či už existuje záznam pre tento deň a zamestnanca
      const { data: existing } = await supabase
        .from('employee_day_overrides')
        .select('*')
        .eq('employee_id', selectedEmployeeForHours.id)
        .eq('specific_date', dateStr)
        .single()
      
      if (specificDayHoursForm.is_closed) {
        // Ak je zatvorené, uložíme NULL hodnoty pre časy
        if (existing) {
          // @ts-ignore
          const { error } = await supabase
            .from('employee_day_overrides')
            // @ts-ignore
            .update({
              start_time: null,
              end_time: null
            })
            // @ts-ignore
            .eq('id', existing.id)
          
          if (error) throw error
        } else {
          // @ts-ignore
          const { error } = await supabase
            .from('employee_day_overrides')
            .insert([{
              employee_id: selectedEmployeeForHours.id,
              specific_date: dateStr,
              start_time: null,
              end_time: null
            }])
          
          if (error) throw error
        }
      } else {
        // Uložíme špecifické pracovné hodiny
        if (!specificDayHoursForm.start_time || !specificDayHoursForm.end_time) {
          showNotification('error', 'Vyplňte začiatok a koniec pracovnej doby', '⚠️ Chýba informácia')
          return
        }
        
        if (existing) {
          // @ts-ignore
          const { error } = await supabase
            .from('employee_day_overrides')
            // @ts-ignore
            .update({
              start_time: specificDayHoursForm.start_time,
              end_time: specificDayHoursForm.end_time
            })
            // @ts-ignore
            .eq('id', existing.id)
          
          if (error) throw error
        } else {
          // @ts-ignore
          const { error } = await supabase
            .from('employee_day_overrides')
            .insert([{
              employee_id: selectedEmployeeForHours.id,
              specific_date: dateStr,
              start_time: specificDayHoursForm.start_time,
              end_time: specificDayHoursForm.end_time
            }])
          
          if (error) throw error
        }
      }
      
      // Zavrieme modal a obnovíme dáta
      setShowWorkingHoursModal(false)
      setSelectedEmployeeForHours(null)
      setSpecificDayHoursForm({
        start_time: '',
        end_time: '',
        is_closed: false
      })
      showNotification('success', 'Pracovné hodiny boli úspešne uložené', '✅ Úspech')
      await fetchData()
    } catch (err: any) {
      console.error('❌ Error:', err)
      showNotification('error', err.message, '❌ Chyba pri ukladaní')
    }
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-white text-xl">Načítavam...</p></div>

  const totalHours = HOURS_END - HOURS_START
  const calendarHeight = totalHours * PIXELS_PER_HOUR

  // Kalendár helper funkcie
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() // 0 = nedeľa
    
    // Slovenský kalendár začína pondelkom (1), nie nedeľou (0)
    const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1
    
    return { daysInMonth, adjustedStartDay, year, month }
  }

  const isToday = (date: Date, day: number, month: number, year: number) => {
    const today = new Date()
    return date.getDate() === day && 
           date.getMonth() === month && 
           date.getFullYear() === year &&
           today.getDate() === day &&
           today.getMonth() === month &&
           today.getFullYear() === year
  }

  const isSelectedDate = (day: number, month: number, year: number) => {
    return selectedDate.getDate() === day &&
           selectedDate.getMonth() === month &&
           selectedDate.getFullYear() === year
  }

  const { daysInMonth, adjustedStartDay, year, month } = getDaysInMonth(calendarView)
  const monthNames = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December']
  const dayNames = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Custom Notification System */}
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
      
      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl border-4 border-black max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-black mb-3">{confirmModal.title}</h3>
            <p className="text-gray-700 text-lg mb-6">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelConfirmAction}
                className="px-6 py-3 bg-gray-300 text-black rounded-lg font-bold hover:bg-gray-400 transition-colors"
              >
                ✕ Zrušiť
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
              >
                🗑️ Potvrdiť
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white text-black p-6 border-b-4 border-black">
        <div className="max-w-[1800px] mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">📅 Kalendár</h1>
            <p className="text-gray-600">{profile?.full_name} ({profile?.role === 'admin' ? '👑 Admin' : profile?.role === 'employee' ? '👔 Zamestnanec' : '👤 Zákazník'})</p>
          </div>
          <div className="flex gap-4">
            {/* Služby - admin alebo zamestnanec s oprávnením */}
            {(profile?.role === 'admin' || (profile?.role === 'employee' && profile?.permissions?.services)) && (
              <button onClick={() => router.push('/services')} className="px-6 py-3 bg-black text-white rounded-lg font-bold border-2 border-black hover:bg-gray-800">
                ⚙️ Služby
              </button>
            )}
            {/* Pracovné hodiny - admin alebo zamestnanec s oprávnením */}
            {(profile?.role === 'admin' || (profile?.role === 'employee' && profile?.permissions?.working_hours)) && (
              <button onClick={() => router.push('/working-hours')} className="px-6 py-3 bg-black text-white rounded-lg font-bold border-2 border-black hover:bg-gray-800">
                ⏰ Pracovné hodiny
              </button>
            )}
            {/* Štatistiky - admin alebo zamestnanec s oprávnením */}
            {(profile?.role === 'admin' || (profile?.role === 'employee' && profile?.permissions?.statistics)) && (
              <button onClick={() => router.push('/statistics')} className="px-6 py-3 bg-black text-white rounded-lg font-bold border-2 border-black hover:bg-gray-800">
                📊 Štatistiky
              </button>
            )}
            {/* Používatelia - admin alebo zamestnanec s oprávnením */}
            {(profile?.role === 'admin' || (profile?.role === 'employee' && profile?.permissions?.users)) && (
              <button onClick={() => router.push('/users')} className="px-6 py-3 bg-black text-white rounded-lg font-bold border-2 border-black hover:bg-gray-800">
                👥 Používatelia
              </button>
            )}
            <button onClick={() => router.push('/profile')} className="px-6 py-3 bg-black text-white rounded-lg font-bold border-2 border-black hover:bg-gray-800">
              👤 Profil
            </button>
            <button onClick={() => {supabase.auth.signOut(); router.push('/login')}} className="px-6 py-3 bg-gray-200 text-black rounded-lg font-bold border-2 border-black hover:bg-gray-300">
              Odhlásiť
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-6 grid grid-cols-[300px_1fr] gap-6">
        <div className="space-y-6 sticky top-6 self-start">
          {/* Date picker */}
          <div className="bg-white text-black rounded-2xl p-6 border-4 border-gray-900">
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => {
                  const d = new Date(calendarView)
                  d.setMonth(d.getMonth() - 1)
                  setCalendarView(d)
                }} 
                className="p-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800">
                ←
              </button>
              <h2 className="text-xl font-bold">
                {monthNames[month]} {year}
              </h2>
              <button 
                onClick={() => {
                  const d = new Date(calendarView)
                  d.setMonth(d.getMonth() + 1)
                  setCalendarView(d)
                }} 
                className="p-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800">
                →
              </button>
            </div>

            {/* Dni v týždni */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-bold text-gray-600 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Dni v mesiaci */}
            <div className="grid grid-cols-7 gap-1">
              {/* Prázdne bunky pred prvým dňom */}
              {Array.from({ length: adjustedStartDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square"></div>
              ))}
              
              {/* Dni v mesiaci */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateObj = new Date(year, month, day)
                const isTodayDate = isToday(dateObj, day, month, year)
                const isSelected = isSelectedDate(day, month, year)
                
                return (
                  <button
                    key={day}
                    onClick={() => {
                      setSelectedDate(new Date(year, month, day))
                    }}
                    className={`aspect-square rounded-lg font-bold text-sm transition-all hover:scale-105 ${
                      isSelected 
                        ? 'bg-black text-white' 
                        : isTodayDate 
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}>
                    {day}
                  </button>
                )
              })}
            </div>

            <button 
              onClick={() => {
                const today = new Date()
                setSelectedDate(today)
                setCalendarView(today)
              }} 
              className="w-full mt-4 py-2 bg-gray-200 text-black rounded-lg font-bold border-2 border-black hover:bg-gray-300">
              📅 Dnes
            </button>

            {/* Zobrazenie vybraného dátumu */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border-2 border-gray-900">
              <p className="text-xs text-gray-600 mb-1">Vybraný dátum:</p>
              <p className="font-bold">{selectedDate.toLocaleDateString('sk-SK', {day:'numeric',month:'long',year:'numeric'})}</p>
              <p className="text-sm text-gray-600">{selectedDate.toLocaleDateString('sk-SK', {weekday:'long'})}</p>
            </div>
          </div>

          {/* Nová rezervácia tlačidlo */}
          <div className="bg-white text-black rounded-2xl p-6 border-4 border-gray-900">
            <button
              onClick={openCreateModal}
              className="w-full py-4 bg-black text-white rounded-xl font-bold text-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-3 mb-3">
              <span className="text-3xl">➕</span>
              <span>Nová rezervácia</span>
            </button>
            
            {/* Súkromný termín tlačidlo (pre admina a zamestnancov) */}
            {(profile?.role === 'admin' || profile?.role === 'employee') && (
              <button
                onClick={() => {
                  setPrivateForm({
                    employee_id: employees[0]?.id || '',
                    reservation_date: formatDateToString(selectedDate),
                    start_time: '09:00',
                    end_time: '10:00',
                    notes: ''
                  })
                  setShowPrivateModal(true)
                }}
                className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold text-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-3">
                <span className="text-3xl">🔒</span>
                <span>Súkromný termín</span>
              </button>
            )}
            
            <p className="text-sm text-gray-600 mt-4 text-center">
              Kliknite pre vytvorenie novej rezervácie
            </p>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white text-black rounded-2xl p-6 border-4 border-gray-900">
          <h2 className="text-2xl font-bold mb-6">Časový rozvrh (presnosť 5 min)</h2>
          <div className="flex gap-4">
            {/* Time labels */}
            <div className="w-16 flex-shrink-0">
              {/* Spacer pre hlavičku */}
              <div className="h-[60px]"></div>
              {/* Time labels */}
              <div className="relative" style={{ height: `${calendarHeight}px` }}>
                {Array.from({ length: totalHours + 1 }, (_, i) => (
                  <div 
                    key={i} 
                    className="absolute text-sm font-bold text-gray-700"
                    style={{ top: `${i * PIXELS_PER_HOUR - 8}px` }}
                  >
                    {`${HOURS_START + i}:00`}
                  </div>
                ))}
              </div>
            </div>

            {/* Employee columns */}
            <div className="flex-1 grid gap-4 relative" style={{ gridTemplateColumns: `repeat(${employees.length}, 1fr)` }}>
              {/* Current time line - single red line across all columns */}
              {(() => {
                const timeLinePosition = getCurrentTimePosition()
                if (timeLinePosition !== null && timeLinePosition >= 0 && timeLinePosition <= calendarHeight) {
                  return (
                    <div 
                      className="absolute w-full z-50 pointer-events-none"
                      style={{ top: `${timeLinePosition + 60}px` }}
                    >
                      <div className="relative">
                        <div className="absolute w-full h-0.5 bg-red-600 shadow-lg shadow-red-500/50"></div>
                        <div className="absolute -left-2 -top-2 w-4 h-4 bg-red-600 rounded-full shadow-lg shadow-red-500/50"></div>
                      </div>
                    </div>
                  )
                }
                return null
              })()}
              
              {employees.map(emp => (
                <div key={emp.id} className="flex flex-col">
                  <div className="font-bold text-center pb-3 border-b-2 border-gray-900 mb-2">
                    <div>{emp.name}</div>
                    <div className="text-sm font-normal text-gray-600">{emp.position}</div>
                  </div>
                  <div 
                    ref={calendarRef}
                    data-employee-calendar={emp.id}
                    onClick={(e) => {
                      // Ak klikáme na samotný kalendár (nie na rezerváciu alebo šedý blok)
                      if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('border-t')) {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const clickY = e.clientY - rect.top
                        const minutesFromStart = Math.max(0, (clickY / PIXELS_PER_HOUR) * 60)
                        const totalMinutes = HOURS_START * 60 + snapToInterval(minutesFromStart)
                        const clickTime = minutesToTime(totalMinutes)
                        
                        // Vypočítaj end_time (defaultne +1 hodina)
                        const endMinutes = totalMinutes + 60
                        const endTime = minutesToTime(endMinutes)
                        
                        // Otvor súkromný termín modal s predvyplnenými údajmi
                        setPrivateForm({
                          employee_id: emp.id,
                          reservation_date: formatDateToString(selectedDate),
                          start_time: clickTime,
                          end_time: endTime,
                          notes: ''
                        })
                        setEditingPrivateEvent(null) // Nový termín, nie editácia
                        setShowPrivateModal(true)
                      }
                    }}
                    className="relative border-2 border-gray-300 rounded-lg bg-gray-50 cursor-pointer"
                    style={{ height: `${calendarHeight}px` }}
                  >
                    {/* Hour lines */}
                    {Array.from({ length: totalHours * 2 }, (_, i) => (
                      <div 
                        key={i} 
                        className="absolute w-full border-t border-gray-300"
                        style={{ top: `${i * (PIXELS_PER_HOUR / 2)}px` }}
                      />
                    ))}
                    
                    {/* Nepracovné hodiny (šedé bloky) */}
                    {(() => {
                      const hours = getEmployeeWorkingHours(emp.id)
                      if (!hours.isWorking) {
                        // Celý deň nepracuje
                        return (
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedEmployeeForHours(emp)
                              setShowWorkingHoursModal(true)
                            }}
                            className="absolute bg-gray-400 bg-opacity-50 cursor-pointer hover:bg-opacity-60 transition-all"
                            style={{
                              top: 0,
                              left: 0,
                              right: 0,
                              height: `${calendarHeight}px`
                            }}
                          >
                            <div className="flex items-center justify-center h-full">
                              <p className="text-gray-700 font-bold text-lg">🚫 Nepracuje</p>
                            </div>
                          </div>
                        )
                      }
                      
                      const workStart = timeToMinutes(hours.start)
                      const workEnd = timeToMinutes(hours.end)
                      const blocks = []
                      
                      // Blok pred pracovným časom
                      if (workStart > 0) {
                        const beforeHeight = getBlockHeight(workStart)
                        blocks.push(
                          <div
                            key="before"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedEmployeeForHours(emp)
                              setShowWorkingHoursModal(true)
                            }}
                            className="absolute bg-gray-400 bg-opacity-30 cursor-pointer hover:bg-opacity-40 transition-all flex items-center justify-center"
                            style={{
                              top: 0,
                              left: 0,
                              right: 0,
                              height: `${beforeHeight}px`
                            }}
                          >
                            {beforeHeight > 60 && (
                              <p className="text-gray-700 font-bold text-sm">🔒 Zatvorené</p>
                            )}
                          </div>
                        )
                      }
                      
                      // Blok po pracovnom čase
                      if (workEnd < 24 * 60) {
                        const afterHeight = 24 * 60 - workEnd
                        const afterHeightPx = getBlockHeight(afterHeight)
                        blocks.push(
                          <div
                            key="after"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedEmployeeForHours(emp)
                              setShowWorkingHoursModal(true)
                            }}
                            className="absolute bg-gray-400 bg-opacity-30 cursor-pointer hover:bg-opacity-40 transition-all flex items-center justify-center"
                            style={{
                              top: `${getBlockHeight(workEnd)}px`,
                              left: 0,
                              right: 0,
                              height: `${afterHeightPx}px`
                            }}
                          >
                            {afterHeightPx > 60 && (
                              <p className="text-gray-700 font-bold text-sm">🔒 Zatvorené</p>
                            )}
                          </div>
                        )
                      }
                      
                      return blocks
                    })()}
                    
                    {/* Reservations */}
                    {reservations
                      .filter(r => r.employee_id === emp.id)
                      .map(r => {
                        const isOwner = r.user_id === user?.id
                        const editable = canEdit(r)
                        const top = getTopPosition(r.reservation_time.slice(0, 5))
                        
                        // Pre súkromné termíny vypočítaj výšku z end_time, inak zo služby
                        let height
                        let endTime
                        if (r.is_private && r.end_time) {
                          const startMinutes = timeToMinutes(r.reservation_time.slice(0, 5))
                          const endMinutes = timeToMinutes(r.end_time.slice(0, 5))
                          const duration = endMinutes - startMinutes
                          height = getBlockHeight(duration)
                          endTime = r.end_time.slice(0, 5)
                        } else {
                          height = getBlockHeight(r.services?.duration_minutes || 30)
                          endTime = getEndTime(r.reservation_time.slice(0, 5), r.services?.duration_minutes || 30)
                        }
                        
                        // Určenie farby bloku - súkromné termíny aj admin rezervácie sú čierne
                        const isCreatedByAdmin = r.user_profile?.role === 'admin'
                        const blockColor = (isCreatedByAdmin || r.is_private) ? 'bg-black' : employeeColors[emp.id] || 'bg-gray-600'
                        
                        // Kontrola, či má používateľ právo vidieť osobné údaje
                        const canSeePersonalInfo = profile?.role === 'admin' || profile?.role === 'employee' || r.user_id === user?.id
                        
                        // Ak je tento blok práve dragovaný, nezobrazujeme ho na originálnej pozícii
                        if (isDragging && draggedItem?.id === r.id) return null
                        
                        return (
                          <div
                            key={r.id}
                            onMouseDown={(e) => editable && handleMouseDown(e, r, emp.id)}
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute rounded-lg shadow-lg group transition-all select-none ${blockColor} text-white ${editable ? 'cursor-pointer hover:scale-105' : 'cursor-default'} overflow-hidden`}
                            style={{ 
                              top: `${top}px`, 
                              height: `${height}px`,
                              minHeight: '35px',
                              left: '4px',
                              right: '4px',
                              padding: height < 50 ? '4px 8px' : '8px'
                            }}
                          >
                            {/* Veľké bloky (>120px) - všetky info vrátane poznámok */}
                            {height > 120 && (
                              <>
                                {r.is_private ? (
                                  // Súkromný termín
                                  <>
                                    <p className="font-bold text-sm leading-tight truncate mb-1">🔒 Súkromný termín</p>
                                    <p className="text-xs opacity-90 truncate">📅 {r.reservation_date}</p>
                                    <p className="text-xs opacity-90 truncate">
                                      ⏱️ {r.reservation_time.slice(0, 5)} - {endTime}
                                    </p>
                                    {r.notes && <p className="text-xs opacity-80 truncate mt-1">💬 {r.notes}</p>}
                                  </>
                                ) : (
                                  // Normálna rezervácia
                                  <>
                                    <p className="font-bold text-sm leading-tight truncate mb-1">
                                      {canSeePersonalInfo ? `📋 ${r.services?.name}` : '🔒 Obsadené'}
                                    </p>
                                    {canSeePersonalInfo && (
                                      <>
                                        <p className="text-xs opacity-90 truncate">👤 {r.first_name} {r.last_name}</p>
                                        <p className="text-xs opacity-90 truncate">📞 {r.phone}</p>
                                      </>
                                    )}
                                    <p className="text-xs opacity-90 truncate">
                                      ⏱️ {r.reservation_time.slice(0, 5)} - {endTime}
                                    </p>
                                    {canSeePersonalInfo && r.notes && <p className="text-xs opacity-80 truncate mt-1">💬 {r.notes}</p>}
                                  </>
                                )}
                              </>
                            )}
                            
                            {/* Stredné bloky (80-120px) - základné info BEZ poznámok */}
                            {height > 80 && height <= 120 && (
                              <>
                                {r.is_private ? (
                                  // Súkromný termín
                                  <>
                                    <p className="font-bold text-sm leading-tight truncate mb-1">🔒 Súkromný termín</p>
                                    <p className="text-xs opacity-90 truncate">📅 {r.reservation_date}</p>
                                    <p className="text-xs opacity-90 truncate">
                                      ⏱️ {r.reservation_time.slice(0, 5)} - {endTime}
                                    </p>
                                  </>
                                ) : (
                                  // Normálna rezervácia
                                  <>
                                    <p className="font-bold text-sm leading-tight truncate mb-1">
                                      {canSeePersonalInfo ? `📋 ${r.services?.name}` : '🔒 Obsadené'}
                                    </p>
                                    {canSeePersonalInfo && (
                                      <>
                                        <p className="text-xs opacity-90 truncate">👤 {r.first_name} {r.last_name}</p>
                                        <p className="text-xs opacity-90 truncate">📞 {r.phone}</p>
                                      </>
                                    )}
                                    <p className="text-xs opacity-90 truncate">
                                      ⏱️ {r.reservation_time.slice(0, 5)} - {endTime}
                                    </p>
                                  </>
                                )}
                              </>
                            )}
                            
                            {/* Stredné bloky (50-80px) - základné info alebo len obsadené a čas */}
                            {height > 50 && height <= 80 && (
                              <>
                                {r.is_private ? (
                                  // Súkromný termín
                                  <>
                                    <p className="font-bold text-xs leading-tight truncate">🔒 Súkromný termín</p>
                                    {r.notes && <p className="text-xs opacity-90 truncate">{r.notes}</p>}
                                    <p className="text-xs opacity-90 truncate">
                                      {r.reservation_time.slice(0, 5)} - {endTime}
                                    </p>
                                  </>
                                ) : (
                                  // Normálna rezervácia
                                  <>
                                    <p className="font-bold text-xs leading-tight truncate">
                                      {canSeePersonalInfo ? r.services?.name : '🔒 Obsadené'}
                                    </p>
                                    {canSeePersonalInfo && (
                                      <p className="text-xs opacity-90 truncate">{r.first_name} {r.last_name}</p>
                                    )}
                                    <p className="text-xs opacity-90 truncate">
                                      {r.reservation_time.slice(0, 5)} - {endTime}
                                    </p>
                                  </>
                                )}
                              </>
                            )}
                            
                            {/* Malé bloky (35-50px) - info v riadku alebo len obsadené a čas */}
                            {height > 35 && height <= 50 && (
                              <p className="font-bold text-xs leading-tight truncate">
                                {r.is_private 
                                  ? `🔒 Súkromný • ${r.reservation_time.slice(0, 5)} - ${endTime}`
                                  : canSeePersonalInfo 
                                    ? `${r.first_name} ${r.last_name} • ${r.reservation_time.slice(0, 5)} • ${r.services?.name}`
                                    : `🔒 Obsadené • ${r.reservation_time.slice(0, 5)} - ${endTime}`
                                }
                              </p>
                            )}
                            
                            {/* Mini bloky (<=35px) - len čas a info */}
                            {height <= 35 && (
                              <p className="font-bold text-xs truncate">
                                {r.is_private 
                                  ? `🔒 ${r.reservation_time.slice(0, 5)} - ${endTime}`
                                  : canSeePersonalInfo 
                                    ? `${r.reservation_time.slice(0, 5)} • ${r.first_name} ${r.last_name}`
                                    : `🔒 Obsadené • ${r.reservation_time.slice(0, 5)}`
                                }
                              </p>
                            )}
                            
                            {/* Notes indicator - ak existuje poznámka ale nie je zobrazená */}
                            {r.notes && height <= 120 && (
                              <div className="absolute top-1 left-1 bg-yellow-500 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center z-10 shadow-md">
                                💬
                              </div>
                            )}
                            
                            {editable && (
                              <button 
                                onClick={(e) => {e.stopPropagation(); deleteRes(r.id, r)}} 
                                className="absolute top-1 right-1 bg-red-600 w-5 h-5 rounded text-xs font-bold hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                ✕
                              </button>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating drag preview */}
      {isDragging && draggedItem && (() => {
        const height = getBlockHeight(draggedItem.duration_minutes || draggedItem.services?.duration_minutes || 30)
        const canSeePersonalInfo = profile?.role === 'admin' || profile?.role === 'employee' || draggedItem.user_id === user?.id
        const isCreatedByAdmin = draggedItem.user_profile?.role === 'admin'
        const blockColor = isCreatedByAdmin ? 'bg-black' : employeeColors[draggedItem.employee_id] || 'bg-gray-600'
        
        return (
          <div
            className={`fixed pointer-events-none z-50 rounded-lg shadow-2xl ${blockColor} text-white`}
            style={{
              left: `${dragPosition.x - dragStartOffset.x}px`,
              top: `${dragPosition.y - dragStartOffset.y}px`,
              width: draggedItem.blockWidth ? `${draggedItem.blockWidth}px` : '220px',
              height: `${height}px`,
              minHeight: '35px',
              opacity: 0.85,
              padding: height < 50 ? '4px 8px' : '8px'
            }}
          >
            {/* Veľké bloky (>80px) */}
            {height > 80 && (
              <>
                <p className="font-bold text-sm leading-tight truncate mb-1">
                  {canSeePersonalInfo ? `📋 ${draggedItem.services?.name}` : '🔒 Obsadené'}
                </p>
                {canSeePersonalInfo && (
                  <>
                    <p className="text-xs opacity-90 truncate">👤 {draggedItem.first_name} {draggedItem.last_name}</p>
                    <p className="text-xs opacity-90 truncate">📞 {draggedItem.phone}</p>
                  </>
                )}
                <p className="text-xs opacity-90 truncate">
                  ⏱️ {draggedItem.reservation_time.slice(0, 5)} - {getEndTime(draggedItem.reservation_time.slice(0, 5), draggedItem.services?.duration_minutes || 30)}
                </p>
                {canSeePersonalInfo && draggedItem.notes && <p className="text-xs opacity-80 truncate mt-1">💬 {draggedItem.notes}</p>}
              </>
            )}
            
            {/* Stredné bloky (50-80px) */}
            {height > 50 && height <= 80 && (
              <>
                <p className="font-bold text-xs leading-tight truncate">
                  {canSeePersonalInfo ? draggedItem.services?.name : '🔒 Obsadené'}
                </p>
                {canSeePersonalInfo && (
                  <p className="text-xs opacity-90 truncate">{draggedItem.first_name} {draggedItem.last_name}</p>
                )}
                <p className="text-xs opacity-90 truncate">
                  {draggedItem.reservation_time.slice(0, 5)} - {getEndTime(draggedItem.reservation_time.slice(0, 5), draggedItem.services?.duration_minutes || 30)}
                </p>
              </>
            )}
            
            {/* Malé bloky (35-50px) */}
            {height > 35 && height <= 50 && (
              <p className="font-bold text-xs leading-tight truncate">
                {canSeePersonalInfo 
                  ? `${draggedItem.first_name} ${draggedItem.last_name} • ${draggedItem.reservation_time.slice(0, 5)} • ${draggedItem.services?.name}`
                  : `🔒 Obsadené • ${draggedItem.reservation_time.slice(0, 5)} - ${getEndTime(draggedItem.reservation_time.slice(0, 5), draggedItem.services?.duration_minutes || 30)}`
                }
              </p>
            )}
            
            {/* Mini bloky (<=35px) */}
            {height <= 35 && (
              <p className="font-bold text-xs truncate">
                {canSeePersonalInfo 
                  ? `${draggedItem.reservation_time.slice(0, 5)} • ${draggedItem.first_name} ${draggedItem.last_name}`
                  : `🔒 Obsadené • ${draggedItem.reservation_time.slice(0, 5)}`
                }
              </p>
            )}
          </div>
        )
      })()}
      
      {/* Confirmation Modal for Drag and Drop */}
      {showConfirmModal && pendingMove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black rounded-2xl p-8 border-4 border-gray-900 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold mb-2">Potvrdiť presun?</h2>
              <p className="text-gray-700">
                {pendingMove.isNewReservation 
                  ? 'Naozaj chcete vytvoriť novú rezerváciu?' 
                  : 'Naozaj chcete presunúť túto rezerváciu?'}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Nový čas: <span className="font-bold">{pendingMove.time}</span>
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={cancelMove}
                className="flex-1 px-6 py-3 bg-gray-300 text-black rounded-lg font-bold hover:bg-gray-400 transition-colors"
              >
                ❌ Zrušiť
              </button>
              <button
                onClick={confirmMove}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
              >
                ✅ Potvrdiť
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Private Event Modal */}
      {showPrivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black rounded-2xl p-6 border-4 border-purple-600 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span>🔒 {editingPrivateEvent ? 'Upraviť súkromný termín' : 'Súkromný termín'}</span>
            </h2>
            
            <form onSubmit={handlePrivateSubmit} className="space-y-4">
              {/* Základné údaje */}
              <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300">
                <h3 className="font-bold mb-3 text-lg">📅 Detaily termínu</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-2">Zamestnankyňa *</label>
                    <select
                      value={privateForm.employee_id}
                      onChange={(e) => setPrivateForm({...privateForm, employee_id: e.target.value})}
                      required
                      className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block font-bold mb-2">Dátum *</label>
                    <input
                      type="date"
                      value={privateForm.reservation_date}
                      onChange={(e) => setPrivateForm({...privateForm, reservation_date: e.target.value})}
                      required
                      className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block font-bold mb-2">Čas od *</label>
                    <input
                      type="time"
                      value={privateForm.start_time}
                      onChange={(e) => setPrivateForm({...privateForm, start_time: e.target.value})}
                      required
                      className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                    />
                  </div>
                  
                  <div>
                    <label className="block font-bold mb-2">Čas do *</label>
                    <input
                      type="time"
                      value={privateForm.end_time}
                      onChange={(e) => setPrivateForm({...privateForm, end_time: e.target.value})}
                      required
                      className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block font-bold mb-2">Poznámka</label>
                  <textarea
                    value={privateForm.notes}
                    onChange={(e) => setPrivateForm({...privateForm, notes: e.target.value})}
                    className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                    rows={3}
                    placeholder="Voliteľná poznámka k termínu..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPrivateModal(false)
                    setEditingPrivateEvent(null)
                    setPrivateForm({
                      employee_id: '',
                      reservation_date: '',
                      start_time: '',
                      end_time: '',
                      notes: ''
                    })
                  }}
                  className="flex-1 px-6 py-3 bg-gray-300 text-black rounded-lg font-bold hover:bg-gray-400 transition-colors"
                >
                  Zrušiť
                </button>
                {editingPrivateEvent && (
                  <button
                    type="button"
                    onClick={() => {
                      showConfirmation(
                        '🗑️ Vymazať súkromný termín?',
                        'Naozaj chcete zmazať tento súkromný termín? Táto akcia sa nedá vrátiť späť.',
                        async () => {
                          const { error } = await supabase
                            .from('reservations')
                            .delete()
                            .eq('id', editingPrivateEvent.id)
                      
                      if (error) {
                        showNotification('error', error.message, '❌ Chyba pri mazaní')
                      } else {
                        showNotification('success', 'Súkromný termín bol úspešne vymazaný', '✅ Úspech')
                        setShowPrivateModal(false)
                        setEditingPrivateEvent(null)
                        setPrivateForm({
                          employee_id: '',
                          reservation_date: '',
                          start_time: '',
                          end_time: '',
                          notes: ''
                        })
                        await fetchData()
                      }
                        }
                      )
                    }}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
                  >
                    🗑️ Zmazať
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors"
                >
                  🔒 {editingPrivateEvent ? 'Uložiť zmeny' : 'Vytvoriť termín'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit/Create Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black rounded-2xl p-6 border-4 border-gray-900 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {isCreatingNew ? '➕ Nová rezervácia' : '✏️ Upraviť rezerváciu'}
            </h2>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Kontaktné údaje */}
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
                <h3 className="font-bold mb-3 text-lg">👤 Kontaktné údaje</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-2">Telefón *</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      required
                      className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                      placeholder="+421 123 456 789"
                    />
                  </div>
                  
                  <div>
                    <label className="block font-bold mb-2">Titul</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                      className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                      placeholder="Ing., MUDr., ..."
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block font-bold mb-2">Meno *</label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                      required
                      className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                      placeholder="Meno"
                    />
                  </div>
                  
                  <div>
                    <label className="block font-bold mb-2">Priezvisko *</label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                      required
                      className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                      placeholder="Priezvisko"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block font-bold mb-2">Email *</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    required
                    className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                    placeholder="email@priklad.sk"
                  />
                </div>
              </div>
              
              <div>
                <label className="block font-bold mb-2">Služba *</label>
                <select
                  value={editForm.service_id}
                  onChange={(e) => setEditForm({...editForm, service_id: e.target.value})}
                  required
                  className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium">
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.price}€ ({s.duration_minutes}min)
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block font-bold mb-2">Zamestnanec *</label>
                <select
                  value={editForm.employee_id}
                  onChange={(e) => setEditForm({...editForm, employee_id: e.target.value})}
                  required
                  className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium">
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.position}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-2">Dátum *</label>
                  <input
                    type="date"
                    value={editForm.reservation_date}
                    onChange={(e) => setEditForm({...editForm, reservation_date: e.target.value})}
                    required
                    className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                  />
                </div>
                
                <div>
                  <label className="block font-bold mb-2">Čas *</label>
                  <input
                    type="time"
                    value={editForm.reservation_time}
                    onChange={(e) => setEditForm({...editForm, reservation_time: e.target.value})}
                    required
                    className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                  />
                </div>
              </div>
              
              <div>
                <label className="block font-bold mb-2">Poznámky</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                  rows={3}
                  className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                  placeholder="Voliteľné poznámky..."
                />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-8 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800">
                  💾 Uložiť zmeny
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-8 py-3 bg-gray-300 text-black rounded-lg font-bold hover:bg-gray-400">
                  ✕ Zrušiť
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal pre zmenu pracovných hodín */}
      {showWorkingHoursModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border-4 border-gray-900">
            <h2 className="text-2xl font-bold mb-6 text-black">
              ⏰ Zmena pracovnej doby - {selectedEmployeeForHours?.full_name}
            </h2>
            <p className="text-gray-600 mb-6">
              Dátum: {selectedDate.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            
            <div className="space-y-6">
              <div className="border-2 border-gray-900 rounded-lg p-6 bg-white">
                <h3 className="font-bold text-lg mb-3 text-black">📋 Možnosti:</h3>
                
                <button
                  onClick={() => router.push('/working-hours')}
                  className="w-full p-4 mb-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg">🔧 Zmeniť pravidelnú pracovnú dobu</div>
                      <div className="text-sm opacity-90 mt-1">
                        Upraví pracovné hodiny pre všetky dni v týždni
                      </div>
                    </div>
                    <span className="text-2xl">→</span>
                  </div>
                </button>
                
                <div className="border-t-2 border-gray-300 my-4"></div>
                
                <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                  <h4 className="font-bold text-lg mb-3 text-black">📅 Zmeniť len pre tento deň:</h4>
                  
                  <div className="mb-4">
                    <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-300 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={specificDayHoursForm.is_closed}
                        onChange={(e) => setSpecificDayHoursForm({
                          ...specificDayHoursForm,
                          is_closed: e.target.checked,
                          start_time: '',
                          end_time: ''
                        })}
                        className="w-5 h-5"
                      />
                      <span className="font-bold text-black">🚫 Zamestnankyňa nepracuje tento deň</span>
                    </label>
                  </div>
                  
                  {!specificDayHoursForm.is_closed && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold mb-2 text-black">Začiatok *</label>
                        <input
                          type="time"
                          value={specificDayHoursForm.start_time}
                          onChange={(e) => setSpecificDayHoursForm({
                            ...specificDayHoursForm,
                            start_time: e.target.value
                          })}
                          className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium text-black"
                        />
                      </div>
                      
                      <div>
                        <label className="block font-bold mb-2 text-black">Koniec *</label>
                        <input
                          type="time"
                          value={specificDayHoursForm.end_time}
                          onChange={(e) => setSpecificDayHoursForm({
                            ...specificDayHoursForm,
                            end_time: e.target.value
                          })}
                          className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium text-black"
                        />
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={handleSaveSpecificDayHours}
                    className="w-full mt-4 px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
                  >
                    💾 Uložiť pre tento deň
                  </button>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setShowWorkingHoursModal(false)
                  setSelectedEmployeeForHours(null)
                  setSpecificDayHoursForm({
                    start_time: '',
                    end_time: '',
                    is_closed: false
                  })
                }}
                className="w-full px-8 py-3 bg-gray-300 text-black rounded-lg font-bold hover:bg-gray-400"
              >
                ✕ Zavrieť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
