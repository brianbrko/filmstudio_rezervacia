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
  
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Načítavam štatistiky...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
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
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 sm:p-6 border-b-4 border-amber-500/50">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">📊 Štatistiky</h1>
              <p className="text-gray-300 text-sm sm:text-base">Admin panel - {profile?.full_name}</p>
            </div>
            
            {/* Hamburger button - visible on mobile */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-2xl hover:bg-gray-700 rounded-lg text-white"
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
            
            {/* Desktop menu - hidden on mobile */}
            <div className="hidden lg:flex gap-4">
              <button onClick={() => router.push('/calendar')} className="px-6 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg">
                📅 Kalendár
              </button>
              {(profile?.role === 'admin' || (profile?.role === 'employee' && profile?.permissions?.services)) && (
                <button onClick={() => router.push('/services')} className="px-6 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg">
                  ⚙️ Služby
                </button>
              )}
              {(profile?.role === 'admin' || (profile?.role === 'employee' && profile?.permissions?.working_hours)) && (
                <button onClick={() => router.push('/working-hours')} className="px-6 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg">
                  ⏰ Pracovné hodiny
                </button>
              )}
              {(profile?.role === 'admin' || (profile?.role === 'employee' && profile?.permissions?.users)) && (
                <button onClick={() => router.push('/users')} className="px-6 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg">
                  👥 Používatelia
                </button>
              )}
              <button onClick={() => router.push('/profile')} className="px-6 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg">
                👤 Profil
              </button>
              <button onClick={() => setShowLogoutModal(true)} className="px-6 py-3 bg-gray-700 text-white rounded-lg font-bold border-2 border-amber-500/50 hover:bg-gray-600">
                Odhlásiť
              </button>
            </div>
          </div>
          
          {/* Mobile menu - collapsible */}
          <div 
            className="lg:hidden overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              maxHeight: isMobileMenuOpen ? '500px' : '0px',
              opacity: isMobileMenuOpen ? 1 : 0
            }}
          >
            <div className="mt-4 space-y-2 pb-2">
              <button onClick={() => {router.push('/calendar'); setIsMobileMenuOpen(false)}} className="w-full px-4 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg text-left">
                📅 Kalendár
              </button>
              {(profile?.role === 'admin' || (profile?.role === 'employee' && profile?.permissions?.services)) && (
                <button onClick={() => {router.push('/services'); setIsMobileMenuOpen(false)}} className="w-full px-4 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg text-left">
                  ⚙️ Služby
                </button>
              )}
              {(profile?.role === 'admin' || (profile?.role === 'employee' && profile?.permissions?.working_hours)) && (
                <button onClick={() => {router.push('/working-hours'); setIsMobileMenuOpen(false)}} className="w-full px-4 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg text-left">
                  ⏰ Pracovné hodiny
                </button>
              )}
              {(profile?.role === 'admin' || (profile?.role === 'employee' && profile?.permissions?.users)) && (
                <button onClick={() => {router.push('/users'); setIsMobileMenuOpen(false)}} className="w-full px-4 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg text-left">
                  👥 Používatelia
                </button>
              )}
              <button onClick={() => {router.push('/profile'); setIsMobileMenuOpen(false)}} className="w-full px-4 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg text-left">
                👤 Profil
              </button>
              <button onClick={() => {setShowLogoutModal(true); setIsMobileMenuOpen(false)}} className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg font-bold border-2 border-amber-500/50 hover:bg-gray-600 text-left">
                Odhlásiť
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-4 sm:p-6">
        {/* Filter mesiacov */}
        <div className="bg-gray-800 text-white rounded-2xl p-4 sm:p-6 border-2 sm:border-4 border-amber-500/30 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">📅 Filter podľa mesiaca</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <label className="font-bold text-base sm:text-lg">Vybrať mesiac:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border-2 border-amber-500/30 rounded-lg font-medium text-sm sm:text-lg bg-gray-700 text-white hover:bg-gray-600 cursor-pointer"
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
        <div className="bg-gray-800 text-white rounded-2xl p-6 sm:p-8 border-2 sm:border-4 border-amber-500/30 mb-4 sm:mb-6">
          <div className="text-center">
            <h2 className="text-base sm:text-xl font-bold text-gray-300 mb-2">
              {selectedMonth === 'all' ? 'Celkový počet rezervácií' : `Rezervácie za ${new Date(selectedMonth + '-01').toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}`}
            </h2>
            <p className="text-4xl sm:text-6xl font-bold text-white">{totalReservations}</p>
            <p className="text-gray-300 mt-2 text-sm sm:text-base">
              {selectedMonth === 'all' ? 'Všetky rezervácie dokopy' : 'Rezervácie v tomto období'}
            </p>
          </div>
        </div>

        {/* Štatistiky pre jednotlivé zamestnankyňe */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Rezervácie podľa zamestnankýň</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {stats.map((employee) => (
            <div 
              key={employee.id}
              className="bg-gray-800 text-white rounded-2xl p-4 sm:p-6 border-2 sm:border-4 border-amber-500/30"
            >
              <div className="text-center">
                <h3 className="text-lg sm:text-xl font-bold mb-1">{employee.name}</h3>
                <p className="text-xs sm:text-sm text-gray-300 mb-3 sm:mb-4">{employee.position}</p>
                
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl p-4 sm:p-6 mb-3 sm:mb-4">
                  <p className="text-3xl sm:text-4xl font-bold">{employee.total_reservations}</p>
                  <p className="text-xs sm:text-sm opacity-90">rezervácií</p>
                </div>

                <div className="text-xs sm:text-sm text-gray-300">
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
          <div className="bg-gray-800 text-white rounded-2xl p-8 sm:p-12 border-2 sm:border-4 border-amber-500/30 text-center">
            <p className="text-lg sm:text-xl text-gray-300">Žiadne štatistiky</p>
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 text-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-12 border-4 border-amber-500/50 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6 sm:mb-8">
              <div className="text-4xl sm:text-5xl lg:text-6xl mb-4 sm:mb-6">⚠️</div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">Odhlásiť sa?</h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-300">Naozaj sa chcete odhlásiť?</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg lg:text-xl font-bold bg-gray-700 text-white border-2 border-amber-500/30 rounded-xl sm:rounded-2xl hover:bg-gray-600 transition-all"
              >
                Zrušiť
              </button>
              <button
                onClick={() => {
                  supabase.auth.signOut()
                  router.push('/login')
                }}
                className="flex-1 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-xl sm:rounded-2xl hover:from-amber-500 hover:to-amber-700 shadow-lg transition-all"
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
