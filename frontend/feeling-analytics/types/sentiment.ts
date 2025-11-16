export interface EmotionScore {
  emotion: string
  score: number
  confidence: number
}

export interface SentimentEmotion {
  emotion: string
  score: number
}

export interface ChannelAnalysis {
  channel: string
  final_score: number
  valence_score: number
  arousal_score: number
  top_emotions: SentimentEmotion[]
  all_scores: Record<string, number>
  keywords: string[]
}

export interface ComparisonAnalysis {
  score_difference: number
  valence_difference: number
  arousal_difference: number
  dominant_speaker: 'caller' | 'client'
  emotional_synchrony: number
  significant_emotion_differences: Record<string, number>
}

export interface SentimentAnalysisResult {
  id_call: string
  dni: string
  call_date: string
  filename: string
  analysis_type?: 'mono' | 'stereo'
  is_stereo: boolean
  channels_analyzed: string[]
  final_score: number
  valence_score: number
  arousal_score: number
  top_emotions: SentimentEmotion[]
  all_scores: Record<string, number>
  keywords: string[]
  processing_time: number
  analysis_date: string
  caller?: ChannelAnalysis
  client?: ChannelAnalysis
  comparison?: ComparisonAnalysis
}

export interface SentimentRecord {
  id_call: string
  filename: string
  final_score: number
  analysis_date: string
  analysis_type: string
  is_stereo: boolean
  channels_analyzed: string[]
  record_type?: 'caller' | 'client'
  channel_name?: string
}

export interface SentimentStatistics {
  total_audios: number
  avg_final_score: number
  avg_caller_score: number
  avg_client_score: number
  stereo_percentage: number
  top_emotion: string
}
