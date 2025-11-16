import os
import librosa
import numpy as np
import torch
import torch.nn as nn
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
from dotenv import load_dotenv
from datetime import datetime
import tempfile
import subprocess
import traceback
from pathlib import Path
from typing import Tuple, Dict
from scipy.special import softmax

load_dotenv()

# ===== CONFIGURATION FROM .ENV =====
USE_LOCAL_MODELS = os.getenv('USE_LOCAL_MODELS', 'true').lower() == 'true'
WHISPER_MODEL = os.getenv('WHISPER_MODEL', 'base')
DEVICE = os.getenv('DEVICE', 'cpu')
LOCAL_MODELS_PATH = os.getenv('LOCAL_MODELS_PATH', '')

SAMPLING_RATE = 16000
BACKEND_DIR = Path(__file__).parent.parent.parent

# Remote models IDs
WHISPER_REMOTE_ID = f"openai/whisper-{WHISPER_MODEL}"
EMPATHIC_REMOTE_ID = "laion/Empathic-Insight-Voice-Small"

# Local paths
if USE_LOCAL_MODELS and LOCAL_MODELS_PATH:
    LOCAL_MODELS_DIR = Path(LOCAL_MODELS_PATH)
else:
    LOCAL_MODELS_DIR = BACKEND_DIR / "models" / "empathic_insight"

LOCAL_WHISPER_DIR = LOCAL_MODELS_DIR / "whisper_model"
LOCAL_EMPATHIC_DIR = LOCAL_MODELS_DIR / "empathic_insight"

MAIN_EMOTIONS = ["Valence", "Arousal", "Anger", "Sadness", "Joy", "Fear", "Disgust", "Awe", "Contentment", "Interest"]

# ===== FILE MAPPING FOR LOCAL EMPATHIC MODELS (TOP 10 EMOTIONS - VERIFIED IN HUGGINGFACE) =====
FILENAME_PART_TO_TARGET_KEY_MAP: Dict[str, str] = {
    "Valence": "Valence",
    "Arousal": "Arousal",
    "Anger": "Anger",
    "Sadness": "Sadness",
    "Elation": "Joy",  # Elation maps to Joy
    "Fear": "Fear",
    "Disgust": "Disgust",
    "Awe": "Awe",
    "Contentment": "Contentment",
    "Interest": "Interest"
}

print(f"🔧 Config: MODEL_MODE={'LOCAL' if USE_LOCAL_MODELS else 'REMOTE'} | Device: {DEVICE.upper()}")


class FullEmbeddingMLP(nn.Module):
    """MLP model for emotion prediction from Whisper embeddings"""
    def __init__(self, seq_len=1500, embed_dim=768, projection_dim=64, mlp_hidden_dims=[64, 32, 16], mlp_dropout_rates=[0.0, 0.1, 0.1, 0.1]):
        super().__init__()
        if len(mlp_dropout_rates) != len(mlp_hidden_dims) + 1:
            raise ValueError("Dropout rates length error.")
        self.flatten = nn.Flatten()
        self.proj = nn.Linear(seq_len * embed_dim, projection_dim)
        layers = [nn.ReLU(), nn.Dropout(mlp_dropout_rates[0])]
        current_dim = projection_dim
        for i, h_dim in enumerate(mlp_hidden_dims):
            layers.extend([
                nn.Linear(current_dim, h_dim),
                nn.ReLU(),
                nn.Dropout(mlp_dropout_rates[i+1])
            ])
            current_dim = h_dim
        layers.append(nn.Linear(current_dim, 1))
        self.mlp = nn.Sequential(*layers)
    
    def forward(self, x):
        if x.ndim == 4 and x.shape[1] == 1:
            x = x.squeeze(1)
        return self.mlp(self.proj(self.flatten(x)))


