'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription as ADDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Mic, MicOff, Phone, PhoneOff, AlertCircle, CheckCircle, Loader2, Volume2 } from 'lucide-react'
import { API_BASE_URL } from '@/lib/config'

interface ChunkAnalysis {
  channel: string
  final_score: number
  valence_score: number
  arousal_score: number
  advice: string
  transcript: string
}

interface LiveCallRecorderProps {
  agentEmail: string
  onCallEnd?: (result: any) => void
}

// Simple WAV encoder for browser
class WavEncoder {
  static encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + samples.length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true) // PCM
    view.setUint16(22, 1, true) // mono
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, samples.length * 2, true)

    // Convert float samples to PCM
    let offset = 44
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }

    return new Blob([buffer], { type: 'audio/wav' })
  }
}

export function LiveCallRecorder({ agentEmail, onCallEnd }: LiveCallRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [currentScore, setCurrentScore] = useState<ChunkAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [chunkCount, setChunkCount] = useState(0)
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false)
  const [finalResult, setFinalResult] = useState<any>(null)
  const [transcript, setTranscript] = useState('')
  const [allChunks, setAllChunks] = useState<Blob[]>([])
  const [alertCount, setAlertCount] = useState(0)
  const [alertsList, setAlertsList] = useState<string[]>([])
  const [showAlerts, setShowAlerts] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null)
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const volumeCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const chunkSamplesRef = useRef<Float32Array[]>([])
  const currentChunkSamplesRef = useRef<Float32Array[]>([])
  const isRecordingRef = useRef<boolean>(false)
  const abortControllerRef = useRef<AbortController>(new AbortController())

  // Cleanup on mount: ensure recording is stopped
  useEffect(() => {
    return () => {
      // Stop recording on unmount
      isRecordingRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (processorRef.current) {
        processorRef.current.disconnect()
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current)
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
      }
    }
  }, [])

  // Start recording with Web Audio API (produces WAV directly)
  const startRecording = async () => {
    try {
      setError(null)
      console.log('🎤 Requesting microphone access...')
      
      // Reset abort controller for new recording session
      abortControllerRef.current = new AbortController()
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,  // ✅ HABILITADO - amplifica automáticamente
          sampleRate: 16000
        }
      })
      
      console.log('✅ Microphone access granted')
      streamRef.current = stream
      isRecordingRef.current = true

      // Set up Web Audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioContext = audioContextRef.current
      const sampleRate = audioContext.sampleRate
      console.log('🔊 Sample rate:', sampleRate)

      analyserRef.current = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyserRef.current)

      // Start visualization
      visualizeVolume()
      console.log('📊 Volume visualization started')

      // Create script processor for chunk collection
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor
      
      chunkSamplesRef.current = []
      currentChunkSamplesRef.current = []

      processor.onaudioprocess = (e) => {
        if (isRecordingRef.current) {
          const inputData = e.inputBuffer.getChannelData(0)
          // Amplificar 5x si está muy silencioso
          const amplified = new Float32Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            // Clamp para evitar clipping
            amplified[i] = Math.max(-1, Math.min(1, inputData[i] * 5))
          }
          currentChunkSamplesRef.current.push(amplified)
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      setAllChunks([])
      setTranscript('')
      setCurrentScore(null)
      setChunkCount(0)
      setCallDuration(0)

      // Every 5 seconds, combine samples and send chunk
      chunkTimerRef.current = setInterval(async () => {
        if (!isRecordingRef.current) return
        
        if (currentChunkSamplesRef.current.length > 0) {
          const totalLength = currentChunkSamplesRef.current.reduce((sum, arr) => sum + arr.length, 0)
          const combined = new Float32Array(totalLength)
          let offset = 0
          for (const samples of currentChunkSamplesRef.current) {
            combined.set(samples, offset)
            offset += samples.length
          }

          console.log(`📦 Chunk collected: ${combined.length} samples`)

          const wavBlob = WavEncoder.encodeWAV(combined, sampleRate)
          chunkSamplesRef.current.push(combined)
          setAllChunks((prev) => [...prev, wavBlob])

          currentChunkSamplesRef.current = []

          await analyzeChunk(wavBlob)
        }
      }, 5000)

      // Update duration timer
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)

      setIsRecording(true)
      console.log('✅ Recording started')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al acceder al micrófono'
      setError('❌ ' + msg)
      console.error('Start recording error:', err)
      isRecordingRef.current = false
    }
  }

  // Stop recording
  const stopRecording = () => {
    console.log('⏹️ Stopping recording...')
    isRecordingRef.current = false
    
    // Cancel all pending requests
    console.log('🛑 Aborting pending requests...')
    abortControllerRef.current.abort()
    
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current)
      chunkTimerRef.current = null
    }

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
        console.log('🎤 Track stopped')
      })
      streamRef.current = null
    }

    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    currentChunkSamplesRef.current = []
    setIsRecording(false)
    console.log('✅ Recording stopped completely')
  }

  // Analyze a chunk
  const analyzeChunk = async (wavBlob: Blob) => {
    try {
      setLoading(true)
      
      // Don't send very small chunks
      if (wavBlob.size < 10000) {
        console.warn('⚠️ Chunk too small:', wavBlob.size, 'bytes, skipping')
        setLoading(false)
        return
      }
      
      const formData = new FormData()
      formData.append('audio', wavBlob, 'chunk.wav')
      formData.append('channel', 'caller')

      const response = await fetch(`${API_BASE_URL}/api/feeling-analytics/live/analyze-chunk`, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Chunk analysis error: ${response.status}`, errorText)
        return
      }

      const data: ChunkAnalysis = await response.json()
      setCurrentScore(data)
      setChunkCount((prev) => prev + 1)

      // handle alerts from chunk
      // @ts-ignore
      if (data.alerts) {
        // @ts-ignore
        const a = data.alerts
        if (a.profanity && a.profanity.length > 0) {
          setAlertsList((prev) => [...prev, ...a.profanity])
          setAlertCount((prev) => prev + a.profanity.length)
        }
        if (a.anger) {
          setAlertCount((prev) => prev + 1)
          setAlertsList((prev) => [...prev, 'anger'])
        }
      }

      // Append transcript only if it's not silence
      if (data.transcript && data.transcript.length > 0 && data.transcript !== '[Silence]') {
        setTranscript((prev) => (prev ? prev + ' ' + data.transcript : data.transcript))
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('⏹️ Request aborted (recording stopped)')
        return
      }
      console.error('Chunk analysis error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Finalize call and upload full audio
  const finializeCall = async () => {
    try {
      setIsSubmittingFinal(true)
      setError(null)

      if (allChunks.length === 0) {
        setError('No hay audio grabado para finalizar')
        setIsSubmittingFinal(false)
        return
      }

      // Get agent info from localStorage
      const agentEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null
      const agentName = typeof window !== 'undefined' ? localStorage.getItem('userName') : null

      // Combine all chunks into one full audio file (they're already WAV format)
      const fullAudioBlob = new Blob(allChunks, { type: 'audio/wav' })

      const formData = new FormData()
      formData.append('audio', fullAudioBlob, 'call-recording.wav')
      if (agentEmail) formData.append('agent_email', agentEmail)
      if (agentName) formData.append('agent_name', agentName)
      formData.append('analyze_channels', 'both')
      formData.append('save', 'true')

      console.log('📤 Finalizando llamada con:', { agentEmail, agentName })

      const response = await fetch(`${API_BASE_URL}/api/feeling-analytics/live/end-call`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      setFinalResult(data.result)

      if (onCallEnd) {
        onCallEnd(data.result)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al finalizar la llamada'
      setError(msg)
      console.error('Finalize error:', err)
    } finally {
      setIsSubmittingFinal(false)
    }
  }

  // Save accumulated audio locally as a WAV file for quick verification
  const saveTempAudio = () => {
    try {
      if (allChunks.length === 0) {
        setError('No hay audio para guardar')
        return
      }

      const fullAudioBlob = new Blob(allChunks, { type: 'audio/wav' })
      const url = URL.createObjectURL(fullAudioBlob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `temp-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.wav`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error saving temp audio:', err)
      setError('No se pudo guardar el audio temporalmente')
    }
  }

  // Visualize volume
  const visualizeVolume = () => {
    if (!analyserRef.current || !volumeCanvasRef.current) return

    const canvas = volumeCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = 256
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      analyserRef.current!.getByteFrequencyData(dataArray)

      ctx.fillStyle = 'rgb(240, 240, 240)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let barHeight
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height

        ctx.fillStyle = `hsl(${(i / bufferLength) * 360}, 100%, 50%)`
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }

      if (isRecording) {
        requestAnimationFrame(draw)
      }
    }

    draw()
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Get color based on score
  const getScoreColor = (score: number) => {
    if (score <= -0.2) return 'text-red-600'
    if (score >= 0.2) return 'text-green-600'
    return 'text-yellow-600'
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Phone className={`w-5 h-5 ${isRecording ? 'text-green-600 animate-pulse' : 'text-gray-400'}`} />
              {/* Alerts badge */}
              <div onClick={() => setShowAlerts(true)} className="ml-2 relative cursor-pointer">
                <AlertCircle className={`w-5 h-5 ${alertCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                {alertCount > 0 && (
                  <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {alertCount}
                  </span>
                )}
              </div>
            </div>
            Estado de la Llamada
          </CardTitle>
          <CardDescription>
            {isRecording ? 'Grabando en vivo...' : finalResult ? 'Llamada finalizada' : 'Listo para grabar'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Duration */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="font-semibold text-gray-700">Duración:</span>
            <span className="text-2xl font-bold text-blue-600 font-mono">
              {formatDuration(callDuration)}
            </span>
          </div>

          {/* Volume Visualization */}
          {isRecording && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-semibold text-gray-700">
                <Volume2 className="w-4 h-4" />
                Nivel de Audio
              </label>
              <canvas
                ref={volumeCanvasRef}
                width={400}
                height={80}
                className="w-full border rounded-lg bg-white"
              />
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Análisis realizados</p>
              <p className="text-2xl font-bold text-blue-600">{chunkCount}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Agente</p>
              <p className="text-sm font-semibold text-purple-600 truncate">{agentEmail}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Score Card */}
      {currentScore && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Análisis en Tiempo Real (Chunk #{chunkCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Score Display */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-1">Puntuación General</p>
                <p className={`text-3xl font-bold ${getScoreColor(currentScore.final_score)}`}>
                  {currentScore.final_score.toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-1">Valence</p>
                <p className="text-3xl font-bold text-green-600">
                  {currentScore.valence_score.toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-1">Arousal</p>
                <p className="text-3xl font-bold text-orange-600">
                  {currentScore.arousal_score.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Advice */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="font-semibold text-yellow-900 mb-2">💡 Consejo en Vivo:</p>
              <p className="text-yellow-800">{currentScore.advice}</p>
            </div>

            {/* Transcript */}
            {currentScore.transcript && (
              <div className="p-4 bg-gray-50 border rounded-lg">
                <p className="font-semibold text-gray-700 mb-2">Transcripción (últimas palabras):</p>
                <p className="text-gray-700 italic">{currentScore.transcript}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Full Transcript */}
      {transcript && (
        <Card>
          <CardHeader>
            <CardTitle>Transcripción Completa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-gray-700">{transcript}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Control Buttons */}
      <div className="flex gap-4">
        {!isRecording && !finalResult ? (
          <Button
            size="lg"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={startRecording}
            disabled={isSubmittingFinal}
          >
            <Mic className="mr-2 h-5 w-5" />
            Iniciar Grabación
          </Button>
        ) : isRecording ? (
          <>
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={stopRecording}
            >
              <MicOff className="mr-2 h-5 w-5" />
              Detener Grabación
            </Button>
            <div className="flex-1 flex gap-2">
              <Button
                size="lg"
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={finializeCall}
                disabled={isSubmittingFinal}
              >
                {isSubmittingFinal ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <PhoneOff className="mr-2 h-5 w-5" />
                    Finalizar y Guardar
                  </>
                )}
              </Button>

              <Button
                size="lg"
                variant="ghost"
                className="flex-none"
                onClick={saveTempAudio}
              >
                Guardar temporal
              </Button>
            </div>
          </>
        ) : null}
      </div>

      {/* Alerts Modal */}
      <AlertDialog open={showAlerts} onOpenChange={(open) => setShowAlerts(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alertas detectadas durante la llamada</AlertDialogTitle>
            <ADDescription>Listado rápido de palabras detectadas como profanidad o indicios de enojo.</ADDescription>
          </AlertDialogHeader>
          <div className="mt-4">
            {alertsList.length === 0 ? (
              <p className="text-sm text-gray-600">No se detectaron alertas.</p>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {alertsList.map((a, idx) => (
                  <li key={idx} className="text-sm text-red-700">{a}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialogCancel onClick={() => setShowAlerts(false)}>Cerrar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // future: mark as acknowledged or create DB event
                setShowAlerts(false)
              }}
            >
              Aceptar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Final Result */}
      {finalResult && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle className="w-5 h-5" />
              Llamada Guardada Exitosamente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Puntuación Final (Agente)</p>
                <p className="text-2xl font-bold text-green-600">
                  {finalResult.caller?.final_score?.toFixed(2) || 'N/A'}
                </p>
              </div>
              {finalResult.client && (
                <div>
                  <p className="text-sm text-gray-600">Puntuación Final (Cliente)</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {finalResult.client.final_score?.toFixed(2) || 'N/A'}
                  </p>
                </div>
              )}
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                setFinalResult(null)
                setIsRecording(false)
                setChunkCount(0)
                setTranscript('')
                setCallDuration(0)
              }}
            >
              Nueva Llamada
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
