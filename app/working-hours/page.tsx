// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function WorkingHoursPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'default' | 'employees' | 'special'>('default')
  
  // Default otváracie hodiny
  const [defaultHours, setDefaultHours] = useState<any[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Zamestnankyne a ich hodiny
  const [employees, setEmployees] = useState<any[]>([])
  const [employeeHours, setEmployeeHours] = useState<any[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  
  // Špeciálne dni
  const [specialDays, setSpecialDays] = useState<any[]>([])
  const [showAddSpecial, setShowAddSpecial] = useState(false)
  const [specialForm, setSpecialForm] = useState({
    date: '',
    start_time: '08:00',
    end_time: '18:00',
    is_closed: false,
    note: ''
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

  // Confirmation modal system
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({ show: false, title: '', message: '', onConfirm: () => {} })

  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm })
  }

  const handleConfirmAction = () => {
    confirmModal.onConfirm()
    setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })
  }

  const handleCancelConfirmation = () => {
    setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })
  }

  const dayNames = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa']

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (profile) {
      fetchAllData()
    }
  }, [profile])

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

    if (!profileData) {
      showNotification('error', 'Používateľ nebol nájdený!', 'Chyba')
      setTimeout(() => router.push('/calendar'), 1500)
      return
    }

    // Admin má vždy prístup, zamestnanec len s permissions.working_hours
    const hasAccess = profileData.role === 'admin' || 
                     (profileData.role === 'employee' && profileData.permissions?.working_hours === true)
    
    if (!hasAccess) {
      showNotification('error', 'Nemáte oprávnenie na túto stránku!', 'Prístup odmietnutý')
      setTimeout(() => router.push('/calendar'), 1500)
      return
    }

    setProfile(profileData)
  }

  const fetchAllData = async () => {
    setLoading(true)
    
    // Načítaj defaultné hodiny
    const { data: hoursData } = await supabase
      .from('working_hours')
      .select('*')
      .order('day_of_week')
    setDefaultHours(hoursData || [])

    // Načítaj zamestnankyne
    const { data: empData } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setEmployees(empData || [])
    if (empData && empData.length > 0 && !selectedEmployee) {
      setSelectedEmployee(empData[0].id)
    }

    // Načítaj hodiny zamestnankýň
    const { data: empHoursData } = await supabase
      .from('employee_working_hours')
      .select('*')
      .order('day_of_week')
    setEmployeeHours(empHoursData || [])

    // Načítaj špeciálne dni
    const { data: specialData } = await supabase
      .from('special_days')
      .select('*')
      .order('date')
    setSpecialDays(specialData || [])

    setLoading(false)
  }

  const updateDefaultHours = (dayOfWeek: number, field: string, value: any) => {
    const updatedHours = defaultHours.map(h => 
      h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
    )
    setDefaultHours(updatedHours)
    setHasUnsavedChanges(true)
  }

  const saveDefaultHours = async () => {
    for (const hour of defaultHours) {
      const { error } = await supabase
        .from('working_hours')
        .update({
          is_open: hour.is_open,
          start_time: hour.start_time,
          end_time: hour.end_time
        })
        .eq('id', hour.id)

      if (error) {
        showNotification('error', 'Chyba pri ukladaní: ' + error.message, 'Chyba')
        return
      }
    }
    
    setHasUnsavedChanges(false)
    showNotification('success', 'Zmeny uložené!', 'Úspech')
  }

  const updateEmployeeHours = async (dayOfWeek: number, field: string, value: any) => {
    if (!selectedEmployee) return

    const hour = employeeHours.find(h => h.employee_id === selectedEmployee && h.day_of_week === dayOfWeek)

    if (hour) {
      // Optimisticky update state
      const updatedHours = employeeHours.map(h =>
        h.employee_id === selectedEmployee && h.day_of_week === dayOfWeek
          ? { ...h, [field]: value }
          : h
      )
      setEmployeeHours(updatedHours)

      // Update existing
      const { error } = await supabase
        .from('employee_working_hours')
        .update({ [field]: value })
        .eq('id', hour.id)

      if (error) {
        showNotification('error', 'Chyba: ' + error.message, 'Chyba')
        await fetchAllData()
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('employee_working_hours')
        .insert([{
          employee_id: selectedEmployee,
          day_of_week: dayOfWeek,
          start_time: '08:00',
          end_time: '18:00',
          is_working: true,
          [field]: value
        }])

      if (error) {
        showNotification('error', 'Chyba: ' + error.message, 'Chyba')
      } else {
        await fetchAllData()
      }
    }
  }

  const addSpecialDay = async (e: React.FormEvent) => {
    e.preventDefault()

    const { error } = await supabase
      .from('special_days')
      .insert([specialForm])

    if (error) {
      showNotification('error', 'Chyba: ' + error.message, 'Chyba')
    } else {
      setShowAddSpecial(false)
      setSpecialForm({
        date: '',
        start_time: '08:00',
        end_time: '18:00',
        is_closed: false,
        note: ''
      })
      await fetchAllData()
    }
  }

  const deleteSpecialDay = async (id: string) => {
    showConfirmation(
      'Zmazať špeciálny deň?',
      'Naozaj zmazať tento špeciálny deň?',
      async () => {
        const { error } = await supabase
          .from('special_days')
          .delete()
          .eq('id', id)

        if (error) {
          showNotification('error', 'Chyba: ' + error.message, 'Chyba')
        } else {
          await fetchAllData()
        }
      }
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-xl">Načítavam...</p>
      </div>
    )
  }

  const selectedEmpHours = employeeHours.filter(h => h.employee_id === selectedEmployee)

  return (
    <div className="min-h-screen bg-black text-white">
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

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white text-black rounded-2xl p-4 sm:p-8 max-w-md w-full border-2 sm:border-4 border-black shadow-2xl">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{confirmModal.title}</h3>
            <p className="text-gray-700 mb-4 sm:mb-6 text-base sm:text-lg">{confirmModal.message}</p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <button
                onClick={handleConfirmAction}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 text-sm sm:text-base">
                Áno, zmazať
              </button>
              <button
                onClick={handleCancelConfirmation}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gray-300 text-black rounded-lg font-bold hover:bg-gray-400 text-sm sm:text-base">
                Zrušiť
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white text-black p-4 sm:p-6 border-b-2 sm:border-b-4 border-black">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">⏰ Správa pracovných hodín</h1>
            <p className="text-gray-600 text-sm sm:text-base">Admin panel - {profile?.full_name}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4 w-full sm:w-auto">
            <button 
              onClick={() => router.push('/calendar')} 
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-black text-white rounded-lg font-bold border-2 border-black hover:bg-gray-800 text-sm sm:text-base">
              📅 Kalendár
            </button>
            <button 
              onClick={() => setShowLogoutModal(true)} 
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 text-black rounded-lg font-bold border-2 border-black hover:bg-gray-300 text-sm sm:text-base">
              Odhlásiť
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Read-only upozornenie pre zamestnancov */}
        {profile?.role === 'employee' && (
          <div className="bg-blue-100 border-l-4 border-blue-600 text-blue-800 p-4 mb-6 rounded">
            <p className="font-bold">👁️ Režim len na čítanie</p>
            <p className="text-sm">Môžete prezerať pracovné hodiny, ale nemôžete ich meniť.</p>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
          <button
            onClick={() => setActiveTab('default')}
            className={`flex-1 min-w-[140px] sm:flex-none px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold text-sm sm:text-base ${activeTab === 'default' ? 'bg-white text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
            🏪 Otváracie hodiny
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex-1 min-w-[140px] sm:flex-none px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold text-sm sm:text-base ${activeTab === 'employees' ? 'bg-white text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
            👥 Pracovné hodiny zamestnankyň
          </button>
          <button
            onClick={() => setActiveTab('special')}
            className={`flex-1 min-w-[140px] sm:flex-none px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold text-sm sm:text-base ${activeTab === 'special' ? 'bg-white text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
            📆 Špeciálne dni
          </button>
        </div>

        {/* Default hours */}
        {activeTab === 'default' && (
          <div className="bg-white text-black rounded-2xl p-8 border-4 border-gray-900">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Predvolené otváracie hodiny</h2>
                <p className="text-gray-600">Nastavte základné otváracie hodiny pre váš salón</p>
              </div>
              {hasUnsavedChanges && profile?.role === 'admin' && (
                <button
                  onClick={saveDefaultHours}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  💾 Uložiť zmeny
                </button>
              )}
            </div>

            <div className="space-y-4">
              {dayNames.map((day, index) => {
                const hour = defaultHours.find(h => h.day_of_week === index)
                if (!hour) return null

                return (
                  <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
                    <div className="w-full sm:w-32 font-bold text-sm sm:text-base">{day}</div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                      <span className="text-gray-600 text-xs sm:text-sm">Od:</span>
                      <input
                        type="time"
                        value={hour.start_time}
                        onChange={(e) => updateDefaultHours(index, 'start_time', e.target.value)}
                        disabled={profile?.role === 'employee'}
                        className="px-2 py-1 sm:p-2 border-2 border-gray-900 rounded font-medium disabled:bg-gray-200 disabled:cursor-not-allowed text-sm sm:text-base"
                      />
                      <span className="text-gray-600 text-xs sm:text-sm">Do:</span>
                      <input
                        type="time"
                        value={hour.end_time}
                        onChange={(e) => updateDefaultHours(index, 'end_time', e.target.value)}
                        disabled={profile?.role === 'employee'}
                        className="px-2 py-1 sm:p-2 border-2 border-gray-900 rounded font-medium disabled:bg-gray-200 disabled:cursor-not-allowed text-sm sm:text-base"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Employee hours */}
        {activeTab === 'employees' && (
          <div className="bg-white text-black rounded-2xl p-8 border-4 border-gray-900">
            <h2 className="text-2xl font-bold mb-6">Pracovné hodiny zamestnankýň</h2>
            
            {/* Select employee */}
            <div className="mb-4 sm:mb-6">
              <label className="block font-bold mb-2 text-sm sm:text-base">Vyberte zamestnankyu:</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 sm:p-3 border-2 border-gray-900 rounded-lg font-medium text-sm sm:text-base">
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} - {emp.position}</option>
                ))}
              </select>
            </div>

            {/* Hours */}
            <div className="space-y-4">
              {dayNames.map((day, index) => {
                const hour = selectedEmpHours.find(h => h.day_of_week === index)
                const defaultHour = defaultHours.find(h => h.day_of_week === index)

                return (
                  <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
                    <div className="w-full sm:w-32 font-bold text-sm sm:text-base">{day}</div>
                    
                    <label className="flex items-center gap-2 cursor-pointer text-sm sm:text-base">
                      <input
                        type="checkbox"
                        checked={hour?.is_working ?? defaultHour?.is_open ?? true}
                        onChange={(e) => updateEmployeeHours(index, 'is_working', e.target.checked)}
                        disabled={profile?.role === 'employee'}
                        className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <span>Pracuje</span>
                    </label>

                    {(hour?.is_working ?? defaultHour?.is_open ?? true) && (
                      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                        <input
                          type="time"
                          value={hour?.start_time || defaultHour?.start_time || '08:00'}
                          onChange={(e) => updateEmployeeHours(index, 'start_time', e.target.value)}
                          disabled={profile?.role === 'employee'}
                          className="px-2 py-1 sm:p-2 border-2 border-gray-900 rounded font-medium disabled:bg-gray-200 disabled:cursor-not-allowed text-sm sm:text-base"
                        />
                        <span className="text-xs sm:text-sm">-</span>
                        <input
                          type="time"
                          value={hour?.end_time || defaultHour?.end_time || '18:00'}
                          onChange={(e) => updateEmployeeHours(index, 'end_time', e.target.value)}
                          disabled={profile?.role === 'employee'}
                          className="px-2 py-1 sm:p-2 border-2 border-gray-900 rounded font-medium disabled:bg-gray-200 disabled:cursor-not-allowed text-sm sm:text-base"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Special days */}
        {activeTab === 'special' && (
          <div className="bg-white text-black rounded-2xl p-8 border-4 border-gray-900">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Špeciálne dni</h2>
                <p className="text-gray-600">Sviatky, výnimky, atď.</p>
              </div>
              {profile?.role === 'admin' && (
                <button
                  onClick={() => setShowAddSpecial(true)}
                  className="px-6 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800">
                  ➕ Pridať špeciálny deň
                </button>
              )}
            </div>

            {/* Add form */}
            {showAddSpecial && (
              <form onSubmit={addSpecialDay} className="mb-6 p-4 sm:p-6 bg-gray-50 rounded-lg border-2 border-gray-900">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-bold mb-2 text-sm sm:text-base">Dátum *</label>
                    <input
                      type="date"
                      value={specialForm.date}
                      onChange={(e) => setSpecialForm({...specialForm, date: e.target.value})}
                      required
                      className="w-full px-3 py-2 sm:p-3 border-2 border-gray-900 rounded-lg text-sm sm:text-base"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={specialForm.is_closed}
                      onChange={(e) => setSpecialForm({...specialForm, is_closed: e.target.checked})}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                    <label className="font-bold text-sm sm:text-base">Zatvorené</label>
                  </div>
                </div>

                {!specialForm.is_closed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                    <div>
                      <label className="block font-bold mb-2 text-sm sm:text-base">Od</label>
                      <input
                        type="time"
                        value={specialForm.start_time}
                        onChange={(e) => setSpecialForm({...specialForm, start_time: e.target.value})}
                        className="w-full px-3 py-2 sm:p-3 border-2 border-gray-900 rounded-lg text-sm sm:text-base"
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-2 text-sm sm:text-base">Do</label>
                      <input
                        type="time"
                        value={specialForm.end_time}
                        onChange={(e) => setSpecialForm({...specialForm, end_time: e.target.value})}
                        className="w-full px-3 py-2 sm:p-3 border-2 border-gray-900 rounded-lg text-sm sm:text-base"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-3 sm:mt-4">
                  <label className="block font-bold mb-2 text-sm sm:text-base">Poznámka</label>
                  <input
                    type="text"
                    value={specialForm.note}
                    onChange={(e) => setSpecialForm({...specialForm, note: e.target.value})}
                    placeholder="Napr. Vianočné sviatky"
                    className="w-full px-3 py-2 sm:p-3 border-2 border-gray-900 rounded-lg text-sm sm:text-base"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-3 sm:mt-4">
                  <button type="submit" className="px-4 sm:px-6 py-2 sm:py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 text-sm sm:text-base">
                    Uložiť
                  </button>
                  <button type="button" onClick={() => setShowAddSpecial(false)} className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-300 rounded-lg font-bold hover:bg-gray-400 text-sm sm:text-base">
                    Zrušiť
                  </button>
                </div>
              </form>
            )}

            {/* List */}
            <div className="space-y-3">
              {specialDays.map(day => (
                <div key={day.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
                  <div>
                    <p className="font-bold">{new Date(day.date).toLocaleDateString('sk-SK')}</p>
                    {day.is_closed ? (
                      <p className="text-red-600 font-bold">🚫 Zatvorené</p>
                    ) : (
                      <p className="text-gray-600">{day.start_time} - {day.end_time}</p>
                    )}
                    {day.note && <p className="text-sm text-gray-500">{day.note}</p>}
                  </div>
                  {profile?.role === 'admin' && (
                    <button
                      onClick={() => deleteSpecialDay(day.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">
                      🗑️ Zmazať
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-12 border-4 border-black max-w-md w-full shadow-2xl">
            <div className="text-center mb-6 sm:mb-8">
              <div className="text-4xl sm:text-5xl lg:text-6xl mb-4 sm:mb-6">⚠️</div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">Odhlásiť sa?</h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-700">Naozaj sa chcete odhlásiť?</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg lg:text-xl font-bold bg-white text-black border-2 border-black rounded-xl sm:rounded-2xl hover:bg-gray-100 transition-all"
              >
                Zrušiť
              </button>
              <button
                onClick={() => {
                  supabase.auth.signOut()
                  router.push('/login')
                }}
                className="flex-1 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg lg:text-xl font-bold bg-black text-white rounded-xl sm:rounded-2xl hover:bg-gray-800 transition-all"
              >
                Áno, odhlásiť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
