# SettleSync — Linode Deployment Guide

## Prerequisites
- A Linode account
- A domain name with DNS access
- SMTP credentials (e.g., Mailgun, SendGrid, or your own mail server)

## 1. Create Linode Instance

1. Create a **Linode Shared CPU** (Nanode 1GB is sufficient for demo/low traffic, 2GB recommended for production)
2. Choose **Ubuntu 24.04 LTS**
3. Set a root password and add your SSH key
4. Note the IP address

## 2. Point DNS

Add an **A record** for your domain pointing to the Linode IP:

```
settlesync.yourdomain.com  →  A  →  <LINODE_IP>
```

Allow 5–30 minutes for DNS propagation.

## 3. Server Setup

SSH into your server:

```bash
ssh root@<LINODE_IP>
```

Install Docker and Docker Compose:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker (official method)
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Verify
docker compose version
```

Set up a firewall:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 4. Deploy SettleSync

Clone the repository:

```bash
cd /opt
git clone <YOUR_REPO_URL> settlesync
cd settlesync/infra
```

Initialize configuration:

```bash
./deploy.sh --init
```

This generates `.env` with random secrets for `POSTGRES_PASSWORD`, `JWT_SECRET`, and `HMAC_SECRET`.

Edit the `.env` file:

```bash
nano .env
```

Set these values:

```env
DOMAIN=settlesync.yourdomain.com
FRONTEND_URL=https://settlesync.yourdomain.com
CERTBOT_EMAIL=your@email.com

# SMTP credentials
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.yourdomain.com
SMTP_PASS=your-smtp-password
FROM_EMAIL=noreply@yourdomain.com
```

Build and deploy:

```bash
./deploy.sh --update
```

## 5. Provision SSL

Once DNS has propagated and the site is reachable on port 80:

```bash
./deploy.sh --ssl
```

This will:
1. Request a Let's Encrypt certificate via HTTP-01 challenge
2. Switch nginx to HTTPS with the new certificate
3. Start automatic certificate renewal (every 12 hours check)

Your site is now live at `https://settlesync.yourdomain.com`

## 6. Verify

- Open `https://settlesync.yourdomain.com` — you should see the login page
- Check service health: `https://settlesync.yourdomain.com/api/health`
- Check all services: `docker compose ps` (from `/opt/settlesync/infra`)

## Operations

### View logs

```bash
cd /opt/settlesync/infra
docker compose logs -f backend     # API server
docker compose logs -f worker      # Email worker
docker compose logs -f postgres    # Database
```

### Manual backup

```bash
./deploy.sh --backup-now
```

Backups are saved to `infra/backups/` as gzipped SQL dumps. The automatic backup service runs daily and keeps 7 days of history.

### Restore from backup

```bash
gunzip -c backups/settlesync-YYYYMMDD-HHMMSS.sql.gz | \
  docker compose exec -T postgres psql -U settlesync settlesync
```

### Update deployment

```bash
cd /opt/settlesync/infra
git pull
./deploy.sh --update
```

### Seed test data (demo only)

```bash
docker compose run --rm backend node apps/backend/dist/db/seed.js
```

## Architecture

```
┌─────────────┐     ┌──────────────┐
│   nginx      │────▶│   backend    │
│  (frontend)  │     │  (Express)   │
│  :80/:443    │     │  :3001       │
└─────────────┘     └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │              │
               ┌────▼────┐  ┌─────▼─────┐
               │ postgres │  │   redis    │
               │  :5432   │  │   :6379   │
               └──────────┘  └─────┬─────┘
                                   │
                             ┌─────▼─────┐
                             │  worker    │
                             │ (BullMQ)   │
                             └───────────┘

               ┌──────────┐  ┌───────────┐
               │  certbot  │  │  backup    │
               │ (SSL)     │  │ (pg_dump)  │
               └──────────┘  └───────────┘
```

## Security Notes

- All secrets are generated with `openssl rand -hex 32` (256-bit)
- PostgreSQL is not exposed to the host — only accessible within Docker network
- Redis is not exposed to the host
- SSL/TLS with modern cipher suite (TLS 1.2+)
- HSTS enabled with 2-year max-age
- Daily automated backups with 7-day retention
- Rate limiting on auth and party endpoints
