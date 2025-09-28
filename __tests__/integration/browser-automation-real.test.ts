import { PlaywrightBrowserService } from '../../src/infrastructure/browser/playwright-browser.service';
import { WebsiteConfig, WebsiteSelectors, AutomationConfig, SecurityConfig, CredentialsConfig } from '../../src/core/entities/website-config.entity';
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

  describe('Real Public Demo Site Tests', () => {

    describe('Practice Test Automation Site', () => {
      let browserService: PlaywrightBrowserService;
      let practiceConfig: WebsiteConfig;

      beforeAll(() => {
        // Set up environment for practice site
        process.env.PRACTICE_USERNAME = 'student';
        process.env.PRACTICE_PASSWORD = 'Password123';

        // Create real config for Practice Test Automation
        practiceConfig = new WebsiteConfig(
          'practice-login',
          'Practice Test Automation',
          'https://practicetestautomation.com/practice-test-login/',
          new WebsiteSelectors(
            ['#username'],
            ['#password'],
            ['#submit'],
            [],
            ['.post-title', 'h1']
          ),
          new AutomationConfig(false, 80, 30000, 3, 3000),
          new SecurityConfig(false, undefined, true, false, true, true, true),
          undefined,
          true,
          new CredentialsConfig('PRACTICE_USERNAME', 'PRACTICE_PASSWORD')
        );

        browserService = new PlaywrightBrowserService();
      });

      afterAll(async () => {
        if (browserService) {
          await browserService.cleanup();
        }
      });

      it('should successfully connect to practice site', async () => {
        const session = await browserService.createSession('test-user', practiceConfig);
        expect(session).toBeDefined();
        expect(session.page).toBeDefined();
        await browserService.closeSession(session.id);
      });

      it('should navigate to practice login page', async () => {
        const session = await browserService.createSession('test-user', practiceConfig);
        await browserService.navigateToLogin(session.page, practiceConfig);

        const url = session.page.url();
        expect(url).toContain('practicetestautomation.com');

        await browserService.closeSession(session.id);
      });

      it('should find login form elements on practice site', async () => {
        const session = await browserService.createSession('test-user', practiceConfig);
        await browserService.navigateToLogin(session.page, practiceConfig);

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
          ['#submit']
        );
        expect(loginButton).not.toBeNull();

        await browserService.closeSession(session.id);
      });

      it('should perform complete login flow on practice site', async () => {
        const startTime = Date.now();

        const session = await browserService.createSession('test-user', practiceConfig);
        const credentials = new AccountCredentials('student', 'Password123');

        await browserService.navigateToLogin(session.page, practiceConfig);
        await browserService.enterCredentials(session.page, credentials, practiceConfig);

        const loginSuccess = await browserService.performLogin(session.page, practiceConfig);

        const totalTime = Date.now() - startTime;
        console.log(`✅ Practice Test Automation total login time: ${totalTime}ms`);

        expect(loginSuccess).toBe(true);
        expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds

        await browserService.closeSession(session.id);
      }, 45000);

      it('should handle login failure with wrong credentials', async () => {
        const session = await browserService.createSession('test-user', practiceConfig);
        const wrongCredentials = new AccountCredentials('wronguser', 'wrongpass');

        await browserService.navigateToLogin(session.page, practiceConfig);
        await browserService.enterCredentials(session.page, wrongCredentials, practiceConfig);

        const loginSuccess = await browserService.performLogin(session.page, practiceConfig);

        expect(loginSuccess).toBe(false);

        await browserService.closeSession(session.id);
      }, 45000);
    });
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

  describe('Performance Comparison Tests', () => {
    let mockServer: Server;
    let localhostConfig: WebsiteConfig;
    let practiceConfig: WebsiteConfig;
    const PORT = 3335;

    beforeAll(async () => {
      mockServer = await startMockServerOnPort(PORT);

      localhostConfig = new WebsiteConfig(
        'localhost-test',
        'Localhost Mock Server',
        `http://localhost:${PORT}/login`,
        new WebsiteSelectors(
          ['#username'],
          ['#password'],
          ['#loginBtn'],
          [],
          ['.logout-link']
        ),
        new AutomationConfig(true, 50, 10000, 2, 1000),
        new SecurityConfig(false, undefined, true, false, false, false, false),
        undefined,
        true
      );

      practiceConfig = new WebsiteConfig(
        'practice-login',
        'Practice Test Automation',
        'https://practicetestautomation.com/practice-test-login/',
        new WebsiteSelectors(
          ['#username'],
          ['#password'],
          ['#submit'],
          [],
          ['.post-title']
        ),
        new AutomationConfig(false, 80, 30000, 3, 3000),
        new SecurityConfig(false, undefined, true, false, true, true, true),
        undefined,
        true
      );
    });

    afterAll(async () => {
      if (mockServer) {
        await new Promise(resolve => mockServer.close(resolve));
      }
    });

    it('should demonstrate speed difference between localhost and remote sites', async () => {
      // Test localhost
      const localhostStart = Date.now();
      const localhostSession = await browserService.createSession('localhost-test', localhostConfig);
      await browserService.navigateToLogin(localhostSession.page, localhostConfig);
      const localhostTime = Date.now() - localhostStart;
      await browserService.closeSession(localhostSession.id);

      // Test remote
      const remoteStart = Date.now();
      const remoteSession = await browserService.createSession('remote-test', practiceConfig);
      await browserService.navigateToLogin(remoteSession.page, practiceConfig);
      const remoteTime = Date.now() - remoteStart;
      await browserService.closeSession(remoteSession.id);

      console.log(`Performance comparison:
        Localhost: ${localhostTime}ms
        Remote: ${remoteTime}ms
        Difference: ${remoteTime - localhostTime}ms`);

      // Localhost should be faster
      expect(localhostTime).toBeLessThan(remoteTime);
    }, 60000);
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

async function startMockServerOnPort(port: number): Promise<Server> {
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

  const server = app.listen(port);

  // Wait a moment for server to start
  await new Promise(resolve => setTimeout(resolve, 100));

  return server;
}