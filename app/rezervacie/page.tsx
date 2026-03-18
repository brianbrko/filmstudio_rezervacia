// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Service = Database['public']['Tables']['services']['Row']

export default function ReservationsPage() {
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<string>('')
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    reservation_date: '',
    reservation_time: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('price')
    
    if (data) setServices(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (!selectedService) {
      setMessage('Prosím vyberte službu')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/reservations/create-guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          service_id: selectedService,
          reservation_date: formData.reservation_date,
          reservation_time: formData.reservation_time,
          notes: formData.notes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage('Chyba pri vytváraní rezervácie: ' + (data.error || 'Neznáma chyba'))
      } else {
        setMessage('Rezervácia bola úspešne vytvorená! Potvrdenie bolo poslané na váš email.')
        setFormData({
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          reservation_date: '',
          reservation_time: '',
          notes: ''
        })
        setSelectedService('')
      }
    } catch (error) {
      setMessage('Chyba: ' + (error instanceof Error ? error.message : 'Neznáma chyba'))
    }

    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <a href="/" className="text-primary hover:underline">← Späť na domovskú stránku</a>
        </div>

        <h1 className="text-3xl font-bold mb-8 text-primary">Rezervácia termínu</h1>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Služba *</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Vyberte službu</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.price}€ ({service.duration_minutes} min)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Meno *</label>
            <input
              type="text"
              name="customer_name"
              value={formData.customer_name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              name="customer_email"
              value={formData.customer_email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Telefón *</label>
            <input
              type="tel"
              name="customer_phone"
              value={formData.customer_phone}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Dátum *</label>
            <input
              type="date"
              name="reservation_date"
              value={formData.reservation_date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Čas *</label>
            <input
              type="time"
              name="reservation_time"
              value={formData.reservation_time}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Poznámky</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          {message && (
            <div className={`p-4 rounded-lg ${message.includes('') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Vytváram...' : 'Vytvoriť rezerváciu'}
          </button>
        </form>
      </div>
    </div>
  )
}
