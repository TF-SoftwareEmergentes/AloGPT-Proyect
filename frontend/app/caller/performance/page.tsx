'use client'

import { Sidebar } from '@/components/sidebar'
import { useEffect, useState } from 'react'

export default function CallerPerformancePage() {
  const [authorized, setAuthorized] = useState(false)
  const [stats, setStats] = useState({
    confianza_promedio: 0,
    promesas_cumplidas: 0,
    tasa_éxito: 0,
  })
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
        const res = await fetch('http://localhost:8000/api/statistics')
        const data = await res.json()
        setStats({
          confianza_promedio: data.confianza_promedio,
          promesas_cumplidas: data.promesas_cumplidas,
          tasa_éxito: data.tasa_éxito,
        })
      } catch (error) {
        console.error('Error al obtener datos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [authorized])

  if (!authorized) return null

  const weeklyTrend = [
    { day: 'Lunes', value: 75 },
    { day: 'Martes', value: 78 },
    { day: 'Miércoles', value: 82 },
    { day: 'Jueves', value: 80 },
    { day: 'Viernes', value: 85 }
  ]

  return (
    <div className="flex bg-white min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Desempeño</h1>
          <p className="text-gray-600">Análisis detallado de tu desempeño</p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
            <p className="text-gray-600 text-sm mb-2">Confianza General</p>
            <p className="text-4xl font-bold text-blue-900">{loading ? '-' : stats.confianza_promedio}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{width: `${loading ? 0 : stats.confianza_promedio}%`}}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
            <p className="text-gray-600 text-sm mb-2">Promesas Cumplidas</p>
            <p className="text-4xl font-bold text-green-600">{loading ? '-' : stats.promesas_cumplidas}</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{width: `${loading ? 0 : stats.tasa_éxito}%`}}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
            <p className="text-gray-600 text-sm mb-2">Tasa de Éxito</p>
            <p className="text-4xl font-bold text-blue-900">{loading ? '-' : stats.tasa_éxito}%</p>
            <p className="text-gray-600 text-xs mt-4">De tu total de llamadas</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Tendencia Semanal</h2>
          <div className="space-y-3">
            {weeklyTrend.map((item) => (
              <div key={item.day}>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">{item.day}</span>
                  <span className="text-gray-900 font-bold">{item.value}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{width: `${item.value}%`}}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
