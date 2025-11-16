# 🚀 Script para preparar proyecto para EC2 (FLUJO DIRECTO)
# Uso: .\prepare-for-ec2.ps1

Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📦 PREPARAR PROYECTO PARA EC2" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan

# 1. Verificaciones críticas
Write-Host "`n1️⃣  Verificando que NO hay archivos prohibidos..." -ForegroundColor Yellow

$issues = @()

if (Test-Path "frontend\node_modules") {
    $issues += "❌ frontend/node_modules EXISTE - ejecuta: rm -r frontend/node_modules"
}

if (Test-Path ".env") {
    $issues += "❌ .env EXISTE - no comprimas, solo .env.example"
}

if (Test-Path "backend\__pycache__") {
    $issues += "⚠️  backend/__pycache__ existe (OK si está en .gitignore)"
}

if ($issues.Count -gt 0) {
    Write-Host "`nProblemas encontrados:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "  $issue" -ForegroundColor Red
    }
    Write-Host "`n⛔ Resuelve los problemas antes de continuar" -ForegroundColor Red
    exit 1
}

Write-Host "  ✅ Sin problemas detectados" -ForegroundColor Green

# 2. Verificar archivos críticos
Write-Host "`n2️⃣  Verificando archivos críticos..." -ForegroundColor Yellow

$required = @("backend/requirements.txt", "backend/Dockerfile", "frontend/package.json", ".env.example", "docker-compose.yml")
$missing = @()

foreach ($file in $required) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        $missing += $file
        Write-Host "  ❌ $file" -ForegroundColor Red
    }
}

if ($missing.Count -gt 0) {
    Write-Host "`n⛔ Archivos faltantes: $missing" -ForegroundColor Red
    exit 1
}

# 3. Crear ZIP
Write-Host "`n3️⃣  Creando ZIP..." -ForegroundColor Yellow

if (Test-Path "ai-agent-project.zip") {
    Remove-Item "ai-agent-project.zip" -Force
    Write-Host "  🔄 ZIP anterior eliminado" -ForegroundColor Gray
}

Compress-Archive -Path . -DestinationPath ai-agent-project.zip -Force -WarningAction SilentlyContinue

if (Test-Path "ai-agent-project.zip") {
    $size = (Get-Item "ai-agent-project.zip").Length / 1MB
    $sizeGB = (Get-Item "ai-agent-project.zip").Length / 1GB
    
    if ($size -lt 500) {
        Write-Host "  ✅ ZIP creado: $([Math]::Round($size, 1)) MB" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  ZIP grande: $([Math]::Round($size, 1)) MB - revisar qué incluiste" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Error creando ZIP" -ForegroundColor Red
    exit 1
}

# 4. Listo para subir
Write-Host "`n════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ LISTO PARA SUBIR A EC2" -ForegroundColor Green
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`n📤 Próximo paso (en PowerShell):`n" -ForegroundColor Green
Write-Host '  scp -i "C:\ruta\a\tu-key.pem" "ai-agent-project.zip" ubuntu@TU_EC2_IP:~/' -ForegroundColor Cyan

Write-Host "`n📖 Leer: CHECKLIST_PRE_DEPLOY.md - FASE 3 EN ADELANTE`n" -ForegroundColor Green
