'use client'

import { Sidebar } from '@/components/sidebar'
import { useEffect, useState } from 'react'

export default function CallerCallsPage() {
  const [authorized, setAuthorized] = useState(false)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userType = localStorage.getItem('userType')
    if (!userType) {
      window.location.href = '/login'
    } else if (userType !== 'agent') {
      window.location.href = '/dashboard'
    } else {
      setAuthorized(true)
    }
  }, [])

  useEffect(() => {
    if (!authorized) return

    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/records?limit=20')
        const data = await res.json()
        setRecords(data)
      } catch (error) {
        console.error('Error al obtener registros:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [authorized])

  if (!authorized) return null

  return (
    <div className="flex bg-white min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Llamadas</h1>
          <p className="text-gray-600">Historial completo de todas mis llamadas</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          {loading ? (
            <p className="text-gray-600">Cargando datos de la base de datos...</p>
          ) : records.length > 0 ? (
            <div className="space-y-2">
              {records.map((call: any) => (
                <div key={call.file_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                  <div className="flex-1">
                    <p className="text-gray-900 font-bold">{call.cliente}</p>
                    <p className="text-gray-600 text-sm">{new Date(call.created_at).toLocaleString()} • {call.audio_duration}s • ID: {call.file_id}</p>
                  </div>
                  <div className="text-right min-w-fit">
                    <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                      call.confianza >= 80 ? 'bg-green-100 text-green-700' :
                      call.confianza >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {call.confianza}%
                    </span>
                    <p className="text-gray-600 text-sm">{call.estado}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No hay llamadas registradas</p>
          )}
        </div>
      </main>
    </div>
  )
}
