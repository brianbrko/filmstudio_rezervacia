'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setResult('Testujem pripojenie...')

    try {
      // Debug info
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      setResult(`DEBUG INFO:\nURL: ${url}\nKEY exists: ${!!key}\nKEY length: ${key?.length || 0}\n\nTestujem pripojenie...`)
      
      // Test 1: Základné pripojenie
      const { data: services, error } = await supabase
        .from('services')
        .select('*')
      
      if (error) {
        setResult(`CHYBA: ${error.message}\n\nCode: ${error.code}\nDetails: ${error.details}\nHint: ${error.hint}\n\nFull error:\n${JSON.stringify(error, null, 2)}`)
      } else {
        setResult(`PRIPOJENIE FUNGUJE!\n\nNájdené služby: ${services?.length || 0}\n\n${JSON.stringify(services, null, 2)}`)
      }
    } catch (err: any) {
      setResult(`VÝNIMKA: ${err.message}\n\nType: ${err.constructor.name}\nStack:\n${err.stack}\n\nFull:\n${JSON.stringify(err, null, 2)}`)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <a href="/" className="text-primary hover:underline">← Späť</a>
        </div>

        <h1 className="text-3xl font-bold mb-8">Test Supabase pripojenia</h1>

        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Konfigurácia:</h2>
          <div className="space-y-2 font-mono text-sm">
            <p><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'CHÝBA'}</p>
            <p><strong>ANON KEY:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Nastavený' : 'CHÝBA'}</p>
          </div>
        </div>

        <button
          onClick={testConnection}
          disabled={loading}
          className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 mb-6"
        >
          {loading ? 'Testujem...' : 'Spustiť test pripojenia'}
        </button>

        {result && (
          <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm whitespace-pre-wrap overflow-auto max-h-96">
            {result}
          </div>
        )}
      </div>
    </div>
  )
}
