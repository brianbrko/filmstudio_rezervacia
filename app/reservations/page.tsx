// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Reservation {
  id: string
  date: string
  start_time: string
  end_time: string
  service_name: string
  employee_name: string
  status: string
  notes?: string
  created_at: string
}

export default function ReservationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [upcomingReservations, setUpcomingReservations] = useState<Reservation[]>([])
  const [pastReservations, setPastReservations] = useState<Reservation[]>([])
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  // Notification system
  const [notification, setNotification] = useState<{
    show: boolean
    type: 'error' | 'success' | 'warning' | 'info'
    message: string
    title?: string
  }>({ show: false, type: 'info', message: '' })
  
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const showNotification = (
    type: 'error' | 'success' | 'warning' | 'info',
    message: string,
    title?: string
  ) => {
    setNotification({ show: true, type, message, title })
    setTimeout(() => {
      setNotification({ show: false, type: 'info', message: '' })
    }, 5000)
  }

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profileData) {
      showNotification('error', 'Profil nebol nájdený!', 'Chyba')
      setTimeout(() => router.push('/login'), 1500)
      return
    }

    // Kontrola či je používateľ zablokovaný
    if (profileData.is_blocked) {
      await supabase.auth.signOut()
      router.push('/login?blocked=true')
      return
    }

    // Redirect admins and employees to calendar
    if (profileData.role === 'admin' || profileData.role === 'employee') {
      router.push('/calendar')
      return
    }

    setProfile(profileData)
    await fetchReservations(user.id)
  }

  const fetchReservations = async (userId: string) => {
    setLoading(true)

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id,
        reservation_date,
        reservation_time,
        end_time,
        is_private,
        status,
        notes,
        created_at,
        services:service_id (name, duration_minutes),
        employees:employee_id (name)
      `)
      .eq('user_id', userId)
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true })

    if (error) {
      console.error('Error fetching reservations:', error)
      showNotification('error', 'Chyba pri načítaní rezervácií', 'Chyba')
      setLoading(false)
      return
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5)

    const upcoming: Reservation[] = []
    const past: Reservation[] = []

    data?.forEach((res: any) => {
      // Calculate end time
      const startTime = res.reservation_time.substring(0, 5) // HH:MM
      let endTime = res.end_time?.substring(0, 5) || ''
      
      // If no end_time, calculate from service duration
      if (!endTime && res.services?.duration_minutes) {
        const [hours, minutes] = startTime.split(':').map(Number)
        const totalMinutes = hours * 60 + minutes + res.services.duration_minutes
        const endHours = Math.floor(totalMinutes / 60)
        const endMinutes = totalMinutes % 60
        endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
      }
      
      const reservation: Reservation = {
        id: res.id,
        date: res.reservation_date,
        start_time: startTime,
        end_time: endTime,
        service_name: res.services?.name || 'Neznáma služba',
        employee_name: res.employees?.name || 'Neznámy zamestnanec',
        status: res.status,
        notes: res.notes,
        created_at: res.created_at
      }

      // Determine if reservation is upcoming or past
      if (res.reservation_date > today || (res.reservation_date === today && startTime >= currentTime)) {
        upcoming.push(reservation)
      } else {
        past.push(reservation)
      }
    })

    setUpcomingReservations(upcoming)
    setPastReservations(past.reverse()) // Show most recent first
    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const days = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota']
    const dayName = days[date.getDay()]
    return `${dayName}, ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2 sm:px-3 py-1 bg-green-500 text-white rounded-full text-xs sm:text-sm font-bold">✓ Potvrdené</span>
      case 'pending':
        return <span className="px-2 sm:px-3 py-1 bg-yellow-500 text-white rounded-full text-xs sm:text-sm font-bold">⏳ Čaká</span>
      case 'cancelled':
        return <span className="px-2 sm:px-3 py-1 bg-red-500 text-white rounded-full text-xs sm:text-sm font-bold">✗ Zrušené</span>
      case 'completed':
        return <span className="px-2 sm:px-3 py-1 bg-blue-500 text-white rounded-full text-xs sm:text-sm font-bold">✓ Dokončené</span>
      default:
        return <span className="px-2 sm:px-3 py-1 bg-gray-500 text-white rounded-full text-xs sm:text-sm font-bold">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Načítavam rezervácie...</p>
      </div>
    )
  }

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
      
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-[9999] ${
          notification.type === 'error' ? 'bg-red-500' :
          notification.type === 'success' ? 'bg-green-500' :
          notification.type === 'warning' ? 'bg-yellow-500' :
          'bg-blue-500'
        } text-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-2xl border-2 border-white animate-slide-in-right max-w-[90vw] sm:max-w-md`}>
          <div className="flex items-start gap-2 sm:gap-3">
            <span className="text-xl sm:text-2xl">
              {notification.type === 'error' ? '❌' :
               notification.type === 'success' ? '✅' :
               notification.type === 'warning' ? '⚠️' :
               'ℹ️'}
            </span>
            <div className="flex-1">
              {notification.title && (
                <div className="font-bold text-base sm:text-lg mb-1">{notification.title}</div>
              )}
              <div className="font-medium text-sm sm:text-base">{notification.message}</div>
            </div>
            <button 
              onClick={() => setNotification({ show: false, type: 'info', message: '' })}
              className="text-white hover:text-gray-200 text-lg sm:text-xl font-bold leading-none">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-900 text-white p-4 sm:p-6 border-b-2 border-amber-500/30 relative z-10">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src="/images/logo.png" alt="Logo" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
            <div>
              <p className="text-sm sm:text-base text-gray-300">{profile?.full_name}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4 w-full sm:w-auto">
            <button 
              onClick={() => router.push('/dashboard')} 
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg shadow-amber-500/20 text-sm sm:text-base">
              📅 Nová rezervácia
            </button>
            <button 
              onClick={() => router.push('/profile')} 
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gray-700 text-white rounded-lg font-bold border-2 border-amber-500/50 hover:bg-gray-600 text-sm sm:text-base">
              👤 Profil
            </button>
            <button 
              onClick={() => setShowLogoutModal(true)} 
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gray-700 text-white rounded-lg font-bold border-2 border-amber-500/50 hover:bg-gray-600 text-sm sm:text-base">
              Odhlásiť
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 relative z-10">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 sm:px-8 py-2 sm:py-3 rounded-lg font-bold text-base sm:text-lg border-2 transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white border-amber-500 shadow-lg'
                : 'bg-gray-800 text-white border-amber-500/30 hover:bg-gray-700'
            }`}>
            📅 Nadchádzajúce ({upcomingReservations.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 sm:px-8 py-2 sm:py-3 rounded-lg font-bold text-base sm:text-lg border-2 transition-colors ${
              activeTab === 'past'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white border-amber-500 shadow-lg'
                : 'bg-gray-800 text-white border-amber-500/30 hover:bg-gray-700'
            }`}>
            🕐 História ({pastReservations.length})
          </button>
        </div>

        {/* Reservations List */}
        <div className="space-y-4">
          {activeTab === 'upcoming' && (
            <>
              {upcomingReservations.length === 0 ? (
                <div className="bg-gray-800 rounded-2xl p-6 sm:p-12 text-center border-2 sm:border-4 border-gray-700">
                  <p className="text-xl sm:text-2xl font-bold mb-2">📭 Žiadne nadchádzajúce rezervácie</p>
                  <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6">Vytvorte si novú rezerváciu v kalendári</p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg text-sm sm:text-base">
                    📅 Vytvoriť rezerváciu
                  </button>
                </div>
              ) : (
                upcomingReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="bg-gray-800 text-white rounded-2xl p-4 sm:p-6 border-2 border-amber-500/30 shadow-lg hover:shadow-xl transition-shadow hover:border-amber-500/50">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-lg sm:text-2xl font-bold">{reservation.service_name}</h3>
                        {getStatusBadge(reservation.status)}
                      </div>
                      <p className="text-gray-300 text-sm sm:text-lg mb-1">
                        👤 {reservation.employee_name}
                      </p>
                      <p className="text-gray-300 text-sm sm:text-lg mb-1">
                        📅 {formatDate(reservation.date)}
                      </p>
                      <p className="text-gray-300 text-sm sm:text-lg">
                        🕐 {reservation.start_time} - {reservation.end_time}
                      </p>
                      {reservation.notes && (
                        <div className="mt-3 p-2 sm:p-3 bg-amber-500/10 rounded-lg border-2 border-amber-500/30">
                          <p className="text-xs sm:text-sm font-bold text-amber-400 mb-1">💬 Poznámka:</p>
                          <p className="text-sm sm:text-base text-gray-300">{reservation.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'past' && (
            <>
              {pastReservations.length === 0 ? (
                <div className="bg-gray-800 rounded-2xl p-6 sm:p-12 text-center border-2 sm:border-4 border-gray-700">
                  <p className="text-xl sm:text-2xl font-bold mb-2">📭 Žiadna história</p>
                  <p className="text-sm sm:text-base text-gray-400">Tu sa zobrazia vaše minulé rezervácie</p>
                </div>
              ) : (
                pastReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="bg-gray-800 text-white rounded-2xl p-4 sm:p-6 border-2 sm:border-4 border-gray-700 opacity-75">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <h3 className="text-lg sm:text-2xl font-bold">{reservation.service_name}</h3>
                          {getStatusBadge(reservation.status)}
                        </div>
                        <p className="text-gray-400 text-sm sm:text-lg mb-1">
                          👤 {reservation.employee_name}
                        </p>
                        <p className="text-gray-400 text-sm sm:text-lg mb-1">
                          📅 {formatDate(reservation.date)}
                        </p>
                        <p className="text-gray-400 text-sm sm:text-lg">
                          🕐 {reservation.start_time} - {reservation.end_time}
                        </p>
                        {reservation.notes && (
                          <div className="mt-3 p-2 sm:p-3 bg-gray-900 rounded-lg border-2 border-gray-600">
                            <p className="text-xs sm:text-sm font-bold text-gray-300 mb-1">💬 Poznámka:</p>
                            <p className="text-sm sm:text-base text-gray-400">{reservation.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl p-6 sm:p-8 max-w-md w-full border-4 border-amber-500/50 shadow-2xl shadow-amber-500/20">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
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
                ✅ Áno, odhlásiť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
