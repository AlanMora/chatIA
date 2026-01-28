#!/bin/bash

# Script de despliegue completo para ChatBotAI-3
# Solo ejecuta: ./deploy.sh

set -e

DOMAIN="sofia.omnios.mx"
EMAIL="lalomora250396@gmail.com"
RSA_KEY_SIZE=4096
NGINX_CONF_DIR="./nginx/conf.d"

echo "==================================================="
echo "  Desplegando ChatBotAI-3 en $DOMAIN"
echo "==================================================="
echo ""

# Verificar que docker esta instalado
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker no esta instalado."
    echo "Instala Docker primero: https://docs.docker.com/engine/install/"
    exit 1
fi

# Verificar que docker compose esta disponible
if ! docker compose version &> /dev/null; then
    echo "ERROR: Docker Compose no esta disponible."
    exit 1
fi

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "### Creando archivo .env desde .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo ""
        echo "IMPORTANTE: Edita el archivo .env con tus credenciales antes de continuar."
        echo "Ejecuta: nano .env"
        echo ""
        echo "Asegurate de configurar:"
        echo "  - POSTGRES_PASSWORD (password seguro)"
        echo "  - JWT_SECRET (genera con: openssl rand -hex 32)"
        echo "  - SESSION_SECRET (genera con: openssl rand -hex 32)"
        echo "  - DATABASE_URL (actualiza el password)"
        echo ""
        exit 1
    else
        echo "ERROR: No se encontro .env.example"
        exit 1
    fi
fi

# Paso 1: Usar configuracion inicial sin SSL
echo "### Paso 1: Configurando Nginx sin SSL..."
cp "$NGINX_CONF_DIR/app.conf.initial" "$NGINX_CONF_DIR/app.conf"
echo ""

# Paso 2: Construir la aplicacion
echo "### Paso 2: Construyendo la aplicacion..."
docker compose build app
echo ""

# Paso 3: Iniciar servicios
echo "### Paso 3: Iniciando base de datos..."
docker compose up -d db
echo "Esperando a que la base de datos este lista..."
sleep 10

echo "### Paso 4: Iniciando aplicacion..."
docker compose up -d app
echo "Esperando a que la aplicacion este lista..."
sleep 15

echo "### Paso 5: Iniciando Nginx..."
docker compose up -d nginx
echo "Esperando a que Nginx este listo..."
sleep 5
echo ""

# Paso 4: Verificar que nginx esta funcionando
echo "### Paso 6: Verificando servicios..."
if ! docker compose exec nginx nginx -t > /dev/null 2>&1; then
    echo "ERROR: Nginx no esta configurado correctamente."
    docker compose logs nginx
    exit 1
fi
echo "Todos los servicios estan funcionando."
echo ""

# Paso 5: Obtener certificados SSL
echo "### Paso 7: Obteniendo certificado SSL de Let's Encrypt..."
docker compose run --rm certbot certonly --webroot \
    -w /var/www/certbot \
    -d $DOMAIN \
    --email $EMAIL \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --non-interactive

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: No se pudo obtener el certificado SSL."
    echo "Verifica que:"
    echo "  1. El dominio $DOMAIN apunta a la IP de este servidor"
    echo "  2. Los puertos 80 y 443 estan abiertos"
    echo ""
    echo "La aplicacion sigue funcionando en HTTP: http://$DOMAIN"
    exit 1
fi
echo ""

# Paso 6: Activar configuracion SSL
echo "### Paso 8: Activando HTTPS..."
cat > "$NGINX_CONF_DIR/app.conf" << 'NGINX_SSL_CONF'
upstream app_backend {
    server app:5000;
}

server {
    listen 80;
    listen [::]:80;
    server_name sofia.omnios.mx;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sofia.omnios.mx;

    ssl_certificate /etc/letsencrypt/live/sofia.omnios.mx/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sofia.omnios.mx/privkey.pem;

    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=63072000" always;

    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    client_max_body_size 50M;

    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    location /uploads {
        alias /app/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_SSL_CONF

# Recargar Nginx
docker compose exec nginx nginx -s reload
echo ""

# Paso 7: Iniciar renovacion automatica
echo "### Paso 9: Configurando renovacion automatica de SSL..."
docker compose up -d certbot
echo ""

echo "==================================================="
echo "  DESPLIEGUE COMPLETADO!"
echo "==================================================="
echo ""
echo "  Tu aplicacion esta disponible en:"
echo "  https://$DOMAIN"
echo ""
echo "  Comandos utiles:"
echo "  - Ver logs: docker compose logs -f"
echo "  - Ver logs de app: docker compose logs -f app"
echo "  - Reiniciar: docker compose restart"
echo "  - Detener: docker compose down"
echo "  - Reconstruir: docker compose build app && docker compose up -d app"
echo ""
