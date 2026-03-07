# Fly.io Deployment Guide

## Overview

Fly.io provides global edge deployment with Docker containers.

## Prerequisites

- Fly.io account (https://fly.io)
- Fly CLI installed: `curl -L https://fly.io/install.sh | sh`

## Setup

### 1. Login

```bash
fly auth login
```

### 2. Initialize App

```bash
fly launch
```

This will create `fly.toml` configuration file.

### 3. Configure fly.toml

```toml
app = "adventure-log"
primary_region = "iad"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  NODE_ENV = "production"

[[services]]
  http_checks = []
  internal_port = 3000
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [services.concurrency]
    hard_limit = 25
    soft_limit = 20
    type = "connections"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "1s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"
```

### 4. Set Secrets

```bash
fly secrets set NEXT_PUBLIC_SUPABASE_URL=your_url
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
fly secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
fly secrets set UPSTASH_REDIS_REST_URL=your_url
fly secrets set UPSTASH_REDIS_REST_TOKEN=your_token
```

### 5. Deploy

```bash
fly deploy
```

## Custom Domain

### Add Domain

```bash
fly domains add yourdomain.com
```

### Configure DNS

Add CNAME record:
```
yourdomain.com → adventure-log.fly.dev
```

SSL certificate is automatically provisioned.

## Scaling

### Scale Vertically

```bash
# Increase VM size
fly scale vm shared-cpu-2x
```

### Scale Horizontally

```bash
# Add more instances
fly scale count 3
```

### Scale Regions

```bash
# Deploy to multiple regions
fly regions add iad ord sfo
```

## Monitoring

### View Logs

```bash
fly logs
```

### View Metrics

```bash
fly status
fly metrics
```

### Health Checks

Configure in `fly.toml`:
```toml
[[services.http_checks]]
  interval = "10s"
  timeout = "2s"
  grace_period = "5s"
  method = "GET"
  path = "/api/health"
```

## Database

### Use Supabase (Recommended)

Continue using Supabase as external database.

### Fly Postgres (Alternative)

```bash
fly postgres create --name adventure-log-db
fly postgres attach adventure-log-db
```

## Redis

### Use Upstash (Recommended)

Continue using Upstash Redis.

### Fly Redis (Alternative)

```bash
fly redis create
fly redis attach your-redis-app
```

## Cost

**Free Tier:**
- 3 shared-cpu-1x VMs
- 3GB persistent volume
- 160GB outbound data transfer

**Paid:**
- ~$1.94/month per shared-cpu-1x VM
- Pay for what you use

## Troubleshooting

### Deployment Issues

```bash
# Check logs
fly logs

# SSH into instance
fly ssh console

# Restart app
fly apps restart adventure-log
```

### Performance Issues

```bash
# Check metrics
fly metrics

# Scale up
fly scale vm shared-cpu-2x
```

## Support

- Fly.io Docs: https://fly.io/docs
- Fly.io Community: https://community.fly.io
- Support: support@fly.io
