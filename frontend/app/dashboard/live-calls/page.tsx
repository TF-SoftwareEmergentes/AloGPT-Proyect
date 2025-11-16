'use client'

import { useState, useEffect } from 'react'

export default function LiveCallsPage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/records?limit=10')
        const data = await res.json()
        setRecords(data)
      } catch (error) {
        console.error('Error al obtener registros:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <main className="flex-1 p-8 bg-gray-50 overflow-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Llamadas en Vivo</h1>
        <p className="text-gray-600">Supervisión en tiempo real de todas las llamadas activas</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        {loading ? (
          <p className="text-gray-600">Cargando datos de la base de datos...</p>
        ) : records.length > 0 ? (
          <div className="space-y-3">
            {records.map((call: any, idx: number) => (
              <div key={call.file_id || call.id || idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                <div className="flex-1">
                  <p className="text-gray-900 font-bold">{call.agente}</p>
                  <p className="text-gray-600 text-sm">Cliente: {call.cliente}</p>
                  <p className="text-gray-500 text-xs">ID: {call.file_id} | Duración: {call.audio_duration}s | Sincronía: {call.sincronía_emocional}%</p>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-gray-600 text-sm">Confianza</p>
                    <div className="w-32 bg-gray-200 rounded-full h-3 mt-1">
                      <div 
                        className={`h-3 rounded-full ${
                          call.confianza >= 80 ? 'bg-green-600' :
                          call.confianza >= 50 ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}
                        style={{width: `${call.confianza}%`}}
                      ></div>
                    </div>
                  </div>
                  <div className="text-right min-w-fit">
                    <p className={`font-bold ${
                      call.confianza >= 80 ? 'text-green-600' :
                      call.confianza >= 50 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {call.confianza}%
                    </p>
                    <p className="text-gray-600 text-xs">{call.estado}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No hay llamadas activas</p>
        )}
      </div>
    </main>
  )
}
