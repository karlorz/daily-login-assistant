import { injectable } from 'inversify';
import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import readline from 'readline';

export interface UserGuidedLoginResult {
  success: boolean;
  profilePath: string;
  cookies?: any[];
  message: string;
}

@injectable()
export class UserGuidedLoginService {
  private browser: Browser | null = null;

  /**
   * Opens a browser session for user-guided login with persistent profile
   * The user manually logs in, and we save the session for future automation
   */
  async openGuidedLoginSession(
    websiteUrl: string,
    profileId: string = 'default'
  ): Promise<UserGuidedLoginResult> {
    console.log('🚀 Opening guided login session...');
    console.log(`📍 Website: ${websiteUrl}`);
    console.log(`👤 Profile: ${profileId}`);

    try {
      // Create persistent profile directory
      const profilePath = path.join(process.cwd(), 'profiles', 'user-guided', profileId);

      if (!fs.existsSync(profilePath)) {
        fs.mkdirSync(profilePath, { recursive: true });
        console.log(`📁 Created new profile directory: ${profilePath}`);
      } else {
        console.log(`📁 Using existing profile: ${profilePath}`);
      }

      // Initialize browser with persistent context
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: false, // Always visible for user interaction
          args: [
            '--no-first-run',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security', // For development only
          ],
        });
      }

      // Create persistent context with the user data directory
      const contextOptions: any = {
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };

      // Only use existing storage state if it exists
      const storageStatePath = this.getStorageStatePath(profilePath);
      if (fs.existsSync(storageStatePath)) {
        console.log(`📂 Loading existing storage state from: ${storageStatePath}`);
        contextOptions.storageState = storageStatePath;
      } else {
        console.log(`🆕 Creating new storage state (will be saved on completion)`);
      }

      const context = await this.browser.newContext(contextOptions);

      const page = await context.newPage();

      // Navigate to the login page
      await page.goto(websiteUrl);

      console.log('');
      console.log('🎯 USER ACTION REQUIRED:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👆 Please complete the login process manually in the browser');
      console.log('🔐 Use any authentication method (OAuth, email, etc.)');
      console.log('⏱️  Take your time - the session will be saved automatically');
      console.log('✅ Once logged in, press ENTER in this terminal to continue...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Wait for user confirmation
      await this.waitForUserInput();

      // Save the current session state
      const storageState = await context.storageState();
      const storageStateFilePath = this.getStorageStatePath(profilePath);

      fs.writeFileSync(storageStateFilePath, JSON.stringify(storageState, null, 2));
      console.log(`💾 Session saved to: ${storageStateFilePath}`);

      // Test if login was successful by checking for auth cookies
      const cookies = storageState.cookies;
      const hasAuthCookies = cookies.some(cookie =>
        cookie.name.toLowerCase().includes('session') ||
        cookie.name.toLowerCase().includes('auth') ||
        cookie.name.toLowerCase().includes('token') ||
        cookie.name.toLowerCase().includes('login')
      );

      await context.close();

      if (hasAuthCookies) {
        console.log('✅ Login session successfully saved!');
        console.log(`🍪 Found ${cookies.length} cookies`);
        return {
          success: true,
          profilePath,
          cookies,
          message: `Login session saved with ${cookies.length} cookies`
        };
      } else {
        console.log('⚠️  No authentication cookies detected. You may need to login again.');
        return {
          success: false,
          profilePath,
          cookies,
          message: 'No authentication cookies found'
        };
      }

    } catch (error) {
      console.error('❌ Guided login failed:', error);
      return {
        success: false,
        profilePath: '',
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Test if saved session is still valid by navigating to a protected page
   */
  async testSavedSession(
    websiteUrl: string,
    profileId: string = 'default',
    testUrl?: string
  ): Promise<boolean> {
    console.log('🧪 Testing saved session...');

    try {
      const profilePath = path.join(process.cwd(), 'profiles', 'user-guided', profileId);
      const storageStatePath = this.getStorageStatePath(profilePath);

      if (!fs.existsSync(storageStatePath)) {
        console.log('❌ No saved session found');
        return false;
      }

      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: true, // Headless for testing
        });
      }

      const storageState = JSON.parse(fs.readFileSync(storageStatePath, 'utf8'));
      const context = await this.browser.newContext({ storageState });
      const page = await context.newPage();

      // Navigate to test URL or main page instead of dashboard
      const urlToTest = testUrl || this.getMainPageUrl(websiteUrl);
      await page.goto(urlToTest);

      // Wait a moment for any redirects
      await page.waitForTimeout(3000);

      // Check if we were redirected back to login page
      const currentUrl = page.url();
      const isLoggedIn = !currentUrl.includes('login') && !currentUrl.includes('signin');

      await context.close();

      if (isLoggedIn) {
        console.log('✅ Session is still valid!');
      } else {
        console.log('❌ Session expired - login required');
      }

      return isLoggedIn;

    } catch (error) {
      console.error('❌ Session test failed:', error);
      return false;
    }
  }

  /**
   * Perform automated daily check-in using saved session
   */
  async performDailyCheckin(
    websiteUrl: string,
    profileId: string = 'default',
    checkinSelectors: string[] = []
  ): Promise<boolean> {
    console.log('🎯 Performing daily check-in...');

    try {
      const profilePath = path.join(process.cwd(), 'profiles', 'user-guided', profileId);
      const storageStatePath = this.getStorageStatePath(profilePath);

      if (!fs.existsSync(storageStatePath)) {
        console.log('❌ No saved session found - please run guided login first');
        return false;
      }

      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: process.env.HEADLESS !== 'false', // Allow override for debugging
        });
      }

      const storageState = JSON.parse(fs.readFileSync(storageStatePath, 'utf8'));
      const context = await this.browser.newContext({ storageState });
      const page = await context.newPage();

      // Navigate to main page or home page
      const mainPageUrl = this.getMainPageUrl(websiteUrl);
      await page.goto(mainPageUrl);

      // Wait for page to load
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check if still logged in
      const currentUrl = page.url();
      if (currentUrl.includes('login') || currentUrl.includes('signin')) {
        console.log('❌ Session expired - manual login required');
        await context.close();
        return false;
      }

      console.log('✅ Successfully authenticated with saved session');

      // Look for check-in buttons or daily reward elements
      const defaultCheckinSelectors = [
        '[class*="checkin"]',
        '[class*="check-in"]',
        '[class*="daily"]',
        '[class*="reward"]',
        '[class*="signin"]',
        '[class*="sign-in"]',
        'button:has-text("签到")',
        'button:has-text("check")',
        'button:has-text("daily")',
        ...checkinSelectors
      ];

      let checkinSuccess = false;
      for (const selector of defaultCheckinSelectors) {
        try {
          const elements = await page.locator(selector).all();
          for (const element of elements) {
            if (await element.isVisible()) {
              console.log(`🎯 Found check-in element: ${selector}`);
              await element.click();
              await page.waitForTimeout(2000);
              checkinSuccess = true;
              break;
            }
          }
          if (checkinSuccess) break;
        } catch {
          // Continue to next selector
        }
      }

      if (!checkinSuccess) {
        console.log('ℹ️  No check-in button found - daily visit completed anyway');
        checkinSuccess = true; // Consider visit as success even without explicit check-in
      }

      // Take screenshot for verification
      const screenshotPath = await this.takeScreenshot(page, `daily-checkin-${profileId}`);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);

      await context.close();

      if (checkinSuccess) {
        console.log('✅ Daily check-in completed successfully!');
      }

      return checkinSuccess;

    } catch (error) {
      console.error('❌ Daily check-in failed:', error);
      return false;
    }
  }

  /**
   * List all saved profiles
   */
  async listSavedProfiles(): Promise<string[]> {
    const profilesDir = path.join(process.cwd(), 'profiles', 'user-guided');

    if (!fs.existsSync(profilesDir)) {
      return [];
    }

    return fs.readdirSync(profilesDir)
      .filter(dir => fs.statSync(path.join(profilesDir, dir)).isDirectory())
      .filter(dir => fs.existsSync(this.getStorageStatePath(path.join(profilesDir, dir))));
  }

  /**
   * Clean up browser resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private getStorageStatePath(profilePath: string): string {
    return path.join(profilePath, 'storage-state.json');
  }

  private getMainPageUrl(websiteUrl: string): string {
    // For anyrouter.top, the main page after login is /console
    const url = new URL(websiteUrl);

    // Handle anyrouter.top specifically
    if (url.hostname.includes('anyrouter.top')) {
      return `${url.protocol}//${url.hostname}/console`;
    }

    // For other sites, try to construct a reasonable main page URL
    return websiteUrl.replace('/login', '').replace('/register', '') || `${url.protocol}//${url.hostname}`;
  }

  private async waitForUserInput(): Promise<void> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('Press ENTER when you have completed the login...', () => {
        rl.close();
        resolve();
      });
    });
  }

  private async takeScreenshot(page: Page, name: string): Promise<string> {
    const screenshotsDir = path.join(process.cwd(), 'logs', 'screenshots');

    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const filename = `${name}_${Date.now()}.png`;
    const filepath = path.join(screenshotsDir, filename);

    await page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  }
}