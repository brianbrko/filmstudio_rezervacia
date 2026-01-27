// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    new_password: '',
    confirm_password: ''
  })

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

    if (profileData) {
      setProfile(profileData)
      setFormData({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
        email: user.email || '',
        new_password: '',
        confirm_password: ''
      })
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Kontrola hesla
    if (formData.new_password && formData.new_password !== formData.confirm_password) {
      showNotification('error', 'Heslá sa nezhodujú!', 'Chyba')
      return
    }

    try {
      // Aktualizuj profil
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Aktualizuj email ak sa zmenil
      if (formData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        })
        if (emailError) throw emailError
      }

      // Aktualizuj heslo ak je vyplnené
      if (formData.new_password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.new_password
        })
        if (passwordError) throw passwordError
      }

      showNotification('success', 'Profil úspešne aktualizovaný!', 'Úspech')
      
      // Vyčisti heslo polia
      setFormData({
        ...formData,
        new_password: '',
        confirm_password: ''
      })

      // Refresh profil
      await checkUser()
    } catch (error: any) {
      console.error('Error updating profile:', error)
      showNotification('error', 'Chyba pri aktualizácii: ' + error.message, 'Chyba')
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
              <p className="text-sm sm:text-base text-gray-300">{profile?.full_name} {profile?.role === 'admin' && '(👑 Admin)'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4 w-full sm:w-auto">
            <button 
              onClick={() => {
                if (profile?.role === 'customer') {
                  router.push('/dashboard')
                } else {
                  router.push('/calendar')
                }
              }} 
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg shadow-amber-500/20 text-sm sm:text-base">
              📅 Kalendár
            </button>
            {profile?.role === 'customer' && (
              <button 
                onClick={() => router.push('/reservations')} 
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gray-700 text-white rounded-lg font-bold border-2 border-amber-500/50 hover:bg-gray-600 text-sm sm:text-base">
                📋 Rezervácie
              </button>
            )}
            <button 
              onClick={() => setShowLogoutModal(true)} 
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gray-700 text-white rounded-lg font-bold border-2 border-amber-500/50 hover:bg-gray-600 text-sm sm:text-base">
              Odhlásiť
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-[800px] mx-auto p-4 sm:p-6 relative z-10">
        <div className="bg-gray-800 text-white rounded-2xl p-4 sm:p-8 border-2 border-amber-500/30">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Osobné údaje</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Meno */}
            <div>
              <label className="block font-bold mb-2 text-sm sm:text-base">Meno a priezvisko *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-amber-500/50 rounded-lg font-medium bg-gray-900 text-white placeholder-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
                placeholder="Vaše meno"
              />
            </div>

            {/* Telefón */}
            <div>
              <label className="block font-bold mb-2 text-sm sm:text-base">Telefónne číslo</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-amber-500/50 rounded-lg font-medium bg-gray-900 text-white placeholder-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
                placeholder="+421 123 456 789"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block font-bold mb-2 text-sm sm:text-base">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-amber-500/50 rounded-lg font-medium bg-gray-900 text-white placeholder-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
                placeholder="email@priklad.sk"
              />
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                ⚠️ Pri zmene emailu budete odhlásený a musíte potvrdiť nový email
              </p>
            </div>

            {/* Oddeľovač */}
            <div className="border-t-2 border-amber-500/30 pt-4 sm:pt-6">
              <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">Zmena hesla (voliteľné)</h3>
            </div>

            {/* Nové heslo */}
            <div>
              <label className="block font-bold mb-2 text-sm sm:text-base">Nové heslo</label>
              <input
                type="password"
                value={formData.new_password}
                onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-amber-500/50 rounded-lg font-medium bg-gray-900 text-white placeholder-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
                placeholder="Nechajte prázdne ak nechcete meniť"
                minLength={6}
              />
            </div>

            {/* Potvrdenie hesla */}
            <div>
              <label className="block font-bold mb-2 text-sm sm:text-base">Potvrdiť nové heslo</label>
              <input
                type="password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-amber-500/50 rounded-lg font-medium bg-gray-900 text-white placeholder-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
                placeholder="Zopakujte nové heslo"
                minLength={6}
              />
            </div>

            {/* Tlačidlá */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-3 sm:pt-4">
              <button
                type="submit"
                className="flex-1 px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg shadow-amber-500/20 text-sm sm:text-base">
                💾 Uložiť zmeny
              </button>
              <button
                type="button"
                onClick={() => router.push('/calendar')}
                className="px-6 sm:px-8 py-2 sm:py-3 bg-gray-700 text-white rounded-lg font-bold border-2 border-amber-500/50 hover:bg-gray-600 text-sm sm:text-base">
                ✕ Zrušiť
              </button>
            </div>
          </form>
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
