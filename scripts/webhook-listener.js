#!/usr/bin/env node

/**
 * Simple Webhook Listener for Testing Notifications
 * Receives notifications from shoutrrr and logs them
 */

import http from 'http';
import fs from 'fs';

const PORT = process.env.WEBHOOK_PORT || 3001;
const LOG_FILE = '/tmp/daily-login-notifications.log';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m'
};

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      const timestamp = new Date().toISOString();

      try {
        // Try to parse as JSON
        const data = JSON.parse(body);

        // Console output with colors
        console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.green}📧 Webhook Received${colors.reset} - ${timestamp}`);
        console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.yellow}Title:${colors.reset} ${data.title || 'N/A'}`);
        console.log(`${colors.yellow}Message:${colors.reset}\n${data.message || data.text || 'N/A'}`);

        if (data.profile) {
          console.log(`${colors.yellow}Profile:${colors.reset} ${data.profile}`);
        }

        if (data.error) {
          console.log(`${colors.red}Error:${colors.reset} ${data.error}`);
        }

        console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}\n`);

        // Log to file
        const logEntry = {
          timestamp,
          title: data.title,
          message: data.message || data.text,
          profile: data.profile,
          error: data.error,
          raw: data
        };

        fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry, null, 2) + '\n---\n');

      } catch {
        // Not JSON, log raw body
        console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.green}📧 Webhook Received${colors.reset} - ${timestamp}`);
        console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.yellow}Raw Body:${colors.reset}\n${body}`);
        console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}\n`);

        // Log to file
        fs.appendFileSync(LOG_FILE, `[${timestamp}] ${body}\n---\n`);
      }

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    });

  } else if (req.method === 'GET') {
    // Health check
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Webhook listener is running');
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method not allowed');
  }
});

server.listen(PORT, () => {
  console.log(`${colors.green}✅ Webhook listener started${colors.reset}`);
  console.log(`${colors.yellow}📡 Listening on:${colors.reset} http://localhost:${PORT}`);
  console.log(`${colors.yellow}📝 Logging to:${colors.reset} ${LOG_FILE}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // Clear log file on start
  fs.writeFileSync(LOG_FILE, `Webhook listener started at ${new Date().toISOString()}\n---\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}🛑 Shutting down webhook listener...${colors.reset}`);
  server.close(() => {
    console.log(`${colors.green}✅ Webhook listener stopped${colors.reset}`);
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log(`\n${colors.yellow}🛑 Shutting down webhook listener...${colors.reset}`);
  server.close(() => {
    console.log(`${colors.green}✅ Webhook listener stopped${colors.reset}`);
    process.exit(0);
  });
});
