import uvicorn
from feeling_analytics.feeling_analyser_api import app

if __name__ == "__main__":
    print("🚀 Iniciando API de Análisis de Sentimientos...")
    print("📍 API: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
