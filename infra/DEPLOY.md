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

Create a non-root user:

```bash
adduser settlesync
usermod -aG docker settlesync
su - settlesync
```

### Firewall (Linode Cloud Firewall)

If using Linode's Cloud Firewall, ensure these rules:

**Inbound:** Accept TCP on ports 22, 80, 443 from all sources

**Outbound:**
- Accept TCP on port 587 (SMTP for sending emails)
- Accept UDP on port 53 (DNS — required for Docker to resolve hostnames)
- Accept all other outbound (or at minimum TCP 80, 443 for package installs)

> **Important:** Docker containers cannot resolve DNS if outbound UDP 53 is blocked. This is the most common deployment issue.

### Docker DNS fix

If Docker containers can't reach the internet (e.g., `npm ci` fails with `EAI_AGAIN`):

```bash
sudo mkdir -p /etc/docker
echo '{"dns": ["8.8.8.8", "8.8.4.4"]}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

### Swap space (for 1GB instances)

If builds fail with out-of-memory errors on small instances:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 4. Deploy SettleSync

Clone the repository:

```bash
sudo mkdir -p /opt/settlesync
sudo chown settlesync:settlesync /opt/settlesync
git clone https://github.com/rzawadzk/SettleSyncMD.git /opt/settlesync
cd /opt/settlesync/infra
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
2. Restart nginx, which auto-detects the certificate and enables HTTPS
3. Start automatic certificate renewal (every 12 hours check)

HTTPS is preserved across rebuilds — the frontend container auto-detects existing certificates on startup.

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
