// @ts-nocheck
'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface EmployeeStats {
  id: string
  name: string
  position: string
  total_reservations: number
}

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<EmployeeStats[]>([])
  const [totalReservations, setTotalReservations] = useState(0)
  const [selectedMonth, setSelectedMonth] = useState<string>('all') // 'all' alebo 'YYYY-MM'
  const router = useRouter()

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
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('role, full_name, permissions')
      .eq('id', user.id)
      .single()

    if (profileData?.role !== 'admin' && 
        !(profileData?.role === 'employee' && profileData?.permissions?.statistics === true)) {
      showNotification('error', 'Nemáte oprávnenie na túto stránku', 'Prístup odmietnutý')
      setTimeout(() => router.push('/calendar'), 1500)
      return
    }

    setProfile(profileData)
    fetchStatistics()
  }
  
  useEffect(() => {
    if (profile) {
      fetchStatistics()
    }
  }, [selectedMonth])

  const fetchStatistics = async () => {
    setLoading(true)

    // Načítaj všetky zamestnankyňe
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)
      .order('name')

    // Načítaj rezervácie s filtrom podľa mesiaca
    let query = supabase.from('reservations').select('employee_id, reservation_date')
    
    if (selectedMonth !== 'all') {
      // Filter pre konkrétny mesiac (YYYY-MM)
      const startOfMonth = `${selectedMonth}-01`
      const year = parseInt(selectedMonth.split('-')[0])
      const month = parseInt(selectedMonth.split('-')[1])
      const lastDay = new Date(year, month, 0).getDate()
      const endOfMonth = `${selectedMonth}-${lastDay}`
      
      query = query.gte('reservation_date', startOfMonth).lte('reservation_date', endOfMonth)
    }
    
    const { data: reservations } = await query

    if (!employees || !reservations) {
      setLoading(false)
      return
    }

    // Spočítaj rezervácie pre každú zamestnankyňu
    const employeeStats: EmployeeStats[] = employees.map(emp => {
      const count = reservations.filter(r => r.employee_id === emp.id).length
      return {
        id: emp.id,
        name: emp.name,
        position: emp.position || 'Stylistka',
        total_reservations: count
      }
    })

    setStats(employeeStats)
    setTotalReservations(reservations.length)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-xl">Načítavam štatistiky...</p>
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
            <h1 className="text-3xl font-bold">📊 Štatistiky</h1>
            <p className="text-gray-600">Admin panel - {profile?.full_name}</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => router.push('/calendar')} 
              className="px-6 py-3 bg-black text-white rounded-lg font-bold border-2 border-black hover:bg-gray-800">
              📅 Kalendár
            </button>
            <button 
              onClick={() => {supabase.auth.signOut(); router.push('/login')}} 
              className="px-6 py-3 bg-gray-200 text-black rounded-lg font-bold border-2 border-black hover:bg-gray-300">
              Odhlásiť
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-6">
        {/* Filter mesiacov */}
        <div className="bg-white text-black rounded-2xl p-6 border-4 border-gray-900 mb-6">
          <h2 className="text-xl font-bold mb-4">📅 Filter podľa mesiaca</h2>
          <div className="flex items-center gap-4">
            <label className="font-bold text-lg">Vybrať mesiac:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-6 py-3 border-2 border-gray-900 rounded-lg font-medium text-lg bg-white hover:bg-gray-50 cursor-pointer"
            >
              <option value="all">🌍 Všetky mesiace</option>
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date()
                date.setMonth(date.getMonth() - i)
                const monthValue = date.toISOString().slice(0, 7) // YYYY-MM
                const monthName = date.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })
                
                return (
                  <option key={monthValue} value={monthValue} className="capitalize">
                    {monthName}
                  </option>
                )
              })}
            </select>
          </div>
        </div>
        
        {/* Celková štatistika */}
        <div className="bg-white text-black rounded-2xl p-8 border-4 border-gray-900 mb-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-600 mb-2">
              {selectedMonth === 'all' ? 'Celkový počet rezervácií' : `Rezervácie za ${new Date(selectedMonth + '-01').toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}`}
            </h2>
            <p className="text-6xl font-bold text-black">{totalReservations}</p>
            <p className="text-gray-600 mt-2">
              {selectedMonth === 'all' ? 'Všetky rezervácie dokopy' : 'Rezervácie v tomto období'}
            </p>
          </div>
        </div>

        {/* Štatistiky pre jednotlivé zamestnankyňe */}
        <h2 className="text-2xl font-bold text-white mb-4">Rezervácie podľa zamestnankyň</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((employee) => (
            <div 
              key={employee.id}
              className="bg-white text-black rounded-2xl p-6 border-4 border-gray-900"
            >
              <div className="text-center">
                <h3 className="text-xl font-bold mb-1">{employee.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{employee.position}</p>
                
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl p-6 mb-4">
                  <p className="text-4xl font-bold">{employee.total_reservations}</p>
                  <p className="text-sm opacity-90">rezervácií</p>
                </div>

                <div className="text-sm text-gray-600">
                  <p>
                    {totalReservations > 0 
                      ? `${((employee.total_reservations / totalReservations) * 100).toFixed(1)}% z celku`
                      : '0% z celku'
                    }
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {stats.length === 0 && (
          <div className="bg-white text-black rounded-2xl p-12 border-4 border-gray-900 text-center">
            <p className="text-xl text-gray-500">Žiadne štatistiky</p>
          </div>
        )}
      </div>
    </div>
  )
}
