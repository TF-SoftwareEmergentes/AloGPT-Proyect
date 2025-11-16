"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { TabsContent } from "@/components/ui/tabs"
import { AlertCircle, Users, FileAudio } from "lucide-react"
import { Pie } from "react-chartjs-2"
import SentimentVisualization from "../components/sentiment-visualization"
import type { SentimentAnalysisResult } from "@/types/sentiment"

interface ResultsPageProps {
  currentResult: SentimentAnalysisResult | null
  isAnalyzing: boolean
  analysisProgress: number
  error: string | null
  onChangeTab: (tab: string) => void
}

const getScoreColor = (score: number) => {
  if (score >= 0.66) return "text-green-600"
  if (score >= 0.33) return "text-yellow-600"
  return "text-red-600"
}

export function ResultsPage({ 
  currentResult, 
  isAnalyzing, 
  analysisProgress, 
  error, 
  onChangeTab 
}: ResultsPageProps) {
  
  console.log('Current result structure:', currentResult)

  return (
    <TabsContent value="results" className="space-y-6">
      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>Error en el Análisis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
            <Button onClick={() => onChangeTab("upload")} className="mt-4" variant="outline">
              Intentar de nuevo
            </Button>
          </CardContent>
        </Card>
      ) : isAnalyzing ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
              <span>Analizando canales de audio...</span>
            </CardTitle>
            <CardDescription>
              Separando canales Estéreo y analizando emociones por separado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={analysisProgress} className="w-full" />
              <p className="text-sm text-gray-600 text-center">{analysisProgress}% completado</p>
            </div>
          </CardContent>
        </Card>
      ) : currentResult ? (
        <div className="space-y-6">
          {}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Resultados del Análisis Multichannel</span>
              </CardTitle>
              <CardDescription>
                Archivo: {currentResult.filename || 'No disponible'}  
                {currentResult.processing_time ? `Procesado en ${currentResult.processing_time.toFixed(2)}s` : 'Tiempo de procesado no disponible'}<br />
                Tipo: {currentResult.is_stereo ? 'Estéreo' : 'Mono'}  
                Canales: {currentResult.channels_analyzed?.join(', ') || 'No disponible'}
              </CardDescription>
            </CardHeader>
          </Card>

          {}
          <div className="grid md:grid-cols-2 gap-6">
            {}
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800">Agente (Canal Izquierdo)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(currentResult.caller?.final_score ?? 0)}`}>
                    {(currentResult.caller?.final_score ?? 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Score Final</div>
                </div>
                
                {}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-blue-700">
                      {(currentResult.caller?.valence_score ?? 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600">Valencia</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-700">
                      {(currentResult.caller?.arousal_score ?? 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600">Activación</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-blue-800 text-sm">Top Emociones:</h4>
                  {currentResult.caller?.top_emotions?.slice(0, 5).map((emotion, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="capitalize">{emotion.emotion}</span>
                      <span className={`font-medium ${getScoreColor(emotion.score)}`}>
                        {(emotion.score * 100).toFixed(1)}%
                      </span>
                    </div>
                  )) || <div className="text-gray-500 text-sm">No hay emociones disponibles</div>}
                </div>
              </CardContent>
            </Card>

            {}
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800">Cliente (Canal Derecho)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(currentResult.client?.final_score ?? 0)}`}>
                    {(currentResult.client?.final_score ?? 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Score Final</div>
                </div>

                {}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-green-700">
                      {(currentResult.client?.valence_score ?? 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600">Valencia</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-700">
                      {(currentResult.client?.arousal_score ?? 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600">Activación</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-green-800 text-sm">Top Emociones:</h4>
                  {currentResult.client?.top_emotions?.slice(0, 5).map((emotion, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="capitalize">{emotion.emotion}</span>
                      <span className={`font-medium ${getScoreColor(emotion.score)}`}>
                        {(emotion.score * 100).toFixed(1)}%
                      </span>
                    </div>
                  )) || <div className="text-gray-500 text-sm">No hay emociones disponibles</div>}
                </div>
              </CardContent>
            </Card>
          </div>

          {}
          {currentResult.comparison && (
            <Card>
              <CardHeader>
                <CardTitle>Comparacin entre Agente y Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-700">
                      {currentResult.comparison.score_difference.toFixed(3)}
                    </div>
                    <div className="text-sm text-gray-600">Diferencia Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-700 capitalize">
                      {currentResult.comparison.dominant_speaker === 'caller' ? 'Agente' : 'Cliente'}
                    </div>
                    <div className="text-sm text-gray-600">Dominante</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-700">
                      {(currentResult.comparison.emotional_synchrony * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Sincrona</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-700">
                      {Object.keys(currentResult.comparison.significant_emotion_differences).length}
                    </div>
                    <div className="text-sm text-gray-600">Diferencias</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {}
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-800">Análisis General</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(currentResult.final_score ?? 0)}`}>
                    {(currentResult.final_score ?? 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Score General</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-700">
                    {(currentResult.valence_score ?? 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Valencia General</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-700">
                    {(currentResult.arousal_score ?? 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Activación General</div>
                </div>
              </div>
              
              <div className="space-y-2 mt-4">
                <h4 className="font-semibold text-purple-800 text-sm">Emociones Generales:</h4>
                {currentResult.top_emotions?.slice(0, 3).map((emotion, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="capitalize">{emotion.emotion}</span>
                    <span className={`font-medium ${getScoreColor(emotion.score)}`}>
                      {(emotion.score * 100).toFixed(1)}%
                    </span>
                  </div>
                )) || <div className="text-gray-500 text-sm">No hay emociones generales disponibles</div>}
              </div>
            </CardContent>
          </Card>

          {}
          <Card>
            <CardHeader>
              <CardTitle>Palabras Clave</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {currentResult.keywords && currentResult.keywords.length > 0 ? (
                  currentResult.keywords.map((keyword, index) => (
                    <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                      {keyword}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm">No hay palabras clave disponibles</span>
                )}
              </div>
            </CardContent>
          </Card>

          {}
          <SentimentVisualization 
            callerData={currentResult.caller}
            clientData={currentResult.client}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <FileAudio className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">
              No hay resultados para mostrar. Sube un archivo de audio para comenzar el Análisis multichannel.
            </p>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  )
}