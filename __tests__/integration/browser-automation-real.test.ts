import { PlaywrightBrowserService } from '../../src/infrastructure/browser/playwright-browser.service';
import { WebsiteConfig, WebsiteSelectors, AutomationConfig, SecurityConfig } from '../../src/core/entities/website-config.entity';
import { AccountCredentials } from '../../src/core/entities/account-credentials.entity';
import express from 'express';
import { Server } from 'http';

describe('Browser Automation Integration Tests', () => {
  let browserService: PlaywrightBrowserService;

  beforeAll(() => {
    browserService = new PlaywrightBrowserService();
  });

  afterAll(async () => {
    if (browserService) {
      await browserService.cleanup();
    }
  });

  
  describe('Localhost Mock Server Tests', () => {
    let mockServer: Server;
    let localhostConfig: WebsiteConfig;
    const PORT = 3333;

    beforeAll(async () => {
      mockServer = await startMockServer();

      // Create configuration for localhost testing
      localhostConfig = new WebsiteConfig(
        'localhost-test',
        'Localhost Mock Server',
        `http://localhost:${PORT}/login`,
        new WebsiteSelectors(
          ['#username', '[name="username"]'],
          ['#password', '[name="password"]'],
          ['#loginBtn', '[type="submit"]'],
          [],
          ['.logout-link', '.user-profile']
        ),
        new AutomationConfig(true, 50, 10000, 2, 1000),
        new SecurityConfig(false, undefined, true, false, false, false, false),
        undefined,
        true
      );
    });

    afterAll(async () => {
      if (mockServer) {
        await new Promise(resolve => mockServer.close(resolve));
      }
    });

    it('should connect to localhost mock server faster than remote sites', async () => {
      const startTime = Date.now();

      const session = await browserService.createSession('test-user', localhostConfig);
      await browserService.navigateToLogin(session.page, localhostConfig);

      const navigationTime = Date.now() - startTime;

      // Localhost should be very fast
      expect(navigationTime).toBeLessThan(5000);
      console.log(`Localhost navigation time: ${navigationTime}ms`);

      await browserService.closeSession(session.id);
    });

    it('should perform login on localhost mock server', async () => {
      const session = await browserService.createSession('test-user', localhostConfig);
      const credentials = new AccountCredentials('testuser', 'testpass');

      await browserService.navigateToLogin(session.page, localhostConfig);
      await browserService.enterCredentials(session.page, credentials, localhostConfig);

      const loginSuccess = await browserService.performLogin(session.page, localhostConfig);

      expect(loginSuccess).toBe(true);

      await browserService.closeSession(session.id);
    });
});

async function startMockServer(): Promise<Server> {
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
    if (username === 'testuser' && password === 'testpass') {
      res.send(`
        <html>
        <body>
          <h1>Login Successful</h1>
          <a href="/logout" class="logout-link">Logout</a>
          <div class="user-profile">Welcome, ${username}!</div>
        </body>
        </html>
      `);
    } else {
      res.status(401).send('<html><body><h1>Login Failed</h1></body></html>');
    }
  });

  const server = app.listen(3333);

  // Wait a moment for server to start
  await new Promise(resolve => setTimeout(resolve, 100));

  return server;
}
});