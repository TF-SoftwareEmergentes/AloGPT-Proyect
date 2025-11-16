'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileAudio, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { AudioUploader } from '@/feeling-analytics/pages/audio-uploader-page'
import { ResultsPage } from '@/feeling-analytics/pages/results-page'
import { HistoryPage } from '@/feeling-analytics/pages/history-page'
import { SentimentAnalysisResult } from '@/types/sentiment'

export default function AudioAnalyzerPage() {
  const [authorized, setAuthorized] = useState(false)
  const [userName, setUserName] = useState('Agente')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [currentResult, setCurrentResult] = useState<SentimentAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('upload')

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
      loadHistory()
    }
  }, [])

  const loadHistory = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/records?limit=50')
      if (response.ok) {
        const data = await response.json()
        setHistory(data || [])
      }
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file)
    setError(null)
    setAnalysisProgress(0)
    await analyzeAudio(file)
  }

  const analyzeAudio = async (file: File) => {
    try {
      setIsAnalyzing(true)
      setAnalysisProgress(10)

      // Get agent credentials from localStorage
      const agentEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null
      const agentName = typeof window !== 'undefined' ? localStorage.getItem('userName') : null
      
      console.error('════════════════════════════════════════════════════════════════')
      console.error('🔥 ANALYZE AUDIO CALLED in audio-analyzer/page.tsx')
      console.error('agentEmail:', agentEmail)
      console.error('agentName:', agentName)
      console.error('════════════════════════════════════════════════════════════════')

      const formData = new FormData()
      formData.append('audio', file)
      formData.append('analyze_channels', 'both')
      
      // Only add if values exist
      if (agentEmail && agentEmail.trim()) {
        console.error('✅ Adding agentEmail to FormData:', agentEmail.trim())
        formData.append('agent_email', agentEmail.trim())
      } else {
        console.error('⚠️  NOT adding agentEmail - empty or falsy')
      }
      
      if (agentName && agentName.trim()) {
        console.error('✅ Adding agentName to FormData:', agentName.trim())
        formData.append('agent_name', agentName.trim())
      } else {
        console.error('⚠️  NOT adding agentName - empty or falsy')
      }

      setAnalysisProgress(30)

      const response = await fetch('http://localhost:8000/api/feeling-analytics/analyze', {
        method: 'POST',
        body: formData,
      })

      setAnalysisProgress(70)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      setAnalysisProgress(100)
      
      console.error('📡 Backend response received:')
      console.error('  - has caller:', !!result.caller)
      console.error('  - has client:', !!result.client)
      console.error('  - id_call:', result.id_call)
      console.error('  - filename:', result.filename)
      console.error('  - full result keys:', Object.keys(result))

      // Log the raw caller and client data from backend
      console.error('🔍 Raw caller from backend:', result.caller)
      console.error('🔍 Raw client from backend:', result.client)
      if (result.caller) {
        console.error('  caller keys:', Object.keys(result.caller))
        console.error('  caller.final_score:', result.caller.final_score)
        console.error('  caller.top_emotions:', result.caller.top_emotions)
      }
      if (result.client) {
        console.error('  client keys:', Object.keys(result.client))
        console.error('  client.final_score:', result.client.final_score)
        console.error('  client.top_emotions:', result.client.top_emotions)
      }

      // Format result
      const formattedResult: SentimentAnalysisResult = {
        id_call: result.id_call || 'N/A',
        dni: result.dni || 'N/A',
        call_date: result.call_date || new Date().toISOString(),
        filename: result.filename || result.id_call || file.name || 'N/A',
        is_stereo: result.is_stereo || false,
        channels_analyzed: result.channels_analyzed || [],
        final_score: result.final_score || 0,
        valence_score: result.valence_score || 0,
        arousal_score: result.arousal_score || 0,
        processing_time: result.processing_time || 0,
        analysis_date: result.analysis_date || new Date().toISOString(),
        top_emotions: result.top_emotions || [],
        all_scores: result.all_scores || {},
        keywords: result.keywords || [],
        caller: result.caller,
        client: result.client,
        comparison: result.comparison,
      }

      console.error('✅ Formatted result caller:', formattedResult.caller)
      console.error('✅ Formatted result client:', formattedResult.client)

      setCurrentResult(formattedResult)
      setActiveTab('results')
      
      // Reload history
      await loadHistory()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido durante el análisis'
      setError(errorMessage)
      console.error('Analysis error:', err)
      setActiveTab('results')
    } finally {
      setIsAnalyzing(false)
      setAnalysisProgress(0)
    }
  }

  const handleSelectRecord = (result: SentimentAnalysisResult) => {
    setCurrentResult(result)
  }

  if (!authorized) return null

  return (
    <div className="flex bg-white min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎙️ Analizador de Audio Multichannel
          </h1>
          <p className="text-gray-600">
            Sube archivos de audio estéreo para análisis de sentimientos en tiempo real
          </p>
        </div>

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">📤 Subir Archivo</TabsTrigger>
            <TabsTrigger value="results">📊 Resultados</TabsTrigger>
            <TabsTrigger value="history">📋 Historial</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <AudioUploader 
              onFileSelect={handleFileSelect}
              isAnalyzing={isAnalyzing}
            />

            {/* Analysis Progress */}
            {isAnalyzing && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analizando Audio...
                  </CardTitle>
                  <CardDescription>
                    Separando canales estéreo y analizando sentimientos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="w-full bg-blue-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${analysisProgress}%` }}
                      />
                    </div>
                    <p className="text-center text-sm font-semibold text-blue-900">
                      {analysisProgress}% completado
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            {error ? (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-900">
                    <AlertCircle className="w-5 h-5" />
                    Error en el Análisis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-700 mb-4">{error}</p>
                  <div className="bg-red-100 border border-red-300 rounded p-4 mb-4 text-sm text-red-800">
                    <p className="font-semibold mb-2">💡 Recomendaciones:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Intenta con archivos en formato WAV o MP3</li>
                      <li>Asegúrate que el archivo no esté corrupto</li>
                      <li>Prueba con un archivo de audio más pequeño</li>
                      <li>Si el problema persiste, contacta al administrador</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={() => {
                      setError(null)
                      setCurrentResult(null)
                      setActiveTab('upload')
                    }} 
                    variant="outline"
                  >
                    Intentar de nuevo
                  </Button>
                </CardContent>
              </Card>
            ) : currentResult ? (
              <ResultsPage
                currentResult={currentResult}
                isAnalyzing={isAnalyzing}
                analysisProgress={analysisProgress}
                error={error}
                onChangeTab={setActiveTab}
              />
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <FileAudio className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    No hay resultados para mostrar. Sube un archivo de audio para comenzar el análisis.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <HistoryPage
              history={history}
              onSelectRecord={handleSelectRecord}
              onChangeTab={setActiveTab}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
