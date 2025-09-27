# Playwright + Node.js Detailed Solution for Daily Login Assistant Bot

## Introduction
This document provides a detailed implementation guide for the recommended approach using Playwright with Node.js. It covers setting up a headless browser automation script for daily website login and check-in tasks, with persistent profile management for session handling. The solution is containerized using Docker for Ubuntu-like environments (via Alpine for minimalism). Key features include:
- Persistent browser contexts for session persistence (e.g., cookies, local storage).
- Headless operation.
- Anti-bot evasion using stealth plugins.
- Secure credential handling with encryption.
- Daily scheduling via cron inside the Docker container.
- Monitoring and logging.

This is based on 2025 best practices from Playwright documentation, tutorials, and community resources.

## Project Structure
```
daily-login-assistant/
├── src/
│   ├── config/
│   │   ├── accounts.json          # Encrypted account credentials
│   │   └── settings.yaml          # Bot configuration (e.g., URLs, selectors)
│   ├── profiles/                  # Mounted volume for persistent profiles (e.g., profile1/, profile2/)
│   ├── scripts/
│   │   ├── login-automation.js    # Main script for login and check-in
│   │   └── utils.js               # Helpers for encryption, logging, etc.
│   └── logs/
│       └── app.log                # Application logs
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .dockerignore                  # Ignore node_modules, etc.
└── .env.example                   # Example env vars (e.g., ENCRYPTION_KEY)
```

## Dependencies (package.json)
```json
{
  "name": "daily-login-assistant",
  "version": "1.0.0",
  "main": "src/scripts/login-automation.js",
  "dependencies": {
    "playwright": "^1.47.0",
    "playwright-extra": "^4.3.6",
    "puppeteer-extra-plugin-stealth": "^2.11.2",
    "js-yaml": "^4.1.0",
    "crypto-js": "^4.2.0",
    "winston": "^3.14.2"
  },
  "devDependencies": {
    "@types/node": "^22.5.5"
  }
}
```
- Install with `npm install`.
- `playwright-extra` and `stealth` for anti-bot evasion.
- `crypto-js` for AES encryption of credentials.
- `winston` for logging.
- `js-yaml` for parsing settings.

## Configuration Files

### settings.yaml
```yaml
websites:
  - id: site1
    url: https://example.com/login
    usernameSelector: '#username'
    passwordSelector: '#password'
    loginButtonSelector: '#loginButton'
    checkinSelector: '.check-in-btn'  # Selector for check-in action
    profileDir: profile1
general:
  headless: true
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36'
  delay: 100  # ms delay for typing to mimic human
```

### accounts.json (Encrypted)
Store credentials encrypted. Example plaintext structure before encryption:
```json
[
  {
    "id": "account1",
    "username": "user@example.com",
    "password": "securepass",
    "websiteId": "site1"
  }
]
```
Encrypt using utils.js (see below).

## Utils.js (Helpers)
```javascript
const crypto = require('crypto-js');
const yaml = require('js-yaml');
const fs = require('fs');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [
    new winston.transports.File({ filename: 'src/logs/app.log' })
  ]
});

function loadConfig() {
  return yaml.load(fs.readFileSync('src/config/settings.yaml', 'utf8'));
}

function decryptCredentials() {
  const encrypted = fs.readFileSync('src/config/accounts.json', 'utf8');
  const bytes = crypto.AES.decrypt(encrypted, process.env.ENCRYPTION_KEY);
  return JSON.parse(bytes.toString(crypto.enc.Utf8));
}

function encryptCredentials(plaintext) {
  const ciphertext = crypto.AES.encrypt(JSON.stringify(plaintext), process.env.ENCRYPTION_KEY).toString();
  fs.writeFileSync('src/config/accounts.json', ciphertext);
}

module.exports = { logger, loadConfig, decryptCredentials, encryptCredentials };
```

- Use `node utils.js` to encrypt initial credentials (adapt as script).
- Environment variable `ENCRYPTION_KEY` for AES-256.

