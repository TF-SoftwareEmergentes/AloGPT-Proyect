'use client'

import { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/lib/config'

export default function HistoricalPage() {
  const [records, setRecords] = useState<any[]>([])
  const [stats, setStats] = useState({
    total_llamadas: 0,
    confianza_promedio: 0,
    promesas_cumplidas: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await fetch(`${API_BASE_URL}/api/statistics`)
        const statsData = await statsRes.json()
        setStats({
          total_llamadas: statsData.total_llamadas || 0,
          confianza_promedio: statsData.confianza_promedio || 0,
          promesas_cumplidas: statsData.promesas_cumplidas || 0,
        })

        const recordsRes = await fetch(`${API_BASE_URL}/api/records?limit=100`)
        const recordsData = await recordsRes.json()
        setRecords(Array.isArray(recordsData) ? recordsData : [])
      } catch (error) {
        console.error('Error al obtener datos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatDate = (dateStr: any) => {
    try {
      if (!dateStr) return 'N/A'
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return 'N/A'
      return date.toLocaleString('es-ES')
    } catch (e) {
      return 'N/A'
    }
  }

  const formatDuration = (duration: any) => {
    if (!duration && duration !== 0) return '0'
    const num = Number(duration)
    return isNaN(num) ? '0' : Math.round(num).toString()
  }

  const formatSincronía = (value: any) => {
    if (!value && value !== 0) return '0'
    const num = Number(value)
    return isNaN(num) ? '0' : num.toFixed(1)
  }

  const formatConfianza = (value: any) => {
    if (!value && value !== 0) return '0'
    const num = Number(value)
    return isNaN(num) ? '0' : num.toFixed(1)
  }

  const getStatusColor = (confianza: number) => {
    if (confianza >= 80) return 'text-green-600'
    if (confianza >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <main className="flex-1 p-8 bg-gray-50 overflow-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Análisis Histórico</h1>
        <p className="text-gray-600">Análisis de todas las llamadas completadas</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
          <p className="text-gray-600 text-sm mb-2">Llamadas Totales</p>
          <p className="text-4xl font-bold text-blue-900">{stats.total_llamadas}</p>
          <p className="text-gray-500 text-xs mt-2">Este período</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
          <p className="text-gray-600 text-sm mb-2">Confianza Promedio</p>
          <p className="text-4xl font-bold text-blue-900">{stats.confianza_promedio}%</p>
          <p className="text-green-600 text-xs mt-2">Tendencia positiva</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
          <p className="text-gray-600 text-sm mb-2">Promesas Cumplidas</p>
          <p className="text-4xl font-bold text-green-600">{stats.promesas_cumplidas}</p>
          <p className="text-gray-600 text-xs mt-2">Llamadas confiables</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Registro de Llamadas</h2>
        {loading ? (
          <p className="text-gray-600">Cargando datos de la base de datos...</p>
        ) : records.length > 0 ? (
          <div className="space-y-2">
            {records.map((call: any) => (
              <div key={call.file_id || Math.random()} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                <div className="flex-1">
                  <p className="text-gray-900 font-bold">{call.agente || 'N/A'} ↔ {call.cliente || 'N/A'}</p>
                  <p className="text-gray-600 text-sm">ID: {call.file_id || 'N/A'} | Duración: {formatDuration(call.audio_duration)}s | Sincronía: {formatSincronía(call.sincronía_emocional)}%</p>
                  <p className="text-gray-500 text-xs">{formatDate(call.analysis_date)}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${getStatusColor(Number(formatConfianza(call.confianza)))}`}>
                    {formatConfianza(call.confianza)}%
                  </p>
                  <p className="text-gray-600 text-sm">{call.estado || 'Pendiente'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No hay registros disponibles</p>
        )}
      </div>
    </main>
  )
}
