"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TabsContent } from "@/components/ui/tabs"
import { FeelingAnalyticsAPI } from "../services/api"
import type { SentimentRecord, SentimentAnalysisResult } from "@/types/sentiment"
import { useState, useEffect } from "react"
import { AlertCircle, Loader2 } from "lucide-react"

interface HistoryPageProps {
  history: SentimentRecord[]
  onSelectRecord: (result: SentimentAnalysisResult) => void
  onChangeTab: (tab: string) => void
}

export function HistoryPage({ history, onSelectRecord, onChangeTab }: HistoryPageProps) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  useEffect(() => {
    const loadRecords = async () => {
      try {
        setLoading(true)
        setError(null)
        // Get agent email from localStorage - use userEmail (the key set by login)
        const agentEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null
        const userName = typeof window !== 'undefined' ? localStorage.getItem('userName') : null
        console.log('📜 Cargando historial para:', { agentEmail, userName })
        console.log('📜 LocalStorage completo:', {
          userEmail: localStorage.getItem('userEmail'),
          userName: localStorage.getItem('userName'),
          userType: localStorage.getItem('userType')
        })
        
        // Load ALL records (no filter by email) to show all analyzed audios for any user
        // This is a workaround while we debug why agent_email isn't being saved correctly
        console.log('🔍 Obteniendo TODOS los registros (sin filtro)...')
        const data = await FeelingAnalyticsAPI.getRecords(1000, 0, undefined)
        console.log(`✓ Registros cargados: ${data?.length || 0} registros`, data)
        
        setRecords(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar registros")
        console.error("Error loading records:", err)
      } finally {
        setLoading(false)
      }
    }

    loadRecords()
  }, [])

  const handleViewRecord = async (fileId: string) => {
    try {
      setLoading(true)
      if (!fileId) {
        setError("ID de registro inválido")
        return
      }
      const result: any = await FeelingAnalyticsAPI.getRecord(fileId)
      
      // Parse JSON fields if they come as strings
      const parseJsonField = (field: any) => {
        if (typeof field === 'string') {
          try {
            return JSON.parse(field)
          } catch (e) {
            return field
          }
        }
        return field
      }
      
      // Format result - backend now sends properly structured data
      const formattedResult: SentimentAnalysisResult = {
        id_call: result.id_call || fileId,
        dni: result.dni || '',
        call_date: result.call_date || new Date().toISOString(),
        filename: result.filename || result.id_call || fileId,
        is_stereo: result.is_stereo || false,
        channels_analyzed: result.channels_analyzed || [],
        final_score: result.final_score || 0,
        valence_score: result.valence_score || 0,
        arousal_score: result.arousal_score || 0,
        top_emotions: parseJsonField(result.top_emotions) || [],
        all_scores: parseJsonField(result.all_scores) || {},
        keywords: result.keywords || [],
        processing_time: result.processing_time || 0,
        analysis_date: result.analysis_date,
        caller: parseJsonField(result.caller) || {},
        client: parseJsonField(result.client) || {},
      }
      
      onSelectRecord(formattedResult)
      onChangeTab("results")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el registro")
      console.error("Error loading record:", err)
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceColor = (confianza: number) => {
    if (confianza >= 0.8) return 'bg-green-100 text-green-800'
    if (confianza >= 0.5) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getStatusLabel = (confianza: number) => {
    if (confianza >= 0.8) return 'Confiable'
    if (confianza >= 0.5) return 'Dudosa'
    return 'No Confiable'
  }

  const formatDate = (dateStr: any) => {
    try {
      if (!dateStr) return 'N/A'
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return 'N/A'
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return 'N/A'
    }
  }

  return (
    <TabsContent value="history" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📞 Historial de Análisis Multichannel
          </CardTitle>
          <CardDescription>
            Análisis completos de llamadas con sentimientos por canal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Error al cargar registros</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <span className="ml-3 text-gray-600">Cargando registros...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg mb-2">No hay análisis previos</p>
              <p className="text-sm">Sube un archivo de audio para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-100 to-purple-50 border-b-2 border-purple-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">ID Llamada</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Agente ↔ Cliente</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Confianza</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Sincronía</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Promesa</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => {
                    // Map database fields to UI fields
                    const id_call = record.id_call || `record-${index}`
                    const agentName = record.agent_name || 'Desconocido'
                    const finalScore = parseFloat(record.final_score) || 0
                    const valence = parseFloat(record.valence_score) || 0
                    const arousal = parseFloat(record.arousal_score) || 0
                    const analysisDate = record.analysis_date
                    
                    // Calculate metrics from emotion scores
                    const confianza = Math.abs(finalScore) // Use final_score as confidence
                    const sincronía = ((valence + arousal) / 2) * 100 // Average of valence/arousal as sync
                    
                    return (
                      <tr 
                        key={`${id_call}-${index}`} 
                        className="border-b hover:bg-purple-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-purple-700 font-semibold">
                          {id_call?.slice(0, 12)}...
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{agentName}</span>
                            <span className="text-xs text-gray-600">Análisis Multichannel</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-6 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-xs">
                                {(confianza * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getConfidenceColor(confianza)}`}>
                            {getStatusLabel(confianza)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(Math.max(sincronía, 0), 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700">
                              {sincronía.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                            ✓ Analizado
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {formatDate(analysisDate)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            onClick={() => handleViewRecord(id_call)}
                            disabled={loading || !id_call}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            {loading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              '🔍 Ver'
                            )}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Stats */}
      {records.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Análisis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">{records.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Confianza Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {(records.reduce((sum, r) => sum + Math.abs(parseFloat(r.final_score) || 0), 0) / records.length * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Valence Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {(records.reduce((sum, r) => sum + parseFloat(r.valence_score || 0), 0) / records.length).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Arousal Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-cyan-600">
                {(records.reduce((sum, r) => sum + parseFloat(r.arousal_score || 0), 0) / records.length).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </TabsContent>
  )
}