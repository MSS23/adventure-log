# AWS Deployment Guide

## Overview

This guide covers deploying Adventure Log to AWS using various services.

## Prerequisites

- AWS Account
- AWS CLI configured
- Docker installed (for containerized deployment)

## Option 1: AWS Amplify (Recommended for Next.js)

### Setup

1. **Install Amplify CLI:**
   ```bash
   npm install -g @aws-amplify/cli
   amplify configure
   ```

2. **Initialize Amplify:**
   ```bash
   amplify init
   ```

3. **Add Hosting:**
   ```bash
   amplify add hosting
   ```

4. **Deploy:**
   ```bash
   amplify publish
   ```

### Environment Variables

Set in Amplify Console → App Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Option 2: AWS ECS/Fargate

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
ENV NODE_ENV production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

### ECS Task Definition

```json
{
  "family": "adventure-log",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "adventure-log",
      "image": "your-ecr-repo/adventure-log:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NEXT_PUBLIC_SUPABASE_URL",
          "value": "your-supabase-url"
        }
      ]
    }
  ]
}
```

## Option 3: AWS EC2

### Setup

1. **Launch EC2 Instance:**
   - AMI: Ubuntu 22.04 LTS
   - Instance Type: t3.medium or larger
   - Security Group: Allow HTTP (80), HTTPS (443), SSH (22)

2. **Install Dependencies:**
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm nginx
   ```

3. **Clone Repository:**
   ```bash
   git clone https://github.com/yourusername/adventure-log.git
   cd adventure-log
   npm install
   ```

4. **Build Application:**
   ```bash
   npm run build
   ```

5. **Setup PM2:**
   ```bash
   npm install -g pm2
   pm2 start npm --name "adventure-log" -- start
   pm2 save
   pm2 startup
   ```

6. **Configure Nginx:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **Setup SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

## Option 4: AWS Lambda (Serverless)

### Using Serverless Framework

1. **Install Serverless:**
   ```bash
   npm install -g serverless
   ```

2. **Configure serverless.yml:**
   ```yaml
   service: adventure-log
   
   provider:
     name: aws
     runtime: nodejs20.x
     region: us-east-1
     environment:
       NEXT_PUBLIC_SUPABASE_URL: ${env:NEXT_PUBLIC_SUPABASE_URL}
   
   functions:
     nextjs:
       handler: server.handler
       events:
         - http:
             path: /{proxy+}
             method: ANY
         - http:
             path: /
             method: ANY
   ```

3. **Deploy:**
   ```bash
   serverless deploy
   ```

## Database Options

### RDS PostgreSQL

If migrating from Supabase:

1. **Create RDS Instance:**
   - Engine: PostgreSQL 15+
   - Instance Class: db.t3.medium
   - Storage: 20GB+

2. **Migrate Data:**
   ```bash
   pg_dump -h supabase-host -U postgres adventure_log > backup.sql
   psql -h rds-host -U postgres adventure_log < backup.sql
   ```

### DynamoDB (Alternative)

For NoSQL approach, consider DynamoDB for specific use cases.

## Storage Options

### S3 for Photos

1. **Create S3 Bucket:**
   ```bash
   aws s3 mb s3://adventure-log-photos
   ```

2. **Configure CORS:**
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["https://yourdomain.com"],
         "AllowedMethods": ["GET", "PUT", "POST"],
         "AllowedHeaders": ["*"]
       }
     ]
   }
   ```

3. **Update Application:**
   - Use AWS SDK for S3 uploads
   - Update photo URL generation

## Monitoring

### CloudWatch

- Set up CloudWatch Logs
- Create CloudWatch Alarms
- Configure SNS notifications

### X-Ray

Enable AWS X-Ray for distributed tracing:
```javascript
const AWSXRay = require('aws-xray-sdk-core')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))
```

## Cost Optimization

- Use Reserved Instances for predictable workloads
- Enable Auto Scaling
- Use S3 Intelligent-Tiering for photos
- Enable CloudFront CDN
- Use Lambda for serverless functions

## Security

- Enable AWS WAF
- Use AWS Secrets Manager for sensitive data
- Enable VPC for ECS/EC2 deployments
- Configure IAM roles properly
- Enable CloudTrail for audit logs

## Support

For AWS-specific issues:
- AWS Support: https://aws.amazon.com/support
- AWS Documentation: https://docs.aws.amazon.com
