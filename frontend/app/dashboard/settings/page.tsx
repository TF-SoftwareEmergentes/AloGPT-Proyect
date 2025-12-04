'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Notificaciones
    alertaCritica: true,
    alertaConfianzaBaja: true,
    notificacionesEmail: false,
    sonidoAlertas: true,
    
    // Umbrales
    umbralConfianzaBaja: 50,
    umbralConfianzaCritica: 30,
    umbralSincroniaMinima: 40,
    duracionMinimaLlamada: 30,
    
    // Preferencias de visualización
    idioma: 'es',
    tema: 'claro',
    registrosPorPagina: 10,
    actualizacionAutomatica: true,
    intervaloActualizacion: 30,
    
    // API y conexión
    apiUrl: 'http://localhost:8000',
    timeoutConexion: 30,
  })

  const [saved, setSaved] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const name = localStorage.getItem('userName') || 'Usuario'
    setUserName(name)
    
    // Cargar configuración guardada
    const savedSettings = localStorage.getItem('appSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleReset = () => {
    const defaultSettings = {
      alertaCritica: true,
      alertaConfianzaBaja: true,
      notificacionesEmail: false,
      sonidoAlertas: true,
      umbralConfianzaBaja: 50,
      umbralConfianzaCritica: 30,
      umbralSincroniaMinima: 40,
      duracionMinimaLlamada: 30,
      idioma: 'es',
      tema: 'claro',
      registrosPorPagina: 10,
      actualizacionAutomatica: true,
      intervaloActualizacion: 30,
      apiUrl: 'http://localhost:8000',
      timeoutConexion: 30,
    }
    setSettings(defaultSettings)
  }

  return (
    <main className="flex-1 p-8 bg-gray-50 overflow-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración</h1>
        <p className="text-gray-600">Personaliza el sistema según tus preferencias</p>
      </div>

      <Tabs defaultValue="notificaciones" className="space-y-6">
        <TabsList className="bg-white border border-gray-200">
          <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
          <TabsTrigger value="umbrales">Umbrales y Alertas</TabsTrigger>
          <TabsTrigger value="visualizacion">Visualización</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
        </TabsList>

        {/* Notificaciones */}
        <TabsContent value="notificaciones">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Notificaciones</CardTitle>
              <CardDescription>Configura cómo y cuándo recibir alertas del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Alertas Críticas</Label>
                  <p className="text-sm text-gray-500">Recibir notificaciones cuando hay alertas críticas</p>
                </div>
                <Switch 
                  checked={settings.alertaCritica}
                  onCheckedChange={(checked) => setSettings({...settings, alertaCritica: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Alertas de Confianza Baja</Label>
                  <p className="text-sm text-gray-500">Notificar cuando la confianza cae por debajo del umbral</p>
                </div>
                <Switch 
                  checked={settings.alertaConfianzaBaja}
                  onCheckedChange={(checked) => setSettings({...settings, alertaConfianzaBaja: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Notificaciones por Email</Label>
                  <p className="text-sm text-gray-500">Enviar resúmenes y alertas al correo electrónico</p>
                </div>
                <Switch 
                  checked={settings.notificacionesEmail}
                  onCheckedChange={(checked) => setSettings({...settings, notificacionesEmail: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Sonido de Alertas</Label>
                  <p className="text-sm text-gray-500">Reproducir sonido cuando llega una alerta</p>
                </div>
                <Switch 
                  checked={settings.sonidoAlertas}
                  onCheckedChange={(checked) => setSettings({...settings, sonidoAlertas: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Umbrales */}
        <TabsContent value="umbrales">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Umbrales</CardTitle>
              <CardDescription>Define los límites para generar alertas automáticas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Umbral de Confianza Baja (%)</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={settings.umbralConfianzaBaja}
                    onChange={(e) => setSettings({...settings, umbralConfianzaBaja: Number(e.target.value)})}
                  />
                  <p className="text-xs text-gray-500">Llamadas con confianza menor a este valor se marcan como alerta</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Umbral de Confianza Crítica (%)</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={settings.umbralConfianzaCritica}
                    onChange={(e) => setSettings({...settings, umbralConfianzaCritica: Number(e.target.value)})}
                  />
                  <p className="text-xs text-gray-500">Llamadas con confianza menor a este valor son críticas</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Umbral de Sincronía Mínima (%)</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={settings.umbralSincroniaMinima}
                    onChange={(e) => setSettings({...settings, umbralSincroniaMinima: Number(e.target.value)})}
                  />
                  <p className="text-xs text-gray-500">Sincronía emocional mínima esperada</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Duración Mínima de Llamada (segundos)</Label>
                  <Input 
                    type="number" 
                    min="0"
                    value={settings.duracionMinimaLlamada}
                    onChange={(e) => setSettings({...settings, duracionMinimaLlamada: Number(e.target.value)})}
                  />
                  <p className="text-xs text-gray-500">Llamadas más cortas se marcan para revisión</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visualización */}
        <TabsContent value="visualizacion">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Visualización</CardTitle>
              <CardDescription>Personaliza la apariencia y comportamiento de la interfaz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select 
                    value={settings.idioma} 
                    onValueChange={(value) => setSettings({...settings, idioma: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select 
                    value={settings.tema} 
                    onValueChange={(value) => setSettings({...settings, tema: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claro">Claro</SelectItem>
                      <SelectItem value="oscuro">Oscuro</SelectItem>
                      <SelectItem value="sistema">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Registros por Página</Label>
                  <Select 
                    value={settings.registrosPorPagina.toString()} 
                    onValueChange={(value) => setSettings({...settings, registrosPorPagina: Number(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Intervalo de Actualización (segundos)</Label>
                  <Input 
                    type="number" 
                    min="5"
                    value={settings.intervaloActualizacion}
                    onChange={(e) => setSettings({...settings, intervaloActualizacion: Number(e.target.value)})}
                    disabled={!settings.actualizacionAutomatica}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label className="text-base font-medium">Actualización Automática</Label>
                  <p className="text-sm text-gray-500">Actualizar datos automáticamente</p>
                </div>
                <Switch 
                  checked={settings.actualizacionAutomatica}
                  onCheckedChange={(checked) => setSettings({...settings, actualizacionAutomatica: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sistema */}
        <TabsContent value="sistema">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Sistema</CardTitle>
              <CardDescription>Ajustes técnicos y de conexión</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>URL del API</Label>
                  <Input 
                    type="text"
                    value={settings.apiUrl}
                    onChange={(e) => setSettings({...settings, apiUrl: e.target.value})}
                  />
                  <p className="text-xs text-gray-500">Dirección del servidor backend</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Timeout de Conexión (segundos)</Label>
                  <Input 
                    type="number" 
                    min="5"
                    value={settings.timeoutConexion}
                    onChange={(e) => setSettings({...settings, timeoutConexion: Number(e.target.value)})}
                  />
                  <p className="text-xs text-gray-500">Tiempo máximo de espera para conexiones</p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Información del Usuario</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm"><span className="font-medium">Usuario:</span> {userName}</p>
                  <p className="text-sm"><span className="font-medium">Rol:</span> Supervisor</p>
                  <p className="text-sm"><span className="font-medium">Última sesión:</span> {new Date().toLocaleDateString('es-ES')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botones de acción */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t">
        <Button variant="outline" onClick={handleReset}>
          Restaurar Valores Predeterminados
        </Button>
        <div className="flex items-center gap-4">
          {saved && (
            <span className="text-green-600 text-sm font-medium">✓ Configuración guardada</span>
          )}
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Guardar Cambios
          </Button>
        </div>
      </div>
    </main>
  )
}
