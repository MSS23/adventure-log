# Google Cloud Platform Deployment Guide

## Overview

This guide covers deploying Adventure Log to Google Cloud Platform using Cloud Run or App Engine.

## Prerequisites

- Google Cloud Account
- gcloud CLI installed: `curl https://sdk.cloud.google.com | bash`
- Docker installed (for Cloud Run)

## Option 1: Cloud Run (Recommended)

### Setup

1. **Login to GCP:**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable APIs:**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

3. **Build and Deploy:**
   ```bash
   # Build container
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/adventure-log
   
   # Deploy to Cloud Run
   gcloud run deploy adventure-log \
     --image gcr.io/YOUR_PROJECT_ID/adventure-log \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars "NEXT_PUBLIC_SUPABASE_URL=your_url,NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key"
   ```

### Dockerfile

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS build
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
EXPOSE 8080
ENV PORT=8080
CMD ["npm", "start"]
```

### Environment Variables

Set in Cloud Run Console → Variables & Secrets:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Custom Domain

1. **Map Domain:**
   ```bash
   gcloud run domain-mappings create \
     --service adventure-log \
     --domain yourdomain.com \
     --region us-central1
   ```

2. **Configure DNS:**
   - Add CNAME record as instructed by gcloud

## Option 2: App Engine

### Setup

1. **Create app.yaml:**
   ```yaml
   runtime: nodejs20
   env: standard
   
   instance_class: F2
   
   env_variables:
     NEXT_PUBLIC_SUPABASE_URL: 'your_url'
     NEXT_PUBLIC_SUPABASE_ANON_KEY: 'your_key'
     NODE_ENV: 'production'
   
   automatic_scaling:
     min_instances: 1
     max_instances: 10
     target_cpu_utilization: 0.6
   ```

2. **Deploy:**
   ```bash
   gcloud app deploy
   ```

## Option 3: GKE (Kubernetes)

### Setup

1. **Create Cluster:**
   ```bash
   gcloud container clusters create adventure-log-cluster \
     --num-nodes=3 \
     --zone=us-central1-a
   ```

2. **Deploy:**
   ```bash
   kubectl apply -f k8s/
   ```

### Kubernetes Manifests

**deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: adventure-log
spec:
  replicas: 3
  selector:
    matchLabels:
      app: adventure-log
  template:
    metadata:
      labels:
        app: adventure-log
    spec:
      containers:
      - name: adventure-log
        image: gcr.io/YOUR_PROJECT_ID/adventure-log:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: adventure-log-secrets
              key: supabase-url
```

## Database Options

### Cloud SQL PostgreSQL

1. **Create Instance:**
   ```bash
   gcloud sql instances create adventure-log-db \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=us-central1
   ```

2. **Create Database:**
   ```bash
   gcloud sql databases create adventure_log --instance=adventure-log-db
   ```

3. **Connect:**
   - Use Cloud SQL Proxy for local development
   - Use private IP for Cloud Run/App Engine

### Use Supabase (Recommended)

Continue using Supabase as external database.

## Storage Options

### Cloud Storage for Photos

1. **Create Bucket:**
   ```bash
   gsutil mb -p YOUR_PROJECT_ID gs://adventure-log-photos
   ```

2. **Configure CORS:**
   ```json
   [
     {
       "origin": ["https://yourdomain.com"],
       "method": ["GET", "PUT", "POST"],
       "responseHeader": ["Content-Type"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

3. **Update Application:**
   - Use Google Cloud Storage SDK
   - Update photo URL generation

## Redis Options

### Memorystore Redis

1. **Create Instance:**
   ```bash
   gcloud redis instances create adventure-log-redis \
     --size=1 \
     --region=us-central1
   ```

2. **Connect:**
   - Use private IP from Cloud Run/App Engine
   - Update Redis configuration

### Use Upstash (Recommended)

Continue using Upstash Redis.

## Monitoring

### Cloud Monitoring

- Set up Cloud Monitoring dashboards
- Create alerting policies
- Configure uptime checks

### Cloud Logging

- View logs in Cloud Console
- Set up log-based alerts
- Export logs to BigQuery (optional)

## Cost Optimization

- Use Cloud Run for serverless (pay per request)
- Enable auto-scaling
- Use Cloud CDN for static assets
- Enable Cloud Storage lifecycle policies
- Use preemptible instances for non-critical workloads

## Security

- Enable Cloud Armor for DDoS protection
- Use Cloud IAM for access control
- Enable VPC for network isolation
- Use Secret Manager for sensitive data
- Enable Cloud Audit Logs

## Support

- GCP Documentation: https://cloud.google.com/docs
- GCP Support: https://cloud.google.com/support
- Community: https://cloud.google.com/community
