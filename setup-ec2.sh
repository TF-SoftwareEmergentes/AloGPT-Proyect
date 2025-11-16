#!/bin/bash

# 🚀 AWS EC2 Setup Automático
# Ejecutar: curl -L https://raw.github.com/tu-repo/setup-ec2.sh | bash

set -e

echo "🚀 AWS EC2 Setup Automático"
echo "============================"

# Actualizar sistema
echo "1️⃣  Actualizando sistema..."
sudo apt update
sudo apt upgrade -y

# Instalar Docker
echo "2️⃣  Instalando Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh

# Instalar Docker Compose
echo "3️⃣  Instalando Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Instalar Git
echo "4️⃣  Instalando Git..."
sudo apt install -y git

echo ""
echo "✅ Setup completado!"
echo ""
echo "Próximos pasos:"
echo "1. Logout y login: exit"
echo "2. SSH nuevamente: ssh -i key.pem ubuntu@IP"
echo "3. Clonar repo: git clone <repo>"
echo "4. Editar .env"
echo "5. docker-compose up -d"
