#!/bin/bash

echo "Iniciando frontend Next.js..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
  echo "Error: Node.js no encontrado"
  exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
  echo "Instalando dependencias..."
  npm install
fi

echo "Iniciando Next.js en puerto 3000..."
echo "Frontend: http://localhost:3000"
echo ""

npm run dev
