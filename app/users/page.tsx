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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-xl">Načítavam...</p>
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

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white text-black rounded-2xl p-8 max-w-md w-full mx-4 border-4 border-black shadow-2xl">
            <h3 className="text-2xl font-bold mb-4">{confirmModal.title}</h3>
            <p className="text-gray-700 mb-6 text-lg whitespace-pre-line">{confirmModal.message}</p>
            <div className="flex gap-4">
              <button
                onClick={handleConfirmAction}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600">
                Áno, potvrdiť
              </button>
              <button
                onClick={handleCancelConfirmation}
                className="flex-1 px-6 py-3 bg-gray-300 text-black rounded-lg font-bold hover:bg-gray-400">
                Zrušiť
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white text-black p-6 border-b-4 border-black">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">👥 Správa používateľov</h1>
            <p className="text-gray-600">Admin panel - Celkom {users.length} používateľov</p>
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
        {/* Read-only upozornenie pre zamestnancov */}
        {profile?.role === 'employee' && (
          <div className="bg-blue-100 border-l-4 border-blue-600 text-blue-800 p-4 mb-6 rounded">
            <p className="font-bold">👁️ Režim len na čítanie</p>
            <p className="text-sm">Môžete prezerať zoznam používateľov, ale nemôžete ich meniť.</p>
          </div>
        )}
        
        {/* Filter Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-6 py-3 rounded-lg font-bold transition-colors ${
              filter === 'all'
                ? 'bg-white text-black border-4 border-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            👥 Všetci ({users.length})
          </button>
          <button
            onClick={() => handleFilterChange('active')}
            className={`px-6 py-3 rounded-lg font-bold transition-colors ${
              filter === 'active'
                ? 'bg-white text-black border-4 border-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            ✅ Aktívni ({users.filter(u => !u.is_blocked).length})
          </button>
          <button
            onClick={() => handleFilterChange('blocked')}
            className={`px-6 py-3 rounded-lg font-bold transition-colors ${
              filter === 'blocked'
                ? 'bg-white text-black border-4 border-gray-900'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            🚫 Zablokovaní ({users.filter(u => u.is_blocked).length})
          </button>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <div 
              key={user.id} 
              className={`bg-white text-black rounded-2xl p-6 border-4 flex items-center justify-between ${
                user.id === currentUserId 
                  ? 'border-blue-500 bg-blue-50' 
                  : user.is_blocked 
                  ? 'border-red-500' 
                  : 'border-gray-900'
              }`}
            >
              {/* User Info */}
              <div className="flex items-center gap-6 flex-1">
                <div className="flex-1">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    {user.full_name}
                    {user.id === currentUserId && (
                      <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded">Vy</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">{user.phone || 'Bez telefónu'}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap ${
                    user.role === 'admin' 
                      ? 'bg-purple-500 text-white' 
                      : user.role === 'employee'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}>
                    {user.role === 'admin' ? '👑 Admin' : user.role === 'employee' ? '💼 Zamestnanec' : '👤 Zákazník'}
                  </span>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap ${
                    user.is_blocked 
                      ? 'bg-red-500 text-white' 
                      : 'bg-green-500 text-white'
                  }`}>
                    {user.is_blocked ? '🚫 Zablokovaný' : '✅ Aktívny'}
                  </span>
                  <p className="text-sm text-gray-600 whitespace-nowrap">
                    📅 {new Date(user.created_at).toLocaleDateString('sk-SK')}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {user.id !== currentUserId && profile?.role === 'admin' && (
                <div className="flex gap-2 ml-6">
                  <select
                    value={user.role}
                    onChange={(e) => changeRole(user.id, e.target.value as 'customer' | 'employee' | 'admin')}
                    className="px-4 py-2 border-2 border-gray-900 rounded-lg font-bold bg-white text-black hover:bg-gray-50 cursor-pointer"
                  >
                    <option value="customer">👤 Zákazník</option>
                    <option value="employee">💼 Zamestnanec</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                  <button
                    onClick={() => toggleBlock(user.id, user.is_blocked)}
                    className={`px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${
                      user.is_blocked
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    {user.is_blocked ? '✅ Odblokovať' : '🚫 Zablokovať'}
                  </button>
                  <button
                    onClick={() => deleteUser(user.id, user.full_name)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors whitespace-nowrap"
                  >
                    🗑️ Vymazať
                  </button>
                </div>
              )}
              
              {/* Employee Permissions */}
              {user.role === 'employee' && user.id !== currentUserId && (
                <div className="mt-4 pt-4 border-t-2 border-gray-200">
                  <h4 className="font-bold text-sm mb-3 text-gray-700">🔐 Oprávnenia zamestnanca:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.permissions?.services || false}
                        onChange={(e) => updatePermissions(user.id, 'services', e.target.checked)}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <span className="text-sm font-medium">🛠️ Služby</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.permissions?.working_hours || false}
                        onChange={(e) => updatePermissions(user.id, 'working_hours', e.target.checked)}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <span className="text-sm font-medium">🕐 Pracovné hodiny</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.permissions?.statistics || false}
                        onChange={(e) => updatePermissions(user.id, 'statistics', e.target.checked)}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <span className="text-sm font-medium">📊 Štatistiky</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.permissions?.users || false}
                        onChange={(e) => updatePermissions(user.id, 'users', e.target.checked)}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <span className="text-sm font-medium">👥 Používatelia</span>
                    </label>
                    <div className="flex items-center gap-2 opacity-50">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-medium">🔒 Súkromné termíny (vždy)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="bg-white text-black rounded-2xl p-12 border-4 border-gray-900 text-center">
            <p className="text-xl text-gray-500">
              {filter === 'blocked' ? 'Žiadni zablokovaní používatelia' : 
               filter === 'active' ? 'Žiadni aktívni používatelia' : 
               'Žiadni používatelia'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
