"""
Mock/In-Memory DatabaseService for development without PostgreSQL.
Stores data in memory - data will be lost when the server restarts.
"""
import os
from datetime import datetime
import json
import uuid
from typing import List, Dict, Optional


class DatabaseService:
    """In-memory database service for development"""
    
    def __init__(self):
        print("🗄️ Using IN-MEMORY database (no PostgreSQL)")
        self._use_memory = True
        self._caller_results: Dict[str, dict] = {}
        self._client_results: Dict[str, dict] = {}
        self._sentiment_analysis: List[dict] = []
        
        # Try to connect to real DB, fallback to memory if fails
        try:
            import psycopg2
            self.host = os.getenv('DB_HOST', 'localhost')
            self.database = os.getenv('DB_NAME', 'promise_analyzer')
            self.user = os.getenv('DB_USER', 'postgres')
            self.password = os.getenv('DB_PASSWORD', 'admin')
            self.port = os.getenv('DB_PORT', '5432')
            
            conn = psycopg2.connect(
                host=self.host,
                database=self.database,
                user=self.user,
                password=self.password,
                port=self.port
            )
            conn.close()
            self._use_memory = False
            print("✅ Connected to PostgreSQL database")
        except Exception as e:
            print(f"⚠️ PostgreSQL not available: {e}")
            print("📝 Using in-memory storage instead")
            self._use_memory = True
    
    def get_connection(self):
        """Get database connection (only if using PostgreSQL)"""
        if self._use_memory:
            return None
        import psycopg2
        return psycopg2.connect(
            host=self.host,
            database=self.database,
            user=self.user,
            password=self.password,
            port=self.port
        )
    
    def create_tables(self):
        """Create tables (no-op for memory mode)"""
        if self._use_memory:
            print("📝 In-memory mode: tables not needed")
            return
        # Real implementation would go here
        
    def save_caller_result(self, result: dict, agent_email: str = None) -> str:
        """Save caller analysis result"""
        id_call = result.get('id_call', str(uuid.uuid4())[:8])
        
        record = {
            'id_call': id_call,
            'agent_email': agent_email,
            'analysis_date': datetime.now().isoformat(),
            'final_score': result.get('final_score', 0),
            'valence_score': result.get('valence_score', 0),
            'arousal_score': result.get('arousal_score', 0),
            'all_scores': result.get('caller', {}),
            'advice': result.get('advice', ''),
            'transcript': result.get('caller', {}).get('transcription', ''),
            'alerts': [],
            'alert_count': 0,
            'created_at': datetime.now().isoformat()
        }
        
        self._caller_results[id_call] = record
        return id_call
    
    def save_client_result(self, result: dict, agent_email: str = None) -> str:
        """Save client analysis result"""
        id_call = result.get('id_call', str(uuid.uuid4())[:8])
        
        record = {
            'id_call': id_call,
            'agent_email': agent_email,
            'analysis_date': datetime.now().isoformat(),
            'final_score': result.get('final_score', 0),
            'valence_score': result.get('valence_score', 0),
            'arousal_score': result.get('arousal_score', 0),
            'all_scores': result.get('client', {}),
            'advice': '',
            'transcript': result.get('client', {}).get('transcription', ''),
            'alerts': [],
            'alert_count': 0,
            'created_at': datetime.now().isoformat()
        }
        
        self._client_results[id_call] = record
        return id_call
    
    def save_result(self, result: dict) -> dict:
        """Save complete analysis result (caller + client) - main API method"""
        agent_email = result.get('agent_email', 'unknown')
        
        # Save caller result if present
        if 'caller' in result:
            self.save_caller_result(result, agent_email)
        
        # Save client result if present  
        if 'client' in result:
            self.save_client_result(result, agent_email)
        
        # Store in sentiment analysis list
        self._sentiment_analysis.append({
            'id_call': result.get('id_call'),
            'agent_email': agent_email,
            'timestamp': datetime.now().isoformat(),
            'result': result
        })
        
        print(f"💾 Mock DB: Saved result for call {result.get('id_call')}")
        return {"saved": True, "id_call": result.get('id_call')}
    
    def get_records(self, agent_email: str = None, limit: int = 100, offset: int = 0) -> List[dict]:
        """Get all records, optionally filtered by agent"""
        records = []
        
        for id_call, caller in self._caller_results.items():
            client = self._client_results.get(id_call, {})
            
            if agent_email and caller.get('agent_email') != agent_email:
                continue
                
            record = {
                'id_call': id_call,
                'agent_email': caller.get('agent_email'),
                'analysis_date': caller.get('analysis_date'),
                'caller_score': caller.get('final_score', 0),
                'caller_valence': caller.get('valence_score', 0),
                'caller_arousal': caller.get('arousal_score', 0),
                'client_score': client.get('final_score', 0),
                'client_valence': client.get('valence_score', 0),
                'client_arousal': client.get('arousal_score', 0),
                'advice': caller.get('advice', ''),
                'caller_alerts': caller.get('alerts', []),
                'client_alerts': client.get('alerts', []),
            }
            records.append(record)
        
        # Sort by date descending
        records.sort(key=lambda x: x.get('analysis_date', ''), reverse=True)
        return records[offset:offset + limit]
    
    def get_record_by_id(self, id_call: str) -> Optional[dict]:
        """Get a specific record by ID"""
        caller = self._caller_results.get(id_call)
        client = self._client_results.get(id_call)
        
        if not caller and not client:
            return None
            
        return {
            'id_call': id_call,
            'caller': caller,
            'client': client
        }
    
    def get_record_by_id_call(self, id_call: str) -> Optional[dict]:
        """Get a specific record by id_call - returns properly structured data for frontend"""
        caller = self._caller_results.get(id_call)
        client = self._client_results.get(id_call)
        
        if not caller and not client:
            return None
        
        # Build structured response matching what frontend expects
        record = {
            'id_call': id_call,
            'filename': caller.get('filename', id_call) if caller else id_call,
            'agent_email': caller.get('agent_email', 'unknown') if caller else 'unknown',
            'agent_name': caller.get('agent_name', 'Agent') if caller else 'Agent',
            'analysis_date': caller.get('analysis_date') if caller else datetime.now().isoformat(),
            'is_stereo': True,
            'caller': {
                'final_score': caller.get('final_score', 0) if caller else 0,
                'valence_score': caller.get('valence_score', 0) if caller else 0,
                'arousal_score': caller.get('arousal_score', 0) if caller else 0,
                'all_scores': caller.get('all_scores', {}) if caller else {},
                'advice': caller.get('advice', '') if caller else '',
                'transcript': caller.get('transcript', '') if caller else '',
                'top_emotions': caller.get('top_emotions', []) if caller else [],
            },
            'client': {
                'final_score': client.get('final_score', 0) if client else 0,
                'valence_score': client.get('valence_score', 0) if client else 0,
                'arousal_score': client.get('arousal_score', 0) if client else 0,
                'all_scores': client.get('all_scores', {}) if client else {},
                'advice': client.get('advice', '') if client else '',
                'transcript': client.get('transcript', '') if client else '',
                'top_emotions': client.get('top_emotions', []) if client else [],
            },
            'comparison': {
                'score_difference': 0,
                'emotional_synchrony': 0.75,
                'significant_emotion_differences': {},
                'dominant_speaker': 'caller'
            },
            'advice': caller.get('advice', '') if caller else ''
        }
        
        return record
    
    def get_statistics(self, agent_email: str = None) -> dict:
        """Get statistics"""
        records = self.get_records(agent_email=agent_email)
        
        if not records:
            return {
                'total_records': 0,
                'avg_caller_score': 0,
                'avg_client_score': 0,
                'avg_valence': 0,
                'avg_arousal': 0,
                'total_alerts': 0
            }
        
        total = len(records)
        avg_caller = sum(r.get('caller_score', 0) for r in records) / total
        avg_client = sum(r.get('client_score', 0) for r in records) / total
        avg_valence = sum(r.get('caller_valence', 0) for r in records) / total
        avg_arousal = sum(r.get('caller_arousal', 0) for r in records) / total
        
        return {
            'total_records': total,
            'avg_caller_score': round(avg_caller, 2),
            'avg_client_score': round(avg_client, 2),
            'avg_valence': round(avg_valence, 3),
            'avg_arousal': round(avg_arousal, 3),
            'total_alerts': 0
        }
    
    def delete_record(self, id_call: str) -> bool:
        """Delete a record"""
        deleted = False
        if id_call in self._caller_results:
            del self._caller_results[id_call]
            deleted = True
        if id_call in self._client_results:
            del self._client_results[id_call]
            deleted = True
        return deleted
    
    def get_alerts(self, agent_email: str = None, severity: str = None) -> List[dict]:
        """Get alerts (returns empty for mock)"""
        return []
    
    def get_agent_performance(self, agent_email: str) -> dict:
        """Get agent performance metrics"""
        records = self.get_records(agent_email=agent_email)
        stats = self.get_statistics(agent_email=agent_email)
        
        return {
            'agent_email': agent_email,
            'total_calls': stats['total_records'],
            'avg_score': stats['avg_caller_score'],
            'avg_valence': stats['avg_valence'],
            'avg_arousal': stats['avg_arousal'],
            'recent_calls': records[:5]
        }
