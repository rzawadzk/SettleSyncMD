#!/usr/bin/env bash
set -euo pipefail

# SettleSync — Production Deploy Script
# Usage: ./deploy.sh [--init|--update|--ssl|--backup-now]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

generate_secret() {
  openssl rand -hex 32
}

cmd_init() {
  echo "=== SettleSync: Initial Setup ==="

  # Generate .env from template if it doesn't exist
  if [ ! -f "$ENV_FILE" ]; then
    cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"

    # Generate random secrets
    local pg_pass jwt_secret hmac_secret
    pg_pass=$(generate_secret)
    jwt_secret=$(generate_secret)
    hmac_secret=$(generate_secret)

    # Inject secrets into .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$pg_pass/" "$ENV_FILE"
      sed -i '' "s/^JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" "$ENV_FILE"
      sed -i '' "s/^HMAC_SECRET=.*/HMAC_SECRET=$hmac_secret/" "$ENV_FILE"
    else
      sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$pg_pass/" "$ENV_FILE"
      sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" "$ENV_FILE"
      sed -i "s/^HMAC_SECRET=.*/HMAC_SECRET=$hmac_secret/" "$ENV_FILE"
    fi

    echo "Generated .env with random secrets."
    echo ""
    echo ">>> IMPORTANT: Edit $ENV_FILE and set:"
    echo "    - DOMAIN (your domain name)"
    echo "    - FRONTEND_URL (https://your-domain)"
    echo "    - SMTP_* (email credentials)"
    echo "    - CERTBOT_EMAIL (for SSL notifications)"
    echo ""
    echo "Then run: ./deploy.sh --update"
  else
    echo ".env already exists. To regenerate, delete it first."
  fi
}

cmd_update() {
  echo "=== SettleSync: Build & Deploy ==="

  if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env not found. Run ./deploy.sh --init first."
    exit 1
  fi

  # Validate required env vars
  source "$ENV_FILE"
  for var in POSTGRES_PASSWORD JWT_SECRET HMAC_SECRET; do
    if [ -z "${!var:-}" ] || [ "${!var}" = "change-me" ]; then
      echo "Error: $var is not set or still has default value."
      exit 1
    fi
  done

  cd "$SCRIPT_DIR"

  echo "Building containers..."
  docker compose build

  echo "Running database migrations..."
  docker compose run --rm backend node apps/backend/dist/db/migrate.js

  echo "Starting services..."
  docker compose up -d

  echo ""
  echo "=== Deploy complete ==="
  docker compose ps
}

cmd_ssl() {
  echo "=== SettleSync: Provision SSL Certificate ==="

  if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env not found. Run ./deploy.sh --init first."
    exit 1
  fi

  source "$ENV_FILE"

  if [ -z "${DOMAIN:-}" ] || [ "$DOMAIN" = "settlesync.example.com" ]; then
    echo "Error: Set DOMAIN in .env first."
    exit 1
  fi

  if [ -z "${CERTBOT_EMAIL:-}" ]; then
    echo "Error: Set CERTBOT_EMAIL in .env first."
    exit 1
  fi

  # Ensure frontend is running on port 80 for the challenge
  cd "$SCRIPT_DIR"
  docker compose up -d frontend

  echo "Requesting certificate for $DOMAIN..."
  docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d "$DOMAIN" \
    --email "$CERTBOT_EMAIL" \
    --agree-tos \
    --no-eff-email

  # Switch nginx to SSL config
  echo "Switching nginx to HTTPS config..."
  docker compose exec frontend sh -c "envsubst '\$DOMAIN' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -s reload"

  echo "SSL provisioned. Site available at https://$DOMAIN"
}

cmd_backup() {
  echo "=== SettleSync: Manual Backup ==="
  cd "$SCRIPT_DIR"
  source "$ENV_FILE"
  mkdir -p "$SCRIPT_DIR/backups"
  docker compose exec postgres pg_dump -U "${POSTGRES_USER:-settlesync}" "${POSTGRES_DB:-settlesync}" \
    | gzip > "$SCRIPT_DIR/backups/settlesync-$(date +%Y%m%d-%H%M%S).sql.gz"
  echo "Backup saved to $SCRIPT_DIR/backups/"
  ls -lh "$SCRIPT_DIR/backups/" | tail -5
}

# Main
case "${1:-}" in
  --init)     cmd_init ;;
  --update)   cmd_update ;;
  --ssl)      cmd_ssl ;;
  --backup-now) cmd_backup ;;
  *)
    echo "Usage: $0 [--init|--update|--ssl|--backup-now]"
    echo ""
    echo "  --init       Generate .env with random secrets"
    echo "  --update     Build containers and deploy"
    echo "  --ssl        Provision SSL certificate via Let's Encrypt"
    echo "  --backup-now Run a manual database backup"
    exit 1
    ;;
esac
