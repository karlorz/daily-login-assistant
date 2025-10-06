import { PlaywrightBrowserService } from '../../src/infrastructure/browser/playwright-browser.service.js';
import { WebsiteConfig, WebsiteSelectors, AutomationConfig, SecurityConfig } from '../../src/core/entities/website-config.entity.js';
import { AccountCredentials } from '../../src/core/entities/account-credentials.entity.js';
import express from 'express';
import { Server } from 'http';

describe('Localhost Mock Server Tests', () => {
  let mockServer: Server;
  let browserService: PlaywrightBrowserService;
  let localhostConfig: WebsiteConfig;
  const PORT = 3334; // Use different port to avoid conflicts

  beforeAll(async () => {
    // Start express mock server
    const app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // Serve login page
    app.get('/login', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Mock Login Server</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .form-container { max-width: 400px; margin: 0 auto; }
            input, button { width: 100%; padding: 10px; margin: 5px 0; }
            .success { color: green; }
            .error { color: red; }
          </style>
        </head>
        <body>
          <div class="form-container">
            <h1>Mock Login Page</h1>
            <form method="post" action="/login">
              <input type="text" id="username" name="username" placeholder="Username" required />
              <input type="password" id="password" name="password" placeholder="Password" required />
              <button type="submit" id="loginBtn">Login</button>
            </form>
            <p>Test credentials: testuser / testpass</p>
          </div>
        </body>
        </html>
      `);
    });

    // Handle login submission
    app.post('/login', (req, res) => {
      const { username, password } = req.body;

      // Simulate some processing delay
      setTimeout(() => {
        if (username === 'testuser' && password === 'testpass') {
          res.send(`
            <html>
            <head><title>Dashboard</title></head>
            <body>
              <h1 class="success">Login Successful!</h1>
              <div class="user-profile">Welcome, ${username}!</div>
              <a href="/logout" class="logout-link">Logout</a>
              <div class="dashboard">You are now logged in to the mock system.</div>
            </body>
            </html>
          `);
        } else {
          res.status(401).send(`
            <html>
            <body>
              <h1 class="error">Login Failed</h1>
              <p>Invalid credentials. Please try again.</p>
              <a href="/login">Back to Login</a>
            </body>
            </html>
          `);
        }
      }, 100); // Small delay to simulate real server
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Start server
    mockServer = app.listen(PORT);

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 200));

    // Create configuration for localhost testing
    localhostConfig = new WebsiteConfig(
      'localhost-test',
      'Localhost Mock Server',
      `http://localhost:${PORT}/login`,
      new WebsiteSelectors(
        ['#username', '[name="username"]'],
        ['#password', '[name="password"]'],
        ['#loginBtn', '[type="submit"]'],
        [], // No check-in button
        ['.logout-link', '.user-profile'] // Success indicators
      ),
      new AutomationConfig(true, 50, 10000, 2, 1000),
      new SecurityConfig(false, undefined, true, false, false, false, false), // Minimal security for localhost
      undefined,
      true
    );

    browserService = new PlaywrightBrowserService();
  });

  afterAll(async () => {
    if (browserService) {
      await browserService.cleanup();
    }
    if (mockServer) {
      await new Promise(resolve => mockServer.close(resolve));
    }
  });

  describe('Mock Server Connectivity', () => {
    it('should verify mock server is running', async () => {
      const response = await fetch(`http://localhost:${PORT}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
    });

    it('should serve login page', async () => {
      const response = await fetch(`http://localhost:${PORT}/login`);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html).toContain('Mock Login Page');
      expect(html).toContain('id="username"');
      expect(html).toContain('id="password"');
    });
  });

  describe('Browser Automation with Localhost', () => {
    it('should connect to localhost much faster than remote sites', async () => {
      const startTime = Date.now();

      const session = await browserService.createSession('test-user', localhostConfig);
      await browserService.navigateToLogin(session.page, localhostConfig);

      const navigationTime = Date.now() - startTime;

      // Localhost should be very fast (first run might be slower due to browser initialization)
      expect(navigationTime).toBeLessThan(5000);
      console.log(`Localhost navigation time: ${navigationTime}ms`);

      await browserService.closeSession(session.id);
    });

    it('should find all login form elements on localhost', async () => {
      const session = await browserService.createSession('test-user', localhostConfig);

      await browserService.navigateToLogin(session.page, localhostConfig);

      // Verify all form elements are found
      const usernameElement = await browserService.findElementWithFallback(
        session.page,
        ['#username']
      );
      expect(usernameElement).not.toBeNull();

      const passwordElement = await browserService.findElementWithFallback(
        session.page,
        ['#password']
      );
      expect(passwordElement).not.toBeNull();

      const loginButton = await browserService.findElementWithFallback(
        session.page,
        ['#loginBtn']
      );
      expect(loginButton).not.toBeNull();

      await browserService.closeSession(session.id);
    });

    it('should successfully login with correct credentials on localhost', async () => {
      const session = await browserService.createSession('test-user', localhostConfig);
      const credentials = new AccountCredentials('testuser', 'testpass');

      await browserService.navigateToLogin(session.page, localhostConfig);
      await browserService.enterCredentials(session.page, credentials, localhostConfig);

      const loginSuccess = await browserService.performLogin(session.page, localhostConfig);

      expect(loginSuccess).toBe(true);

      // Verify we're on the success page
      const currentUrl = session.page.url();
      expect(currentUrl).toContain(`localhost:${PORT}`);

      await browserService.closeSession(session.id);
    });

    it('should fail login with incorrect credentials on localhost', async () => {
      const session = await browserService.createSession('test-user', localhostConfig);
      const wrongCredentials = new AccountCredentials('wronguser', 'wrongpass');

      await browserService.navigateToLogin(session.page, localhostConfig);
      await browserService.enterCredentials(session.page, wrongCredentials, localhostConfig);

      const loginSuccess = await browserService.performLogin(session.page, localhostConfig);

      expect(loginSuccess).toBe(false);

      await browserService.closeSession(session.id);
    });

    it('should handle rapid successive requests on localhost', async () => {
      const promises = [];

      // Create multiple sessions simultaneously
      for (let i = 0; i < 3; i++) {
        const testPromise = (async () => {
          const session = await browserService.createSession(`test-user-${i}`, localhostConfig);
          const credentials = new AccountCredentials('testuser', 'testpass');

          await browserService.navigateToLogin(session.page, localhostConfig);
          await browserService.enterCredentials(session.page, credentials, localhostConfig);
          const success = await browserService.performLogin(session.page, localhostConfig);

          await browserService.closeSession(session.id);
          return success;
        })();

        promises.push(testPromise);
      }

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });
  });

});