from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
import os
from dotenv import load_dotenv
import traceback

# Try to import real analyzer, fallback to mock
try:
    from .services.sentiment_analyzer import SentimentAnalyzer
    USE_MOCK_ANALYZER = False
except ImportError as e:
    print(f"⚠️ Could not import real SentimentAnalyzer: {e}")
    print("📦 Using mock analyzer instead")
    from .services.sentiment_analyzer_mock import SentimentAnalyzer
    USE_MOCK_ANALYZER = True

# Try to import real database service, fallback to mock
try:
    from .services.database_service import DatabaseService
    # Test connection
    _test_db = DatabaseService()
    _test_db.get_connection()
    USE_MOCK_DB = False
except Exception as e:
    print(f"⚠️ Could not connect to PostgreSQL: {e}")
    print("📦 Using in-memory database instead")
    from .services.database_service_mock import DatabaseService
    USE_MOCK_DB = True
from typing import Optional
import uuid
from datetime import datetime

# Optional: try to import torch/numpy but don't fail if not available
try:
    import torch
    import numpy as np
except ImportError:
    torch = None
    np = None

load_dotenv()

sentiment_analyzer = None
db_service = DatabaseService()
db_service.create_tables()

# Simple in-memory user store for dev/testing (replace with real auth in prod)
user_store = {}


