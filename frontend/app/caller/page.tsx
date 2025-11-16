'use client'

import { Sidebar } from '@/components/sidebar'
import { useEffect, useState } from 'react'

export default function CallerPage() {
  const [authorized, setAuthorized] = useState(false)
  const [userName, setUserName] = useState('Agente')
  const [stats, setStats] = useState({
    total_llamadas: 0,
    confianza_promedio: 0,
    promesas_cumplidas: 0,
    alertas_críticas: 0,
  })
  const [recentCalls, setRecentCalls] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userType = localStorage.getItem('userType')
    const name = localStorage.getItem('userName')
    
    if (!userType) {
      window.location.href = '/login'
    } else if (userType !== 'agent') {
      window.location.href = '/dashboard'
    } else {
      setAuthorized(true)
      setUserName(name || 'Agente')
      
      // Fetch statistics
      const fetchData = async () => {
        try {
          const statsRes = await fetch('http://localhost:8000/api/statistics')
          const statsData = await statsRes.json()
          setStats(statsData)
          
          const recordsRes = await fetch('http://localhost:8000/api/records?limit=5')
          const recordsData = await recordsRes.json()
          setRecentCalls(recordsData)
        } catch (error) {
          console.error('Error al obtener datos:', error)
        } finally {
          setLoading(false)
        }
      }
      fetchData()
    }
  }, [])

  if (!authorized) return null

  return (
    <div className="flex bg-white min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenida, {userName}</h1>
          <p className="text-gray-600">Tu desempeño y estadísticas</p>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
            <p className="text-gray-600 text-sm mb-2">Llamadas Totales</p>
            <p className="text-4xl font-bold text-blue-900">{stats.total_llamadas}</p>
            <p className="text-gray-500 text-xs mt-2">En el sistema</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
            <p className="text-gray-600 text-sm mb-2">Confianza Promedio</p>
            <p className="text-4xl font-bold text-blue-900">{stats.confianza_promedio}%</p>
            <p className="text-gray-500 text-xs mt-2">Tu promedio</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
            <p className="text-gray-600 text-sm mb-2">Promesas Cumplidas</p>
            <p className="text-4xl font-bold text-green-600">{stats.promesas_cumplidas}</p>
            <p className="text-gray-500 text-xs mt-2">Excelente desempeño</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
            <p className="text-gray-600 text-sm mb-2">Alertas Críticas</p>
            <p className="text-4xl font-bold text-red-600">{stats.alertas_críticas}</p>
            <p className="text-gray-500 text-xs mt-2">Requieren atención</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Llamadas Recientes</h2>
          {loading ? (
            <p className="text-gray-600">Cargando datos...</p>
          ) : recentCalls.length > 0 ? (
            <div className="space-y-3">
              {recentCalls.slice(0, 5).map((call: any, index: number) => (
                <div key={call.id_call || `call-${index}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                  <div className="flex-1">
                    <p className="text-gray-900 font-bold">{call.agente} ↔ {call.cliente}</p>
                    <p className="text-gray-600 text-sm">ID: {call.id_call} • Duración: {call.audio_duration}s • Confianza: {call.confianza}%</p>
                  </div>
                  <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                    call.estado === 'Confiable' ? 'bg-green-100 text-green-700' :
                    call.estado === 'Dudosa' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {call.estado}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No hay registros disponibles</p>
          )}
        </div>
      </main>
    </div>
  )
}
