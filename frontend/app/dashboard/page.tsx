'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total_llamadas: 0,
    confianza_promedio: 0,
    promesas_cumplidas: 0,
    alertas_críticas: 0,
    tasa_éxito: 0,
    sincronía_emocional_promedio: 0,
  })
  
  const [records, setRecords] = useState<any[]>([])
  const [agentMetrics, setAgentMetrics] = useState<any[]>([])
  const [emotionMetrics, setEmotionMetrics] = useState<Record<string, any>>({})
  const [dailyMetrics, setDailyMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const name = localStorage.getItem('userName') || 'Supervisor'
    setUserName(name)

    const fetchAllData = async () => {
      try {
        // Fetch statistics
        const statsRes = await fetch('http://localhost:8000/api/statistics')
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }
        
        // Fetch records
        const recordsRes = await fetch('http://localhost:8000/api/records?limit=10')
        if (recordsRes.ok) {
          const recordsData = await recordsRes.json()
          setRecords(Array.isArray(recordsData) ? recordsData : [])
        }
        
        // Fetch agent metrics
        const agentsRes = await fetch('http://localhost:8000/api/metrics/agents')
        if (agentsRes.ok) {
          const agentsData = await agentsRes.json()
          setAgentMetrics(Array.isArray(agentsData) ? agentsData : [])
        }
        
        // Fetch emotion metrics
        const emotionsRes = await fetch('http://localhost:8000/api/metrics/emotions')
        if (emotionsRes.ok) {
          const emotionsData = await emotionsRes.json()
          setEmotionMetrics(typeof emotionsData === 'object' ? emotionsData : {})
        }
        
        // Fetch daily metrics
        const dailyRes = await fetch('http://localhost:8000/api/metrics/daily?days=30')
        if (dailyRes.ok) {
          const dailyData = await dailyRes.json()
          setDailyMetrics(Array.isArray(dailyData) ? dailyData : [])
        }
      } catch (error) {
        console.error('Error al obtener datos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [])

  const getStatusColor = (confianza: number) => {
    if (confianza >= 80) return 'text-green-600'
    if (confianza >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusBg = (confianza: number) => {
    if (confianza >= 80) return 'bg-green-100'
    if (confianza >= 50) return 'bg-yellow-100'
    return 'bg-red-100'
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
    return isNaN(num) ? '0' : (num * 100).toFixed(1)
  }

  const topEmotions = Object.entries(emotionMetrics || {})
    .slice(0, 5)
    .map(([emotion, data]: any) => ({
      name: emotion.replace(/_/g, ' ').substring(0, 15),
      value: data.promedio || 0
    }))

  const COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444']

  return (
    <main className="flex-1 p-8 bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenida, {userName}</h1>
        <p className="text-gray-600">Dashboard de Supervisión en Tiempo Real</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Llamadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-900">{stats.total_llamadas}</p>
            <p className="text-xs text-gray-500 mt-2">Registradas en base de datos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Confianza Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-900">{stats.confianza_promedio}%</p>
            <p className="text-xs text-gray-500 mt-2">Promedio general</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Promesas Cumplidas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600">{stats.promesas_cumplidas}</p>
            <p className="text-xs text-gray-500 mt-2">Tasa: {stats.tasa_éxito}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Alertas Críticas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-red-600">{stats.alertas_críticas}</p>
            <p className="text-xs text-gray-500 mt-2">Requieren atención</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface for detailed metrics */}
      <Tabs defaultValue="calls" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calls">Llamadas Recientes</TabsTrigger>
          <TabsTrigger value="agents">Agentes</TabsTrigger>
          <TabsTrigger value="emotions">Emociones</TabsTrigger>
          <TabsTrigger value="daily">Tendencia Diaria</TabsTrigger>
        </TabsList>

        {/* Llamadas Recientes */}
        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle>Monitor de Llamadas Recientes</CardTitle>
              <CardDescription>Últimas 10 llamadas analizadas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-600">Cargando datos...</p>
              ) : records.length > 0 ? (
                <div className="space-y-3">
                  {records.map((call: any) => (
                    <div key={call.file_id || Math.random()} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                      <div className="flex-1">
                        <p className="text-gray-900 font-bold">{call.agente || 'N/A'} ↔ {call.cliente || 'N/A'}</p>
                        <p className="text-gray-600 text-sm">
                          Duración: {formatDuration(call.audio_duration)}s | ID: {call.file_id || 'N/A'} | Sincronía: {formatSincronía(call.sincronía_emocional)}%
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-gray-900 font-bold">{formatConfianza(call.confianza)}%</p>
                          <p className={`text-xs font-bold ${getStatusColor(Number(formatConfianza(call.confianza)))}`}>
                            {call.estado || 'Pendiente'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No hay registros disponibles</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Métricas por Agente */}
        <TabsContent value="agents">
          <div className="space-y-6">
            {/* Agent Stats Cards */}
            <div className="grid grid-cols-2 gap-6">
              {Array.isArray(agentMetrics) && agentMetrics.length > 0 ? (
                agentMetrics.map((agent: any) => (
                  <Card key={agent.agente}>
                    <CardHeader>
                      <CardTitle className="text-lg">{agent.agente}</CardTitle>
                      <CardDescription>{agent.total_llamadas} llamadas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Confianza Promedio</p>
                          <p className="text-2xl font-bold text-blue-900">{agent.confianza_promedio}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Cumplimiento</p>
                          <p className="text-2xl font-bold text-green-600">{agent.tasa_cumplimiento}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Sincronía Emocional</p>
                          <p className="text-2xl font-bold">{agent.sincronía_emocional_promedio}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Promesas</p>
                          <p className="text-2xl font-bold text-purple-600">{agent.promesas_cumplidas}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-2 p-6 text-center text-gray-500">
                  <p>Cargando métricas de agentes...</p>
                </div>
              )}
            </div>

            {/* Agent Performance Chart */}
            {Array.isArray(agentMetrics) && agentMetrics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Comparativa de Desempeño</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={agentMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="agente" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="confianza_promedio" fill="#3b82f6" name="Confianza %" />
                      <Bar dataKey="tasa_cumplimiento" fill="#22c55e" name="Cumplimiento %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Análisis de Emociones */}
        <TabsContent value="emotions">
          <div className="grid grid-cols-2 gap-6">
            {/* Pie Chart */}
            {topEmotions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Emociones Detectadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={topEmotions}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value?.toFixed(2) || '0'}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {topEmotions.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Emotion Details Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detalle de Emociones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(emotionMetrics || {})
                    .slice(0, 10)
                    .map(([emotion, data]: any) => (
                      <div key={emotion} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{emotion.substring(0, 25)}</span>
                        <span className="text-sm font-bold text-blue-900">{(data?.promedio || 0).toFixed(3)}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tendencia Diaria */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Llamadas Últimos 30 Días</CardTitle>
              <CardDescription>Volumen y confianza promedio por día</CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(dailyMetrics) && dailyMetrics.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={dailyMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="llamadas" stroke="#3b82f6" name="Llamadas" />
                    <Line yAxisId="right" type="monotone" dataKey="confianza_promedio" stroke="#22c55e" name="Confianza %" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-600 text-center py-8">Cargando datos diarios...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}
