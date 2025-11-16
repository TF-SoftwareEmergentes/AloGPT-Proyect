"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, X, FileAudio, AlertCircle } from "lucide-react"
import Link from "next/link"

interface AudioUploaderProps {
  onFileSelect: (file: File) => void
  isAnalyzing: boolean
}

export function AudioUploader({ onFileSelect, isAnalyzing }: AudioUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const storedUserName = typeof window !== 'undefined' ? localStorage.getItem('userName') : null
    const storedUserEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null
    if (storedUserName && storedUserEmail) {
      setIsLoggedIn(true)
      setUserName(storedUserName)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleSubmit = () => {
    console.error('🎤 handleSubmit clicked in AudioUploader - onFileSelect type:', typeof onFileSelect)
    console.error('  - selectedFile:', selectedFile?.name)
    console.error('  - isAnalyzing:', isAnalyzing)
    if (selectedFile) {
      console.error('✅ About to call onFileSelect with file:', selectedFile.name)
      try {
        onFileSelect(selectedFile)
        console.error('✅ onFileSelect call completed')
      } catch (e) {
        console.error('❌ ERROR calling onFileSelect:', e)
      }
    } else {
      console.error('❌ No file selected!')
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
  }

  if (!isLoggedIn) {
    return (
      <Card className="border-yellow-300 bg-yellow-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 mb-2">Usuario no autenticado</h3>
              <p className="text-yellow-700 mb-4">
                Debes estar logeado para subir y analizar audios. Por favor, inicia sesión primero.
              </p>
              <Link href="/login">
                <Button className="bg-yellow-600 hover:bg-yellow-700">
                  Ir a Login
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <p className="text-sm text-green-800">
            ✓ Logeado como: <strong>{userName}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Subir Audio para Análisis Multichannel</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedFile ? (
            <div className="border-2 border-dashed border-purple-300 rounded-lg p-8">
              <input
                type="file"
                accept=".mp3,.wav,.m4a,.ogg,.flac"
                onChange={handleFileChange}
                className="hidden"
                id="audio-upload"
                disabled={isAnalyzing}
              />
              <label
                htmlFor="audio-upload"
                className="cursor-pointer flex flex-col items-center space-y-4"
              >
                <FileAudio className="w-16 h-16 text-purple-500" />
                <div className="text-center">
                  <span className="text-lg font-medium text-purple-700">
                    Seleccionar archivo de audio Estéreo
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    MP3, WAV, M4A, OGG, FLAC (mx. 100MB)
                  </p>
                  <p className="text-xs text-purple-600 mt-2">
                     Los audios Estéreo se separarn automticamente en canales izquierdo (agente) y derecho (cliente)
                  </p>
                </div>
              </label>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileAudio className="w-8 h-8 text-purple-600" />
                <div>
                  <span className="font-medium text-purple-700">{selectedFile.name}</span>
                  <p className="text-sm text-gray-600">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                disabled={isAnalyzing}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Button 
        onClick={handleSubmit}
        disabled={!selectedFile || isAnalyzing}
        className="w-full"
        size="lg"
      >
        {isAnalyzing ? "Analizando Canales..." : "Analizar Audio Multichannel"}
      </Button>
    </div>
  )
}