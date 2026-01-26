'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ConfirmEmailPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    // Skontroluj či je používateľ prihlásený po kliknutí na email link
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) throw error
        
        if (session) {
          setStatus('success')
          // Po 3 sekundách presmeruj na kalendár
          setTimeout(() => {
            router.push('/calendar')
          }, 3000)
        } else {
          setStatus('error')
        }
      } catch (error) {
        console.error('Error:', error)
        setStatus('error')
      }
    }

    checkSession()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-gray-900 text-center">
          {status === 'loading' && (
            <>
              <div className="text-6xl mb-4">⏳</div>
              <h1 className="text-3xl font-bold mb-4 text-black">Overujem email...</h1>
              <p className="text-gray-600">Prosím čakajte</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-3xl font-bold mb-4 text-black">Email overený!</h1>
              <p className="text-gray-600 mb-6">Váš email bol úspešne overený.</p>
              <p className="text-sm text-gray-500">Presmerovávam na kalendár za 3 sekundy...</p>
              <Link 
                href="/calendar"
                className="inline-block mt-4 px-6 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800"
              >
                Prejsť na kalendár
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-3xl font-bold mb-4 text-black">Chyba</h1>
              <p className="text-gray-600 mb-6">Nepodarilo sa overiť email.</p>
              <div className="flex gap-4 justify-center">
                <Link 
                  href="/login"
                  className="px-6 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800"
                >
                  Prihlásiť sa
                </Link>
                <Link 
                  href="/register"
                  className="px-6 py-3 bg-gray-200 text-black rounded-lg font-bold hover:bg-gray-300"
                >
                  Registrovať sa
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