app = FastAPI(
    title="Sentiment Analysis API",
    description="API para Análisis de sentimientos de audio multichannel",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://127.0.0.1:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    print("Iniciando API...")
    try:
        db_service.create_tables()
        print("Base de datos lista")
    except Exception as e:
        print(f"Error en startup: {e}")
    # Try to initialize heavy sentiment analyzer but don't fail startup if dependencies missing
    global sentiment_analyzer
    try:
        if sentiment_analyzer is None:
            print("Inicializando SentimentAnalyzer (puede tardar)...")
            sentiment_analyzer = SentimentAnalyzer()
            print("SentimentAnalyzer inicializado")
    except Exception as e:
        print(f"Warning: no se pudo inicializar SentimentAnalyzer en startup: {e}")

@app.get("/")
async def root():
    return {"message": "Multichannel Sentiment Analysis API", "status": "running"}

@app.get("/health")
async def health():
    try:
        stats = db_service.get_statistics()
        return {
            "status": "healthy",
            "database": "connected",
            "records": stats.get('total_records', 0),
            "multichannel": True
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@app.get("/api/auth/register")
async def auth_register(request: Request):
    """Register a user via query params: email, contraseña, nombre, rol
    This is a minimal in-memory implementation to satisfy the frontend during development.
    """
    qp = request.query_params
    email = qp.get("email")
    # support multiple spellings for the password field
    password = qp.get("contraseña") or qp.get("contrasena") or qp.get("password")
    nombre = qp.get("nombre") or qp.get("name") or ""
    rol = qp.get("rol") or "agent"

    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")

    if email in user_store:
        return JSONResponse(status_code=400, content={"success": False, "detail": "User already exists"})

    token = uuid.uuid4().hex
    user = {"email": email, "nombre": nombre, "rol": rol, "password": password, "token": token, "departamento": ""}
    user_store[email] = user

    return JSONResponse(content={"success": True, "user": {"email": email, "nombre": nombre, "rol": rol, "token": token, "departamento": ""}})


@app.get("/api/auth/login")
async def auth_login(request: Request):
    """Login via query params: email and contraseña. Returns user info and token on success."""
    qp = request.query_params
    email = qp.get("email")
    password = qp.get("contraseña") or qp.get("contrasena") or qp.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")

    user = user_store.get(email)
    if not user:
        return JSONResponse(status_code=404, content={"success": False, "detail": "User not found"})

    if user.get("password") != password:
        return JSONResponse(status_code=401, content={"success": False, "detail": "Invalid credentials"})

    # return user public info and token
    return JSONResponse(content={"success": True, "user": {"email": user["email"], "nombre": user.get("nombre"), "rol": user.get("rol"), "token": user.get("token"), "departamento": user.get("departamento", "")}})

@app.post("/api/feeling-analytics/analyze")
async def analyze_audio(
    request: Request,
    audio: UploadFile = File(...),
    analyze_channels: str = Form("both"),
    agent_email: Optional[str] = Form(None),
    agent_name: Optional[str] = Form(None)
):
    # Clean up empty strings and None from FormData
    if agent_email == "" or agent_email == "None":
        agent_email = None
    if agent_name == "" or agent_name == "None":
        agent_name = None
    
    # DEBUG: Print EVERYTHING we received including raw request
    log_msg = f"\n{'='*70}\n📩 /api/feeling-analytics/analyze RECIBIDO:\n{'='*70}\n   audio.filename: {audio.filename}\n   analyze_channels: {analyze_channels}\n   agent_email (tipo: {type(agent_email).__name__}, valor): {repr(agent_email)}\n   agent_name (tipo: {type(agent_name).__name__}, valor): {repr(agent_name)}\n   request headers: {dict(request.headers).get('content-type', 'NO CONTENT-TYPE')}\n{'='*70}\n"
    print(log_msg)
    
    # Also log to file for debugging
    try:
        with open("analyze_debug.log", "a") as f:
            f.write(log_msg)
    except:
        pass
    
    if not audio.filename:
        raise HTTPException(status_code=400, detail="Filename required")
    
    allowed_formats = ['.mp3', '.wav', '.m4a', '.ogg', '.flac']
    file_ext = os.path.splitext(audio.filename)[1].lower()
    if file_ext not in allowed_formats:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {file_ext}")
    
    content = await audio.read()
    if len(content) > 100 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")
    
    temp_file = None
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as f:
            f.write(content)
            temp_file = f.name
        
        print(f"📊 Analizando: {audio.filename} (canales: {analyze_channels}, agente: {agent_name or agent_email})")
        result = sentiment_analyzer.analyze_audio(temp_file, audio.filename, analyze_channels)
        
        # Attach agent info to result - use values if not provided
        result['agent_email'] = agent_email or 'no-agent'
        result['agent_name'] = agent_name or 'no-agent'
        
        save_msg = f"✅ Guardando con agent_name='{result.get('agent_name')}', agent_email='{result.get('agent_email')}'\n"
        print(save_msg)
        with open("analyze_debug.log", "a") as f:
            f.write(save_msg)
        
        saved = db_service.save_result(result)
        result['saved'] = saved
        
        return JSONResponse(content=result)
        
    except Exception as e:
        error_msg = f"❌ Error en /analyze: {str(e)}\n{traceback.format_exc()}\n"
        print(error_msg)
        with open("analyze_debug.log", "a") as f:
            f.write(error_msg)
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if temp_file and os.path.exists(temp_file):
            os.unlink(temp_file)


@app.post("/api/feeling-analytics/live/analyze-chunk")
async def analyze_chunk(
    audio: UploadFile = File(...),
    channel: str = "caller",
    request: Request = None
):
    """Chunk analysis for realtime UI using actual emotion models.
    Returns real sentiment scores, valence/arousal, advice and transcript.
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="Filename required")

    content = await audio.read()
    user_agent = request.headers.get("user-agent", "UNKNOWN") if request else "UNKNOWN"
    origin = request.headers.get("origin", "UNKNOWN") if request else "UNKNOWN"
    print(f"📊 Chunk recibido: {len(content)} bytes, canal: {channel}")
    print(f"   → User-Agent: {user_agent[:50]}")
    print(f"   → Origin: {origin}")
    
    # Más tolerante con archivos pequeños - WAV headers son ~44 bytes
    if len(content) < 200:
        print(f"  ⚠️ Archivo demasiado pequeño ({len(content)} bytes)")
        return JSONResponse(content={
            "channel": channel,
            "final_score": 0.0,
            "valence_score": 0.0,
            "arousal_score": 0.0,
            "advice": "Segmento muy corto. Continúa hablando para análisis más precisos.",
            "transcript": "",
            "alerts": {"profanity": [], "anger": False},
            "alert_count": 0
        })

    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Chunk too large")

    temp_file = None
    try:
        # Save to temp file
        file_ext = os.path.splitext(audio.filename)[1].lower() or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as f:
            f.write(content)
            temp_file = f.name

        print(f"  📁 Guardado en: {temp_file}")

        # Try to load audio with librosa
        import librosa
        
        waveform = None
        samplerate = 16000
        
        try:
            waveform, samplerate = librosa.load(temp_file, sr=16000, mono=True)
            print(f"  ✓ Librosa OK: {len(waveform)} samples @ {samplerate}Hz")
        except Exception as e:
            print(f"  ⚠️ Librosa failed: {e}, trying scipy...")
            try:
                from scipy import signal, io as scipy_io
                sr_info, waveform = scipy_io.wavfile.read(temp_file)
                if sr_info != 16000:
                    waveform = signal.resample(waveform, int(len(waveform) * 16000 / sr_info))
                samplerate = 16000
                waveform = waveform.astype(float) / 32768.0
                print(f"  ✓ Scipy OK: {len(waveform)} samples")
            except Exception as e2:
                print(f"  ✗ Scipy also failed: {e2}")
                return JSONResponse(content={
                    "channel": channel,
                    "final_score": 0.0,
                    "valence_score": 0.0,
                    "arousal_score": 0.0,
                    "advice": "No se pudo procesar el audio.",
                    "transcript": "",
                    "alerts": {"profanity": [], "anger": False},
                    "alert_count": 0
                })

        # Transcription
        transcript = ""
        try:
            if len(waveform) >= 16000 and sentiment_analyzer.initialized:
                # Check if audio is mostly silent - more aggressive detection
                rms_energy = np.sqrt(np.mean(waveform ** 2))
                peak_amplitude = np.max(np.abs(waveform))
                print(f"  🔊 RMS Energy: {rms_energy:.6f}, Peak: {peak_amplitude:.6f}")
                
                # If RMS < 0.01 OR peak < 0.05, consider it silence (Whisper needs stronger signal)
                if rms_energy < 0.01 or peak_amplitude < 0.05:
                    print(f"  ⚠️ Audio is too quiet (RMS={rms_energy:.6f}, Peak={peak_amplitude:.6f}), skipping transcription")
                    transcript = "[Silence]"
                else:
                    proc = sentiment_analyzer.whisper_processor
                    model = sentiment_analyzer.whisper_model
                    if proc is not None and model is not None:
                        with torch.no_grad():
                            input_features = proc(waveform, sampling_rate=16000, return_tensors="pt").input_features.to(sentiment_analyzer.device)
                            generated_ids = model.generate(
                                input_features,
                                language="en",
                                task="transcribe",
                                max_new_tokens=30,  # Shorter to avoid hallucinations
                                temperature=0.0,    # Greedy decoding - more conservative
                                no_repeat_ngram_size=3  # Prevent any repetitions
                            )
                            transcript = proc.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
                            # If transcript is just repetitions or too short, mark it as uncertain
                            if not transcript or len(transcript) < 2:
                                print(f"  ⚠️ Transcription too short or empty: '{transcript}'")
                                transcript = "[Silence]"
                            elif len(set(transcript.split())) == 1:
                                print(f"  ⚠️ Transcription is repetitive: '{transcript}'")
                                transcript = "[Silence]"
                            else:
                                print(f"  📝 Transcripción: {transcript[:50] if transcript else '(vacía)'}")
        except Exception as e:
            print(f"  ⚠️ Transcription error: {e}")
            transcript = ""

        # Use actual sentiment analyzer for emotion scores
        final_score = 0.0
        valence = 0.0
        arousal = 0.0
        all_scores = {}
        
        try:
            if len(waveform) >= 16000 and sentiment_analyzer.initialized:
                # Get Whisper embedding
                embedding = sentiment_analyzer._get_whisper_embedding(waveform, 16000)
                if embedding is not None:
                    # Get emotion scores using the MLP models
                    with torch.no_grad():
                        for emotion_name, mlp_model in sentiment_analyzer.mlp_models.items():
                            if mlp_model is not None:  # Skip None models in fallback
                                embedding_flat = embedding.flatten()
                                raw_score = mlp_model(embedding_flat.unsqueeze(0)).squeeze().item()
                                # Apply sigmoid to normalize to [0, 1]
                                normalized_score = 1.0 / (1.0 + np.exp(-raw_score))
                                all_scores[emotion_name] = float(max(0.0, min(1.0, normalized_score)))
                    
                    # Extract valence and arousal
                    valence = all_scores.get('Valence', 0.0)
                    arousal = all_scores.get('Arousal', 0.0)
                    final_score = float((valence + arousal) / 2.0)
                    print(f"  ✓ Emotion scores: valence={valence:.3f}, arousal={arousal:.3f}")
                else:
                    print(f"  ⚠️ Embedding es None")
            else:
                print(f"  ⚠️ No se puede analizar: len={len(waveform) if waveform is not None else 'None'}, initialized={sentiment_analyzer.initialized}")
        except Exception as e:
            print(f"  ✗ Emotion analysis error: {e}")
            traceback.print_exc()

        # Advice based on scores
        advice = ""
        if final_score <= 0.2:
            advice = "Nivel bajo: intenta proyectar más claridad."
        elif final_score >= 0.6:
            advice = "Buena energía: mantén este engagement."
        else:
            advice = "Nivel normal: sigue con naturalidad."

        # Alert detection
        profanity_list = ['puta', 'mierda', 'joder', 'cabron', 'imbecil', 'idiota', 'gilipollas', 'coño']
        found_profanity = []
        anger_flag = False
        try:
            txt = (transcript or '').lower()
            for w in profanity_list:
                if w in txt:
                    found_profanity.append(w)
            if '!' in (transcript or '') or any(x in txt for x in ['enoj', 'furioso', 'rabia', 'asco', 'odio']):
                anger_flag = True
            if all_scores.get('Anger', 0.0) > 0.25:
                anger_flag = True
        except Exception:
            pass

        alerts = {
            'profanity': found_profanity,
            'anger': anger_flag
        }

        result = {
            "channel": channel,
            "final_score": final_score,
            "valence_score": valence,
            "arousal_score": arousal,
            "advice": advice,
            "transcript": transcript,
            "alerts": alerts,
            "alert_count": len(found_profanity) + (1 if anger_flag else 0),
            "all_scores": all_scores
        }
        
        print(f"  → Retornando: {result}")
        return JSONResponse(content=result)

    except Exception as e:
        print(f"✗ Error in analyze_chunk: {e}")
        traceback.print_exc()
        return JSONResponse(status_code=200, content={
            "channel": channel,
            "final_score": 0.0,
            "valence_score": 0.0,
            "arousal_score": 0.0,
            "advice": "Error procesando. Continúa hablando.",
            "transcript": "",
            "alerts": {"profanity": [], "anger": False},
            "alert_count": 0
        })
    finally:
        if temp_file and os.path.exists(temp_file):
            try:
                os.unlink(temp_file)
            except:
                pass


@app.post("/api/feeling-analytics/live/end-call")
async def end_call(
    audio: UploadFile = File(...),
    agent_id: Optional[str] = None,
    agent_email: Optional[str] = None,
    agent_name: Optional[str] = None,
    analyze_channels: str = "both",
    save: bool = True
):
    """Finalize a live call: run full analysis on the recorded audio and save result with agent metadata.
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="Filename required")

    content = await audio.read()
    file_ext = os.path.splitext(audio.filename)[1].lower() or ".wav"
    temp_file = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as f:
            f.write(content)
            temp_file = f.name

        # Build a filename that embeds agent id (fallback) but also record agent_email separately
        call_id = uuid.uuid4().hex
        timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H-%M-%S")
        dni_part = agent_id if agent_id else (agent_email or "UNKNOWN")
        filename = f"{dni_part}_{timestamp}_{call_id}{file_ext}"

        # Run full analysis (this is the heavier path)
        result = sentiment_analyzer.analyze_audio(temp_file, filename, analyze_channels)

        # Attempt full transcription for record (may be slow)
        full_transcript = ""
        try:
            if sentiment_analyzer.whisper_processor and sentiment_analyzer.whisper_model:
                import librosa
                waveform, sr = librosa.load(temp_file, sr=16000, mono=True)
                if len(waveform) > 1600:
                    with torch.no_grad():
                        input_features = sentiment_analyzer.whisper_processor(waveform, sampling_rate=16000, return_tensors="pt").input_features.to(sentiment_analyzer.device)
                        generated_ids = sentiment_analyzer.whisper_model.generate(input_features)
                        full_transcript = sentiment_analyzer.whisper_processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        except Exception as e:
            print(f"Full transcription failed: {e}")

        # Alerts detection (profanity/anger) using transcript and model scores if available
        profanity_list = ['puta', 'mierda', 'joder', 'cabron', 'imbecil', 'idiota', 'gilipollas', 'coño']
        found_profanity = []
        anger_flag = False
        try:
            txt = (full_transcript or '').lower()
            for w in profanity_list:
                if w in txt:
                    found_profanity.append(w)
            # Check emotion models if available
            if 'caller' in result and result['caller'].get('all_scores'):
                anger_score = result['caller']['all_scores'].get('Anger', 0.0)
                if anger_score and anger_score > 0.25:
                    anger_flag = True
            if 'client' in result and result['client'].get('all_scores'):
                anger_score_c = result['client']['all_scores'].get('Anger', 0.0)
                if anger_score_c and anger_score_c > 0.25:
                    anger_flag = True
            if any(x in txt for x in ['enoj', 'furios', 'rabia', 'asco', 'odio']):
                anger_flag = True
        except Exception:
            pass

        result['transcript'] = full_transcript
        result['alerts'] = {'profanity': found_profanity, 'anger': anger_flag}
        result['alert_count'] = len(found_profanity) + (1 if anger_flag else 0)
        # attach agent info for DB association
        result['agent_email'] = agent_email or agent_id or 'no-agent'
        result['agent_name'] = agent_name or agent_email or agent_id or 'no-agent'

        saved = False
        if save:
            saved = db_service.save_result(result)
            result['saved'] = saved

        return JSONResponse(content={"result": result})

    except Exception as e:
        print(f"Error in end_call: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_file and os.path.exists(temp_file):
            os.unlink(temp_file)

@app.get("/api/feeling-analytics/records")
async def get_records(limit: int = 100, offset: int = 0, agent_email: Optional[str] = None):
    """Get call records with full sentiment analysis. Can filter by agent_email."""
    try:
        # DEBUG: Show what parameters we received
        print(f"📊 GET /records: agent_email={agent_email}, limit={limit}, offset={offset}")
        
        # If agent_email is empty string, treat as None
        if agent_email == "":
            agent_email = None
            
        records = db_service.get_records(limit=limit, offset=offset, agent_email=agent_email)
        print(f"   → Devolviendo {len(records)} registros")
        
        # Convert any datetimes
        for record in records:
            for k, v in record.items():
                if hasattr(v, "isoformat"):
                    record[k] = v.isoformat()
        
        return JSONResponse(content=records)
    except Exception as e:
        print(f"✗ Error en get_records: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/feeling-analytics/records/{audio_id}")
async def get_record(audio_id: str):
    try:
        record = db_service.get_record_by_id_call(audio_id)
        if not record:
            raise HTTPException(status_code=404, detail="Record not found")
        for k, v in record.items():
            if hasattr(v, "isoformat"):
                record[k] = v.isoformat()
        return JSONResponse(content=record)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/feeling-analytics/caller-records")
async def get_caller_records(limit: int = 100, offset: int = 0, agent_email: Optional[str] = None):
    """Get records from caller table, optionally filtered by agent_email"""
    try:
        records = db_service.get_caller_records(limit=limit, offset=offset, agent_email=agent_email)
        for record in records:
            for k, v in record.items():
                if hasattr(v, "isoformat"):
                    record[k] = v.isoformat()
        return JSONResponse(content=records)
    except Exception as e:
        print("ERROR IN GET_CALLER_RECORDS:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/feeling-analytics/client-records")
async def get_client_records(limit: int = 100, offset: int = 0, agent_email: Optional[str] = None):
    """Get records from client table, optionally filtered by agent_email"""
    try:
        records = db_service.get_client_records(limit=limit, offset=offset, agent_email=agent_email)
        for record in records:
            for k, v in record.items():
                if hasattr(v, "isoformat"):
                    record[k] = v.isoformat()
        return JSONResponse(content=records)
    except Exception as e:
        print("ERROR IN GET_CLIENT_RECORDS:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/feeling-analytics/caller-records/{audio_id}")
async def get_caller_record(audio_id: str):
    """Get specific caller record by audio ID"""
    try:
        record = db_service.get_caller_by_id(audio_id)
        if not record:
            raise HTTPException(status_code=404, detail="Caller record not found")
        for k, v in record.items():
            if hasattr(v, "isoformat"):
                record[k] = v.isoformat()
        return JSONResponse(content=record)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/feeling-analytics/client-records/{audio_id}")
async def get_client_record(audio_id: str):
    """Get specific client record by audio ID"""
    try:
        record = db_service.get_client_by_id(audio_id)
        if not record:
            raise HTTPException(status_code=404, detail="Client record not found")
        for k, v in record.items():
            if hasattr(v, "isoformat"):
                record[k] = v.isoformat()
        return JSONResponse(content=record)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/statistics")
async def get_statistics():
    """Alias for /api/feeling-analytics/statistics"""
    try:
        stats = db_service.get_statistics()
        return JSONResponse(content={
            "total_audios": stats.get("total_records", 0),
            "total_llamadas": stats.get("total_records", 0),
            "confianza_promedio": round(stats.get("avg_final_score", 0.0), 2),
            "avg_caller_score": round(stats.get("avg_caller_score", 0.0), 2),
            "avg_client_score": round(stats.get("avg_client_score", 0.0), 2),
            "total_caller_records": stats.get("total_caller_records", 0),
            "total_client_records": stats.get("total_client_records", 0),
            "stereo_percentage": 50.0,  # Placeholder - calculate from DB if needed
            "mono_percentage": 50.0     # Placeholder - calculate from DB if needed
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/records")
async def get_records_alias(limit: int = 100, offset: int = 0, agent_email: Optional[str] = None):
    """Alias for /api/feeling-analytics/records"""
    try:
        records = db_service.get_records(limit=limit, offset=offset, agent_email=agent_email)
        for record in records:
            for k, v in record.items():
                if hasattr(v, "isoformat"):
                    record[k] = v.isoformat()
        return JSONResponse(content=records)
    except Exception as e:
        print(f"Error en get_records: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/metrics/agents")
async def get_metrics_agents(limit: int = 1000):
    """Get agent metrics - performance by each agent"""
    try:
        records = db_service.get_records(limit=limit)
        agent_stats = {}
        
        for record in records:
            # Use agent_name if available, fallback to agent_email
            name = record.get('agent_name') or record.get('agent_email', 'unknown')
            email = record.get('agent_email', 'unknown')
            
            if name not in agent_stats:
                agent_stats[name] = {
                    'name': name,
                    'email': email,
                    'total_calls': 0,
                    'avg_confidence': 0.0,
                    'avg_valence': 0.0,
                    'avg_arousal': 0.0,
                    'scores': [],
                    'valences': [],
                    'arousals': []
                }
            
            agent_stats[name]['total_calls'] += 1
            final_score = float(record.get('final_score', 0.0) or 0.0)
            agent_stats[name]['scores'].append(final_score)
            
            # Get valence and arousal directly from record (not from nested 'caller' object)
            valence = float(record.get('valence_score', 0.0) or 0.0)
            arousal = float(record.get('arousal_score', 0.0) or 0.0)
            agent_stats[name]['valences'].append(valence)
            agent_stats[name]['arousals'].append(arousal)
        
        # Calculate averages
        for name in agent_stats:
            stats = agent_stats[name]
            if stats['scores']:
                stats['avg_confidence'] = round(sum(stats['scores']) / len(stats['scores']) * 100, 2)
            if stats['valences']:
                stats['avg_valence'] = round(sum(stats['valences']) / len(stats['valences']), 3)
            if stats['arousals']:
                stats['avg_arousal'] = round(sum(stats['arousals']) / len(stats['arousals']), 3)
            
            # Clean up
            stats.pop('scores', None)
            stats.pop('valences', None)
            stats.pop('arousals', None)
        
        return JSONResponse(content=list(agent_stats.values()))
    except Exception as e:
        print(f"Error in get_metrics_agents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/metrics/emotions")
async def get_metrics_emotions():
    """Get emotion metrics"""
    try:
        records = db_service.get_records(limit=1000)
        emotion_stats = {}
        for record in records:
            # Get all_scores from both caller and client
            for channel in ['caller', 'client']:
                channel_data = record.get(channel, {})
                all_scores = channel_data.get('all_scores', {})
                for emotion, score in all_scores.items():
                    if emotion not in emotion_stats:
                        emotion_stats[emotion] = {'emotion': emotion, 'avg_score': 0.0, 'count': 0, 'scores': []}
                    emotion_stats[emotion]['scores'].append(score)
                    emotion_stats[emotion]['count'] += 1
        
        # Calculate averages
        for emotion in emotion_stats:
            if emotion_stats[emotion]['scores']:
                emotion_stats[emotion]['avg_score'] = round(sum(emotion_stats[emotion]['scores']) / len(emotion_stats[emotion]['scores']), 2)
            emotion_stats[emotion].pop('scores', None)
        
        return JSONResponse(content=list(emotion_stats.values()))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/metrics/daily")
async def get_metrics_daily(days: int = 30):
    """Get daily metrics for last N days"""
    try:
        from datetime import timedelta
        records = db_service.get_records(limit=10000)
        daily_stats = {}
        
        for record in records:
            analysis_date = record.get('analysis_date')
            if isinstance(analysis_date, str):
                date_obj = datetime.fromisoformat(analysis_date.replace('Z', '+00:00'))
                date_key = date_obj.strftime('%Y-%m-%d')
            else:
                date_key = 'unknown'
            
            if date_key not in daily_stats:
                daily_stats[date_key] = {
                    'date': date_key,
                    'total_calls': 0,
                    'avg_score': 0.0,
                    'scores': []
                }
            daily_stats[date_key]['total_calls'] += 1
            daily_stats[date_key]['scores'].append(record.get('final_score', 0.0))
        
        # Calculate averages
        for date in daily_stats:
            if daily_stats[date]['scores']:
                daily_stats[date]['avg_score'] = round(sum(daily_stats[date]['scores']) / len(daily_stats[date]['scores']), 2)
            daily_stats[date].pop('scores', None)
        
        return JSONResponse(content=list(daily_stats.values()))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/feeling-analytics/statistics")
async def get_statistics_short():
    """Get statistics (backward compatibility route)"""
    try:
        stats = db_service.get_statistics()
        return JSONResponse(content={
            "total_audios": stats.get("total_records", 0),
            "total_llamadas": stats.get("total_records", 0),
            "confianza_promedio": round(stats.get("avg_final_score", 0.0), 2),
            "avg_caller_score": round(stats.get("avg_caller_score", 0.0), 2),
            "avg_client_score": round(stats.get("avg_client_score", 0.0), 2),
            "total_caller_records": stats.get("total_caller_records", 0),
            "total_client_records": stats.get("total_client_records", 0),
            "stereo_percentage": 50.0,  # Placeholder
            "mono_percentage": 50.0     # Placeholder
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("Iniciando API de Análisis de Sentimientos Multichannel...")
    print("API: http://localhost:8000")
    print("Docs: http://localhost:8000/docs")
    
    uvicorn.run("feeling_analyser_api:app", host="0.0.0.0", port=8000, reload=True)
