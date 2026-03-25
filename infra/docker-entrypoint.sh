#!/bin/sh
set -e

# Auto-detect SSL certificates and switch to HTTPS config if available
CERT_DIR="/etc/letsencrypt/live/${DOMAIN:-}"

if [ -n "$DOMAIN" ] && [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
  echo "SSL certificates found for $DOMAIN — enabling HTTPS"
  envsubst '$DOMAIN' < /etc/nginx/ssl.conf.template > /etc/nginx/conf.d/default.conf
else
  echo "No SSL certificates found — running HTTP only"
fi

exec nginx -g 'daemon off;'
