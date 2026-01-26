'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

      if (data.user) {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Nesprávne prihlasovacie údaje')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-gray-900">
          <h1 className="text-4xl font-bold text-center mb-2 text-black">Prihlásenie</h1>
          <p className="text-center text-gray-600 mb-8">Vitajte späť!</p>

          <form onSubmit={handleSubmit} className="space-y-6">
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
              <label className="block text-sm font-bold mb-2 text-black">Heslo</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-900 rounded-lg focus:ring-2 focus:ring-gray-900 text-black"
                required
              />
            </div>

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
              {loading ? 'Prihlasovanie...' : 'Prihlásiť sa'}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600">
            Nemáte účet?{' '}
            <Link href="/register" className="text-black font-bold hover:underline">
              Zaregistrujte sa
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