## Login-Automation.js (Main Script)
This script handles profile loading, login, check-in, and runs once (scheduled via cron).
```javascript
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const { loadConfig, decryptCredentials, logger } = require('./utils');

chromium.use(stealth());

async function runAutomation() {
  const config = loadConfig();
  const accounts = decryptCredentials();

  for (const account of accounts) {
    const siteConfig = config.websites.find(w => w.id === account.websiteId);
    if (!siteConfig) continue;

    const profileDir = path.join('src/profiles', siteConfig.profileDir);
    logger.info(`Starting automation for account: ${account.id}`);

    const context = await chromium.launchPersistentContext(profileDir, {
      headless: config.general.headless,
      args: ['--no-sandbox', '--disable-gpu', '--enable-webgl'],
      userAgent: config.general.userAgent
    });

    const page = await context.newPage();
    await page.goto(siteConfig.url, { waitUntil: 'networkidle' });

    // Check if already logged in (e.g., look for logout button)
    const isLoggedIn = await page.isVisible('.logout-btn'); // Customize selector
    if (!isLoggedIn) {
      await page.type(siteConfig.usernameSelector, account.username, { delay: config.general.delay });
      await page.type(siteConfig.passwordSelector, account.password, { delay: config.general.delay });
      await page.click(siteConfig.loginButtonSelector);
      logger.info(`Logged in for ${account.id}`);
    } else {
      logger.info(`Session persisted for ${account.id}`);
    }

    // Perform check-in
    await page.waitForSelector(siteConfig.checkinSelector);
    await page.click(siteConfig.checkinSelector);
    logger.info(`Check-in completed for ${account.id}`);

    await context.close();
  }
}

runAutomation().catch(err => logger.error(err));
```

- Adapt selectors to target site.
- For CAPTCHA, integrate 2Captcha as in examples (add dependency and API key).
- Runs in loop for multiple accounts.

## Dockerfile
Multi-stage build for optimization, with cron for scheduling.
```dockerfile
# Builder stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Final stage
FROM node:20-alpine
RUN apk add --no-cache chromium nss cron
WORKDIR /app
COPY --from=builder /app /app

# Non-root user
RUN addgroup -g 1001 nodejs && adduser -S nodeapp -u 1001 && \
    chown -R nodeapp:nodejs /app && \
    mkdir -p /app/src/profiles && chown -R nodeapp:nodejs /app/src/profiles && \
    mkdir -p /app/src/logs && chown -R nodeapp:nodejs /app/src/logs

USER nodeapp

# Set up cron (daily at 8 AM)
RUN echo "0 8 * * * node /app/src/scripts/login-automation.js >> /app/src/logs/app.log 2>&1" > /etc/crontabs/nodeapp

CMD ["crond", "-f", "-d", "8"]
```

- Installs cron and Chromium.
- Schedules daily run.
- Mount profiles and logs as volumes.

## docker-compose.yml
```yaml
version: '3.9'
services:
  login-bot:
    build: .
    volumes:
      - ./src/profiles:/app/src/profiles
      - ./src/logs:/app/src/logs
      - /dev/shm:/dev/shm
    environment:
      - NODE_ENV=production
      - ENCRYPTION_KEY=your-secret-key-here
    restart: unless-stopped
    user: "1001:1001"
```

## Build and Run
- Build: `docker-compose build`
- Run: `docker-compose up -d`
- Logs: Check `src/logs/app.log` or `docker logs <container>`

## Security and Best Practices
- **Credentials**: Always encrypt; use env vars.
- **Anti-Bot**: Stealth plugin evades detection.
- **Persistence**: Profiles persist sessions; clean unused ones periodically.
- **Error Handling**: Add retries (e.g., via try-catch).
- **Monitoring**: Integrate webhooks for failures (e.g., Slack via axios).
- **Updates**: Pin Playwright version; update regularly.

This solution is scalable for multiple sites/accounts. Test locally with `node src/scripts/login-automation.js` before Dockerizing. For site-specific tweaks, inspect elements.