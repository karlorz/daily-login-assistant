import { UserGuidedLoginService } from '../../../src/infrastructure/browser/user-guided-login.service';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Mock modules
jest.mock('playwright');
jest.mock('fs');
jest.mock('readline');

describe('UserGuidedLoginService', () => {
  let service: UserGuidedLoginService;
  let mockBrowser: any;
  let mockContext: any;
  let mockPage: any;
  let mockReadlineInterface: any;

  beforeEach(() => {
    service = new UserGuidedLoginService();

    // Mock page
    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      url: jest.fn().mockReturnValue('https://example.com/dashboard'),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      waitForLoadState: jest.fn().mockResolvedValue(undefined),
      screenshot: jest.fn().mockResolvedValue(undefined),
      locator: jest.fn().mockReturnValue({
        all: jest.fn().mockResolvedValue([]),
      }),
    };

    // Mock context
    mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
      storageState: jest.fn().mockResolvedValue({
        cookies: [
          { name: 'session_token', value: 'abc123' },
          { name: 'auth_token', value: 'xyz789' },
        ],
        origins: [],
      }),
    };

    // Mock browser
    mockBrowser = {
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn().mockResolvedValue(undefined),
    };

    // Mock chromium
    (chromium.launch as jest.Mock).mockResolvedValue(mockBrowser);

    // Mock fs
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    (fs.readFileSync as jest.Mock).mockReturnValue('{}');
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });

    // Mock readline
    mockReadlineInterface = {
      question: jest.fn((prompt, callback) => {
        setTimeout(() => callback(''), 0);
      }),
      close: jest.fn(),
    };
    (readline.createInterface as jest.Mock).mockReturnValue(mockReadlineInterface);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('openGuidedLoginSession', () => {
    it('should successfully create a new profile and save session', async () => {
      const result = await service.openGuidedLoginSession('https://example.com/login', 'test-profile');

      expect(result.success).toBe(true);
      expect(result.profilePath).toContain('test-profile');
      expect(result.cookies).toBeDefined();
      expect(result.cookies?.length).toBe(2);
      expect(result.message).toContain('2 cookies');
    });

    it('should create profile directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await service.openGuidedLoginSession('https://example.com/login', 'new-profile');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('new-profile'),
        { recursive: true }
      );
    });

    it('should use existing profile directory if it exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await service.openGuidedLoginSession('https://example.com/login', 'existing-profile');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should launch browser with correct options', async () => {
      await service.openGuidedLoginSession('https://example.com/login', 'test-profile');

      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: false,
          args: expect.arrayContaining([
            '--no-first-run',
            '--disable-blink-features=AutomationControlled',
          ]),
        })
      );
    });

    it('should create context with correct options for new profile', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await service.openGuidedLoginSession('https://example.com/login', 'test-profile');

      expect(mockBrowser.newContext).toHaveBeenCalledWith(
        expect.objectContaining({
          viewport: { width: 1280, height: 800 },
          userAgent: expect.stringContaining('Mozilla'),
        })
      );
    });

    it('should load existing storage state if available', async () => {
      const storageStatePath = path.join(process.cwd(), 'profiles', 'user-guided', 'test-profile', 'storage-state.json');
      (fs.existsSync as jest.Mock).mockImplementation((p) => p === storageStatePath);

      await service.openGuidedLoginSession('https://example.com/login', 'test-profile');

      expect(mockBrowser.newContext).toHaveBeenCalledWith(
        expect.objectContaining({
          storageState: storageStatePath,
        })
      );
    });

    it('should navigate to the website URL', async () => {
      await service.openGuidedLoginSession('https://example.com/login', 'test-profile');

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/login');
    });

    it('should wait for user input', async () => {
      await service.openGuidedLoginSession('https://example.com/login', 'test-profile');

      expect(readline.createInterface).toHaveBeenCalled();
      expect(mockReadlineInterface.question).toHaveBeenCalled();
      expect(mockReadlineInterface.close).toHaveBeenCalled();
    });

    it('should save storage state to file', async () => {
      await service.openGuidedLoginSession('https://example.com/login', 'test-profile');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('storage-state.json'),
        expect.stringContaining('session_token'),
      );
    });

    it('should detect authentication cookies', async () => {
      mockContext.storageState.mockResolvedValue({
        cookies: [
          { name: 'session_id', value: 'abc' },
          { name: 'auth_token', value: 'xyz' },
        ],
        origins: [],
      });

      const result = await service.openGuidedLoginSession('https://example.com/login', 'test-profile');

      expect(result.success).toBe(true);
      expect(result.message).toContain('2 cookies');
    });

    it('should return false if no auth cookies found', async () => {
      mockContext.storageState.mockResolvedValue({
        cookies: [
          { name: 'tracking', value: 'abc' },
          { name: 'analytics', value: 'xyz' },
        ],
        origins: [],
      });

      const result = await service.openGuidedLoginSession('https://example.com/login', 'test-profile');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No authentication cookies found');
    });

    it('should close context after saving session', async () => {
      await service.openGuidedLoginSession('https://example.com/login', 'test-profile');

      expect(mockContext.close).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (chromium.launch as jest.Mock).mockRejectedValue(new Error('Browser launch failed'));

      const result = await service.openGuidedLoginSession('https://example.com/login', 'test-profile');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Browser launch failed');
      expect(result.profilePath).toBe('');
    });

    it('should reuse browser instance for multiple sessions', async () => {
      await service.openGuidedLoginSession('https://example.com/login', 'profile1');
      await service.openGuidedLoginSession('https://example.com/login', 'profile2');

      expect(chromium.launch).toHaveBeenCalledTimes(1);
    });

    it('should use default profile if not specified', async () => {
      await service.openGuidedLoginSession('https://example.com/login');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('default'),
        { recursive: true }
      );
    });
  });

  describe('testSavedSession', () => {
    beforeEach(() => {
      const storageState = JSON.stringify({
        cookies: [{ name: 'session', value: 'test' }],
        origins: [],
      });
      (fs.readFileSync as jest.Mock).mockReturnValue(storageState);
    });

    it('should return false if no saved session exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await service.testSavedSession('https://example.com/login', 'test-profile');

      expect(result).toBe(false);
    });

    it('should launch browser in headless mode for testing', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await service.testSavedSession('https://example.com/login', 'test-profile');

      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
        })
      );
    });

    it('should load storage state from file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await service.testSavedSession('https://example.com/login', 'test-profile');

      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('storage-state.json'),
        'utf8'
      );
    });

    it('should navigate to main page instead of login page', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockPage.url.mockReturnValue('https://example.com/dashboard');

      await service.testSavedSession('https://example.com/login', 'test-profile');

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com');
    });

    it('should use custom test URL if provided', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await service.testSavedSession(
        'https://example.com/login',
        'test-profile',
        'https://example.com/protected'
      );

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/protected');
    });

    it('should return true if session is valid (not redirected to login)', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockPage.url.mockReturnValue('https://example.com/dashboard');

      const result = await service.testSavedSession('https://example.com/login', 'test-profile');

      expect(result).toBe(true);
    });

    it('should return false if redirected to login page', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockPage.url.mockReturnValue('https://example.com/login');

      const result = await service.testSavedSession('https://example.com/login', 'test-profile');

      expect(result).toBe(false);
    });

    it('should return false if redirected to signin page', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockPage.url.mockReturnValue('https://example.com/signin');

      const result = await service.testSavedSession('https://example.com/login', 'test-profile');

      expect(result).toBe(false);
    });

    it('should close context after testing', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await service.testSavedSession('https://example.com/login', 'test-profile');

      expect(mockContext.close).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = await service.testSavedSession('https://example.com/login', 'test-profile');

      expect(result).toBe(false);
    });
  });

  describe('performDailyCheckin', () => {
    beforeEach(() => {
      const storageState = JSON.stringify({
        cookies: [{ name: 'session', value: 'test' }],
        origins: [],
      });
      (fs.readFileSync as jest.Mock).mockReturnValue(storageState);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
    });

    it('should return false if no saved session exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await service.performDailyCheckin('https://example.com', 'test-profile');

      expect(result).toBe(false);
    });

    it('should launch browser with headless mode by default', async () => {
      await service.performDailyCheckin('https://example.com', 'test-profile');

      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
        })
      );
    });

    it('should respect HEADLESS environment variable', async () => {
      process.env.HEADLESS = 'false';

      await service.performDailyCheckin('https://example.com', 'test-profile');

      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: false,
        })
      );

      delete process.env.HEADLESS;
    });

    it('should navigate to main page', async () => {
      mockPage.url.mockReturnValue('https://example.com/dashboard');

      await service.performDailyCheckin('https://example.com/login', 'test-profile');

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com');
    });

    it('should return false if session expired (redirected to login)', async () => {
      mockPage.url.mockReturnValue('https://example.com/login');

      const result = await service.performDailyCheckin('https://example.com', 'test-profile');

      expect(result).toBe(false);
      expect(mockContext.close).toHaveBeenCalled();
    });

    it('should look for check-in button with default selectors', async () => {
      mockPage.url.mockReturnValue('https://example.com/dashboard');

      await service.performDailyCheckin('https://example.com', 'test-profile');

      expect(mockPage.locator).toHaveBeenCalledWith(expect.stringContaining('checkin'));
    });

    it('should click check-in button if found', async () => {
      mockPage.url.mockReturnValue('https://example.com/dashboard');
      const mockElement = {
        isVisible: jest.fn().mockResolvedValue(true),
        click: jest.fn().mockResolvedValue(undefined),
      };
      mockPage.locator.mockReturnValue({
        all: jest.fn().mockResolvedValue([mockElement]),
      });

      const result = await service.performDailyCheckin('https://example.com', 'test-profile');

      expect(mockElement.click).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should use custom check-in selectors if provided', async () => {
      mockPage.url.mockReturnValue('https://example.com/dashboard');
      const customSelectors = ['#custom-checkin', '.my-checkin-btn'];

      await service.performDailyCheckin('https://example.com', 'test-profile', customSelectors);

      expect(mockPage.locator).toHaveBeenCalledWith('#custom-checkin');
      expect(mockPage.locator).toHaveBeenCalledWith('.my-checkin-btn');
    });

    it('should return true even if no check-in button found (daily visit counts)', async () => {
      mockPage.url.mockReturnValue('https://example.com/dashboard');
      mockPage.locator.mockReturnValue({
        all: jest.fn().mockResolvedValue([]),
      });

      const result = await service.performDailyCheckin('https://example.com', 'test-profile');

      expect(result).toBe(true);
    });

    it('should take screenshot after check-in', async () => {
      mockPage.url.mockReturnValue('https://example.com/dashboard');

      await service.performDailyCheckin('https://example.com', 'test-profile');

      expect(mockPage.screenshot).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.stringContaining('daily-checkin-test-profile'),
          fullPage: true,
        })
      );
    });

    it('should create screenshots directory if not exists', async () => {
      mockPage.url.mockReturnValue('https://example.com/dashboard');
      (fs.existsSync as jest.Mock).mockImplementation((p) => {
        return !p.includes('screenshots');
      });

      await service.performDailyCheckin('https://example.com', 'test-profile');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('screenshots'),
        { recursive: true }
      );
    });

    it('should close context after check-in', async () => {
      mockPage.url.mockReturnValue('https://example.com/dashboard');

      await service.performDailyCheckin('https://example.com', 'test-profile');

      expect(mockContext.close).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Storage read error');
      });

      const result = await service.performDailyCheckin('https://example.com', 'test-profile');

      expect(result).toBe(false);
    });

    it('should handle anyrouter.top special case for main page URL', async () => {
      mockPage.url.mockReturnValue('https://anyrouter.top/console');

      await service.performDailyCheckin('https://anyrouter.top/login', 'test-profile');

      expect(mockPage.goto).toHaveBeenCalledWith('https://anyrouter.top/console');
    });
  });

  describe('listSavedProfiles', () => {
    it('should return empty array if profiles directory does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const profiles = await service.listSavedProfiles();

      expect(profiles).toEqual([]);
    });

    it('should return list of profile directories', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['profile1', 'profile2', 'profile3']);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });

      const profiles = await service.listSavedProfiles();

      expect(profiles.length).toBe(3);
    });

    it('should filter out non-directory entries', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['profile1', 'file.txt', 'profile2']);
      (fs.statSync as jest.Mock).mockImplementation((p) => ({
        isDirectory: () => !p.includes('file.txt'),
      }));

      const profiles = await service.listSavedProfiles();

      expect(profiles.length).toBeLessThan(3);
    });

    it('should only include profiles with storage-state.json', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((p) => {
        if (p.includes('profiles/user-guided') && !p.includes('storage-state')) return true;
        return (p.includes('profile1') || p.includes('profile2')) && p.includes('storage-state');
      });
      (fs.readdirSync as jest.Mock).mockReturnValue(['profile1', 'profile2', 'profile3']);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });

      const profiles = await service.listSavedProfiles();

      expect(profiles.length).toBe(2);
      expect(profiles).not.toContain('profile3');
    });
  });

  describe('cleanup', () => {
    it('should close browser if it exists', async () => {
      await service.openGuidedLoginSession('https://example.com/login', 'test-profile');
      await service.cleanup();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should set browser to null after cleanup', async () => {
      await service.openGuidedLoginSession('https://example.com/login', 'test-profile');
      await service.cleanup();

      // Call again should launch new browser
      await service.openGuidedLoginSession('https://example.com/login', 'test-profile2');
      expect(chromium.launch).toHaveBeenCalledTimes(2);
    });

    it('should handle cleanup when browser is not initialized', async () => {
      await expect(service.cleanup()).resolves.not.toThrow();
    });
  });

  describe('private helper methods', () => {
    describe('getMainPageUrl', () => {
      it('should handle anyrouter.top domains', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        const storageState = JSON.stringify({ cookies: [], origins: [] });
        (fs.readFileSync as jest.Mock).mockReturnValue(storageState);
        mockPage.url.mockReturnValue('https://anyrouter.top/console');

        await service.testSavedSession('https://anyrouter.top/login', 'test');

        expect(mockPage.goto).toHaveBeenCalledWith('https://anyrouter.top/console');
      });

      it('should remove /login from URL for generic sites', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        const storageState = JSON.stringify({ cookies: [], origins: [] });
        (fs.readFileSync as jest.Mock).mockReturnValue(storageState);
        mockPage.url.mockReturnValue('https://example.com/');

        await service.testSavedSession('https://example.com/login', 'test');

        expect(mockPage.goto).toHaveBeenCalledWith('https://example.com');
      });

      it('should remove /register from URL', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        const storageState = JSON.stringify({ cookies: [], origins: [] });
        (fs.readFileSync as jest.Mock).mockReturnValue(storageState);

        await service.testSavedSession('https://example.com/register', 'test');

        expect(mockPage.goto).toHaveBeenCalledWith('https://example.com');
      });
    });
  });
});
