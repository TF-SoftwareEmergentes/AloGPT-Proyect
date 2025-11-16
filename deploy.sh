
set -e
echo "Configurando variables de entorno..."
if [[ ! -f .env ]]; then
    echo "Creando archivo .env..."
    cat > .env << EOF
# Database Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=ai_agents
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -hex 32)

# Domain Configuration
DOMAIN=${DOMAIN}
EMAIL=${EMAIL}

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=false

# Security Configuration
SECRET_KEY=$(openssl rand -hex 64)
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALGORITHM=HS256
CORS_ORIGINS=["https://${DOMAIN}", "https://www.${DOMAIN}"]

# AI/ML Configuration
HF_TOKEN=your_huggingface_token_here
OPENAI_API_KEY=your_openai_key_here
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# File Configuration
UPLOAD_FOLDER=/app/uploads
MAX_CONTENT_LENGTH=52428800
CHROMA_DB_PATH=/app/data/chroma_db

# Model Paths
EMPATHIC_MODELS_PATH=/app/models/empathic_insight/
WHISPER_MODEL_PATH=/app/models/whisper_model/
PDF_REPORTS_PATH=/app/chat_legal/src/pdf_reports/

# Database URL
DATABASE_URL=postgresql://postgres:\${POSTGRES_PASSWORD}@postgres:5432/ai_agents
EOF
    echo " Archivo .env creado. Por favor actualiza HF_TOKEN y OPENAI_API_KEY"
else
    echo " Archivo .env ya existe"
fi

DOMAIN=${1:-localhost}
EMAIL=${2:-admin@example.com}

echo " Iniciando despliegue del Agente IA para dominio: $DOMAIN"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir salida con color
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ADVERTENCIA]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar si se ejecuta como root
if [[ $EUID -eq 0 ]]; then
   print_error "Este script no debe ejecutarse como root por razones de seguridad"
   exit 1
fi

# Actualizar paquetes del sistema
print_status "Actualizando paquetes del sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar paquetes requeridos
print_status "Instalando paquetes requeridos..."
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    htop \
    ufw

# Instalar Docker
print_status "Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    print_warning "Docker ya está instalado"
fi

# Instalar Docker Compose
print_status "Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    print_warning "Docker Compose ya está instalado"
fi

# Configurar firewall
print_status "Configurando firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Crear directorio de aplicación
APP_DIR="/opt/ai-agent"
print_status "Creando directorio de aplicación en $APP_DIR..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Clonar o actualizar repositorio
if [ -d "$APP_DIR/.git" ]; then
    print_status "Actualizando repositorio existente..."
    cd $APP_DIR
    git pull origin main
else
    print_status "Clonando repositorio..."
    git clone https://github.com/your-repo/ai-agent-project.git $APP_DIR
    cd $APP_DIR
fi

# Configurar variables de entorno
print_status "Configurando variables de entorno..."
if [ ! -f .env ]; then
    cp .env.example .env
    print_warning "Por favor edita el archivo .env con tu configuración:"
    print_warning "nano $APP_DIR/.env"
    
    # Generar contraseña segura
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    sed -i "s/your_secure_password_here/$POSTGRES_PASSWORD/" .env
    sed -i "s/yourdomain.com/$DOMAIN/g" .env
    
    print_status "Contraseña PostgreSQL segura generada"
fi

# Crear directorios necesarios
print_status "Creando directorios necesarios..."
mkdir -p ssl
mkdir -p backend/chroma_db_dir
sudo chown -R $USER:$USER backend/chroma_db_dir

# Configurar certificados SSL (si no es localhost)
if [ "$DOMAIN" != "localhost" ]; then
    print_status "Configurando certificados SSL para $DOMAIN..."
    
    # Temporalmente configurar Nginx para HTTP
    sudo tee /etc/nginx/sites-available/ai-agent > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    location / {
        proxy_pass http://localhost:3000;
    }
}
EOF
    
    sudo ln -sf /etc/nginx/sites-available/ai-agent /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    
    # Obtener certificado SSL
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive
fi

# Construir e iniciar servicios
print_status "Construyendo e iniciando servicios..."

# Iniciar con compose de desarrollo primero
docker-compose down || true
docker-compose build --no-cache
docker-compose up -d

# Esperar a que los servicios se inicien
print_status "Esperando a que los servicios se inicien..."
sleep 30

# Verificación de salud
print_status "Realizando verificaciones de salud..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    print_status " Verificación de salud del backend exitosa"
else
    print_error " Verificación de salud del backend fallida"
    docker-compose logs backend
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status " Verificación de salud del frontend exitosa"
else
    print_error " Verificación de salud del frontend fallida"
    docker-compose logs frontend
fi

# Configurar Nginx para producción
if [ "$DOMAIN" != "localhost" ]; then
    print_status "Configurando Nginx para producción..."
    sudo tee /etc/nginx/sites-available/ai-agent > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 100M;
    }
    
    # Legal Chat API
    location /legal/ {
        proxy_pass http://localhost:8000/legal/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    sudo nginx -t && sudo systemctl reload nginx
fi

# Configurar renovación automática de SSL
if [ "$DOMAIN" != "localhost" ]; then
    print_status "Configurando renovación automática de certificado SSL..."
    (sudo crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | sudo crontab -
fi

# Crear servicio systemd para inicio automático
print_status "Creando servicio systemd..."
sudo tee /etc/systemd/system/ai-agent.service > /dev/null <<EOF
[Unit]
Description=Plataforma Multi-Servicio Agente IA
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ai-agent.service

# Estado final
echo ""
print_status " ¡Despliegue completado exitosamente!"
echo ""
print_status "Los servicios se están ejecutando en:"
if [ "$DOMAIN" != "localhost" ]; then
    print_status " Sitio web: https://$DOMAIN"
    print_status " Docs API: https://$DOMAIN/docs"
    print_status " Chat Legal: https://$DOMAIN/chat-legal"
else
    print_status " Sitio web: http://localhost:3000"
    print_status " Docs API: http://localhost:8000/docs"
    print_status " Chat Legal: http://localhost:3000/chat-legal"
fi
echo ""
print_status " Comandos útiles:"
print_status "  Ver logs: cd $APP_DIR && docker-compose logs -f"
print_status "  Reiniciar servicios: cd $APP_DIR && docker-compose restart"
print_status "  Actualizar aplicación: cd $APP_DIR && git pull && docker-compose up --build -d"
print_status "  Monitorear recursos: htop"
echo ""
print_warning " Recuerda:"
print_warning "  1. Configurar tu archivo .env con las claves API apropiadas"
print_warning "  2. Agregar tus documentos PDF a backend/chat_legal/src/pdf_reports/"
print_warning "  3. Monitorear los logs por si hay problemas"

# Mostrar pasos siguientes
echo ""
print_status " Próximos pasos:"
print_status "1. Editar configuración: nano $APP_DIR/.env"
print_status "2. Reiniciar servicios: cd $APP_DIR && docker-compose restart"
print_status "3. Verificar estado: cd $APP_DIR && docker-compose ps"