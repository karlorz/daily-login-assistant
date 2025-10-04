import { LoginEngine } from '../../../src/infrastructure/browser/login-engine.service';
import { IBrowserService } from '../../../src/core/interfaces/browser.service.interface';
import { IConfigService } from '../../../src/core/interfaces/config.service.interface';
import { INotificationService } from '../../../src/core/interfaces/notification.service.interface';
import { LoginTask, TaskPriority } from '../../../src/core/entities/login-task.entity';
import { WebsiteConfig, WebsiteSelectors, AutomationConfig, SecurityConfig } from '../../../src/core/entities/website-config.entity';
import { BrowserSession } from '../../../src/core/entities/browser-session.entity';

describe('LoginEngine', () => {
  let loginEngine: LoginEngine;
  let mockBrowserService: jest.Mocked<IBrowserService>;
  let mockConfigService: jest.Mocked<IConfigService>;
  let mockNotificationService: jest.Mocked<INotificationService>;
  let mockWebsiteConfig: WebsiteConfig;
  let mockSession: BrowserSession;

  beforeEach(() => {
    // Create mock services
    mockBrowserService = {
      createSession: jest.fn(),
      closeSession: jest.fn(),
      navigateToLogin: jest.fn(),
      isAlreadyLoggedIn: jest.fn(),
      enterCredentials: jest.fn(),
      performLogin: jest.fn(),
      performCheckin: jest.fn(),
      takeScreenshot: jest.fn(),
      cleanup: jest.fn(),
      findElementWithFallback: jest.fn(),
    } as any;

    mockConfigService = {
      loadConfig: jest.fn(),
      reloadConfig: jest.fn(),
      validateConfig: jest.fn(),
      getWebsiteConfig: jest.fn(),
      getAllWebsiteConfigs: jest.fn(),
      getAppSettings: jest.fn(),
      onConfigChange: jest.fn(),
    } as any;

    mockNotificationService = {
      sendNotification: jest.fn(),
      sendLoginSuccess: jest.fn(),
      sendLoginFailure: jest.fn(),
      sendDailySummary: jest.fn(),
      sendStartupNotification: jest.fn(),
      sendShutdownNotification: jest.fn(),
      sendErrorNotification: jest.fn(),
    } as any;

    // Create test fixtures
    mockWebsiteConfig = new WebsiteConfig(
      'test-site',
      'Test Site',
      'https://test.com/login',
      new WebsiteSelectors(['#username'], ['#password'], ['#login'], [], []),
      new AutomationConfig(true, 100, 30000, 3, 5000),
      new SecurityConfig(false, 'none', false, false, false, false, false),
      undefined,
      true
    );

    mockSession = new BrowserSession('session-1', {} as any, 'user-1');

    // Set up environment variables for credentials
    process.env.TEST_USERNAME_ENV = 'testuser';
    process.env.TEST_PASSWORD_ENV = 'testpass';

    // Create instance with mocked dependencies
    loginEngine = new LoginEngine(
      mockBrowserService,
      mockConfigService,
      mockNotificationService
    );
  });

  afterEach(() => {
    delete process.env.TEST_USERNAME_ENV;
    delete process.env.TEST_PASSWORD_ENV;
  });

  describe('processLoginTask', () => {
    let loginTask: LoginTask;

    beforeEach(() => {
      loginTask = new LoginTask(
        'task-1',
        'user-1',
        'test-site',
        TaskPriority.NORMAL,
        new Date(),
        3
      );

      mockConfigService.getWebsiteConfig.mockResolvedValue({
        ...mockWebsiteConfig,
        credentials: {
          username_env: 'TEST_USERNAME_ENV',
          password_env: 'TEST_PASSWORD_ENV',
        },
      } as any);

      mockBrowserService.createSession.mockResolvedValue(mockSession);
      mockBrowserService.takeScreenshot.mockResolvedValue('/path/to/screenshot.png');
    });

    it('should successfully process login task', async () => {
      mockBrowserService.isAlreadyLoggedIn.mockResolvedValue(false);
      mockBrowserService.performLogin.mockResolvedValue(true);
      mockBrowserService.performCheckin.mockResolvedValue(true);

      const result = await loginEngine.processLoginTask(loginTask);

      expect(result).toBe(true);
      expect(mockBrowserService.createSession).toHaveBeenCalled();
      expect(mockBrowserService.navigateToLogin).toHaveBeenCalled();
      expect(mockBrowserService.enterCredentials).toHaveBeenCalled();
      expect(mockBrowserService.performLogin).toHaveBeenCalled();
      expect(mockNotificationService.sendLoginSuccess).toHaveBeenCalledWith('Test Site', 'user-1');
      expect(mockBrowserService.closeSession).toHaveBeenCalled();
    });

    it('should skip login if already logged in', async () => {
      mockBrowserService.isAlreadyLoggedIn.mockResolvedValue(true);
      mockBrowserService.performCheckin.mockResolvedValue(true);

      const result = await loginEngine.processLoginTask(loginTask);

      expect(result).toBe(true);
      expect(mockBrowserService.enterCredentials).not.toHaveBeenCalled();
      expect(mockBrowserService.performLogin).not.toHaveBeenCalled();
      expect(mockNotificationService.sendLoginSuccess).toHaveBeenCalled();
    });

    it('should return true and skip if website is disabled', async () => {
      mockConfigService.getWebsiteConfig.mockResolvedValue({
        ...mockWebsiteConfig,
        enabled: false,
      } as any);

      const result = await loginEngine.processLoginTask(loginTask);

      expect(result).toBe(true);
      expect(mockBrowserService.createSession).not.toHaveBeenCalled();
    });

    it('should handle login failure', async () => {
      mockBrowserService.isAlreadyLoggedIn.mockResolvedValue(false);
      mockBrowserService.performLogin.mockResolvedValue(false);

      const result = await loginEngine.processLoginTask(loginTask);

      expect(result).toBe(false);
      expect(mockNotificationService.sendLoginFailure).toHaveBeenCalled();
    });

    it('should handle errors and send notification', async () => {
      mockBrowserService.isAlreadyLoggedIn.mockRejectedValue(new Error('Network timeout'));

      const result = await loginEngine.processLoginTask(loginTask);

      expect(result).toBe(false);
      expect(mockNotificationService.sendLoginFailure).toHaveBeenCalledWith(
        'test-site',
        'user-1',
        'Network timeout'
      );
    });

    it('should fail if website config not found', async () => {
      mockConfigService.getWebsiteConfig.mockResolvedValue(null);

      const result = await loginEngine.processLoginTask(loginTask);

      expect(result).toBe(false);
      expect(mockNotificationService.sendLoginFailure).toHaveBeenCalled();
    });

    it('should fail if credentials not found', async () => {
      delete process.env.TEST_USERNAME_ENV;

      const result = await loginEngine.processLoginTask(loginTask);

      expect(result).toBe(false);
      expect(mockNotificationService.sendLoginFailure).toHaveBeenCalled();
    });

    it('should close session even if login fails', async () => {
      mockBrowserService.isAlreadyLoggedIn.mockRejectedValue(new Error('Error'));

      await loginEngine.processLoginTask(loginTask);

      expect(mockBrowserService.closeSession).toHaveBeenCalled();
    });

    it('should update metrics on success', async () => {
      mockBrowserService.isAlreadyLoggedIn.mockResolvedValue(false);
      mockBrowserService.performLogin.mockResolvedValue(true);
      mockBrowserService.performCheckin.mockResolvedValue(true);

      await loginEngine.processLoginTask(loginTask);

      const metrics = loginEngine.getMetrics();
      expect(metrics.totalAttempts).toBe(1);
      expect(metrics.successfulLogins).toBe(1);
      expect(metrics.failedLogins).toBe(0);
    });

    it('should update metrics on failure', async () => {
      mockBrowserService.isAlreadyLoggedIn.mockRejectedValue(new Error('Error'));

      await loginEngine.processLoginTask(loginTask);

      const metrics = loginEngine.getMetrics();
      expect(metrics.totalAttempts).toBe(1);
      expect(metrics.successfulLogins).toBe(0);
      expect(metrics.failedLogins).toBe(1);
    });
  });

  describe('processCheckinTask', () => {
    let checkinTask: LoginTask;

    beforeEach(() => {
      checkinTask = new LoginTask(
        'checkin-1',
        'user-1',
        'test-site',
        TaskPriority.NORMAL,
        new Date(),
        3
      );

      mockConfigService.getWebsiteConfig.mockResolvedValue(mockWebsiteConfig as any);
      mockBrowserService.createSession.mockResolvedValue(mockSession);
    });

    it('should successfully perform check-in', async () => {
      mockBrowserService.isAlreadyLoggedIn.mockResolvedValue(true);
      mockBrowserService.performCheckin.mockResolvedValue(true);

      const result = await loginEngine.processCheckinTask(checkinTask);

      expect(result).toBe(true);
      expect(mockBrowserService.performCheckin).toHaveBeenCalled();
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        'Check-in Success',
        expect.stringContaining('Test Site'),
        'info'
      );
    });

    it('should fail check-in if not logged in', async () => {
      mockBrowserService.isAlreadyLoggedIn.mockResolvedValue(false);

      const result = await loginEngine.processCheckinTask(checkinTask);

      expect(result).toBe(false);
      expect(mockBrowserService.performCheckin).not.toHaveBeenCalled();
    });

    it('should handle check-in failure', async () => {
      mockBrowserService.isAlreadyLoggedIn.mockResolvedValue(true);
      mockBrowserService.performCheckin.mockResolvedValue(false);

      const result = await loginEngine.processCheckinTask(checkinTask);

      expect(result).toBe(false);
    });

    it('should handle errors during check-in', async () => {
      mockBrowserService.isAlreadyLoggedIn.mockRejectedValue(new Error('Network error'));

      const result = await loginEngine.processCheckinTask(checkinTask);

      expect(result).toBe(false);
    });

    it('should close session after check-in', async () => {
      mockBrowserService.isAlreadyLoggedIn.mockResolvedValue(true);
      mockBrowserService.performCheckin.mockResolvedValue(true);

      await loginEngine.processCheckinTask(checkinTask);

      expect(mockBrowserService.closeSession).toHaveBeenCalled();
    });
  });

  describe('validateCredentials', () => {
    beforeEach(() => {
      mockConfigService.getWebsiteConfig.mockResolvedValue({
        ...mockWebsiteConfig,
        credentials: {
          username_env: 'TEST_USERNAME_ENV',
          password_env: 'TEST_PASSWORD_ENV',
        },
      } as any);
    });

    it('should return true for valid credentials', async () => {
      const result = await loginEngine.validateCredentials('user-1', 'test-site');
      expect(result).toBe(true);
    });

    it('should return false if website config not found', async () => {
      mockConfigService.getWebsiteConfig.mockResolvedValue(null);

      const result = await loginEngine.validateCredentials('user-1', 'invalid-site');
      expect(result).toBe(false);
    });

    it('should return false if credentials missing', async () => {
      delete process.env.TEST_USERNAME_ENV;

      const result = await loginEngine.validateCredentials('user-1', 'test-site');
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockConfigService.getWebsiteConfig.mockRejectedValue(new Error('Config error'));

      const result = await loginEngine.validateCredentials('user-1', 'test-site');
      expect(result).toBe(false);
    });
  });

  describe('getMetrics', () => {
    it('should return initial metrics', () => {
      const metrics = loginEngine.getMetrics();

      expect(metrics.totalAttempts).toBe(0);
      expect(metrics.successfulLogins).toBe(0);
      expect(metrics.failedLogins).toBe(0);
      expect(metrics.totalCheckins).toBe(0);
      expect(metrics.successfulCheckins).toBe(0);
      expect(metrics.avgLoginTime).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.checkinSuccessRate).toBe(0);
    });

    it('should calculate success rate correctly', async () => {
      const task = new LoginTask('task-1', 'user-1', 'test-site', TaskPriority.NORMAL, new Date(), 3);

      mockConfigService.getWebsiteConfig.mockResolvedValue({
        ...mockWebsiteConfig,
        credentials: { username_env: 'TEST_USERNAME_ENV', password_env: 'TEST_PASSWORD_ENV' },
      } as any);
      mockBrowserService.createSession.mockResolvedValue(mockSession);
      mockBrowserService.isAlreadyLoggedIn.mockResolvedValue(false);
      mockBrowserService.performLogin.mockResolvedValue(true);
      mockBrowserService.performCheckin.mockResolvedValue(false);
      mockBrowserService.takeScreenshot.mockResolvedValue('/path/to/screenshot.png');

      await loginEngine.processLoginTask(task);

      const metrics = loginEngine.getMetrics();
      expect(metrics.successRate).toBe(100);
    });
  });
});
