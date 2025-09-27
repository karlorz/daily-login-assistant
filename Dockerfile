# Use official Node.js runtime as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies required by Playwright
RUN apk add --no-cache \
    dumb-init \
    python3 \
    make \
    g++ \
    nasm \
    autoconf \
    automake \
    libtool \
    nss \
    nspr \
    at-spi2-atk \
    gtk3 \
    gdk-pixbuf \
    cups-libs \
    xrandr \
    xvfb \
    dbus-glib \
    alsa-lib \
    mesa-dri-swrast \
    mesa-gl \
    libgbm \
    libxkbcommon \
    libxcomposite \
    libxdamage \
    libxfixes \
    libxrandr \
    libxrender \
    libxtst \
    libxss \
    libxt \
    libxi \
    libxext \
    libx11 \
    libc6-compat \
    libnss3 \
    libnspr4 \
    libasound2 \
    libatk-bridge-2.0 \
    libdrm2 \
    libxkbcommon-x11-0 \
    libgtk-3-0 \
    libgdk-pixbuf-2.0 \
    libgconf-2-4 \
    libxss1 \
    libxtst6 \
    libgconf-2-4 \
    libnss3 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxdamage1 \
    libxfixes3 \
    libcairo2 \
    libcups2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libxtst6

# Copy package files
COPY package*.json bun.lock ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create directories for profiles and logs
RUN mkdir -p profiles logs screenshots

# Build the application
RUN npm run build

# Install Playwright browsers
RUN npx playwright install --with-deps

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bot -u 1001

# Change ownership of app directory
RUN chown -R bot:nodejs /app
USER bot

# Expose port for health checks
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV WORKER_ID=worker-1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]