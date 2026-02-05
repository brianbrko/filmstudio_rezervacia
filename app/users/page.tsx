// @ts-nocheck
'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  full_name: string
  phone: string
  role: string
  is_blocked: boolean
  created_at: string
  permissions?: {
    services: boolean
    working_hours: boolean
    statistics: boolean
    users: boolean
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [profile, setProfile] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked'>('all')
  const router = useRouter()

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

  // Confirmation modal system
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({ show: false, title: '', message: '', onConfirm: () => {} })

  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm })
  }

  const handleConfirmAction = () => {
    confirmModal.onConfirm()
    setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })
  }

  const handleCancelConfirmation = () => {
    setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })
  }

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    
    setCurrentUserId(user.id)

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('role, permissions')
      .eq('id', user.id)
      .single()

    if (profileData?.role !== 'admin' && 
        !(profileData?.role === 'employee' && profileData?.permissions?.users === true)) {
      showNotification('error', 'Nemáte oprávnenie na túto stránku', 'Prístup odmietnutý')
      setTimeout(() => router.push('/calendar'), 1500)
      return
    }

    setProfile(profileData)
    fetchUsers()
  }

  const fetchUsers = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Chyba pri načítaní používateľov:', error)
      showNotification('error', 'Chyba pri načítaní používateľov', 'Chyba')
    } else {
      setUsers(data || [])
      applyFilter(data || [], filter)
    }

    setLoading(false)
  }

  const applyFilter = (userList: UserProfile[], filterType: 'all' | 'active' | 'blocked') => {
    if (filterType === 'active') {
      setFilteredUsers(userList.filter(u => !u.is_blocked))
    } else if (filterType === 'blocked') {
      setFilteredUsers(userList.filter(u => u.is_blocked))
    } else {
      setFilteredUsers(userList)
    }
  }

  const handleFilterChange = (newFilter: 'all' | 'active' | 'blocked') => {
    setFilter(newFilter)
    applyFilter(users, newFilter)
  }

  const toggleBlock = async (userId: string, currentlyBlocked: boolean) => {
    if (userId === currentUserId) {
      showNotification('error', 'Nemôžete zablokovať sám seba!', 'Chyba')
      return
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ is_blocked: !currentlyBlocked })
      .eq('id', userId)

    if (error) {
      console.error('Chyba:', error)
      showNotification('error', 'Nepodarilo sa zmeniť stav', 'Chyba')
    } else {
      showNotification(
        currentlyBlocked ? 'success' : 'warning',
        currentlyBlocked ? 'Používateľ odblokovaný' : 'Používateľ zablokovaný',
        'Úspech'
      )
      fetchUsers()
    }
  }

  const deleteUser = async (userId: string, userName: string) => {
    if (userId === currentUserId) {
      showNotification('error', 'Nemôžete vymazať sám seba!', 'Chyba')
      return
    }

    showConfirmation(
      'Vymazať používateľa?',
      `Naozaj chcete vymazať používateľa "${userName}"?\n\nTáto akcia je nevratná a vymaže:\n- Profil používateľa\n- Všetky jeho rezervácie`,
      async () => {
        // Najprv zablokovať používateľa (odhlási ho ak je prihlásený)
        const { error: blockError } = await supabase
          .from('user_profiles')
          .update({ is_blocked: true })
          .eq('id', userId)

        if (blockError) {
          console.error('Chyba pri blokovaní používateľa:', blockError)
        }

        // Počkať chvíľu aby sa používateľ odhlásil
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Najprv vymaž rezervácie
        const { error: reservationsError } = await supabase
          .from('reservations')
          .delete()
          .eq('user_id', userId)

        if (reservationsError) {
          console.error('Chyba pri mazaní rezervácií:', reservationsError)
          showNotification('error', 'Chyba pri mazaní rezervácií', 'Chyba')
          return
        }

        // Potom vymaž profil
        const { error: profileError } = await supabase
          .from('user_profiles')
          .delete()
          .eq('id', userId)

        if (profileError) {
          console.error('Chyba pri mazaní profilu:', profileError)
          showNotification('error', 'Chyba pri mazaní profilu', 'Chyba')
          return
        }

        showNotification('success', 'Používateľ vymazaný', 'Úspech')
        fetchUsers()
      }
    )
  }

  const changeRole = async (userId: string, newRole: 'customer' | 'employee' | 'admin') => {
    if (userId === currentUserId) {
      showNotification('error', 'Nemôžete zmeniť svoju vlastnú rolu!', 'Chyba')
      return
    }

    const roleNames = {
      customer: 'Zákazník',
      employee: 'Zamestnanec',
      admin: 'Admin'
    }

    showConfirmation(
      'Zmeniť rolu?',
      `Naozaj chcete zmeniť rolu na ${roleNames[newRole]}?`,
      async () => {
        const { error } = await supabase
          .from('user_profiles')
          .update({ role: newRole })
          .eq('id', userId)

        if (error) {
          console.error('Chyba:', error)
          showNotification('error', 'Nepodarilo sa zmeniť rolu', 'Chyba')
        } else {
          showNotification('success', `Rola zmenená na ${roleNames[newRole]}`, 'Úspech')
          fetchUsers()
        }
      }
    )
  }
  
  const updatePermissions = async (userId: string, permission: string, value: boolean) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    const updatedPermissions = {
      ...user.permissions,
      [permission]: value
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ permissions: updatedPermissions })
      .eq('id', userId)

    if (error) {
      console.error('Chyba:', error)
      showNotification('error', 'Nepodarilo sa zmeniť oprávnenia', 'Chyba')
    } else {
      fetchUsers()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Načítavam...</p>
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

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-gray-900 text-white rounded-2xl p-4 sm:p-8 max-w-md w-full border-2 sm:border-4 border-amber-500/50 shadow-2xl">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{confirmModal.title}</h3>
            <p className="text-gray-300 mb-4 sm:mb-6 text-base sm:text-lg whitespace-pre-line">{confirmModal.message}</p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <button
                onClick={handleConfirmAction}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 text-sm sm:text-base">
                Áno, potvrdiť
              </button>
              <button
                onClick={handleCancelConfirmation}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 border-2 border-amber-500/30 text-sm sm:text-base">
                Zrušiť
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 sm:p-6 border-b-2 sm:border-b-4 border-amber-500/50">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">👥 Správa používateľov</h1>
            <p className="text-gray-300 text-sm sm:text-base">Admin panel - Celkom {users.length} používateľov</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4 w-full sm:w-auto">
            <button 
              onClick={() => router.push('/calendar')} 
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg text-sm sm:text-base">
              📅 Kalendár
            </button>
            <button 
              onClick={() => setShowLogoutModal(true)} 
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gray-700 text-white rounded-lg font-bold border-2 border-amber-500/50 hover:bg-gray-600 text-sm sm:text-base">
              Odhlásiť
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-4 sm:p-6">
        {/* Read-only upozornenie pre zamestnancov */}
        {profile?.role === 'employee' && (
          <div className="bg-blue-100 border-l-4 border-blue-600 text-blue-800 p-3 sm:p-4 mb-4 sm:mb-6 rounded">
            <p className="font-bold text-sm sm:text-base">👁️ Režim len na čítanie</p>
            <p className="text-xs sm:text-sm">Môžete prezervať zoznam používateľov, ale nemôžete ich meniť.</p>
          </div>
        )}
        
        {/* Filter Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold transition-colors text-sm sm:text-base ${
              filter === 'all'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white shadow-lg'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            👥 Všetci ({users.length})
          </button>
          <button
            onClick={() => handleFilterChange('active')}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold transition-colors text-sm sm:text-base ${
              filter === 'active'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white shadow-lg'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            ✅ Aktívni ({users.filter(u => !u.is_blocked).length})
          </button>
          <button
            onClick={() => handleFilterChange('blocked')}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold transition-colors text-sm sm:text-base ${
              filter === 'blocked'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white shadow-lg'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            🚫 Zablokovaní ({users.filter(u => u.is_blocked).length})
          </button>
        </div>

        {/* Users List */}
        <div className="space-y-3 sm:space-y-4">
          {filteredUsers.map((user) => (
            <div 
              key={user.id} 
              className={`bg-gray-800 text-white rounded-2xl p-4 sm:p-6 border-2 sm:border-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 ${
                user.id === currentUserId 
                  ? 'border-amber-500 bg-gray-900/50' 
                  : user.is_blocked 
                  ? 'border-red-500/50' 
                  : 'border-amber-500/30'
              }`}
            >
              {/* User Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 flex-1 w-full">
                <div className="flex-1 w-full sm:w-auto">
                  <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    {user.full_name}
                    {user.id === currentUserId && (
                      <span className="text-xs px-2 py-1 bg-amber-500 text-white rounded">Vy</span>
                    )}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300">{user.phone || 'Bez telefónu'}</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-2 sm:px-3 py-1 rounded-full font-bold whitespace-nowrap ${
                    user.role === 'admin' 
                      ? 'bg-purple-500 text-white' 
                      : user.role === 'employee'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}>
                    {user.role === 'admin' ? '👑 Admin' : user.role === 'employee' ? '💼 Zamestnanec' : '👤 Zákazník'}
                  </span>
                  <span className={`text-xs px-2 sm:px-3 py-1 rounded-full font-bold whitespace-nowrap ${
                    user.is_blocked 
                      ? 'bg-red-500 text-white' 
                      : 'bg-green-500 text-white'
                  }`}>
                    {user.is_blocked ? '🚫 Zablokovaný' : '✅ Aktívny'}
                  </span>
                  <p className="text-xs sm:text-sm text-gray-300 whitespace-nowrap">
                    📅 {new Date(user.created_at).toLocaleDateString('sk-SK')}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {user.id !== currentUserId && profile?.role === 'admin' && (
                <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-6">
                  <select
                    value={user.role}
                    onChange={(e) => changeRole(user.id, e.target.value as 'customer' | 'employee' | 'admin')}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border-2 border-amber-500/30 rounded-lg font-bold bg-gray-700 text-white hover:bg-gray-600 cursor-pointer text-xs sm:text-sm"
                  >
                    <option value="customer">👤 Zákazník</option>
                    <option value="employee">💼 Zamestnanec</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                  <button
                    onClick={() => toggleBlock(user.id, user.is_blocked)}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap text-xs sm:text-sm ${
                      user.is_blocked
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    {user.is_blocked ? '✅ Odblokovať' : '🚫 Zablokovať'}
                  </button>
                  <button
                    onClick={() => deleteUser(user.id, user.full_name)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors whitespace-nowrap text-xs sm:text-sm"
                  >
                    🗑️ Vymazať
                  </button>
                </div>
              )}
              
              {/* Employee Permissions */}
              {user.role === 'employee' && user.id !== currentUserId && (
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t-2 border-amber-500/30 w-full">
                  <h4 className="font-bold text-xs sm:text-sm mb-2 sm:mb-3 text-gray-300">🔐 Oprávnenia zamestnanca:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.permissions?.services || false}
                        onChange={(e) => updatePermissions(user.id, 'services', e.target.checked)}
                        className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer"
                      />
                      <span className="text-xs sm:text-sm font-medium">🛠️ Služby</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.permissions?.working_hours || false}
                        onChange={(e) => updatePermissions(user.id, 'working_hours', e.target.checked)}
                        className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer"
                      />
                      <span className="text-xs sm:text-sm font-medium">🕐 Pracovné hodiny</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.permissions?.statistics || false}
                        onChange={(e) => updatePermissions(user.id, 'statistics', e.target.checked)}
                        className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer"
                      />
                      <span className="text-xs sm:text-sm font-medium">📊 Štatistiky</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.permissions?.users || false}
                        onChange={(e) => updatePermissions(user.id, 'users', e.target.checked)}
                        className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer"
                      />
                      <span className="text-xs sm:text-sm font-medium">👥 Používatelia</span>
                    </label>
                    <div className="flex items-center gap-2 opacity-50">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="w-4 h-4 sm:w-5 sm:h-5"
                      />
                      <span className="text-xs sm:text-sm font-medium">🔒 Súkromné termíny (vždy)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="bg-gray-800 text-white rounded-2xl p-8 sm:p-12 border-2 sm:border-4 border-amber-500/30 text-center">
            <p className="text-lg sm:text-xl text-gray-300">
              {filter === 'blocked' ? 'Žiadni zablokovaní používatelia' : 
               filter === 'active' ? 'Žiadni aktívni používatelia' : 
               'Žiadni používatelia'}
            </p>
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
