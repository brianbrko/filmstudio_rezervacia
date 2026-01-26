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
        return <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-bold">✓ Potvrdené</span>
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-bold">⏳ Čaká</span>
      case 'cancelled':
        return <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold">✗ Zrušené</span>
      case 'completed':
        return <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-bold">✓ Dokončené</span>
      default:
        return <span className="px-3 py-1 bg-gray-500 text-white rounded-full text-sm font-bold">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-xl">Načítavam rezervácie...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-[9999] ${
          notification.type === 'error' ? 'bg-red-500' :
          notification.type === 'success' ? 'bg-green-500' :
          notification.type === 'warning' ? 'bg-yellow-500' :
          'bg-blue-500'
        } text-white px-6 py-4 rounded-lg shadow-2xl border-2 border-white animate-slide-in-right max-w-md`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {notification.type === 'error' ? '❌' :
               notification.type === 'success' ? '✅' :
               notification.type === 'warning' ? '⚠️' :
               'ℹ️'}
            </span>
            <div className="flex-1">
              {notification.title && (
                <div className="font-bold text-lg mb-1">{notification.title}</div>
              )}
              <div className="font-medium">{notification.message}</div>
            </div>
            <button 
              onClick={() => setNotification({ show: false, type: 'info', message: '' })}
              className="text-white hover:text-gray-200 text-xl font-bold leading-none">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white text-black p-6 border-b-4 border-black">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">📋 Moje rezervácie</h1>
            <p className="text-gray-600">{profile?.full_name}</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => router.push('/dashboard')} 
              className="px-6 py-3 bg-black text-white rounded-lg font-bold border-2 border-black hover:bg-gray-800">
              📅 Nová rezervácia
            </button>
            <button 
              onClick={() => router.push('/profile')} 
              className="px-6 py-3 bg-gray-200 text-black rounded-lg font-bold border-2 border-black hover:bg-gray-300">
              👤 Profil
            </button>
            <button 
              onClick={() => {supabase.auth.signOut(); router.push('/login')}} 
              className="px-6 py-3 bg-gray-200 text-black rounded-lg font-bold border-2 border-black hover:bg-gray-300">
              Odhlásiť
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-[1400px] mx-auto p-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-8 py-3 rounded-lg font-bold text-lg border-2 border-black transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-white text-black'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}>
            📅 Nadchádzajúce ({upcomingReservations.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-8 py-3 rounded-lg font-bold text-lg border-2 border-black transition-colors ${
              activeTab === 'past'
                ? 'bg-white text-black'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}>
            🕐 História ({pastReservations.length})
          </button>
        </div>

        {/* Reservations List */}
        <div className="space-y-4">
          {activeTab === 'upcoming' && (
            <>
              {upcomingReservations.length === 0 ? (
                <div className="bg-gray-800 rounded-2xl p-12 text-center border-4 border-gray-700">
                  <p className="text-2xl font-bold mb-2">📭 Žiadne nadchádzajúce rezervácie</p>
                  <p className="text-gray-400 mb-6">Vytvorte si novú rezerváciu v kalendári</p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-8 py-3 bg-white text-black rounded-lg font-bold border-2 border-black hover:bg-gray-200">
                    📅 Vytvoriť rezerváciu
                  </button>
                </div>
              ) : (
                upcomingReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="bg-white text-black rounded-2xl p-6 border-4 border-black shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold">{reservation.service_name}</h3>
                        {getStatusBadge(reservation.status)}
                      </div>
                      <p className="text-gray-600 text-lg mb-1">
                        👤 {reservation.employee_name}
                      </p>
                      <p className="text-gray-600 text-lg mb-1">
                        📅 {formatDate(reservation.date)}
                      </p>
                      <p className="text-gray-600 text-lg">
                        🕐 {reservation.start_time} - {reservation.end_time}
                      </p>
                      {reservation.notes && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg border-2 border-yellow-300">
                          <p className="text-sm font-bold text-yellow-800 mb-1">💬 Poznámka:</p>
                          <p className="text-gray-700">{reservation.notes}</p>
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
                <div className="bg-gray-800 rounded-2xl p-12 text-center border-4 border-gray-700">
                  <p className="text-2xl font-bold mb-2">📭 Žiadna história</p>
                  <p className="text-gray-400">Tu sa zobrazia vaše minulé rezervácie</p>
                </div>
              ) : (
                pastReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="bg-gray-800 text-white rounded-2xl p-6 border-4 border-gray-700 opacity-75">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold">{reservation.service_name}</h3>
                          {getStatusBadge(reservation.status)}
                        </div>
                        <p className="text-gray-400 text-lg mb-1">
                          👤 {reservation.employee_name}
                        </p>
                        <p className="text-gray-400 text-lg mb-1">
                          📅 {formatDate(reservation.date)}
                        </p>
                        <p className="text-gray-400 text-lg">
                          🕐 {reservation.start_time} - {reservation.end_time}
                        </p>
                        {reservation.notes && (
                          <div className="mt-3 p-3 bg-gray-900 rounded-lg border-2 border-gray-600">
                            <p className="text-sm font-bold text-gray-300 mb-1">💬 Poznámka:</p>
                            <p className="text-gray-400">{reservation.notes}</p>
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
    </div>
  )
}
