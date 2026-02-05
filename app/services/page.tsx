// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ServicesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: ''
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
  
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  
  const showNotification = (type: 'error' | 'success' | 'warning' | 'info', message: string, title?: string) => {
    setNotification({ show: true, type, message, title })
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }))
    }, 5000)
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
  
  const handleConfirm = () => {
    confirmModal.onConfirm()
    setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })
  }
  
  const handleCancelConfirm = () => {
    setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })
  }

  useEffect(() => {
    checkUser()
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
    
    if (!profileData) {
      showNotification('error', 'Používateľ nebol nájdený!', '❌ Chyba')
      setTimeout(() => router.push('/calendar'), 1000)
      return
    }
    
    // Admin má vždy prístup, zamestnanec len s permissions.services
    const hasAccess = profileData.role === 'admin' || 
                     (profileData.role === 'employee' && profileData.permissions?.services === true)
    
    if (!hasAccess) {
      showNotification('error', 'Nemáte oprávnenie na túto stránku!', '🔒 Bez oprávnenia')
      setTimeout(() => router.push('/calendar'), 1000)
      return
    }
    
    setProfile(profileData)
    fetchServices()
  }

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('price')
    
    if (error) {
      console.error('Error fetching services:', error)
    } else {
      setServices(data || [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Normalizuj cenu - nahraď čiarku bodkou pre európsky formát
    const normalizedPrice = formData.price.replace(',', '.')
    
    const serviceData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(normalizedPrice),
      duration_minutes: parseInt(formData.duration_minutes)
    }
    
    // Validácia
    if (isNaN(serviceData.price) || serviceData.price <= 0) {
      showNotification('error', 'Zadajte kladné číslo.', '💰 Neplatná cena')
      return
    }
    
    if (isNaN(serviceData.duration_minutes) || serviceData.duration_minutes <= 0) {
      showNotification('error', 'Zadajte kladné číslo minút.', '⏱️ Neplatné trvanie')
      return
    }

    if (editingId) {
      // Update
      const { error } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', editingId)
      
      if (error) {
        showNotification('error', error.message, '❌ Chyba pri úprave')
      } else {
        showNotification('success', 'Služba bola úspešne upravená', '✅ Úspech')
        setEditingId(null)
        setFormData({ name: '', description: '', price: '', duration_minutes: '' })
        setShowAddForm(false)
        await fetchServices()
      }
    } else {
      // Create
      const { error } = await supabase
        .from('services')
        .insert([serviceData])
      
      if (error) {
        showNotification('error', error.message, '❌ Chyba pri vytváraní')
      } else {
        showNotification('success', 'Služba bola úspešne pridaná', '✅ Úspech')
        setShowAddForm(false)
        setFormData({ name: '', description: '', price: '', duration_minutes: '' })
        await fetchServices()
      }
    }
  }

  const handleEdit = (service: any) => {
    setEditingId(service.id)
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      duration_minutes: service.duration_minutes.toString()
    })
    setShowAddForm(true)
    
    // Scroll na formulár
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  const handleDelete = async (id: string, name: string) => {
    showConfirmation(
      '🗑️ Vymazať službu?',
      `Naozaj chcete vymazať službu "${name}"? Táto akcia sa nedá vrátiť späť.`,
      async () => {
        const { error } = await supabase
          .from('services')
          .delete()
          .eq('id', id)
        
        if (error) {
          showNotification('error', error.message, '❌ Chyba pri mazaní')
        } else {
          showNotification('success', 'Služba bola úspešne vymazaná', '✅ Úspech')
          fetchServices()
        }
      }
    )
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setEditingId(null)
    setFormData({ name: '', description: '', price: '', duration_minutes: '' })
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
      {/* Custom Notification System */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-[9999] animate-slide-in-right">
          <div className={`
            max-w-[90vw] sm:max-w-md rounded-xl shadow-2xl border-2 sm:border-4 p-3 sm:p-5 
            ${notification.type === 'error' ? 'bg-red-500 border-red-700' : ''}
            ${notification.type === 'success' ? 'bg-green-500 border-green-700' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-500 border-yellow-700' : ''}
            ${notification.type === 'info' ? 'bg-blue-500 border-blue-700' : ''}
          `}>
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="text-xl sm:text-3xl">
                {notification.type === 'error' && '❌'}
                {notification.type === 'success' && '✅'}
                {notification.type === 'warning' && '⚠️'}
                {notification.type === 'info' && 'ℹ️'}
              </div>
              <div className="flex-1">
                {notification.title && (
                  <div className="font-bold text-base sm:text-lg text-white mb-1">
                    {notification.title}
                  </div>
                )}
                <div className="text-white text-sm sm:text-base">
                  {notification.message}
                </div>
              </div>
              <button 
                onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                className="text-white hover:text-gray-200 text-lg sm:text-2xl leading-none"
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
          <div className="bg-gray-900 rounded-2xl border-2 sm:border-4 border-amber-500/50 max-w-md w-full p-4 sm:p-6 shadow-2xl">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">{confirmModal.title}</h3>
            <p className="text-gray-300 text-base sm:text-lg mb-4 sm:mb-6">{confirmModal.message}</p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
              <button
                onClick={handleCancelConfirm}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 border-2 border-amber-500/30 transition-colors text-sm sm:text-base"
              >
                ✕ Zrušiť
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors text-sm sm:text-base"
              >
                🗑️ Vymazať
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 sm:p-6 border-b-2 sm:border-b-4 border-amber-500/50">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">⚙️ Správa služieb</h1>
            <p className="text-gray-300 text-sm sm:text-base">Admin panel - {profile?.full_name}</p>
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
        {/* Add button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="mb-4 sm:mb-6 px-6 sm:px-8 py-3 sm:py-4 bg-green-600 text-white rounded-lg font-bold text-base sm:text-lg hover:bg-green-700 transition-colors w-full sm:w-auto">
            ➕ Pridať novú službu
          </button>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-gray-800 text-white rounded-2xl p-4 sm:p-6 border-2 sm:border-4 border-amber-500/30 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
              {editingId ? '✏️ Upraviť službu' : '➕ Nová služba'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block font-bold mb-2 text-sm sm:text-base">Názov služby *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-3 py-2 sm:p-3 border-2 border-amber-500/30 rounded-lg font-medium text-sm sm:text-base bg-gray-700 text-white"
                  placeholder="napr. Dámsky strih"
                />
              </div>
              
              <div>
                <label className="block font-bold mb-2 text-sm sm:text-base">Popis</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 sm:p-3 border-2 border-amber-500/30 rounded-lg font-medium text-sm sm:text-base bg-gray-700 text-white"
                  placeholder="napr. Profesionálny dámsky strih"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-bold mb-2 text-sm sm:text-base">Cena (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                    className="w-full px-3 py-2 sm:p-3 border-2 border-amber-500/30 rounded-lg font-medium text-sm sm:text-base bg-gray-700 text-white"
                    placeholder="25.00"
                  />
                </div>
                
                <div>
                  <label className="block font-bold mb-2 text-sm sm:text-base">Trvanie (min) *</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                    required
                    className="w-full px-3 py-2 sm:p-3 border-2 border-amber-500/30 rounded-lg font-medium text-sm sm:text-base bg-gray-700 text-white"
                    placeholder="60"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-3 sm:pt-4">
                <button
                  type="submit"
                  className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg text-sm sm:text-base">
                  {editingId ? '💾 Uložiť zmeny' : '➕ Pridať službu'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 sm:px-8 py-2 sm:py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 border-2 border-amber-500/30 text-sm sm:text-base">
                  ✕ Zrušiť
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Services List */}
        <div className="bg-gray-800 text-white rounded-2xl p-4 sm:p-6 border-2 sm:border-4 border-amber-500/30">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">📋 Zoznam služieb ({services.length})</h2>
          
          {services.length === 0 ? (
            <p className="text-gray-300 text-center py-6 sm:py-8 text-sm sm:text-base">Žiadne služby</p>
          ) : (
            <div className="space-y-3">
              {services.map(service => (
                <div
                  key={service.id}
                  className="border-2 border-amber-500/30 rounded-lg p-3 sm:p-4 hover:bg-gray-700 transition-colors bg-gray-900">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="flex-1 w-full">
                      <h3 className="text-lg sm:text-xl font-bold">{service.name}</h3>
                      {service.description && (
                        <p className="text-gray-300 text-xs sm:text-sm mt-1">{service.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 sm:gap-4 mt-2">
                        <span className="px-2 sm:px-3 py-1 bg-green-600/20 text-green-400 rounded-lg font-bold text-xs sm:text-sm border border-green-500/30">
                          💰 {service.price}€
                        </span>
                        <span className="px-2 sm:px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg font-bold text-xs sm:text-sm border border-blue-500/30">
                          ⏱️ {service.duration_minutes} min
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto sm:ml-4">
                      <button
                        onClick={() => handleEdit(service)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg text-xs sm:text-sm">
                        ✏️ Upraviť
                      </button>
                      <button
                        onClick={() => handleDelete(service.id, service.name)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 text-xs sm:text-sm">
                        🗑️ Vymazať
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Logout Confirmation Modal - Admin Theme */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 text-white rounded-2xl p-6 sm:p-8 max-w-md w-full border-4 border-amber-500/50 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold mb-2">Odhlásiť sa?</h2>
              <p className="text-gray-300">
                Naozaj sa chcete odhlásiť z administrátorského účtu?
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 border-2 border-amber-500/30"
              >
                Zrušiť
              </button>
              <button
                onClick={() => {
                  supabase.auth.signOut()
                  router.push('/login')
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg"
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
