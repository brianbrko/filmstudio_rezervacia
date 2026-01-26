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

      {/* Header */}
      <div className="bg-white text-black p-6 border-b-4 border-black">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">👤 Môj profil</h1>
            <p className="text-gray-600">{profile?.full_name} ({profile?.role === 'admin' ? '👑 Admin' : '👤 Zákazník'})</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => {
                if (profile?.role === 'customer') {
                  router.push('/dashboard')
                } else {
                  router.push('/calendar')
                }
              }} 
              className="px-6 py-3 bg-black text-white rounded-lg font-bold border-2 border-black hover:bg-gray-800">
              📅 Kalendár
            </button>
            {profile?.role === 'customer' && (
              <button 
                onClick={() => router.push('/reservations')} 
                className="px-6 py-3 bg-black text-white rounded-lg font-bold border-2 border-black hover:bg-gray-800">
                📋 Moje rezervácie
              </button>
            )}
            <button 
              onClick={() => {supabase.auth.signOut(); router.push('/login')}} 
              className="px-6 py-3 bg-gray-200 text-black rounded-lg font-bold border-2 border-black hover:bg-gray-300">
              Odhlásiť
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-[800px] mx-auto p-6">
        <div className="bg-white text-black rounded-2xl p-8 border-4 border-gray-900">
          <h2 className="text-2xl font-bold mb-6">Osobné údaje</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Meno */}
            <div>
              <label className="block font-bold mb-2">Meno a priezvisko *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                required
                className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                placeholder="Vaše meno"
              />
            </div>

            {/* Telefón */}
            <div>
              <label className="block font-bold mb-2">Telefónne číslo</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                placeholder="+421 123 456 789"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block font-bold mb-2">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                placeholder="email@priklad.sk"
              />
              <p className="text-sm text-gray-600 mt-1">
                ⚠️ Pri zmene emailu budete odhlásený a musíte potvrdiť nový email
              </p>
            </div>

            {/* Oddeľovač */}
            <div className="border-t-2 border-gray-300 pt-6">
              <h3 className="font-bold text-lg mb-4">Zmena hesla (voliteľné)</h3>
            </div>

            {/* Nové heslo */}
            <div>
              <label className="block font-bold mb-2">Nové heslo</label>
              <input
                type="password"
                value={formData.new_password}
                onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                placeholder="Nechajte prázdne ak nechcete meniť"
                minLength={6}
              />
            </div>

            {/* Potvrdenie hesla */}
            <div>
              <label className="block font-bold mb-2">Potvrdiť nové heslo</label>
              <input
                type="password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                placeholder="Zopakujte nové heslo"
                minLength={6}
              />
            </div>

            {/* Tlačidlá */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 px-8 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800">
                💾 Uložiť zmeny
              </button>
              <button
                type="button"
                onClick={() => router.push('/calendar')}
                className="px-8 py-3 bg-gray-300 text-black rounded-lg font-bold hover:bg-gray-400">
                ✕ Zrušiť
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
