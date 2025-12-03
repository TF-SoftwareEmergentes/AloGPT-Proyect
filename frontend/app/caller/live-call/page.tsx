'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LiveCallRecorder } from '@/feeling-analytics/components/live-call-recorder'
import { HistoryPage } from '@/feeling-analytics/pages/history-page'
import { SentimentAnalysisResult } from '@/types/sentiment'
import { Phone, PhoneOff, History } from 'lucide-react'
import { API_BASE_URL } from '@/lib/config'

export default function LiveCallPage() {
  const [authorized, setAuthorized] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('Agente')
  const [activeTab, setActiveTab] = useState('live')
  const [history, setHistory] = useState<any[]>([])
  const [currentRecord, setCurrentRecord] = useState<SentimentAnalysisResult | null>(null)

  useEffect(() => {
    const userType = localStorage.getItem('userType')
    const email = localStorage.getItem('userEmail')
    const name = localStorage.getItem('userName')

    if (!userType) {
      window.location.href = '/login'
    } else if (userType !== 'agent') {
      window.location.href = '/dashboard'
    } else {
      setAuthorized(true)
      setUserEmail(email || 'agente@example.com')
      setUserName(name || 'Agente')
      loadHistory()
    }
  }, [])

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/records?limit=50`)
      if (response.ok) {
        const data = await response.json()
        setHistory(data || [])
      }
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const handleCallEnd = async (result: any) => {
    // Reload history when call ends
    await loadHistory()
    // Show confirmation
    setTimeout(() => {
      setActiveTab('history')
    }, 2000)
  }

  const handleSelectRecord = (record: SentimentAnalysisResult) => {
    setCurrentRecord(record)
  }

  if (!authorized) return null

  return (
    <div className="flex bg-white min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📞 Llamada en Vivo - Análisis Realtime
          </h1>
          <p className="text-gray-600">
            Inicia una llamada para análisis de sentimientos en tiempo real con feedback inmediato
          </p>
        </div>

        {/* User Info */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Sesión activa:</span> {userName} ({userEmail})
          </p>
        </div>

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              En Vivo
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Historial
            </TabsTrigger>
          </TabsList>

          {/* Live Call Tab */}
          <TabsContent value="live" className="space-y-6">
            <LiveCallRecorder
              agentEmail={userEmail}
              onCallEnd={handleCallEnd}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <HistoryPage
              history={history}
              onSelectRecord={handleSelectRecord}
              onChangeTab={setActiveTab}
            />
            
            {currentRecord && (
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle>Detalles del Registro Seleccionado</CardTitle>
                  <CardDescription>
                    ID: {currentRecord.id_call}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Puntuación Final</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {currentRecord.final_score?.toFixed(2) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Duración de Procesamiento</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {currentRecord.processing_time?.toFixed(1) || 'N/A'}s
                      </p>
                    </div>
                  </div>
                  
                  {currentRecord.caller && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="font-semibold text-green-900 mb-2">Agente (Caller)</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-gray-600">Puntuación</p>
                          <p className="font-bold text-green-600">{currentRecord.caller.final_score?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Valence</p>
                          <p className="font-bold">{currentRecord.caller.valence_score?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Arousal</p>
                          <p className="font-bold">{currentRecord.caller.arousal_score?.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentRecord.client && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="font-semibold text-blue-900 mb-2">Cliente (Client)</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-gray-600">Puntuación</p>
                          <p className="font-bold text-blue-600">{currentRecord.client.final_score?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Valence</p>
                          <p className="font-bold">{currentRecord.client.valence_score?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Arousal</p>
                          <p className="font-bold">{currentRecord.client.arousal_score?.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentRecord.top_emotions && currentRecord.top_emotions.length > 0 && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="font-semibold text-purple-900 mb-2">Top Emociones</p>
                      <div className="space-y-1">
                        {currentRecord.top_emotions.map((emotion: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">{emotion.emotion}</span>
                            <span className="font-semibold text-purple-600">
                              {(emotion.score * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
