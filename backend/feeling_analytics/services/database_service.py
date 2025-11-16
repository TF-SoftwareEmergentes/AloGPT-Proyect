import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import json
import numpy as np

class DatabaseService:
    def __init__(self):
        self.host = os.getenv('DB_HOST', 'localhost')
        self.database = os.getenv('DB_NAME', 'promise_analyzer')
        self.user = os.getenv('DB_USER', 'postgres')
        self.password = os.getenv('DB_PASSWORD', 'admin')
        self.port = os.getenv('DB_PORT', '5432')

    def get_connection(self):
        try:
            return psycopg2.connect(
                host=self.host,
                database=self.database,
                user=self.user,
                password=self.password,
                port=self.port
            )
        except Exception as e:
            print(f"Error connecting to DB: {e}")
            raise

    def create_tables(self):
        """Create all necessary tables if they don't exist"""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            # sentiment_analysis table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sentiment_analysis (
                    id SERIAL PRIMARY KEY,
                    agente VARCHAR(255),
                    archivo VARCHAR(255) UNIQUE,
                    fecha_análisis TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    confianza FLOAT,
                    promesa_cumplida BOOLEAN,
                    sincronía_emocional FLOAT,
                    combined_results JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # caller_results table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS caller_results (
                    id SERIAL PRIMARY KEY,
                    id_call VARCHAR(255) UNIQUE NOT NULL,
                    dni VARCHAR(50),
                    agent_email VARCHAR(255),
                    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    final_score FLOAT,
                    valence_score FLOAT,
                    arousal_score FLOAT,
                    all_scores JSONB,
                    advice TEXT,
                    transcript TEXT,
                    alerts JSONB,
                    alert_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # client_results table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS client_results (
                    id SERIAL PRIMARY KEY,
                    id_call VARCHAR(255) UNIQUE NOT NULL,
                    dni VARCHAR(50),
                    agent_email VARCHAR(255),
                    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    final_score FLOAT,
                    valence_score FLOAT,
                    arousal_score FLOAT,
                    all_scores JSONB,
                    advice TEXT,
                    transcript TEXT,
                    alerts JSONB,
                    alert_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Add agent_email column if it doesn't exist
            cursor.execute("""
                ALTER TABLE caller_results 
                ADD COLUMN IF NOT EXISTS agent_email VARCHAR(255)
            """)
            cursor.execute("""
                ALTER TABLE client_results 
                ADD COLUMN IF NOT EXISTS agent_email VARCHAR(255)
            """)
            
            # Add agent_name column if it doesn't exist
            cursor.execute("""
                ALTER TABLE caller_results 
                ADD COLUMN IF NOT EXISTS agent_name VARCHAR(255)
            """)
            cursor.execute("""
                ALTER TABLE client_results 
                ADD COLUMN IF NOT EXISTS agent_name VARCHAR(255)
            """)
            
            # Add top_emotions column if it doesn't exist
            cursor.execute("""
                ALTER TABLE caller_results 
                ADD COLUMN IF NOT EXISTS top_emotions JSONB
            """)
            cursor.execute("""
                ALTER TABLE client_results 
                ADD COLUMN IF NOT EXISTS top_emotions JSONB
            """)

            conn.commit()
            print("✓ Database tables created/verified")
        except Exception as e:
            print(f"Error creating tables: {e}")
            conn.rollback()
        finally:
            cursor.close()
            conn.close()

    def _convert_numpy_types(self, obj):
        """Convert numpy types to native Python types for JSON serialization"""
        if isinstance(obj, dict):
            return {k: self._convert_numpy_types(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [self._convert_numpy_types(item) for item in obj]
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, datetime):
            return obj.isoformat()
        return obj

    def save_result(self, result):
        """Save analysis result to database"""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            call_id = result.get('id_call', f"call_{datetime.utcnow().isoformat()}")
            agent_email = result.get('agent_email', 'unknown')
            agent_name = result.get('agent_name', result.get('agent_email', 'unknown'))

            # Save caller analysis
            if 'caller' in result:
                caller = result['caller']
                cursor.execute("""
                    INSERT INTO caller_results 
                    (id_call, dni, agent_email, agent_name, analysis_date, final_score, valence_score, arousal_score, all_scores, advice, transcript, alerts, alert_count, top_emotions)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id_call) DO UPDATE SET
                        final_score = EXCLUDED.final_score,
                        valence_score = EXCLUDED.valence_score,
                        arousal_score = EXCLUDED.arousal_score,
                        all_scores = EXCLUDED.all_scores,
                        advice = EXCLUDED.advice,
                        transcript = EXCLUDED.transcript,
                        alerts = EXCLUDED.alerts,
                        alert_count = EXCLUDED.alert_count,
                        agent_name = EXCLUDED.agent_name,
                        top_emotions = EXCLUDED.top_emotions
                """, (
                    call_id,
                    result.get('dni', ''),
                    agent_email,
                    agent_name,
                    datetime.utcnow(),
                    float(caller.get('final_score', 0)),
                    float(caller.get('valence_score', 0)),
                    float(caller.get('arousal_score', 0)),
                    json.dumps(self._convert_numpy_types(caller.get('all_scores', {}))),
                    caller.get('advice', ''),
                    result.get('transcript', ''),
                    json.dumps(self._convert_numpy_types(result.get('alerts', {}))),
                    result.get('alert_count', 0),
                    json.dumps(self._convert_numpy_types(caller.get('top_emotions', [])))
                ))

            # Save client analysis
            if 'client' in result:
                client = result['client']
                cursor.execute("""
                    INSERT INTO client_results 
                    (id_call, dni, agent_email, agent_name, analysis_date, final_score, valence_score, arousal_score, all_scores, advice, transcript, alerts, alert_count, top_emotions)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id_call) DO UPDATE SET
                        final_score = EXCLUDED.final_score,
                        valence_score = EXCLUDED.valence_score,
                        arousal_score = EXCLUDED.arousal_score,
                        all_scores = EXCLUDED.all_scores,
                        advice = EXCLUDED.advice,
                        transcript = EXCLUDED.transcript,
                        alerts = EXCLUDED.alerts,
                        alert_count = EXCLUDED.alert_count,
                        agent_name = EXCLUDED.agent_name,
                        top_emotions = EXCLUDED.top_emotions
                """, (
                    call_id,
                    result.get('dni', ''),
                    agent_email,
                    agent_name,
                    datetime.utcnow(),
                    float(client.get('final_score', 0)),
                    float(client.get('valence_score', 0)),
                    float(client.get('arousal_score', 0)),
                    json.dumps(self._convert_numpy_types(client.get('all_scores', {}))),
                    client.get('advice', ''),
                    result.get('transcript', ''),
                    json.dumps(self._convert_numpy_types(result.get('alerts', {}))),
                    result.get('alert_count', 0),
                    json.dumps(self._convert_numpy_types(client.get('top_emotions', [])))
                ))

            conn.commit()
            print(f"✓ Result saved: {call_id} (Agent: {agent_name})")
            return True
        except Exception as e:
            print(f"Error saving result: {e}")
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()

    def get_records(self, limit=100, offset=0, agent_email=None):
        """Get all records from caller_results table (primary analysis storage)"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            query = "SELECT * FROM caller_results"
            params = []
            
            if agent_email:
                query += " WHERE agent_email = %s"
                params.append(agent_email)
            
            query += " ORDER BY analysis_date DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            records = cursor.fetchall()
            return [dict(r) for r in records]
        finally:
            cursor.close()
            conn.close()

    def get_record_by_id_call(self, id_call):
        """Get a specific record by id_call - returns properly structured data"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute("""
                SELECT cr.*, 
                       cr.final_score as caller_final_score,
                       cr.valence_score as caller_valence,
                       cr.arousal_score as caller_arousal,
                       cr.all_scores as caller_all_scores,
                       cr.advice as caller_advice,
                       cr.transcript as caller_transcript,
                       cr.alerts as caller_alerts,
                       cr.top_emotions as caller_top_emotions,
                       clr.final_score as client_final_score,
                       clr.valence_score as client_valence,
                       clr.arousal_score as client_arousal,
                       clr.all_scores as client_all_scores,
                       clr.advice as client_advice,
                       clr.transcript as client_transcript,
                       clr.alerts as client_alerts,
                       clr.top_emotions as client_top_emotions
                FROM caller_results cr
                LEFT JOIN client_results clr ON cr.id_call = clr.id_call
                WHERE cr.id_call = %s
            """, (id_call,))
            result = cursor.fetchone()
            if not result:
                return None
            
            record = dict(result)
            
            # Ensure id_call and filename are set
            if not record.get('filename'):
                record['filename'] = record.get('id_call', 'N/A')
            
            # Reconstruct caller object from flat fields
            caller_data = {
                'final_score': record.get('caller_final_score', 0),
                'valence_score': record.get('caller_valence', 0),
                'arousal_score': record.get('caller_arousal', 0),
                'all_scores': record.get('caller_all_scores', {}),
                'advice': record.get('caller_advice', ''),
                'transcript': record.get('caller_transcript', ''),
                'top_emotions': record.get('caller_top_emotions', []),
            }
            
            # Reconstruct client object from flat fields
            client_data = {
                'final_score': record.get('client_final_score', 0),
                'valence_score': record.get('client_valence', 0),
                'arousal_score': record.get('client_arousal', 0),
                'all_scores': record.get('client_all_scores', {}),
                'advice': record.get('client_advice', ''),
                'transcript': record.get('client_transcript', ''),
                'top_emotions': record.get('client_top_emotions', []),
            }
            
            record['caller'] = caller_data
            record['client'] = client_data
            
            return record
        finally:
            cursor.close()
            conn.close()

    def get_caller_records(self, limit=100, offset=0, agent_email=None):
        """Get caller records"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            query = "SELECT * FROM caller_results"
            params = []
            if agent_email:
                query += " WHERE agent_email = %s"
                params.append(agent_email)
            query += " ORDER BY analysis_date DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            records = cursor.fetchall()
            return [dict(r) for r in records]
        finally:
            cursor.close()
            conn.close()

    def get_client_records(self, limit=100, offset=0, agent_email=None):
        """Get client records"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            query = "SELECT * FROM client_results"
            params = []
            if agent_email:
                query += " WHERE agent_email = %s"
                params.append(agent_email)
            query += " ORDER BY analysis_date DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            records = cursor.fetchall()
            return [dict(r) for r in records]
        finally:
            cursor.close()
            conn.close()

    def get_caller_by_id(self, id_call):
        """Get specific caller record"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute("SELECT * FROM caller_results WHERE id_call = %s", (id_call,))
            result = cursor.fetchone()
            return dict(result) if result else None
        finally:
            cursor.close()
            conn.close()

    def get_client_by_id(self, id_call):
        """Get specific client record"""
        conn = self.get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute("SELECT * FROM client_results WHERE id_call = %s", (id_call,))
            result = cursor.fetchone()
            return dict(result) if result else None
        finally:
            cursor.close()
            conn.close()

    def get_statistics(self):
        """Get statistics"""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT COUNT(*) FROM caller_results")
            total_caller = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM client_results")
            total_client = cursor.fetchone()[0]
            
            cursor.execute("SELECT AVG(final_score) FROM caller_results")
            avg_caller = cursor.fetchone()[0] or 0.0
            
            cursor.execute("SELECT AVG(final_score) FROM client_results")
            avg_client = cursor.fetchone()[0] or 0.0
            
            return {
                'total_records': total_caller + total_client,
                'total_caller_records': total_caller,
                'total_client_records': total_client,
                'avg_final_score': (avg_caller + avg_client) / 2 if (avg_caller + avg_client) > 0 else 0,
                'avg_caller_score': avg_caller,
                'avg_client_score': avg_client
            }
        finally:
            cursor.close()
            conn.close()