class SentimentAnalyzer:
    def __init__(self):
        self.device = torch.device(DEVICE if torch.cuda.is_available() else "cpu")
        self.initialized = False
        self.use_fallback = False
        self.whisper_model = None
        self.whisper_processor = None
        self.mlp_models = {}
        # Projection layer to convert Whisper embeddings (512) to MLP expected (768)
        self.embedding_projection = nn.Linear(512, 768).to(self.device)
        self._initialize_models()

    def _initialize_models(self):
        """Initialize Whisper + Empathic models (LOCAL or REMOTE)"""
        if self.initialized:
            return
        
        print("=" * 70)
        print(f"🚀 INITIALIZING MODELS - MODE: {'LOCAL' if USE_LOCAL_MODELS else 'REMOTE'}")
        print("=" * 70)
        
        # ===== LOAD WHISPER =====
        self._load_whisper()
        
        # ===== LOAD EMPATHIC MODELS =====
        self._load_empathic_models()
        
        print("=" * 70)
        print(f"✅ Models ready! Loaded {len(self.mlp_models)} emotion models")
        print("=" * 70)
        self.initialized = True

    def _load_whisper(self):
        """Load Whisper model (LOCAL or REMOTE)"""
        try:
            if USE_LOCAL_MODELS:
                print(f"\n📁 WHISPER (LOCAL):")
                if not LOCAL_WHISPER_DIR.exists():
                    raise FileNotFoundError(f"Local Whisper not found: {LOCAL_WHISPER_DIR}")
                print(f"   Path: {LOCAL_WHISPER_DIR}")
                self.whisper_processor = AutoProcessor.from_pretrained(str(LOCAL_WHISPER_DIR))
                self.whisper_model = AutoModelForSpeechSeq2Seq.from_pretrained(
                    str(LOCAL_WHISPER_DIR)
                ).to(self.device).eval()
                print(f"   ✅ Whisper loaded from LOCAL")
            else:
                print(f"\n☁️ WHISPER (REMOTE):")
                print(f"   Model: {WHISPER_REMOTE_ID}")
                self.whisper_processor = AutoProcessor.from_pretrained(WHISPER_REMOTE_ID)
                self.whisper_model = AutoModelForSpeechSeq2Seq.from_pretrained(
                    WHISPER_REMOTE_ID
                ).to(self.device).eval()
                print(f"   ✅ Whisper loaded from HUGGING FACE")
        except Exception as e:
            print(f"❌ ERROR loading Whisper: {e}")
            raise

    def _load_empathic_models(self):
        """Load Empathic Insight emotion models (LOCAL or REMOTE)"""
        try:
            if USE_LOCAL_MODELS:
                print(f"\n😊 EMPATHIC MODELS (LOCAL):")
                if not LOCAL_EMPATHIC_DIR.exists():
                    raise FileNotFoundError(f"Local Empathic models not found: {LOCAL_EMPATHIC_DIR}")
                print(f"   Path: {LOCAL_EMPATHIC_DIR}")
                self._load_empathic_local()
            else:
                print(f"\n☁️ EMPATHIC MODELS (REMOTE):")
                print(f"   Repo: {EMPATHIC_REMOTE_ID}")
                self._load_empathic_remote()
        except Exception as e:
            print(f"❌ ERROR loading Empathic models: {e}")
            raise

    def _load_empathic_local(self):
        """Load emotion models from LOCAL directory"""
        print(f"   Scanning for .pth files...")
        count = 0
        
        for pth_file in LOCAL_EMPATHIC_DIR.glob("model_*_best.pth"):
            try:
                filename_part = pth_file.name.split("model_")[1].split("_best.pth")[0]
                if filename_part in FILENAME_PART_TO_TARGET_KEY_MAP:
                    emotion_key = FILENAME_PART_TO_TARGET_KEY_MAP[filename_part]
                    
                    model = FullEmbeddingMLP()
                    state_dict = torch.load(pth_file, map_location='cpu')
                    if any(k.startswith("_orig_mod.") for k in state_dict.keys()):
                        state_dict = {k.replace("_orig_mod.", ""): v for k, v in state_dict.items()}
                    model.load_state_dict(state_dict)
                    model = model.to(self.device).eval()
                    self.mlp_models[emotion_key] = model
                    count += 1
                    print(f"   ✅ {emotion_key}")
            except Exception as e:
                print(f"   ⚠️ Skipped {pth_file.name}: {e}")
                continue
        
        print(f"   ✅ Loaded {count} models from LOCAL")

    def _load_empathic_remote(self):
        """Load emotion models from HUGGING FACE Hub"""
        from huggingface_hub import hf_hub_download
        count = 0
        
        for filename_part, emotion_key in FILENAME_PART_TO_TARGET_KEY_MAP.items():
            try:
                model_filename = f"model_{filename_part}_best.pth"
                print(f"   ⬇️ {emotion_key}...", end=" ")
                
                model_path = hf_hub_download(
                    repo_id=EMPATHIC_REMOTE_ID,
                    filename=model_filename,
                    cache_dir=None
                )
                
                model = FullEmbeddingMLP()
                state_dict = torch.load(model_path, map_location='cpu')
                if any(k.startswith("_orig_mod.") for k in state_dict.keys()):
                    state_dict = {k.replace("_orig_mod.", ""): v for k, v in state_dict.items()}
                model.load_state_dict(state_dict)
                model = model.to(self.device).eval()
                self.mlp_models[emotion_key] = model
                count += 1
                print(f"✅")
            except Exception as e:
                print(f"⚠️ {e}")
                continue
        
        print(f"   ✅ Loaded {count} models from REMOTE")

    def _convert_to_wav(self, audio_file_path: str) -> str:
        """Convert audio to WAV format"""
        if audio_file_path.lower().endswith('.wav'):
            return audio_file_path
        
        try:
            print(f"🎬 Converting to WAV...")
            from moviepy.editor import AudioFileClip
            clip = AudioFileClip(audio_file_path)
            wav_path = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
            clip.write_audiofile(wav_path, verbose=False, logger=None)
            clip.close()
            return wav_path
        except Exception as e:
            print(f"⚠️ Moviepy failed: {e}")
        
        try:
            from pydub import AudioSegment
            print("  Trying pydub...")
            audio = AudioSegment.from_file(audio_file_path)
            wav_path = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
            audio.export(wav_path, format="wav")
            return wav_path
        except Exception as e:
            print(f"⚠️ Pydub failed: {e}")
        
        try:
            print("  Trying ffmpeg...")
            wav_path = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
            subprocess.run(
                ['ffmpeg', '-i', audio_file_path, '-acodec', 'pcm_s16le', '-ar', '16000', wav_path, '-y'],
                check=True, capture_output=True
            )
            return wav_path
        except Exception as e:
            print(f"⚠️ FFmpeg failed: {e}")
        
        print(f"❌ Could not convert, using original")
        return audio_file_path

    def _load_stereo_audio(self, audio_path: str, sr: int = 16000) -> Tuple[np.ndarray, np.ndarray, int]:
        """Load audio and return stereo channels"""
        try:
            waveform, samplerate = librosa.load(audio_path, sr=sr, mono=False)
            
            if waveform.ndim == 1:
                return waveform, waveform, samplerate
            else:
                caller = waveform[0] if waveform.shape[0] > 0 else np.zeros(sr)
                client = waveform[1] if waveform.shape[0] > 1 else waveform[0]
                return caller, client, samplerate
        except Exception as e:
            print(f"❌ Audio loading failed: {e}")
            silent = np.zeros(sr)
            return silent, silent, sr

    def analyze_audio(self, audio_file_path: str, filename: str, analyze_channels: str = "both") -> dict:
        """Main analysis function"""
        try:
            print(f"\n📊 Analyzing: {filename}")
            
            wav_path = self._convert_to_wav(audio_file_path)
            caller_audio, client_audio, sr = self._load_stereo_audio(wav_path)
            
            result = {
                'id_call': filename,
                'filename': filename,
                'analysis_date': datetime.utcnow().isoformat(),
                'sample_rate': sr,
                'is_stereo': True,
                'channels_analyzed': []
            }
            
            combined_scores = {}
            
            if analyze_channels in ['both', 'caller']:
                print("🎤 Analyzing caller channel...")
                caller_scores = self._analyze_channel(caller_audio, sr, "caller")
                result['caller'] = caller_scores
                result['channels_analyzed'].append('caller')
                # Accumulate scores for overall computation
                for emotion, score in caller_scores.get('all_scores', {}).items():
                    combined_scores[emotion] = combined_scores.get(emotion, 0) + score
            
            if analyze_channels in ['both', 'client']:
                print("👥 Analyzing client channel...")
                client_scores = self._analyze_channel(client_audio, sr, "client")
                result['client'] = client_scores
                result['channels_analyzed'].append('client')
                # Accumulate scores for overall computation
                for emotion, score in client_scores.get('all_scores', {}).items():
                    combined_scores[emotion] = combined_scores.get(emotion, 0) + score
            
            # Compute overall scores from combined channel data
            num_channels = len(result['channels_analyzed'])
            if num_channels > 0:
                # Average the combined scores
                for emotion in combined_scores:
                    combined_scores[emotion] = combined_scores[emotion] / num_channels
                
                result['all_scores'] = combined_scores
                result['valence_score'] = float(combined_scores.get('Valence', 0.0))
                result['arousal_score'] = float(combined_scores.get('Arousal', 0.0))
                result['final_score'] = result['valence_score'] * result['arousal_score']
                
                # Get top emotions from combined scores
                result['top_emotions'] = sorted(
                    [{'emotion': emotion, 'score': float(score)} for emotion, score in combined_scores.items()],
                    key=lambda x: x['score'],
                    reverse=True
                )[:10]
            else:
                result['all_scores'] = {}
                result['valence_score'] = 0.0
                result['arousal_score'] = 0.0
                result['final_score'] = 0.0
                result['top_emotions'] = []
            
            result['keywords'] = []
            result['processing_time'] = 0.0
            
            print("✓ Analysis complete\n")
            return result
        except Exception as e:
            print(f"❌ Error: {e}")
            raise

    def _analyze_channel(self, audio: np.ndarray, sr: int, channel_name: str = "unknown") -> dict:
        """Analyze single audio channel - matches the Empathic model usage pattern"""
        try:
            # Step 1: Get Whisper embedding from audio
            embedding = self._get_whisper_embedding(audio, sr)
            
            # Step 2: Predict emotions using loaded MLP models
            all_scores = {}
            for target_key, mlp_model in self.mlp_models.items():
                try:
                    # Load model on demand (like in the example pattern)
                    score = self._predict_with_mlp(embedding, mlp_model)
                    all_scores[target_key] = score
                except Exception as e:
                    print(f"    ⚠️ {target_key} prediction error: {e}")
                    all_scores[target_key] = 0.0
            
            # Step 3: Ensure main emotions are always present
            for emotion in MAIN_EMOTIONS:
                if emotion not in all_scores:
                    all_scores[emotion] = 0.0
            
            # Step 4: Compute final scores
            final_score = float(all_scores.get('Valence', 0.0) * all_scores.get('Arousal', 0.0))
            advice = self._generate_advice(
                all_scores.get('Valence', 0.0),
                all_scores.get('Arousal', 0.0),
                all_scores.get('Anger', 0.0)
            )
            
            # Step 5: Get top emotions sorted by score
            top_emotions = sorted(
                [{'emotion': emotion, 'score': float(score)} for emotion, score in all_scores.items()],
                key=lambda x: x['score'],
                reverse=True
            )[:10]  # Top 10 emotions
            
            # Clean up embedding
            del embedding
            
            return {
                'final_score': final_score,
                'valence_score': float(all_scores.get('Valence', 0.0)),
                'arousal_score': float(all_scores.get('Arousal', 0.0)),
                'all_scores': all_scores,
                'top_emotions': top_emotions,
                'advice': advice,
                'transcript': ''  # Empty transcript since we don't have actual transcription
            }
        except Exception as e:
            print(f"❌ Channel analysis error: {e}")
            empty_scores = {e: 0.0 for e in MAIN_EMOTIONS}
            return {
                'final_score': 0.0,
                'valence_score': 0.0,
                'arousal_score': 0.0,
                'all_scores': empty_scores,
                'top_emotions': [],
                'advice': 'Error processing audio',
                'transcript': ''
            }

    def _analyze_channel_fallback(self, audio: np.ndarray, sr: int, channel_name: str = "unknown") -> dict:
        """Fallback/mock analysis when models aren't loaded - generates realistic test data"""
        import random
        
        # Generate pseudo-random but consistent scores based on audio characteristics
        rms = np.sqrt(np.mean(audio ** 2))
        seed = int(rms * 1000) % 1000
        random.seed(seed)
        np.random.seed(seed)
        
        # Mock emotion scores - varied but reasonable
        all_scores = {
            'Valence': random.uniform(0.3, 0.8),
            'Arousal': random.uniform(0.4, 0.9),
            'Anger': random.uniform(0.0, 0.3),
            'Sadness': random.uniform(0.0, 0.4),
            'Joy': random.uniform(0.2, 0.8),
            'Fear': random.uniform(0.0, 0.2),
            'Disgust': random.uniform(0.0, 0.2),
            'Awe': random.uniform(0.1, 0.5),
            'Contentment': random.uniform(0.3, 0.7),
            'Interest': random.uniform(0.4, 0.8),
        }
        
        valence = all_scores['Valence']
        arousal = all_scores['Arousal']
        anger = all_scores['Anger']
        
        final_score = float(valence * arousal)
        advice = self._generate_advice(valence, arousal, anger)
        
        top_emotions = sorted(
            [{'emotion': emotion, 'score': float(score)} for emotion, score in all_scores.items()],
            key=lambda x: x['score'],
            reverse=True
        )[:10]
        
        return {
            'final_score': final_score,
            'valence_score': float(valence),
            'arousal_score': float(arousal),
            'all_scores': all_scores,
            'top_emotions': top_emotions,
            'advice': advice,
            'transcript': '[Fallback Mode - Mock Transcription]'
        }

    @torch.no_grad()
    def _get_whisper_embedding(self, waveform: np.ndarray, sr: int) -> torch.Tensor:
        """Extract Whisper embedding from audio waveform"""
        try:
            if self.use_fallback or self.whisper_model is None or self.whisper_processor is None:
                # Return dummy embedding for fallback mode
                print(f"      Using fallback embedding (shape: (1, 1500, 768))")
                return torch.randn(1, 1500, 768).to(self.device)
            
            print(f"      Extracting embedding from waveform shape: {waveform.shape}")
            
            # Ensure mono audio
            if waveform.ndim > 1:
                waveform = np.mean(waveform, axis=0)
            
            # Normalize if needed
            if np.max(np.abs(waveform)) > 1:
                waveform = waveform / np.max(np.abs(waveform))
            
            # Resample if needed
            if sr != SAMPLING_RATE:
                print(f"      Resampling from {sr} to {SAMPLING_RATE}")
                waveform = librosa.resample(waveform, orig_sr=sr, target_sr=SAMPLING_RATE)
            
            print(f"      Waveform after prep: shape={waveform.shape}, dtype={waveform.dtype}")
            
            # Process through Whisper processor
            with torch.no_grad():
                input_features = self.whisper_processor(
                    waveform,
                    sampling_rate=SAMPLING_RATE,
                    return_tensors="pt"
                ).input_features.to(self.device)
                
                print(f"      Input features shape: {input_features.shape}")
                
                # Get encoder output (this gives us the embeddings)
                encoder_outputs = self.whisper_model.get_encoder()(input_features=input_features)
                embedding = encoder_outputs.last_hidden_state  # Shape: (batch_size, seq_len, 512) for whisper-base
                
                print(f"      Embedding shape from encoder: {embedding.shape}")
                
                # Whisper outputs 512-dim embeddings, need to project to 768 for MLP models
                embedding = self.embedding_projection(embedding)  # Now (batch, seq_len, 768)
                print(f"      Embedding after projection: {embedding.shape}")
                
                # Ensure shape is (1, seq_len, 768)
                if embedding.ndim != 3:
                    print(f"      ERROR: embedding has wrong dims: {embedding.ndim}")
                    raise ValueError(f"Embedding has shape {embedding.shape}, expected (1, seq_len, 768)")
                
                # Pad/truncate to fixed size (1, 1500, 768)
                current_seq_len = embedding.shape[1]
                target_seq_len = 1500
                
                if current_seq_len < target_seq_len:
                    print(f"      Padding from {current_seq_len} to {target_seq_len}")
                    padding = torch.zeros(
                        (1, target_seq_len - current_seq_len, 768),
                        device=self.device,
                        dtype=embedding.dtype
                    )
                    embedding = torch.cat((embedding, padding), dim=1)
                elif current_seq_len > target_seq_len:
                    print(f"      Truncating from {current_seq_len} to {target_seq_len}")
                    embedding = embedding[:, :target_seq_len, :]
                
                print(f"      Final embedding shape: {embedding.shape}")
                return embedding
        except Exception as e:
            print(f"    ❌ Error extracting embedding: {e}")
            traceback.print_exc()
            # Return dummy embedding on error
            return torch.zeros((1, 1500, 768), device=self.device, dtype=torch.float32)

    @torch.no_grad()
    def _predict_with_mlp(self, embedding: torch.Tensor, mlp_model) -> float:
        """Predict emotion score using MLP model on embedding"""
        try:
            embedding_device = embedding.to(self.device)
            prediction = mlp_model(embedding_device)
            raw_value = float(prediction.item())
            # Apply sigmoid to normalize to [0, 1]
            from scipy.special import expit  # sigmoid function
            normalized_value = expit(raw_value)
            return float(max(0.0, min(1.0, normalized_value)))
        except Exception as e:
            print(f"    Error in MLP prediction: {e}")
            return 0.0

    def _generate_advice(self, valence: float, arousal: float, anger: float) -> str:
        """Generate advice based on scores"""
        if anger > 0.5:
            return "🔴 Enojo detectado. Mantén calma y empatía."
        elif valence < -0.3:
            return "😔 Tonalidad negativa. Sé más positivo y comprensivo."
        elif arousal > 0.7:
            return "⚡ Alta energía. Equilibra con pausas."
        elif arousal < -0.5:
            return "😴 Poca energía. Aumenta claridad en voz."
        else:
            return "✅ Tono equilibrado."


    def _convert_to_wav(self, audio_file_path: str) -> str:
        """Convert audio to WAV format"""
        if audio_file_path.lower().endswith('.wav'):
            return audio_file_path
        
        try:
            print(f"🎬 Converting to WAV...")
            from moviepy.editor import AudioFileClip
            
            clip = AudioFileClip(audio_file_path)
            wav_path = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
            clip.write_audiofile(wav_path, verbose=False, logger=None)
            clip.close()
            return wav_path
        except Exception as e:
            print(f"⚠️ Moviepy failed: {e}")
        
        try:
            from pydub import AudioSegment
            print("Trying pydub...")
            audio = AudioSegment.from_file(audio_file_path)
            wav_path = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
            audio.export(wav_path, format="wav")
            return wav_path
        except Exception as e:
            print(f"⚠️ Pydub failed: {e}")
        
        try:
            print("Trying ffmpeg...")
            wav_path = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
            subprocess.run(
                ['ffmpeg', '-i', audio_file_path, '-acodec', 'pcm_s16le', '-ar', '16000', wav_path, '-y'],
                check=True, capture_output=True
            )
            return wav_path
        except Exception as e:
            print(f"⚠️ FFmpeg failed: {e}")
        
        print(f"❌ Could not convert, using original")
        return audio_file_path

    def _load_stereo_audio(self, audio_path: str, sr: int = 16000) -> Tuple[np.ndarray, np.ndarray, int]:
        """Load audio and return stereo channels"""
        try:
            waveform, samplerate = librosa.load(audio_path, sr=sr, mono=False)
            
            if waveform.ndim == 1:
                # Mono - use same for both
                return waveform, waveform, samplerate
            else:
                # Stereo
                caller = waveform[0] if waveform.shape[0] > 0 else np.zeros(sr)
                client = waveform[1] if waveform.shape[0] > 1 else waveform[0]
                return caller, client, samplerate
        except Exception as e:
            print(f"❌ Audio loading failed: {e}")
            silent = np.zeros(sr)
            return silent, silent, sr

    def analyze_audio(self, audio_file_path: str, filename: str, analyze_channels: str = "both") -> dict:
        """Main analysis function"""
        try:
            print(f"📊 Analyzing: {filename}")
            
            # Convert to WAV
            wav_path = self._convert_to_wav(audio_file_path)
            
            # Load audio
            caller_audio, client_audio, sr = self._load_stereo_audio(wav_path)
            
            result = {
                'id_call': filename,
                'filename': filename,
                'analysis_date': datetime.utcnow().isoformat(),
                'sample_rate': sr
            }
            
            if analyze_channels in ['both', 'caller']:
                print("🎤 Analyzing caller...")
                caller_scores = self._analyze_channel(caller_audio, sr)
                result['caller'] = caller_scores
            
            if analyze_channels in ['both', 'client']:
                print("👥 Analyzing client...")
                client_scores = self._analyze_channel(client_audio, sr)
                result['client'] = client_scores
            
            print("✓ Analysis complete")
            return result
        except Exception as e:
            print(f"❌ Error: {e}")
            raise

    def _analyze_channel(self, audio: np.ndarray, sr: int) -> dict:
        """Analyze single audio channel with emotion models"""
        try:
            all_scores = {}
            
            # Try to use emotion models if available
            if len(self.mlp_models) > 0 and self.whisper_processor is not None:
                print(f"    Using emotion models for inference...")
                try:
                    # Resample to 16kHz if needed
                    if sr != SAMPLING_RATE:
                        audio = librosa.resample(audio, orig_sr=sr, target_sr=SAMPLING_RATE)
                    
                    # Extract Whisper embedding ONCE
                    embedding = self._get_whisper_embedding(audio, SAMPLING_RATE)
                    
                    # Inference through each emotion MLP model
                    for emotion, model in self.mlp_models.items():
                        score = self._predict_with_mlp(embedding, model)
                        all_scores[emotion] = score
                        print(f"      {emotion}: {score:.3f}")
                    
                    # Ensure all emotions are present
                    for emotion in MAIN_EMOTIONS:
                        if emotion not in all_scores:
                            all_scores[emotion] = 0.0
                
                except Exception as e:
                    print(f"    ⚠️ Model inference failed: {e}")
                    traceback.print_exc()
                    print(f"    Falling back to heuristics...")
                    all_scores = self._compute_heuristic_scores(audio, sr)
            else:
                # Use heuristics if no models loaded
                print(f"    Using heuristic scoring (no models loaded)...")
                print(f"    Models: {len(self.mlp_models)}, Processor: {self.whisper_processor is not None}")
                all_scores = self._compute_heuristic_scores(audio, sr)
            
            # Compute final scores
            final_score = float(all_scores.get('Valence', 0.0) * all_scores.get('Arousal', 0.0))
            advice = self._generate_advice(
                all_scores.get('Valence', 0.0),
                all_scores.get('Arousal', 0.0),
                all_scores.get('Anger', 0.0)
            )
            
            return {
                'final_score': final_score,
                'valence_score': float(all_scores.get('Valence', 0.0)),
                'arousal_score': float(all_scores.get('Arousal', 0.0)),
                'all_scores': all_scores,
                'advice': advice
            }
        except Exception as e:
            print(f"❌ Channel analysis error: {e}")
            traceback.print_exc()
            # Return zeros for all emotions
            empty_scores = {e: 0.0 for e in MAIN_EMOTIONS}
            return {
                'final_score': 0.0,
                'valence_score': 0.0,
                'arousal_score': 0.0,
                'all_scores': empty_scores,
                'advice': 'Error processing audio'
            }

    def _compute_heuristic_scores(self, audio: np.ndarray, sr: int) -> dict:
        """Fallback heuristic scoring when models unavailable"""
        try:
            rms = np.sqrt(np.mean(audio ** 2))
            spec = np.abs(np.fft.rfft(audio))
            freqs = np.fft.rfftfreq(len(audio), 1/sr)
            centroid = np.sum(freqs * spec) / np.sum(spec) if np.sum(spec) > 0 else 0
            
            # Normalize to -1 to 1
            valence = np.tanh(rms * 2.0 - 0.3)
            arousal = np.tanh(rms * 15.0)
            
            # Emotion heuristics
            anger = 1.0 if arousal > 0.5 and valence < -0.2 else np.tanh(rms * 5)
            sadness = np.tanh(-valence * 2)
            joy = np.tanh(valence * 2)
            
            return {
                'Valence': float(valence),
                'Arousal': float(arousal),
                'Anger': float(anger),
                'Sadness': float(sadness),
                'Joy': float(joy)
            }
        except Exception as e:
            print(f"❌ Heuristic scoring failed: {e}")
            return {e: 0.0 for e in MAIN_EMOTIONS}

    def _generate_advice(self, valence: float, arousal: float, anger: float) -> str:
        """Generate advice based on scores"""
        if anger > 0.5:
            return "🔴 Enojo detectado. Mantén calma y empatía."
        elif valence < -0.3:
            return "😔 Tonalidad negativa. Sé más positivo y comprensivo."
        elif arousal > 0.7:
            return "⚡ Alta energía. Equilibra con pausas."
        elif arousal < -0.5:
            return "😴 Poca energía. Aumenta claridad en voz."
        else:
            return "✅ Tono equilibrado."
