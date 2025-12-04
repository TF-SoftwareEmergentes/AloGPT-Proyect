"""
Mock version of SentimentAnalyzer for testing without ML models.
This allows the application to run without torch/transformers dependencies.
"""
import os
import random
from datetime import datetime
from typing import Optional
import uuid

MAIN_EMOTIONS = ["Valence", "Arousal", "Anger", "Sadness", "Joy", "Fear", "Disgust", "Awe", "Contentment", "Interest"]

class SentimentAnalyzer:
    """Mock SentimentAnalyzer that returns simulated data"""
    
    def __init__(self):
        print("🧪 Using MOCK SentimentAnalyzer (no ML models)")
        self.ready = True
    
    def analyze_audio(self, audio_file_path: str, filename: str, analyze_channels: str = "both") -> dict:
        """Main method called by the API - delegates to analyze_file"""
        print(f"📝 Mock analyze_audio: {filename} (channels: {analyze_channels})")
        return self.analyze_file(audio_file_path)
        
    def analyze_file(self, file_path: str) -> dict:
        """Simulate analysis of an audio file"""
        print(f"📝 Mock analysis of: {file_path}")
        
        # Generate random but realistic-looking results
        valence = random.uniform(-0.5, 0.8)
        arousal = random.uniform(0.2, 0.7)
        
        # Generate mock emotions
        emotions = {}
        for emotion in MAIN_EMOTIONS:
            emotions[emotion] = random.uniform(0, 1)
        
        # Normalize to make more realistic
        emotions["Valence"] = valence
        emotions["Arousal"] = arousal
        
        # Sort top emotions
        sorted_emotions = sorted(
            [(k, v) for k, v in emotions.items()],
            key=lambda x: abs(x[1]),
            reverse=True
        )[:5]
        
        top_emotions = [{"name": name, "score": score} for name, score in sorted_emotions]
        
        # Calculate final score
        final_score = (valence + 1) / 2 * 100  # Convert -1,1 to 0-100
        
        result = {
            "id_call": str(uuid.uuid4())[:8],
            "filename": os.path.basename(file_path),
            "is_stereo": True,
            "channels_analyzed": ["caller", "client"],
            "final_score": round(final_score, 2),
            "valence_score": round(valence, 3),
            "arousal_score": round(arousal, 3),
            "top_emotions": top_emotions,
            "caller": self._generate_channel_analysis("caller"),
            "client": self._generate_channel_analysis("client"),
            "comparison": self._generate_comparison(),
            "advice": self._generate_advice(valence, arousal, emotions.get("Anger", 0)),
            "analysis_timestamp": datetime.now().isoformat()
        }
        
        return result
    
    def _generate_channel_analysis(self, channel_name: str) -> dict:
        """Generate mock channel analysis"""
        valence = random.uniform(-0.3, 0.7)
        arousal = random.uniform(0.2, 0.6)
        
        emotions = {emotion: random.uniform(0, 1) for emotion in MAIN_EMOTIONS}
        emotions["Valence"] = valence
        emotions["Arousal"] = arousal
        
        sorted_emotions = sorted(
            [(k, v) for k, v in emotions.items()],
            key=lambda x: abs(x[1]),
            reverse=True
        )[:5]
        
        # Calculate final_score from valence (convert -1,1 to 0-100)
        final_score = (valence + 1) / 2 * 100
        
        return {
            "channel": channel_name,
            "final_score": round(final_score, 2),
            "valence": round(valence, 3),
            "valence_score": round(valence, 3),
            "arousal": round(arousal, 3),
            "arousal_score": round(arousal, 3),
            "emotions": {k: round(v, 3) for k, v in emotions.items()},
            "all_scores": {k: round(v, 3) for k, v in emotions.items()},
            "top_emotions": [{"name": name, "score": round(score, 3)} for name, score in sorted_emotions],
            "transcription": f"[Mock transcription for {channel_name}] This is a simulated call transcript..."
        }
    
    def _generate_comparison(self) -> dict:
        """Generate mock comparison between channels"""
        return {
            "valence_diff": round(random.uniform(-0.3, 0.3), 3),
            "arousal_diff": round(random.uniform(-0.2, 0.2), 3),
            "sync_score": round(random.uniform(0.5, 0.9), 3),
            "score_difference": round(random.uniform(-0.3, 0.3), 3),
            "emotional_synchrony": round(random.uniform(0.5, 0.95), 3),
            "significant_emotion_differences": {
                "Joy": round(random.uniform(-0.2, 0.2), 3),
                "Anger": round(random.uniform(-0.1, 0.1), 3)
            },
            "dominant_speaker": random.choice(["caller", "client"])
        }
    
    def _generate_advice(self, valence: float, arousal: float, anger: float) -> str:
        """Generate advice based on mock analysis"""
        if anger > 0.5:
            return "🔴 Se detectó enojo en la llamada. Mantén la calma y muestra empatía."
        elif valence < -0.3:
            return "😔 Tonalidad negativa detectada. Intenta ser más positivo y ofrecer soluciones."
        elif valence > 0.5:
            return "✅ ¡Excelente! La llamada muestra un tono positivo. Sigue así."
        elif arousal > 0.6:
            return "⚡ Alta activación emocional. Considera técnicas de calma."
        else:
            return "👍 La llamada muestra niveles emocionales normales."


class LiveAnalyzer:
    """Mock LiveAnalyzer for real-time analysis"""
    
    def __init__(self):
        print("🧪 Using MOCK LiveAnalyzer")
        self.sessions = {}
        
    def start_session(self, session_id: str):
        """Start a new live session"""
        self.sessions[session_id] = {
            "chunks": [],
            "start_time": datetime.now().isoformat()
        }
        return {"status": "started", "session_id": session_id}
    
    def analyze_chunk(self, session_id: str, audio_chunk: bytes) -> dict:
        """Analyze an audio chunk"""
        if session_id not in self.sessions:
            self.start_session(session_id)
            
        valence = random.uniform(-0.3, 0.6)
        arousal = random.uniform(0.2, 0.5)
        
        return {
            "session_id": session_id,
            "valence": round(valence, 3),
            "arousal": round(arousal, 3),
            "current_emotion": random.choice(["Neutral", "Content", "Interest", "Joy"]),
            "advice": "Continúa con el mismo tono profesional."
        }
    
    def end_session(self, session_id: str) -> dict:
        """End a live session and return summary"""
        session = self.sessions.pop(session_id, None)
        
        return {
            "session_id": session_id,
            "duration": "00:05:23",
            "average_valence": round(random.uniform(0.1, 0.5), 3),
            "average_arousal": round(random.uniform(0.2, 0.4), 3),
            "overall_sentiment": "Positive",
            "advice": "La llamada fue manejada de manera profesional. ¡Buen trabajo!"
        }
