'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface AgentMetric {
  agente: string
  total_llamadas: number
  confianza_promedio: number
  sincronia_promedio: number
  promesas_cumplidas: number
  tasa_exito: number
}

export default function TeamAnalyticsPage() {
  const [agentMetrics, setAgentMetrics] = useState<AgentMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/metrics/agents')
        if (res.ok) {
          const data = await res.json()
          setAgentMetrics(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error('Error al obtener métricas de agentes:', error)
        // Datos de ejemplo si el API no está disponible
        setAgentMetrics([
          { agente: 'María García', total_llamadas: 145, confianza_promedio: 85, sincronia_promedio: 78, promesas_cumplidas: 89, tasa_exito: 92 },
          { agente: 'Carlos López', total_llamadas: 132, confianza_promedio: 78, sincronia_promedio: 72, promesas_cumplidas: 76, tasa_exito: 85 },
          { agente: 'Ana Martínez', total_llamadas: 128, confianza_promedio: 92, sincronia_promedio: 88, promesas_cumplidas: 95, tasa_exito: 96 },
          { agente: 'Pedro Sánchez', total_llamadas: 118, confianza_promedio: 71, sincronia_promedio: 65, promesas_cumplidas: 68, tasa_exito: 78 },
          { agente: 'Laura Torres', total_llamadas: 156, confianza_promedio: 88, sincronia_promedio: 82, promesas_cumplidas: 91, tasa_exito: 94 },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getPerformanceColor = (value: number) => {
    if (value >= 85) return 'text-green-600'
    if (value >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceBg = (value: number) => {
    if (value >= 85) return 'bg-green-500'
    if (value >= 70) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getPerformanceLabel = (value: number) => {
    if (value >= 85) return 'Excelente'
    if (value >= 70) return 'Bueno'
    if (value >= 50) return 'Regular'
    return 'Necesita mejora'
  }

  // Filtrar agentes válidos (que tienen nombre)
  const validAgents = agentMetrics.filter(agent => agent.agente && typeof agent.agente === 'string')

  // Datos para el gráfico de radar
  const radarData = validAgents.slice(0, 5).map(agent => ({
    agente: agent.agente?.split(' ')[0] || 'Agente',
    Confianza: agent.confianza_promedio || 0,
    Sincronía: agent.sincronia_promedio || 0,
    'Tasa Éxito': agent.tasa_exito || 0,
    Promesas: agent.promesas_cumplidas || 0,
  }))

  // Ranking de agentes
  const rankedAgents = [...validAgents].sort((a, b) => (b.tasa_exito || 0) - (a.tasa_exito || 0))

  // Totales del equipo
  const teamTotals = {
    totalLlamadas: validAgents.reduce((sum, a) => sum + (a.total_llamadas || 0), 0),
    confianzaPromedio: validAgents.length > 0 
      ? Math.round(validAgents.reduce((sum, a) => sum + (a.confianza_promedio || 0), 0) / validAgents.length) 
      : 0,
    sincroniaPromedio: validAgents.length > 0 
      ? Math.round(validAgents.reduce((sum, a) => sum + (a.sincronia_promedio || 0), 0) / validAgents.length) 
      : 0,
    tasaExitoPromedio: validAgents.length > 0 
      ? Math.round(validAgents.reduce((sum, a) => sum + (a.tasa_exito || 0), 0) / validAgents.length) 
      : 0,
  }

  return (
    <main className="flex-1 p-8 bg-gray-50 overflow-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analíticas del Equipo</h1>
        <p className="text-gray-600">Rendimiento y métricas de los agentes del call center</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Cargando datos del equipo...</p>
        </div>
      ) : (
        <>
          {/* Resumen del equipo */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Agentes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-blue-900">{validAgents.length}</p>
                <p className="text-xs text-gray-500 mt-2">Agentes activos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Llamadas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-blue-900">{teamTotals.totalLlamadas}</p>
                <p className="text-xs text-gray-500 mt-2">Llamadas del equipo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Confianza Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold ${getPerformanceColor(teamTotals.confianzaPromedio)}`}>
                  {teamTotals.confianzaPromedio}%
                </p>
                <p className="text-xs text-gray-500 mt-2">{getPerformanceLabel(teamTotals.confianzaPromedio)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Tasa de Éxito</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold ${getPerformanceColor(teamTotals.tasaExitoPromedio)}`}>
                  {teamTotals.tasaExitoPromedio}%
                </p>
                <p className="text-xs text-gray-500 mt-2">{getPerformanceLabel(teamTotals.tasaExitoPromedio)}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="ranking" className="space-y-6">
            <TabsList className="bg-white border border-gray-200">
              <TabsTrigger value="ranking">Ranking de Agentes</TabsTrigger>
              <TabsTrigger value="comparativa">Comparativa</TabsTrigger>
              <TabsTrigger value="detalle">Detalle Individual</TabsTrigger>
            </TabsList>

            {/* Ranking */}
            <TabsContent value="ranking">
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ranking por Tasa de Éxito</CardTitle>
                    <CardDescription>Agentes ordenados por rendimiento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {rankedAgents.map((agent, index) => (
                        <div key={agent.agente} className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-amber-700' : 'bg-gray-300'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{agent.agente}</p>
                            <p className="text-sm text-gray-500">{agent.total_llamadas} llamadas</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xl font-bold ${getPerformanceColor(agent.tasa_exito)}`}>
                              {agent.tasa_exito}%
                            </p>
                            <p className="text-xs text-gray-500">Tasa de éxito</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Rendimiento por Llamadas</CardTitle>
                    <CardDescription>Volumen de llamadas por agente</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={validAgents} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="agente" type="category" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="total_llamadas" fill="#3b82f6" name="Llamadas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Comparativa */}
            <TabsContent value="comparativa">
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Comparativa de Métricas</CardTitle>
                    <CardDescription>Confianza y sincronía por agente</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={validAgents}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="agente" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="confianza_promedio" fill="#22c55e" name="Confianza %" />
                        <Bar dataKey="sincronia_promedio" fill="#3b82f6" name="Sincronía %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Radar de Habilidades</CardTitle>
                    <CardDescription>Perfil multidimensional de agentes</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="agente" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name="Confianza" dataKey="Confianza" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                        <Radar name="Sincronía" dataKey="Sincronía" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        <Radar name="Tasa Éxito" dataKey="Tasa Éxito" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Detalle Individual */}
            <TabsContent value="detalle">
              <Card>
                <CardHeader>
                  <CardTitle>Detalle por Agente</CardTitle>
                  <CardDescription>Métricas detalladas de cada miembro del equipo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6">
                    {validAgents.map((agent) => (
                      <div 
                        key={agent.agente} 
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{agent.agente}</h3>
                            <p className="text-sm text-gray-500">{agent.total_llamadas} llamadas totales</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            agent.tasa_exito >= 85 ? 'bg-green-100 text-green-700' :
                            agent.tasa_exito >= 70 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {getPerformanceLabel(agent.tasa_exito)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Confianza</p>
                            <div className="flex items-center gap-2">
                              <Progress value={agent.confianza_promedio} className="h-2" />
                              <span className={`text-sm font-medium ${getPerformanceColor(agent.confianza_promedio)}`}>
                                {agent.confianza_promedio}%
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Sincronía Emocional</p>
                            <div className="flex items-center gap-2">
                              <Progress value={agent.sincronia_promedio} className="h-2" />
                              <span className={`text-sm font-medium ${getPerformanceColor(agent.sincronia_promedio)}`}>
                                {agent.sincronia_promedio}%
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Promesas Cumplidas</p>
                            <div className="flex items-center gap-2">
                              <Progress value={agent.promesas_cumplidas} className="h-2" />
                              <span className={`text-sm font-medium ${getPerformanceColor(agent.promesas_cumplidas)}`}>
                                {agent.promesas_cumplidas}%
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Tasa de Éxito</p>
                            <div className="flex items-center gap-2">
                              <Progress value={agent.tasa_exito} className="h-2" />
                              <span className={`text-sm font-medium ${getPerformanceColor(agent.tasa_exito)}`}>
                                {agent.tasa_exito}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </main>
  )
}
