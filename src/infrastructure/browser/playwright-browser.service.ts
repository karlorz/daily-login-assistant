import { injectable } from 'inversify';
import { chromium, Browser, BrowserContext, Page, Locator } from 'playwright';
import type { IBrowserService } from '../../core/interfaces/browser.service.interface';
import { WebsiteConfig, AccountCredentials, BrowserSession } from '../../core/entities';
import path from 'path';
import fs from 'fs';

@injectable()
export class PlaywrightBrowserService implements IBrowserService {
  private browser: Browser | null = null;
  private sessions: Map<string, BrowserSession> = new Map();

  async createSession(accountId: string, websiteConfig: WebsiteConfig): Promise<BrowserSession> {
    if (!this.browser) {
      await this.initializeBrowser();
    }

    const profileDir = path.join(process.cwd(), 'profiles', `${websiteConfig.id}_${accountId}`);

    // Ensure profile directory exists
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    const context = await this.browser!.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      // Add stealth settings if enabled
      ...(websiteConfig.security?.useStealth && {
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }),
    });

    // Apply stealth techniques if enabled
    if (websiteConfig.security?.useStealth) {
      await this.applyStealth(context);
    }

    const page = await context.newPage();

    // Set default timeouts with CI multiplier
    const timeoutMultiplier = this.getCITimeoutMultiplier();
    page.setDefaultTimeout((websiteConfig.automation?.navigationTimeout || 30000) * timeoutMultiplier);
    page.setDefaultNavigationTimeout((websiteConfig.automation?.navigationTimeout || 30000) * timeoutMultiplier);

    const sessionId = `${accountId}_${websiteConfig.id}_${Date.now()}`;
    const session = new BrowserSession(
      sessionId,
      context,
      page,
      accountId,
      websiteConfig.id
    );

    this.sessions.set(sessionId, session);
    return session;
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.close();
      this.sessions.delete(sessionId);
    }
  }

  async navigateToLogin(page: Page, websiteConfig: WebsiteConfig): Promise<void> {
    console.log(`Navigating to ${websiteConfig.url}`);

    const timeoutMultiplier = this.getCITimeoutMultiplier();
    const timeout = (websiteConfig.automation?.navigationTimeout || 30000) * timeoutMultiplier;

    // In CI, use domcontentloaded instead of networkidle for more reliable navigation
    const waitUntil = process.env.CI === 'true' ? 'domcontentloaded' :
      (websiteConfig.automation?.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded');

    try {
      await page.goto(websiteConfig.url, {
        waitUntil: waitUntil,
        timeout: timeout
      });
    } catch (error) {
      // If networkidle fails in CI, fallback to domcontentloaded
      if (process.env.CI === 'true' && waitUntil === 'domcontentloaded') {
        console.log('Navigation failed, retrying with shorter timeout...');
        await page.goto(websiteConfig.url, {
          waitUntil: 'domcontentloaded',
          timeout: Math.min(timeout, 15000)
        });
      } else {
        throw error;
      }
    }

    // Wait for page to be fully loaded in CI environments
    if (process.env.CI === 'true') {
      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        await page.waitForTimeout(3000); // Extra wait for CI stability
      } catch {
        console.log('Wait for load state failed, continuing anyway...');
      }
    }

    // Add random delay for anti-detection (but skip in CI for speed)
    if (websiteConfig.security?.randomDelays && process.env.CI !== 'true') {
      await this.randomDelay(1000, 3000);
    }
  }

  async enterCredentials(
    page: Page,
    credentials: AccountCredentials,
    websiteConfig: WebsiteConfig
  ): Promise<void> {
    console.log('Entering credentials...');

    // Find and fill username field
    const usernameElement = await this.findElementWithFallback(page, websiteConfig.selectors.username);
    if (usernameElement) {
      await this.humanLikeType(usernameElement as Locator, credentials.username, websiteConfig);
    } else {
      throw new Error('Username field not found');
    }

    // Add delay between fields
    if (websiteConfig.security?.randomDelays) {
      await this.randomDelay(500, 1500);
    }

    // Find and fill password field
    const passwordElement = await this.findElementWithFallback(page, websiteConfig.selectors.password);
    if (passwordElement) {
      await this.humanLikeType(passwordElement as Locator, credentials.password, websiteConfig);
    } else {
      throw new Error('Password field not found');
    }
  }

  async performLogin(page: Page, websiteConfig: WebsiteConfig): Promise<boolean> {
    console.log('Performing login...');

    try {
      // Find and click login button
      const loginButton = await this.findElementWithFallback(page, websiteConfig.selectors.loginButton);
      if (!loginButton) {
        throw new Error('Login button not found');
      }

      // Add random delay before clicking
      if (websiteConfig.security?.randomDelays) {
        await this.randomDelay(500, 1500);
      }

      await (loginButton as Locator).click();

      // Wait for navigation or login completion
      if (websiteConfig.automation?.waitForNetworkIdle) {
        // In CI, use shorter timeout and fallback to domcontentloaded
        if (process.env.CI === 'true') {
          try {
            await page.waitForLoadState('networkidle', { timeout: 10000 });
          } catch {
            console.log('Network idle wait failed, falling back to domcontentloaded...');
            await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
          }
        } else {
          await page.waitForLoadState('networkidle', { timeout: 15000 });
        }
      } else {
        await page.waitForTimeout(3000);
      }

      // Check if login was successful
      return await this.isAlreadyLoggedIn(page, websiteConfig);
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  async performCheckin(page: Page, websiteConfig: WebsiteConfig): Promise<boolean> {
    console.log('Attempting daily check-in...');

    try {
      // Look for check-in button
      const checkinButton = await this.findElementWithFallback(page, websiteConfig.selectors.checkinButton || []);
      if (!checkinButton) {
        console.log('No check-in button found');
        return false;
      }

      // Add random delay before clicking
      if (websiteConfig.security?.randomDelays) {
        await this.randomDelay(500, 1500);
      }

      await (checkinButton as Locator).click();

      // Wait for check-in to complete
      await page.waitForTimeout(2000);

      console.log('Daily check-in completed');
      return true;
    } catch (error) {
      console.error('Check-in failed:', error);
      return false;
    }
  }

  async isAlreadyLoggedIn(page: Page, websiteConfig: WebsiteConfig): Promise<boolean> {
    try {
      // Look for logout indicator or user profile elements
      const logoutIndicator = await this.findElementWithFallback(
        page,
        websiteConfig.selectors.logoutIndicator || []
      );

      if (logoutIndicator) {
        const isVisible = await (logoutIndicator as Locator).isVisible();
        return isVisible;
      }

      // Alternative: check if we're not on login page anymore
      const currentUrl = page.url();
      const loginUrl = websiteConfig.url;

      return !currentUrl.includes(new URL(loginUrl).pathname);
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  }

  async findElementWithFallback(page: Page, selectors: string[]): Promise<Locator | null> {
    for (const selector of selectors) {
      try {
        const element = page.locator(selector);
        const count = await element.count();
        if (count > 0) {
          return element.first();
        }
      } catch (error) {
        console.log(`Selector failed: ${selector}`, error);
        continue;
      }
    }
    return null;
  }

  async takeScreenshot(page: Page, name: string): Promise<string> {
    const screenshotsDir = path.join(process.cwd(), 'logs', 'screenshots');

    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const filename = `${name}_${Date.now()}.png`;
    const filepath = path.join(screenshotsDir, filename);

    await page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  }

  private shouldRunHeadless(): boolean {
    // Check explicit HEADLESS environment variable first
    if (process.env.HEADLESS !== undefined) {
      return process.env.HEADLESS.toLowerCase() === 'true';
    }

    // Default to headless in test, production, and CI environments
    const env = process.env.NODE_ENV;
    const isCI = process.env.CI === 'true';
    return env === 'test' || env === 'production' || isCI;
  }

  private getCITimeoutMultiplier(): number {
    return process.env.CI === 'true' ?
      parseInt(process.env.CI_TIMEOUT_MULTIPLIER || '4', 10) : 1;
  }

  private getCIBrowserArgs(): string[] {
    const baseArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ];

    // Add additional CI-specific flags for better stability
    if (process.env.CI === 'true') {
      return [
        ...baseArgs,
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-javascript-harmony-promises',
        '--disable-javascript-harmony-proxies',
        '--disable-background-mode',
        '--disable-component-update',
        '--disable-domain-reliability',
        '--disable-features=AutofillServerCommunication',
        '--disable-features=InterestFeedContent',
        '--disable-features=OptimizationHints',
        '--disable-features=PasswordStrengthIndicator',
        '--disable-features=MediaRouter',
        '--disable-features=ChromeWhatsNewUI',
        '--disable-features=CookieDeprecationMessages',
        '--disable-features=PrivacySandboxSettings4',
      ];
    }

    return baseArgs;
  }

  private async initializeBrowser(): Promise<void> {
    console.log('Initializing browser...');

    // Determine headless mode based on environment
    const isHeadless = this.shouldRunHeadless();
    const isCI = process.env.CI === 'true';
    console.log(`Browser headless mode: ${isHeadless} (NODE_ENV: ${process.env.NODE_ENV}, HEADLESS: ${process.env.HEADLESS}, CI: ${isCI})`);

    this.browser = await chromium.launch({
      headless: isHeadless,
      args: this.getCIBrowserArgs(),
    });

    console.log('Browser initialized');
  }

  private async applyStealth(context: BrowserContext): Promise<void> {
    // Hide automation indicators
    await context.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override plugins array
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });
  }

  private async humanLikeType(element: Locator, text: string, config: WebsiteConfig): Promise<void> {
    const delay = config.automation?.typingDelay || 100;

    // Clear field first
    await element.clear();

    // Type with human-like delays
    for (const char of text) {
      await element.type(char);
      if (config.security?.randomDelays) {
        await this.randomDelay(delay * 0.5, delay * 1.5);
      } else {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async cleanup(): Promise<void> {
    // Close all sessions
    for (const [sessionId] of this.sessions) {
      await this.closeSession(sessionId);
    }

    // Close browser
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}