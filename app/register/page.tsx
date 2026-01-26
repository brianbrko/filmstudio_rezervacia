'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const ADMIN_CODE = '2589'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    admin_code: ''
  })
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Kontrola admin kódu
    if (isAdmin && formData.admin_code !== ADMIN_CODE) {
      setError('Nesprávny admin kód')
      setLoading(false)
      return
    }

    try {
      // Registrácia používateľa - trigger automaticky vytvorí profil
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: {
            full_name: formData.full_name,
            phone: formData.phone,
            role: isAdmin ? 'admin' : 'customer'
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        showNotification('success', 'Môžete sa prihlásiť.', '✅ Účet vytvorený')
        setTimeout(() => router.push('/login'), 1500)
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.message || 'Chyba pri registrácii')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
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
      
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-gray-900">
          <h1 className="text-4xl font-bold text-center mb-2 text-black">Registrácia</h1>
          <p className="text-center text-gray-600 mb-8">Vytvorte si nový účet</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2 text-black">Celé meno</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-900 rounded-lg focus:ring-2 focus:ring-gray-900 text-black"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-black">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-900 rounded-lg focus:ring-2 focus:ring-gray-900 text-black"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-black">Telefón</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-900 rounded-lg focus:ring-2 focus:ring-gray-900 text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-black">Heslo</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-900 rounded-lg focus:ring-2 focus:ring-gray-900 text-black"
                required
                minLength={6}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isAdmin"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="w-5 h-5 border-2 border-gray-900"
              />
              <label htmlFor="isAdmin" className="ml-3 text-sm font-bold text-black">
                Registrovať ako admin
              </label>
            </div>

            {isAdmin && (
              <div>
                <label className="block text-sm font-bold mb-2 text-black">Admin kód (4 číslice)</label>
                <input
                  type="password"
                  value={formData.admin_code}
                  onChange={(e) => setFormData({ ...formData, admin_code: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-900 rounded-lg focus:ring-2 focus:ring-gray-900 text-black"
                  maxLength={4}
                  placeholder="Zadajte admin kód"
                  required={isAdmin}
                />
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-100 border-2 border-red-600 rounded-lg text-red-800 font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-lg font-bold text-lg hover:bg-gray-800 disabled:opacity-50 transition-colors border-2 border-black"
            >
              {loading ? 'Vytváram účet...' : 'Registrovať'}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600">
            Už máte účet?{' '}
            <Link href="/login" className="text-black font-bold hover:underline">
              Prihláste sa
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
