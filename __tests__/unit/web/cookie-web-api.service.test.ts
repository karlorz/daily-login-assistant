/**
 * Unit tests for CookieWebApiService
 * Tests SSH port configuration and environment variable defaults
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CookieWebApiService } from '../../../src/infrastructure/web/cookie-web-api.service.js';
import path from 'path';
import fs from 'fs';

// Skip these tests in Jest (requires Bun runtime)
const describeOrSkip = typeof Bun !== 'undefined' ? describe : describe.skip;

describeOrSkip('CookieWebApiService', () => {
  let service: CookieWebApiService;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;

    // Stop service if running
    if (service) {
      await service.stop();
    }
  });

  describe('Environment Variable Defaults', () => {
    it('should default to port 22 for REMOTE_SSH_PORT', () => {
      delete process.env.REMOTE_SSH_PORT;
      service = new CookieWebApiService();

      // We'll verify this in the script generation test below
      expect(service).toBeDefined();
    });

    it('should use port 3001 for PWA_PORT by default', () => {
      delete process.env.PWA_PORT;
      delete process.env.WEB_API_PORT;
      service = new CookieWebApiService();

      expect(service).toBeDefined();
    });

    it('should prioritize PWA_PORT over WEB_API_PORT', () => {
      process.env.PWA_PORT = '4001';
      process.env.WEB_API_PORT = '5001';
      service = new CookieWebApiService();

      expect(service).toBeDefined();
    });

    it('should respect REMOTE_SSH_PORT environment override', () => {
      process.env.REMOTE_SSH_PORT = '2222';
      service = new CookieWebApiService();

      expect(service).toBeDefined();
    });

    it('should respect REMOTE_SSH_HOST environment override', () => {
      process.env.REMOTE_SSH_HOST = 'custom.example.com';
      service = new CookieWebApiService();

      expect(service).toBeDefined();
    });
  });

  describe('SSH Port Configuration in Generated Scripts', () => {
    const templatesDir = path.join(process.cwd(), 'scripts', 'templates');
    const testTemplate = `#!/bin/bash
SESSION_TOKEN={{SESSION_TOKEN}}
REMOTE_SSH_HOST={{REMOTE_SSH_HOST}}
REMOTE_SSH_PORT={{REMOTE_SSH_PORT}}
REMOTE_SSH_USER={{REMOTE_SSH_USER}}
SSH_PASSWORD={{SSH_PASSWORD}}
API_ENDPOINT={{API_ENDPOINT}}
ALLOWED_ORIGIN={{ALLOWED_ORIGIN}}
`;

    beforeEach(() => {
      // Create test templates directory if needed
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }
      // Write test template
      fs.writeFileSync(path.join(templatesDir, 'launcher.sh'), testTemplate);
    });

    it('should generate script with port 22 by default (production)', async () => {
      delete process.env.REMOTE_SSH_PORT;
      delete process.env.REMOTE_SSH_HOST;
      service = new CookieWebApiService();

      // Start service to test script generation via HTTP
      await service.start();

      // Create a session
      const sessionResponse = await fetch('http://localhost:3001/api/session/create', {
        method: 'POST',
      });
      const sessionData = await sessionResponse.json() as { token: string };

      // Generate script
      const scriptResponse = await fetch(
        `http://localhost:3001/api/session/${sessionData.token}/script/linux`
      );
      const scriptContent = await scriptResponse.text();

      // Verify port 22 is in the script (not 2222)
      expect(scriptContent).toContain('REMOTE_SSH_PORT=22');
      expect(scriptContent).not.toContain('REMOTE_SSH_PORT=2222');
    });

    it('should generate script with custom port when REMOTE_SSH_PORT is set', async () => {
      process.env.REMOTE_SSH_PORT = '2222';
      service = new CookieWebApiService();

      await service.start();

      // Create session
      const sessionResponse = await fetch('http://localhost:3001/api/session/create', {
        method: 'POST',
      });
      const sessionData = await sessionResponse.json() as { token: string };

      // Generate script
      const scriptResponse = await fetch(
        `http://localhost:3001/api/session/${sessionData.token}/script/linux`
      );
      const scriptContent = await scriptResponse.text();

      // Verify custom port 2222 is used
      expect(scriptContent).toContain('REMOTE_SSH_PORT=2222');
    });

    it('should generate script with custom hostname when REMOTE_SSH_HOST is set', async () => {
      process.env.REMOTE_SSH_HOST = 'dailycheckin.lan';
      service = new CookieWebApiService();

      await service.start();

      // Create session
      const sessionResponse = await fetch('http://localhost:3001/api/session/create', {
        method: 'POST',
      });
      const sessionData = await sessionResponse.json() as { token: string };

      // Generate script
      const scriptResponse = await fetch(
        `http://localhost:3001/api/session/${sessionData.token}/script/linux`
      );
      const scriptContent = await scriptResponse.text();

      // Verify custom hostname is used
      expect(scriptContent).toContain('REMOTE_SSH_HOST=dailycheckin.lan');
    });

    it('should use default anyrouter.top when REMOTE_SSH_HOST is not set', async () => {
      delete process.env.REMOTE_SSH_HOST;
      service = new CookieWebApiService();

      await service.start();

      // Create session
      const sessionResponse = await fetch('http://localhost:3001/api/session/create', {
        method: 'POST',
      });
      const sessionData = await sessionResponse.json() as { token: string };

      // Generate script
      const scriptResponse = await fetch(
        `http://localhost:3001/api/session/${sessionData.token}/script/linux`
      );
      const scriptContent = await scriptResponse.text();

      // Verify default hostname
      expect(scriptContent).toContain('REMOTE_SSH_HOST=anyrouter.top');
    });
  });

  describe('SSH Configuration Regression Tests', () => {
    it('should NEVER default to port 2222 (regression test for production bug)', async () => {
      // This test ensures the bug we fixed never comes back
      delete process.env.REMOTE_SSH_PORT;
      delete process.env.REMOTE_SSH_HOST;

      service = new CookieWebApiService();
      await service.start();

      // Create session
      const sessionResponse = await fetch('http://localhost:3001/api/session/create', {
        method: 'POST',
      });
      const sessionData = await sessionResponse.json() as { token: string };

      // Generate script
      const scriptResponse = await fetch(
        `http://localhost:3001/api/session/${sessionData.token}/script/linux`
      );
      const scriptContent = await scriptResponse.text();

      // CRITICAL: Must be port 22 for production LXC compatibility
      expect(scriptContent).toContain('REMOTE_SSH_PORT=22');

      // CRITICAL: Must NOT default to port 2222
      expect(scriptContent).not.toContain('REMOTE_SSH_PORT=2222');
    });

    it('should allow development override to port 2222', async () => {
      // Development should still be able to use port 2222 via env var
      process.env.REMOTE_SSH_PORT = '2222';
      process.env.REMOTE_SSH_HOST = 'localhost';

      service = new CookieWebApiService();
      await service.start();

      // Create session
      const sessionResponse = await fetch('http://localhost:3001/api/session/create', {
        method: 'POST',
      });
      const sessionData = await sessionResponse.json() as { token: string };

      // Generate script
      const scriptResponse = await fetch(
        `http://localhost:3001/api/session/${sessionData.token}/script/linux`
      );
      const scriptContent = await scriptResponse.text();

      // Development override should work
      expect(scriptContent).toContain('REMOTE_SSH_PORT=2222');
      expect(scriptContent).toContain('REMOTE_SSH_HOST=localhost');
    });
  });

  describe('API Endpoint Configuration', () => {
    it('should auto-detect API endpoint based on REMOTE_SSH_HOST and port', async () => {
      process.env.REMOTE_SSH_HOST = 'dailycheckin.lan';
      process.env.PWA_PORT = '8001';

      service = new CookieWebApiService();
      await service.start();

      // Create session (connect to port 8001 since PWA_PORT=8001)
      const sessionResponse = await fetch('http://localhost:8001/api/session/create', {
        method: 'POST',
      });
      const sessionData = await sessionResponse.json() as { token: string };

      // Generate script
      const scriptResponse = await fetch(
        `http://localhost:8001/api/session/${sessionData.token}/script/linux`
      );
      const scriptContent = await scriptResponse.text();

      // Verify API endpoint is auto-configured
      expect(scriptContent).toContain('API_ENDPOINT=http://dailycheckin.lan:');
    });

    it('should respect API_ENDPOINT environment override', async () => {
      process.env.API_ENDPOINT = 'http://custom.example.com:9999/api/tunnel-ready';

      service = new CookieWebApiService();
      await service.start();

      // Create session
      const sessionResponse = await fetch('http://localhost:3001/api/session/create', {
        method: 'POST',
      });
      const sessionData = await sessionResponse.json() as { token: string };

      // Generate script
      const scriptResponse = await fetch(
        `http://localhost:3001/api/session/${sessionData.token}/script/linux`
      );
      const scriptContent = await scriptResponse.text();

      // Verify custom endpoint is used
      expect(scriptContent).toContain('API_ENDPOINT=http://custom.example.com:9999/api/tunnel-ready');
    });
  });

  describe('PWA Port Configuration', () => {
    it('should use PWA_PORT when both PWA_PORT and WEB_API_PORT are set', async () => {
      process.env.PWA_PORT = '4001';
      process.env.WEB_API_PORT = '5001';

      service = new CookieWebApiService();
      await service.start();

      // Verify server started on PWA_PORT (4001) using API endpoint
      const sessionResponse = await fetch('http://localhost:4001/api/session/create', {
        method: 'POST',
      });
      expect(sessionResponse.status).toBe(201);

      // Verify WEB_API_PORT is not used
      await expect(fetch('http://localhost:5001/api/session/create', { method: 'POST' }))
        .rejects.toThrow();
    });

    it('should fall back to WEB_API_PORT when PWA_PORT is not set', async () => {
      delete process.env.PWA_PORT;
      process.env.WEB_API_PORT = '5001';

      service = new CookieWebApiService();
      await service.start();

      // Verify server started on WEB_API_PORT (5001) using API endpoint
      const sessionResponse = await fetch('http://localhost:5001/api/session/create', {
        method: 'POST',
      });
      expect(sessionResponse.status).toBe(201);
    });

    it('should default to 3001 when neither PWA_PORT nor WEB_API_PORT is set', async () => {
      delete process.env.PWA_PORT;
      delete process.env.WEB_API_PORT;

      service = new CookieWebApiService();
      await service.start();

      // Verify server started on default port 3001 using API endpoint
      const sessionResponse = await fetch('http://localhost:3001/api/session/create', {
        method: 'POST',
      });
      expect(sessionResponse.status).toBe(201);
    });
  });
});
