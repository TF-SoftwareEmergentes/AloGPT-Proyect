"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Progress } from "../../components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { ArrowLeft, BarChart3, History, Upload, FileAudio, AlertCircle, Users } from "lucide-react"
import Link from "next/link"
import { AudioUploader } from "../../feeling-analytics/pages/audio-uploader-page"
import { FeelingAnalyticsAPI } from "../../feeling-analytics/services/api"
import type { SentimentAnalysisResult, SentimentRecord, SentimentStatistics } from "../../feeling-analytics/types/sentiment"
import { Pie, Bar } from "react-chartjs-2"
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js"
import SentimentVisualization from "../../feeling-analytics/components/sentiment-visualization"
import {Summary} from "../../feeling-analytics/pages/summary-page"
import { HistoryPage } from "../../feeling-analytics/pages/history-page"
import { ResultsPage } from "../../feeling-analytics/pages/results-page"

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const getScoreColor = (score: number) => {
  if (score >= 0.66) return "text-green-600"
  if (score >= 0.33) return "text-yellow-600"
  return "text-red-600"
}

const getBarColor = (score: number) => {
  if (score >= 0.66) return "bg-green-500"
  if (score >= 0.33) return "bg-yellow-500"
  return "bg-red-500"
}

export default function FeelingAnalyticsPage() {
  const [currentResult, setCurrentResult] = useState<SentimentAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<SentimentRecord[]>([])
  const [statistics, setStatistics] = useState<SentimentStatistics | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState("")

  console.log('🔄 FeelingAnalyticsPage rendered - TIME:', new Date().toISOString())

  useEffect(() => {
    // Check if user is logged in
    const storedUserName = localStorage.getItem("userName")
    const storedUserEmail = localStorage.getItem("userEmail")
    
    if (storedUserName && storedUserEmail) {
      setIsLoggedIn(true)
      setUserName(storedUserName)
      console.log('✅ Usuario logueado:', { userName: storedUserName, userEmail: storedUserEmail })
    } else {
      setIsLoggedIn(false)
      console.log('❌ Usuario NO logueado. localStorage vacío:', { userName: storedUserName, userEmail: storedUserEmail })
    }
    
    FeelingAnalyticsAPI.getRecords().then(setHistory).catch(() => {})
    FeelingAnalyticsAPI.getStatistics().then(setStatistics).catch(() => {})
  }, [])

  const finalScore = currentResult?.final_score ?? 0
  const finalScoreNormalized = (finalScore + 1) / 2

  const handleFileSelect = async (file: File) => {
    console.clear()
    console.error('═'.repeat(80))
    console.error('█ █ █ HANDLE FILE SELECT CALLED █ █ █')
    console.error('═'.repeat(80))
    console.error('File:', file.name)
    console.error('Timestamp:', new Date().toISOString())
    
    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setActiveTab("results")
    setError(null)
    setCurrentResult(null)

    try {
      const agentEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null
      const agentName = typeof window !== 'undefined' ? localStorage.getItem('userName') : null

      console.error('├─ agentEmail from localStorage:', agentEmail)
      console.error('├─ agentName from localStorage:', agentName)
      console.error('├─ agentEmail type:', typeof agentEmail)
      console.error('├─ agentName type:', typeof agentName)
      console.error('├─ agentEmail is truthy:', !!agentEmail)
      console.error('├─ agentName is truthy:', !!agentName)
      
      if (agentEmail) console.error('├─ agentEmail.trim():', agentEmail.trim())
      if (agentName) console.error('├─ agentName.trim():', agentName.trim())

      const progressInterval = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      console.error('└─ Calling FeelingAnalyticsAPI.analyzeAudio with:')
      console.error('   agentName:', agentName || 'undefined')
      console.error('   agentEmail:', agentEmail || 'undefined')
      
      const result = await FeelingAnalyticsAPI.analyzeAudio(file, 'both', agentName || undefined, agentEmail || undefined)

      clearInterval(progressInterval)
      setAnalysisProgress(100)
      setCurrentResult(result)
      FeelingAnalyticsAPI.getRecords().then(setHistory)
      FeelingAnalyticsAPI.getStatistics().then(setStatistics)
    } catch (error) {
      console.error('❌ ERROR in handleFileSelect:', error)
      setError(error instanceof Error ? error.message : "Error desconocido")
    } finally {
      setIsAnalyzing(false)
      console.error('═'.repeat(80))
    }
  }

  const handleSelectRecord = (result: SentimentAnalysisResult) => {
    setCurrentResult(result)
  }

  const pieData = currentResult?.top_emotions
    ? {
        labels: currentResult.top_emotions.slice(0, 3).map((e) => e.emotion),
        datasets: [
          {
            data: currentResult.top_emotions.slice(0, 3).map((e) => e.score * 100),
            backgroundColor: ["#22c55e", "#eab308", "#ef4444"],
            borderWidth: 1,
          },
        ],
      }
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-purple-800">Anlisis Multichannel de Sentimientos 🆕</h1>
              <p className="text-gray-600">Analiza emociones por separado en agente y cliente</p>
              <p style={{ fontSize: '10px', color: '#999' }}>🔧 DEBUG VERSION - {new Date().toISOString()}</p>
              {isLoggedIn ? (
                <p className="text-sm text-green-600 font-semibold">✅ Logueado como: {userName}</p>
              ) : (
                <p className="text-sm text-red-600 font-semibold">❌ NO logueado - Los archivos se guardarán como 'no-agent'</p>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Subir Audio</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center space-x-2">
              <FileAudio className="w-4 h-4" />
              <span>Resultados</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>Historial</span>
            </TabsTrigger>
          </TabsList>

          {}
          <TabsContent value="dashboard" className="space-y-6">
            <Summary statistics={statistics} />
          </TabsContent>
          {}
          <TabsContent value="upload" className="space-y-6">
            <AudioUploader onFileSelect={handleFileSelect} isAnalyzing={isAnalyzing} />
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 text-blue-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">
                    Backend FastAPI multichannel corriendo en http:
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {}
          <ResultsPage 
            currentResult={currentResult}
            isAnalyzing={isAnalyzing}
            analysisProgress={analysisProgress}
            error={error}
            onChangeTab={setActiveTab}
          />

          {}
          <HistoryPage 
            history={history}
            onSelectRecord={setCurrentResult}
            onChangeTab={setActiveTab}
          />

        </Tabs>
      </div>
    </div>
  )
}