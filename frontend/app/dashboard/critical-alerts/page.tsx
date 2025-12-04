'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Alert {
  id: string
  tipo: 'critica' | 'advertencia' | 'info'
  titulo: string
  descripcion: string
  agente: string
  cliente: string
  timestamp: string
  estado: 'activa' | 'revisada' | 'resuelta'
  confianza: number
  file_id?: string
}

export default function CriticalAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todas' | 'activa' | 'revisada' | 'resuelta'>('todas')

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        // Intentar obtener datos del API
        const res = await fetch('http://localhost:8000/api/records?limit=20')
        if (res.ok) {
          const data = await res.json()
          // Convertir registros con baja confianza en alertas
          const alertsFromRecords: Alert[] = data
            .filter((record: any) => record.confianza < 60)
            .map((record: any, index: number) => ({
              id: `alert-${record.file_id || index}`,
              tipo: record.confianza < 30 ? 'critica' : record.confianza < 50 ? 'advertencia' : 'info',
              titulo: record.confianza < 30 
                ? 'Confianza Crítica Detectada' 
                : record.confianza < 50 
                  ? 'Confianza Baja' 
                  : 'Revisión Recomendada',
              descripcion: `Llamada con nivel de confianza ${record.confianza}%. ${
                record.promesa_detectada ? 'Se detectó una promesa de pago.' : ''
              } Sincronía emocional: ${record.sincronía_emocional || 0}%`,
              agente: record.agente || 'Sin asignar',
              cliente: record.cliente || 'Desconocido',
              timestamp: record.timestamp || new Date().toISOString(),
              estado: 'activa',
              confianza: record.confianza,
              file_id: record.file_id,
            }))
          setAlerts(alertsFromRecords)
        }
      } catch (error) {
        console.error('Error al obtener alertas:', error)
        // Datos de ejemplo
        setAlerts([
          {
            id: 'alert-1',
            tipo: 'critica',
            titulo: 'Confianza Crítica Detectada',
            descripcion: 'Llamada con nivel de confianza extremadamente bajo (15%). El cliente mostró signos de frustración y el agente no siguió el protocolo.',
            agente: 'Carlos López',
            cliente: 'Juan Pérez',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            estado: 'activa',
            confianza: 15,
          },
          {
            id: 'alert-2',
            tipo: 'critica',
            titulo: 'Promesa Incumplida',
            descripcion: 'El cliente indicó que no cumplirá con el pago prometido. Se detectó tono hostil durante la conversación.',
            agente: 'Pedro Sánchez',
            cliente: 'María González',
            timestamp: new Date(Date.now() - 600000).toISOString(),
            estado: 'activa',
            confianza: 22,
          },
          {
            id: 'alert-3',
            tipo: 'advertencia',
            titulo: 'Sincronía Emocional Baja',
            descripcion: 'La sincronía emocional entre agente y cliente fue muy baja (35%). Se recomienda revisión de la llamada.',
            agente: 'Ana Martínez',
            cliente: 'Roberto Silva',
            timestamp: new Date(Date.now() - 1200000).toISOString(),
            estado: 'revisada',
            confianza: 45,
          },
          {
            id: 'alert-4',
            tipo: 'advertencia',
            titulo: 'Duración Anormal',
            descripcion: 'La llamada tuvo una duración inusualmente corta (12 segundos) con baja confianza.',
            agente: 'Laura Torres',
            cliente: 'Diego Ramírez',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            estado: 'resuelta',
            confianza: 38,
          },
          {
            id: 'alert-5',
            tipo: 'info',
            titulo: 'Revisión Recomendada',
            descripcion: 'Llamada con métricas por debajo del promedio. Se sugiere coaching para el agente.',
            agente: 'María García',
            cliente: 'Fernando López',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            estado: 'resuelta',
            confianza: 55,
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [])

  const handleStatusChange = (alertId: string, newStatus: 'activa' | 'revisada' | 'resuelta') => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, estado: newStatus } : alert
    ))
  }

  const filteredAlerts = filter === 'todas' 
    ? alerts 
    : alerts.filter(alert => alert.estado === filter)

  const alertCounts = {
    todas: alerts.length,
    activa: alerts.filter(a => a.estado === 'activa').length,
    revisada: alerts.filter(a => a.estado === 'revisada').length,
    resuelta: alerts.filter(a => a.estado === 'resuelta').length,
  }

  const criticalCount = alerts.filter(a => a.tipo === 'critica' && a.estado === 'activa').length
  const warningCount = alerts.filter(a => a.tipo === 'advertencia' && a.estado === 'activa').length

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Hace un momento'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} horas`
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'critica':
        return <Badge className="bg-red-500 text-white">Crítica</Badge>
      case 'advertencia':
        return <Badge className="bg-yellow-500 text-white">Advertencia</Badge>
      default:
        return <Badge className="bg-blue-500 text-white">Info</Badge>
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'activa':
        return <Badge variant="outline" className="border-red-500 text-red-500">Activa</Badge>
      case 'revisada':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Revisada</Badge>
      default:
        return <Badge variant="outline" className="border-green-500 text-green-500">Resuelta</Badge>
    }
  }

  return (
    <main className="flex-1 p-8 bg-gray-50 overflow-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Alertas Críticas</h1>
        <p className="text-gray-600">Monitoreo y gestión de situaciones que requieren atención inmediata</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Cargando alertas...</p>
        </div>
      ) : (
        <>
          {/* Resumen de alertas */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <Card className={criticalCount > 0 ? 'border-red-500 border-2' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Alertas Críticas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold ${criticalCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {criticalCount}
                </p>
                <p className="text-xs text-gray-500 mt-2">Requieren acción inmediata</p>
              </CardContent>
            </Card>

            <Card className={warningCount > 0 ? 'border-yellow-500 border-2' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Advertencias</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold ${warningCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                  {warningCount}
                </p>
                <p className="text-xs text-gray-500 mt-2">Pendientes de revisión</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">En Revisión</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-blue-600">{alertCounts.revisada}</p>
                <p className="text-xs text-gray-500 mt-2">Siendo procesadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Resueltas Hoy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-green-600">{alertCounts.resuelta}</p>
                <p className="text-xs text-gray-500 mt-2">Gestionadas correctamente</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros y lista de alertas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lista de Alertas</CardTitle>
                  <CardDescription>Gestiona y da seguimiento a las alertas del sistema</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={filter === 'todas' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('todas')}
                  >
                    Todas ({alertCounts.todas})
                  </Button>
                  <Button 
                    variant={filter === 'activa' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('activa')}
                    className={filter === 'activa' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    Activas ({alertCounts.activa})
                  </Button>
                  <Button 
                    variant={filter === 'revisada' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('revisada')}
                  >
                    Revisadas ({alertCounts.revisada})
                  </Button>
                  <Button 
                    variant={filter === 'resuelta' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilter('resuelta')}
                  >
                    Resueltas ({alertCounts.resuelta})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No hay alertas en esta categoría</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAlerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-4 rounded-lg border ${
                        alert.tipo === 'critica' && alert.estado === 'activa' 
                          ? 'bg-red-50 border-red-200' 
                          : alert.tipo === 'advertencia' && alert.estado === 'activa'
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTipoBadge(alert.tipo)}
                            {getEstadoBadge(alert.estado)}
                            <span className="text-sm text-gray-500">{formatTimestamp(alert.timestamp)}</span>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1">{alert.titulo}</h3>
                          <p className="text-sm text-gray-600 mb-3">{alert.descripcion}</p>
                          <div className="flex items-center gap-6 text-sm">
                            <span className="text-gray-500">
                              <span className="font-medium">Agente:</span> {alert.agente}
                            </span>
                            <span className="text-gray-500">
                              <span className="font-medium">Cliente:</span> {alert.cliente}
                            </span>
                            <span className={`font-medium ${
                              alert.confianza < 30 ? 'text-red-600' : 
                              alert.confianza < 50 ? 'text-yellow-600' : 'text-blue-600'
                            }`}>
                              Confianza: {alert.confianza}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          {alert.estado === 'activa' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleStatusChange(alert.id, 'revisada')}
                              >
                                Marcar Revisada
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleStatusChange(alert.id, 'resuelta')}
                              >
                                Resolver
                              </Button>
                            </>
                          )}
                          {alert.estado === 'revisada' && (
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleStatusChange(alert.id, 'resuelta')}
                            >
                              Resolver
                            </Button>
                          )}
                          {alert.estado === 'resuelta' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleStatusChange(alert.id, 'activa')}
                            >
                              Reabrir
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  )
}
