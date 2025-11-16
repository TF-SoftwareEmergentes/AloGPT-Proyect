#!/bin/bash

echo "Iniciando backend FastAPI..."

# Verificar Python
if ! command -v python3 &> /dev/null; then
  echo "Error: Python 3 no encontrado"
  exit 1
fi

# Verificar archivo .env
if [ ! -f .env ]; then
  echo "Advertencia: Archivo .env no encontrado. Copiando desde .env.example..."
  cp .env.example .env
  echo "Edita el archivo .env con tu configuracin de PostgreSQL"
fi

# Verificar dependencias
echo "Verificando dependencias..."
python3 -c "import fastapi, uvicorn" 2>/dev/null || {
  echo "Error: Dependencias faltantes. Ejecuta: pip3 install -r backend/requirements.txt"
  exit 1
}

# Cambiar al directorio backend
cd backend

echo "Iniciando AI Agent Multi-Service API en puerto 8000..."
echo "API Principal: http://localhost:8000"
echo "Documentacin: http://localhost:8000/docs"
echo "Feeling Analytics: http://localhost:8000/api/feeling-analytics/*"
echo "Legal Chat: http://localhost:8000/legal/chat"
echo ""

# Use the new startup script
python3 start_services.py combined
