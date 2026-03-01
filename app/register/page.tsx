'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

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

      if (authError) {
        // Preklad Supabase chybových hlášok
        if (authError.message.includes('User already registered')) {
          throw new Error('Tento email je už zaregistrovaný')
        } else if (authError.message.includes('Password should be at least')) {
          throw new Error('Heslo musí mať aspoň 6 znakov')
        } else if (authError.message.includes('Unable to validate email')) {
          throw new Error('Neplatná emailová adresa')
        } else if (authError.message.includes('Invalid email')) {
          throw new Error('Neplatná emailová adresa')
        } else {
          throw authError
        }
      }

      if (authData.user) {
        showNotification(
          'success', 
          'Skontrolujte svoju emailovú schránku a overte registráciu kliknutím na link v emaile. Po overení sa môžete prihlásiť.', 
          'Overte váš email'
        )
        setTimeout(() => router.push('/login'), 8000)
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.message || 'Chyba pri registrácii')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Animated wave background - TOP */}
      <div className="absolute inset-0 z-0">
        <svg className="absolute top-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{height: '30%', transform: 'rotate(180deg)'}}>
          <path fill="#f59e0b" fillOpacity="0.2" d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z">
            <animate attributeName="d" dur="8s" repeatCount="indefinite" values="
              M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,128L48,133.3C96,139,192,149,288,138.7C384,128,480,96,576,90.7C672,85,768,107,864,128C960,149,1056,171,1152,170.7C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </path>
        </svg>
        <svg className="absolute top-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{height: '25%', transform: 'rotate(180deg)'}}>
          <path fill="#f59e0b" fillOpacity="0.1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,154.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z">
            <animate attributeName="d" dur="11s" repeatCount="indefinite" values="
              M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,154.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,192L48,197.3C96,203,192,213,288,208C384,203,480,181,576,181.3C672,181,768,203,864,218.7C960,235,1056,245,1152,240C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,154.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </path>
        </svg>
        {/* BOTTOM waves */}
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{height: '40%'}}>
          <path fill="#f59e0b" fillOpacity="0.3" d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z">
            <animate attributeName="d" dur="12s" repeatCount="indefinite" values="
              M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,128L48,133.3C96,139,192,149,288,138.7C384,128,480,96,576,90.7C672,85,768,107,864,128C960,149,1056,171,1152,170.7C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </path>
        </svg>
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{height: '35%'}}>
          <path fill="#f59e0b" fillOpacity="0.15" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,154.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z">
            <animate attributeName="d" dur="17s" repeatCount="indefinite" values="
              M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,154.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,192L48,197.3C96,203,192,213,288,208C384,203,480,181,576,181.3C672,181,768,203,864,218.7C960,235,1056,245,1152,240C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
              M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,154.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </path>
        </svg>
      </div>
      
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
      
      <div className="w-full max-w-md relative z-10 px-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-amber-500/50">
          <Link href="/" className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 mb-4 font-bold transition-colors">
            <span className="text-xl sm:text-2xl">←</span>
            <span className="text-sm sm:text-base">Späť</span>
          </Link>
          <div className="flex justify-center mb-4 sm:mb-6">
            <Image 
              src="/images/logo.png" 
              alt="Art Studio Logo" 
              width={120} 
              height={120}
              className="object-contain w-20 h-20 sm:w-28 sm:h-28"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 text-white">Registrácia</h1>
          <p className="text-center text-gray-300 mb-6 sm:mb-8 text-sm sm:text-base">Vytvorte si nový účet</p>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2 text-white">Celé meno</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-amber-500/50 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-500 bg-gray-900 text-white placeholder-gray-400 text-sm sm:text-base"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-white">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-amber-500/50 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-500 bg-gray-900 text-white placeholder-gray-400 text-sm sm:text-base"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-white">Telefón</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-amber-500/50 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-500 bg-gray-900 text-white placeholder-gray-400 text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-white">Heslo</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-amber-500/50 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-500 bg-gray-900 text-white placeholder-gray-400 text-sm sm:text-base"
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
                className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-amber-500/50"
              />
              <label htmlFor="isAdmin" className="ml-3 text-xs sm:text-sm font-bold text-white">
                Registrovať ako admin
              </label>
            </div>

            {isAdmin && (
              <div>
                <label className="block text-sm font-bold mb-2 text-white">Admin kód (4 číslice)</label>
                <input
                  type="password"
                  value={formData.admin_code}
                  onChange={(e) => setFormData({ ...formData, admin_code: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-amber-500/50 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-500 bg-gray-900 text-white placeholder-gray-400 text-sm sm:text-base"
                  maxLength={4}
                  placeholder="Zadajte admin kód"
                  required={isAdmin}
                />
              </div>
            )}

            {error && (
              <div className="p-3 sm:p-4 bg-red-900/50 border-2 border-red-500 rounded-lg text-red-300 font-bold text-sm sm:text-base">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:from-amber-500 hover:to-amber-700 disabled:opacity-50 transition-colors shadow-lg shadow-amber-500/20"
            >
              {loading ? 'Vytváram účet...' : 'Registrovať'}
            </button>
          </form>

          <p className="text-center mt-4 sm:mt-6 text-gray-300 text-sm sm:text-base">
            Už máte účet?{' '}
            <Link href="/login" className="text-amber-400 font-bold hover:text-amber-300 hover:underline">
              Prihláste sa
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
