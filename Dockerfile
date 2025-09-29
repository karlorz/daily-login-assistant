# Use Playwright Docker image as base (same as CI)
ARG DOCKER_IMAGE_NAME_TEMPLATE="mcr.microsoft.com/playwright:v1.55.0-noble"
FROM ${DOCKER_IMAGE_NAME_TEMPLATE}

# Build arguments for customization
ARG DEBIAN_FRONTEND=noninteractive
ARG TZ
ENV TZ="$TZ"

# Set shell options for pipe safety
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install unzip required for Bun, then install Bun runtime globally
RUN apt-get update && apt-get install -y unzip && \
    curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Add Bun to PATH
ENV PATH="/usr/local/bin:${PATH}"

# Switch to pwuser for all package operations
USER pwuser

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=pwuser:pwuser package*.json bun.lock ./

# Install dependencies as pwuser
RUN bun install

# Copy source code and create directories, then build
COPY --chown=pwuser:pwuser . .
RUN mkdir -p profiles logs screenshots && bun run build

# Expose port for health checks
EXPOSE 3001

# Health check
# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
#   CMD curl -f http://localhost:8080/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV WORKER_ID=worker-1

# Start the application
CMD ["bun", "dist/index.js"]