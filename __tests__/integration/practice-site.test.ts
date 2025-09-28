import { PlaywrightBrowserService } from '../../src/infrastructure/browser/playwright-browser.service';
import { WebsiteConfig, WebsiteSelectors, AutomationConfig, SecurityConfig, CredentialsConfig } from '../../src/core/entities/website-config.entity';
import { AccountCredentials } from '../../src/core/entities/account-credentials.entity';

describe('Quick Demo Site Tests', () => {
  let browserService: PlaywrightBrowserService;

  beforeAll(() => {
    browserService = new PlaywrightBrowserService();
  });

  afterAll(async () => {
    if (browserService) {
      await browserService.cleanup();
    }
  });

  describe('Practice Test Automation Site (Fast Public Demo)', () => {
    let practiceConfig: WebsiteConfig;

    beforeAll(() => {
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
    });

    it('should perform complete login flow on practice site', async () => {
      const startTime = Date.now();

      const session = await browserService.createSession('test-user', practiceConfig);
      const credentials = new AccountCredentials('student', 'Password123');

      // Navigate to login page
      await browserService.navigateToLogin(session.page, practiceConfig);

      const navigationTime = Date.now() - startTime;
      console.log(`🌐 Practice Test Automation navigation time: ${navigationTime}ms`);

      // Enter credentials
      await browserService.enterCredentials(session.page, credentials, practiceConfig);

      // Perform login
      const loginSuccess = await browserService.performLogin(session.page, practiceConfig);

      const totalTime = Date.now() - startTime;
      console.log(`✅ Practice Test Automation total login time: ${totalTime}ms`);

      expect(loginSuccess).toBe(true);
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds

      await browserService.closeSession(session.id);
    }, 60000);

    it('should measure practice site performance', async () => {
      const times: number[] = [];

      for (let i = 0; i < 2; i++) {
        const startTime = Date.now();

        const session = await browserService.createSession(`perf-test-${i}`, practiceConfig);
        await browserService.navigateToLogin(session.page, practiceConfig);

        const endTime = Date.now();
        const duration = endTime - startTime;
        times.push(duration);

        await browserService.closeSession(session.id);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      console.log(`🏆 Practice Test Automation Performance:
        Times: ${times.join('ms, ')}ms
        Average: ${avgTime.toFixed(2)}ms`);

      // Should be reasonably fast
      expect(avgTime).toBeLessThan(15000);
    }, 60000);
  });
});