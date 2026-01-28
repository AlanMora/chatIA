#!/bin/sh
# Script para inicializar certificados SSL
# Si no existen certificados de Let's Encrypt, crea unos self-signed temporales

DOMAIN="sofia.omnios.mx"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"

# Instalar openssl si no existe
if ! command -v openssl > /dev/null 2>&1; then
    echo "Instalando openssl..."
    apk add --no-cache openssl
fi

# Crear directorios si no existen
mkdir -p "$CERT_PATH"

# Si no existen los certificados, crear unos self-signed temporales
if [ ! -f "$CERT_PATH/fullchain.pem" ]; then
    echo "Certificados no encontrados. Creando certificados temporales self-signed..."
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout "$CERT_PATH/privkey.pem" \
        -out "$CERT_PATH/fullchain.pem" \
        -subj "/CN=$DOMAIN"
    echo "Certificados temporales creados. Recuerda obtener certificados reales con certbot."
else
    echo "Certificados encontrados en $CERT_PATH"
fi

# Crear directorio para challenges de certbot
mkdir -p /var/www/certbot

# Iniciar nginx
exec nginx -g "daemon off;"
