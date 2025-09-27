# Build stage
FROM oven-sh/bun:latest AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies using Bun
RUN bun install --frozen-lockfile

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN bun run build

# Production stage
FROM oven-sh/bun:slim

# Install shoutrrr (nicholas-fedor fork)
RUN apt-get update && apt-get install -y wget && \
    wget -O /usr/local/bin/shoutrrr https://github.com/nicholas-fedor/shoutrrr/releases/latest/download/shoutrrr_linux_amd64 && \
    chmod +x /usr/local/bin/shoutrrr && \
    apt-get remove -y wget && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy config directory
COPY config/ ./config/

# Create directories for volumes
RUN mkdir -p profiles logs

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD ps aux | grep -v grep | grep -q node || exit 1

# Environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Start application
CMD ["bun", "run", "start"]