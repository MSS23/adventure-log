# Adventure Log - Production Dockerfile
# Use multi-stage build for optimal production image size

# Base stage - Install dependencies
FROM node:20-alpine AS base
LABEL maintainer="Adventure Log Team"
LABEL description="Adventure Log - Social Travel Platform"

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install system dependencies for node-gyp and native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Development stage - Install all dependencies including devDependencies
FROM base AS dev-deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies for building
RUN npm ci --ignore-scripts

# Build stage - Build the application
FROM base AS builder
WORKDIR /app

# Copy all dependencies
COPY --from=dev-deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set environment to production for build optimizations
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
# Generate a standalone build for better containerization
RUN npm run build

# Production stage - Run the application
FROM base AS runner
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application from builder stage
COPY --from=builder /app/public ./public

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create necessary directories with proper permissions
RUN mkdir -p /app/.next/cache
RUN chown -R nextjs:nodejs /app/.next

# Switch to non-root user
USER nextjs

# Expose the port
EXPOSE 3000

# Set hostname
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node --version || exit 1

# Start the application
CMD ["node", "server.js"]