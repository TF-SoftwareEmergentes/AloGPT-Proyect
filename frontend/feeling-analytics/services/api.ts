import type { SentimentAnalysisResult, SentimentRecord, SentimentStatistics } from "../types/sentiment"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export class FeelingAnalyticsAPI {
  static async analyzeAudio(
    file: File, 
    analyzeChannels: 'both' | 'caller' | 'client' | 'mono' = 'both',
    agentName?: string,
    agentEmail?: string
  ): Promise<SentimentAnalysisResult> {
    console.error('🔥 *** ANALYZE AUDIO CALLED *** TIME:', new Date().toISOString())
    console.log('🔍 analyzeAudio() called with:', {
      filename: file.name,
      analyzeChannels,
      agentName_received: agentName,
      agentName_type: typeof agentName,
      agentEmail_received: agentEmail,
      agentEmail_type: typeof agentEmail,
    })

    const formData = new FormData()
    console.error('🔴 FORMDATA CREATED - Appending audio and analyze_channels')
    formData.append("audio", file)
    formData.append("analyze_channels", analyzeChannels)
    
    console.error('🔴 Checking agentName:', { agentName, isTruthy: !!agentName, trimmed: agentName?.trim() })
    // Only append if values exist - don't send empty strings
    if (agentName && agentName.trim()) {
      console.error('🟢 ✅ Appending agentName:', agentName.trim())
      formData.append("agent_name", agentName.trim())
    } else {
      console.error('🔴 ⏭️  Skipping agentName - falsy or empty after trim')
    }
    
    console.error('🔴 Checking agentEmail:', { agentEmail, isTruthy: !!agentEmail, trimmed: agentEmail?.trim() })
    if (agentEmail && agentEmail.trim()) {
      console.error('🟢 ✅ Appending agentEmail:', agentEmail.trim())
      formData.append("agent_email", agentEmail.trim())
    } else {
      console.error('🔴 ⏭️  Skipping agentEmail - falsy or empty after trim')
    }

    console.error("🔴 FormData prepared with keys:", Array.from(formData.entries()).map(([k]) => k))

    try {
      const response = await fetch(`${API_BASE_URL}/api/feeling-analytics/analyze`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const responseData = await response.json()
      console.log('✅ Backend response received:', responseData)
      return responseData
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(`Backend no disponible. Asegúrate de que FastAPI está corriendo en ${API_BASE_URL}`)
      }
      throw error
    }
  }

  static async getStatistics(): Promise<SentimentStatistics> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/feeling-analytics/statistics`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Backend no disponible")
      }
      throw error
    }
  }

  static async getRecords(limit = 100, offset = 0, agentEmail?: string): Promise<SentimentRecord[]> {
    try {
      let url = `${API_BASE_URL}/api/feeling-analytics/records?limit=${limit}&offset=${offset}`
      if (agentEmail) {
        url += `&agent_email=${encodeURIComponent(agentEmail)}`
      }
      const response = await fetch(url)
      if (!response.ok) {
        const errorText = await response.text()
        console.error("API error:", errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      return await response.json()
    } catch (error) {
      console.error("Fetch error:", error)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Backend no disponible")
      }
      throw error
    }
  }

  static async getRecord(audioId: string): Promise<SentimentAnalysisResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/feeling-analytics/records/${audioId}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Backend no disponible")
      }
      throw error
    }
  }
}
