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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-xl">Načítavam...</p>
      </div>
    )
  }

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
                onClick={handleCancelConfirm}
                className="px-6 py-3 bg-gray-300 text-black rounded-lg font-bold hover:bg-gray-400 transition-colors"
              >
                ✕ Zrušiť
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
              >
                🗑️ Vymazať
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white text-black p-6 border-b-4 border-black">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">⚙️ Správa služieb</h1>
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
        {/* Add button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="mb-6 px-8 py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition-colors">
            ➕ Pridať novú službu
          </button>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white text-black rounded-2xl p-6 border-4 border-gray-900 mb-6">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? '✏️ Upraviť službu' : '➕ Nová služba'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-bold mb-2">Názov služby *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                  placeholder="napr. Dámsky strih"
                />
              </div>
              
              <div>
                <label className="block font-bold mb-2">Popis</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                  placeholder="napr. Profesionálny dámsky strih"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-2">Cena (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                    className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                    placeholder="25.00"
                  />
                </div>
                
                <div>
                  <label className="block font-bold mb-2">Trvanie (min) *</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                    required
                    className="w-full p-3 border-2 border-gray-900 rounded-lg font-medium"
                    placeholder="60"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="px-8 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800">
                  {editingId ? '💾 Uložiť zmeny' : '➕ Pridať službu'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-8 py-3 bg-gray-300 text-black rounded-lg font-bold hover:bg-gray-400">
                  ✕ Zrušiť
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Services List */}
        <div className="bg-white text-black rounded-2xl p-6 border-4 border-gray-900">
          <h2 className="text-2xl font-bold mb-6">📋 Zoznam služieb ({services.length})</h2>
          
          {services.length === 0 ? (
            <p className="text-gray-600 text-center py-8">Žiadne služby</p>
          ) : (
            <div className="space-y-3">
              {services.map(service => (
                <div
                  key={service.id}
                  className="border-2 border-gray-900 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{service.name}</h3>
                      {service.description && (
                        <p className="text-gray-600 text-sm mt-1">{service.description}</p>
                      )}
                      <div className="flex gap-4 mt-2">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg font-bold text-sm">
                          💰 {service.price}€
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold text-sm">
                          ⏱️ {service.duration_minutes} min
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(service)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
                        ✏️ Upraviť
                      </button>
                      <button
                        onClick={() => handleDelete(service.id, service.name)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">
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
    </div>
  )
}
