#!/bin/bash

# 🚀 DEPLOY RÁPIDO Y SIMPLE
# Uso: chmod +x deploy-quick.sh && ./deploy-quick.sh

set -e

echo "🚀 DEPLOY RÁPIDO - AI Agent Project"
echo "===================================="
echo ""

# 1. Verificar Docker
echo "1️⃣  Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no instalado. Instalar desde: https://docker.com"
    exit 1
fi
echo "✅ Docker OK"

# 2. Verificar docker-compose
echo "2️⃣  Verificando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no instalado"
    exit 1
fi
echo "✅ Docker Compose OK"

# 3. Preparar .env
echo "3️⃣  Verificando .env..."
if [ ! -f .env ]; then
    echo "⚠️  .env no encontrado, creando desde .env.example..."
    if [ ! -f .env.example ]; then
        echo "❌ .env.example no existe"
        exit 1
    fi
    cp .env.example .env
    echo "⚠️  IMPORTANTE: Edita .env con tus variables antes de continuar"
    echo "   Necesitas: HF_TOKEN, OPENAI_API_KEY, POSTGRES_PASSWORD"
    read -p "¿Ya editaste .env? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi
echo "✅ .env configurado"

# 4. Limpiar contenedores previos
echo "4️⃣  Limpiando contenedores anteriores..."
docker-compose down 2>/dev/null || true
echo "✅ Limpieza completada"

# 5. Construir imágenes
echo "5️⃣  Construyendo imágenes (esto toma 2-5 minutos)..."
docker-compose build
echo "✅ Imágenes construidas"

# 6. Iniciar servicios
echo "6️⃣  Iniciando servicios..."
docker-compose up -d
echo "✅ Servicios iniciados"

# 7. Esperar inicialización
echo "7️⃣  Esperando que los servicios se inicien (30 segundos)..."
sleep 30

# 8. Verificaciones
echo "8️⃣  Verificando servicios..."

echo -n "   Verificando Backend..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo " ✅"
else
    echo " ❌"
    echo "   Logs del backend:"
    docker-compose logs backend | tail -20
fi

echo -n "   Verificando Frontend..."
if curl -s http://localhost:3000 > /dev/null; then
    echo " ✅"
else
    echo " ❌"
    echo "   Logs del frontend:"
    docker-compose logs frontend | tail -20
fi

echo -n "   Verificando Base de Datos..."
if docker exec ai-agent-project-postgres-1 pg_isready -U postgres > /dev/null 2>&1; then
    echo " ✅"
else
    echo " ❌"
fi

# 9. Mostrar resumen
echo ""
echo "✅ DEPLOY COMPLETADO"
echo "===================="
echo ""
echo "📍 ACCESOS:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   Docs:      http://localhost:8000/docs"
echo "   DB Admin:  http://localhost:5432 (PostgreSQL)"
echo ""
echo "📊 COMANDOS ÚTILES:"
echo "   Ver logs:     docker-compose logs -f backend"
echo "   Detener:      docker-compose down"
echo "   Reiniciar:    docker-compose restart"
echo "   Limpiar todo: docker-compose down -v"
echo ""
echo "💡 TIP: Ejecuta 'docker-compose logs -f backend' en otra terminal para ver logs en vivo"
echo ""
