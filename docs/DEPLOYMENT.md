# Deployment Guide

This guide covers deploying SettleSync in production environments.

## Prerequisites

- Linux server (Ubuntu 22.04+ recommended)
- Docker Engine 24+ and Docker Compose v2
- Domain name with DNS configured
- SMTP email service (e.g., Amazon SES, Mailgun, or your firm's mail server)
- TLS certificate (Let's Encrypt recommended)

## Architecture Overview

```
Internet → nginx (TLS + rate limiting)
              ├── /api/*  → backend (Express, port 3001)
              └── /*      → frontend (static files)
                              ↕
                          PostgreSQL 16
```

## Step-by-Step Deployment

### 1. Server Preparation

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt install docker-compose-plugin
sudo mkdir -p /opt/settlesync
sudo chown $USER:$USER /opt/settlesync
```

### 2. Clone and Configure

```bash
cd /opt/settlesync
git clone https://github.com/settlesync/settlesync.git .
cd infra
cp .env.example .env
```

Edit `.env` with your production values:

```bash
# REQUIRED — generate with: openssl rand -hex 32
JWT_SECRET=<random-64-char-hex>
HMAC_SECRET=<different-random-64-char-hex>
POSTGRES_PASSWORD=<strong-random-password>

# Your domain
APP_URL=https://mediacja.twoja-kancelaria.pl

# SMTP
SMTP_HOST=email-smtp.eu-central-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIAIOSFODNN7EXAMPLE
SMTP_PASS=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
SMTP_FROM=mediacja@twoja-kancelaria.pl
SMTP_FROM_NAME="Kancelaria — Mediacje"

ADMIN_EMAILS=jan.kowalski@twoja-kancelaria.pl
```

### 3. TLS Certificate (Let's Encrypt)

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d mediacja.twoja-kancelaria.pl
sudo cp /etc/letsencrypt/live/mediacja.twoja-kancelaria.pl/fullchain.pem infra/ssl/
sudo cp /etc/letsencrypt/live/mediacja.twoja-kancelaria.pl/privkey.pem infra/ssl/
```

Then uncomment the HTTPS server block in `infra/nginx.conf`.

### 4. Build and Start

```bash
cd /opt/settlesync/infra
docker compose up --build -d
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed
```

Verify: `curl http://localhost/api/health`

## Backup Strategy

```bash
# Database: daily automated backup
0 2 * * * cd /opt/settlesync/infra && docker compose exec -T db pg_dump -U settlesync settlesync | gzip > /opt/backups/settlesync_$(date +\%Y\%m\%d).sql.gz

# Uploads volume
docker run --rm -v settlesync_uploads:/data -v /opt/backups:/backup alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .

# Restore
cat backup.sql | docker compose exec -T db psql -U settlesync settlesync
```

## Monitoring

The `/api/health` endpoint returns JSON with status, version, uptime, and database connectivity. Monitor with Uptime Kuma, Healthchecks.io, or similar.

## Updating

```bash
cd /opt/settlesync
git pull origin main
cd infra
docker compose up --build -d
docker compose exec backend npm run db:migrate
```

## Security Hardening Checklist

- [ ] TLS 1.2+ only
- [ ] Strong JWT_SECRET and HMAC_SECRET (≥32 random bytes each)
- [ ] SMTP credentials not in version control
- [ ] Database not exposed to public network
- [ ] Firewall: only ports 80/443 open
- [ ] SPF/DKIM/DMARC configured for sending domain
- [ ] Automated backups verified
- [ ] Log rotation configured
